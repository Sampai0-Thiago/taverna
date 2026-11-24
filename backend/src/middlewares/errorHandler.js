import multer from 'multer';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { discardUploads } from './upload.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: [413, 'Arquivo grande demais.'],
  LIMIT_FILE_COUNT: [400, 'Arquivos demais na requisição.'],
  LIMIT_UNEXPECTED_FILE: [400, 'Campo de arquivo inesperado.'],
};

// Códigos de erro do PostgreSQL → resposta HTTP
const PG_ERRORS = {
  23505: [409, 'Registro duplicado.', 'CONFLICT'],
  23503: [400, 'Referência a um registro inexistente.', 'INVALID_REFERENCE'],
  23514: [422, 'Valor fora das regras permitidas.', 'VALIDATION_ERROR'],
  '22P02': [400, 'Identificador inválido.', 'BAD_REQUEST'],
};

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
export async function errorHandler(err, req, res, _next) {
  await discardUploads(req); // nunca deixa arquivos órfãos quando a requisição falha

  let status = 500;
  let body = { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' };

  if (err instanceof AppError) {
    status = err.status;
    body = { code: err.code, message: err.message, details: err.details };
  } else if (err instanceof multer.MulterError) {
    const [s, message] = MULTER_MESSAGES[err.code] ?? [400, err.message];
    status = s;
    body = { code: err.code, message };
  } else if (err?.code && PG_ERRORS[err.code]) {
    const [s, message, code] = PG_ERRORS[err.code];
    status = s;
    body = { code, message };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { code: 'BAD_JSON', message: 'JSON malformado.' };
  }

  if (status >= 500) logger.error({ err, path: req.path }, 'erro não tratado');
  res.status(status).json({ error: body });
}
