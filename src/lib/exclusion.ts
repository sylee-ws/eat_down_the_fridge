import { norm } from "./normalize";
import type { Recipe } from "./types";

function words(exclusions: string[]): string[] {
  return exclusions.map(norm).filter((w) => w.length > 0);
}

/** 이 이름이 제외 단어를 포함하는가 — 태그 흐림/선택 불가 판정에도 쓴다 (spec §5.4, §6.4) */
export function isBlockedName(name: string, exclusions: string[]): boolean {
  const n = norm(name);
  return words(exclusions).some((w) => n.includes(w));
}

/** 요리명 또는 재료 이름 중 하나라도 제외 단어를 포함하면 위반 (spec §6.4) */
export function violatesExclusions(recipe: Pick<Recipe, "name" | "ingredients">, exclusions: string[]): boolean {
  if (words(exclusions).length === 0) return false;
  return (
    isBlockedName(recipe.name, exclusions) ||
    recipe.ingredients.some((ing) => isBlockedName(ing.name, exclusions))
  );
}
