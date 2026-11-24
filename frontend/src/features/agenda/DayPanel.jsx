import { Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Avatar } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatLong } from '../../utils/date.js';
import { AVAILABILITY, SESSION_STATUS } from '../../utils/labels.js';

const GROUPS = [
  ['available', AVAILABILITY.available.label],
  ['maybe', AVAILABILITY.maybe.label],
  ['unavailable', AVAILABILITY.unavailable.label],
  ['pending', 'Sem resposta'],
];

/** Detalhe do dia selecionado: quem pode, quem não pode e as sessões marcadas. */
export function DayPanel({ date, day, sessions, membersById, onNewSession, onEditSession, onDeleteSession }) {
  const { user } = useAuth();
  const canManage = (s) => user.role === 'master' || s.createdBy?.id === user.id;

  return (
    <section className="panel day-panel" aria-labelledby="day-panel-title">
      <header className="panel__header">
        <h2 id="day-panel-title">{formatLong(date)}</h2>
        <button className="btn btn--sm btn--gold" onClick={onNewSession}>
          <Plus size={16} aria-hidden /> Sessão
        </button>
      </header>

      {sessions.map((s) => (
        <article key={s.id} className={`session-card session-card--${s.status}`}>
          <div className="session-card__top">
            <strong>{s.title}</strong>
            <span className={`tag tag--${s.status}`}>{SESSION_STATUS[s.status]}</span>
          </div>
          <div className="session-card__meta muted">
            {s.startTime && <span><Clock size={14} aria-hidden /> {s.startTime}</span>}
            {s.location && <span><MapPin size={14} aria-hidden /> {s.location}</span>}
          </div>
          {s.description && <p className="session-card__desc">{s.description}</p>}
          {canManage(s) && (
            <div className="session-card__actions">
              <button className="icon-btn" onClick={() => onEditSession(s)} aria-label="Editar sessão"><Pencil size={16} /></button>
              <button className="icon-btn icon-btn--danger" onClick={() => onDeleteSession(s)} aria-label="Excluir sessão"><Trash2 size={16} /></button>
            </div>
          )}
        </article>
      ))}

      {day ? (
        <div className="day-groups">
          {GROUPS.map(([key, label]) =>
            day[key].length > 0 ? (
              <div key={key} className={`day-group day-group--${key}`}>
                <h3>{label} <span className="muted">({day[key].length})</span></h3>
                <ul>
                  {day[key].map((id) => (
                    <li key={id}>
                      <Avatar user={membersById[id]} size={26} /> {membersById[id]?.name ?? '—'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="muted">Carregando disponibilidade…</p>
      )}
    </section>
  );
}
