# 냉장고 파먹기 룰렛

냉장고 남은 재료를 고르면 AI가 불 사용 15분 이내 집밥 후보를 만들고, 원형 룰렛이 하나를 뽑아 주며, 새로 사야 할 재료만 장바구니 문구로 만들어 폰 공유창·클립보드로 보내는 모바일 우선 웹앱. 사용자는 나와 가족 몇 명(공개 서비스 아님), Vercel 무료 플랜에 올리고 가족 공용 암호로 AI 사용을 막는다. Next.js(App Router) + TypeScript 한 프로젝트, 서버 DB 없음 — 개인 상태는 각 기기 브라우저 저장소에만 있다.

## 프로젝트 구조

```
프로젝트 루트/
├── CLAUDE.md / AGENTS.md          → 이 문서 (두 파일 내용 동일)
├── README.md                       → 가족(비개발자)용 배포·사용 안내
├── .env.example                    → 서버 설정값 이름 목록 (값 없음)
├── docs/
│   ├── architecture.md             → 화면·서버·AI 회사 연결 구조와 요청 흐름
│   ├── business-rules.md           → 부족 재료·후보 검사·제외·환산·후보판 규칙 (도메인 기준)
│   ├── security.md                 → 가족 암호·AI 키 보호 정책
│   ├── standards.md                → 어기면 깨지는 규칙, 검증 명령
│   ├── engineering-notes.md        → 함정과 비직관적 동작
│   ├── operations.md               → 설치·실행·배포·설정값
│   ├── contracts.md                → /api/verify-passcode, /api/candidates 입출력·오류
│   └── tracking/
│       ├── status.md               → 된 것 / 남은 것
│       ├── decisions/              → 대안이 있었던 결정 기록 (index.md + NNNN-*.md)
│       └── findings.md             → 지금 풀 수 없는 문제
└── src/
    ├── app/                        → 페이지와 API 라우트 (얇은 진입점)
    ├── components/AGENTS.md        → 화면 컴포넌트: 흐름 조립, 룰렛, 공유·복사
    └── lib/
        ├── AGENTS.md               → 순수 도메인 규칙 + 기기 설정 상태 (화면·서버 공용)
        └── server/AGENTS.md        → 서버 전용: 설정, 암호, AI 회사 연결부, 후보 생성
```

## 반드시 지킬 것 (핵심만 — 전체는 docs/standards.md)

1. AI 키와 `FAMILY_PASSCODE`는 서버 환경 변수로만 읽는다. 브라우저 번들·응답·로그에 나오면 안 되고 `NEXT_PUBLIC_` 접두사 금지.
2. 암호가 틀리거나 없으면 AI 호출·본문 검사 전에 401. 설정이 비어 있으면(암호 미설정, 모르는 AI 회사, 고른 회사 키 없음) 500으로 닫힌다 — 열린 채로 동작하게 바꾸지 말 것.
3. 부족 재료는 `src/lib/pantry.ts`의 `missingIngredients` 한 곳에서만 계산한다. AI의 판단을 쓰지 않는다.
4. 후보 규칙 수치(불 ≤15분, 손질 ≤10분, 3~4단계, 부족 재료 ≤3, 선택 재료 ≥1 사용, 제외 단어 포함 매칭)는 사용자가 정한 값이다. 느슨하게 바꾸려면 사용자 확인이 필요하다.
5. 테스트는 실제 AI나 네트워크를 부르지 않는다.

## 작업 전 확인

- 항상: `docs/standards.md`, `docs/engineering-notes.md`, 손댈 곳의 모듈 `AGENTS.md`.
- 후보 규칙·부족 재료·제외·인분 환산을 바꿀 때: `docs/business-rules.md` 전체와 `src/lib/domain.test.ts` 경계값 테스트.
- 서버 라우트·AI 회사 연결부를 바꿀 때: `docs/security.md`의 확인 순서, `docs/contracts.md`의 오류 형태, `src/lib/server/AGENTS.md`의 공통 연결부 규칙.
- 새 AI 회사·모델을 넣을 때: `docs/engineering-notes.md`의 구조화 출력 스키마 항목.
- 저장 형태(`Settings`)를 바꿀 때: `docs/engineering-notes.md`의 저장 버전 항목 — 기존 가족 기기에 옛 형식이 남아 있다.
- Next.js 코드를 쓸 때: 아래 안내대로 `node_modules/next/dist/docs/`의 해당 가이드.

## 문제가 생기면

- **즉시 사용자에게 알릴 것**: AI 키나 가족 암호가 브라우저·응답·로그로 새는 경로를 발견, 암호 없이 `/api/candidates`가 AI를 호출하는 경로, 못 먹는 재료(알레르기)가 이름에 들어간 후보가 화면에 나오는 경로, 장바구니가 `missingIngredients`가 아닌 값으로 계산되는 경로.
- 그 밖의 문제는 `docs/tracking/findings.md`에 기록.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
