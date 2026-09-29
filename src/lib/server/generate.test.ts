import { describe, expect, it } from "vitest";
import { AiError } from "./ai/types";
import { generateCandidates } from "./generate";
import type { CandidatesRequest } from "./requestBody";
import { fakeProvider, raw } from "./testing";

const req = (over: Partial<CandidatesRequest> = {}): CandidatesRequest => ({
  ingredients: ["대파", "계란"],
  seasonings: ["간장"],
  exclusions: [],
  servings: 2,
  avoidDishNames: [],
  ...over,
});

let seq = 0;
const newId = () => `id-${++seq}`;

/** 규칙을 지키는 서로 다른 이름의 후보 n개 */
const goods = (n: number, prefix = "볶음") => Array.from({ length: n }, (_, i) => raw({ name: `${prefix}${i}` }));

describe("generateCandidates", () => {
  it("후보 6개를 요청하고 통과분을 돌려준다 (3개 이상이면 보충 없음)", async () => {
    const p = fakeProvider([goods(4)]);
    const out = await generateCandidates(req(), p, { newId });
    expect(p.calls).toHaveLength(1);
    expect(p.calls[0].count).toBe(6);
    expect(p.calls[0].servings).toBe(2);
    expect(out.map((r) => r.name)).toEqual(["볶음0", "볶음1", "볶음2", "볶음3"]);
  });

  it("각 후보에 서로 다른 id를 붙인다 (기본은 UUID)", async () => {
    const out = await generateCandidates(req(), fakeProvider([goods(3)]));
    const ids = out.map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("AI가 준 인분은 요청 인분으로 덮어쓴다", async () => {
    const out = await generateCandidates(
      req({ servings: 3 }),
      fakeProvider([[raw({ name: "a", servings: 1 }), raw({ name: "b", servings: 4 }), raw({ name: "c" })]]),
      { newId },
    );
    expect(out.map((r) => r.servings)).toEqual([3, 3, 3]);
  });

  it("규칙 위반 후보를 걸러낸다", async () => {
    const bad = [
      raw({ name: "가".repeat(41) }), // 요리명 40자 초과
      raw({ name: "오래걸림", cookMinutes: 16 }),
      raw({ name: "손질오래", prepMinutes: 11 }),
      raw({ name: "단계부족", steps: ["a", "b"] }),
      raw({ name: "선택재료없음", ingredients: [{ name: "간장", amount: 1, unit: "큰술" }] }),
      raw({
        name: "부족재료많음",
        ingredients: [
          { name: "대파", amount: 1, unit: "대" },
          { name: "a", amount: 1, unit: "개" },
          { name: "b", amount: 1, unit: "개" },
          { name: "c", amount: 1, unit: "개" },
          { name: "d", amount: 1, unit: "개" },
        ],
      }),
      raw({ name: "새우 계란볶음" }), // 제외 단어
      raw({ name: "계란말이" }), // 피할 이름
      { name: "모양 틀림" }, // 구조 불량 개별 후보
      "문자열",
    ];
    const good = goods(3, "통과");
    const p = fakeProvider([[...bad, ...good]]);
    const out = await generateCandidates(req({ exclusions: ["새우"], avoidDishNames: ["계란 말이"] }), p, { newId });
    expect(out.map((r) => r.name)).toEqual(["통과0", "통과1", "통과2"]);
    expect(p.calls).toHaveLength(1);
  });

  it("40자 요리명은 통과, 41자는 탈락", async () => {
    const out = await generateCandidates(
      req(),
      fakeProvider([[raw({ name: "가".repeat(40) }), raw({ name: "나".repeat(41) }), ...goods(2)], []]),
      { newId },
    );
    expect(out.map((r) => r.name)).toEqual(["가".repeat(40), "볶음0", "볶음1"]);
  });

  it("통과가 3개 미만이면 딱 한 번 보충하고, 피할 이름에 첫 응답의 모든 요리명을 더한다", async () => {
    const first = [raw({ name: "통과A" }), raw({ name: "탈락B", cookMinutes: 99 }), raw({ name: "탈락C", steps: [] })];
    const p = fakeProvider([first, [raw({ name: "보충D" })]]);
    const out = await generateCandidates(req({ avoidDishNames: ["계란말이"] }), p, { newId });
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1].avoidDishNames).toEqual(expect.arrayContaining(["계란말이", "통과A", "탈락B", "탈락C"]));
    expect(p.calls[1].count).toBe(6);
    // 보충 뒤에도 여전히 3개 미만이지만 추가 보충은 없다
    expect(out.map((r) => r.name)).toEqual(["통과A", "보충D"]);
  });

  it("보충분은 요리명 중복을 없애고 최대 8개까지 합친다", async () => {
    const first = [raw({ name: "통과 A" }), raw({ name: "통과B" })];
    const second = [raw({ name: "통과A" }), ...goods(10, "보충"), raw({ name: "보충 0" })];
    const out = await generateCandidates(req(), fakeProvider([first, second]), { newId });
    expect(out.map((r) => r.name)).toEqual(["통과 A", "통과B", ...goods(6, "보충").map((r) => r.name)]);
    expect(out).toHaveLength(8);
  });

  it("첫 응답만으로도 최대 8개", async () => {
    const out = await generateCandidates(req(), fakeProvider([goods(12)]), { newId });
    expect(out).toHaveLength(8);
  });

  it("보충 요청이 실패하면 첫 요청 통과분으로 응답", async () => {
    const out = await generateCandidates(req(), fakeProvider([[raw({ name: "통과A" })], new Error("boom")]), { newId });
    expect(out.map((r) => r.name)).toEqual(["통과A"]);
  });

  it("보충 응답 구조가 깨져도 첫 요청 통과분으로 응답", async () => {
    const out = await generateCandidates(req(), fakeProvider([[raw({ name: "통과A" })], new AiError("broken")]), {
      newId,
    });
    expect(out.map((r) => r.name)).toEqual(["통과A"]);
  });

  it("첫 호출 실패는 AiError", async () => {
    await expect(generateCandidates(req(), fakeProvider([new Error("boom")]), { newId })).rejects.toBeInstanceOf(AiError);
    await expect(generateCandidates(req(), fakeProvider([new AiError("broken")]), { newId })).rejects.toBeInstanceOf(
      AiError,
    );
  });

  it("첫 호출이 예산 안에 끝나지 않으면 AiError (시간 초과) 이고 신호가 중단된다", async () => {
    let aborted = false;
    const hang = (_: unknown, signal: AbortSignal) =>
      new Promise<unknown[]>(() => {
        signal.addEventListener("abort", () => (aborted = true));
      });
    await expect(generateCandidates(req(), fakeProvider([hang]), { newId, budgetMs: 30 })).rejects.toBeInstanceOf(
      AiError,
    );
    expect(aborted).toBe(true);
  });

  it("첫 호출 뒤 남은 예산이 15초 미만이면 보충을 건너뛴다", async () => {
    let clock = 0;
    const slow = async () => {
      clock += 36_000; // 50초 예산 중 36초 사용 → 14초 남음
      return [raw({ name: "통과A" })];
    };
    const p = fakeProvider([slow, goods(3)]);
    const out = await generateCandidates(req(), p, { newId, now: () => clock, startedAt: 0 });
    expect(p.calls).toHaveLength(1);
    expect(out.map((r) => r.name)).toEqual(["통과A"]);
  });

  it("남은 예산이 15초 이상이면 보충한다", async () => {
    let clock = 0;
    const slow = async () => {
      clock += 35_000; // 15초 남음
      return [raw({ name: "통과A" })];
    };
    const p = fakeProvider([slow, goods(3)]);
    await generateCandidates(req(), p, { newId, now: () => clock, startedAt: 0 });
    expect(p.calls).toHaveLength(2);
  });

  it("요청 시작 시각부터 예산을 센다", async () => {
    let clock = 10_000;
    const p = fakeProvider([
      async () => {
        clock += 26_000;
        return [raw({ name: "통과A" })];
      },
      goods(3),
    ]);
    await generateCandidates(req(), p, { newId, now: () => clock, startedAt: 0 });
    expect(p.calls).toHaveLength(1);
  });
});
