// Tiny rasterizer: turns a scalar field f(x, y) -> [0, 1] into dense ASCII art.
// Art is original: every scene is built from math (shapes), never from an image.

export const RAMP = " .,:;i1tfLCG08@";
const CELL_ASPECT = 0.55; // glyph width / height in a monospaced font

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

/** Distance from point p to segment ab. */
export function seg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance to a polyline. */
export function poly(px, py, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    d = Math.min(d, seg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return d;
}

/** Signed distance to a rounded box centred at (cx, cy). Negative inside. */
export function box(px, py, cx, cy, hw, hh, r = 0) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Soft "tube" shading from a distance to a centre line: bright core, dark edge. */
export function tube(d, width) {
  if (d > width) return 0;
  const t = d / width;
  return 0.35 + 0.65 * Math.sqrt(1 - t * t);
}

export function render({ cols, rows, field, ramp = RAMP }) {
  const A = (cols * CELL_ASPECT) / rows;
  const lines = [];
  for (let r = 0; r < rows; r++) {
    const y = 1 - (2 * (r + 0.5)) / rows;
    let line = "";
    for (let c = 0; c < cols; c++) {
      const x = ((2 * (c + 0.5)) / cols - 1) * A;
      const v = clamp(field(x, y));
      line += ramp[Math.round(v * (ramp.length - 1))];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  while (lines.length && lines[0] === "") lines.shift();
  return lines;
}
