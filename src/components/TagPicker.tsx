"use client";

import {
  addCustomTag,
  allTags,
  isChosen,
  isCustomTag,
  isTagBlocked,
  removeCustomTag,
  toggleTag,
  type Settings,
  type TagKind,
  type Update,
} from "@/lib/settings";
import AddInput from "./AddInput";
import styles from "./ui.module.css";

type Props = {
  settings: Settings;
  kind: TagKind;
  onUpdate: (u: Update) => void;
};

/** 재료/양념 태그 목록 + 직접 입력 */
export default function TagPicker({ settings, kind, onUpdate }: Props) {
  const what = kind === "ingredient" ? "재료" : "양념";
  return (
    <>
      <div className={styles.tags}>
        {allTags(settings, kind).map((name) => {
          const on = isChosen(settings, kind, name);
          const blocked = isTagBlocked(settings, name);
          const custom = isCustomTag(settings, kind, name);
          const cls = [styles.chip, on ? styles.chipOn : "", blocked ? styles.chipBlocked : "", custom ? styles.chipWithX : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <span key={name} className={styles.chipGroup}>
              <button
                type="button"
                className={cls}
                aria-pressed={on}
                aria-disabled={blocked || undefined}
                title={blocked ? "못 먹는 재료에 걸려요" : undefined}
                onClick={() => onUpdate(toggleTag(settings, kind, name))}
              >
                {on ? "✓ " : ""}
                {name}
              </button>
              {custom && (
                <button
                  type="button"
                  className={`${styles.chipX} ${on ? styles.chipXOn : ""}`}
                  aria-label={`${name} 삭제`}
                  onClick={() => onUpdate(removeCustomTag(settings, kind, name))}
                >
                  ✕
                </button>
              )}
            </span>
          );
        })}
      </div>
      <AddInput
        placeholder={`다른 ${what} 직접 입력`}
        label={`${what} 직접 입력`}
        onAdd={(text) => {
          const u = addCustomTag(settings, kind, text);
          onUpdate(u);
          return !u.notice;
        }}
      />
    </>
  );
}
