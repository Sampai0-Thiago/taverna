import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { qk, sessionsApi } from '../../api/endpoints.js';
import { PageHeader, QueryError } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMonth, formatShort, monthGrid, todayISO } from '../../utils/date.js';
import { AVAILABILITY } from '../../utils/labels.js';
import { DayPanel } from './DayPanel.jsx';
import { MonthCalendar } from './MonthCalendar.jsx';
import { SessionForm } from './SessionForm.jsx';
import { useAgendaRange, useMembers, useSaveAvailability, useSessionMutations } from './agenda.hooks.js';

const BRUSHES = ['available', 'maybe', 'unavailable'];

export default function AgendaPage() {
  const { user } = useAuth();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [mode, setMode] = useState('mine');
  const [brush, setBrush] = useState('available');
  const [selected, setSelected] = useState(today);
  const [sessionForm, setSessionForm] = useState(null); // { date, session? }

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const from = grid[0].iso;
  const to = grid[grid.length - 1].iso;

  const { byId: membersById } = useMembers();
  const { summary, daysByDate, sessionsByDate } = useAgendaRange(from, to);
  const upcoming = useQuery({ queryKey: qk.upcoming, queryFn: () => sessionsApi.upcoming(5) });
  const save = useSaveAvailability(from, to, user.id);
  const sessionsMut = useSessionMutations();

  const moveMonth = (delta) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const handleSelect = (iso, { isPast }) => {
    setSelected(iso);
    if (mode !== 'mine' || isPast) return;
    const day = daysByDate[iso];
    const current = day && BRUSHES.find((s) => day[s].includes(user.id));
    // clicar com o mesmo pincel desmarca o dia
    save.mutate([{ date: iso, status: current === brush ? null : brush }]);
  };

  const submitSession = (data) => {
    const done = { onSuccess: () => setSessionForm(null) };
    if (sessionForm.session) sessionsMut.update.mutate({ id: sessionForm.session.id, data }, done);
    else sessionsMut.create.mutate(data, done);
  };

  const deleteSession = (s) => {
    if (window.confirm(`Excluir a sessão "${s.title}"? Os itens da Taverna dela também serão removidos.`)) {
      sessionsMut.remove.mutate(s.id);
    }
  };

  const nextSession = upcoming.data?.[0];

  return (
    <div className="agenda">
      <PageHeader
        title="Agenda"
        subtitle="Marque seus dias e encontre a melhor data para o grupo"
        actions={
          <div className="segmented" role="tablist" aria-label="Modo da agenda">
            <button role="tab" aria-selected={mode === 'mine'} className={mode === 'mine' ? 'is-active' : ''} onClick={() => setMode('mine')}>
              Minha agenda
            </button>
            <button role="tab" aria-selected={mode === 'group'} className={mode === 'group' ? 'is-active' : ''} onClick={() => setMode('group')}>
              Comparar grupo
            </button>
          </div>
        }
      />

      <div className="agenda__layout">
        <section className="panel agenda__calendar">
          <div className="calendar-nav">
            <button className="icon-btn" onClick={() => moveMonth(-1)} aria-label="Mês anterior"><ChevronLeft /></button>
            <h2>{formatMonth(cursor.year, cursor.month)}</h2>
            <button className="icon-btn" onClick={() => moveMonth(1)} aria-label="Próximo mês"><ChevronRight /></button>
          </div>

          {mode === 'mine' ? (
            <div className="brushes" role="radiogroup" aria-label="Marcar dias como">
              <span className="muted">Toque nos dias para marcar como:</span>
              {BRUSHES.map((b) => (
                <button key={b} role="radio" aria-checked={brush === b} className={`brush brush--${b} ${brush === b ? 'is-active' : ''}`} onClick={() => setBrush(b)}>
                  {AVAILABILITY[b].label}
                </button>
              ))}
            </div>
          ) : (
            <div className="legend">
              <span><i className="legend__all" /> Todos podem</span>
              <span><i className="legend__blocked" /> Alguém não pode</span>
              <span><i className="legend__session" /> Sessão marcada</span>
              <span className="muted">● disponível · ○ talvez</span>
            </div>
          )}

          {summary.error ? (
            <QueryError error={summary.error} />
          ) : (
            <MonthCalendar
              grid={grid}
              daysByDate={daysByDate}
              sessionsByDate={sessionsByDate}
              membersById={membersById}
              meId={user.id}
              mode={mode}
              today={today}
              selected={selected}
              onSelect={handleSelect}
            />
          )}
        </section>

        <div className="agenda__side">
          {nextSession && (
            <section className="panel next-session">
              <span className="eyebrow">Próxima sessão</span>
              <h2>{nextSession.title}</h2>
              <p className="muted">
                {formatShort(nextSession.scheduledDate)}
                {nextSession.startTime && ` · ${nextSession.startTime}`}
              </p>
            </section>
          )}

          <DayPanel
            date={selected}
            day={daysByDate[selected]}
            sessions={sessionsByDate[selected] ?? []}
            membersById={membersById}
            onNewSession={() => setSessionForm({ date: selected })}
            onEditSession={(session) => setSessionForm({ date: session.scheduledDate, session })}
            onDeleteSession={deleteSession}
          />

          <section className="panel">
            <header className="panel__header">
              <h2><Sparkles size={18} aria-hidden /> Melhores datas</h2>
            </header>
            {summary.data?.bestDates?.length ? (
              <ol className="best-dates">
                {summary.data.bestDates.map((d) => (
                  <li key={d.date}>
                    <button className="best-dates__item" onClick={() => { setSelected(d.date); setMode('group'); }}>
                      <span className="best-dates__date">{formatShort(d.date)}</span>
                      <span className="best-dates__meta">
                        <span className="tag tag--green">{d.available.length} sim</span>
                        {d.maybe.length > 0 && <span className="tag tag--amber">{d.maybe.length} talvez</span>}
                        {d.unavailable.length > 0 && <span className="tag tag--red">{d.unavailable.length} não</span>}
                      </span>
                    </button>
                    <button className="icon-btn" aria-label="Marcar sessão nesta data" onClick={() => setSessionForm({ date: d.date })}>
                      <CalendarCheck size={18} />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Quando o grupo marcar disponibilidade neste mês, as melhores datas aparecem aqui.</p>
            )}
          </section>
        </div>
      </div>

      {sessionForm && (
        <SessionForm
          date={sessionForm.date}
          session={sessionForm.session}
          pending={sessionsMut.create.isPending || sessionsMut.update.isPending}
          onSubmit={submitSession}
          onClose={() => setSessionForm(null)}
        />
      )}
    </div>
  );
}
