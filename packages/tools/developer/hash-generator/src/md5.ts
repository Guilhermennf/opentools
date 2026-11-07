// Pure TypeScript MD5 (RFC 1321). Web Crypto does not provide MD5.
// Processes the input in place (no padded copy), so large files stay cheap on memory.

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

type State = [number, number, number, number];

function block(state: State, view: DataView, offset: number) {
  let [a, b, c, d] = state;
  for (let i = 0; i < 64; i++) {
    let f: number;
    let g: number;
    if (i < 16) {
      f = (b & c) | (~b & d);
      g = i;
    } else if (i < 32) {
      f = (d & b) | (~d & c);
      g = (5 * i + 1) % 16;
    } else if (i < 48) {
      f = b ^ c ^ d;
      g = (3 * i + 5) % 16;
    } else {
      f = c ^ (b | ~d);
      g = (7 * i) % 16;
    }
    const m = view.getUint32(offset + g * 4, true);
    f = (f + a + K[i]! + m) >>> 0;
    a = d;
    d = c;
    c = b;
    b = (b + rotl(f, SHIFTS[i]!)) >>> 0;
  }
  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
}

export function md5(data: Uint8Array): Uint8Array {
  const state: State = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const fullBlocks = Math.floor(data.length / 64);
  for (let i = 0; i < fullBlocks; i++) block(state, view, i * 64);

  const rest = data.length - fullBlocks * 64;
  const tailLength = rest + 9 > 64 ? 128 : 64;
  const tail = new Uint8Array(tailLength);
  tail.set(data.subarray(fullBlocks * 64));
  tail[rest] = 0x80;
  const tailView = new DataView(tail.buffer);
  tailView.setUint32(tailLength - 8, (data.length * 8) >>> 0, true);
  tailView.setUint32(tailLength - 4, Math.floor(data.length / 0x20000000), true);
  for (let off = 0; off < tailLength; off += 64) block(state, tailView, off);

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  state.forEach((word, i) => outView.setUint32(i * 4, word, true));
  return out;
}
