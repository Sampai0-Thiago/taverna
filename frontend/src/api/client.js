/**
 * Cliente HTTP único da aplicação.
 * - Sempre envia o cookie de sessão (credentials: 'include').
 * - Serializa JSON automaticamente; FormData é enviado como multipart.
 * - Converte respostas de erro em ApiError com status/código/mensagem do backend.
 */
const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Primeira mensagem de validação de campo, se houver. */
  get fieldMessage() {
    const fields = this.details?.fieldErrors ?? {};
    const first = Object.values(fields).flat()[0];
    return first ?? this.details?.formErrors?.[0] ?? null;
  }
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params ?? {}).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  const isForm = body instanceof FormData;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    signal,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = data?.error ?? {};
    throw new ApiError(response.status, err.message ?? 'Erro inesperado. Tente novamente.', err.code, err.details);
  }
  return data;
}

export const http = {
  get: (path, params, opts) => request(path, { ...opts, params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path, body) => request(path, { method: 'DELETE', body }),
};

/** Monta FormData ignorando valores vazios (undefined/null). */
export function toFormData(fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, value instanceof Blob ? value : String(value));
  });
  return form;
}
