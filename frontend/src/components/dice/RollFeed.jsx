import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { diceApi, qk } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDice } from '../../context/DiceContext.jsx';
import { Avatar } from '../ui/index.jsx';

const POLL_MS = 4000;
const VISIBLE_MS = 7000;

/**
 * Feed de rolagens ao vivo: todos os usuários logados veem os resultados do grupo,
 * em qualquer aba — inclusive com o switch de dados desligado (o switch controla só a ferramenta de rolar).
 *
 * Busca a cada 4 s apenas as rolagens novas (`after=`) e:
 *  - mescla no cache do histórico (o painel de dados já abre atualizado);
 *  - mostra um aviso com o resultado das rolagens dos OUTROS jogadores.
 */
export function RollFeed() {
  const { user } = useAuth();
  const { open: panelOpen } = useDice();
  const queryClient = useQueryClient();
  const [cards, setCards] = useState([]);
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  useEffect(() => {
    let cursor = null; // createdAt da rolagem mais recente já vista
    let initialized = false;
    const seen = new Set(); // ids já vistos (createdAt tem precisão de ms; evita duplicar)
    let stopped = false;

    const tick = async () => {
      if (document.hidden) return; // aba em segundo plano: economiza requisições
      try {
        const rolls = await diceApi.history(20, cursor ?? undefined);
        if (stopped) return;
        const isFirstLoad = !initialized;
        initialized = true;
        const fresh = rolls.filter((r) => !seen.has(r.id));
        fresh.forEach((r) => seen.add(r.id));
        if (rolls.length) cursor = rolls[0].createdAt;
        if (isFirstLoad || fresh.length === 0) return; // não "anuncia" rolagens antigas ao entrar

        queryClient.setQueryData(qk.diceHistory, (list = []) =>
          [...fresh, ...list.filter((r) => !fresh.some((f) => f.id === r.id))].slice(0, 30),
        );

        const fromOthers = fresh.filter((r) => r.user?.id !== user.id).reverse();
        if (fromOthers.length && !panelOpenRef.current) {
          setCards((c) => [...c, ...fromOthers].slice(-4));
          fromOthers.forEach((r) =>
            setTimeout(() => setCards((c) => c.filter((x) => x.id !== r.id)), VISIBLE_MS),
          );
        }
      } catch {
        /* falha de rede momentânea: tenta de novo no próximo ciclo */
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [queryClient, user.id]);

  if (cards.length === 0) return null;

  return (
    <div className="roll-feed" aria-live="polite" aria-label="Rolagens do grupo">
      {cards.map((r) => (
        <button
          key={r.id}
          className={`roll-feed__card ${r.critical ? `is-${r.critical}` : ''}`}
          onClick={() => setCards((c) => c.filter((x) => x.id !== r.id))}
        >
          <Avatar user={r.user} size={30} />
          <span className="roll-feed__text">
            <strong>{r.user?.name}</strong> rolou {r.expression}
            {r.mode !== 'normal' && <em> ({r.mode === 'advantage' ? 'vantagem' : 'desvantagem'})</em>}
            {r.critical === 'success' && <span className="tag tag--green">Crítico!</span>}
            {r.critical === 'failure' && <span className="tag tag--red">Falha crítica</span>}
          </span>
          <span className="roll-feed__total">{r.total}</span>
        </button>
      ))}
    </div>
  );
}
