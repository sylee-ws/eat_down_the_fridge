# 냉장고 파먹기 룰렛

냉장고에 남은 재료를 고르면 AI가 **불 쓰는 시간 15분 이내** 집밥 후보를 여러 개 만들고, 원형 룰렛이 그중 하나를 뽑아 줍니다. 뽑힌 레시피에서 **새로 사야 할 재료만** 장바구니 문구로 만들어, 폰 공유창(→ 카카오톡 나와의 채팅)이나 복사로 보낼 수 있어요.

나와 가족이 쓰는 앱이에요. 주소를 아는 사람도 **가족 암호**를 알아야 AI를 쓸 수 있어요.

---

## 1. 준비물

| 무엇 | 어디서 |
|---|---|
| AI 키 하나 (셋 중 아무거나) | Claude: <https://console.anthropic.com> · Gemini: <https://aistudio.google.com/apikey> · OpenAI: <https://platform.openai.com/api-keys> |
| GitHub 계정 | <https://github.com> (코드를 올려 둘 곳) |
| Vercel 계정 | <https://vercel.com> (무료 플랜, GitHub 계정으로 가입하면 편해요) |

AI 사용료는 고른 회사의 키 주인에게 청구돼요. 가족끼리 쓰는 정도면 아주 적게 나와요.

## 2. 설정값 (환경 변수)

| 이름 | 뜻 | 예시 |
|---|---|---|
| `FAMILY_PASSCODE` | **필수.** 가족 공용 암호. 한글도 돼요. 틀린 암호를 여러 번 넣어도 막지 않으니, 남이 짐작하기 어려운 문장으로 정하세요. | `우리집냉장고는언제나배고파` |
| `AI_PROVIDER` | 쓸 AI 회사. `anthropic` / `google` / `openai` 중 하나. 비우면 `anthropic`. | `google` |
| `AI_MODEL` | 모델 이름. 비우면 회사별 기본(빠르고 저렴한) 모델. | (비워 두기) |
| `ANTHROPIC_API_KEY` | Claude 키 (`AI_PROVIDER=anthropic`일 때) | |
| `GEMINI_API_KEY` | Gemini 키 (`AI_PROVIDER=google`일 때) | |
| `OPENAI_API_KEY` | OpenAI 키 (`AI_PROVIDER=openai`일 때) | |

**고른 회사의 키 하나만** 넣으면 돼요. 암호가 없거나, 회사 이름이 틀렸거나, 고른 회사 키가 없으면 앱이 "문제가 생겼어요"라고 멈춰요(잘못된 설정으로 몰래 돌아가지 않게).

## 3. 인터넷에 올리기 (Vercel)

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Vercel에서 **Add New → Project** → 그 저장소를 **Import**.
3. **Environment Variables**에 위 설정값을 넣습니다. (최소: `FAMILY_PASSCODE`, `AI_PROVIDER`, 고른 회사 키)
4. **Deploy**를 누르면 끝. 나온 주소를 가족에게 알려 주세요.
5. 폰에서 주소를 열고 암호를 한 번 입력하면, 그 폰은 암호를 기억해요. (브라우저 메뉴의 "홈 화면에 추가"를 쓰면 앱처럼 열 수 있어요.)

## 4. 바꾸고 싶을 때

- **AI 회사 바꾸기**: Vercel → 프로젝트 → Settings → Environment Variables에서 `AI_PROVIDER`와 그 회사 키를 바꾸고 → Deployments에서 **Redeploy**. 코드는 고칠 필요 없어요.
- **가족 암호 바꾸기**: `FAMILY_PASSCODE`를 바꾸고 **Redeploy**. 가족 폰에서는 다음에 돌릴 때 암호 화면이 다시 나오니 새 암호를 입력하면 돼요.

## 5. 내 컴퓨터에서 실행해 보기

[Node.js](https://nodejs.org) 20 이상이 필요해요.

```bash
npm install
```

`.env.example`을 복사해 `.env.local`을 만들고 값을 채운 뒤:

```bash
npm run dev
```

브라우저에서 <http://localhost:3000> 을 엽니다.

개발자용 확인 명령: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## 6. 알아 두세요

- **알레르기**: '못 먹는 재료'에 등록한 단어가 이름에 들어간 재료나 요리는 빼고(예: 새우 → 새우젓), AI에게도 파생 재료(예: 우유 → 버터·치즈)를 피하라고 알려요. 그래도 AI가 만든 레시피라 **알레르기 재료는 꼭 한 번 더 확인**하세요.
- **저장 위치**: 고른 재료, 양념, 못 먹는 재료, 즐겨찾기는 **각자의 폰(브라우저)에만** 저장돼요. 가족끼리 공유되지 않고, 브라우저 기록을 지우면 사라져요.
- **카카오톡 보내기**: 폰의 공유창을 이용해요. 공유 → 카카오톡 → 나와의 채팅을 고르면 돼요. PC에서는 복사 버튼만 보여요.
