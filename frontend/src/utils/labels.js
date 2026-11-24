/** Rótulos em português para os enums da API (fonte única para toda a UI). */

export const AVAILABILITY = {
  available: { label: 'Disponível', short: 'Sim', tone: 'green' },
  maybe: { label: 'Talvez', short: 'Talvez', tone: 'amber' },
  unavailable: { label: 'Indisponível', short: 'Não', tone: 'red' },
};

export const SESSION_STATUS = {
  planned: 'Planejada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

export const TAVERN_CATEGORIES = {
  food: { label: 'Comida', emoji: '🍖' },
  drink: { label: 'Bebida', emoji: '🍺' },
  utensil: { label: 'Utensílios', emoji: '🥄' },
  other: { label: 'Outros', emoji: '📦' },
};

export const TAVERN_STATUS = {
  open: 'Sem responsável',
  claimed: 'Vai levar',
  bought: 'Comprado',
};

export const ROLES = { master: 'Mestre', player: 'Jogador' };

export const PLAYER_COLORS = ['#8B5CF6', '#D4A23A', '#22C55E', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#F97316'];
