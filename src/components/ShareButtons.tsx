"use client";

import { useSyncExternalStore } from "react";
import styles from "./ui.module.css";

type Props = { text: string; onToast: (msg: string) => void };

const noop = () => () => {};
/** 기본 공유창 지원 여부 — 서버 렌더 때는 false (하이드레이션 불일치 방지) */
const useCanShare = () =>
  useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

/** 숨긴 textarea + execCommand 대체 복사 */
function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 대체 방식으로
  }
  return legacyCopy(text);
}

/** 장바구니 공유·복사 */
export default function ShareButtons({ text, onToast }: Props) {
  const canShare = useCanShare();

  const share = async () => {
    try {
      await navigator.share({ text });
    } catch (e) {
      // 사용자가 취소하면 조용히
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("[share]", e);
      onToast("공유하지 못했어요");
    }
  };

  const copy = async () => {
    onToast((await copyText(text)) ? "복사했어요" : "복사하지 못했어요");
  };

  return (
    <>
      {canShare && (
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={share}>
          📤 공유
        </button>
      )}
      <button type="button" className={styles.btn} onClick={copy}>
        📋 복사
      </button>
    </>
  );
}
