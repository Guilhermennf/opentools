import type { ToolDefinition } from "@opentools/core";
import { ascii } from "./ascii";
import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";

export const jsonFormatter: ToolDefinition = {
  meta: {
    id: "json-formatter",
    slug: "json-formatter",
    category: "developer",
    icon: "braces",
    keywords: {
      en: ["json formatter", "json beautifier", "json validator", "json minifier", "json syntax checker"],
      "pt-BR": ["formatador json", "formatador de json", "validador json", "minificar json", "embelezar json"],
    },
    runtime: "browser",
    version: "0.1.0",
    status: "coming-soon",
    related: ["hash-generator"],
  },
  ascii,
  asciiLabel: {
    en: "An indented JSON object with braces, brackets and nested values",
    "pt-BR": "Um objeto JSON indentado com chaves, colchetes e valores aninhados",
  },
  messages: { en, "pt-BR": ptBR },
};
