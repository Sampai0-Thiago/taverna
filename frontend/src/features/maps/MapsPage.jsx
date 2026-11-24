import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon, MapPin, Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mediaApi, qk } from '../../api/endpoints.js';
import { EmptyState, PageHeader, QueryError, Spinner } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { MediaForm } from './MediaForm.jsx';

const TABS = [
  { kind: 'map', label: 'Mapas', icon: MapIcon },
  { kind: 'npc', label: 'NPCs', icon: UsersRound },
];

export default function MapsPage() {
  const toast = useToast();
  const { isMaster } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const kind = params.get('tipo') === 'npc' ? 'npc' : 'map'; // aba na URL: compartilhável e sobrevive ao F5
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: qk.media(kind), queryFn: () => mediaApi.list(kind) });

  const create = useMutation({
    mutationFn: mediaApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.media(kind) });
      setCreating(false);
      toast.success(kind === 'map' ? 'Mapa enviado!' : 'NPC adicionado!');
    },
    onError: toast.error,
  });

  return (
    <div>
      <PageHeader
        title="Mapas & NPCs"
        subtitle={isMaster ? 'O mundo da campanha, em imagens' : 'O mundo da campanha — somente o mestre envia e edita'}
        actions={isMaster && <button className="btn btn--gold" onClick={() => setCreating(true)}><Plus size={18} aria-hidden /> Enviar</button>}
      />

      <div className="tabs" role="tablist">
        {TABS.map(({ kind: k, label, icon: Icon }) => (
          <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'is-active' : ''} onClick={() => setParams(k === 'npc' ? { tipo: 'npc' } : {})}>
            <Icon size={17} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <QueryError error={error} />
      ) : data.length === 0 ? (
        <EmptyState icon={kind === 'map' ? <MapIcon size={40} /> : <UsersRound size={40} />} title={kind === 'map' ? 'Nenhum mapa ainda' : 'Nenhum NPC ainda'}>
          {isMaster ? 'Envie a primeira imagem para o grupo.' : 'Quando o mestre enviar, as imagens aparecem aqui.'}
        </EmptyState>
      ) : (
        <div className={`card-grid ${kind === 'npc' ? 'card-grid--npc' : ''}`}>
          {data.map((m) => (
            <Link key={m.id} to={`/mapas/${m.id}`} className={`media-card panel media-card--${m.kind}`}>
              <img src={m.imageUrl} alt="" loading="lazy" />
              <div className="media-card__body">
                <h2>{m.title}</h2>
                {m.kind === 'map' && m.pinCount > 0 && (
                  <span className="tag tag--purple"><MapPin size={12} aria-hidden /> {m.pinCount}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <MediaForm kind={kind} onClose={() => setCreating(false)} onSubmit={create.mutate} pending={create.isPending} />}
    </div>
  );
}
