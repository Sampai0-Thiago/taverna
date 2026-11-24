import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { ApiError } from '../api/client.js';
import { authApi, qk } from '../api/endpoints.js';

const AuthContext = createContext(null);

/** Busca o usuário logado; 401 significa "não logado" (não é erro). */
async function fetchMe() {
  try {
    return await authApi.me();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: qk.me, queryFn: fetchMe, staleTime: Infinity });

  const onAuthenticated = useCallback((me) => queryClient.setQueryData(qk.me, me), [queryClient]);
  const login = useMutation({ mutationFn: authApi.login, onSuccess: onAuthenticated });
  const register = useMutation({ mutationFn: authApi.register, onSuccess: onAuthenticated });
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear(); // descarta todo o cache do usuário anterior
      queryClient.setQueryData(qk.me, null);
    },
  });

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading,
      isMaster: user?.role === 'master',
      setUser: onAuthenticated,
      login,
      register,
      logout,
    }),
    [user, isLoading, onAuthenticated, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

/** Dono do recurso ou mestre pode editar/excluir (mesma regra do backend). */
export function useCanManage(ownerId) {
  const { user } = useAuth();
  return !!user && (user.role === 'master' || user.id === ownerId);
}
