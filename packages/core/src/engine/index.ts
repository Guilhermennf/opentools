import type { ToolContext, ToolModule } from "../contracts";
import { ToolError, err, ok, type Result } from "../errors";

/** Validates raw input, runs the tool, and maps every failure to a ToolError. */
export async function runTool<I, O>(
  tool: ToolModule<I, O>,
  rawInput: unknown,
  ctx: ToolContext = {},
): Promise<Result<O, ToolError>> {
  if (ctx.signal?.aborted) return err(new ToolError("ABORTED", "errors.aborted"));

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(new ToolError("VALIDATION", "errors.invalidInput", parsed.error.issues));
  }

  try {
    const value = await tool.execute(parsed.data, ctx);
    if (ctx.signal?.aborted) return err(new ToolError("ABORTED", "errors.aborted"));
    return ok(value);
  } catch (cause) {
    if (cause instanceof ToolError) return err(cause);
    if (ctx.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
      return err(new ToolError("ABORTED", "errors.aborted", undefined, { cause }));
    }
    return err(new ToolError("EXECUTION", "errors.unexpected", undefined, { cause }));
  }
}
