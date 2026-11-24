import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { diceApi, qk } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatTime } from '../../utils/date.js';
import { Avatar } from '../ui/index.jsx';
import { DICE, DieShape } from './DieShape.jsx';

const MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'advantage', label: 'Vantagem' },
  { value: 'disadvantage', label: 'Desvant.' },
];

/** Monta a notação a partir da "mão" de dados: { 6: 2, 20: 1 } + 3 → "1d20+2d6+3". */
export function buildExpression(pool, modifier) {
  let expr = [...DICE].reverse().filter((s) => pool[s] > 0).map((s) => `${pool[s]}d${s}`).join('+');
  if (modifier > 0) expr += `${expr ? '+' : ''}${modifier}`;
  if (modifier < 0) expr += `-${Math.abs(modifier)}`;
  return expr;
}

function RollDetail({ roll }) {
  return (
    <span className="roll-detail">
      {roll.groups.map((g, i) => (
        <span key={i}>
          {i > 0 && (g.sign < 0 ? ' − ' : ' + ')}
          {g.notation}[{g.rolls.join(', ')}
          {g.dropped.length > 0 && <s className="muted"> {g.dropped.join(', ')}</s>}]
        </span>
      ))}
      {roll.modifier !== 0 && <span>{roll.modifier > 0 ? ' + ' : ' − '}{Math.abs(roll.modifier)}</span>}
    </span>
  );
}

export default function DicePanel({ onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const location = useLocation();
  const [pool, setPool] = useState({ 20: 1 });
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState('normal');
  const [custom, setCustom] = useState(null); // expressão digitada à mão
  const [last, setLast] = useState(null);

  const expression = custom ?? buildExpression(pool, modifier);
  const context = location.pathname.split('/')[1] || 'agenda';

  // Histórico compartilhado: atualiza a cada 4 s enquanto o painel está aberto.
  const history = useQuery({ queryKey: qk.diceHistory, queryFn: () => diceApi.history(30), refetchInterval: 4000 });

  const roll = useMutation({
    mutationFn: () => diceApi.roll({ expression, mode, context }),
    onSuccess: (result) => {
      setLast(result);
      queryClient.setQueryData(qk.diceHistory, (list = []) => [result, ...list.filter((r) => r.id !== result.id)].slice(0, 30));
    },
    onError: (e) => toast.error(e),
  });

  const addDie = (sides) => {
    setCustom(null);
    setPool((p) => ({ ...p, [sides]: Math.min((p[sides] ?? 0) + 1, 20) }));
  };
  const reset = () => {
    setPool({});
    setModifier(0);
    setCustom(null);
    setMode('normal');
  };

  const criticalClass = useMemo(
    () => (last?.critical === 'success' ? 'is-crit' : last?.critical === 'failure' ? 'is-fumble' : ''),
    [last],
  );

  return (
    <section className="dice-panel panel" aria-label="Rolador de dados">
      <header className="dice-panel__header">
        <h2>Dados</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>

      <div className="dice-grid">
        {DICE.map((sides) => (
          <button key={sides} className="die-btn" onClick={() => addDie(sides)} aria-label={`Adicionar d${sides}`}>
            <DieShape sides={sides} />
            {pool[sides] > 0 && !custom && <span className="die-btn__count">{pool[sides]}</span>}
          </button>
        ))}
      </div>

      <div className="dice-controls">
        <div className="stepper" aria-label="Modificador">
          <button className="icon-btn" onClick={() => { setCustom(null); setModifier((m) => m - 1); }} aria-label="Diminuir modificador">
            <Minus size={16} />
          </button>
          <span>{modifier >= 0 ? `+${modifier}` : modifier}</span>
          <button className="icon-btn" onClick={() => { setCustom(null); setModifier((m) => m + 1); }} aria-label="Aumentar modificador">
            <Plus size={16} />
          </button>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Modo">
          {MODES.map((m) => (
            <button key={m.value} role="radio" aria-checked={mode === m.value} className={mode === m.value ? 'is-active' : ''} onClick={() => setMode(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dice-expression">
        <input
          value={expression}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="ex.: 2d6+3"
          aria-label="Expressão de dados"
          onKeyDown={(e) => e.key === 'Enter' && expression && roll.mutate()}
        />
        <button className="icon-btn" onClick={reset} aria-label="Limpar">
          <RotateCcw size={16} />
        </button>
        <button className="btn btn--gold" disabled={!expression || roll.isPending} onClick={() => roll.mutate()}>
          Rolar
        </button>
      </div>

      {last && (
        <div key={last.id} className={`dice-result ${criticalClass}`} aria-live="assertive">
          <span className="dice-result__total">{last.total}</span>
          <div>
            <strong>{last.expression}</strong>
            {last.critical === 'success' && <span className="tag tag--green">Crítico!</span>}
            {last.critical === 'failure' && <span className="tag tag--red">Falha crítica</span>}
            <RollDetail roll={last} />
          </div>
        </div>
      )}

      <h3 className="dice-panel__subtitle">Histórico do grupo</h3>
      <ul className="roll-log">
        {(history.data ?? []).map((r) => (
          <li key={r.id} className={r.critical ? `roll-log__item is-${r.critical}` : 'roll-log__item'}>
            <Avatar user={r.user} size={24} />
            <div className="roll-log__text">
              <span>
                <strong>{r.user?.name}</strong> rolou {r.expression}
                {r.mode !== 'normal' && <em> ({r.mode === 'advantage' ? 'vant.' : 'desv.'})</em>}
              </span>
              <small className="muted"><RollDetail roll={r} /> · {formatTime(r.createdAt)}</small>
            </div>
            <span className="roll-log__total">{r.total}</span>
          </li>
        ))}
        {history.data?.length === 0 && <li className="muted">Ninguém rolou ainda.</li>}
      </ul>
    </section>
  );
}
