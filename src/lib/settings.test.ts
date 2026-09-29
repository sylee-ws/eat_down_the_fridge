import { describe, expect, it } from "vitest";
import { DEFAULT_OWNED_SEASONINGS, LIST_LIMIT, NAME_MAX_LENGTH, PRESET_INGREDIENTS } from "./presets";
import {
  addCustomTag,
  addExclusion,
  allTags,
  defaultSettings,
  isFavorite,
  isTagBlocked,
  removeCustomTag,
  removeExclusion,
  removeFavorite,
  setServings,
  toggleFavorite,
  toggleTag,
  type Settings,
} from "./settings";
import { loadSettings, parseSettings, saveSettings, STORAGE_KEY } from "./storage";
import type { Recipe } from "./types";

const recipe = (id: string): Recipe => ({
  id,
  name: `요리${id}`,
  cookMinutes: 5,
  prepMinutes: 3,
  servings: 2,
  ingredients: [{ name: "계란", amount: 2, unit: "개" }],
  steps: ["a", "b", "c"],
});

const base = (over: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...over });

describe("재료 태그", () => {
  it("토글로 선택/해제", () => {
    let s = toggleTag(base(), "ingredient", "대파").settings;
    expect(s.selectedIngredients).toEqual(["대파"]);
    s = toggleTag(s, "ingredient", "대파").settings;
    expect(s.selectedIngredients).toEqual([]);
  });

  it("직접 입력은 정규화되고 바로 선택된다", () => {
    const s = addCustomTag(base(), "ingredient", " 방울 토마토 ").settings;
    expect(s.customIngredients).toEqual(["방울토마토"]);
    expect(s.selectedIngredients).toEqual(["방울토마토"]);
    expect(allTags(s, "ingredient")).toContain("방울토마토");
  });

  it("빈 값은 무시, 20자 초과는 거부", () => {
    expect(addCustomTag(base(), "ingredient", "   ").notice).toBe("empty");
    expect(addCustomTag(base(), "ingredient", "가".repeat(21)).notice).toBe("tooLong");
    expect(addCustomTag(base(), "ingredient", "가".repeat(20)).notice).toBeUndefined();
  });

  it("이미 있는 태그면 새로 만들지 않고 선택한다", () => {
    const r = addCustomTag(base(), "ingredient", "대 파");
    expect(r.settings.customIngredients).toEqual([]);
    expect(r.settings.selectedIngredients).toEqual(["대파"]);
  });

  it("직접 입력 태그 삭제 시 선택도 풀리고, 기본 태그는 삭제 불가", () => {
    let s = addCustomTag(base(), "ingredient", "고구마").settings;
    s = removeCustomTag(s, "ingredient", "고구마").settings;
    expect(s.customIngredients).toEqual([]);
    expect(s.selectedIngredients).toEqual([]);
    const withPreset = toggleTag(base(), "ingredient", "대파").settings;
    expect(removeCustomTag(withPreset, "ingredient", "대파").settings).toBe(withPreset);
  });

  it("선택은 최대 30개", () => {
    const full = base({ selectedIngredients: Array.from({ length: LIST_LIMIT }, (_, i) => `재료${i}`) });
    expect(toggleTag(full, "ingredient", "대파").notice).toBe("limit");
    expect(addCustomTag(full, "ingredient", "새재료").notice).toBe("limit");
    expect(addCustomTag(full, "ingredient", "새재료").settings.customIngredients).toEqual([]);
  });
});

describe("보유 양념", () => {
  it("처음엔 기본 양념이 체크돼 있다", () => {
    expect(defaultSettings().ownedSeasonings).toEqual(DEFAULT_OWNED_SEASONINGS);
  });

  it("직접 추가한 양념은 바로 체크된다", () => {
    const s = addCustomTag(base(), "seasoning", "들기름").settings;
    expect(s.customSeasonings).toEqual(["들기름"]);
    expect(s.ownedSeasonings).toContain("들기름");
  });
});

describe("못 먹는 재료", () => {
  it("추가하는 순간 걸리는 재료·양념 선택이 풀린다", () => {
    const s0 = base({ selectedIngredients: ["우유", "계란"], ownedSeasonings: ["소금", "우유버터"] });
    const s = addExclusion(s0, "우유").settings;
    expect(s.selectedIngredients).toEqual(["계란"]);
    expect(s.ownedSeasonings).toEqual(["소금"]);
    expect(isTagBlocked(s, "우유")).toBe(true);
  });

  it("막힌 태그는 선택할 수 없다", () => {
    const s = addExclusion(base(), "새우").settings;
    expect(toggleTag(s, "ingredient", "새우젓").notice).toBe("blocked");
    expect(addCustomTag(s, "ingredient", "칵테일새우").notice).toBe("blocked");
  });

  it("삭제해도 자동 재선택은 없다", () => {
    let s = addExclusion(base({ selectedIngredients: ["우유"] }), "우유").settings;
    s = removeExclusion(s, "우유").settings;
    expect(s.exclusions).toEqual([]);
    expect(s.selectedIngredients).toEqual([]);
    expect(isTagBlocked(s, "우유")).toBe(false);
  });

  it("빈 값·중복·30개 한도", () => {
    expect(addExclusion(base(), " ").notice).toBe("empty");
    expect(addExclusion(base({ exclusions: ["새우"] }), "새 우").notice).toBe("duplicate");
    const full = base({ exclusions: Array.from({ length: LIST_LIMIT }, (_, i) => `x${i}`) });
    expect(addExclusion(full, "땅콩").notice).toBe("limit");
  });
});

