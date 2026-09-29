// 화면이 실제로 보내는 본문을 서버 핸들러가 그대로 받아들이는지 끝에서 끝까지 확인
import { describe, expect, it } from "vitest";
import { requestCandidates, type CandidatesBody } from "@/lib/api";
import { AVOID_LIMIT, LIST_LIMIT, MAX_SERVINGS, NAME_MAX_LENGTH } from "@/lib/presets";
import { MAX_DISH_NAME_LENGTH } from "@/lib/validation";
import { handleCandidates, type Env } from "./handlers";
import { fakeProvider, raw } from "./testing";

const PASS = "우리집암호";
const env: Env = { FAMILY_PASSCODE: PASS, ANTHROPIC_API_KEY: "sk-test" };

/** requestCandidates가 보내는 요청을 가로채 Request로 만들고 핸들러에 넘긴다 */
async function roundTrip(body: CandidatesBody, steps: Parameters<typeof fakeProvider>[0]) {
  const provider = fakeProvider(steps);
  const sent: { url: string; init?: RequestInit }[] = [];
  const statuses: number[] = [];
  const outcome = await requestCandidates(body, async (url, init) => {
    sent.push({ url, init });
    const req = new Request(`http://localhost${url}`, init);
    const res = await handleCandidates(req, env, { createProvider: () => provider });
    statuses.push(res.status);
    return res;
  });
  return { outcome, sent, statuses, provider };
}

const name = (prefix: string, i: number, len: number) => {
  const head = `${prefix}${i}`;
  return head + "가".repeat(len - Array.from(head).length);
};

describe("화면 요청 → 서버 핸들러 계약", () => {
  it("화면이 보내는 본문 그대로 200 + 후보 모양", async () => {
    const body: CandidatesBody = {
      passcode: PASS,
      ingredients: ["대파", "계란"],
      seasonings: ["간장"],
      exclusions: ["새우"],
      servings: 2,
      avoidDishNames: ["계란말이"],
    };
    const goods = [raw({ name: "볶음0" }), raw({ name: "볶음1" }), raw({ name: "볶음2" })];
    const { outcome, sent, statuses, provider } = await roundTrip(body, [goods]);

    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("/api/candidates");
    expect(sent[0].init?.method).toBe("POST");
    expect(JSON.parse(String(sent[0].init?.body))).toEqual(body);
    expect(statuses).toEqual([200]);
    expect(provider.calls).toHaveLength(1);

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;
    expect(outcome.candidates.map((r) => r.name)).toEqual(["볶음0", "볶음1", "볶음2"]);
    for (const r of outcome.candidates) {
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.servings).toBe(2);
      expect(typeof r.cookMinutes).toBe("number");
      expect(typeof r.prepMinutes).toBe("number");
      expect(Array.isArray(r.steps)).toBe(true);
      for (const ing of r.ingredients) {
        expect(typeof ing.name).toBe("string");
        expect(typeof ing.unit).toBe("string");
        expect(ing.amount === null || typeof ing.amount === "number").toBe(true);
      }
    }
  });

  it("화면 한도를 꽉 채운 본문도 400이 아니다", async () => {
    const ingredients = Array.from({ length: LIST_LIMIT }, (_, i) => name("재료", i, NAME_MAX_LENGTH));
    ingredients[0] = "대파";
    ingredients[1] = "계란";
    const body: CandidatesBody = {
      passcode: PASS,
      ingredients,
      seasonings: Array.from({ length: LIST_LIMIT }, (_, i) => name("양념", i, NAME_MAX_LENGTH)),
      exclusions: Array.from({ length: LIST_LIMIT }, (_, i) => name("제외", i, NAME_MAX_LENGTH)),
      servings: MAX_SERVINGS,
      avoidDishNames: Array.from({ length: AVOID_LIMIT }, (_, i) => name("요리", i, MAX_DISH_NAME_LENGTH)),
    };
    const goods = [raw({ name: "볶음0" }), raw({ name: "볶음1" }), raw({ name: "볶음2" })];
    const { outcome, statuses, provider } = await roundTrip(body, [goods]);

    expect(statuses).toEqual([200]);
    expect(provider.calls).toHaveLength(1);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") expect(outcome.candidates.every((r) => r.servings === MAX_SERVINGS)).toBe(true);
  });

  it("한도를 하나 넘기면 400 → 화면은 problem", async () => {
    const body: CandidatesBody = {
      passcode: PASS,
      ingredients: Array.from({ length: LIST_LIMIT + 1 }, (_, i) => `재료${i}`),
      seasonings: [],
      exclusions: [],
      servings: 2,
      avoidDishNames: [],
    };
    const { outcome, statuses, provider } = await roundTrip(body, []);
    expect(statuses).toEqual([400]);
    expect(provider.calls).toHaveLength(0);
    expect(outcome).toEqual({ kind: "problem" });
  });
});
