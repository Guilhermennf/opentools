import { box, clamp, mix, poly, seg, smooth, tube } from "./engine.mjs";

// ---- Home: two meshing gears with bolt holes, lit from the upper left.
function gear(x, y, cx, cy, R, teeth, hole, phase = 0) {
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);
  const edge = R + 0.17 * R * smooth(-0.25, 0.25, Math.sin(teeth * a + phase));
  if (r > edge || r < hole) return 0;
  const t = (r - hole) / (edge - hole);
  const height = Math.sin(Math.PI * clamp(t));
  const light = Math.cos(a - 2.4) * (t > 0.5 ? 1 : -1);
  let v = 0.3 + 0.4 * height + 0.22 * light * (1 - height * 0.4);
  for (let i = 0; i < 6; i++) {
    const b = (i * Math.PI) / 3 + phase;
    const d = Math.hypot(dx - Math.cos(b) * R * 0.62, dy - Math.sin(b) * R * 0.62);
    if (d < R * 0.12) v = 0.04;
    else if (d < R * 0.16) v = Math.max(v, 0.85);
  }
  return v;
}
export const home = {
  cols: 64,
  rows: 28,
  field: (x, y) => {
    const big = gear(x, y, -0.25, 0.08, 0.78, 12, 0.24);
    const small = gear(x, y, 0.95, -0.5, 0.4, 8, 0.12, 0.2);
    const halo = Math.abs(Math.hypot(x + 0.25, y - 0.08) - 0.98) < 0.012 ? 0.3 : 0;
    return Math.max(big, small, halo);
  },
};

// ---- Hash generator: a fingerprint of warped concentric ridges.
export const hash = {
  cols: 56,
  rows: 28,
  field: (x, y) => {
    const ex = x / 0.8;
    const ey = (y + 0.02) / 0.96;
    if (ex * ex + ey * ey > 1) return 0;
    const wx = ex + 0.18 * Math.sin(3.1 * ey + 0.6) + 0.1 * Math.sin(7 * ey);
    const wy = ey * 0.85 - 0.28 * Math.exp(-((ex * ex) / 0.6)) * (1 - ey * ey) + 0.12 * Math.sin(2 * ex);
    const d = Math.hypot(wx * 1.05, wy * 1.2);
    const ridge = 0.5 + 0.5 * Math.cos(d * 38);
    const fade = smooth(1, 0.82, Math.hypot(ex, ey));
    const gap = Math.abs(ey + 0.12) < 0.035 && ex > -0.55 && ex < 0.55 ? 0 : 1;
    return clamp((0.12 + 0.88 * smooth(0.45, 0.95, ridge)) * fade * gap);
  },
};

// ---- JSON formatter: big braces around indented "code" bars.
function braceX(y, a) {
  const s = Math.abs(y);
  return -a * (1 - smooth(0, 0.22, s)) + a * smooth(0.7, 1, s);
}
function bracePts(cx, side, a) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const y = (i / 80) * 2 - 1;
    pts.push([cx + side * braceX(y, a), y * 0.94]);
  }
  return pts;
}
const LEFT = bracePts(-1.0, 1, 0.2);
const RIGHT = bracePts(1.0, -1, 0.2);
// [indent, ...segment lengths] -- mimics: key, value, array items, closers
const CODE = [
  [1, 0.34, 0.22],
  [1, 0.4, 0.06],
  [2, 0.28],
  [2, 0.28],
  [1, 0.06],
  [1, 0.3, 0.3],
];
export const json = {
  cols: 60,
  rows: 28,
  field: (x, y) => {
    let v = Math.max(tube(poly(x, y, LEFT), 0.085), tube(poly(x, y, RIGHT), 0.085));
    CODE.forEach(([indent, ...segs], i) => {
      const by = 0.66 - i * 0.26;
      let x0 = -0.62 + (indent - 1) * 0.24;
      for (const len of segs) {
        v = Math.max(v, tube(seg(x, y, x0, by, x0 + len, by), 0.045) * 0.9);
        x0 += len + 0.1;
      }
    });
    return v;
  },
};

// ---- Media converter: play frame -> arrow -> waveform.
function inTriangle(px, py, a, b, c) {
  const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [px, py];
  const d1 = d(p, a, b);
  const d2 = d(p, b, c);
  const d3 = d(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
export const media = {
  cols: 64,
  rows: 26,
  field: (x, y) => {
    let v = 0;
    const d = box(x, y, -0.8, 0, 0.45, 0.44, 0.07);
    v = Math.max(v, tube(Math.abs(d), 0.06));
    // film sprocket dots on the frame's inner edge
    for (let i = -3; i <= 3; i++) {
      if (Math.hypot(x + 1.14, y - i * 0.11) < 0.035) v = Math.max(v, 0.25);
      if (Math.hypot(x + 0.46, y - i * 0.11) < 0.035) v = Math.max(v, 0.25);
    }
    if (inTriangle(x, y, [-0.95, 0.27], [-0.95, -0.27], [-0.58, 0])) {
      v = Math.max(v, 0.5 + 0.45 * smooth(-0.95, -0.6, x) + 0.0 * y);
    }
    const shaft = seg(x, y, -0.1, 0, 0.3, 0);
    const h1 = seg(x, y, 0.3, 0, 0.14, 0.17);
    const h2 = seg(x, y, 0.3, 0, 0.14, -0.17);
    v = Math.max(v, tube(Math.min(shaft, h1, h2), 0.055));
    for (let i = 0; i < 8; i++) {
      const bx = 0.5 + i * 0.125;
      const h = [0.1, 0.28, 0.44, 0.2, 0.36, 0.48, 0.16, 0.3][i];
      v = Math.max(v, tube(seg(x, y, bx, -h, bx, h), 0.032));
    }
    return v;
  },
};
export { mix };
