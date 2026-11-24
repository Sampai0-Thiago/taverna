import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

/** Notificações curtas (sucesso/erro) com anúncio para leitores de tela. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message, tone = 'info') => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => push(m, 'success'),
      error: (errOrMsg) =>
        push(typeof errOrMsg === 'string' ? errOrMsg : errOrMsg?.fieldMessage ?? errOrMsg?.message ?? 'Algo deu errado.', 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} className={`toast toast--${t.tone}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
