import { formatQuantity } from "./scaling";
import type { RecipeIngredient } from "./types";

/**
 * 장바구니 공유/복사 문구 (spec §5.10, 형식 고정).
 * `missing`은 표시 인분으로 환산·반올림된 부족 재료여야 한다.
 */
export function buildShareText(dishName: string, servings: number, missing: RecipeIngredient[]): string {
  if (missing.length === 0) {
    return `🛒 ${dishName}: 살 재료 없음! 냉장고 재료로 충분해요`;
  }
  const lines = missing.map((ing) => `- ${ing.name} ${formatQuantity(ing)}`);
  return [`🛒 장바구니 — ${dishName} (${servings}인분)`, ...lines].join("\n");
}
