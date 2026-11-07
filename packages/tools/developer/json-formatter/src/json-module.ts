import { ToolError, type ToolModule } from "@opentools/core";
import { z } from "zod";
import { formatJson, minifyJson, validateJson, type JsonResult, type JsonStats } from "./json";

export * from "./json";

export const jsonInputSchema = z.object({
  text: z.string(),
  mode: z.enum(["format", "minify", "validate"]),
  indent: z.enum(["2", "4", "tab"]).default("2"),
});
export type JsonInput = z.input<typeof jsonInputSchema>;
export interface JsonOutput {
  /** Formatted/minified text; for "validate" the original text, unchanged. */
  output: string;
  stats: JsonStats;
}

export const jsonModule: ToolModule<z.output<typeof jsonInputSchema>, JsonOutput> = {
  inputSchema: jsonInputSchema,
  async execute({ text, mode, indent }) {
    const result: JsonResult =
      mode === "format" ? formatJson(text, indent) : mode === "minify" ? minifyJson(text) : validateJson(text);
    if (!result.ok) throw new ToolError("VALIDATION", "json.syntaxError", result.error);
    return { output: mode === "validate" ? text : result.output, stats: result.stats };
  },
};
