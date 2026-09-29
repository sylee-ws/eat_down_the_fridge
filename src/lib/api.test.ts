import { describe, expect, it, vi } from "vitest";
import { requestCandidates, verifyPasscode, type CandidatesBody } from "./api";

const body: CandidatesBody = {
  passcode: "pw",
  ingredients: ["계란"],
  seasonings: [],
  exclusions: [],
  servings: 2,
  avoidDishNames: [],
};

const respond = (status: number, json: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } }));

const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

describe("requestCandidates", () => {
  it("200 → ok + 후보, 우리 API로 POST", async () => {
    const f = respond(200, { candidates: [{ id: "1" }] });
    const out = await requestCandidates(body, f);
    expect(out).toEqual({ kind: "ok", candidates: [{ id: "1" }] });
    expect(f).toHaveBeenCalledWith("/api/candidates", expect.objectContaining({ method: "POST" }));
  });

  it("401 → unauthorized", async () => {
    expect(await requestCandidates(body, respond(401, { error: "PASSCODE_INVALID" }))).toEqual({ kind: "unauthorized" });
  });

  it("502, 504 → retry", async () => {
    expect(await requestCandidates(body, respond(502, { error: "AI_FAILED" }))).toEqual({ kind: "retry" });
    expect(await requestCandidates(body, respond(504, {}))).toEqual({ kind: "retry" });
  });

  it("네트워크 오류 → retry", async () => {
    quiet();
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await requestCandidates(body, f)).toEqual({ kind: "retry" });
  });

  it("400, 500 → problem", async () => {
    quiet();
    expect(await requestCandidates(body, respond(400, { error: "BAD_REQUEST" }))).toEqual({ kind: "problem" });
    expect(await requestCandidates(body, respond(500, { error: "SERVER_MISCONFIGURED" }))).toEqual({ kind: "problem" });
  });

  it("200인데 모양이 이상하면 problem", async () => {
    quiet();
    expect(await requestCandidates(body, respond(200, { nope: 1 }))).toEqual({ kind: "problem" });
  });
});

describe("verifyPasscode", () => {
  it("200 → ok", async () => {
    expect(await verifyPasscode("pw", respond(200, { ok: true }))).toEqual({ kind: "ok" });
  });
  it("401 → invalid", async () => {
    expect(await verifyPasscode("pw", respond(401, { error: "PASSCODE_INVALID" }))).toEqual({ kind: "invalid" });
  });
  it("500 → problem, 502/네트워크 → retry", async () => {
    quiet();
    expect(await verifyPasscode("pw", respond(500, {}))).toEqual({ kind: "problem" });
    expect(await verifyPasscode("pw", respond(503, {}))).toEqual({ kind: "retry" });
    const f = vi.fn(async () => {
      throw new TypeError("x");
    });
    expect(await verifyPasscode("pw", f)).toEqual({ kind: "retry" });
  });
});
