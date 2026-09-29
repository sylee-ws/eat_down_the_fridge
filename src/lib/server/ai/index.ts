import type { AiConfig } from "../config";
import { createAnthropicProvider } from "./anthropic";
import { createGoogleProvider } from "./google";
import { createOpenAIProvider } from "./openai";
import type { AiProvider } from "./types";

/** AI_PROVIDER 설정으로 연결부를 고른다 — 이후 처리는 회사와 무관하게 같다 (spec §7.4) */
export function createProvider(cfg: AiConfig): AiProvider {
  const { apiKey, model } = cfg;
  switch (cfg.provider) {
    case "anthropic":
      return createAnthropicProvider({ apiKey, model });
    case "google":
      return createGoogleProvider({ apiKey, model });
    case "openai":
      return createOpenAIProvider({ apiKey, model });
  }
}
