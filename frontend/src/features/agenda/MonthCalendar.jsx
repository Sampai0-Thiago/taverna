import { Swords } from 'lucide-react';
import { WEEKDAYS } from '../../utils/date.js';

/**
 * Calendário mensal.
 * - modo "mine": mostra e edita a disponibilidade do usuário logado
 * - modo "group": compara todos (pontos coloridos = quem está disponível)
 */
export function MonthCalendar({ grid, daysByDate, sessionsByDate, membersById, meId, mode, today, selected, onSelect }) {
  return (
    <div className="calendar" role="grid" aria-label="Calendário">
      <div className="calendar__weekdays" role="row">
        {WEEKDAYS.map((w) => (
          <span key={w} role="columnheader">{w}</span>
        ))}
      </div>
      <div className="calendar__days">
        {grid.map((cell) => {
          const day = daysByDate[cell.iso];
          const sessions = sessionsByDate[cell.iso] ?? [];
          const activeSession = sessions.find((s) => s.status !== 'cancelled');
          const isPast = cell.iso < today;
          const myStatus = day && ['available', 'maybe', 'unavailable'].find((s) => day[s].includes(meId));

          const classes = ['day'];
          if (!cell.inMonth) classes.push('day--outside');
          if (isPast) classes.push('day--past');
          if (cell.iso === today) classes.push('day--today');
          if (cell.iso === selected) classes.push('day--selected');
          if (mode === 'mine' && myStatus) classes.push(`day--${myStatus}`);
          if (mode === 'group' && day?.allAvailable) classes.push('day--all');
          if (mode === 'group' && day?.unavailable.length) classes.push('day--blocked');
          if (activeSession) classes.push(activeSession.status === 'confirmed' ? 'day--session-confirmed' : 'day--session');

          const label = [
            cell.iso,
            day && `${day.available.length} disponíveis, ${day.unavailable.length} indisponíveis`,
            activeSession && `sessão: ${activeSession.title}`,
          ].filter(Boolean).join(' — ');

          return (
            <button
              key={cell.iso}
              role="gridcell"
              className={classes.join(' ')}
              onClick={() => onSelect(cell.iso, { isPast })}
              aria-label={label}
              aria-selected={cell.iso === selected}
            >
              <span className="day__number">{cell.day}</span>
              {activeSession && (
                <span className="day__session" title={activeSession.title}>
                  <Swords size={11} aria-hidden /> <span>{activeSession.title}</span>
                </span>
              )}
              {mode === 'group' && day && (
                <span className="day__dots" aria-hidden>
                  {day.available.slice(0, 6).map((id) => (
                    <i key={id} style={{ background: membersById[id]?.color }} />
                  ))}
                  {day.maybe.slice(0, 3).map((id) => (
                    <i key={id} className="dot--maybe" style={{ borderColor: membersById[id]?.color }} />
                  ))}
                </span>
              )}
              {mode === 'group' && day && (day.available.length > 0 || day.unavailable.length > 0) && (
                <span className="day__count" aria-hidden>
                  {day.available.length}/{day.available.length + day.maybe.length + day.unavailable.length + day.pending.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
