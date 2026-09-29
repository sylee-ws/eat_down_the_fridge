import { norm } from "./normalize";
import type { Conditions, Recipe, RecipeIngredient } from "./types";

/** 물은 항상 가진 것으로 본다 (spec §3) */
const ALWAYS_AVAILABLE = ["물"];

type Have = Pick<Conditions, "ingredients" | "seasonings">;

/** 가진 것 = 선택 재료 ∪ 보유 양념 ∪ {물} (spec §6.1) */
export function availableSet(cond: Have): Set<string> {
  return new Set([...cond.ingredients, ...cond.seasonings, ...ALWAYS_AVAILABLE].map(norm));
}

/**
 * 부족 재료 = 레시피 재료 중 가진 것에 없는 것 (spec §6.1).
 * 레시피 재료 순서를 유지하고, 같은 이름이 여러 줄이면 첫 줄만 남긴다.
 */
export function missingIngredients(ingredients: RecipeIngredient[], cond: Have): RecipeIngredient[] {
  const have = availableSet(cond);
  const seen = new Set<string>();
  const missing: RecipeIngredient[] = [];
  for (const ing of ingredients) {
    const key = norm(ing.name);
    if (have.has(key) || seen.has(key)) continue;
    seen.add(key);
    missing.push(ing);
  }
  return missing;
}

/** 이 재료를 이미 가졌는가 — 결과 카드의 "가진 것/살 것" 구분 표시용 */
export function isAvailable(name: string, cond: Have): boolean {
  return availableSet(cond).has(norm(name));
}

/** 선택된 냉장고 재료를 1개 이상 쓰는가 (spec §6.2). 양념만 쓰는 건 불인정. */
export function usesSelectedIngredient(recipe: Pick<Recipe, "ingredients">, selected: string[]): boolean {
  const sel = new Set(selected.map(norm));
  return recipe.ingredients.some((ing) => sel.has(norm(ing.name)));
}
