# src/components — 화면

## 맡는 것
- `FridgeApp.tsx`: 화면 흐름 전체 — 설정 불러오기·저장, 암호 화면 전환, 돌리기/다시 돌리기/새 후보 받기, 후보판 상태, 결과, 즐겨찾기 카드, 알림.
- 부품: `PasscodeGate`, `TagPicker`(재료·양념 태그), `AddInput`, `ExclusionSection`, `ServingsPicker`, `RecipeCard`(결과 카드와 즐겨찾기 카드 공용), `ShareButtons`, `FavoritesList`, `FavoriteModal`, `Toast`, `RouletteWheel`(도메인 타입을 모르는 범용 원판).
- 스타일: `ui.module.css`, `RouletteWheel.module.css`, 색은 `src/app/globals.css`의 변수(다크 모드 포함).

## 맡지 않는 것
- 규칙 계산 — 부족 재료·재검사·환산·문구·설정 연산은 모두 `src/lib`의 함수를 부른다. 컴포넌트 안에서 같은 계산을 다시 쓰지 않는다.
- 서버 코드(`src/lib/server`)는 가져오지 않는다. 서버와는 `src/lib/api.ts`로만 이야기한다.

## 불변 조건
- 설정은 바뀔 때마다 즉시 저장한다. 첫 렌더는 저장소를 읽기 전 중립 상태 — 서버 렌더와 브라우저 첫 렌더가 달라지지 않게 한다(공유 가능 여부도 마운트 후에 판단).
- 선택 재료·보유 양념·제외 단어가 바뀌면 후보판을 `recheck`한다. 새 후보판이 도착하면 그 사이 바뀐 조건으로 한 번 더 `recheck`.
- 요청 중·회전 중에는 돌리기·다시 돌리기·새 후보 받기를 누를 수 없다(중복 요청 방지).
- 당첨은 `pickUniformIndex`로 남은 후보 중에서 먼저 정하고 `RouletteWheel`에 넘긴다. 회전 시작 신호는 `spinKey` 증가.
- 결과 카드 수량 = `scaleIngredients(레시피 재료, 레시피 기준 인분, 표시 인분)`. 장바구니 = 환산된 재료에 `missingIngredients` → `buildShareText`.
- 401 결과를 받으면 저장 암호를 지우고 암호 화면으로. 알레르기 안내 문구는 제외 섹션과 결과 카드(즐겨찾기 카드 포함)에 항상.

## 구현 방식
- 모든 컴포넌트는 클라이언트 컴포넌트. 비동기 결과가 늦게 도착할 수 있으므로 최신 설정·후보판은 ref로 읽는다(`FridgeApp`의 `boardRef` 등).
- 공유는 `navigator.share({text})`, 사용자가 닫으면(AbortError) 조용히. 복사는 `navigator.clipboard.writeText` → 실패 시 숨긴 textarea + `execCommand('copy')`.
- 터치 대상 40px 이상, 폭 360~430px 폰 우선.

## 테스트
- 화면 컴포넌트 자동 테스트는 없다. 흐름 로직은 `src/lib/board.ts`·`api.ts`로 빼서 그쪽에서 테스트한다 — 새 흐름 규칙도 컴포넌트가 아니라 `src/lib`의 순수 함수로 만들고 테스트한다.
- 수동 확인: 룰렛 회전·정지, 폰 공유창 → 카톡, 복사, 다크 모드, '동작 줄이기' 설정 시 짧은 회전.
