/** Emblema do grupo: um d20 estilizado em dourado. */
export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo">
      <polygon points="32,3 58,18 58,46 32,61 6,46 6,18" fill="var(--surface-2)" stroke="var(--gold)" strokeWidth="3" />
      <polygon points="32,14 48,42 16,42" fill="none" stroke="var(--gold)" strokeWidth="2.5" />
      <path d="M32 3 L32 14 M6 18 L16 42 M58 18 L48 42 M32 61 L16 42 M32 61 L48 42" stroke="var(--gold)" strokeWidth="1.5" opacity=".6" />
    </svg>
  );
}
