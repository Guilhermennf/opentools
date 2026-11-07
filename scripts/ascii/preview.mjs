import { render } from "./engine.mjs";
import * as scenes from "./scenes.mjs";

const name = process.argv[2];
const scene = scenes[name];
if (!scene) throw new Error(`unknown scene ${name}`);
console.log(render(scene).join("\n"));
