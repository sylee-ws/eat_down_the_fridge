import { describe, expect, it } from "vitest";
import { pickUniformIndex } from "./random";

describe("pickUniformIndex", () => {
  it("항상 0 이상 n 미만", () => {
    expect(pickUniformIndex(6, () => 0)).toBe(0);
    expect(pickUniformIndex(6, () => 0.999999)).toBe(5);
    expect(pickUniformIndex(3, () => 0.5)).toBe(1);
  });

  it("잘못된 n은 거부", () => {
    expect(() => pickUniformIndex(0)).toThrow();
  });

  it("대략 균등하게 분포한다", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) counts[pickUniformIndex(4)]++;
    for (const c of counts) expect(c).toBeGreaterThan(1600);
  });
});
