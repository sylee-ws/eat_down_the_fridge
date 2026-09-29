import { describe, expect, it } from "vitest";
import { isBlockedName, violatesExclusions } from "./exclusion";
import { norm } from "./normalize";
import { isAvailable, missingIngredients, usesSelectedIngredient } from "./pantry";
import { formatQuantity, roundAmount, scaleIngredients } from "./scaling";
import { buildShareText } from "./shareText";
import type { Conditions, Recipe, RecipeIngredient } from "./types";
import { checkStructural, filterCandidates, recheckCandidates, toRecipe } from "./validation";

const ing = (name: string, amount: number | null = 1, unit = "개"): RecipeIngredient => ({ name, amount, unit });

const recipe = (over: Partial<Recipe> = {}): Recipe => ({
  id: over.id ?? "r1",
  name: "대파 계란볶음",
  cookMinutes: 10,
  prepMinutes: 5,
  servings: 2,
  ingredients: [ing("대파"), ing("계란", 2), ing("간장", 1, "큰술")],
  steps: ["대파를 썬다", "계란을 푼다", "볶는다"],
  ...over,
});

const cond = (over: Partial<Conditions> = {}): Conditions => ({
  ingredients: ["대파", "계란"],
  seasonings: ["간장"],
  exclusions: [],
  ...over,
});

describe("norm", () => {
  it("앞뒤·내부 공백을 모두 없앤다", () => {
    expect(norm("  참치 캔 ")).toBe("참치캔");
  });
});

describe("부족 재료 계산", () => {
  it("물은 항상 가진 것", () => {
    expect(missingIngredients([ing("물", 200, "ml")], cond({ ingredients: [], seasonings: [] }))).toEqual([]);
  });

  it("보유 양념 체크를 반영한다", () => {
    const ings = [ing("간장", 1, "큰술"), ing("설탕", 1, "큰술")];
    expect(missingIngredients(ings, cond()).map((i) => i.name)).toEqual(["설탕"]);
  });

  it("밥을 선택하지 않았으면 부족 재료", () => {
    expect(missingIngredients([ing("밥", 1, "공기")], cond()).map((i) => i.name)).toEqual(["밥"]);
    expect(missingIngredients([ing("밥", 1, "공기")], cond({ ingredients: ["밥"] }))).toEqual([]);
  });

  it("순서를 유지하고 같은 이름은 첫 줄만 남긴다", () => {
    const ings = [ing("양파", 1), ing("스팸", 1), ing("양 파", 2)];
    expect(missingIngredients(ings, cond())).toEqual([ing("양파", 1), ing("스팸", 1)]);
  });

  it("이름 비교는 정규화해서 한다", () => {
    expect(isAvailable("참치 캔", cond({ ingredients: ["참치캔"] }))).toBe(true);
  });
});

describe("내 재료 사용 판정", () => {
  it("선택 재료를 하나라도 쓰면 인정", () => {
    expect(usesSelectedIngredient(recipe(), ["계란"])).toBe(true);
  });
  it("양념만 쓰면 불인정", () => {
    expect(usesSelectedIngredient(recipe({ ingredients: [ing("간장"), ing("두부")] }), ["계란"])).toBe(false);
  });
});

