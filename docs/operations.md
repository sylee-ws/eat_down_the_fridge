# 운영

## 준비물
- Node.js 20 이상, npm.
- AI 키 하나: Claude(<https://console.anthropic.com>), Gemini(<https://aistudio.google.com/apikey>), OpenAI(<https://platform.openai.com/api-keys>) 중 쓸 회사의 것.

## 처음 설치 (순서대로)

```bash
npm install
cp .env.example .env.local
```

`.env.local`을 채운 뒤(아래 설정표) 개발 서버:

```bash
npm run dev
```

<http://localhost:3000> → 가족 암호 입력 → 재료 선택 → 돌리기. `.env.local` 없이 띄우면 암호 확인이 500("문제가 생겼어요")으로 멈춘다 — 설정 누락의 정상 반응.

## 설정값 (환경 변수, 서버 전용)

| 이름 | 필수 | 뜻 · 허용 값 |
|---|---|---|
| `FAMILY_PASSCODE` | 예 | 가족 공용 암호. 한글 가능, 공백도 그대로 비교. 비면 모든 API가 500. |
| `AI_PROVIDER` | 아니오 | `anthropic` / `google` / `openai`. 비면 `anthropic`. 그 밖의 값이면 후보 요청이 500. |
| `AI_MODEL` | 아니오 | 모델 이름. 비면 회사별 기본(Anthropic `claude-haiku-4-5-20251001`, Google `gemini-3.5-flash-lite`, OpenAI `gpt-5.4-mini`). |
| `ANTHROPIC_API_KEY` | `AI_PROVIDER=anthropic`일 때 | |
| `GEMINI_API_KEY` | `AI_PROVIDER=google`일 때 | |
| `OPENAI_API_KEY` | `AI_PROVIDER=openai`일 때 | 고른 회사의 키가 비면 후보 요청이 500. 다른 회사 키는 무시. |

값의 앞뒤 공백만 있는 경우는 미설정으로 본다.

## 검증 명령

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

빌드 후 실제 서버 확인(설정 없이도 가능한 최소 확인):

```bash
npm run start
```

`GET /` → 200, `POST /api/verify-passcode`에 틀린 암호 → 401이면 정상. 실제 AI 응답 확인은 진짜 키를 넣고 화면에서 돌리기.

## 배포 (Vercel 무료 플랜)

1. 코드를 GitHub 저장소에 올린다.
2. Vercel → Add New → Project → 저장소 Import. 빌드 설정은 기본값(Next.js 자동 인식).
3. Environment Variables에 최소 `FAMILY_PASSCODE`, `AI_PROVIDER`, 고른 회사 키를 넣는다.
4. Deploy. 나온 주소를 가족에게 알린다.
- 설정값을 바꾸면 반드시 Redeploy해야 적용된다(환경 변수는 배포 시점에 읽힘).
- 후보 라우트는 최대 60초 실행으로 설정돼 있다. Vercel 요금제의 함수 최대 실행 시간이 이보다 짧으면 느린 요청이 플랫폼 시간 초과(504)로 끝나고, 화면은 "레시피를 못 가져왔어요"를 보여 준다.

## 가족 암호·AI 회사 바꾸기
- 암호: `FAMILY_PASSCODE` 변경 → Redeploy → 가족 기기는 다음 돌리기에서 암호 화면이 다시 뜬다.
- AI 회사: `AI_PROVIDER`와 그 회사 키 변경 → Redeploy. 코드 수정 불필요.

## 데이터
서버 데이터 없음. 가족 기기의 설정·즐겨찾기는 각 브라우저 저장소(`fridge-roulette:v1`)에 있고, 브라우저 사이트 데이터를 지우면 사라진다. 백업·이전 기능은 없다.
