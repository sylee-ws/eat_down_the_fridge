import { describe, expect, it } from "vitest";
import { avoidNames, emptyBoard, landedWinner, markShown, newBoard, nextAction, recheck, remaining, AVOID_LIMIT } from "./board";
import type { Conditions, Recipe } from "./types";

function recipe(id: string, name: string, ingNames: string[] = ["계란"]): Recipe {
  return {
    id,
    name,
    cookMinutes: 5,
    prepMinutes: 5,
    servings: 2,
    ingredients: ingNames.map((n) => ({ name: n, amount: 1, unit: "개" })),
    steps: ["a", "b", "c", "d"],
  };
}

const cond: Conditions = { ingredients: ["계란", "대파"], seasonings: ["소금"], exclusions: [] };

describe("board", () => {
  it("빈 판은 empty, 새 후보 받기 제안", () => {
    const b = emptyBoard();
    expect(remaining(b)).toEqual([]);
    expect(nextAction(b)).toEqual({ kind: "empty", suggestNew: true });
  });

  it("후보 2개 이상이면 spin, 제안 없음", () => {
    const b = newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "계란말이"), recipe("3", "파전")]);
    expect(nextAction(b)).toEqual({ kind: "spin", suggestNew: false });
  });

  it("나온 후보는 남은 후보에서 빠진다", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "계란말이"), recipe("3", "파전")]);
    b = markShown(b, "2");
    expect(remaining(b).map((r) => r.id)).toEqual(["1", "3"]);
    expect(b.candidates).toHaveLength(3);
  });

  it("남은 게 1개면 direct + 새 후보 제안, 0개면 empty", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "계란말이")]);
    b = markShown(b, "1");
    expect(nextAction(b)).toEqual({ kind: "direct", suggestNew: true });
    b = markShown(b, "2");
    expect(nextAction(b)).toEqual({ kind: "empty", suggestNew: true });
  });

  it("같은 id를 두 번 표시해도 한 번만", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "계란찜")]);
    b = markShown(markShown(b, "1"), "1");
    expect(b.shownIds).toEqual(["1"]);
  });

  it("재검사: 선택 해제된 재료만 쓰는 후보를 뺀다", () => {
    const b = newBoard(emptyBoard(), [recipe("1", "계란찜", ["계란"]), recipe("2", "파전", ["대파"])]);
    const r = recheck(b, { ...cond, ingredients: ["계란"] });
    expect(remaining(r).map((x) => x.id)).toEqual(["1"]);
    expect(nextAction(r)).toEqual({ kind: "direct", suggestNew: true });
  });

  it("재검사: 새 제외 단어에 걸리는 후보를 뺀다", () => {
    const b = newBoard(emptyBoard(), [recipe("1", "계란찜", ["계란"]), recipe("2", "계란파전", ["계란", "대파"])]);
    const r = recheck(b, { ...cond, exclusions: ["파"] });
    expect(remaining(r).map((x) => x.id)).toEqual(["1"]);
  });

  it("재검사: 부족 재료가 3개를 넘게 된 후보를 뺀다", () => {
    const b = newBoard(emptyBoard(), [
      recipe("1", "계란찜", ["계란"]),
      recipe("2", "잡채", ["계란", "소금", "당면", "시금치", "당근"]),
    ]);
    // 소금이 있으면 부족 3개(통과), 소금을 빼면 4개(탈락)
    expect(remaining(recheck(b, cond)).map((x) => x.id)).toEqual(["1", "2"]);
    const r = recheck(b, { ...cond, seasonings: [] });
    expect(remaining(r).map((x) => x.id)).toEqual(["1"]);
  });

  it("재검사는 이미 나온 후보를 건드리지 않는다", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "파전", ["대파"]), recipe("2", "계란찜", ["계란"])]);
    b = markShown(b, "1");
    const r = recheck(b, { ...cond, ingredients: ["계란"] });
    expect(r.candidates.map((x) => x.id)).toEqual(["1", "2"]);
    expect(r.shownIds).toEqual(["1"]);
  });

  it("새 판은 이전 판을 대체하지만 기록은 계속 쌓인다", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "파전")]);
    b = markShown(b, "1");
    b = newBoard(b, [recipe("3", "계란말이"), recipe("4", "계란국")]);
    expect(b.candidates.map((x) => x.id)).toEqual(["3", "4"]);
    expect(b.shownIds).toEqual([]);
    expect(b.history).toEqual(["계란찜", "파전", "계란말이", "계란국"]);
    expect(avoidNames(b)).toEqual(["계란찜", "파전", "계란말이", "계란국"]);
  });

  it("기록은 중복 없이, 다시 오르면 가장 최근으로 옮긴다", () => {
    let b = newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "파전")]);
    b = newBoard(b, [recipe("3", "계란 찜")]);
    expect(b.history).toEqual(["파전", "계란 찜"]);
  });

  it("피할 이름은 최근 50개만", () => {
    let b = emptyBoard();
    for (let i = 0; i < 60; i++) b = newBoard(b, [recipe(String(i), `요리${i}`)]);
    const avoid = avoidNames(b);
    expect(AVOID_LIMIT).toBe(50);
    expect(avoid).toHaveLength(50);
    expect(avoid[0]).toBe("요리10");
    expect(avoid[49]).toBe("요리59");
    expect(new Set(avoid).size).toBe(50);
  });

  it("멈춘 당첨이 지금 판에 남아 있으면 그 후보", () => {
    const b = newBoard(emptyBoard(), [recipe("1", "계란찜", ["계란"]), recipe("2", "파전", ["대파"])]);
    expect(landedWinner(b, "2")?.name).toBe("파전");
  });

  it("회전 중 재검사로 빠진 당첨은 결과로 쓰지 않는다", () => {
    const b = newBoard(emptyBoard(), [recipe("1", "계란찜", ["계란"]), recipe("2", "새우파전", ["대파", "새우"])]);
    const r = recheck(b, { ...cond, exclusions: ["새우"] });
    expect(landedWinner(r, "2")).toBeNull();
    expect(nextAction(r).kind).toBe("direct");
  });

  it("이미 나온 후보나 판에 없는 id도 결과로 쓰지 않는다", () => {
    const b = markShown(newBoard(emptyBoard(), [recipe("1", "계란찜"), recipe("2", "계란말이")]), "1");
    expect(landedWinner(b, "1")).toBeNull();
    expect(landedWinner(b, "x")).toBeNull();
  });
});
