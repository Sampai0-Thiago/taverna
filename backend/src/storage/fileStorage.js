import { createReadStream } from 'node:fs';
import { mkdir, open, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Abstração de armazenamento de arquivos. O banco guarda apenas o NOME do arquivo.
 *
 * Fluxo de upload: o multer grava em UPLOAD_DIR (área temporária) → a assinatura binária é
 * conferida (readHeader) → persist() move para o destino final:
 *   - driver "local": o arquivo já está no lugar certo (disco).
 *   - driver "r2":    envia para o Cloudflare R2 e apaga a cópia temporária.
 *
 * Os arquivos são servidos por GET /api/files/:name (só para usuários logados).
 */

// Nomes gerados pelo upload: UUID + extensão conhecida. Qualquer outra coisa é recusada.
const FILE_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|gif|pdf)$/;
const CONTENT_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf' };
const CACHE_CONTROL = 'private, max-age=604800, immutable'; // nomes são UUIDs imutáveis → cache longo é seguro

const contentTypeOf = (fileName) => CONTENT_TYPES[fileName.split('.').pop()] ?? 'application/octet-stream';
const tempPath = (fileName) => path.join(env.uploadDir, path.basename(fileName));

async function unlinkQuiet(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn({ err: error, filePath }, 'falha ao remover arquivo');
  }
}

// ---------------------------------------------------------------------------
// Driver: disco local
// ---------------------------------------------------------------------------
const localDriver = {
  async persist() {},

  async remove(fileName) {
    await unlinkQuiet(tempPath(fileName));
  },

  async send(fileName, req, res) {
    const filePath = tempPath(fileName);
    let info;
    try {
      info = await stat(filePath);
    } catch {
      return false;
    }
    const etag = `"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
    res.set({ 'Content-Type': contentTypeOf(fileName), 'Cache-Control': CACHE_CONTROL, ETag: etag });
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return true;
    }
    res.set('Content-Length', String(info.size));
    createReadStream(filePath).pipe(res);
    return true;
  },
};

// ---------------------------------------------------------------------------
// Driver: Cloudflare R2 (API compatível com S3)
// ---------------------------------------------------------------------------
function createR2Driver({ bucket, endpoint, accessKeyId, secretAccessKey }) {
  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    // O SDK recente envia uploads em "aws-chunked" com checksum por padrão; serviços compatíveis
    // com S3 (como o R2) podem não aceitar. Só calcula/valida checksum quando a operação exige.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return {
    async persist(fileName) {
      const filePath = tempPath(fileName);
      const { size } = await stat(filePath);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fileName,
          Body: createReadStream(filePath),
          ContentLength: size,
          ContentType: contentTypeOf(fileName),
        }),
      );
      await unlinkQuiet(filePath);
    },

    async remove(fileName) {
      await unlinkQuiet(tempPath(fileName)); // caso ainda esteja na área temporária
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fileName }));
      } catch (error) {
        logger.warn({ err: error, fileName }, 'falha ao remover arquivo do R2');
      }
    },

    async send(fileName, req, res) {
      let object;
      try {
        object = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: fileName, IfNoneMatch: req.headers['if-none-match'] }),
        );
      } catch (error) {
        const status = error.$metadata?.httpStatusCode;
        if (status === 304) {
          res.set('Cache-Control', CACHE_CONTROL).status(304).end();
          return true;
        }
        if (status === 404 || error.name === 'NoSuchKey') return false;
        throw error;
      }
      res.set({
        'Content-Type': object.ContentType ?? contentTypeOf(fileName),
        'Cache-Control': CACHE_CONTROL,
        ...(object.ETag ? { ETag: object.ETag } : {}),
        ...(object.ContentLength != null ? { 'Content-Length': String(object.ContentLength) } : {}),
      });
      object.Body.on('error', (err) => {
        logger.error({ err, fileName }, 'falha ao transmitir arquivo do R2');
        res.destroy(err);
      });
      object.Body.pipe(res);
      return true;
    },
  };
}

const driver = env.storage.driver === 'r2' ? createR2Driver(env.storage) : localDriver;

export const fileStorage = {
  /** Pasta onde o multer grava (definitiva no driver local, temporária no R2). */
  dir: env.uploadDir,
  driverName: env.storage.driver,

  async init() {
    await mkdir(env.uploadDir, { recursive: true });
  },

  isValidName(fileName) {
    return typeof fileName === 'string' && FILE_NAME.test(fileName);
  },

  /** URL (rota autenticada) usada pelo frontend. */
  url(fileName) {
    return fileName ? `/api/files/${encodeURIComponent(fileName)}` : null;
  },

  /** Primeiros bytes do arquivo recém-enviado (ainda na área temporária) — usado na checagem de assinatura. */
  async readHeader(fileName, length = 16) {
    const handle = await open(tempPath(fileName), 'r');
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, 0);
      return buffer;
    } finally {
      await handle.close();
    }
  },

  /** Move o arquivo validado para o armazenamento definitivo. */
  persist(fileName) {
    return driver.persist(fileName);
  },

  /** Envia o arquivo na resposta. Retorna false se não existir. */
  send(fileName, req, res) {
    return driver.send(fileName, req, res);
  },

  /** Remove sem lançar erro — usado em limpezas (rollback, substituição). */
  async remove(fileName) {
    if (!fileName) return;
    await driver.remove(path.basename(fileName));
  },

  async removeMany(fileNames) {
    await Promise.all(fileNames.filter(Boolean).map((f) => this.remove(f)));
  },
};
