import { norm } from "@/lib/normalize";

/** POST /api/candidates 본문 중 암호를 뺀 나머지 (spec §7.2) */
export type CandidatesRequest = {
  ingredients: string[];
  seasonings: string[];
  exclusions: string[];
  servings: number;
  avoidDishNames: string[];
};

const MAX_NAME = 20;
const MAX_DISH_NAME = 40;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 문자열 배열 검사: 개수 min~max, 각 항목 norm 후 1~maxLen자. 통과하면 앞뒤 공백을 자른 사본 */
function strings(v: unknown, min: number, max: number, maxLen: number): string[] | null {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  const out: string[] = [];
  for (const s of v) {
    if (typeof s !== "string") return null;
    const len = Array.from(norm(s)).length;
    if (len < 1 || len > maxLen) return null;
    out.push(s.trim());
  }
  return out;
}

/** 본문 형식 검사. 틀리면 null → 400 BAD_REQUEST. (암호 확인은 이보다 먼저 한다) */
export function parseCandidatesRequest(body: unknown): CandidatesRequest | null {
  if (!isObj(body)) return null;
  const ingredients = strings(body.ingredients, 1, 30, MAX_NAME);
  const seasonings = strings(body.seasonings, 0, 30, MAX_NAME);
  const exclusions = strings(body.exclusions, 0, 30, MAX_NAME);
  const avoidDishNames = strings(body.avoidDishNames, 0, 50, MAX_DISH_NAME);
  const { servings } = body;
  if (!ingredients || !seasonings || !exclusions || !avoidDishNames) return null;
  if (typeof servings !== "number" || !Number.isInteger(servings) || servings < 1 || servings > 4) return null;
  return { ingredients, seasonings, exclusions, servings, avoidDishNames };
}
