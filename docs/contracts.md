# 외부 인터페이스 계약

소비자는 이 앱의 화면(같은 출처의 브라우저 코드)이다. 두 라우트 모두 `POST`, JSON 본문, 응답은 JSON에 `Cache-Control: no-store`.

## 공통

- 오류 응답 모양: `{ "error": "<코드>" }`.
- 오류 코드와 상태:

| 상태 | 코드 | 뜻 | 화면 반응 |
|---|---|---|---|
| 400 | `BAD_REQUEST` | 본문 형식·개수·길이 위반 | "문제가 생겼어요" |
| 401 | `PASSCODE_INVALID` | 암호 없음/틀림/본문이 JSON 아님 | 암호 화면(후보 요청이면 저장 암호 삭제) |
| 500 | `SERVER_MISCONFIGURED` | 서버 설정 누락·잘못됨 | "문제가 생겼어요" |
| 502 | `AI_FAILED` | AI 호출 실패·시간 초과·응답 구조 불량 (회사 무관) | "레시피를 못 가져왔어요. 다시 시도해 주세요" |
| 그 밖의 5xx(예: 플랫폼 504) / 네트워크 오류 | — | | 502와 같게 다시 시도 |

- 이름 길이는 공백을 모두 뺀 글자 수로 센다.

## `POST /api/verify-passcode`

- 입력: `{ "passcode": string }`
- 출력: `200 { "ok": true }`
- 오류: 401 `PASSCODE_INVALID`(틀림·문자열 아님·JSON 아님), 500 `SERVER_MISCONFIGURED`(`FAMILY_PASSCODE` 미설정일 때만 — AI 설정은 보지 않는다).

## `POST /api/candidates`

입력:
```json
{
  "passcode": "우리집암호",
  "ingredients": ["대파", "계란"],
  "seasonings": ["간장", "소금"],
  "exclusions": ["새우"],
  "servings": 2,
  "avoidDishNames": ["계란말이"]
}
```

| 필드 | 규칙 |
|---|---|
| `passcode` | 문자열. 가장 먼저 확인 |
| `ingredients` | 문자열 1~30개, 각 1~20자 |
| `seasonings` | 문자열 0~30개, 각 1~20자 |
| `exclusions` | 문자열 0~30개, 각 1~20자 |
| `servings` | 정수 1~4 |
| `avoidDishNames` | 문자열 0~50개, 각 1~40자 |

출력: `200 { "candidates": Recipe[] }` — 0~8개, 0개일 수 있음.

```ts
type Recipe = {
  id: string;            // 서버가 붙인 UUID
  name: string;          // 1~40자
  cookMinutes: number;   // 정수 0~15 (불 사용)
  prepMinutes: number;   // 정수 0~10 (손질)
  servings: number;      // 요청한 servings와 항상 같음
  ingredients: { name: string; amount: number | null; unit: string }[]; // 1개 이상, amount는 null 또는 > 0
  steps: string[];       // 3~4개
};
```

돌려주는 모든 후보는 요청 조건 기준으로: 선택 재료를 1개 이상 쓰고, 가진 것(선택 재료 ∪ 양념 ∪ 물) 밖의 재료가 3개 이하이며, 요리명·재료명에 제외 단어가 들어 있지 않고, 요리명이 `avoidDishNames`와 겹치지 않으며, 서로 요리명이 겹치지 않는다.

오류 판정 순서: 500(설정) → 401(암호) → 400(본문) → 502(AI). 암호가 틀리면 본문이 깨져 있어도 401이다.

지연: 보통 AI 호출 1회, 통과 후보가 3개 미만이면 최대 2회. 서버 쪽 전체 예산 약 50초.
