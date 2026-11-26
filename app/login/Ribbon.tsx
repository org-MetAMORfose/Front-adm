/**
 * Faixa de linhas finas que desce do topo para a borda direita, nas cores da logo. Gerada no servidor, sem animação.
 * A densidade das linhas forma a faixa; cada linha escurece do rosa-claro (borda de baixo) ao vermelho-escuro (topo),
 * e uma máscara faz as linhas nascerem do branco no alto da página.
 */

const WIDTH = 1920;
const HEIGHT = 1080;
const LINES = 280;

const COLORS: Array<[number, [number, number, number]]> = [
  [0, [248, 205, 207]],
  [0.25, [238, 112, 116]],
  [0.55, [216, 31, 37]],
  [0.85, [160, 12, 18]],
  [1, [118, 9, 13]]
];

function colorAt(t: number): string {
  for (let index = 1; index < COLORS.length; index += 1) {
    const [end, to] = COLORS[index];
    const [start, from] = COLORS[index - 1];
    if (t <= end) {
      const k = (t - start) / (end - start);
      const channel = (i: number) => Math.round(from[i] + (to[i] - from[i]) * k);
      return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
    }
  }
  return "rgb(118 9 13)";
}

function line(t: number): string {
  const x0 = 540 + t * 1440;
  const y0 = -20;
  const x3 = WIDTH + 20;
  const y3 = 840 - t * 920;
  const dx = x3 - x0;
  const dy = y3 - y0;
  const length = Math.hypot(dx, dy) || 1;
  // Normal para baixo e para a esquerda: a faixa se curva como uma asa aberta.
  const nx = -dy / length;
  const ny = dx / length;
  // Linhas curtas (no canto) curvam pouco, para não darem a volta sobre si mesmas.
  const bulge = Math.min(150 * (1 - t * 0.7), length * 0.12);
  const c1x = x0 + dx * 0.3 + nx * bulge;
  const c1y = y0 + dy * 0.3 + ny * bulge;
  const c2x = x0 + dx * 0.7 + nx * bulge * 0.7;
  const c2y = y0 + dy * 0.7 + ny * bulge * 0.7;
  const f = (value: number) => value.toFixed(1);
  return `M${f(x0)} ${f(y0)}C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x3)} ${f(y3)}`;
}

const PATHS = Array.from({ length: LINES }, (_, index) => {
  const s = index / (LINES - 1);
  // Espaçamento irregular entre as linhas: dobras mais densas e mais abertas, como tecido.
  const t = Math.min(1, Math.max(0, s + 0.025 * Math.sin(s * Math.PI * 7)));
  return { d: line(t), color: colorAt(t), opacity: 0.4 + 0.6 * Math.min(1, t * 2.2) };
});

export function Ribbon({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="ribbon-fade" gradientUnits="userSpaceOnUse" x1="560" y1="0" x2="1250" y2="260">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="ribbon-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
          <rect width={WIDTH} height={HEIGHT} fill="url(#ribbon-fade)" />
        </mask>
      </defs>
      <g fill="none" strokeWidth="1" mask="url(#ribbon-mask)">
        {PATHS.map((path, index) => (
          <path key={index} d={path.d} stroke={path.color} strokeOpacity={path.opacity} />
        ))}
      </g>
    </svg>
  );
}
