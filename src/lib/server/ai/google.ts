import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { CANDIDATES_SCHEMA, buildPrompt } from "./prompt";
import { AiError, asAiError, parseJsonCandidates, type AiProvider } from "./types";

/** SDK 호출 한 번 — 테스트에서는 가짜로 바꿔 끼운다 */
export type GoogleCall = (params: GenerateContentParameters) => Promise<unknown>;

/** Google Gemini: responseMimeType JSON + responseJsonSchema로 구조화된 출력을 받는다 */
export function createGoogleProvider(opts: { apiKey: string; model: string; call?: GoogleCall }): AiProvider {
  const { apiKey, model } = opts;
  let call = opts.call;
  return {
    name: "google",
    model,
    async generate(input, signal) {
      if (!call) {
        const client = new GoogleGenAI({ apiKey });
        call = (params) => client.models.generateContent(params);
      }
      const { system, user } = buildPrompt(input);
      let res: unknown;
      try {
        res = await call({
          model,
          contents: user,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseJsonSchema: CANDIDATES_SCHEMA,
            abortSignal: signal,
          },
        });
      } catch (e) {
        throw asAiError(e);
      }
      if (typeof res !== "object" || res === null) throw new AiError("Gemini 응답 구조 불량");
      // text는 SDK 응답의 getter — 첫 후보의 텍스트 부분을 이어 붙인 JSON 문자열
      return parseJsonCandidates((res as { text?: unknown }).text);
    },
  };
}
