# 알아 둘 것

## 한글 암호를 요청 헤더에 넣으면 요청 자체가 실패한다
- 증상: 한글 암호로 암호 확인은 통과하는데 후보 요청만 항상 실패.
- 원인: 브라우저 `fetch`는 ISO-8859-1 밖의 문자가 든 헤더 값을 거부하고 TypeError를 던진다.
- 대응: 암호는 요청 본문 `passcode`로만 보낸다. 헤더로 옮기지 말 것.

## Windows 터미널의 curl로 한글 본문을 보내면 암호가 틀렸다고 나온다
- 증상: `curl -d '{"passcode":"우리집"}'`는 401, 같은 암호를 브라우저나 Node `fetch`로 보내면 200.
- 원인: Git Bash/cmd의 curl이 명령줄 한글을 UTF-8이 아닌 코드페이지로 보낸다.
- 대응: 한글 암호 수동 확인은 `node -e "fetch(...)"`나 브라우저로 한다. 서버 코드는 정상.

## Next.js 빌드와 node_modules 연결(링크)
- 증상: 별도 작업 폴더에서 `node_modules`를 원래 폴더로 연결(정션/심볼릭 링크)해 두면 `npm run build`가 "Symlink ... node_modules is invalid, it points out of the filesystem root"로 실패.
- 원인: 기본 번들러(Turbopack)가 프로젝트 루트 밖을 가리키는 링크를 거부한다.
- 대응: 그런 폴더에서는 `npx next build --webpack`으로 확인하고, 최종 확인은 실제 설치가 있는 원래 폴더에서 `npm run build`.

## `LayoutProps` 같은 Next 전역 타입은 빌드 전에는 없다
- 증상: 새로 받은 코드에서 `npm run typecheck`가 `Cannot find name 'LayoutProps'`로 실패.
- 원인: 해당 타입은 `next build`/`next dev`가 `.next/types`에 생성한다. 그 전의 `tsc --noEmit`에는 없다.
- 대응: 레이아웃·페이지 props 타입은 `{ children: React.ReactNode }`처럼 직접 적는다.

## Vitest 설정 파일은 `.mts`
- `package.json`에 `"type": "module"`이 없어서 `vitest.config.ts`는 CommonJS로 읽혀 경고가 난다. 설정은 `vitest.config.mts`에 두고 경로는 `import.meta.url`로 만든다.

## AI 응답 스키마 (세 회사 공용)
- 스키마는 `src/lib/server/ai/prompt.ts`의 `CANDIDATES_SCHEMA` 하나를 세 회사가 같이 쓴다. OpenAI strict 규칙 때문에 **모든 속성이 required이고 additionalProperties: false**다. 속성을 추가할 때 선택 속성으로 두면 OpenAI 호출이 거부된다 — null 허용 타입(`["number","null"]`)으로 required에 넣는다.
- 수량의 null 허용은 `type: ["number","null"]` 배열 표기다. 새 회사를 붙일 때 이 표기를 지원하는지 먼저 확인한다(지원 안 하면 그 회사 연결부에서 스키마 변환).
- Anthropic은 강제 도구 호출(`tool_choice`)의 입력으로, Google은 `responseMimeType: application/json` + `responseJsonSchema`의 텍스트로, OpenAI는 `response_format` json_schema strict의 텍스트로 받는다. 세 경우 모두 `{ candidates: [...] }` 모양이 아니면 AI 실패(502)로 처리.
- 기본 모델: Anthropic `claude-haiku-4-5-20251001`, Google `gemini-3.5-flash-lite`, OpenAI `gpt-5.4-mini`. 모델을 바꿀 때는 코드 대신 `AI_MODEL` 환경 변수를 쓴다.

## 시간 예산과 보충
- 요청 전체 예산 50초는 요청 시작 시각부터 센다. 첫 호출이 오래 걸려 남은 예산이 15초 미만이면 보충을 건너뛰고 첫 통과분만 돌려준다. 라우트 `maxDuration = 60`은 이 예산보다 커야 한다 — 예산을 늘리면 `maxDuration`도 같이 늘리고 Vercel 요금제 한도를 확인한다.
- 시간 초과 시 SDK 요청을 AbortController로 끊는다. SDK 재시도는 Anthropic·OpenAI 1회(Gemini는 SDK 기본값) — 재시도도 같은 예산 안에서 끝나야 한다.

## 저장 형식 호환
- 가족 기기에는 옛 저장값이 남아 있다. `parseSettings`는 칸마다 따로 검사해서 이상한 칸만 기본값으로 바꾼다. 서버 요청 한도를 넘는 값(20자 넘는 이름, 30개 넘는 선택 재료·양념·제외)도 불러올 때 잘라 낸다 — 남겨 두면 모든 후보 요청이 400이 된다. 새 칸을 추가할 때는 이전 저장값에 그 칸이 없어도 기본값이 들어가도록 한다(버전을 올리면 모든 가족 기기의 즐겨찾기가 사라진다).

## 공유·복사 확인 체크리스트 (자동 테스트 불가)
1. 폰(안드로이드 크롬, iOS 사파리)에서 결과 카드 → 공유 → 카카오톡 → 나와의 채팅 → 문구가 줄바꿈 그대로 도착하는지 확인.
2. 같은 폰에서 복사 → 메모 앱에 붙여넣기 확인.
3. PC 브라우저에서 공유 버튼이 안 보이고 복사만 되는지 확인.
- 자동화 브라우저(포커스 없는 창)에서는 클립보드 권한이 없어 "복사하지 못했어요"가 나오는 것이 정상일 수 있다. 판단은 실제 기기로.

## 룰렛 연출
- 당첨은 `pickUniformIndex`(crypto 난수)로 먼저 정하고, `RouletteWheel`은 그 칸 안쪽 임의 위치에 멈추도록 회전 각도를 계산한다. 회전을 다시 시작하는 신호는 `spinKey` 증가 — 같은 당첨 번호라도 `spinKey`가 바뀌어야 돈다.
- 멈춤 완료는 CSS transition 종료 이벤트가 아니라 회전 시간 + 50ms 타이머로 알린다(탭이 가려졌을 때도 결과가 나오게).
- 당첨은 회전 시작 때 정해지지만, 약 3.6초 회전 동안 재료·양념·제외를 바꾸면 재검사로 그 당첨이 판에서 빠질 수 있다. 그래서 멈춘 시점에 `landedWinner`(`src/lib/board.ts`)로 지금 판(`boardRef.current`)에 남아 있는지 다시 확인하고, 없으면 지금 판으로 다시 고른다. 입력을 잠그는 방식으로 막지 않는다.
