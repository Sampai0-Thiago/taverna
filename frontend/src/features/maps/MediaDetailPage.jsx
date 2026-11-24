import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, MapPin, MapPinPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mediaApi, qk } from '../../api/endpoints.js';
import { Avatar, QueryError, Spinner } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { MediaForm } from './MediaForm.jsx';

/** Mapa interativo: clique para posicionar marcadores (coordenadas em % → independem do tamanho da tela). */
function InteractiveMap({ item, canEdit, onAddPin, onRemovePin }) {
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState(null); // { x, y, label, description }
  const [active, setActive] = useState(null);

  const handleClick = (e) => {
    if (!placing) return setActive(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - rect.left) / rect.width) * 100).toFixed(2);
    const y = +(((e.clientY - rect.top) / rect.height) * 100).toFixed(2);
    setDraft({ x, y, label: '', description: '' });
  };

  const saveDraft = (e) => {
    e.preventDefault();
    onAddPin(draft, () => {
      setDraft(null);
      setPlacing(false);
    });
  };

  return (
    <div className="map-view">
      <div className="map-view__toolbar">
        {canEdit && (
          <button className={`btn btn--sm ${placing ? 'btn--gold' : 'btn--ghost'}`} onClick={() => { setPlacing((p) => !p); setDraft(null); }}>
            <MapPinPlus size={16} aria-hidden /> {placing ? 'Clique no mapa…' : 'Adicionar marcador'}
          </button>
        )}
        <a className="btn btn--sm btn--ghost" href={item.imageUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden /> Tamanho real</a>
      </div>

      <div className={`map-canvas ${placing ? 'is-placing' : ''}`} onClick={handleClick}>
        <img src={item.imageUrl} alt={item.title} draggable={false} />
        {item.pins.map((pin) => (
          <div
            key={pin.id}
            className={`pin ${active === pin.id ? 'is-active' : ''}`}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="pin__marker" onClick={() => setActive(active === pin.id ? null : pin.id)} aria-expanded={active === pin.id} aria-label={pin.label}>
              <MapPin size={28} aria-hidden />
              <span className="pin__label">{pin.label}</span>
            </button>
            {active === pin.id && (
              <div className="pin__popover panel">
                <strong>{pin.label}</strong>
                {pin.description && <span>{pin.description}</span>}
                <small className="muted">por {pin.createdBy?.name ?? '—'}</small>
                {canEdit && (
                  <button className="pin__remove" onClick={() => onRemovePin(pin)}>
                    <Trash2 size={14} aria-hidden /> Remover
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {draft && <span className="pin pin--draft" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}><MapPin size={28} aria-hidden /></span>}
      </div>

      {draft && (
        <form className="panel pin-form" onSubmit={saveDraft}>
          <input autoFocus placeholder="Nome do local" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required maxLength={80} />
          <input placeholder="Detalhes (opcional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={1000} />
          <button className="btn btn--gold btn--sm">Salvar</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft(null)}>Cancelar</button>
        </form>
      )}
    </div>
  );
}

export default function MediaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const key = qk.mediaItem(id);
  const { data: item, isLoading, error } = useQuery({ queryKey: key, queryFn: () => mediaApi.get(id) });
  const { isMaster: canManage } = useAuth(); // mapas e NPCs: só o mestre modifica

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['media'] });

  const update = useMutation({
    mutationFn: (fields) => mediaApi.update(id, fields),
    onSuccess: () => { refresh(); setEditing(false); toast.success('Atualizado.'); },
    onError: toast.error,
  });
  const remove = useMutation({
    mutationFn: () => mediaApi.remove(id),
    onSuccess: () => { refresh(); navigate(`/mapas${item.kind === 'npc' ? '?tipo=npc' : ''}`); },
    onError: toast.error,
  });
  const addPin = useMutation({
    mutationFn: ({ x, y, label, description }) => mediaApi.addPin(id, { x, y, label, description: description || null }),
    onSuccess: () => { refresh(); toast.success('Marcador adicionado.'); },
    onError: toast.error,
  });
  const removePin = useMutation({ mutationFn: (pin) => mediaApi.removePin(id, pin.id), onSuccess: refresh, onError: toast.error });

  if (isLoading) return <Spinner />;
  if (error) return <QueryError error={error} />;

  return (
    <div className="media-detail">
      <Link to={`/mapas${item.kind === 'npc' ? '?tipo=npc' : ''}`} className="back-link">
        <ChevronLeft size={18} aria-hidden /> {item.kind === 'map' ? 'Mapas' : 'NPCs'}
      </Link>

      <header className="media-detail__header">
        <div>
          <h1>{item.title}</h1>
          <p className="muted media-detail__by">Enviado por <Avatar user={item.uploadedBy} size={20} /> {item.uploadedBy?.name ?? '—'}</p>
        </div>
        {canManage && (
          <div className="page-header__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden /> Editar</button>
            <button className="btn btn--danger btn--sm" onClick={() => window.confirm('Excluir esta imagem?') && remove.mutate()}><Trash2 size={15} aria-hidden /> Excluir</button>
          </div>
        )}
      </header>

      {item.kind === 'map' ? (
        <section className="panel">
          <InteractiveMap
            item={item}
            canEdit={canManage}
            onAddPin={(pin, done) => addPin.mutate(pin, { onSuccess: done })}
            onRemovePin={(pin) => window.confirm(`Remover "${pin.label}"?`) && removePin.mutate(pin)}
          />
          {item.description && <p className="media-detail__desc">{item.description}</p>}
        </section>
      ) : (
        <section className="panel npc-sheet">
          <img src={item.imageUrl} alt={item.title} />
          <div className="npc-sheet__text">{item.description || <span className="muted">Sem descrição.</span>}</div>
        </section>
      )}

      {editing && <MediaForm kind={item.kind} item={item} onClose={() => setEditing(false)} onSubmit={update.mutate} pending={update.isPending} />}
    </div>
  );
}
