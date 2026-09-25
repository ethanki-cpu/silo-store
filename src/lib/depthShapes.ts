// EPIC-163.7(사용자 지시 — 깊이 1의 깃털이 낙엽 같으니 참고 이미지처럼 9가지 다른 깃털로, 별빛은 위아래가 더 긴 비대칭 3가지 모양으로):
// 깃털 9종과 별빛 3종의 SVG 윤곽. 깃털은 "축(대) 곡선 + 좌우 날개 폭 + 톱니 홈"으로 매개변수만 달리해 만들어 9종이 서로 확실히 다르다.

type FeatherParams = {
  bend: number; // 축이 휘는 정도(+오른쪽/−왼쪽)
  width: number; // 최대 날개 반폭
  peak: number; // 가장 넓은 지점(0~1, 밑→끝)
  tip: number; // 끝 뾰족함(0 둥글다 ~ 1 날카롭다)
  notches: number; // 가장자리 홈 개수
  notchDepth: number;
  asym: number; // 좌우 폭 차이(−1~1)
  quill: number; // 아랫부분 맨 대(날개 없는 부분) 비율
  curlTail?: boolean;
};

const PARAMS: FeatherParams[] = [
  { bend: 26, width: 30, peak: 0.55, tip: 0.35, notches: 5, notchDepth: 0.16, asym: 0.25, quill: 0.1 },
  { bend: -32, width: 24, peak: 0.6, tip: 0.85, notches: 4, notchDepth: 0.22, asym: -0.2, quill: 0.14 },
  { bend: 40, width: 34, peak: 0.5, tip: 0.55, notches: 6, notchDepth: 0.13, asym: 0.4, quill: 0.2 },
  { bend: 12, width: 38, peak: 0.42, tip: 0.1, notches: 3, notchDepth: 0.1, asym: 0, quill: 0.12 },
  { bend: -22, width: 26, peak: 0.66, tip: 0.95, notches: 7, notchDepth: 0.18, asym: 0.15, quill: 0.08 },
  { bend: 48, width: 22, peak: 0.5, tip: 0.7, notches: 8, notchDepth: 0.2, asym: -0.35, quill: 0.16 },
  { bend: -8, width: 32, peak: 0.48, tip: 0.25, notches: 2, notchDepth: 0.08, asym: 0.1, quill: 0.18 },
  { bend: 30, width: 28, peak: 0.58, tip: 0.5, notches: 9, notchDepth: 0.24, asym: -0.1, quill: 0.1, curlTail: true },
  { bend: -44, width: 20, peak: 0.7, tip: 0.9, notches: 5, notchDepth: 0.14, asym: 0.3, quill: 0.22 },
];

export type FeatherShape = { d: string; viewBox: string; aspect: number };

