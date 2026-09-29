import { norm } from "./normalize";
import { clampServings, defaultSettings, type Settings } from "./settings";
import type { Favorite, Recipe, RecipeIngredient } from "./types";

export const STORAGE_KEY = "fridge-roulette:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 문자열 배열만 받고, 정규화 후 빈 값·중복은 버린다 */
function strings(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const n = norm(x);
    if (n.length > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

function isIngredient(v: unknown): v is RecipeIngredient {
  return (
    isObj(v) &&
    typeof v.name === "string" &&
    typeof v.unit === "string" &&
    (v.amount === null || (typeof v.amount === "number" && Number.isFinite(v.amount)))
  );
}

function isRecipe(v: unknown): v is Recipe {
  return (
    isObj(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.cookMinutes === "number" &&
    typeof v.prepMinutes === "number" &&
    typeof v.servings === "number" &&
    v.servings > 0 &&
    Array.isArray(v.ingredients) &&
    v.ingredients.every(isIngredient) &&
    Array.isArray(v.steps) &&
    v.steps.every((s) => typeof s === "string")
  );
}

function favorites(v: unknown): Favorite[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .filter((f): f is Favorite => isObj(f) && isRecipe(f.recipe) && typeof f.savedServings === "number" && typeof f.savedAt === "string")
    .map((f) => ({ ...f, savedServings: clampServings(f.savedServings) }));
}

/**
 * 저장값 해석 (spec §6.6): 없거나 JSON이 깨졌거나 버전이 다르면 기본값.
 * 일부 칸만 이상하면 그 칸만 기본값으로 둔다.
 */
export function parseSettings(raw: string | null): Settings {
  const d = defaultSettings();
  if (raw === null) return d;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return d;
  }
  if (!isObj(data) || data.version !== 1) return d;
  return {
    version: 1,
    selectedIngredients: strings(data.selectedIngredients) ?? d.selectedIngredients,
    customIngredients: strings(data.customIngredients) ?? d.customIngredients,
    ownedSeasonings: strings(data.ownedSeasonings) ?? d.ownedSeasonings,
    customSeasonings: strings(data.customSeasonings) ?? d.customSeasonings,
    exclusions: strings(data.exclusions) ?? d.exclusions,
    servings: typeof data.servings === "number" ? clampServings(data.servings) : d.servings,
    favorites: favorites(data.favorites) ?? d.favorites,
    passcode: typeof data.passcode === "string" && data.passcode.length > 0 ? data.passcode : null,
  };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** 저장소를 못 쓰는 환경이면 기본값으로 동작 */
export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  if (!storage) return defaultSettings();
  try {
    return parseSettings(storage.getItem(STORAGE_KEY));
  } catch {
    return defaultSettings();
  }
}

/** 저장 실패(용량 초과·차단)는 조용히 무시 — 앱은 계속 동작 */
export function saveSettings(s: Settings, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // 저장 없이 동작
  }
}
