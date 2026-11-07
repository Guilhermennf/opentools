import { base } from "@opentools/config/eslint";
import next from "eslint-config-next";

const config = [...next, ...base];
export default config;
