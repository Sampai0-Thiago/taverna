import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { charactersApi, qk } from '../../api/endpoints.js';
import { Avatar, EmptyState, PageHeader, QueryError, Spinner } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CharacterForm } from './CharacterForm.jsx';

export default function CharactersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: qk.characters, queryFn: charactersApi.list });

  const create = useMutation({
    mutationFn: charactersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.characters });
      setCreating(false);
      toast.success('Personagem criado!');
    },
    onError: toast.error,
  });

  return (
    <div>
      <PageHeader
        title="Personagens"
        subtitle="Fichas do grupo — todos podem visualizar"
        actions={<button className="btn btn--gold" onClick={() => setCreating(true)}><Plus size={18} aria-hidden /> Novo</button>}
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <QueryError error={error} />
      ) : data.length === 0 ? (
        <EmptyState icon={<ScrollText size={40} />} title="Nenhum herói por aqui">
          Crie seu personagem e envie a ficha em PDF.
        </EmptyState>
      ) : (
        <div className="card-grid">
          {data.map((c) => (
            <Link key={c.id} to={`/personagens/${c.id}`} className="char-card panel">
              <div className="char-card__portrait">
                {c.portraitUrl ? <img src={c.portraitUrl} alt="" loading="lazy" /> : <ScrollText size={42} aria-hidden />}
                <span className="char-card__level">Nv {c.level}</span>
              </div>
              <div className="char-card__body">
                <h2>{c.name}</h2>
                <p className="muted">{[c.race, c.className].filter(Boolean).join(' · ') || 'Aventureiro'}</p>
                <div className="char-card__footer">
                  <span className="char-card__owner"><Avatar user={c.owner} size={20} /> {c.owner?.name}</span>
                  {c.sheet && <span className="tag tag--gold"><FileText size={12} aria-hidden /> Ficha</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <CharacterForm onClose={() => setCreating(false)} onSubmit={create.mutate} pending={create.isPending} />}
    </div>
  );
}
