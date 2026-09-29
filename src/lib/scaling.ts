import type { RecipeIngredient } from "./types";

/**
 * 표시용 반올림 (spec §6.5, 조정 가능 기본값):
 * 10 미만은 0.5 단위, 10 이상은 정수, 결과가 0이면 0.5.
 * 인분이 같아도 표시·문구 단계에서 항상 적용한다.
 */
export function roundAmount(v: number): number {
  const r = v < 10 ? Math.round(v * 2) / 2 : Math.round(v);
  return r <= 0 ? 0.5 : r;
}

/** 기준 인분 base → 새 인분 target으로 환산 + 반올림. null은 그대로. 원본은 바꾸지 않는다. */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  base: number,
  target: number,
): RecipeIngredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    amount: ing.amount === null ? null : roundAmount((ing.amount * target) / base),
  }));
}

/** 수량 표기: amount가 있으면 `{amount}{unit}`, null이면 `{unit}` (spec §5.10) */
export function formatQuantity(ing: Pick<RecipeIngredient, "amount" | "unit">): string {
  return ing.amount === null ? ing.unit : `${ing.amount}${ing.unit}`;
}
