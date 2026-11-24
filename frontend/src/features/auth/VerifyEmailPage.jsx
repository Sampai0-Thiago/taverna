import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Logo } from '../../components/layout/Logo.jsx';
import { Field } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { authApi } from '../../api/endpoints.js';

const RESEND_COOLDOWN = 60;

/** Depois do cadastro (ou login de conta não confirmada): digitar o código de 6 dígitos enviado por e-mail. */
export function VerifyEmailPage() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = useMutation({ mutationFn: authApi.verifyEmail, onSuccess: setUser });
  const resend = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => {
      toast.success('Enviamos um novo código.');
      setCooldown(RESEND_COOLDOWN);
    },
    onError: (error) => {
      toast.error(error);
      if (error.details?.retryAfter) setCooldown(error.details.retryAfter);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    verify.mutate(code);
  };

  return (
    <div className="auth">
      <form className="auth__card panel" onSubmit={submit} noValidate>
        <div className="auth__brand">
          <Logo size={56} />
          <h1>Confirme seu e-mail</h1>
          <p className="muted">
            Enviamos um código de 6 dígitos para <strong>{user?.email}</strong>. Confira também a caixa de spam.
          </p>
        </div>

        {verify.error && <div className="alert alert--error">{verify.error.fieldMessage ?? verify.error.message}</div>}

        <Field label="Código de confirmação" hint="O código vale por 15 minutos">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            autoFocus
            style={{ fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center' }}
          />
        </Field>

        <button className="btn btn--gold btn--block" disabled={verify.isPending || code.length !== 6}>
          {verify.isPending ? 'Confirmando…' : 'Confirmar'}
        </button>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={cooldown > 0 || resend.isPending}
          onClick={() => resend.mutate()}
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>

        <p className="auth__switch">
          E-mail errado?{' '}
          <button type="button" className="link" onClick={() => logout.mutate()}>
            Sair e cadastrar de novo
          </button>
        </p>
      </form>
    </div>
  );
}