describe("후보 검사", () => {
  const ok = (r: Recipe, c = cond(), avoid: string[] = []) => filterCandidates([r], c, avoid).length === 1;

  it("불 사용 15분은 통과, 16분은 탈락", () => {
    expect(ok(recipe({ cookMinutes: 15 }))).toBe(true);
    expect(ok(recipe({ cookMinutes: 16 }))).toBe(false);
    expect(ok(recipe({ cookMinutes: 0 }))).toBe(true);
    expect(ok(recipe({ cookMinutes: 7.5 }))).toBe(false);
  });

  it("손질 10분은 통과, 11분은 탈락", () => {
    expect(ok(recipe({ prepMinutes: 10 }))).toBe(true);
    expect(ok(recipe({ prepMinutes: 11 }))).toBe(false);
  });

  it("조리 단계는 3~4개만", () => {
    expect(ok(recipe({ steps: ["a", "b"] }))).toBe(false);
    expect(ok(recipe({ steps: ["a", "b", "c"] }))).toBe(true);
    expect(ok(recipe({ steps: ["a", "b", "c", "d"] }))).toBe(true);
    expect(ok(recipe({ steps: ["a", "b", "c", "d", "e"] }))).toBe(false);
    expect(ok(recipe({ steps: ["a", " ", "c"] }))).toBe(false);
  });

  it("부족 재료 3개는 통과, 4개는 탈락", () => {
    const base = [ing("계란")];
    const three = recipe({ ingredients: [...base, ing("A"), ing("B"), ing("C")] });
    const four = recipe({ ingredients: [...base, ing("A"), ing("B"), ing("C"), ing("D")] });
    expect(ok(three)).toBe(true);
    expect(ok(four)).toBe(false);
  });

  it("선택 재료를 하나도 안 쓰면 탈락", () => {
    expect(ok(recipe({ ingredients: [ing("두부"), ing("간장")] }))).toBe(false);
  });

  it("피할 이름과 같으면 탈락", () => {
    expect(ok(recipe({ name: "계란말이" }), cond(), ["계란 말이"])).toBe(false);
  });

  it("요리명은 비어 있으면 안 되고 40자 이하", () => {
    expect(ok(recipe({ name: "  " }))).toBe(false);
    expect(ok(recipe({ name: "가".repeat(40) }))).toBe(true);
    expect(ok(recipe({ name: "가".repeat(41) }))).toBe(false);
  });

  it("재료 수량은 null이거나 0보다 커야 한다", () => {
    expect(ok(recipe({ ingredients: [ing("계란", null, "약간")] }))).toBe(true);
    expect(ok(recipe({ ingredients: [ing("계란", 0)] }))).toBe(false);
    expect(ok(recipe({ ingredients: [] }))).toBe(false);
  });

  it("판 안에서 요리명이 겹치면 뒤의 것을 버린다", () => {
    const out = filterCandidates([recipe({ id: "a" }), recipe({ id: "b", name: "대파 계란 볶음" })], cond(), []);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("이미 있는 후보와 겹치는 이름도 버린다", () => {
    const out = filterCandidates([recipe({ id: "b" })], cond(), [], [recipe({ id: "a" })]);
    expect(out).toEqual([]);
  });

  it("못 먹는 재료가 들어가면 탈락", () => {
    expect(ok(recipe(), cond({ exclusions: ["계란"] }))).toBe(false);
  });

  it("checkStructural은 조건과 무관하다", () => {
    expect(checkStructural(recipe({ ingredients: [ing("두부")] }), [])).toBe(true);
  });
});

describe("조건 변경 재검사", () => {
  it("선택 재료를 빼면 안 맞는 후보가 빠진다", () => {
    const a = recipe({ id: "a", ingredients: [ing("대파")] });
    const b = recipe({ id: "b", name: "계란찜", ingredients: [ing("계란")] });
    expect(recheckCandidates([a, b], cond({ ingredients: ["계란"] })).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("못 먹는 재료 매칭", () => {
  it("새우는 새우젓·새우볶음밥을 막는다", () => {
    expect(violatesExclusions({ name: "애호박볶음", ingredients: [ing("새우젓")] }, ["새우"])).toBe(true);
    expect(violatesExclusions({ name: "새우볶음밥", ingredients: [ing("밥")] }, ["새우"])).toBe(true);
    expect(violatesExclusions({ name: "계란밥", ingredients: [ing("밥")] }, ["새우"])).toBe(false);
  });

  it("태그 이름 차단도 포함 매칭, 빈 제외 단어는 무시", () => {
    expect(isBlockedName("우유", ["우 유"])).toBe(true);
    expect(isBlockedName("두부", [" "])).toBe(false);
  });
});

describe("인분 환산", () => {
  it("2→4는 두 배, 2→1은 절반", () => {
    expect(scaleIngredients([ing("대파", 1, "대")], 2, 4)[0].amount).toBe(2);
    expect(scaleIngredients([ing("계란", 3)], 2, 1)[0].amount).toBe(1.5);
  });

  it("10 미만은 0.5 단위, 10 이상은 정수", () => {
    expect(roundAmount(1.2)).toBe(1);
    expect(roundAmount(1.3)).toBe(1.5);
    expect(roundAmount(9.7)).toBe(9.5);
    expect(roundAmount(10.4)).toBe(10);
    expect(roundAmount(150.6)).toBe(151);
  });

  it("0이 되면 0.5, 인분이 같아도 반올림", () => {
    expect(roundAmount(0.1)).toBe(0.5);
    expect(scaleIngredients([ing("간장", 0.3, "큰술")], 2, 2)[0].amount).toBe(0.5);
  });

  it("null은 그대로, 원본은 안 바뀐다", () => {
    const src = [ing("후추", null, "약간"), ing("대파", 1, "대")];
    const out = scaleIngredients(src, 2, 4);
    expect(out[0]).toEqual(ing("후추", null, "약간"));
    expect(src[1].amount).toBe(1);
  });

  it("수량 표기", () => {
    expect(formatQuantity({ amount: 1.5, unit: "큰술" })).toBe("1.5큰술");
    expect(formatQuantity({ amount: null, unit: "약간" })).toBe("약간");
  });
});

describe("장바구니 문구", () => {
  it("일반 형식", () => {
    expect(buildShareText("김치볶음밥", 2, [ing("대파", 1, "대"), ing("간장", 1.5, "큰술")])).toBe(
      "🛒 장바구니 — 김치볶음밥 (2인분)\n- 대파 1대\n- 간장 1.5큰술",
    );
  });

  it("수량 null이면 단위만", () => {
    expect(buildShareText("계란찜", 1, [ing("후추", null, "약간")])).toBe("🛒 장바구니 — 계란찜 (1인분)\n- 후추 약간");
  });

  it("살 것이 없을 때", () => {
    expect(buildShareText("계란찜", 2, [])).toBe("🛒 계란찜: 살 재료 없음! 냉장고 재료로 충분해요");
  });
});

describe("toRecipe", () => {
  it("모양이 맞으면 옮기고 servings는 요청값으로 덮어쓴다", () => {
    const r = toRecipe(
      { name: " 계란찜 ", cookMinutes: 8, prepMinutes: 2, servings: 7, ingredients: [{ name: "계란", amount: 3, unit: "개" }], steps: ["a", "b", "c"] },
      "x",
      2,
    );
    expect(r?.servings).toBe(2);
    expect(r?.name).toBe("계란찜");
  });

  it("모양이 틀리면 null", () => {
    expect(toRecipe(null, "x", 2)).toBeNull();
    expect(toRecipe({ name: "a", cookMinutes: "5", prepMinutes: 1, ingredients: [], steps: [] }, "x", 2)).toBeNull();
    expect(
      toRecipe({ name: "a", cookMinutes: 5, prepMinutes: 1, ingredients: [{ name: "b", amount: "1", unit: "개" }], steps: [] }, "x", 2),
    ).toBeNull();
  });
});
