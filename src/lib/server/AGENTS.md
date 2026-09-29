# src/lib/server — 서버 전용 (설정·암호·AI·후보 생성)

## 맡는 것
- 환경 변수 해석(`config.ts`: 가족 암호, AI 회사·모델·키, 회사별 기본 모델).
- 암호 비교(`passcode.ts`), 본문 검사(`requestBody.ts`), 라우트 로직(`handlers.ts`).
- 후보 생성 흐름(`generate.ts`: 호출 → Recipe로 옮기기 → 검사 → 1회 보충 → 예산).
- AI 회사 연결부(`ai/`: 공통 모양 `types.ts`, 프롬프트·스키마 `prompt.ts`, `anthropic.ts`·`google.ts`·`openai.ts`, 선택 `index.ts`), 테스트용 가짜(`testing.ts`).

## 맡지 않는 것
- 후보 규칙 자체 — `src/lib/validation.ts`를 가져다 쓴다. 여기서 규칙을 다시 만들거나 완화하지 않는다.
- 라우트 파일(`src/app/api/**/route.ts`)은 `process.env`를 넘기기만 한다. 화면 코드(`src/components`)는 이 폴더를 가져오지 않는다.

## 불변 조건
- `handleCandidates` 순서: 설정 확인(암호 미설정·모르는 회사·고른 회사 키 없음 → 500) → 암호(401) → 본문(400) → AI(실패 502). 암호 확인 전에 본문 검사나 AI 호출을 하지 않는다.
- `handleVerifyPasscode`는 `FAMILY_PASSCODE`만 본다(AI 설정 오류로 500을 내지 않는다).
- 암호 비교는 NFC → UTF-8 → SHA-256 → `timingSafeEqual`. 입력이 문자열이 아니거나 정답이 비면 false. 공백을 자르지 않는다.
- 로그는 AI 실패 한 줄뿐, 키·암호 문자열은 `[redacted]`. 응답은 `{error}` 코드만, AI 원본 오류를 응답에 넣지 않는다.
- 모든 연결부는 `generate(input, signal) → 원본 후보 배열`만 구현하고 실패는 `AiError`로 던진다. 구조화 출력(`{candidates:[...]}`)이 아니면 `AiError`.
- 후보 id는 서버가 `randomUUID`로, 인분은 요청값으로 덮어쓴다.
- 보충: 첫 통과 < 3이고 남은 예산 ≥ 15초일 때만, 딱 1회. 피할 이름 = 요청의 피할 이름 + 첫 응답의 모든 요리명. 보충 실패는 첫 통과분으로 200. 최대 8개.

## 구현 방식
- 외부 의존(SDK 호출, 시계, id 생성, 회사 선택)은 모두 인자로 주입 가능하게 둔다 — 테스트가 실제 네트워크 없이 돌아야 한다.
- 새 회사 추가: `ai/<회사>.ts`에 연결부 → `config.ts`의 `PROVIDERS`·`KEY_ENV`·`DEFAULT_MODELS` → `ai/index.ts` 선택 → `.env.example`·README. 스키마 `CANDIDATES_SCHEMA`는 세 회사 공용이며 모든 속성 required(OpenAI strict).

## 테스트
- `handlers.test.ts`: 순서(암호 틀림이면 본문이 깨져도 401, AI 호출 0회), 한글 암호, 설정 오류 500, 본문 한도 각각 400, 502.
- `contract.test.ts`: 화면 `requestCandidates`가 실제로 보내는 본문을 `handleCandidates`에 그대로 넣어 200·후보 모양 확인, 화면 한도를 꽉 채운 본문도 통과, 한도 +1이면 400. 본문 한도는 `src/lib/presets.ts`·`validation.ts` 상수를 가져다 쓴다(숫자를 따로 적지 않는다).
- `generate.test.ts`: 규칙 위반 제거, 보충 정확히 1회와 피할 이름 구성, 합치기 중복 제거·8개 상한, 보충 실패 → 첫 통과분, 예산 15초 경계(15초 정확히면 보충 함), 시간 초과 시 중단.
- `ai/providers.test.ts`: 회사별 가짜 SDK 응답 → 후보 배열, 깨진 응답·거부·잘림·SDK 오류 → `AiError`, 회사·모델 선택.
