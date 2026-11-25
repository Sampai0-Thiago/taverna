import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { fileStorage } from '../storage/fileStorage.js';
import { AppError } from '../utils/errors.js';
import { detectFileType, IMAGE_TYPES, PDF_TYPES } from '../utils/fileSignature.js';
import { stripImageMetadata } from '../utils/imageSanitizer.js';
import path from 'node:path';

const KINDS = {
  image: {
    mimes: new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    signatures: IMAGE_TYPES,
    label: 'imagem (PNG, JPG, WEBP ou GIF)',
  },
  pdf: {
    mimes: new Set(['application/pdf']),
    signatures: PDF_TYPES,
    label: 'PDF',
  },
};

const EXTENSIONS = { png: '.png', jpeg: '.jpg', gif: '.gif', webp: '.webp', pdf: '.pdf' };
const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

/**
 * Cria um middleware de upload multipart.
 * @param {Record<string, 'image'|'pdf'>} fields mapa campo → tipo aceito. Ex.: { portrait: 'image', sheet: 'pdf' }
 *
 * Após o upload, os arquivos ficam em req.uploaded[campo] = nomeDoArquivo.
 * A assinatura binária é verificada; se inválida, todos os arquivos da requisição são apagados.
 */
export function uploadFields(fields) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, fileStorage.dir),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${MIME_TO_EXT[file.mimetype] ?? ''}`),
    }),
    limits: { fileSize: env.maxUploadBytes, files: Object.keys(fields).length },
    fileFilter: (_req, file, cb) => {
      const kind = KINDS[fields[file.fieldname]];
      if (!kind) return cb(new AppError(400, `Campo de arquivo inesperado: ${file.fieldname}`, 'UPLOAD_FIELD'));
      if (!kind.mimes.has(file.mimetype)) {
        return cb(new AppError(415, `O campo "${file.fieldname}" aceita apenas ${kind.label}.`, 'UNSUPPORTED_FILE'));
      }
      cb(null, true);
    },
  }).fields(Object.keys(fields).map((name) => ({ name, maxCount: 1 })));

  return [
    upload,
    async (req, _res, next) => {
      const files = Object.values(req.files ?? {}).flat();
      req.uploaded = {};
      try {
        for (const file of files) {
          const detected = detectFileType(await fileStorage.readHeader(file.filename));
          const kind = KINDS[fields[file.fieldname]];
          if (!detected || !kind.signatures.has(detected)) {
            throw new AppError(415, `Conteúdo do arquivo "${file.originalname}" não é ${kind.label} válido.`, 'UNSUPPORTED_FILE');
          }
          // garante extensão coerente com o conteúdo real
          if (!file.filename.endsWith(EXTENSIONS[detected])) {
            throw new AppError(415, 'Extensão não corresponde ao conteúdo do arquivo.', 'UNSUPPORTED_FILE');
          }
          // Imagens: remove EXIF/GPS e outros metadados pessoais (ver utils/imageSanitizer.js)
          if (IMAGE_TYPES.has(detected)) {
            try {
              await stripImageMetadata(path.join(fileStorage.dir, file.filename), detected);
            } catch {
              throw new AppError(415, `Não foi possível processar a imagem "${file.originalname}".`, 'UNSUPPORTED_FILE');
            }
          }
          req.uploaded[file.fieldname] = file.filename;
          req.uploaded[`${file.fieldname}OriginalName`] = file.originalname;
        }
        // Só depois de validar tudo: envia ao armazenamento definitivo (R2 ou disco)
        await Promise.all(files.map((f) => fileStorage.persist(f.filename)));
        next();
      } catch (error) {
        await fileStorage.removeMany(files.map((f) => f.filename));
        next(error);
      }
    },
  ];
}

/** Apaga arquivos recém-enviados quando a requisição falha depois do upload. */
export async function discardUploads(req) {
  const names = Object.entries(req.uploaded ?? {})
    .filter(([key]) => !key.endsWith('OriginalName'))
    .map(([, value]) => value);
  await fileStorage.removeMany(names);
}
