import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { qk, usersApi } from '../api/endpoints.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const DiceContext = createContext(null);

/**
 * Estado global do rolador de dados.
 * - `enabled`: switch persistido no perfil do usuário (vale em qualquer aba e dispositivo).
 * - `open`: painel aberto/fechado (estado local da tela).
 */
export function DiceProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const enabled = user?.diceEnabled ?? false;

  const { mutate } = useMutation({
    mutationFn: (diceEnabled) => usersApi.updatePreferences({ diceEnabled }),
    // Atualização otimista: o switch responde na hora; desfaz se a API falhar.
    onMutate: async (diceEnabled) => {
      const previous = queryClient.getQueryData(qk.me);
      queryClient.setQueryData(qk.me, (me) => (me ? { ...me, diceEnabled } : me));
      if (!diceEnabled) setOpen(false);
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(qk.me, context.previous);
      toast.error(error);
    },
    onSuccess: (me) => queryClient.setQueryData(qk.me, me),
  });

  const setEnabled = useCallback((value) => mutate(value), [mutate]);

  const value = useMemo(
    () => ({ enabled, setEnabled, open: enabled && open, setOpen, toggleOpen: () => setOpen((o) => !o) }),
    [enabled, setEnabled, open],
  );

  return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>;
}

export function useDice() {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error('useDice deve ser usado dentro de <DiceProvider>');
  return ctx;
}
