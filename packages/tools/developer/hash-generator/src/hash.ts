import { md5 } from "./md5";

export const algorithms = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type Algorithm = (typeof algorithms)[number];

/** Output size in bits. */
export const outputBits: Record<Algorithm, number> = {
  MD5: 128,
  "SHA-1": 160,
  "SHA-256": 256,
  "SHA-384": 384,
  "SHA-512": 512,
};

/** MD5 and SHA-1 are broken for security use; offered for compatibility only. */
export const isLegacy = (algorithm: Algorithm) => algorithm === "MD5" || algorithm === "SHA-1";

/** Largest file we read into memory (Web Crypto has no streaming digest). */
export const MAX_FILE_BYTES = 512 * 1024 * 1024;

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export async function hashBytes(algorithm: Algorithm, bytes: Uint8Array): Promise<string> {
  if (algorithm === "MD5") return toHex(md5(bytes));
  const digest = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return toHex(new Uint8Array(digest));
}

export const encodeText = (text: string) => new TextEncoder().encode(text);
