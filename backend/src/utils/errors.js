/**
 * Erro de domínio com status HTTP. Tudo que for AppError é seguro para expor ao cliente;
 * qualquer outro erro vira 500 genérico no errorHandler.
 */
export class AppError extends Error {
  constructor(status, message, code = 'ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg = 'Requisição inválida', details) =>
  new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Autenticação necessária') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Você não tem permissão para esta ação') =>
  new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Recurso não encontrado') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg = 'Conflito com o estado atual') => new AppError(409, msg, 'CONFLICT');
