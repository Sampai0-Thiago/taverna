import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Abstração de armazenamento de arquivos (disco local).
 * O banco guarda apenas o NOME do arquivo; trocar por S3/R2/MinIO
 * exige reimplementar só este módulo (mesma interface).
 */
export const fileStorage = {
  dir: env.uploadDir,

  async init() {
    await mkdir(env.uploadDir, { recursive: true });
  },

  /** Caminho absoluto, protegido contra path traversal. */
  resolve(fileName) {
    const safe = path.basename(fileName);
    return path.join(env.uploadDir, safe);
  },

  /** URL pública (rota autenticada) usada pelo frontend. */
  url(fileName) {
    return fileName ? `/api/files/${encodeURIComponent(fileName)}` : null;
  },

  async readHeader(fileName, length = 16) {
    const handle = await open(this.resolve(fileName), 'r');
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, 0);
      return buffer;
    } finally {
      await handle.close();
    }
  },

  /** Remove sem lançar erro — usado em limpezas (rollback, substituição). */
  async remove(fileName) {
    if (!fileName) return;
    try {
      await unlink(this.resolve(fileName));
    } catch (error) {
      if (error.code !== 'ENOENT') logger.warn({ err: error, fileName }, 'falha ao remover arquivo');
    }
  },

  async removeMany(fileNames) {
    await Promise.all(fileNames.filter(Boolean).map((f) => this.remove(f)));
  },
};
