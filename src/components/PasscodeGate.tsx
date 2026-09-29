"use client";

import { useState } from "react";
import { verifyPasscode } from "@/lib/api";
import styles from "./ui.module.css";

type Props = {
  /** 서버가 맞다고 한 암호 */
  onVerified: (passcode: string) => void;
  /** 저장된 암호가 거부돼 돌아온 경우 안내 */
  expired?: boolean;
};

/** 가족 암호 입력 화면 */
export default function PasscodeGate({ onVerified, expired = false }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || value.length === 0) return;
    setBusy(true);
    setError(null);
    const out = await verifyPasscode(value);
    setBusy(false);
    if (out.kind === "ok") onVerified(value);
    else if (out.kind === "invalid") {
      setError("암호가 달라요");
      setValue("");
    } else if (out.kind === "retry") setError("연결이 불안정해요. 다시 시도해 주세요");
    else setError("문제가 생겼어요");
  };

  return (
    <main className={styles.gate}>
      <div className={styles.emoji} aria-hidden>
        🍳
      </div>
      <h1 className={styles.title} style={{ textAlign: "center" }}>
        냉장고 파먹기 룰렛
      </h1>
      <p className={styles.hint} style={{ textAlign: "center" }}>
        {expired ? "가족 암호가 바뀌었어요. 새 암호를 입력해 주세요." : "가족끼리 정한 암호를 입력해 주세요."}
      </p>
      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={styles.input}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="가족 암호"
          aria-label="가족 암호"
          autoComplete="current-password"
          enterKeyHint="go"
          autoFocus
        />
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || value.length === 0}>
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
