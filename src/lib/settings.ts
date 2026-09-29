import { isBlockedName } from "./exclusion";
import { norm } from "./normalize";
import {
  DEFAULT_OWNED_SEASONINGS,
  DEFAULT_SERVINGS,
  LIST_LIMIT,
  MAX_SERVINGS,
  MIN_SERVINGS,
  NAME_MAX_LENGTH,
  PRESET_INGREDIENTS,
  PRESET_SEASONINGS,
} from "./presets";
import type { Favorite, Recipe } from "./types";

/** 이 기기에 기억하는 설정 한 덩어리 */
export type Settings = {
  version: 1;
  selectedIngredients: string[];
  customIngredients: string[];
  ownedSeasonings: string[];
  customSeasonings: string[];
  exclusions: string[];
  servings: number;
  favorites: Favorite[];
  passcode: string | null;
};

/** 태그 종류: 냉장고 재료 / 보유 양념 */
export type TagKind = "ingredient" | "seasoning";

/** 사용자에게 보여줄 결과 안내 */
export type Notice = "empty" | "tooLong" | "blocked" | "limit" | "duplicate";

export type Update = { settings: Settings; notice?: Notice };

export const NOTICE_TEXT: Record<Notice, string> = {
  empty: "이름을 입력해 주세요",
  tooLong: `${NAME_MAX_LENGTH}자까지 입력할 수 있어요`,
  blocked: "못 먹는 재료로 등록돼 있어요",
  limit: `최대 ${LIST_LIMIT}개까지예요`,
  duplicate: "이미 등록돼 있어요",
};

export function defaultSettings(): Settings {
  return {
    version: 1,
    selectedIngredients: [],
    customIngredients: [],
    ownedSeasonings: [...DEFAULT_OWNED_SEASONINGS],
    customSeasonings: [],
    exclusions: [],
    servings: DEFAULT_SERVINGS,
    favorites: [],
    passcode: null,
  };
}

// ---------- 태그 목록 ----------

const presets = (kind: TagKind) => (kind === "ingredient" ? PRESET_INGREDIENTS : PRESET_SEASONINGS);
const customKey = (kind: TagKind) => (kind === "ingredient" ? "customIngredients" : "customSeasonings");
const chosenKey = (kind: TagKind) => (kind === "ingredient" ? "selectedIngredients" : "ownedSeasonings");

/** 화면에 보일 태그 전체 (기본 + 직접 입력) */
export function allTags(s: Settings, kind: TagKind): string[] {
  return [...presets(kind), ...s[customKey(kind)]];
}

export function isCustomTag(s: Settings, kind: TagKind, name: string): boolean {
  return s[customKey(kind)].includes(name);
}

export function isChosen(s: Settings, kind: TagKind, name: string): boolean {
  return s[chosenKey(kind)].includes(name);
}

/** 제외 단어에 걸려 흐리게 보이고 선택할 수 없는 태그인가 */
export function isTagBlocked(s: Settings, name: string): boolean {
  return isBlockedName(name, s.exclusions);
}

function select(s: Settings, kind: TagKind, name: string): Update {
  const key = chosenKey(kind);
  if (s[key].includes(name)) return { settings: s };
  if (isTagBlocked(s, name)) return { settings: s, notice: "blocked" };
  if (s[key].length >= LIST_LIMIT) return { settings: s, notice: "limit" };
  return { settings: { ...s, [key]: [...s[key], name] } };
}

/** 태그 선택/체크 토글 */
export function toggleTag(s: Settings, kind: TagKind, name: string): Update {
  const key = chosenKey(kind);
  if (s[key].includes(name)) {
    return { settings: { ...s, [key]: s[key].filter((n) => n !== name) } };
  }
  return select(s, kind, name);
}

/** 직접 입력: 이미 있으면 그 태그를 선택, 새 것이면 만들고 바로 선택 */
export function addCustomTag(s: Settings, kind: TagKind, input: string): Update {
  const name = norm(input);
  if (name.length === 0) return { settings: s, notice: "empty" };
  if (Array.from(name).length > NAME_MAX_LENGTH) return { settings: s, notice: "tooLong" };
  if (allTags(s, kind).includes(name)) return select(s, kind, name);
  if (isTagBlocked(s, name)) return { settings: s, notice: "blocked" };
  if (s[chosenKey(kind)].length >= LIST_LIMIT) return { settings: s, notice: "limit" };
  const ck = customKey(kind);
  const withTag = { ...s, [ck]: [...s[ck], name] };
  return select(withTag, kind, name);
}

/** 직접 입력 태그 삭제 — 선택도 함께 풀린다. 기본 태그는 삭제 불가. */
export function removeCustomTag(s: Settings, kind: TagKind, name: string): Update {
  const ck = customKey(kind);
  if (!s[ck].includes(name)) return { settings: s };
  const key = chosenKey(kind);
  return {
    settings: { ...s, [ck]: s[ck].filter((n) => n !== name), [key]: s[key].filter((n) => n !== name) },
  };
}

// ---------- 못 먹는 재료 ----------

/** 추가하는 순간 걸리는 재료·양념 선택을 자동 해제한다 (다시 지워도 자동 재선택 없음) */
export function addExclusion(s: Settings, input: string): Update {
  const word = norm(input);
  if (word.length === 0) return { settings: s, notice: "empty" };
  if (Array.from(word).length > NAME_MAX_LENGTH) return { settings: s, notice: "tooLong" };
  if (s.exclusions.includes(word)) return { settings: s, notice: "duplicate" };
  if (s.exclusions.length >= LIST_LIMIT) return { settings: s, notice: "limit" };
  const exclusions = [...s.exclusions, word];
  const keep = (n: string) => !isBlockedName(n, exclusions);
  return {
    settings: {
      ...s,
      exclusions,
      selectedIngredients: s.selectedIngredients.filter(keep),
      ownedSeasonings: s.ownedSeasonings.filter(keep),
    },
  };
}

/** 삭제해도 자동 재선택은 하지 않는다 */
export function removeExclusion(s: Settings, word: string): Update {
  return { settings: { ...s, exclusions: s.exclusions.filter((w) => w !== word) } };
}

// ---------- 인분 ----------

export function clampServings(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SERVINGS;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
}

export function setServings(s: Settings, n: number): Update {
  return { settings: { ...s, servings: clampServings(n) } };
}

// ---------- 즐겨찾기 ----------

export function isFavorite(s: Settings, recipeId: string): boolean {
  return s.favorites.some((f) => f.recipe.id === recipeId);
}

/** 같은 레시피 id면 해제, 아니면 맨 앞(최신)에 저장 */
export function toggleFavorite(s: Settings, recipe: Recipe, servings: number, now: Date = new Date()): Update {
  if (isFavorite(s, recipe.id)) return removeFavorite(s, recipe.id);
  const fav: Favorite = { recipe, savedServings: clampServings(servings), savedAt: now.toISOString() };
  return { settings: { ...s, favorites: [fav, ...s.favorites] } };
}

export function removeFavorite(s: Settings, recipeId: string): Update {
  return { settings: { ...s, favorites: s.favorites.filter((f) => f.recipe.id !== recipeId) } };
}

// ---------- 가족 암호 ----------

export function setPasscode(s: Settings, passcode: string): Update {
  return { settings: { ...s, passcode } };
}

export function clearPasscode(s: Settings): Update {
  return { settings: { ...s, passcode: null } };
}
