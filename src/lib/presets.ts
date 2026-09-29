/** 기본 재료 태그 (spec §5.2, 조정 가능) */
export const PRESET_INGREDIENTS = [
  "대파",
  "계란",
  "스팸",
  "두부",
  "양파",
  "김치",
  "밥",
  "감자",
  "당근",
  "애호박",
  "버섯",
  "참치캔",
  "햄",
  "소시지",
  "어묵",
  "베이컨",
  "치즈",
  "떡",
  "우유",
];

/** 기본 양념 목록 (spec §5.3, 조정 가능) */
export const PRESET_SEASONINGS = [
  "소금",
  "설탕",
  "간장",
  "고추장",
  "된장",
  "고춧가루",
  "식용유",
  "참기름",
  "후추",
  "다진마늘",
  "식초",
  "굴소스",
  "맛술",
  "케첩",
  "마요네즈",
];

/** 처음 설치 시 체크된 양념 (조정 가능) */
export const DEFAULT_OWNED_SEASONINGS = ["소금", "설탕", "간장", "식용유", "후추"];

/** 선택 재료·체크 양념·못 먹는 재료 각각의 개수 한도 — 서버 한도(spec §7.2)와 같아야 함 */
export const LIST_LIMIT = 30;

/** 직접 입력 이름 최대 길이 (spec §5.2) */
export const NAME_MAX_LENGTH = 20;

export const DEFAULT_SERVINGS = 2;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 4;
