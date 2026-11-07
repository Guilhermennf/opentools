import { describe, expect, it } from "vitest";
import { runTool } from "@opentools/core";
import { encodeText, hashBytes, MAX_FILE_BYTES, toHex } from "./hash";
import { hashModule } from "./hash-client";
import { md5 } from "./md5";

const hex = (alg: Parameters<typeof hashBytes>[0], text: string) => hashBytes(alg, encodeText(text));

describe("md5 (RFC 1321 vectors)", () => {
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "57edf4a22be3c955ac49da2e2107b67a",
    ],
  ])("md5(%j)", (input, expected) => {
    expect(toHex(md5(encodeText(input)))).toBe(expected);
  });

  it("handles padding boundaries (55, 56, 63, 64, 65 bytes)", async () => {
    // Cross-checked against Node's crypto.
    const { createHash } = await import("node:crypto");
    for (const n of [0, 1, 54, 55, 56, 57, 63, 64, 65, 127, 128, 1000]) {
      const text = "x".repeat(n);
      expect(toHex(md5(encodeText(text))), `n=${n}`).toBe(createHash("md5").update(text).digest("hex"));
    }
  });

  it("hashes bytes that are a sub-view of a larger buffer", () => {
    const view = encodeText("zzabczz").subarray(2, 5);
    expect(toHex(md5(view))).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
});

describe("sha family via Web Crypto", () => {
  it("matches known vectors for 'abc'", async () => {
    expect(await hex("SHA-1", "abc")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(await hex("SHA-256", "abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect((await hex("SHA-384", "abc")).slice(0, 16)).toBe("cb00753f45a35e8b");
    expect((await hex("SHA-512", "abc")).slice(0, 16)).toBe("ddaf35a193617aba");
  });
  it("encodes text as UTF-8", async () => {
    const { createHash } = await import("node:crypto");
    expect(await hex("SHA-256", "ação 🚀")).toBe(createHash("sha256").update("ação 🚀", "utf8").digest("hex"));
    expect(encodeText("ç").length).toBe(2);
  });
});

describe("hashModule", () => {
  it("hashes text and files identically", async () => {
    const text = await runTool(hashModule, { kind: "text", text: "abc", algorithm: "SHA-256" });
    const file = await runTool(hashModule, {
      kind: "file",
      file: new File(["abc"], "a.txt"),
      algorithm: "SHA-256",
    });
    expect(text).toEqual(file);
    expect(text.ok && text.value).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("rejects unknown algorithms and bad shapes", async () => {
    for (const input of [{ kind: "text", text: "a", algorithm: "SHA-3" }, { kind: "text" }, null]) {
      const r = await runTool(hashModule, input);
      expect(!r.ok && r.error.code).toBe("VALIDATION");
    }
  });
  it("rejects files over the limit", async () => {
    const big = { size: MAX_FILE_BYTES + 1 } as unknown as File;
    Object.setPrototypeOf(big, File.prototype);
    const r = await hashModule.execute({ kind: "file", file: big, algorithm: "MD5" }, {}).catch((e) => e);
    expect(r).toMatchObject({ code: "VALIDATION", messageKey: "errors.fileTooLarge" });
  });
});