describe("인분", () => {
  it("1~4로 제한", () => {
    expect(setServings(base(), 7).settings.servings).toBe(4);
    expect(setServings(base(), 0).settings.servings).toBe(1);
    expect(setServings(base(), 3).settings.servings).toBe(3);
  });
});

describe("즐겨찾기", () => {
  it("같은 id면 토글, 최신이 맨 앞", () => {
    const now = new Date("2026-09-29T00:00:00Z");
    let s = toggleFavorite(base(), recipe("a"), 2, now).settings;
    s = toggleFavorite(s, recipe("b"), 3, now).settings;
    expect(s.favorites.map((f) => f.recipe.id)).toEqual(["b", "a"]);
    expect(s.favorites[0].savedServings).toBe(3);
    expect(s.favorites[0].savedAt).toBe(now.toISOString());
    s = toggleFavorite(s, recipe("a"), 2).settings;
    expect(isFavorite(s, "a")).toBe(false);
    s = removeFavorite(s, "b").settings;
    expect(s.favorites).toEqual([]);
  });
});

describe("기기 저장", () => {
  it("없거나 깨진 저장값은 기본값", () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings("{not json")).toEqual(defaultSettings());
    expect(parseSettings(JSON.stringify({ version: 99 }))).toEqual(defaultSettings());
    expect(parseSettings("[]")).toEqual(defaultSettings());
  });

  it("일부 칸이 이상하면 그 칸만 기본값", () => {
    const s = parseSettings(JSON.stringify({ version: 1, selectedIngredients: ["대파", 3, " 계 란 "], servings: "x", favorites: [{ bad: true }] }));
    expect(s.selectedIngredients).toEqual(["대파", "계란"]);
    expect(s.servings).toBe(2);
    expect(s.favorites).toEqual([]);
    expect(s.ownedSeasonings).toEqual(DEFAULT_OWNED_SEASONINGS);
  });

  it("한도를 넘는 저장값은 앞에서부터 30개만, 20자 넘는 이름은 버린다", () => {
    const many = Array.from({ length: 40 }, (_, i) => `재료${i}`);
    const long = "가".repeat(NAME_MAX_LENGTH + 1);
    const ok = "나".repeat(NAME_MAX_LENGTH);
    const s = parseSettings(
      JSON.stringify({
        version: 1,
        selectedIngredients: [long, ...many],
        customIngredients: [long, ok],
        ownedSeasonings: many,
        customSeasonings: [long],
        exclusions: [ok, long, ...many],
      }),
    );
    expect(s.selectedIngredients).toEqual(many.slice(0, LIST_LIMIT));
    expect(s.ownedSeasonings).toEqual(many.slice(0, LIST_LIMIT));
    expect(s.exclusions).toEqual([ok, ...many.slice(0, LIST_LIMIT - 1)]);
    expect(s.customIngredients).toEqual([ok]);
    expect(s.customSeasonings).toEqual([]);
  });

  it("이름 길이는 공백을 지운 뒤 글자 수로 센다", () => {
    const spaced = " " + "가 ".repeat(NAME_MAX_LENGTH);
    const s = parseSettings(JSON.stringify({ version: 1, selectedIngredients: [spaced] }));
    expect(s.selectedIngredients).toEqual(["가".repeat(NAME_MAX_LENGTH)]);
  });

  it("저장했다 불러오면 그대로", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s = base({ selectedIngredients: ["대파"], passcode: "우리집", favorites: [{ recipe: recipe("a"), savedServings: 2, savedAt: "t" }] });
    saveSettings(s, storage);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    expect(loadSettings(storage)).toEqual(s);
  });

  it("저장소를 못 쓰면 기본값으로 동작하고 저장 실패는 무시", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(loadSettings(broken)).toEqual(defaultSettings());
    expect(() => saveSettings(base(), broken)).not.toThrow();
    expect(loadSettings(null)).toEqual(defaultSettings());
  });

  it("기본 재료 태그 목록에 입력 예시 5개가 들어 있다", () => {
    for (const n of ["대파", "계란", "스팸", "두부", "양파", "밥"]) expect(PRESET_INGREDIENTS).toContain(n);
  });
});
