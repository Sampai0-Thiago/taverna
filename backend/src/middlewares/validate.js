import { AppError } from '../utils/errors.js';

/**
 * Valida body/query/params com schemas Zod.
 * Os dados já convertidos ficam em req.valid.{body,query,params}
 * (no Express 5, req.query é somente leitura).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        throw new AppError(422, 'Dados inválidos', 'VALIDATION_ERROR', result.error.flatten());
      }
      req.valid[key] = result.data;
    }
    next();
  };
}
