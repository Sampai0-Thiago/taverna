import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/layout/Logo.jsx';
import { Field } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { PLAYER_COLORS } from '../../utils/labels.js';

/** Tela única para login e cadastro (mesmo layout, campos diferentes). */
export function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '', color: PLAYER_COLORS[0] });
  const mutation = isRegister ? register : login;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = isRegister
      ? { name: form.name, email: form.email, password: form.password, color: form.color, inviteCode: form.inviteCode || undefined }
      : { email: form.email, password: form.password };
    mutation.mutate(payload, { onSuccess: () => navigate(location.state?.from ?? '/agenda', { replace: true }) });
  };

  const error = mutation.error;

  return (
    <div className="auth">
      <form className="auth__card panel" onSubmit={submit} noValidate>
        <div className="auth__brand">
          <Logo size={56} />
          <h1>Ordem do Chaos</h1>
          <p className="muted">{isRegister ? 'Junte-se à mesa' : 'Bem-vindo de volta, aventureiro'}</p>
        </div>

        {error && <div className="alert alert--error">{error.fieldMessage ?? error.message}</div>}

        {isRegister && (
          <Field label="Nome do jogador">
            <input value={form.name} onChange={set('name')} required minLength={2} maxLength={60} autoComplete="nickname" />
          </Field>
        )}
        <Field label="E-mail">
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </Field>
        <Field label="Senha" hint={isRegister ? 'Mínimo de 8 caracteres' : undefined}>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </Field>

        {isRegister && (
          <>
            <div className="field">
              <span className="field__label">Sua cor na agenda</span>
              <div className="swatches">
                {PLAYER_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`swatch ${form.color === c ? 'is-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <Field label="Código de convite" hint="Só se o mestre tiver definido um">
              <input value={form.inviteCode} onChange={set('inviteCode')} autoComplete="off" />
            </Field>
          </>
        )}

        <button className="btn btn--gold btn--block" disabled={mutation.isPending}>
          {mutation.isPending ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
        </button>

        <p className="auth__switch">
          {isRegister ? (
            <>Já tem conta? <Link to="/entrar">Entrar</Link></>
          ) : (
            <>Primeira vez? <Link to="/cadastro">Criar conta</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
