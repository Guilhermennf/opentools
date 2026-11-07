import { ToolError, type ToolModule } from "@opentools/core";
import { z } from "zod";
import { algorithms, encodeText, hashBytes, MAX_FILE_BYTES, type Algorithm } from "./hash";
import type { WorkerRequest, WorkerResponse } from "./hash.worker";

export { algorithms, isLegacy, MAX_FILE_BYTES, outputBits, type Algorithm } from "./hash";

const algorithmSchema = z.enum(algorithms);

export const hashInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string(), algorithm: algorithmSchema }),
  z.object({ kind: z.literal("file"), file: z.instanceof(File), algorithm: algorithmSchema }),
]);
export type HashInput = z.infer<typeof hashInputSchema>;

const WORKER_TEXT_CHARS = 200_000;
const WORKER_FILE_BYTES = 1024 * 1024;

let nextId = 0;

function hashInWorker(algorithm: Algorithm, payload: { text?: string; file?: File }, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" });
    const id = nextId++;
    const done = () => {
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      done();
      reject(new ToolError("ABORTED", "errors.aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      done();
      if ("error" in event.data) reject(new ToolError("EXECUTION", "errors.unexpected", event.data.error));
      else resolve(event.data.hex);
    };
    worker.onerror = () => {
      done();
      reject(new ToolError("EXECUTION", "errors.unexpected"));
    };
    worker.postMessage({ id, algorithm, ...payload } satisfies WorkerRequest);
  });
}

/** Hash module: runs in a Web Worker for big inputs, on the main thread otherwise. */
export const hashModule: ToolModule<HashInput, string> = {
  inputSchema: hashInputSchema,
  async execute(input, ctx) {
    const canUseWorker = typeof Worker !== "undefined";
    if (input.kind === "file") {
      if (input.file.size > MAX_FILE_BYTES) throw new ToolError("VALIDATION", "errors.fileTooLarge");
      if (canUseWorker && input.file.size > WORKER_FILE_BYTES) {
        return hashInWorker(input.algorithm, { file: input.file }, ctx.signal);
      }
      return hashBytes(input.algorithm, new Uint8Array(await input.file.arrayBuffer()));
    }
    if (canUseWorker && input.text.length > WORKER_TEXT_CHARS) {
      return hashInWorker(input.algorithm, { text: input.text }, ctx.signal);
    }
    return hashBytes(input.algorithm, encodeText(input.text));
  },
};
