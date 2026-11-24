/** Utilitários de data sem dependências. Datas trafegam como 'AAAA-MM-DD' (sem fuso). */

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

/** Grade do mês começando na segunda-feira (5 ou 6 semanas). */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = segunda
  const start = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);

  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISO(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const longFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatMonth = (year, month) => capitalize(monthFmt.format(new Date(year, month, 1)));
export const formatLong = (iso) => capitalize(longFmt.format(fromISO(iso)));
export const formatShort = (iso) => capitalize(shortFmt.format(fromISO(iso)));
export const formatTime = (timestamp) => timeFmt.format(new Date(timestamp));
