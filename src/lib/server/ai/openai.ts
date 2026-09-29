import OpenAI from "openai";
import { CANDIDATES_SCHEMA, OUTPUT_NAME, buildPrompt } from "./prompt";
import { AiError, asAiError, parseJsonCandidates, type AiProvider } from "./types";

type Body = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
/** SDK 호출 한 번 — 테스트에서는 가짜로 바꿔 끼운다 */
export type OpenAICall = (body: Body, opts: { signal: AbortSignal }) => Promise<unknown>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** OpenAI: Structured Outputs (response_format json_schema, strict)로 받는다 */
export function createOpenAIProvider(opts: { apiKey: string; model: string; call?: OpenAICall }): AiProvider {
  const { apiKey, model } = opts;
  let call = opts.call;
  return {
    name: "openai",
    model,
    async generate(input, signal) {
      if (!call) {
        const client = new OpenAI({ apiKey, maxRetries: 1 });
        call = (body, o) => client.chat.completions.create(body, o);
      }
      const { system, user } = buildPrompt(input);
      let res: unknown;
      try {
        res = await call(
          {
            model,
            messages: [
              { role: "developer", content: system },
              { role: "user", content: user },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: OUTPUT_NAME,
                strict: true,
                schema: CANDIDATES_SCHEMA as unknown as Record<string, unknown>,
              },
            },
          },
          { signal },
        );
      } catch (e) {
        throw asAiError(e);
      }
      const choice = isObj(res) && Array.isArray(res.choices) ? res.choices[0] : undefined;
      if (!isObj(choice) || !isObj(choice.message)) throw new AiError("OpenAI 응답 구조 불량");
      if (choice.finish_reason !== "stop") throw new AiError("OpenAI 응답이 끝나지 않음");
      if (choice.message.refusal) throw new AiError("OpenAI 응답 거절");
      return parseJsonCandidates(choice.message.content);
    },
  };
}
