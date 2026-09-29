import { describe, expect, it, vi } from "vitest";
import type { AiConfig } from "./config";
import { handleCandidates, handleVerifyPasscode, type Env } from "./handlers";
import { fakeProvider, raw } from "./testing";

const PASS = "우리집암호";
const env = (over: Env = {}): Env => ({ FAMILY_PASSCODE: PASS, ANTHROPIC_API_KEY: "sk-test", ...over });

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const validBody = (over: Record<string, unknown> = {}) => ({
  passcode: PASS,
  ingredients: ["대파", "계란"],
  seasonings: ["간장"],
  exclusions: [],
  servings: 2,
  avoidDishNames: [],
  ...over,
});

const goods = (n: number) => Array.from({ length: n }, (_, i) => raw({ name: `볶음${i}` }));

/** 가짜 AI 연결부와, 어떤 설정으로 만들어졌는지 기록하는 팩토리 */
function setup(steps: Parameters<typeof fakeProvider>[0] = [goods(3)]) {
  const provider = fakeProvider(steps);
  const configs: AiConfig[] = [];
  const createProvider = vi.fn((cfg: AiConfig) => {
    configs.push(cfg);
    return provider;
  });
  return { provider, configs, createProvider };
}

describe("POST /api/verify-passcode", () => {
  it("맞으면 200 {ok:true}", async () => {
    const res = await handleVerifyPasscode(post("/api/verify-passcode", { passcode: PASS }), env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("틀리거나 없으면 401", async () => {
    for (const body of [{ passcode: "틀림" }, {}, { passcode: 1 }, "not json", "null"]) {
      const res = await handleVerifyPasscode(post("/api/verify-passcode", body), env());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "PASSCODE_INVALID" });
    }
  });

  it("FAMILY_PASSCODE가 없으면 500", async () => {
    const res = await handleVerifyPasscode(post("/api/verify-passcode", { passcode: "" }), {});
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SERVER_MISCONFIGURED" });
  });

  it("AI 설정이 틀려도 암호 확인은 된다", async () => {
    const res = await handleVerifyPasscode(post("/api/verify-passcode", { passcode: PASS }), {
      FAMILY_PASSCODE: PASS,
      AI_PROVIDER: "nope",
    });
    expect(res.status).toBe(200);
  });

  it("응답에 암호가 담기지 않는다", async () => {
    const res = await handleVerifyPasscode(post("/api/verify-passcode", { passcode: "틀림" }), env());
    expect(await res.text()).not.toContain(PASS);
  });
});

describe("POST /api/candidates", () => {
  it("정상 요청 → 200 {candidates}", async () => {
    const s = setup();
    const res = await handleCandidates(post("/api/candidates", validBody()), env(), s);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.candidates.map((r: { name: string }) => r.name)).toEqual(["볶음0", "볶음1", "볶음2"]);
    expect(s.provider.calls).toHaveLength(1);
  });

  it("후보가 0개여도 200", async () => {
    const s = setup([[], []]);
    const res = await handleCandidates(post("/api/candidates", validBody()), env(), s);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ candidates: [] });
  });

  it("암호가 없거나 틀리면 401이고 AI를 부르지 않는다 (본문 형식 검사보다 먼저)", async () => {
    const bodies = [
      validBody({ passcode: "틀림" }),
      validBody({ passcode: undefined }),
      { passcode: "틀림", ingredients: "형식 틀림" },
      { ingredients: [] },
      "not json",
      "[]",
    ];
    for (const body of bodies) {
      const s = setup();
      const res = await handleCandidates(post("/api/candidates", body), env(), s);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "PASSCODE_INVALID" });
      expect(s.createProvider).not.toHaveBeenCalled();
      expect(s.provider.calls).toHaveLength(0);
    }
  });

  it("한글 암호가 통과한다", async () => {
    const s = setup();
    const res = await handleCandidates(post("/api/candidates", validBody({ passcode: "우리집암호" })), env(), s);
    expect(res.status).toBe(200);
  });

  it("암호는 맞고 본문 형식이 틀리면 400이고 AI를 부르지 않는다", async () => {
    const bad = [
      validBody({ ingredients: [] }),
      validBody({ ingredients: Array.from({ length: 31 }, (_, i) => `a${i}`) }),
      validBody({ seasonings: Array.from({ length: 31 }, (_, i) => `a${i}`) }),
      validBody({ exclusions: Array.from({ length: 31 }, (_, i) => `a${i}`) }),
      validBody({ avoidDishNames: Array.from({ length: 51 }, (_, i) => `a${i}`) }),
      validBody({ ingredients: ["가".repeat(21)] }),
      validBody({ avoidDishNames: ["가".repeat(41)] }),
      validBody({ ingredients: [" "] }),
      validBody({ servings: 0 }),
      validBody({ servings: 5 }),
      validBody({ servings: 1.5 }),
      validBody({ servings: "2" }),
      validBody({ ingredients: [1] }),
      validBody({ seasonings: [null] }),
      validBody({ exclusions: undefined }),
    ];
    for (const body of bad) {
      const s = setup();
      const res = await handleCandidates(post("/api/candidates", body), env(), s);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "BAD_REQUEST" });
      expect(s.provider.calls).toHaveLength(0);
    }
  });

  it("FAMILY_PASSCODE가 없으면 500", async () => {
    const s = setup();
    const res = await handleCandidates(post("/api/candidates", validBody()), { ANTHROPIC_API_KEY: "k" }, s);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SERVER_MISCONFIGURED" });
    expect(s.provider.calls).toHaveLength(0);
  });

  it("AI_PROVIDER가 세 값 외이거나 고른 회사의 키가 없으면 500", async () => {
    const envs: Env[] = [
      env({ AI_PROVIDER: "mistral" }),
      { FAMILY_PASSCODE: PASS },
      { FAMILY_PASSCODE: PASS, AI_PROVIDER: "google", ANTHROPIC_API_KEY: "k" },
      { FAMILY_PASSCODE: PASS, AI_PROVIDER: "openai", GEMINI_API_KEY: "k" },
    ];
    for (const e of envs) {
      const s = setup();
      const res = await handleCandidates(post("/api/candidates", validBody()), e, s);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "SERVER_MISCONFIGURED" });
      expect(s.provider.calls).toHaveLength(0);
    }
  });

  it("AI_PROVIDER·AI_MODEL 설정을 연결부에 넘긴다", async () => {
    const s = setup();
    await handleCandidates(
      post("/api/candidates", validBody()),
      { FAMILY_PASSCODE: PASS, AI_PROVIDER: "openai", OPENAI_API_KEY: "ko", AI_MODEL: "m1" },
      s,
    );
    expect(s.configs).toEqual([{ provider: "openai", model: "m1", apiKey: "ko" }]);
  });

  it("첫 AI 호출 실패 → 502 AI_FAILED (오류 내용은 숨긴다)", async () => {
    const s = setup([new Error("secret upstream detail sk-test")]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleCandidates(post("/api/candidates", validBody()), env(), s);
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "AI_FAILED" });
    expect(text).not.toContain("secret");
    errSpy.mockRestore();
  });

  it("보충만 실패하면 200", async () => {
    const s = setup([[raw({ name: "통과A" })], new Error("boom")]);
    const res = await handleCandidates(post("/api/candidates", validBody()), env(), s);
    expect(res.status).toBe(200);
    expect((await res.json()).candidates).toHaveLength(1);
  });

  it("요청 인분으로 덮어쓴다", async () => {
    const s = setup([[raw({ name: "a", servings: 1 }), raw({ name: "b", servings: 1 }), raw({ name: "c" })]]);
    const res = await handleCandidates(post("/api/candidates", validBody({ servings: 4 })), env(), s);
    const json = await res.json();
    expect(json.candidates.map((r: { servings: number }) => r.servings)).toEqual([4, 4, 4]);
  });
});
