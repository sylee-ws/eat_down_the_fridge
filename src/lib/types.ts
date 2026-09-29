/** 레시피 재료 1줄 */
export type RecipeIngredient = {
  /** 짧은 일반명사. 사용자 재료/양념을 쓸 땐 사용자가 쓴 이름 그대로 */
  name: string;
  /** 수량. null = 약간/적당량(환산 불가) */
  amount: number | null;
  /** "대", "개", "g", "큰술" … amount가 null이면 "약간"/"적당량" */
  unit: string;
};

export type Recipe = {
  id: string;
  name: string;
  /** 불(가열) 사용 시간, 정수 0~15 */
  cookMinutes: number;
  /** 손질 시간, 정수 0~10 */
  prepMinutes: number;
  /** 수량의 기준 인분(1~4) */
  servings: number;
  ingredients: RecipeIngredient[];
  /** 조리 순서 4~6단계 */
  steps: string[];
};

export type Favorite = {
  recipe: Recipe;
  savedServings: number;
  /** ISO 시각 */
  savedAt: string;
};

/** 후보 검사·부족 재료 계산에 쓰는 사용자 조건 */
export type Conditions = {
  /** 선택된 냉장고 재료 */
  ingredients: string[];
  /** 체크된 보유 양념 */
  seasonings: string[];
  /** 못 먹는 재료(제외 단어) */
  exclusions: string[];
};
