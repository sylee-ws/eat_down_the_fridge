"use client";

import { useState } from "react";
import styles from "./ui.module.css";

type Props = {
  placeholder: string;
  label: string;
  /** 추가 성공이면 true → 입력칸을 비운다 */
  onAdd: (text: string) => boolean;
};

/** 직접 입력 한 줄 (입력 + 추가 버튼) */
export default function AddInput({ placeholder, label, onAdd }: Props) {
  const [text, setText] = useState("");
  return (
    <form
      className={styles.addRow}
      onSubmit={(e) => {
        e.preventDefault();
        if (onAdd(text)) setText("");
      }}
    >
      <input
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="done"
        autoComplete="off"
      />
      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
        추가
      </button>
    </form>
  );
}
