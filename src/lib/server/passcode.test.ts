import { describe, expect, it } from "vitest";
import { passcodeMatches } from "./passcode";

describe("passcodeMatches (상수 시간 비교)", () => {
  it("같으면 true", () => {
    expect(passcodeMatches("abc123", "abc123")).toBe(true);
  });

  it("한글 암호도 된다", () => {
    expect(passcodeMatches("우리집암호", "우리집암호")).toBe(true);
    expect(passcodeMatches("우리집암호", "우리집암호!")).toBe(false);
  });

  it("NFD로 들어온 한글도 같은 암호로 본다", () => {
    expect(passcodeMatches("우리집".normalize("NFD"), "우리집")).toBe(true);
  });

  it("길이가 다르면 예외 없이 false", () => {
    expect(passcodeMatches("a", "abcdefgh")).toBe(false);
    expect(passcodeMatches("abcdefgh", "a")).toBe(false);
    expect(passcodeMatches("", "a")).toBe(false);
  });

  it("문자열이 아니면 false", () => {
    expect(passcodeMatches(undefined, "a")).toBe(false);
    expect(passcodeMatches(null, "a")).toBe(false);
    expect(passcodeMatches(123, "123")).toBe(false);
    expect(passcodeMatches(["a"], "a")).toBe(false);
  });

  it("정답이 비어 있으면 무엇이든 false", () => {
    expect(passcodeMatches("", "")).toBe(false);
  });
});
