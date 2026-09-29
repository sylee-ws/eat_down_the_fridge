"use client";

import type { Favorite } from "@/lib/types";
import styles from "./ui.module.css";

type Props = {
  favorites: Favorite[];
  onOpen: (fav: Favorite) => void;
  onRemove: (recipeId: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일 저장`;
}

/** 즐겨찾기 목록 — 최근 저장 순 (spec §5.11) */
export default function FavoritesList({ favorites, onOpen, onRemove }: Props) {
  const sorted = [...favorites].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return (
    <section className={styles.section} aria-labelledby="sec-fav">
      <h2 id="sec-fav" className={styles.sectionTitle}>
        ♥ 즐겨찾기
        <span className={styles.count}>{favorites.length}</span>
      </h2>
      {sorted.length === 0 ? (
        <p className={styles.hint}>마음에 드는 레시피의 ♡를 누르면 여기에 모여요.</p>
      ) : (
        <ul className={styles.favList}>
          {sorted.map((f) => (
            <li key={f.recipe.id} className={styles.favItem}>
              <button type="button" className={styles.favOpen} onClick={() => onOpen(f)}>
                <span className={styles.favName}>{f.recipe.name}</span>
                <span className={styles.favMeta}>
                  {f.savedServings}인분 · {formatDate(f.savedAt)}
                </span>
              </button>
              <button
                type="button"
                className={styles.favDel}
                aria-label={`${f.recipe.name} 즐겨찾기 삭제`}
                onClick={() => onRemove(f.recipe.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
