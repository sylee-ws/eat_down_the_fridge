import { describe, expect, it, vi } from "vitest";
import { raw } from "../testing";
import { createAnthropicProvider } from "./anthropic";
import { createGoogleProvider } from "./google";
import { createProvider } from "./index";
import { createOpenAIProvider } from "./openai";
import { AiError, type PromptInput } from "./types";
import { DEFAULT_MODELS } from "../config";

const input: PromptInput = {
  ingredients: ["대파", "계란"],
  seasonings: ["간장"],
  exclusions: ["새우"],
  servings: 2,
  avoidDishNames: ["계란말이"],
  count: 6,
};
const signal = new AbortController().signal;
const payload = { candidates: [raw({ name: "a" }), raw({ name: "b" })] };

describe("Anthropic 연결부", () => {
  it("강제 tool_use 응답의 input을 후보 목록으로 바꾼다", async () => {
    const call = vi.fn(async () => ({
      stop_reason: "tool_use",
      content: [{ type: "tool_use", name: "submit_candidates", input: payload }],
    }));
    const p = createAnthropicProvider({ apiKey: "k", model: "claude-x", call });
    expect(await p.generate(input, signal)).toEqual(payload.candidates);
    const [body, opts] = call.mock.calls[0] as unknown as [Record<string, unknown>, { signal: AbortSignal }];
    expect(body.model).toBe("claude-x");
    expect(body.tool_choice).toEqual({ type: "tool", name: "submit_candidates" });
    expect(JSON.stringify(body.messages)).toContain("계란말이");
    expect(opts.signal).toBe(signal);
  });

  it("깨진 응답은 AiError", async () => {
    const cases = [
      { content: [{ type: "text", text: "{}" }] },
      { content: [{ type: "tool_use", name: "submit_candidates", input: { candidates: "x" } }] },
      { content: [{ type: "tool_use", name: "submit_candidates", input: payload }], stop_reason: "max_tokens" },
      null,
      {},
    ];
    for (const res of cases) {
      const p = createAnthropicProvider({ apiKey: "k", model: "m", call: async () => res });
      await expect(p.generate(input, signal)).rejects.toBeInstanceOf(AiError);
    }
  });

  it("SDK 오류는 AiError로 감싼다", async () => {
    const p = createAnthropicProvider({
      apiKey: "k",
      model: "m",
      call: async () => {
        throw new Error("429");
      },
    });
    await expect(p.generate(input, signal)).rejects.toBeInstanceOf(AiError);
  });
});

describe("Google 연결부", () => {
  it("JSON 스키마 응답(text)을 후보 목록으로 바꾼다", async () => {
    const call = vi.fn(async () => ({ text: JSON.stringify(payload) }));
    const p = createGoogleProvider({ apiKey: "k", model: "gemini-x", call });
    expect(await p.generate(input, signal)).toEqual(payload.candidates);
    const [params] = call.mock.calls[0] as unknown as [
      { model: string; config: { responseMimeType: string; responseJsonSchema: unknown; abortSignal: AbortSignal } },
    ];
    expect(params.model).toBe("gemini-x");
    expect(params.config.responseMimeType).toBe("application/json");
    expect(params.config.responseJsonSchema).toBeTruthy();
    expect(params.config.abortSignal).toBe(signal);
  });

  it("깨진 응답은 AiError", async () => {
    for (const res of [{ text: "not json" }, { text: undefined }, { text: '{"x":1}' }, { text: "[]" }, null]) {
      const p = createGoogleProvider({ apiKey: "k", model: "m", call: async () => res });
      await expect(p.generate(input, signal)).rejects.toBeInstanceOf(AiError);
    }
  });
});

describe("OpenAI 연결부", () => {
  it("strict json_schema 응답을 후보 목록으로 바꾼다", async () => {
    const call = vi.fn(async () => ({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(payload), refusal: null } }],
    }));
    const p = createOpenAIProvider({ apiKey: "k", model: "gpt-x", call });
    expect(await p.generate(input, signal)).toEqual(payload.candidates);
    const [body, opts] = call.mock.calls[0] as unknown as [
      { model: string; response_format: { type: string; json_schema: { strict: boolean } } },
      { signal: AbortSignal },
    ];
    expect(body.model).toBe("gpt-x");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(opts.signal).toBe(signal);
  });

  it("깨진 응답·거절은 AiError", async () => {
    const cases = [
      { choices: [] },
      { choices: [{ finish_reason: "stop", message: { content: null, refusal: "no" } }] },
      { choices: [{ finish_reason: "length", message: { content: JSON.stringify(payload) } }] },
      { choices: [{ finish_reason: "stop", message: { content: "oops" } }] },
      {},
    ];
    for (const res of cases) {
      const p = createOpenAIProvider({ apiKey: "k", model: "m", call: async () => res });
      await expect(p.generate(input, signal)).rejects.toBeInstanceOf(AiError);
    }
  });
});

describe("createProvider (AI_PROVIDER 선택)", () => {
  it("설정한 회사·모델의 연결부를 만든다 (SDK 호출 없음)", () => {
    const a = createProvider({ provider: "anthropic", model: DEFAULT_MODELS.anthropic, apiKey: "k" });
    const g = createProvider({ provider: "google", model: DEFAULT_MODELS.google, apiKey: "k" });
    const o = createProvider({ provider: "openai", model: "custom", apiKey: "k" });
    expect([a.name, a.model]).toEqual(["anthropic", "claude-haiku-4-5-20251001"]);
    expect([g.name, g.model]).toEqual(["google", DEFAULT_MODELS.google]);
    expect([o.name, o.model]).toEqual(["openai", "custom"]);
  });

  it("기본 모델은 회사별 소형 모델", () => {
    expect(DEFAULT_MODELS.google).toMatch(/^gemini-.*flash/);
    expect(DEFAULT_MODELS.openai).toMatch(/^gpt-.*mini/);
  });
});
