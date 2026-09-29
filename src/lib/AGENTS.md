# src/lib — 도메인 규칙 + 기기 설정 상태

## 맡는 것
- 타입(`types.ts`), 이름 정규화(`normalize.ts`).
- 순수 도메인 규칙: 부족 재료(`pantry.ts`), 제외 매칭(`exclusion.ts`), 후보 검사(`validation.ts`), 인분 환산·수량 표기(`scaling.ts`), 장바구니 문구(`shareText.ts`), 균등 추첨(`random.ts`).
- 후보판 상태(`board.ts`), 기기 설정 상태 연산(`settings.ts`, 기본 목록 `presets.ts`), 브라우저 저장(`storage.ts`), 화면용 API 호출과 결과 분류(`api.ts`).

## 맡지 않는 것
- 서버 환경 변수·암호 비교·AI 호출 — `server/` 하위 폴더의 몫. 이 폴더의 `server/` 밖 파일은 `server/`를 가져오지 않는다.
- React 상태·화면 — `src/components`.

## 불변 조건
- `server/` 밖 모듈은 React·Node 전용 모듈을 가져오지 않는다. 브라우저 API는 `storage.ts`(window 확인 후), `random.ts`(crypto 확인 후), `api.ts`(fetch, 주입 가능)에서만 쓴다.
- 부족 재료는 `missingIngredients` 한 함수에서만 나온다. 물은 항상 가진 것. 레시피 재료 순서 유지, 같은 이름은 첫 줄만.
- `filterCandidates` = 구조 규칙(`checkStructural`) + 조건 규칙(`checkConditional`) + 판 내 요리명 중복 제거(통과한 것끼리, 뒤의 것 버림, `existing`과도 비교). 조건 변경 재검사는 `recheckCandidates`(조건 규칙만).
- 한도 숫자: 불 15, 손질 10, 부족 3, 요리명 40자(`Array.from` 글자 수), 이름 20자, 목록 30개, 피할 이름 50개. 서버 본문 검사 한도와 같아야 한다.
- 환산 반올림은 항상 적용(인분이 같아도): 10 미만 0.5 단위, 10 이상 정수, 0이면 0.5. 원본 배열은 바꾸지 않는다.
- `settings.ts` 연산은 새 객체를 돌려주는 순수 함수이고, 사용자에게 보일 안내는 `notice`(empty/tooLong/blocked/limit/duplicate)로만 알린다. 제외 단어 추가 시 걸리는 재료·양념 선택을 같은 연산 안에서 해제한다.
- `parseSettings`는 칸별 복구: JSON 깨짐·버전 불일치만 전체 기본값.
- `api.ts` 결과 분류: 401 → unauthorized, 500·400·기타 4xx·모양 이상 → problem, 그 밖의 5xx·네트워크 오류 → retry.

## 구현 방식
- 입력이 불확실한 값(AI 응답, 저장값)은 `isObj` 식 검사로 모양을 확인한 뒤 옮긴다. 타입 단언으로 넘기지 않는다.
- 이름 비교는 반드시 `norm` 후. 표시용 이름은 사용자가 쓴 그대로(태그는 정규화된 이름으로 저장).

## 테스트
- `domain.test.ts`: 규칙마다 경계값 쌍(15/16, 10/11, 단계 2·3·4·5, 부족 3/4, 이름 40/41)과 장바구니 문구 글자 단위 일치.
- `settings.test.ts`: 직접 입력(빈 값, 20/21자, 기존 태그 선택), 30개 한도, 제외 추가 시 자동 해제·재선택 없음, 즐겨찾기 토글 순서, 저장값 복구.
- `board.test.ts`: 나온 후보 제외, 1개 → 바로 결과, 0개, 재검사 제외 사유 3가지, 피할 이름 최근 50개·중복 이동.
- 규칙을 바꾸면 경계값 테스트를 먼저 바꿔 실패를 확인한 뒤 구현을 바꾼다.
