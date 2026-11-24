/**
 * Regras de comparação de agendas — funções PURAS (sem banco, sem HTTP),
 * testadas em tests/availability.summary.test.js.
 */

/** Lista todas as datas ISO (AAAA-MM-DD) entre from e to, inclusive. */
export function eachDate(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Agrupa as marcações por dia e calcula quem está disponível, talvez, indisponível ou sem resposta.
 *
 * @param {object} input
 * @param {{userId:string,date:string,status:'available'|'maybe'|'unavailable'}[]} input.entries
 * @param {string[]} input.memberIds  todos os membros do grupo
 * @param {string} input.from
 * @param {string} input.to
 */
export function summarizeAvailability({ entries, memberIds, from, to }) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, new Map());
    byDate.get(e.date).set(e.userId, e.status);
  }

  return eachDate(from, to).map((date) => {
    const marks = byDate.get(date) ?? new Map();
    const day = { date, available: [], maybe: [], unavailable: [], pending: [] };
    for (const id of memberIds) {
      const status = marks.get(id);
      (status ? day[status] : day.pending).push(id);
    }
    day.allAvailable = memberIds.length > 0 && day.available.length === memberIds.length;
    day.score = scoreDay(day);
    return day;
  });
}

/**
 * Pontuação de um dia: disponível vale 2, talvez 1, sem resposta 0, indisponível −3.
 * Um "não" pesa mais que um "sim", porque uma ausência costuma inviabilizar a sessão.
 */
export function scoreDay(day) {
  return day.available.length * 2 + day.maybe.length - day.unavailable.length * 3;
}

/**
 * Melhores datas para jogar: ordena por menos indisponíveis, depois maior pontuação, depois data mais próxima.
 * Ignora dias anteriores a `notBefore` e dias em que ninguém marcou "disponível".
 */
export function rankBestDates(days, { notBefore, limit = 5 } = {}) {
  return days
    .filter((d) => (!notBefore || d.date >= notBefore) && d.available.length > 0)
    .sort(
      (a, b) =>
        a.unavailable.length - b.unavailable.length ||
        b.score - a.score ||
        a.date.localeCompare(b.date),
    )
    .slice(0, limit);
}
