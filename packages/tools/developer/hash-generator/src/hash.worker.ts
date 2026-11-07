import { encodeText, hashBytes, type Algorithm } from "./hash";

export interface WorkerRequest {
  id: number;
  algorithm: Algorithm;
  text?: string;
  file?: File;
}
export type WorkerResponse = { id: number; hex: string } | { id: number; error: string };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, algorithm, text, file } = event.data;
  try {
    const bytes = file ? new Uint8Array(await file.arrayBuffer()) : encodeText(text ?? "");
    const hex = await hashBytes(algorithm, bytes);
    self.postMessage({ id, hex } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({ id, error: String(error) } satisfies WorkerResponse);
  }
};
