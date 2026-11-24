import { useState } from 'react';
import { Field, FilePicker, Modal } from '../../components/ui/index.jsx';

const LABELS = { map: 'mapa', npc: 'NPC' };

/** Envio/edição de mapa ou NPC (imagem + título + descrição). */
export function MediaForm({ kind, item, onSubmit, onClose, pending }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [image, setImage] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...(item ? {} : { kind }), title, description, image: image ?? undefined });
  };

  return (
    <Modal title={item ? `Editar ${LABELS[kind]}` : `Novo ${LABELS[kind]}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <FilePicker
          label="Imagem"
          accept="image"
          file={image}
          onChange={setImage}
          currentUrl={item?.imageUrl}
          hint="PNG, JPG, WEBP ou GIF"
        />
        <Field label={kind === 'npc' ? 'Nome do NPC' : 'Título'}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </Field>
        <Field label={kind === 'npc' ? 'Quem é? (personalidade, segredos…)' : 'Descrição'}>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
        </Field>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--gold" disabled={pending || (!item && !image)}>{pending ? 'Enviando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
