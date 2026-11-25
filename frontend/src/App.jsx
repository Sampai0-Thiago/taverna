import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { Spinner } from './components/ui/index.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage.jsx';

// Code splitting por rota: cada aba é baixada sob demanda.
const AgendaPage = lazy(() => import('./features/agenda/AgendaPage.jsx'));
const TavernPage = lazy(() => import('./features/tavern/TavernPage.jsx'));
const CharactersPage = lazy(() => import('./features/characters/CharactersPage.jsx'));
const CharacterDetailPage = lazy(() => import('./features/characters/CharacterDetailPage.jsx'));
const MapsPage = lazy(() => import('./features/maps/MapsPage.jsx'));
const MediaDetailPage = lazy(() => import('./features/maps/MediaDetailPage.jsx'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage.jsx'));

function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Spinner label="Abrindo o grimório…" />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  if (!user.emailVerified) return <Navigate to="/confirmar-email" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Logado mas com e-mail ainda não confirmado. */
function RequireUnverified() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/entrar" replace />;
  if (user.emailVerified) return <Navigate to={location.state?.from ?? '/agenda'} replace />;
  return <Outlet />;
}

function GuestOnly() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Outlet />;
  return <Navigate to={user.emailVerified ? '/agenda' : '/confirmar-email'} replace />;
}

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/entrar" element={<AuthPage mode="login" />} />
          <Route path="/cadastro" element={<AuthPage mode="register" />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<RequireUnverified />}>
          <Route path="/confirmar-email" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/taverna" element={<TavernPage />} />
            <Route path="/personagens" element={<CharactersPage />} />
            <Route path="/personagens/:id" element={<CharacterDetailPage />} />
            <Route path="/mapas" element={<MapsPage />} />
            <Route path="/mapas/:id" element={<MediaDetailPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/agenda" replace />} />
      </Routes>
    </Suspense>
  );
}
