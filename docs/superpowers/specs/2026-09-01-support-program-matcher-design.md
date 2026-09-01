# 지원사업 매칭 알리미 — 설계

날짜: 2026-09-01
상태: 승인됨 (사용자 확인 완료)

## 배경

꿀머니(hyetaek-hub)는 지금 정부지원금·생활비 절약 정보를 다루는 콘텐츠 사이트다
(`content/posts/*.mdx`, git 커밋 = CMS, DB 없음). 이번 기능은 그것과 별개로,
사이트 운영자(Sion) 개인 조건에 맞는 장학금·지원금·멘토링 공고를 주기적으로
찾아서 개인 대시보드에 모아 보여주는 기능이다. 나중에 다른 사용자도 쓰는
기능으로 확장할 계획이라 처음부터 Supabase Auth 기반으로 만든다.

기존 콘텐츠 파이프라인(`content/posts`, `scripts/generate_post.py`)과는
완전히 분리해서 섞지 않는다.

## 아키텍처

```
[Claude 예약 루틴, 5일 주기]
   → 카테고리 x 프로필 조건 조합으로 WebSearch/WebFetch 다회 실행
     (보조금24·복지로·한국장학재단 등 대형 집계처는 매회 기본으로 훑음)
   → 검색 결과를 프로필 조건과 대조해 LLM이 직접 관련 여부 판단
     (규칙 엔진 없음 — 자격요건 텍스트가 비정형이라 LLM 판단이 더 견고함)
   → 관련 있는 공고만 POST /api/postings/ingest 로 전송
        ↓
[hyetaek-hub Next.js 앱 + Supabase]
   → ingest API: 비밀 헤더 검증 → Supabase `postings` 테이블에 upsert
     (URL unique constraint로 중복 방지)
   → /me 대시보드: Supabase Auth 로그인 후 매칭된 공고 목록 표시,
     각 카드에 원본 사이트로 이동하는 "신청하러 가기" 링크(새 탭, external)
```

## 컴포넌트

### 1. Supabase 프로젝트 (신규 — 계정 생성 필요, 사용자 승인 필요)

- `profiles` 테이블: user_id, 나이, 보호종료/위탁 여부, 기초생활수급 여부,
  관심분야(AI 창업 등), 기타 자유 텍스트 조건. `/me/profile`에서 수정 가능.
- `postings` 테이블: id, title, url(unique), source, category
  (scholarship/subsidy/mentoring), summary, why_matched, deadline,
  first_seen_at, is_read.
- Supabase Auth: 이메일/비밀번호 로그인. 지금은 가입 자체를 막아두고
  (초대 코드 or 수동 생성) 1인만 사용, 나중에 열 때 가입 폼만 추가.

### 2. Claude 예약 루틴 (신규)

- `schedule` 스킬로 5일 주기 클라우드 루틴 등록.
- 매 실행마다: (a) 대형 집계 사이트 확인, (b) 카테고리별 검색 쿼리
  (장학금/지원금/멘토링 x 미성년·보호종료·기초수급·AI창업 조건 조합) 실행.
- 결과를 `profiles`의 최신 조건과 대조 → 관련 있는 것만 골라 요약 +
  "왜 매칭되는지" 한 줄 생성 → ingest API 호출.
- 검색 실패해도 다음 주기에 재시도, 상태 저장 불필요 (idempotent).

### 3. `POST /api/postings/ingest` (신규, hyetaek-hub 안)

- 요청 헤더의 비밀키(`INGEST_SECRET` 환경변수)로 인증. 없거나 틀리면 401.
- 바디 형식 틀리면 400.
- `url` 기준 upsert (이미 있으면 무시, 없으면 insert). DB가 dedup 담당.

### 4. `/me` 대시보드 (신규, hyetaek-hub 안)

- Supabase Auth 미들웨어로 보호.
- 안읽음/읽음, 마감임박순 정렬, 카테고리 필터.
- 카드마다 "신청하러 가기" 버튼 → `posting.url`로 새 탭 이동.
- `/me/profile`: 매칭 조건 편집 폼.

## 에러 처리

- 예약 루틴 실패 → 알림 누락 정도, 다음 주기에 자연 복구.
- ingest API 인증/형식 실패 → 401/400, 로그만 남김.
- 중복 공고 → DB unique constraint로 자동 무시.

## 테스트

- `/api/postings/ingest` 라우트 테스트: 인증 실패, 중복 upsert, 정상 삽입.
- 매칭 판단은 LLM 기반이라 자동 테스트 대상 아님 — 초기 몇 회는 수동으로
  결과 확인.

## 범위 밖 (지금 안 함)

- 카카오톡/이메일/푸시 알림 (대시보드 확인 방식으로 확정).
- 회원가입 공개 (1인 전용, 나중에 열 때 별도 작업).
- 고정 소스 스크래퍼 목록 (검색 쿼리 방식으로 대체).
