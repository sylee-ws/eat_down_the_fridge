import Anthropic from "@anthropic-ai/sdk";
import { CANDIDATES_SCHEMA, OUTPUT_NAME, buildPrompt } from "./prompt";
import { AiError, asAiError, extractCandidates, type AiProvider } from "./types";

type Body = Anthropic.MessageCreateParamsNonStreaming;
/** SDK 호출 한 번 — 테스트에서는 가짜로 바꿔 끼운다 */
export type AnthropicCall = (body: Body, opts: { signal: AbortSignal }) => Promise<unknown>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Anthropic: 강제 tool_choice + input_schema로 구조화된 출력을 받는다 */
export function createAnthropicProvider(opts: { apiKey: string; model: string; call?: AnthropicCall }): AiProvider {
  const { apiKey, model } = opts;
  let call = opts.call;
  return {
    name: "anthropic",
    model,
    async generate(input, signal) {
      if (!call) {
        const client = new Anthropic({ apiKey, maxRetries: 1 });
        call = (body, o) => client.messages.create(body, o);
      }
      const { system, user } = buildPrompt(input);
      let res: unknown;
      try {
        res = await call(
          {
            model,
            max_tokens: 8192,
            system,
            messages: [{ role: "user", content: user }],
            tools: [
              {
                name: OUTPUT_NAME,
                description: "요리 후보 목록을 제출한다",
                input_schema: CANDIDATES_SCHEMA as unknown as Anthropic.Tool.InputSchema,
              },
            ],
            tool_choice: { type: "tool", name: OUTPUT_NAME },
          },
          { signal },
        );
      } catch (e) {
        throw asAiError(e);
      }
      if (!isObj(res) || !Array.isArray(res.content)) throw new AiError("Anthropic 응답 구조 불량");
      if (res.stop_reason === "max_tokens") throw new AiError("Anthropic 응답이 잘림");
      const block = res.content.find((b: unknown) => isObj(b) && b.type === "tool_use" && b.name === OUTPUT_NAME);
      if (!isObj(block)) throw new AiError("Anthropic tool_use 없음");
      return extractCandidates(block.input);
    },
  };
}
