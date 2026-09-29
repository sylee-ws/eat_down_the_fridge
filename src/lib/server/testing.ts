// 테스트 전용 도우미: 가짜 AI 연결부와 후보 원본 생성기 (실제 AI를 부르지 않는다)
import type { AiProvider, PromptInput } from "./ai/types";

export type RawRecipe = {
  name: string;
  cookMinutes: number;
  prepMinutes: number;
  servings: number;
  ingredients: { name: string; amount: number | null; unit: string }[];
  steps: string[];
};

/** 규칙을 모두 지키는 후보 원본 (조건: 재료 대파·계란, 양념 간장) */
export const raw = (over: Partial<RawRecipe> = {}): RawRecipe => ({
  name: "대파 계란볶음",
  cookMinutes: 10,
  prepMinutes: 5,
  servings: 2,
  ingredients: [
    { name: "대파", amount: 1, unit: "대" },
    { name: "계란", amount: 2, unit: "개" },
    { name: "간장", amount: 1, unit: "큰술" },
  ],
  steps: ["대파를 썬다", "계란을 푼다", "팬을 달군다", "볶는다"],
  ...over,
});

type Step = unknown[] | Error | ((input: PromptInput, signal: AbortSignal) => Promise<unknown[]>);

/** 정해 둔 응답을 차례로 돌려주는 가짜 연결부. 호출 기록을 남긴다. */
export function fakeProvider(steps: Step[]): AiProvider & { calls: PromptInput[] } {
  const calls: PromptInput[] = [];
  return {
    name: "anthropic",
    model: "fake-model",
    calls,
    async generate(input, signal) {
      const step = steps[calls.length];
      calls.push(input);
      if (step === undefined) throw new Error("예상하지 못한 AI 호출");
      if (step instanceof Error) throw step;
      if (typeof step === "function") return step(input, signal);
      return step;
    },
  };
}
