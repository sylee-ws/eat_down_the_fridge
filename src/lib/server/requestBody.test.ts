import { describe, expect, it } from "vitest";
import { parseCandidatesRequest } from "./requestBody";

const valid = () => ({
  passcode: "우리집암호",
  ingredients: ["대파", "계란"],
  seasonings: ["간장", "소금"],
  exclusions: ["새우"],
  servings: 2,
  avoidDishNames: ["계란말이"],
});

const list = (n: number, prefix = "재료") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe("parseCandidatesRequest", () => {
  it("올바른 본문은 통과", () => {
    expect(parseCandidatesRequest(valid())).toEqual({
      ingredients: ["대파", "계란"],
      seasonings: ["간장", "소금"],
      exclusions: ["새우"],
      servings: 2,
      avoidDishNames: ["계란말이"],
    });
  });

  it("앞뒤 공백은 잘라서 넘긴다", () => {
    expect(parseCandidatesRequest({ ...valid(), ingredients: [" 대파 "] })?.ingredients).toEqual(["대파"]);
  });

  it("객체가 아니면 null", () => {
    expect(parseCandidatesRequest(null)).toBeNull();
    expect(parseCandidatesRequest([])).toBeNull();
    expect(parseCandidatesRequest("x")).toBeNull();
  });

  it("개수 제한", () => {
    expect(parseCandidatesRequest({ ...valid(), ingredients: [] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), ingredients: list(30) })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), ingredients: list(31) })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), seasonings: [] })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), seasonings: list(31) })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), exclusions: [] })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), exclusions: list(31) })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: list(50) })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: list(51) })).toBeNull();
  });

  it("필드가 없거나 배열이 아니면 null", () => {
    for (const k of ["ingredients", "seasonings", "exclusions", "avoidDishNames", "servings"] as const) {
      const b: Record<string, unknown> = valid();
      delete b[k];
      expect(parseCandidatesRequest(b)).toBeNull();
    }
    expect(parseCandidatesRequest({ ...valid(), seasonings: "간장" })).toBeNull();
  });

  it("문자열 길이: norm 후 1~20자, 요리명은 1~40자", () => {
    expect(parseCandidatesRequest({ ...valid(), ingredients: ["가".repeat(20)] })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), ingredients: ["가".repeat(21)] })).toBeNull();
    // 내부 공백은 길이에 안 센다
    expect(parseCandidatesRequest({ ...valid(), ingredients: ["가 ".repeat(20)] })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), ingredients: ["   "] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), seasonings: [""] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), exclusions: ["가".repeat(21)] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: ["가".repeat(40)] })).not.toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: ["가".repeat(41)] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: [""] })).toBeNull();
  });

  it("문자열이 아닌 항목은 null", () => {
    expect(parseCandidatesRequest({ ...valid(), ingredients: ["대파", 3] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), seasonings: [null] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), exclusions: [{}] })).toBeNull();
    expect(parseCandidatesRequest({ ...valid(), avoidDishNames: [["a"]] })).toBeNull();
  });

  it("인분은 정수 1~4", () => {
    for (const s of [1, 4]) expect(parseCandidatesRequest({ ...valid(), servings: s })).not.toBeNull();
    for (const s of [0, 5, 2.5, "2", null, NaN, Infinity]) {
      expect(parseCandidatesRequest({ ...valid(), servings: s })).toBeNull();
    }
  });
});
