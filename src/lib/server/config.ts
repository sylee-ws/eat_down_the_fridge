// 서버 환경 변수 읽기 (spec §7). 이 값들은 절대 브라우저로 내려보내지 않는다.

export type Env = Record<string, string | undefined>;

export const PROVIDERS = ["anthropic", "google", "openai"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

/**
 * 회사별 기본 모델 (spec §7.4).
 * - anthropic: spec 지정값
 * - google: ai.google.dev/gemini-api/docs/models 에서 확인한 Flash 계열 소형 모델
 * - openai: @openai SDK ChatModel 목록 + developers.openai.com/api/docs/models/gpt-5.4-mini 에서 확인
 */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  google: "gemini-3.5-flash-lite",
  openai: "gpt-5.4-mini",
};

const KEY_ENV: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
};

export type AiConfig = { provider: ProviderName; model: string; apiKey: string };

/** 빈 문자열·공백뿐인 값은 미설정으로 본다 */
function read(env: Env, name: string): string | null {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** 가족 암호. 미설정이면 null → 호출부는 500으로 닫아야 한다 */
export function readPasscode(env: Env): string | null {
  return read(env, "FAMILY_PASSCODE");
}

/** AI 설정. 회사가 세 값 외이거나 고른 회사의 키가 없으면 null */
export function readAiConfig(env: Env): AiConfig | null {
  const provider = (read(env, "AI_PROVIDER") ?? "anthropic").trim();
  if (!(PROVIDERS as readonly string[]).includes(provider)) return null;
  const p = provider as ProviderName;
  const apiKey = read(env, KEY_ENV[p]);
  if (apiKey === null) return null;
  const model = read(env, "AI_MODEL")?.trim() ?? DEFAULT_MODELS[p];
  return { provider: p, model, apiKey: apiKey.trim() };
}
