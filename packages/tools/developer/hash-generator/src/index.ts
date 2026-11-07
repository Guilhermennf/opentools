import type { ToolDefinition } from "@opentools/core";
import { ascii } from "./ascii";
import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";

export const hashGenerator: ToolDefinition = {
  meta: {
    id: "hash-generator",
    slug: "hash-generator",
    category: "developer",
    icon: "fingerprint",
    keywords: {
      en: ["hash generator", "sha-256", "md5", "sha-512", "file checksum"],
      "pt-BR": ["gerador de hash", "sha-256", "md5", "sha-512", "checksum de arquivo"],
    },
    runtime: "worker",
    version: "0.1.0",
    status: "stable",
    related: ["json-formatter"],
  },
  ascii,
  asciiLabel: {
    en: "Binary digits funnelling into a hash function and producing a short hexadecimal fingerprint",
    "pt-BR": "Dígitos binários passando por uma função de hash e gerando uma impressão digital hexadecimal",
  },
  messages: { en, "pt-BR": ptBR },
};
