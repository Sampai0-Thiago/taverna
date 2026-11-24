import { Beer, CalendarDays, Crown, Dices, LogOut, Map as MapIcon, ScrollText, UserRound } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDice } from '../../context/DiceContext.jsx';
import { Avatar, Spinner, Switch } from '../ui/index.jsx';
import { Logo } from './Logo.jsx';
import { RollFeed } from '../dice/RollFeed.jsx';

// O painel de dados só é baixado quando o usuário liga o switch.
const DicePanel = lazy(() => import('../dice/DicePanel.jsx'));

export const NAV_ITEMS = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/taverna', label: 'Taverna', icon: Beer },
  { to: '/personagens', label: 'Personagens', icon: ScrollText },
  { to: '/mapas', label: 'Mapas & NPCs', short: 'Mapas', icon: MapIcon },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

export function AppShell() {
  const { user, isMaster, logout } = useAuth();
  const dice = useDice();

  return (
    <div className="shell">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

      {/* Desktop: barra lateral */}
      <aside className="sidebar">
        <Link to="/agenda" className="sidebar__brand">
          <Logo />
          <span>Ordem do Chaos</span>
        </Link>
        <nav className="sidebar__nav" aria-label="Principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="sidebar__link">
              <Icon size={20} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar__link sidebar__logout" onClick={() => logout.mutate()}>
          <LogOut size={20} aria-hidden /> Sair
        </button>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <Link to="/agenda" className="topbar__brand">
            <Logo size={28} />
            <span>Ordem do Chaos</span>
          </Link>
          <div className="topbar__actions">
            <Switch label={<><Dices size={16} aria-hidden /> Dados</>} checked={dice.enabled} onChange={dice.setEnabled} />
            <Link to="/perfil" className="topbar__user" aria-label="Meu perfil">
              <Avatar user={user} size={34} />
              <span className="topbar__name">{user?.name}</span>
              {isMaster && (
                <span className="tag tag--gold topbar__master" title="Modo mestre ativo">
                  <Crown size={12} aria-hidden /> Mestre
                </span>
              )}
            </Link>
          </div>
        </header>

        <main id="conteudo" className="content">
          <Outlet />
        </main>
      </div>

      {/* Mobile: navegação inferior */}
      <nav className="bottom-nav" aria-label="Principal">
        {NAV_ITEMS.map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} className="bottom-nav__link">
            <Icon size={22} aria-hidden />
            <span>{short ?? label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Resultados de todos os jogadores, ao vivo, em qualquer aba (mesmo com o switch desligado) */}
      <RollFeed />

      {/* Rolador global: disponível em qualquer aba quando o switch está ligado */}
      {dice.enabled && (
        <>
          <button
            className={`dice-fab ${dice.open ? 'is-open' : ''}`}
            onClick={dice.toggleOpen}
            aria-expanded={dice.open}
            aria-label={dice.open ? 'Fechar rolador de dados' : 'Abrir rolador de dados'}
          >
            <Dices size={26} />
          </button>
          {dice.open && (
            <Suspense fallback={<div className="dice-panel panel"><Spinner /></div>}>
              <DicePanel onClose={() => dice.setOpen(false)} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
