import { useState } from 'react';
import { Field, Modal } from '../../components/ui/index.jsx';
import { SESSION_STATUS } from '../../utils/labels.js';

/** Criar/editar sessão. `session` presente = edição. */
export function SessionForm({ date, session, onSubmit, onClose, pending }) {
  const [form, setForm] = useState({
    title: session?.title ?? '',
    scheduledDate: session?.scheduledDate ?? date,
    startTime: session?.startTime ?? '19:00',
    location: session?.location ?? '',
    description: session?.description ?? '',
    status: session?.status ?? 'planned',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      startTime: form.startTime || null,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
    });
  };

  return (
    <Modal title={session ? 'Editar sessão' : 'Marcar sessão'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Título">
          <input value={form.title} onChange={set('title')} required minLength={2} maxLength={120} placeholder="A Floresta Sussurrante" />
        </Field>
        <div className="form__row">
          <Field label="Data">
            <input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} required />
          </Field>
          <Field label="Horário">
            <input type="time" value={form.startTime} onChange={set('startTime')} />
          </Field>
        </div>
        <Field label="Local">
          <input value={form.location} onChange={set('location')} maxLength={160} placeholder="Casa do mestre, Discord…" />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')}>
            {Object.entries(SESSION_STATUS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <textarea rows={3} value={form.description} onChange={set('description')} maxLength={2000} />
        </Field>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--gold" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
