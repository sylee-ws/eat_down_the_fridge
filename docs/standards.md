# 규칙

## 검증 관문

머지·배포 전 네 명령 모두 종료 코드 0:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

- 테스트는 Vitest(`vitest.config.mts`, `src/**/*.test.ts(x)`, node 환경). 실제 AI·네트워크 호출 금지 — 회사 연결부는 SDK 호출 함수를 주입받아 가짜로 바꾼다(`src/lib/server/testing.ts`).
- 도메인 규칙(부족 재료, 후보 검사 1~8, 제외 매칭, 환산 반올림, 장바구니 문구, 저장 복구, 후보판 상태)을 바꾸면 해당 경계값 테스트도 같은 커밋에서 바꾼다. 규칙을 바꾸고 테스트가 그대로 통과하면 테스트가 규칙을 잡지 못한 것이다.

## 모듈 경계

- `src/lib/server/**`는 서버 라우트(`src/app/api/**`)에서만 가져온다. `src/components/**`와 `src/lib/*.ts`(server 밖)는 `src/lib/server`를 가져오면 안 된다 — 키·암호 읽는 코드가 브라우저 번들에 들어간다.
- `src/lib/*.ts`(server 밖)는 React·브라우저 전용 API·Node 전용 모듈을 가져오지 않는 순수 모듈이다(저장소 접근은 `storage.ts`에서 `window` 존재 확인 후에만). 서버와 화면이 같은 규칙 코드를 쓰기 위함.
- 부족 재료는 `pantry.missingIngredients`, 후보 검사는 `validation.filterCandidates`/`recheckCandidates`, 장바구니 문구는 `shareText.buildShareText`, 환산은 `scaling.scaleIngredients` 한 곳에서만 만든다. 화면·서버에 같은 계산을 다시 구현하지 않는다.
- AI 회사별 코드는 `src/lib/server/ai/<회사>.ts` 안에만. 생성 흐름(`generate.ts`)과 핸들러는 `AiProvider` 모양만 안다.
- `src/lib` 모듈끼리는 모아보기(index) 파일 없이 파일을 직접 가져온다.

## 입력·출력 규칙

- 서버 라우트 파일은 `process.env`를 핸들러에 넘기기만 하고, 로직은 `handlers.ts`에 둔다(환경 변수를 주입해 테스트하기 위함). 라우트는 `runtime = "nodejs"`(Node 암호 모듈 사용).
- 서버 오류 응답은 `{ "error": "<코드>" }` 모양만. 코드 목록을 늘리면 화면의 결과 분류(`src/lib/api.ts`)도 함께 바꾼다.
- 화면의 클라이언트 요청 개수 한도(선택 재료·양념·제외 30개, 피할 이름 50개)와 이름 길이(20자, 요리명 40자)는 서버 본문 검사 한도와 같아야 한다. 한쪽만 바꾸면 요청이 400으로 막힌다.
- AI 응답은 회사의 구조화 출력 기능으로만 받는다. 자유 텍스트에서 정규식 등으로 뽑아내지 않는다.

## 설정 규칙

- 비밀값은 `process.env`로 서버에서만 읽고 `NEXT_PUBLIC_` 접두사를 쓰지 않는다.
- 새 환경 변수를 추가하면 `.env.example`(값 없이)과 README 설정표를 같이 고친다.

## 언어·표기

- 화면 문구는 한국어, 비개발자에게 쉬운 말. 코드 주석은 짧은 한국어.
- 저장 키 `fridge-roulette:v1`와 `Settings.version`은 저장 형태가 호환되지 않게 바뀔 때만 올린다.

## 커밋

- 기본 브랜치에서 작업하는 개인 프로젝트. 커밋 전 검증 관문 네 명령을 통과시킨다.
