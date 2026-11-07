import { NL, type JsonErrorCode } from "./json-types";

export const MAX_DEPTH = 1000;
const BACKSLASH = 92;
const QUOTE = 34;
const ESCAPES = new Set([QUOTE, BACKSLASH, 47, 98, 102, 110, 114, 116]); // " \ / b f n r t
const isWs = (c: number) => c === 32 || c === 9 || c === 10 || c === 13;
const isDigit = (c: number) => c >= 48 && c <= 57;
const isHex = (c: number) => isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);

export class Fail extends Error {
  constructor(
    readonly code: JsonErrorCode,
    readonly position: number,
  ) {
    super(code);
  }
}

export class Parser {
  private i = 0;
  private maxDepth = 0;
  private readonly out: string[] = [];

  constructor(
    private readonly text: string,
    /** Indent unit, or null to minify. */
    private readonly unit: string | null,
  ) {}

  run(): { output: string; depth: number } {
    if (this.text.charCodeAt(0) === 0xfeff) this.i = 1;
    this.value(0);
    this.ws();
    if (this.i < this.text.length) throw new Fail("extraContent", this.i);
    return { output: this.out.join(""), depth: this.maxDepth };
  }

  private code() {
    return this.text.charCodeAt(this.i);
  }

  private ws() {
    while (this.i < this.text.length && isWs(this.code())) this.i++;
  }

  private newline(depth: number) {
    if (this.unit !== null) this.out.push(NL + this.unit.repeat(depth));
  }

  private end() {
    if (this.i >= this.text.length) throw new Fail("unexpectedEnd", this.i);
  }

  private value(depth: number) {
    if (depth > MAX_DEPTH) throw new Fail("tooDeep", this.i);
    this.maxDepth = Math.max(this.maxDepth, depth);
    this.ws();
    this.end();
    const c = this.code();
    if (c === 123) return this.container(depth, "{", "}", 125);
    if (c === 91) return this.container(depth, "[", "]", 93);
    if (c === QUOTE) return this.string();
    if (c === 45 || isDigit(c)) return this.number();
    for (const word of ["true", "false", "null"]) {
      if (c !== word.charCodeAt(0)) continue;
      for (let k = 1; k < word.length; k++) {
        if (this.text.charCodeAt(this.i + k) !== word.charCodeAt(k)) {
          const at = this.i + k;
          throw new Fail(at >= this.text.length ? "unexpectedEnd" : "unexpectedToken", at);
        }
      }
      this.out.push(word);
      this.i += word.length;
      return;
    }
    throw new Fail("unexpectedToken", this.i);
  }

  private container(depth: number, open: string, close: string, closeCode: number) {
    const isObject = open === "{";
    this.i++;
    this.ws();
    if (this.code() === closeCode) {
      this.i++;
      this.out.push(open + close);
      return;
    }
    this.out.push(open);
    this.newline(depth + 1);
    for (;;) {
      this.ws();
      if (isObject) {
        this.end();
        if (this.code() !== QUOTE) throw new Fail("expectedPropertyName", this.i);
        this.string();
        this.ws();
        this.end();
        if (this.code() !== 58) throw new Fail("expectedColon", this.i);
        this.i++;
        this.out.push(this.unit !== null ? ": " : ":");
      }
      this.value(depth + 1);
      this.ws();
      this.end();
      const c = this.code();
      if (c === 44) {
        this.i++;
        this.ws();
        if (this.code() === closeCode) throw new Fail("trailingComma", this.i);
        this.out.push(",");
        this.newline(depth + 1);
        continue;
      }
      if (c === closeCode) {
        this.i++;
        this.newline(depth);
        this.out.push(close);
        return;
      }
      throw new Fail("expectedCommaOrEnd", this.i);
    }
  }

  private string() {
    const start = this.i;
    this.i++;
    for (;;) {
      if (this.i >= this.text.length) throw new Fail("unterminatedString", start);
      const c = this.code();
      if (c === QUOTE) {
        this.i++;
        this.out.push(this.text.slice(start, this.i));
        return;
      }
      if (c < 32) throw new Fail("controlCharacter", this.i);
      if (c !== BACKSLASH) {
        this.i++;
        continue;
      }
      const n = this.text.charCodeAt(this.i + 1);
      if (n === 117) {
        for (let k = 2; k <= 5; k++) {
          if (!isHex(this.text.charCodeAt(this.i + k))) throw new Fail("invalidEscape", this.i + k);
        }
        this.i += 6;
      } else if (ESCAPES.has(n)) {
        this.i += 2;
      } else {
        throw new Fail("invalidEscape", this.i + 1);
      }
    }
  }

  private number() {
    const start = this.i;
    const digits = () => {
      if (!isDigit(this.code())) throw new Fail("invalidNumber", this.i);
      while (isDigit(this.code())) this.i++;
    };
    if (this.code() === 45) this.i++;
    if (this.code() === 48) this.i++;
    else digits();
    if (this.code() === 46) {
      this.i++;
      digits();
    }
    if (this.code() === 101 || this.code() === 69) {
      this.i++;
      if (this.code() === 43 || this.code() === 45) this.i++;
      digits();
    }
    this.out.push(this.text.slice(start, this.i));
  }
}
