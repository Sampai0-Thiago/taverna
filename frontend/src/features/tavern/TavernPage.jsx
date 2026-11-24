import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Beer, Check, Hand, Plus, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { qk, sessionsApi, tavernApi } from '../../api/endpoints.js';
import { Avatar, EmptyState, PageHeader, QueryError, Spinner } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatShort } from '../../utils/date.js';
import { TAVERN_CATEGORIES, TAVERN_STATUS } from '../../utils/labels.js';

const EMPTY_FORM = { name: '', quantity: '', category: 'food', claim: true };

/** Mutação da Taverna que recarrega a lista ao terminar (inclusive em conflito 409). */
function useTavernAction(sessionId, mutationFn, successMessage) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.tavern(sessionId) });
  return useMutation({
    mutationFn,
    onSuccess: () => {
      refresh();
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(error);
      refresh();
    },
  });
}

export default function TavernPage() {
  const { user } = useAuth();
  const upcoming = useQuery({ queryKey: qk.upcoming, queryFn: () => sessionsApi.upcoming(10) });
  const [chosen, setChosen] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // padrão: próxima sessão; sem sessões, a lista geral
  const sessionId = chosen ?? upcoming.data?.[0]?.id ?? 'general';
  const items = useQuery({
    queryKey: qk.tavern(sessionId),
    queryFn: () => tavernApi.list(sessionId),
    enabled: !upcoming.isLoading,
    refetchInterval: 15_000, // vê o que os outros assumiram sem recarregar
  });

  const create = useTavernAction(sessionId, tavernApi.create, 'Item adicionado à Taverna!');
  const claim = useTavernAction(sessionId, tavernApi.claim, 'Fechado, você leva!');
  const release = useTavernAction(sessionId, tavernApi.release);
  const setStatus = useTavernAction(sessionId, ({ id, status }) => tavernApi.setStatus(id, status));
  const remove = useTavernAction(sessionId, tavernApi.remove, 'Item removido.');

  const submit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        sessionId: sessionId === 'general' ? null : sessionId,
        name: form.name,
        quantity: form.quantity || null,
        category: form.category,
        claim: form.claim,
      },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  };

  const list = items.data ?? [];
  const covered = list.filter((i) => i.status !== 'open').length;
  const grouped = Object.keys(TAVERN_CATEGORIES)
    .map((cat) => [cat, list.filter((i) => i.category === cat)])
    .filter(([, arr]) => arr.length);

  const isMine = (i) => i.assignedTo?.id === user.id;
  const canDelete = (i) => user.role === 'master' || i.createdBy?.id === user.id;

  return (
    <div className="tavern">
      <PageHeader
        title="Taverna"
        subtitle="Combine quem leva o quê para o lanche"
        actions={
          <select className="select-pill" value={sessionId} onChange={(e) => setChosen(e.target.value)} aria-label="Sessão">
            {(upcoming.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{formatShort(s.scheduledDate)} — {s.title}</option>
            ))}
            <option value="general">Lista geral</option>
          </select>
        }
      />

      <div className="tavern__layout">
        <form className="panel tavern__form" onSubmit={submit}>
          <h2><Plus size={18} aria-hidden /> Novo item</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Pão de queijo" required maxLength={100} aria-label="Item" />
          <div className="form__row">
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qtd. (ex.: 2 L)" maxLength={40} aria-label="Quantidade" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="Categoria">
              {Object.entries(TAVERN_CATEGORIES).map(([value, c]) => (
                <option key={value} value={value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.claim} onChange={(e) => setForm({ ...form, claim: e.target.checked })} />
            Eu levo este item
          </label>
          <button className="btn btn--gold" disabled={create.isPending}>Adicionar</button>

          {list.length > 0 && (
            <div className="progress" aria-label={`${covered} de ${list.length} itens com responsável`}>
              <div className="progress__bar" style={{ width: `${(covered / list.length) * 100}%` }} />
              <span>{covered}/{list.length} itens garantidos</span>
            </div>
          )}
        </form>

        <section className="tavern__list">
          {items.isLoading || upcoming.isLoading ? (
            <Spinner />
          ) : items.error ? (
            <QueryError error={items.error} />
          ) : list.length === 0 ? (
            <EmptyState icon={<Beer size={40} />} title="A taverna está vazia">
              Adicione o primeiro petisco da sessão.
            </EmptyState>
          ) : (
            grouped.map(([cat, arr]) => (
              <div key={cat} className="panel tavern__group">
                <h2>{TAVERN_CATEGORIES[cat].emoji} {TAVERN_CATEGORIES[cat].label}</h2>
                <ul>
                  {arr.map((item) => (
                    <li key={item.id} className={`tavern-item tavern-item--${item.status}`}>
                      <div className="tavern-item__main">
                        <strong>{item.name}</strong>
                        {item.quantity && <span className="muted"> · {item.quantity}</span>}
                        <div className="tavern-item__who">
                          {item.assignedTo ? (
                            <><Avatar user={item.assignedTo} size={20} /> {item.assignedTo.name}</>
                          ) : (
                            <span className="muted">Ninguém ainda</span>
                          )}
                          <span className={`tag tag--${item.status}`}>{TAVERN_STATUS[item.status]}</span>
                        </div>
                      </div>
                      <div className="tavern-item__actions">
                        {item.status === 'open' && (
                          <button className="btn btn--sm btn--gold" onClick={() => claim.mutate(item.id)}>
                            <Hand size={15} aria-hidden /> Eu levo
                          </button>
                        )}
                        {(isMine(item) || user.role === 'master') && item.status !== 'open' && (
                          <>
                            <button
                              className={`icon-btn ${item.status === 'bought' ? 'is-on' : ''}`}
                              aria-label={item.status === 'bought' ? 'Desmarcar comprado' : 'Marcar como comprado'}
                              aria-pressed={item.status === 'bought'}
                              onClick={() => setStatus.mutate({ id: item.id, status: item.status === 'bought' ? 'claimed' : 'bought' })}
                            >
                              <Check size={16} />
                            </button>
                            <button className="icon-btn" aria-label="Desistir do item" onClick={() => release.mutate(item.id)}>
                              <Undo2 size={16} />
                            </button>
                          </>
                        )}
                        {canDelete(item) && (
                          <button className="icon-btn icon-btn--danger" aria-label="Excluir item" onClick={() => window.confirm(`Excluir "${item.name}"?`) && remove.mutate(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
