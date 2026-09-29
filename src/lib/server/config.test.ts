import { describe, expect, it } from "vitest";
import { DEFAULT_MODELS, readAiConfig, readPasscode } from "./config";

describe("readPasscode", () => {
  it("설정돼 있으면 그 값", () => {
    expect(readPasscode({ FAMILY_PASSCODE: "우리집암호" })).toBe("우리집암호");
  });
  it("없거나 빈 값이면 null", () => {
    expect(readPasscode({})).toBeNull();
    expect(readPasscode({ FAMILY_PASSCODE: "" })).toBeNull();
    expect(readPasscode({ FAMILY_PASSCODE: "   " })).toBeNull();
  });
});

describe("readAiConfig", () => {
  it("AI_PROVIDER가 없으면 anthropic + 기본 모델", () => {
    expect(readAiConfig({ ANTHROPIC_API_KEY: "ka" })).toEqual({
      provider: "anthropic",
      model: DEFAULT_MODELS.anthropic,
      apiKey: "ka",
    });
    expect(DEFAULT_MODELS.anthropic).toBe("claude-haiku-4-5-20251001");
  });

  it("고른 회사의 키만 쓴다", () => {
    expect(readAiConfig({ AI_PROVIDER: "google", GEMINI_API_KEY: "kg" })).toEqual({
      provider: "google",
      model: DEFAULT_MODELS.google,
      apiKey: "kg",
    });
    expect(readAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "ko" })).toEqual({
      provider: "openai",
      model: DEFAULT_MODELS.openai,
      apiKey: "ko",
    });
  });

  it("AI_MODEL이 있으면 그것을 쓴다", () => {
    expect(readAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "ko", AI_MODEL: "gpt-x" })?.model).toBe("gpt-x");
    expect(readAiConfig({ ANTHROPIC_API_KEY: "ka", AI_MODEL: "" })?.model).toBe(DEFAULT_MODELS.anthropic);
  });

  it("세 값 외의 회사는 null", () => {
    expect(readAiConfig({ AI_PROVIDER: "mistral", ANTHROPIC_API_KEY: "ka" })).toBeNull();
  });

  it("고른 회사의 키가 없으면 null (다른 회사 키가 있어도)", () => {
    expect(readAiConfig({ AI_PROVIDER: "google", ANTHROPIC_API_KEY: "ka" })).toBeNull();
    expect(readAiConfig({ OPENAI_API_KEY: "ko" })).toBeNull();
    expect(readAiConfig({ ANTHROPIC_API_KEY: "" })).toBeNull();
  });
});
