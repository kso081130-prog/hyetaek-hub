# 혜택허브 — Claude Code 프로젝트 가이드

- **프로젝트 이름:** 혜택허브 (hyetaek-hub) — 정부지원금·생활비 절약 정보 사이트
- **기술 스택:** Next.js 16(App Router, Turbopack) + TypeScript + Tailwind CSS v4 + MDX.
  DB 없음 — `content/posts/*.mdx`가 콘텐츠 저장소, git 커밋이 곧 CMS.
- **개발 서버 실행:** `npm run dev` (포트 3000)
- **빌드:** `npm run build`
- **콘텐츠 자동 생성:** `python scripts/generate_post.py` (자세한 내용은 README.md)
- **배포:** `git push origin main` 만 사용 — Vercel CLI로 직접 배포 금지. Vercel의 GitHub
  연동이 push를 감지해 자동 배포한다.
- **주의사항:**
  - `content/posts/*.mdx`의 `status`가 `draft`인 글은 의도적으로 공개 URL에서 404 처리됨
    (`app/posts/[slug]/page.tsx`의 `dynamicParams = false`). 구체적 금액·자격요건이 담긴
    글은 사람 검수 후 `published`로 바꿔야 실제로 노출된다 — 이 게이트를 우회하지 말 것.
  - 이 니치(정부지원금)는 사실 오류가 신뢰도에 치명적이다. 글을 쓰거나 고칠 때 금액·자격
    조건은 반드시 출처를 남기고, 확실하지 않으면 구체적 숫자 대신 "공식 사이트에서 확인"
    으로 안내할 것.
  - 커스텀 도메인 구매, 애드센스 정산 계좌 등록은 사용자 승인 없이 진행하지 말 것 (미성년자·
    기초생활수급자 관련 제약, `../sion-ai-startup-kit/docs/constraints.md` 참고).
  - `사업/` 폴더에는 이 프로젝트 말고도 `korea-trend-blog`, `mallang-contract`,
    `sion-ai-startup-kit`이 있다 — 이 프로젝트와 독립적으로 유지할 것 (섞어 쓰지 말 것).

---

@AGENTS.md
