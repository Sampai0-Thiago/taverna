import { http, toFormData } from './client.js';

/** Funções de acesso à API, uma por endpoint. Componentes nunca chamam fetch diretamente. */

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (data) => http.post('/auth/login', data),
  register: (data) => http.post('/auth/register', data),
  logout: () => http.post('/auth/logout'),
  verifyEmail: (code) => http.post('/auth/verify-email', { code }),
  resendVerification: () => http.post('/auth/resend-verification'),
};

export const usersApi = {
  list: () => http.get('/users'),
  updateMe: (data) => http.patch('/users/me', data),
  updatePreferences: (data) => http.patch('/users/me/preferences', data),
  changePassword: (data) => http.patch('/users/me/password', data),
  uploadAvatar: (file) => http.put('/users/me/avatar', toFormData({ avatar: file })),
  activateMaster: (token) => http.post('/users/me/master', { token }),
  deactivateMaster: () => http.delete('/users/me/master'),
};

export const availabilityApi = {
  summary: (from, to) => http.get('/availability/summary', { from, to }),
  saveMine: (entries) => http.put('/availability/me', { entries }),
};

export const sessionsApi = {
  range: (from, to) => http.get('/sessions', { from, to }),
  upcoming: (limit = 10) => http.get('/sessions', { upcoming: 'true', limit }),
  create: (data) => http.post('/sessions', data),
  update: (id, data) => http.patch(`/sessions/${id}`, data),
  remove: (id) => http.delete(`/sessions/${id}`),
};

export const charactersApi = {
  list: () => http.get('/characters'),
  get: (id) => http.get(`/characters/${id}`),
  create: (fields) => http.post('/characters', toFormData(fields)),
  update: (id, fields) => http.patch(`/characters/${id}`, toFormData(fields)),
  remove: (id) => http.delete(`/characters/${id}`),
};

export const mediaApi = {
  list: (kind) => http.get('/media', { kind }),
  get: (id) => http.get(`/media/${id}`),
  create: (fields) => http.post('/media', toFormData(fields)),
  update: (id, fields) => http.patch(`/media/${id}`, toFormData(fields)),
  remove: (id) => http.delete(`/media/${id}`),
  addPin: (id, pin) => http.post(`/media/${id}/pins`, pin),
  removePin: (id, pinId) => http.delete(`/media/${id}/pins/${pinId}`),
};

export const tavernApi = {
  list: (sessionId) => http.get('/tavern/items', { sessionId }),
  create: (data) => http.post('/tavern/items', data),
  update: (id, data) => http.patch(`/tavern/items/${id}`, data),
  claim: (id) => http.post(`/tavern/items/${id}/claim`),
  release: (id) => http.post(`/tavern/items/${id}/release`),
  setStatus: (id, status) => http.patch(`/tavern/items/${id}/status`, { status }),
  remove: (id) => http.delete(`/tavern/items/${id}`),
};

export const diceApi = {
  history: (limit = 30, after) => http.get('/dice/rolls', { limit, after }),
  roll: (data) => http.post('/dice/rolls', data),
};

/** Chaves de cache do React Query centralizadas (evita strings soltas e erros de invalidação). */
export const qk = {
  me: ['me'],
  users: ['users'],
  availability: (from, to) => ['availability', from, to],
  sessions: (from, to) => ['sessions', from, to],
  upcoming: ['sessions', 'upcoming'],
  characters: ['characters'],
  character: (id) => ['characters', id],
  media: (kind) => ['media', kind],
  mediaItem: (id) => ['media', 'item', id],
  tavern: (sessionId) => ['tavern', sessionId],
  diceHistory: ['dice', 'history'],
};
