import { norm } from "./normalize";
import type { Conditions, Recipe } from "./types";
import { recheckCandidates } from "./validation";

/** 피할 이름으로 보내는 최대 개수 (spec §5.7, 서버 한도와 같음) */
export const AVOID_LIMIT = 50;

/** 후보판 상태 — 메모리에만 둔다 (spec §5.7) */
export type BoardState = {
  /** 현재 후보판 */
  candidates: Recipe[];
  /** 이 판에서 이미 결과로 나온 후보 id */
  shownIds: string[];
  /** 이번 사용 중 후보판에 올랐던 요리 이름 (오른 순서, 중복 없음) */
  history: string[];
};

export type NextAction = {
  /** spin: 2개 이상 → 룰렛 / direct: 1개 → 바로 결과 / empty: 0개 */
  kind: "spin" | "direct" | "empty";
  /** 남은 후보가 2개 미만이면 "새 후보 받기" 제안 */
  suggestNew: boolean;
};

export function emptyBoard(): BoardState {
  return { candidates: [], shownIds: [], history: [] };
}

/** 새 후보판으로 교체. 이름은 기록 끝에 붙이고, 이미 있던 이름은 가장 최근 자리로 옮긴다. */
export function newBoard(prev: BoardState, candidates: Recipe[]): BoardState {
  let history = prev.history;
  for (const r of candidates) {
    const key = norm(r.name);
    history = [...history.filter((n) => norm(n) !== key), r.name];
  }
  return { candidates: [...candidates], shownIds: [], history };
}

/** 아직 안 나온 후보 */
export function remaining(state: BoardState): Recipe[] {
  return state.candidates.filter((r) => !state.shownIds.includes(r.id));
}

export function markShown(state: BoardState, id: string): BoardState {
  if (state.shownIds.includes(id)) return state;
  return { ...state, shownIds: [...state.shownIds, id] };
}

/** 조건이 바뀌면 남은 후보만 다시 검사해 안 맞는 것을 뺀다 (spec §5.8). 나온 후보는 그대로. */
export function recheck(state: BoardState, cond: Conditions): BoardState {
  const keep = new Set(recheckCandidates(remaining(state), cond).map((r) => r.id));
  const candidates = state.candidates.filter((r) => state.shownIds.includes(r.id) || keep.has(r.id));
  if (candidates.length === state.candidates.length) return state;
  return { ...state, candidates };
}

/** 새 요청에 보낼 피할 이름: 가장 최근 50개 */
export function avoidNames(state: BoardState): string[] {
  return state.history.slice(-AVOID_LIMIT);
}

export function nextAction(state: BoardState): NextAction {
  const n = remaining(state).length;
  return { kind: n >= 2 ? "spin" : n === 1 ? "direct" : "empty", suggestNew: n < 2 };
}
