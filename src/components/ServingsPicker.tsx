"use client";

import { MAX_SERVINGS, MIN_SERVINGS } from "@/lib/presets";
import styles from "./ui.module.css";

type Props = { value: number; onChange: (n: number) => void; label?: string };

const OPTIONS = Array.from({ length: MAX_SERVINGS - MIN_SERVINGS + 1 }, (_, i) => MIN_SERVINGS + i);

/** 인분 1~4 선택 (spec §5.5) */
export default function ServingsPicker({ value, onChange, label = "인분" }: Props) {
  return (
    <div className={styles.servings} role="radiogroup" aria-label={label}>
      {OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          className={`${styles.servingBtn} ${n === value ? styles.servingOn : ""}`}
          onClick={() => onChange(n)}
        >
          {n}인분
        </button>
      ))}
    </div>
  );
}
