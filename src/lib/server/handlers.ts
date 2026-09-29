import type { AiProvider } from "./ai/types";
import { createProvider as defaultCreateProvider } from "./ai";
import { readAiConfig, readPasscode, type AiConfig, type Env } from "./config";
import { generateCandidates } from "./generate";
import { passcodeMatches } from "./passcode";
import { parseCandidatesRequest } from "./requestBody";

export type { Env };

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const misconfigured = () => json({ error: "SERVER_MISCONFIGURED" }, 500);
const passcodeInvalid = () => json({ error: "PASSCODE_INVALID" }, 401);

/** 본문을 JSON으로 읽는다. 실패하면 undefined (→ 암호 없음으로 처리) */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

const passcodeOf = (body: unknown): unknown =>
  typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).passcode
    : undefined;

/** 로그용 오류 요약 — 키·암호가 섞여 있으면 가린다 */
function describeError(e: unknown, secrets: string[]): string {
  const parts: string[] = [];
  for (let cur: unknown = e, i = 0; cur && i < 3; cur = (cur as { cause?: unknown }).cause, i++) {
    parts.push(cur instanceof Error ? `${cur.name}: ${cur.message}` : String(cur));
  }
  let msg = parts.join(" <- ");
  for (const s of secrets) if (s) msg = msg.split(s).join("[redacted]");
  return msg.slice(0, 500);
}

/** POST /api/verify-passcode (spec §7.1) */
export async function handleVerifyPasscode(request: Request, env: Env): Promise<Response> {
  const expected = readPasscode(env);
  if (expected === null) return misconfigured();
  const body = await readJson(request);
  if (!passcodeMatches(passcodeOf(body), expected)) return passcodeInvalid();
  return json({ ok: true }, 200);
}

export type CandidatesDeps = {
  createProvider?: (cfg: AiConfig) => AiProvider;
  now?: () => number;
  newId?: () => string;
};

/** POST /api/candidates (spec §7.2) */
export async function handleCandidates(request: Request, env: Env, deps: CandidatesDeps = {}): Promise<Response> {
  const now = deps.now ?? Date.now;
  const startedAt = now();

  // 설정 오류면 모든 요청 거부 (fail closed)
  const expected = readPasscode(env);
  const ai = readAiConfig(env);
  if (expected === null || ai === null) return misconfigured();

  // 암호 확인은 본문 형식 검사·AI 호출보다 먼저
  const body = await readJson(request);
  if (!passcodeMatches(passcodeOf(body), expected)) return passcodeInvalid();

  const req = parseCandidatesRequest(body);
  if (req === null) return json({ error: "BAD_REQUEST" }, 400);

  try {
    const provider = (deps.createProvider ?? defaultCreateProvider)(ai);
    const candidates = await generateCandidates(req, provider, { now, startedAt, newId: deps.newId });
    return json({ candidates }, 200);
  } catch (e) {
    console.error(`[candidates] AI_FAILED (${ai.provider}/${ai.model}): ${describeError(e, [ai.apiKey, expected])}`);
    return json({ error: "AI_FAILED" }, 502);
  }
}
