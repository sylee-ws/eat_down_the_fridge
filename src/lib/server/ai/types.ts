import type { ProviderName } from "../config";

/** AI에 넘기는 요청 조건 — 회사와 무관하게 같다 (spec §7.4) */
export type PromptInput = {
  ingredients: string[];
  seasonings: string[];
  exclusions: string[];
  servings: number;
  /** 피할 요리명 (보충 때는 첫 응답 요리명이 더해진다) */
  avoidDishNames: string[];
  /** 요청할 후보 수 */
  count: number;
};

/**
 * 세 회사를 감싸는 공통 연결부.
 * generate는 구조화된 출력의 후보 원본 목록(§4 Recipe 모양, id 없음)을 돌려주고,
 * 호출 실패·구조가 깨진 응답이면 AiError를 던진다.
 */
export interface AiProvider {
  readonly name: ProviderName;
  readonly model: string;
  generate(input: PromptInput, signal: AbortSignal): Promise<unknown[]>;
}

/** AI 호출 실패/시간 초과/구조 불량 — 화면에는 모두 502 AI_FAILED */
export class AiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 구조화된 출력 `{ candidates: [...] }`에서 목록을 꺼낸다. 모양이 틀리면 AiError */
export function extractCandidates(output: unknown): unknown[] {
  if (!isObj(output) || !Array.isArray(output.candidates)) {
    throw new AiError("AI 응답 구조가 올바르지 않음");
  }
  return output.candidates;
}

/** 구조화된 출력이 JSON 문자열로 오는 회사(Google·OpenAI)용 */
export function parseJsonCandidates(text: unknown): unknown[] {
  if (typeof text !== "string") throw new AiError("AI 응답 본문 없음");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new AiError("AI 응답 JSON 해석 실패", { cause: e });
  }
  return extractCandidates(parsed);
}

/** SDK 오류 등을 AiError로 감싼다 (이미 AiError면 그대로) */
export function asAiError(e: unknown): AiError {
  return e instanceof AiError ? e : new AiError("AI 호출 실패", { cause: e });
}
