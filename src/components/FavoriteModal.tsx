"use client";

import { useEffect, useState } from "react";
import type { Conditions, Favorite } from "@/lib/types";
import RecipeCard from "./RecipeCard";
import styles from "./ui.module.css";

type Props = {
  favorite: Favorite;
  isSaved: boolean;
  have: Pick<Conditions, "ingredients" | "seasonings">;
  /** ♡ 누름 — 저장 여부 토글, 다시 저장할 땐 카드의 인분으로 */
  onToggleFavorite: (servings: number) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
};

/** 즐겨찾기를 겹쳐 뜨는 카드로 보기 (spec §5.11). 인분 조절은 저장값을 바꾸지 않는다. */
export default function FavoriteModal({ favorite, isSaved, have, onToggleFavorite, onClose, onToast }: Props) {
  const [servings, setServings] = useState(favorite.savedServings);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fav-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.sheet}>
        <RecipeCard
          recipe={favorite.recipe}
          servings={servings}
          onServingsChange={setServings}
          have={have}
          favorite={isSaved}
          onToggleFavorite={() => onToggleFavorite(servings)}
          onToast={onToast}
          kicker="즐겨찾기한 레시피"
          headingId="fav-modal-title"
        >
          <button type="button" className={styles.btn} onClick={onClose}>
            닫기
          </button>
        </RecipeCard>
      </div>
    </div>
  );
}
