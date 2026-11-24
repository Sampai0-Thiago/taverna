import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

/** Componentes de interface reutilizáveis (sem regra de negócio). */

export function Avatar({ user, size = 32 }) {
  if (!user) return null;
  const initials = user.name?.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, '--ring': user.color, fontSize: size * 0.38 }}
      title={user.name}
    >
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" /> : initials}
    </span>
  );
}

export function Switch({ checked, onChange, label, id }) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <label className="switch" htmlFor={switchId}>
      <span className="switch__label">{label}</span>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch__track ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </label>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, textarea, select, button:not(.modal__close)')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal panel ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <h2>{title}</h2>
          <button className="icon-btn modal__close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

/**
 * Seletor de arquivo com pré-visualização (imagem) ou nome (PDF).
 * `accept`: 'image' | 'pdf'
 */
export function FilePicker({ label, accept, file, onChange, currentUrl, hint }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file || accept !== 'image') return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, accept]);

  const mime = accept === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : 'application/pdf';
  const shown = preview ?? (accept === 'image' ? currentUrl : null);

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <label className="file-picker">
        <input type="file" accept={mime} onChange={(e) => onChange(e.target.files?.[0] ?? null)} hidden />
        {shown ? (
          <img src={shown} alt="Pré-visualização" className="file-picker__preview" />
        ) : (
          <span className="file-picker__placeholder">
            {file ? `📄 ${file.name}` : accept === 'pdf' ? 'Clique para escolher o PDF' : 'Clique para escolher a imagem'}
          </span>
        )}
      </label>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__die" aria-hidden>⬡</span>
      <span>{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function QueryError({ error }) {
  return <div className="alert alert--error">⚠️ {error?.message ?? 'Não foi possível carregar.'}</div>;
}
