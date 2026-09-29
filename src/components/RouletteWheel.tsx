"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RouletteWheel.module.css";

type Props = {
  /** 칸 이름 목록. 룰렛 모드는 2개 이상 */
  labels: string[];
  /** 당첨 칸 번호 (바깥에서 균등 추첨해 넘긴다) */
  winnerIndex: number | null;
  /** 값이 바뀔 때마다 한 번 돌린다 */
  spinKey: number;
  /** 멈춤 완료 */
  onLanded?: (index: number) => void;
  /** 후보를 기다리는 동안 천천히 도는 대기 모드 */
  loading?: boolean;
};

const SPIN_MS = 3600; // 조정 가능
const REDUCED_SPIN_MS = 600;
const EXTRA_TURNS = 5;
const COLORS = ["#ff7a3d", "#ffb347", "#ffd56b", "#8fd694", "#5fc4c9", "#8aa8ff", "#c38bff", "#ff8fb1"];
const R = 150;
const LOADING_LABELS = ["?", "?", "?", "?", "?", "?"];

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function shorten(label: string, n: number): string {
  const max = n <= 4 ? 9 : n <= 6 ? 7 : 6;
  const chars = Array.from(label);
  return chars.length > max ? chars.slice(0, max - 1).join("") + "…" : label;
}

function slicePath(i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M${R},${R} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
}

/** 원형 룰렛판. 도메인 타입을 모르는 범용 컴포넌트 (이름 문자열만 받음) */
export default function RouletteWheel({ labels, winnerIndex, spinKey, onLanded, loading = false }: Props) {
  const [rotation, setRotation] = useState(0);
  const [duration, setDuration] = useState(0);
  const rotationRef = useRef(0);
  const onLandedRef = useRef(onLanded);

  useEffect(() => {
    onLandedRef.current = onLanded;
  }, [onLanded]);

  useEffect(() => {
    if (loading || winnerIndex === null || spinKey === 0) return;
    const n = labels.length;
    if (n === 0) return;
    const seg = 360 / n;
    // 당첨 칸 안에서 살짝 흔들어 매번 같은 자리에 서지 않게
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const center = (winnerIndex + 0.5) * seg + jitter;
    const current = rotationRef.current;
    const targetMod = (((360 - center) % 360) + 360) % 360;
    const delta = (((targetMod - (current % 360)) % 360) + 360) % 360;
    const ms = prefersReducedMotion() ? REDUCED_SPIN_MS : SPIN_MS;
    const next = current + EXTRA_TURNS * 360 + delta;
    rotationRef.current = next;
    // 회전 시작은 새 spinKey를 받은 직후 한 번만 일어나는 외부 연출이다
    /* eslint-disable react-hooks/set-state-in-effect */
    setDuration(ms);
    setRotation(next);
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = window.setTimeout(() => onLandedRef.current?.(winnerIndex), ms + 50);
    return () => window.clearTimeout(t);
    // labels 길이는 spinKey와 함께 바뀌므로 spinKey 기준으로만 돌린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const shown = loading ? LOADING_LABELS : labels;
  const n = shown.length;
  const fontSize = n <= 4 ? 16 : n <= 6 ? 14 : 12;

  return (
    <div className={styles.wrap} aria-live="polite">
      <div className={styles.pointer} aria-hidden />
      <svg
        viewBox={`0 0 ${R * 2} ${R * 2}`}
        className={`${styles.wheel} ${loading ? styles.loading : ""}`}
        style={loading ? undefined : { transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}
        role="img"
        aria-label={loading ? "후보를 고르는 중" : `룰렛: ${labels.join(", ")}`}
      >
        {shown.map((label, i) => {
          const mid = ((i + 0.5) / n) * 360;
          return (
            <g key={`${i}-${label}`}>
              <path d={slicePath(i, n)} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
              <text
                x={R}
                y={R - R * 0.6}
                transform={`rotate(${mid} ${R} ${R})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontWeight={700}
                fill="#2b2118"
              >
                {shorten(label, n)}
              </text>
            </g>
          );
        })}
        <circle cx={R} cy={R} r={18} fill="#fff" stroke="#2b2118" strokeWidth={3} />
      </svg>
    </div>
  );
}
