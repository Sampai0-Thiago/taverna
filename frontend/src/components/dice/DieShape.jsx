/** Desenho SVG de cada tipo de dado (formas aproximadas das faces reais). */
const SHAPES = {
  4: 'M32 6 L58 54 L6 54 Z',
  6: 'M10 10 H54 V54 H10 Z',
  8: 'M32 4 L58 32 L32 60 L6 32 Z',
  10: 'M32 4 L58 26 L32 60 L6 26 Z',
  12: 'M32 4 L59 24 L49 56 L15 56 L5 24 Z',
  20: 'M32 3 L58 18 L58 46 L32 61 L6 46 L6 18 Z',
  100: 'M32 4 L52 12 L60 32 L52 52 L32 60 L12 52 L4 32 L12 12 Z',
};

export function DieShape({ sides, size = 44, label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="die-shape">
      <path d={SHAPES[sides] ?? SHAPES[20]} className="die-shape__body" />
      <text x="32" y={sides === 4 ? 46 : 38} textAnchor="middle" className="die-shape__text">
        {label ?? (sides === 100 ? '%' : sides)}
      </text>
    </svg>
  );
}

export const DICE = [4, 6, 8, 10, 12, 20, 100];
