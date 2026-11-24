/**
 * Data de hoje (AAAA-MM-DD) no fuso do servidor.
 * Configure TZ=America/Sao_Paulo no ambiente para alinhar com o grupo.
 */
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