function buildFeather(p: FeatherParams): FeatherShape {
  const H = 210;
  const x0 = 50;
  const y0 = H - 6;
  const yTop = 6;
  const cx = x0 + p.bend * 1.4;
  const cy = (y0 + yTop) / 2;
  const tx = x0 + p.bend;
  const spine = (t: number) => {
    const u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * tx, y: u * u * y0 + 2 * u * t * cy + t * t * yTop };
  };
  const normal = (t: number) => {
    const e = 0.001;
    const a = spine(Math.max(0, t - e));
    const b = spine(Math.min(1, t + e));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  const gap = 1.3; // 대 양옆의 가는 틈(참고 이미지의 흰 홈)
  // 날개 폭: 대 아랫부분(quill)은 맨 대, 그 위로 부드럽게 넓어졌다가 끝에서 오므라든다.
  const vane = (t: number, end: number) => {
    if (t < p.quill || t > end) return 0;
    const k = (t - p.quill) / (end - p.quill);
    const pk = (p.peak - p.quill) / (end - p.quill);
    const rise = k < pk ? Math.pow(Math.sin((k / pk) * (Math.PI / 2)), 0.8) : Math.pow(Math.max(0, Math.cos(((k - pk) / (1 - pk)) * (Math.PI / 2))), 0.35 + p.tip * 0.9);
    return Math.max(0, rise);
  };
  // 깃털 가지(barb)가 갈라진 계단식 톱니 — 매끈한 사인이 아니라 날카로운 단차라 낙엽처럼 보이지 않는다.
  const saw = (t: number, side: number) => {
    if (t < p.quill + 0.04) return 1;
    const phase = (((t - p.quill) * p.notches * 1.6 + side * 0.37) % 1 + 1) % 1;
    return 1 - p.notchDepth * 1.6 * phase;
  };
  const N = 60;
  const half = (side: 1 | -1) => {
    const width = p.width * (1 + side * p.asym);
    const end = side === 1 ? 0.97 : 0.9 - Math.abs(p.asym) * 0.05;
    const outer: [number, number][] = [];
    const inner: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = p.quill + ((end - p.quill) * i) / N;
      const s = spine(t);
      const n = normal(t);
      const w = width * vane(t, end) * saw(t, side === 1 ? 0 : 1);
      outer.push([s.x + n.x * side * (gap + w), s.y + n.y * side * (gap + w)]);
      inner.push([s.x + n.x * side * gap, s.y + n.y * side * gap]);
    }
    return [...outer, ...inner.reverse()];
  };
  // 맨 대(아랫부분): 가늘어지는 막대
  const quillPts: [number, number][] = [];
  const quillEdge: [number, number][] = [];
  const Q = 10;
  for (let i = 0; i <= Q; i++) {
    const t = (p.quill + 0.02) * (i / Q);
    const s = spine(t);
    const n = normal(t);
    const w = 0.9 + 1.4 * (t / (p.quill + 0.02));
    quillPts.push([s.x + n.x * w, s.y + n.y * w]);
    quillEdge.push([s.x - n.x * w, s.y - n.y * w]);
  }
  const polys = [half(1), half(-1), [...quillPts, ...quillEdge.reverse()]];
  const all = polys.flat();
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  const minX = Math.min(...xs) - 2;
  const minY = Math.min(...ys) - 2;
  const w = Math.max(...xs) + 2 - minX;
  const h = Math.max(...ys) + 2 - minY;
  let d = polys.map((poly) => `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")} Z`).join(" ");
  if (p.curlTail) d += ` M${x0 - 2} ${y0} c-8 6 -20 4 -18 -6 c2 -8 12 -6 10 0`;
  return { d, viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`, aspect: h / w };
}

export const FEATHERS: FeatherShape[] = PARAMS.map(buildFeather);

// 별빛 3종 — 모두 위아래가 좌우보다 길고, 중심이 위로 치우쳐 위 팔과 아래 팔 길이도 다르다(완전 대칭 아님).
export const STAR_VARIANTS: { d: string; extra?: string }[] = [
  // 1) 길쭉한 네 갈래 반짝임(아래 팔이 더 긺)
  { d: "M50 0C52 26 58 40 78 44C58 48 52 68 50 100C48 68 42 48 22 44C42 40 48 26 50 0Z" },
  // 2) 네 갈래 + 사선 작은 갈래(가운데가 위쪽)
  {
    d: "M50 2C52 22 57 34 74 38C57 42 52 62 50 98C48 62 43 42 26 38C43 34 48 22 50 2Z",
    extra: "M50 22C51 30 54 34 62 38C54 42 51 46 50 54C49 46 46 42 38 38C46 34 49 30 50 22Z",
  },
  // 3) 큰 반짝임 + 곁에 작은 반짝임 두 개
  {
    d: "M44 4C46 30 51 42 70 48C51 54 46 72 44 100C42 72 37 54 18 48C37 42 42 30 44 4Z",
    extra: "M82 12C83 20 85 23 91 26C85 29 83 33 82 41C81 33 79 29 73 26C79 23 81 20 82 12ZM78 66C79 72 81 74 86 77C81 79 79 83 78 90C77 83 75 79 70 77C75 74 77 72 78 66Z",
  },
];
