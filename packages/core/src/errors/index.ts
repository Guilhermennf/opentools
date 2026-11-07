export type ToolErrorCode = "VALIDATION" | "EXECUTION" | "ABORTED" | "UNSUPPORTED";

/**
 * Tool error. `messageKey` is an i18n key (never raw user-facing text);
 * the UI layer translates it.
 */
export class ToolError extends Error {
  readonly code: ToolErrorCode;
  readonly messageKey: string;
  readonly details?: unknown;

  constructor(code: ToolErrorCode, messageKey: string, details?: unknown, options?: { cause?: unknown }) {
    super(`${code}: ${messageKey}`, options);
    this.name = "ToolError";
    this.code = code;
    this.messageKey = messageKey;
    this.details = details;
  }
}

export type Result<T, E = ToolError> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
