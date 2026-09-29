import { violatesExclusions } from "./exclusion";
import { norm } from "./normalize";
import { missingIngredients, usesSelectedIngredient } from "./pantry";
import type { Conditions, Recipe, RecipeIngredient } from "./types";

export const MAX_COOK_MINUTES = 15;
export const MAX_PREP_MINUTES = 10;
export const MAX_MISSING = 3;
export const MAX_DISH_NAME_LENGTH = 40;
export const MIN_STEPS = 4;
export const MAX_STEPS = 6;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * AI가 준 알 수 없는 값을 Recipe 모양으로 옮긴다. 모양 자체가 틀리면 null.
 * servings는 AI 값과 무관하게 요청 인분으로 덮어쓴다.
 * 값의 범위 검사는 여기서 하지 않고 checkStructural에서 한다.
 */
export function toRecipe(raw: unknown, id: string, servings: number): Recipe | null {
  if (!isObj(raw)) return null;
  const { name, cookMinutes, prepMinutes, ingredients, steps } = raw;
  if (typeof name !== "string") return null;
  if (typeof cookMinutes !== "number" || typeof prepMinutes !== "number") return null;
  if (!Array.isArray(ingredients) || !Array.isArray(steps)) return null;
  const ings: RecipeIngredient[] = [];
  for (const it of ingredients) {
    if (!isObj(it)) return null;
    const amount = it.amount === undefined ? null : it.amount;
    if (typeof it.name !== "string" || typeof it.unit !== "string") return null;
    if (amount !== null && typeof amount !== "number") return null;
    ings.push({ name: it.name.trim(), amount, unit: it.unit.trim() });
  }
  if (!steps.every((s) => typeof s === "string")) return null;
  return {
    id,
    name: name.trim(),
    cookMinutes,
    prepMinutes,
    servings,
    ingredients: ings,
    steps: (steps as string[]).map((s) => s.trim()),
  };
}

const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** 생성 시점 구조 규칙(요리명 40자·피할 이름, 불 15분·손질 10분, 4~6단계, 재료 모양) — 판 내 중복은 filterCandidates */
export function checkStructural(recipe: Recipe, avoidDishNames: string[]): boolean {
  const n = norm(recipe.name);
  if (n.length === 0 || Array.from(n).length > MAX_DISH_NAME_LENGTH) return false;
  if (!intIn(recipe.cookMinutes, 0, MAX_COOK_MINUTES)) return false;
  if (!intIn(recipe.prepMinutes, 0, MAX_PREP_MINUTES)) return false;
  if (recipe.steps.length < MIN_STEPS || recipe.steps.length > MAX_STEPS) return false;
  if (recipe.steps.some((s) => s.trim().length === 0)) return false;
  if (recipe.ingredients.length === 0) return false;
  for (const ing of recipe.ingredients) {
    if (norm(ing.name).length === 0) return false;
    if (ing.amount !== null && !(Number.isFinite(ing.amount) && ing.amount > 0)) return false;
  }
  if (avoidDishNames.map(norm).includes(n)) return false;
  return true;
}

/** 조건 의존 규칙(선택 재료 1개 이상 사용, 부족 재료 3개 이하, 못 먹는 재료 없음) — 생성 시점과 조건 변경 재검사에 모두 쓴다 */
export function checkConditional(recipe: Recipe, cond: Conditions): boolean {
  if (!usesSelectedIngredient(recipe, cond.ingredients)) return false;
  if (missingIngredients(recipe.ingredients, cond).length > MAX_MISSING) return false;
  if (violatesExclusions(recipe, cond.exclusions)) return false;
  return true;
}

/** 조건이 바뀌었을 때 조건 의존 규칙만 다시 적용. 순서 유지. */
export function recheckCandidates(candidates: Recipe[], cond: Conditions): Recipe[] {
  return candidates.filter((r) => checkConditional(r, cond));
}

/**
 * 후보 검사 전체 (구조 규칙 + 조건 의존 규칙). 순서를 유지하고, 판 안에서 요리명이 겹치면 뒤의 것을 버린다.
 * `existing`은 이미 판에 있는 후보(보충 합치기용) — 그 이름과 겹쳐도 버린다.
 */
export function filterCandidates(
  candidates: Recipe[],
  cond: Conditions,
  avoidDishNames: string[],
  existing: Recipe[] = [],
): Recipe[] {
  const seen = new Set(existing.map((r) => norm(r.name)));
  const out: Recipe[] = [];
  for (const r of candidates) {
    if (!checkStructural(r, avoidDishNames)) continue;
    if (!checkConditional(r, cond)) continue;
    const key = norm(r.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
