"use client";

import { useEffect } from "react";
import styles from "./ui.module.css";

export type ToastState = { id: number; text: string } | null;

type Props = { toast: ToastState; onDone: () => void; ms?: number };

/** 짧은 알림 — 잠깐 떴다가 사라진다 */
export default function Toast({ toast, onDone, ms = 2200 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(t);
  }, [toast, onDone, ms]);

  return (
    <div role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={styles.toast}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
