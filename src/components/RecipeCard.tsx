"use client";

import type { ReactNode } from "react";
import { isAvailable, missingIngredients } from "@/lib/pantry";
import { formatQuantity, scaleIngredients } from "@/lib/scaling";
import { buildShareText } from "@/lib/shareText";
import type { Conditions, Recipe } from "@/lib/types";
import { ALLERGY_NOTE } from "./ExclusionSection";
import ServingsPicker from "./ServingsPicker";
import ShareButtons from "./ShareButtons";
import styles from "./ui.module.css";

type Props = {
  recipe: Recipe;
  /** 표시 인분 — 수량은 recipe.servings 기준에서 환산 */
  servings: number;
  onServingsChange: (n: number) => void;
  /** 지금의 냉장고 재료·보유 양념 */
  have: Pick<Conditions, "ingredients" | "seasonings">;
  favorite: boolean;
  onToggleFavorite: () => void;
  onToast: (msg: string) => void;
  /** 위에 붙는 짧은 머리말 */
  kicker?: string;
  /** 추가 버튼들 (다시 돌리기·새 후보·닫기 등) */
  children?: ReactNode;
  headingId?: string;
};

/** 레시피 카드 (spec §5.9) — 결과 카드와 즐겨찾기 카드가 함께 쓴다 */
export default function RecipeCard({
  recipe,
  servings,
  onServingsChange,
  have,
  favorite,
  onToggleFavorite,
  onToast,
  kicker,
  children,
  headingId,
}: Props) {
  // 인분이 같아도 항상 환산(반올림) 결과로 표시
  const scaled = scaleIngredients(recipe.ingredients, recipe.servings, servings);
  const missing = missingIngredients(scaled, have);
  const shareText = buildShareText(recipe.name, servings, missing);

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHead}>
        <div>
          {kicker && <p className={styles.hint}>{kicker}</p>}
          <h3 id={headingId} className={styles.dish}>
            {recipe.name}
          </h3>
          <p className={styles.meta}>
            🔥 불 사용 {recipe.cookMinutes}분 · 🔪 손질 약 {recipe.prepMinutes}분 · {servings}인분
          </p>
        </div>
        <button
          type="button"
          className={styles.heart}
          aria-pressed={favorite}
          aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기에 저장"}
          onClick={onToggleFavorite}
        >
          {favorite ? "♥" : "♡"}
        </button>
      </div>

      <ServingsPicker value={servings} onChange={onServingsChange} label="레시피 인분" />

      <div>
        <h4 className={styles.subTitle}>재료</h4>
        <ul className={styles.ingList}>
          {scaled.map((ing, i) => {
            const own = isAvailable(ing.name, have);
            return (
              <li key={`${i}-${ing.name}`} className={styles.ingItem}>
                <span className={`${styles.badge} ${own ? "" : styles.badgeBuy}`}>{own ? "가진 것" : "살 것"}</span>
                <span className={styles.ingName}>{ing.name}</span>
                <span className={styles.ingQty}>{formatQuantity(ing)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className={styles.subTitle}>만드는 법</h4>
        <ol className={styles.steps}>
          {recipe.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      <div className={styles.cart}>
        <h4 className={styles.subTitle}>🛒 장바구니</h4>
        {missing.length === 0 ? (
          <p className={styles.hint}>살 재료 없음! 냉장고 재료로 충분해요</p>
        ) : (
          <ul className={styles.cartList}>
            {missing.map((ing) => (
              <li key={ing.name}>
                - {ing.name} {formatQuantity(ing)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.btnRow}>
        <ShareButtons text={shareText} onToast={onToast} />
        {children}
      </div>

      <p className={styles.note}>⚠️ {ALLERGY_NOTE}</p>
    </article>
  );
}
