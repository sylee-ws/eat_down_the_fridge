import type { Recipe } from "./types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** POST /api/candidates 본문 (spec §7.2) */
export type CandidatesBody = {
  passcode: string;
  ingredients: string[];
  seasonings: string[];
  exclusions: string[];
  servings: number;
  avoidDishNames: string[];
};

/**
 * 화면이 할 일로 바꾼 결과 (spec §7.3)
 * unauthorized: 암호 삭제 후 암호 화면 / retry: "다시 시도" / problem: "문제가 생겼어요"
 */
export type CandidatesOutcome =
  | { kind: "ok"; candidates: Recipe[] }
  | { kind: "unauthorized" }
  | { kind: "retry" }
  | { kind: "problem" };

export type VerifyOutcome = { kind: "ok" } | { kind: "invalid" } | { kind: "retry" } | { kind: "problem" };

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

async function post(url: string, body: unknown, f: FetchLike): Promise<Response | null> {
  try {
    return await f(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    console.error(`[api] ${url} 네트워크 오류`, e);
    return null;
  }
}

/** 400/500/기타 4xx → problem, 그 밖의 5xx → retry */
function failure(res: Response, url: string): { kind: "retry" } | { kind: "problem" } {
  if (res.status >= 500 && res.status !== 500) return { kind: "retry" };
  console.error(`[api] ${url} 응답 ${res.status}`);
  return { kind: "problem" };
}

export async function requestCandidates(body: CandidatesBody, f: FetchLike = defaultFetch): Promise<CandidatesOutcome> {
  const url = "/api/candidates";
  const res = await post(url, body, f);
  if (res === null) return { kind: "retry" };
  if (res.status === 401) return { kind: "unauthorized" };
  if (!res.ok) return failure(res, url);
  try {
    const data: unknown = await res.json();
    const list = (data as { candidates?: unknown } | null)?.candidates;
    if (Array.isArray(list)) return { kind: "ok", candidates: list as Recipe[] };
  } catch {
    // 아래에서 처리
  }
  console.error(`[api] ${url} 응답 모양이 이상해요`);
  return { kind: "problem" };
}

export async function verifyPasscode(passcode: string, f: FetchLike = defaultFetch): Promise<VerifyOutcome> {
  const url = "/api/verify-passcode";
  const res = await post(url, { passcode }, f);
  if (res === null) return { kind: "retry" };
  if (res.status === 401) return { kind: "invalid" };
  if (!res.ok) return failure(res, url);
  return { kind: "ok" };
}
