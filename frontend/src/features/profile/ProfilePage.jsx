import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Crown, Dices, KeyRound, LogOut } from 'lucide-react';
import { useState } from 'react';
import { qk, usersApi } from '../../api/endpoints.js';
import { Avatar, Field, PageHeader, Switch } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDice } from '../../context/DiceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatShort, toISO } from '../../utils/date.js';
import { PLAYER_COLORS, ROLES } from '../../utils/labels.js';
import { useMembers } from '../agenda/agenda.hooks.js';

function ProfileForm({ user }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: user.name, bio: user.bio ?? '', color: user.color });

  const onSaved = (me) => {
    setUser(me);
    queryClient.invalidateQueries({ queryKey: qk.users });
  };
  const save = useMutation({ mutationFn: usersApi.updateMe, onSuccess: (me) => { onSaved(me); toast.success('Perfil salvo.'); }, onError: toast.error });
  const avatar = useMutation({ mutationFn: usersApi.uploadAvatar, onSuccess: (me) => { onSaved(me); toast.success('Avatar atualizado.'); }, onError: toast.error });

  return (
    <section className="panel profile-card">
      <label className="profile-card__avatar" title="Trocar avatar">
        <Avatar user={user} size={96} />
        <span className="profile-card__camera"><Camera size={16} aria-hidden /></span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && avatar.mutate(e.target.files[0])} aria-label="Enviar avatar" />
      </label>
      <p className="muted profile-card__meta">
        {user.email} · <span className={`tag ${user.role === 'master' ? 'tag--gold' : ''}`}>{ROLES[user.role]}</span>
      </p>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ name: form.name, bio: form.bio.trim() || null, color: form.color });
        }}
      >
        <Field label="Nome"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={60} /></Field>
        <Field label="Sobre você"><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} placeholder="Jogo desde 2010, adoro bardos…" /></Field>
        <div className="field">
          <span className="field__label">Cor na agenda</span>
          <div className="swatches">
            {PLAYER_COLORS.map((c) => (
              <button type="button" key={c} className={`swatch ${form.color.toUpperCase() === c ? 'is-active' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} aria-label={`Cor ${c}`} />
            ))}
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} aria-label="Cor personalizada" />
          </div>
        </div>
        <div className="form__actions"><button className="btn btn--gold" disabled={save.isPending}>Salvar perfil</button></div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const change = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: () => { setForm({ currentPassword: '', newPassword: '' }); toast.success('Senha alterada.'); },
    onError: toast.error,
  });
  return (
    <form className="panel form" onSubmit={(e) => { e.preventDefault(); change.mutate(form); }}>
      <h2>Alterar senha</h2>
      <Field label="Senha atual"><input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required /></Field>
      <Field label="Nova senha" hint="Mínimo de 8 caracteres"><input type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required /></Field>
      <div className="form__actions"><button className="btn btn--ghost" disabled={change.isPending}>Alterar</button></div>
    </form>
  );
}

/**
 * Modo mestre: qualquer jogador pode virar mestre informando o token,
 * e voltar a ser jogador quando outra pessoa for mestrar.
 */
function MasterModeCard() {
  const { user, isMaster, setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');

  const onChanged = (me) => {
    setUser(me);
    queryClient.invalidateQueries({ queryKey: qk.users });
  };
  const activate = useMutation({
    mutationFn: usersApi.activateMaster,
    onSuccess: (me) => { onChanged(me); setToken(''); toast.success('Modo mestre ativado. Boa sessão!'); },
    onError: toast.error,
  });
  const deactivate = useMutation({
    mutationFn: usersApi.deactivateMaster,
    onSuccess: (me) => { onChanged(me); toast.info('Você voltou a ser jogador.'); },
    onError: toast.error,
  });

  return (
    <section className={`panel master-card ${isMaster ? 'is-active' : ''}`}>
      <h2><Crown size={18} aria-hidden /> Modo mestre</h2>
      {isMaster ? (
        <>
          <p>
            <span className="tag tag--gold"><Crown size={12} aria-hidden /> Ativo</span>{' '}
            {user.masterSince && <span className="muted">desde {formatShort(toISO(new Date(user.masterSince)))}</span>}
          </p>
          <p className="muted">Você pode enviar, editar e excluir mapas e NPCs, e gerenciar o conteúdo do grupo.</p>
          <div className="form__actions">
            <button className="btn btn--ghost" disabled={deactivate.isPending} onClick={() => deactivate.mutate()}>
              Deixar de ser mestre
            </button>
          </div>
        </>
      ) : (
        <form className="form" onSubmit={(e) => { e.preventDefault(); activate.mutate(token); }}>
          <p className="muted">Vai mestrar o próximo jogo? Informe o token de mestre para liberar a edição de mapas e NPCs.</p>
          <Field label="Token de mestre">
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" />
          </Field>
          <div className="form__actions">
            <button className="btn btn--gold" disabled={activate.isPending || !token}>
              <KeyRound size={16} aria-hidden /> Ativar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function MembersList() {
  const { members } = useMembers();

  return (
    <section className="panel">
      <h2>Membros da mesa ({members.length})</h2>
      <ul className="members">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar user={m} size={36} />
            <div>
              <strong>{m.name}</strong>
              {m.bio && <p className="muted members__bio">{m.bio}</p>}
            </div>
            <span className={`tag ${m.role === 'master' ? 'tag--gold' : ''}`}>{ROLES[m.role]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const dice = useDice();

  return (
    <div>
      <PageHeader
        title="Perfil"
        actions={<button className="btn btn--ghost" onClick={() => logout.mutate()}><LogOut size={16} aria-hidden /> Sair</button>}
      />
      <div className="profile-layout">
        <div className="profile-layout__col">
          <ProfileForm key={user.id} user={user} />
          <MasterModeCard />
          <section className="panel">
            <h2><Dices size={18} aria-hidden /> Preferências</h2>
            <Switch label="Rolador de dados em todas as abas" checked={dice.enabled} onChange={dice.setEnabled} />
            <p className="muted">Também dá para ligar/desligar pelo switch no topo da tela, a qualquer momento.</p>
          </section>
          <PasswordForm />
        </div>
        <div className="profile-layout__col">
          <MembersList />
        </div>
      </div>
    </div>
  );
}
