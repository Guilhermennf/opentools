import type { ToolDefinition } from "@opentools/core";
import { ascii } from "./ascii";
import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";

export const mediaConverter: ToolDefinition = {
  meta: {
    id: "media-converter",
    slug: "media-converter",
    category: "media",
    icon: "clapperboard",
    keywords: {
      en: ["video to mp4 converter", "video to mp3 converter", "online audio converter", "media converter"],
      "pt-BR": ["conversor de vídeo mp4", "converter vídeo para mp3", "conversor de áudio online", "conversor de mídia"],
    },
    runtime: "browser",
    version: "0.1.0",
    status: "coming-soon",
    related: ["hash-generator"],
  },
  ascii,
  asciiLabel: {
    en: "A video frame with a play button, an arrow and a progress bar pointing to a converted file",
    "pt-BR": "Um quadro de vídeo com botão de play, uma seta e uma barra de progresso apontando para um arquivo convertido",
  },
  messages: { en, "pt-BR": ptBR },
};
