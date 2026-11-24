import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { availabilityApi, qk, sessionsApi, usersApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

export function useMembers() {
  const query = useQuery({ queryKey: qk.users, queryFn: usersApi.list, staleTime: 60_000 });
  const byId = useMemo(() => Object.fromEntries((query.data ?? []).map((u) => [u.id, u])), [query.data]);
  return { ...query, members: query.data ?? [], byId };
}

/** Disponibilidade comparada + sessões do intervalo visível no calendário. */
export function useAgendaRange(from, to) {
  const summary = useQuery({ queryKey: qk.availability(from, to), queryFn: () => availabilityApi.summary(from, to) });
  const sessions = useQuery({ queryKey: qk.sessions(from, to), queryFn: () => sessionsApi.range(from, to) });

  const daysByDate = useMemo(
    () => Object.fromEntries((summary.data?.days ?? []).map((d) => [d.date, d])),
    [summary.data],
  );
  const sessionsByDate = useMemo(() => {
    const map = {};
    for (const s of sessions.data ?? []) (map[s.scheduledDate] ??= []).push(s);
    return map;
  }, [sessions.data]);

  return { summary, sessions, daysByDate, sessionsByDate };
}

const STATUSES = ['available', 'maybe', 'unavailable', 'pending'];

/** Move o usuário para outra "coluna" do dia — usado na atualização otimista. */
function applyMark(day, userId, status, memberCount) {
  const next = { ...day };
  for (const s of STATUSES) next[s] = day[s].filter((id) => id !== userId);
  next[status ?? 'pending'] = [...next[status ?? 'pending'], userId];
  next.allAvailable = memberCount > 0 && next.available.length === memberCount;
  return next;
}

export function useSaveAvailability(from, to, userId) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = qk.availability(from, to);

  return useMutation({
    mutationFn: (entries) => availabilityApi.saveMine(entries),
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (data) => {
        if (!data) return data;
        const changes = Object.fromEntries(entries.map((e) => [e.date, e.status]));
        return {
          ...data,
          days: data.days.map((d) => (d.date in changes ? applyMark(d, userId, changes[d.date], data.memberCount) : d)),
        };
      });
      return { previous };
    },
    onError: (error, _entries, ctx) => {
      queryClient.setQueryData(key, ctx.previous);
      toast.error(error);
    },
    // recalcula "melhores datas" no servidor
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['availability'] }),
  });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sessions'] });
  const opts = (msg) => ({ onSuccess: () => { invalidate(); toast.success(msg); }, onError: toast.error });

  return {
    create: useMutation({ mutationFn: sessionsApi.create, ...opts('Sessão marcada!') }),
    update: useMutation({ mutationFn: ({ id, data }) => sessionsApi.update(id, data), ...opts('Sessão atualizada.') }),
    remove: useMutation({ mutationFn: sessionsApi.remove, ...opts('Sessão removida.') }),
  };
}
