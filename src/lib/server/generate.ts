import { randomUUID } from "node:crypto";
import type { Recipe } from "@/lib/types";
import { filterCandidates, toRecipe } from "@/lib/validation";
import { AiError, asAiError, type AiProvider, type PromptInput } from "./ai/types";
import type { CandidatesRequest } from "./requestBody";

/** 조정 가능한 값 (spec §7.2) */
export const CANDIDATE_COUNT = 6;
export const MAX_CANDIDATES = 8;
export const MIN_PASSING = 3;
export const BUDGET_MS = 50_000;
export const MIN_TOPUP_MS = 15_000;

export type GenerateOptions = {
  count?: number;
  budgetMs?: number;
  minTopupMs?: number;
  maxCandidates?: number;
  now?: () => number;
  /** 요청이 시작된 시각 (예산 기준). 없으면 호출 시각 */
  startedAt?: number;
  newId?: () => string;
};

/** 남은 시간 안에 끝나지 않으면 신호를 끊고 AiError로 실패시킨다 */
async function callWithin(provider: AiProvider, input: PromptInput, ms: number): Promise<unknown[]> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new AiError("AI 호출 시간 초과"));
    }, Math.max(0, ms));
  });
  try {
    return await Promise.race([provider.generate(input, ctrl.signal), timeout]);
  } catch (e) {
    throw asAiError(e);
  } finally {
    clearTimeout(timer);
  }
}

/** 첫 응답의 모든 요리명 (구조가 틀린 항목은 건너뜀) — 보충 때 피할 이름에 더한다 */
function rawNames(items: unknown[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (typeof it === "object" && it !== null && typeof (it as { name?: unknown }).name === "string") {
      const n = (it as { name: string }).name.trim();
      if (n.length > 0) out.push(n);
    }
  }
  return out;
}

/**
 * 후보 생성 (spec §7.2 처리 1~3).
 * 첫 호출 실패는 AiError를 던진다. 보충은 통과분이 3개 미만일 때 딱 1번,
 * 남은 예산이 15초 이상일 때만 하고, 보충 실패는 무시한다.
 */
export async function generateCandidates(
  req: CandidatesRequest,
  provider: AiProvider,
  opts: GenerateOptions = {},
): Promise<Recipe[]> {
  const now = opts.now ?? Date.now;
  const startedAt = opts.startedAt ?? now();
  const budgetMs = opts.budgetMs ?? BUDGET_MS;
  const minTopupMs = opts.minTopupMs ?? MIN_TOPUP_MS;
  const max = opts.maxCandidates ?? MAX_CANDIDATES;
  const count = opts.count ?? CANDIDATE_COUNT;
  const newId = opts.newId ?? randomUUID;
  const remaining = () => budgetMs - (now() - startedAt);

  const cond = { ingredients: req.ingredients, seasonings: req.seasonings, exclusions: req.exclusions };
  const toRecipes = (items: unknown[]) =>
    items.map((it) => toRecipe(it, newId(), req.servings)).filter((r): r is Recipe => r !== null);

  const base: PromptInput = { ...req, count };
  const first = await callWithin(provider, base, remaining());
  const passing = filterCandidates(toRecipes(first), cond, req.avoidDishNames).slice(0, max);

  if (passing.length >= MIN_PASSING || remaining() < minTopupMs) return passing;

  // 자동 보충 1회
  const avoid = [...req.avoidDishNames, ...rawNames(first)];
  let second: unknown[];
  try {
    second = await callWithin(provider, { ...base, avoidDishNames: avoid }, remaining());
  } catch {
    return passing;
  }
  const extra = filterCandidates(toRecipes(second), cond, avoid, passing);
  return [...passing, ...extra].slice(0, max);
}
