import { useState } from 'react';
import { Field, FilePicker, Modal } from '../../components/ui/index.jsx';

/** Formulário de personagem (criação/edição) com retrato e ficha em PDF. */
export function CharacterForm({ character, onSubmit, onClose, pending }) {
  const [form, setForm] = useState({
    name: character?.name ?? '',
    className: character?.className ?? '',
    race: character?.race ?? '',
    level: character?.level ?? 1,
    summary: character?.summary ?? '',
  });
  const [portrait, setPortrait] = useState(null);
  const [sheet, setSheet] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, portrait: portrait ?? undefined, sheet: sheet ?? undefined });
  };

  return (
    <Modal title={character ? 'Editar personagem' : 'Novo personagem'} onClose={onClose} wide>
      <form className="form character-form" onSubmit={submit}>
        <div className="character-form__files">
          <FilePicker label="Retrato" accept="image" file={portrait} onChange={setPortrait} currentUrl={character?.portraitUrl} />
          <FilePicker
            label="Ficha (PDF)"
            accept="pdf"
            file={sheet}
            onChange={setSheet}
            hint={character?.sheet ? `Atual: ${character.sheet.fileName}` : 'Todos do grupo poderão visualizar'}
          />
        </div>
        <div className="character-form__fields">
          <Field label="Nome">
            <input value={form.name} onChange={set('name')} required maxLength={80} placeholder="Elara, a Veloz" />
          </Field>
          <div className="form__row">
            <Field label="Classe"><input value={form.className} onChange={set('className')} maxLength={60} placeholder="Patrulheira" /></Field>
            <Field label="Raça"><input value={form.race} onChange={set('race')} maxLength={60} placeholder="Meio-elfa" /></Field>
            <Field label="Nível"><input type="number" min={1} max={30} value={form.level} onChange={set('level')} /></Field>
          </div>
          <Field label="Resumo / história">
            <textarea rows={4} value={form.summary} onChange={set('summary')} maxLength={2000} />
          </Field>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn--gold" disabled={pending}>{pending ? 'Enviando…' : 'Salvar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
