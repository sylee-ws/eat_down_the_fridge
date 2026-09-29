# 시스템 구성

## 구성 요소와 연결

```
[폰 브라우저]
  ├─ 화면 (src/components, 클라이언트 컴포넌트)
  │    ├─ 기기 저장소(localStorage "fridge-roulette:v1") ←→ 설정 상태(src/lib/settings, storage)
  │    ├─ 도메인 규칙(src/lib: pantry, validation, exclusion, scaling, shareText, board)
  │    └─ fetch POST ──────────────┐
  │                                 ▼
[Vercel 서버 함수 (Node 런타임)]
  ├─ /api/verify-passcode  → src/lib/server/handlers.handleVerifyPasscode
  └─ /api/candidates       → src/lib/server/handlers.handleCandidates
          │  설정(config) → 암호(passcode) → 본문 검사(requestBody) → 생성(generate)
          ▼
     AI 회사 연결부 (AiProvider 하나의 모양)
       ├─ anthropic (Claude, 강제 도구 호출로 구조화 출력)
       ├─ google    (Gemini, JSON 응답 스키마)
       └─ openai    (GPT, json_schema strict)
```

| 구성 요소 | 역할 | 의존 방향 |
|---|---|---|
| `src/app/page.tsx`, `layout.tsx` | 한 페이지 진입점, `FridgeApp` 렌더 | → components |
| `src/app/api/*/route.ts` | 서버 라우트. `process.env`를 핸들러에 넘기기만 함 (`runtime = "nodejs"`, 후보 라우트 `maxDuration = 60`) | → lib/server |
| `src/components` | 화면 흐름 전체(암호 화면, 태그, 룰렛, 결과 카드, 즐겨찾기) | → lib (server 제외) |
| `src/lib` (server 제외) | 순수 도메인 규칙·설정 상태·API 호출 래퍼. 화면과 서버가 같이 씀 | → 없음 (types만) |
| `src/lib/server` | 환경 변수, 암호 비교, 본문 검사, 프롬프트·스키마, 회사별 연결부, 후보 생성 | → lib(validation, types), AI SDK |

서버는 상태가 없다. 요청마다 환경 변수를 읽고, 사용자 데이터를 저장하지 않는다. 기기끼리 공유하는 상태도 없으므로 동시성 설계는 해당 없음.

## 대표 흐름: "돌리기"

1. 화면이 기기 설정에서 선택 재료·보유 양념·못 먹는 재료·인분·저장된 암호, 후보판 기록에서 피할 이름(최근 50개)을 모아 `POST /api/candidates`로 보낸다.
2. 서버: 설정 확인(없으면 500) → 암호 상수 시간 비교(틀리면 401) → 본문 개수·길이 검사(틀리면 400).
3. 설정된 회사 연결부에 후보 6개를 구조화 출력으로 요청(요청 전체 예산 50초 안에서 시간 초과 시 중단).
4. 응답 각 항목을 `Recipe` 모양으로 옮기며 id(UUID)를 붙이고 인분을 요청값으로 덮어쓴 뒤, 도메인 후보 검사(`filterCandidates`)로 걸러낸다.
5. 통과가 3개 미만이고 남은 예산이 15초 이상이면, 첫 응답의 요리명을 피할 이름에 더해 딱 한 번 더 요청하고 통과분을 합친다(이름 중복 제거, 최대 8개). 보충 실패는 무시.
6. `200 {candidates}` → 화면이 새 후보판을 만들고 현재 조건으로 한 번 더 재검사 → 남은 후보 2개 이상이면 균등 추첨 후 룰렛 회전, 1개면 바로 결과, 0개면 "못 찾았어요".
7. 결과 카드는 표시 인분으로 환산한 재료와, 현재 가진 것 기준 부족 재료로 장바구니 문구를 만든다.

## 경계

- 브라우저 → 서버로 넘어가는 것: 사용자가 입력한 가족 암호, 재료·양념·제외 단어, 인분, 피할 요리명. 그 밖의 기기 설정(즐겨찾기 등)은 서버로 가지 않는다.
- 서버 → 브라우저로 나오는 것: 후보 목록(`Recipe[]`) 또는 `{error}` 코드뿐. AI 회사 이름·모델·원본 오류는 서버 로그에만 남는다.
- 서버 → AI 회사로 나가는 것: 재료·양념·제외 단어·피할 이름·인분(프롬프트). 암호는 나가지 않는다.
- 외부 의존: 설정된 AI 회사 API 하나(Anthropic / Google Gemini / OpenAI), Vercel 서버 함수. 공유는 기기 기본 공유창(`navigator.share`), 카카오 SDK는 쓰지 않는다.
