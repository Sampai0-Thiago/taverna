import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, ExternalLink, FileText, Pencil, ScrollText, Trash2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { charactersApi, qk } from '../../api/endpoints.js';
import { Avatar, EmptyState, QueryError, Spinner } from '../../components/ui/index.jsx';
import { useCanManage } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CharacterForm } from './CharacterForm.jsx';

// pdf.js é pesado: só carrega quando alguém abre uma ficha
const PdfViewer = lazy(() => import('./PdfViewer.jsx'));

export default function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: c, isLoading, error } = useQuery({ queryKey: qk.character(id), queryFn: () => charactersApi.get(id) });
  const canManage = useCanManage(c?.owner?.id);

  const update = useMutation({
    mutationFn: (fields) => charactersApi.update(id, fields),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.character(id), updated);
      queryClient.invalidateQueries({ queryKey: qk.characters, exact: true });
      setEditing(false);
      toast.success('Personagem atualizado.');
    },
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: () => charactersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.characters });
      toast.success('Personagem excluído.');
      navigate('/personagens');
    },
    onError: toast.error,
  });

  if (isLoading) return <Spinner />;
  if (error) return <QueryError error={error} />;

  return (
    <div className="character-detail">
      <Link to="/personagens" className="back-link"><ChevronLeft size={18} aria-hidden /> Personagens</Link>

      <header className="panel character-hero">
        <div className="character-hero__portrait">
          {c.portraitUrl ? <img src={c.portraitUrl} alt={`Retrato de ${c.name}`} /> : <ScrollText size={48} aria-hidden />}
        </div>
        <div className="character-hero__info">
          <h1>{c.name}</h1>
          <p className="character-hero__tags">
            {c.race && <span className="tag">{c.race}</span>}
            {c.className && <span className="tag">{c.className}</span>}
            <span className="tag tag--gold">Nível {c.level}</span>
          </p>
          <p className="muted character-hero__owner">
            Jogador: <Avatar user={c.owner} size={22} /> {c.owner?.name}
          </p>
          {c.summary && <p className="character-hero__summary">{c.summary}</p>}
        </div>
        {canManage && (
          <div className="character-hero__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden /> Editar</button>
            <button className="btn btn--danger btn--sm" onClick={() => window.confirm(`Excluir ${c.name}? Esta ação não pode ser desfeita.`) && remove.mutate()}>
              <Trash2 size={15} aria-hidden /> Excluir
            </button>
          </div>
        )}
      </header>

      <section className="panel">
        <header className="panel__header">
          <h2><FileText size={18} aria-hidden /> Ficha de personagem</h2>
          {c.sheet && (
            <div className="panel__header-actions">
              <a className="btn btn--ghost btn--sm" href={c.sheet.url} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden /> Abrir</a>
              <a className="btn btn--ghost btn--sm" href={c.sheet.url} download={c.sheet.fileName}><Download size={15} aria-hidden /> Baixar</a>
            </div>
          )}
        </header>
        {c.sheet ? (
          <Suspense fallback={<Spinner />}>
            <PdfViewer url={c.sheet.url} />
          </Suspense>
        ) : (
          <EmptyState icon={<FileText size={36} />} title="Sem ficha enviada">
            {canManage ? 'Clique em “Editar” para enviar o PDF da ficha.' : 'O jogador ainda não enviou a ficha.'}
          </EmptyState>
        )}
      </section>

      {editing && <CharacterForm character={c} onClose={() => setEditing(false)} onSubmit={update.mutate} pending={update.isPending} />}
    </div>
  );
}
