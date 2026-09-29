"use client";

import { LIST_LIMIT } from "@/lib/presets";
import { addExclusion, removeExclusion, type Settings, type Update } from "@/lib/settings";
import AddInput from "./AddInput";
import styles from "./ui.module.css";

export const ALLERGY_NOTE = "AI가 만든 레시피예요. 알레르기 재료는 꼭 한 번 더 확인하세요.";

type Props = { settings: Settings; onUpdate: (u: Update) => void };

/** 못 먹는 재료 (spec §5.4) */
export default function ExclusionSection({ settings, onUpdate }: Props) {
  return (
    <section className={styles.section} aria-labelledby="sec-exclusion">
      <h2 id="sec-exclusion" className={styles.sectionTitle}>
        🚫 못 먹는 재료
        <span className={styles.count}>
          {settings.exclusions.length}/{LIST_LIMIT}
        </span>
      </h2>
      <p className={styles.hint}>적어 두면 그 이름이 들어간 재료와 요리는 빼고 골라요. 예) 새우, 땅콩</p>
      {settings.exclusions.length > 0 && (
        <div className={styles.tags}>
          {settings.exclusions.map((w) => (
            <span key={w} className={styles.chipGroup}>
              <span className={`${styles.chip} ${styles.chipWithX}`}>{w}</span>
              <button
                type="button"
                className={styles.chipX}
                aria-label={`${w} 삭제`}
                onClick={() => onUpdate(removeExclusion(settings, w))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <AddInput
        placeholder="못 먹는 재료 입력"
        label="못 먹는 재료 입력"
        onAdd={(text) => {
          const u = addExclusion(settings, text);
          onUpdate(u);
          return !u.notice;
        }}
      />
      <p className={styles.note}>⚠️ {ALLERGY_NOTE}</p>
    </section>
  );
}
