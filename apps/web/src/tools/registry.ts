import { createRegistry } from "@opentools/core";
import { hashGenerator } from "@opentools/tool-hash-generator";
import { jsonFormatter } from "@opentools/tool-json-formatter";
import { mediaConverter } from "@opentools/tool-media-converter";

/** Adding a tool = new package under packages/tools + one line here. */
export const registry = createRegistry([hashGenerator, jsonFormatter, mediaConverter]);
