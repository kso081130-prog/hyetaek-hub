# 꿀머니 (hyetaek-hub)

정부지원금·생활비 절약 정보를 매일 정리해서 알려주는 사이트. Next.js(App Router) + MDX
기반이고, 콘텐츠는 git 커밋 자체가 CMS 역할을 한다 (DB 없음).

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 확인
```

Node가 PATH에 없다면 `C:\Program Files\nodejs`를 세션 PATH에 추가하고 실행할 것.

## 폴더 구조

- `app/` — 페이지 (홈, `/posts/[slug]`, `/tools/subsidy-calculator`, `/about`, `/privacy`)
- `content/posts/*.mdx` — 글 본문. `export const postMeta = {...}` 로 제목/설명/날짜/태그/
  `status`(`draft`|`published`)/출처를 정의
- `lib/posts.ts` — 글 목록을 읽어오는 헬퍼
- `lib/subsidies-data.ts` — 지원금 계산기(`/tools/subsidy-calculator`)의 대표 제도 데이터
- `scripts/generate_post.py` — 글 자동 생성 스크립트 (아래 참고)

## 콘텐츠 신뢰도 게이트

`app/posts/[slug]/page.tsx`는 `status: "published"`인 글만 정적으로 생성한다
(`dynamicParams = false`). `status: "draft"`인 글은 파일은 저장소에 있어도 실제 URL로는
404 — 사람이 검수 후 `status`를 `published`로 바꿔야 사이트에 노출된다.

## 글 자동 생성 (`scripts/generate_post.py`)

### 준비

```bash
pip install -r requirements.txt
cp .env.example .env   # NAVER_*, ANTHROPIC_* 키 채우기 (korea-trend-blog의 키 재사용 가능)
```

### 실행

```bash
python scripts/generate_post.py
```

`scripts/topics.json`에서 아직 안 다룬 주제를 하나 골라 글을 쓰고, `content/posts/`에
MDX 파일로 저장한다. 구체적인 금액·자격요건 숫자가 들어간 글은 자동으로
`status: draft`로 저장돼 검토가 필요하다. 주제가 떨어지면 `topics.json`에 새로 추가할 것.

**이 스크립트는 파일만 만든다 — git commit/push는 하지 않는다.** 실제 발행(배포)은
아래처럼 직접 커밋·푸시하거나, 스케줄 루틴에서 이 스크립트 실행 뒤에 커밋·푸시 단계를
추가해서 자동화한다.

```bash
git add content/posts scripts/topics.json
git commit -m "새 글 추가: <제목>"
git push origin main   # Vercel이 자동 배포
```

### 알려진 이슈

- 2026-08-24 기준 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`가 401 Unauthorized를 반환함
  (네이버 개발자센터에서 앱 상태·키 재발급 확인 필요). 네이버 검색이 실패해도 스크립트는
  일반적인 절차 안내 위주로 안전하게 글을 쓰도록 폴백하지만, 최신 뉴스 맥락 없이 쓰는
  것이라 특정 정책 변경 같은 최신성은 반영되지 않는다.

## 배포

**`git push origin main`으로만 배포한다.** Vercel CLI로 직접 배포하지 말 것 (Vercel의
GitHub 연동이 push를 감지해 자동 배포).

지금은 결제 없이 Vercel 기본 서브도메인(`*.vercel.app`)으로 시작한다. 커스텀 도메인
구매와 애드센스 정산 계좌 등록은 별도 승인 후 진행 (미성년자·기초생활수급자 관련 제약,
`사업/sion-ai-startup-kit/docs/constraints.md` 참고).
