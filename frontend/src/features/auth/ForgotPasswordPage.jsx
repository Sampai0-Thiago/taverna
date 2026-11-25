import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/endpoints.js';
import { Logo } from '../../components/layout/Logo.jsx';
import { Field } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const RESEND_COOLDOWN = 60;

/**
 * Recuperação de senha em duas etapas:
 * 1) informa o e-mail → recebe um código de 6 dígitos;
 * 2) informa o código + nova senha → entra logado.
 */
export function ForgotPasswordPage() {
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ code: '', newPassword: '', confirm: '' });
  const [cooldown, setCooldown] = useState(0);
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const request = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setStep('code');
      setCooldown(RESEND_COOLDOWN);
    },
  });

  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (me) => {
      setUser(me);
      toast.success('Senha alterada! Você já está conectado.');
      navigate('/agenda', { replace: true });
    },
  });

  const submitEmail = (e) => {
    e.preventDefault();
    request.mutate(email);
  };

  const submitReset = (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    reset.mutate({ email, code: form.code, newPassword: form.newPassword });
  };

  const resend = () => {
    request.mutate(email, { onSuccess: () => toast.success('Se o e-mail estiver cadastrado, enviamos um novo código.') });
  };

  const error = step === 'email' ? request.error : reset.error;

  return (
    <div className="auth">
      <form className="auth__card panel" onSubmit={step === 'email' ? submitEmail : submitReset} noValidate>
        <div className="auth__brand">
          <Logo size={56} />
          <h1>Recuperar senha</h1>
          <p className="muted">
            {step === 'email' ? (
              'Informe o e-mail da sua conta e enviaremos um código para criar uma nova senha.'
            ) : (
              <>
                Se <strong>{email}</strong> estiver cadastrado, enviamos um código de 6 dígitos. Confira também a
                caixa de spam.
              </>
            )}
          </p>
        </div>

        {error && <div className="alert alert--error">{error.fieldMessage ?? error.message}</div>}
        {mismatch && <div className="alert alert--error">As senhas não conferem.</div>}

        {step === 'email' ? (
          <>
            <Field label="E-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            </Field>
            <button className="btn btn--gold btn--block" disabled={request.isPending || !email}>
              {request.isPending ? 'Enviando…' : 'Enviar código'}
            </button>
          </>
        ) : (
          <>
            <Field label="Código recebido" hint="O código vale por 15 minutos">
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                autoFocus
                style={{ fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center' }}
              />
            </Field>
            <Field label="Nova senha" hint="Mínimo de 8 caracteres">
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirme a nova senha">
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
            <button
              className="btn btn--gold btn--block"
              disabled={reset.isPending || form.code.length !== 6 || form.newPassword.length < 8}
            >
              {reset.isPending ? 'Salvando…' : 'Salvar nova senha'}
            </button>
            <button type="button" className="btn btn--ghost btn--block" disabled={cooldown > 0 || request.isPending} onClick={resend}>
              {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
            </button>
          </>
        )}

        <p className="auth__switch">
          Lembrou a senha? <Link to="/entrar">Entrar</Link>
          {step === 'code' && (
            <>
              {' · '}
              <button type="button" className="link" onClick={() => setStep('email')}>
                Trocar e-mail
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
