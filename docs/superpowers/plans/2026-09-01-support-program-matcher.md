# 지원사업 매칭 알리미 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5일 주기로 장학금·지원금·멘토링 신규 공고를 검색해 조건에 맞는 것만 골라 개인 대시보드(`/me`)에 모아 보여주고, 원본 사이트로 바로 이동할 수 있게 한다.

**Architecture:** Supabase(Postgres+Auth) 신규 도입. Claude 예약 루틴(5일 주기)이 WebSearch로 훑고 LLM이 직접 관련 여부 판단해서 `POST /api/postings/ingest`로 전송 → Supabase `postings` 테이블에 upsert(URL로 dedup) → `/me` 대시보드(Supabase Auth 보호)가 목록을 표시. 기존 `content/posts` MDX 파이프라인과는 완전히 분리.

**Tech Stack:** Next.js 16(App Router) + TypeScript, `@supabase/supabase-js` + `@supabase/ssr`, Node 내장 테스트 러너(`node:test`) + `tsx`(테스트 실행용 로더로만 사용, 새 테스트 프레임워크 도입 안 함).

**Spec:** [docs/superpowers/specs/2026-09-01-support-program-matcher-design.md](../specs/2026-09-01-support-program-matcher-design.md)

## Global Constraints

- 알림 채널은 대시보드뿐 — 카카오톡/이메일/푸시 없음.
- 회원가입 공개 안 함 — 1인 전용, Supabase 대시보드에서 수동으로 계정 생성.
- 고정 소스 스크래퍼 목록 없음 — 카테고리×조건 조합 검색 쿼리 방식.
- `postings.url`은 unique — 중복 공고는 DB 레벨에서 자동 무시(dedup).
- ingest API는 `x-ingest-secret` 헤더가 `INGEST_SECRET`과 일치해야 함, 없거나 틀리면 401, 바디 형식 틀리면 400.
- 예약 루틴 주기는 5일.
- 기존 `content/posts` / `scripts/generate_post.py` 파이프라인과 섞지 않음.

---

## Task 1: Supabase 프로젝트 준비 + 환경변수 배선

**중요:** Supabase 계정/프로젝트 생성은 Claude가 대신 할 수 없다(계정 생성은 금지된 동작) — 사용자가 직접 해야 한다.

**Files:**
- Modify: `.env.example`
- Modify: `package.json` (dependencies 추가)
- Create: `.env` (사용자가 값을 준 뒤 로컬에만 존재, git에 안 올라감 — `.gitignore`에 이미 `.env*` 있음)

**Interfaces:**
- Produces: `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`, `process.env.SUPABASE_SERVICE_ROLE_KEY`, `process.env.INGEST_SECRET` — 이후 모든 태스크가 이 값들을 씀.

- [ ] **Step 1: 사용자에게 Supabase 프로젝트 생성 안내**

사용자에게 다음을 요청 (Claude는 대신 수행 불가):
1. https://supabase.com 에서 새 프로젝트 생성 (무료 티어)
2. 프로젝트 Settings → API 에서 `Project URL`, `anon public` 키, `service_role` 키 확인
3. 세 값과, 본인이 정한 `INGEST_SECRET`(임의의 긴 랜덤 문자열) 하나를 Claude에게 전달

값을 받을 때까지 이 태스크는 대기.

- [ ] **Step 2: `.env.example`에 항목 추가**

```
# Supabase — https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 지원사업 ingest API 인증용 임의 문자열 (예약 루틴 쪽에도 동일한 값 등록)
INGEST_SECRET=
```

- [ ] **Step 3: `.env` 생성 (사용자가 준 실제 값으로)**

`.env.example`과 같은 키에 사용자가 전달한 실제 값 채워서 `.env` 파일 작성.

- [ ] **Step 4: 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D tsx
```

- [ ] **Step 5: `package.json`에 test 스크립트 추가**

`scripts` 블록에 추가:

```json
"test": "node --import tsx --experimental-test-module-mocks --test tests/**/*.test.ts"
```

- [ ] **Step 6: Commit**

```bash
git add .env.example package.json package-lock.json
git commit -m "chore: Supabase 의존성 및 환경변수 스캐폴딩 추가"
```

(`.env`는 git에 안 올라감 — `.env*`가 `.gitignore`에 이미 있음, 커밋 전 `git status`로 확인.)

---

## Task 2: DB 스키마

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `profiles` 테이블 (컬럼: `user_id uuid PK references auth.users`, `age int`, `is_care_leaver bool`, `is_basic_livelihood bool`, `interests text`, `notes text`, `updated_at timestamptz`), `postings` 테이블 (컬럼: `id uuid PK default gen_random_uuid()`, `title text not null`, `url text not null unique`, `source text not null`, `category text not null check (category in ('scholarship','subsidy','mentoring'))`, `summary text not null`, `why_matched text not null`, `deadline date`, `is_read boolean not null default false`, `first_seen_at timestamptz not null default now()`).

- [ ] **Step 1: 스키마 파일 작성**

```sql
-- supabase/schema.sql
-- Supabase SQL Editor에 붙여넣어 실행 (사용자가 수동으로 1회 실행)

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int,
  is_care_leaver boolean not null default false,
  is_basic_livelihood boolean not null default false,
  interests text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  source text not null,
  category text not null check (category in ('scholarship', 'subsidy', 'mentoring')),
  summary text not null,
  why_matched text not null,
  deadline date,
  is_read boolean not null default false,
  first_seen_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table postings enable row level security;

-- 본인 프로필만 읽고 쓸 수 있음
create policy "profiles: owner read" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles: owner upsert" on profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles: owner update" on profiles
  for update using (auth.uid() = user_id);

-- 로그인한 사용자는 누구나 postings를 읽고 is_read를 갱신할 수 있음 (1인 전용 단계)
create policy "postings: authenticated read" on postings
  for select using (auth.role() = 'authenticated');
create policy "postings: authenticated update is_read" on postings
  for update using (auth.role() = 'authenticated');

-- postings insert/upsert는 service_role 키(ingest API)로만 — RLS가 기본 차단하므로 별도 정책 불필요
```

- [ ] **Step 2: 사용자에게 실행 요청**

Supabase 대시보드 → SQL Editor에 `supabase/schema.sql` 내용을 붙여넣고 실행해달라고 요청. 완료 확인 받기.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: profiles/postings 테이블 스키마 추가"
```

---

## Task 3: Supabase client 헬퍼 + 라우트 보호 미들웨어

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/service-client.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: Task 1의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `createClient()` (browser, `lib/supabase/client.ts`), `createClient()` (server, `lib/supabase/server.ts`, `async`), `createServiceClient()` (`lib/supabase/service-client.ts`) — Task 5(ingest)가 `createServiceClient`를 씀. Task 4·6·7이 server/client `createClient`를 씀.

- [ ] **Step 1: 브라우저 클라이언트**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: 서버 클라이언트 (Server Component / Server Action용)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 — 세션 갱신은 middleware가 담당
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: service-role 클라이언트 (RLS 우회, ingest API 전용)**

```typescript
// lib/supabase/service-client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 4: `/me/*` 보호 미들웨어**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/me')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/me/:path*'],
}
```

- [ ] **Step 5: 빌드 확인 (테스트 프레임워크 없는 페이지/미들웨어라 빌드 통과로 검증)**

Run: `npm run build`
Expected: 에러 없이 빌드 성공 (아직 `/me`, `/login` 라우트가 없으므로 미들웨어 matcher는 존재해도 대상 라우트 없음 — 정상)

- [ ] **Step 6: Commit**

```bash
git add lib/supabase middleware.ts
git commit -m "feat: Supabase client 헬퍼와 /me 보호 미들웨어 추가"
```

---

## Task 4: 로그인 페이지

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/client.ts` (Task 3).

- [ ] **Step 1: 로그인 폼 작성**

```tsx
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError('로그인 실패: 이메일/비밀번호를 확인해줘.')
      return
    }
    router.push('/me')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-xl font-semibold">로그인</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 3: Commit**

```bash
git add app/login
git commit -m "feat: 로그인 페이지 추가"
```

---

## Task 5: `/api/postings/ingest` 라우트 + 테스트

**Files:**
- Create: `app/api/postings/ingest/route.ts`
- Test: `tests/api/postings-ingest.test.ts`

**Interfaces:**
- Consumes: `createServiceClient` from `lib/supabase/service-client.ts` (Task 3).
- Produces: `POST /api/postings/ingest` — 201(성공)/400(형식 오류)/401(인증 실패)/500(DB 오류).

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/api/postings-ingest.test.ts
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const SERVICE_CLIENT_PATH = '../../lib/supabase/service-client.ts'

function makeRequest(body: unknown, secret?: string) {
  return new Request('http://localhost/api/postings/ingest', {
    method: 'POST',
    headers: secret ? { 'x-ingest-secret': secret } : {},
    body: JSON.stringify(body),
  })
}

const validPosting = {
  title: '2026 AI 창업 멘토링 모집',
  url: 'https://example.com/posting/1',
  source: 'K-스타트업',
  category: 'mentoring',
  summary: '청년 AI 창업팀 대상 1:1 멘토링',
  why_matched: 'AI 창업 준비 조건과 일치',
}

test('secret 헤더 없으면 401', async () => {
  process.env.INGEST_SECRET = 'test-secret'
  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const res = await POST(makeRequest(validPosting))
  assert.equal(res.status, 401)
})

test('secret 틀리면 401', async () => {
  process.env.INGEST_SECRET = 'test-secret'
  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const res = await POST(makeRequest(validPosting, 'wrong-secret'))
  assert.equal(res.status, 401)
})

test('필수 필드 빠지면 400', async () => {
  process.env.INGEST_SECRET = 'test-secret'
  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const { title: _title, ...withoutTitle } = validPosting
  const res = await POST(makeRequest(withoutTitle, 'test-secret'))
  assert.equal(res.status, 400)
})

test('정상 요청이면 201, upsert가 url unique 기준 ignoreDuplicates로 호출됨', async () => {
  process.env.INGEST_SECRET = 'test-secret'

  const upsertCalls: unknown[] = []
  mock.module(SERVICE_CLIENT_PATH, {
    namedExports: {
      createServiceClient: () => ({
        from: (table: string) => {
          assert.equal(table, 'postings')
          return {
            upsert: (row: unknown, opts: unknown) => {
              upsertCalls.push([row, opts])
              return Promise.resolve({ error: null })
            },
          }
        },
      }),
    },
  })

  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const res = await POST(makeRequest(validPosting, 'test-secret'))

  assert.equal(res.status, 201)
  assert.equal(upsertCalls.length, 1)
  const [row, opts] = upsertCalls[0] as [Record<string, unknown>, Record<string, unknown>]
  assert.equal(row.url, validPosting.url)
  assert.deepEqual(opts, { onConflict: 'url', ignoreDuplicates: true })

  mock.reset()
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test`
Expected: FAIL (`app/api/postings/ingest/route.ts` 없음 — 모듈을 찾을 수 없다는 에러)

- [ ] **Step 3: 라우트 구현**

```typescript
// app/api/postings/ingest/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service-client'

const REQUIRED_STRING_FIELDS = [
  'title',
  'url',
  'source',
  'category',
  'summary',
  'why_matched',
] as const

const VALID_CATEGORIES = new Set(['scholarship', 'subsidy', 'mentoring'])

type IngestPosting = {
  title: string
  url: string
  source: string
  category: 'scholarship' | 'subsidy' | 'mentoring'
  summary: string
  why_matched: string
  deadline?: string | null
}

function isValidPosting(body: unknown): body is IngestPosting {
  if (typeof body !== 'object' || body === null) return false
  const record = body as Record<string, unknown>
  const hasRequiredFields = REQUIRED_STRING_FIELDS.every(
    (field) => typeof record[field] === 'string' && record[field] !== ''
  )
  if (!hasRequiredFields) return false
  return VALID_CATEGORIES.has(record.category as string)
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!isValidPosting(body)) {
    return NextResponse.json({ error: 'invalid posting' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('postings').upsert(
    {
      title: body.title,
      url: body.url,
      source: body.source,
      category: body.category,
      summary: body.summary,
      why_matched: body.why_matched,
      deadline: body.deadline ?? null,
    },
    { onConflict: 'url', ignoreDuplicates: true }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test`
Expected: PASS (4개 테스트 모두)

- [ ] **Step 5: Commit**

```bash
git add app/api/postings/ingest tests/api
git commit -m "feat: 지원사업 ingest API 라우트 추가"
```

---

## Task 6: `/me` 대시보드

**Files:**
- Create: `app/me/page.tsx`
- Create: `app/me/actions.ts`

**Interfaces:**
- Consumes: `createClient` (server) from `lib/supabase/server.ts` (Task 3), `postings` 테이블 스키마 (Task 2).
- Produces: `markAsRead(id: string)` server action — 다른 태스크는 안 씀 (이 페이지 안에서만 사용).

- [ ] **Step 1: 읽음 처리 서버 액션**

```typescript
// app/me/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markAsRead(id: string) {
  const supabase = await createClient()
  await supabase.from('postings').update({ is_read: true }).eq('id', id)
  revalidatePath('/me')
}
```

- [ ] **Step 2: 대시보드 페이지**

```tsx
// app/me/page.tsx
import { createClient } from '@/lib/supabase/server'
import { markAsRead } from './actions'

const CATEGORY_LABEL: Record<string, string> = {
  scholarship: '장학금',
  subsidy: '지원금',
  mentoring: '멘토링',
}

export default async function MePage() {
  const supabase = await createClient()
  const { data: postings } = await supabase
    .from('postings')
    .select('*')
    .order('is_read', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false })

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-xl font-semibold">내 지원사업 매칭</h1>
      <ul className="flex flex-col gap-4">
        {(postings ?? []).map((p) => (
          <li
            key={p.id}
            className={`rounded border p-4 ${p.is_read ? 'opacity-60' : ''}`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <span>{CATEGORY_LABEL[p.category] ?? p.category}</span>
              <span>·</span>
              <span>{p.source}</span>
              {p.deadline && (
                <>
                  <span>·</span>
                  <span>마감 {p.deadline}</span>
                </>
              )}
            </div>
            <h2 className="font-medium">{p.title}</h2>
            <p className="mt-1 text-sm text-gray-700">{p.summary}</p>
            <p className="mt-1 text-xs text-gray-500">왜 매칭됐나: {p.why_matched}</p>
            <div className="mt-3 flex gap-3">
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 underline"
              >
                신청하러 가기 ↗
              </a>
              {!p.is_read && (
                <form action={markAsRead.bind(null, p.id)}>
                  <button type="submit" className="text-sm text-gray-500 underline">
                    읽음 처리
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
        {(postings ?? []).length === 0 && (
          <p className="text-sm text-gray-500">아직 매칭된 공고가 없어.</p>
        )}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: Commit**

```bash
git add app/me/page.tsx app/me/actions.ts
git commit -m "feat: /me 대시보드 추가"
```

---

## Task 7: `/me/profile` 조건 편집 폼

**Files:**
- Create: `app/me/profile/page.tsx`
- Create: `app/me/profile/actions.ts`

**Interfaces:**
- Consumes: `createClient` (server) from `lib/supabase/server.ts` (Task 3), `profiles` 테이블 스키마 (Task 2).

- [ ] **Step 1: 프로필 저장 서버 액션**

```typescript
// app/me/profile/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').upsert({
    user_id: user.id,
    age: Number(formData.get('age')) || null,
    is_care_leaver: formData.get('is_care_leaver') === 'on',
    is_basic_livelihood: formData.get('is_basic_livelihood') === 'on',
    interests: String(formData.get('interests') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/me/profile')
}
```

- [ ] **Step 2: 프로필 편집 페이지**

```tsx
// app/me/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { saveProfile } from './actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
    : { data: null }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-xl font-semibold">매칭 조건</h1>
      <form action={saveProfile} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          나이
          <input
            type="number"
            name="age"
            defaultValue={profile?.age ?? ''}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_care_leaver"
            defaultChecked={profile?.is_care_leaver ?? false}
          />
          자립준비청년 / 보호종료아동
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_basic_livelihood"
            defaultChecked={profile?.is_basic_livelihood ?? false}
          />
          기초생활수급자
        </label>
        <label className="flex flex-col gap-1 text-sm">
          관심분야
          <input
            type="text"
            name="interests"
            defaultValue={profile?.interests ?? ''}
            placeholder="예: AI 창업, 소프트웨어 개발"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          기타 조건
          <textarea
            name="notes"
            defaultValue={profile?.notes ?? ''}
            className="rounded border px-3 py-2"
            rows={3}
          />
        </label>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          저장
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: Commit**

```bash
git add app/me/profile
git commit -m "feat: 매칭 조건 편집 페이지 추가"
```

---

## Task 8: 5일 주기 예약 루틴 등록

**Files:** 없음 (코드 변경 아님 — `schedule` 스킬로 클라우드 루틴 등록하는 운영 작업)

**Interfaces:**
- Consumes: Task 5의 `POST /api/postings/ingest` (배포된 URL 필요 — Vercel 배포 후 도메인), Task 1의 `INGEST_SECRET` 값.

- [ ] **Step 1: 선행 조건 확인**

Task 1~7이 모두 `git push origin main`으로 배포돼 있어야 함 (ingest API가 실제로 떠 있어야 루틴이 호출 가능). 배포 안 됐으면 먼저 push.

- [ ] **Step 2: `schedule` 스킬로 루틴 생성**

`schedule` 스킬을 호출해서 5일 주기(cron 예: `0 9 */5 * *`) 루틴을 만든다. 루틴 프롬프트에 아래 내용을 그대로 담는다:

```
너는 hyetaek-hub(꿀머니)의 지원사업 매칭 루틴이야. 목표: Sion(17세, 자립준비청년/
보호종료아동, 기초생활수급자, AI 창업 준비 중)에게 맞는 새로운 장학금·지원금·
멘토링 공고를 찾아서 알려주는 것.

1. 아래 대형 집계 사이트를 WebSearch/WebFetch로 훑어서 최근 5일 내 새로 올라온
   공고가 있는지 확인: 보조금24(gov.kr), 복지로(bokjiro.go.kr), 한국장학재단
   (kosaf.go.kr), 장학쌤(janghakssam.com), 드림스폰(dreamspon.com), 자립정보ON
   (보건복지부 자립지원 포털), 온통청소년(youth.go.kr), K-스타트업(k-startup.go.kr).
2. 추가로 아래 카테고리 x 조건 조합으로 WebSearch 쿼리를 여러 개 실행해서 위
   목록에 없는 새 공고도 찾아: (장학금|지원금|멘토링|창업지원) x (자립준비청년|
   보호종료아동|기초생활수급자|청소년|AI 창업). 검색 시점 기준 최근 1~2주 내
   공고 위주로.
3. 찾은 공고 중 Sion의 조건(위 프로필)에 실제로 해당하는 것만 골라. 애매하면
   제외하지 말고 포함하되 왜 매칭되는지 명확히 적어.
4. 관련 있는 공고마다 아래 형식으로 POST https://<배포 도메인>/api/postings/ingest
   호출 (헤더 x-ingest-secret: <INGEST_SECRET 값>):

{
  "title": "...",
  "url": "...",
  "source": "...",
  "category": "scholarship | subsidy | mentoring 중 하나",
  "summary": "2~3문장 요약",
  "why_matched": "Sion의 어떤 조건과 왜 맞는지 한 줄",
  "deadline": "YYYY-MM-DD 또는 null"
}

5. 이미 등록된 공고(같은 url)는 서버가 알아서 무시하니 중복 여부 스스로 판단할
   필요 없음 — 관련 있어 보이면 그냥 보내.
6. 실행 결과(몇 건 찾아서 보냈는지)를 한 줄로 요약해서 남겨.
```

`<배포 도메인>`과 `<INGEST_SECRET 값>`은 루틴 등록 시 실제 값으로 채워 넣는다.

- [ ] **Step 3: 수동 1회 실행으로 검증**

루틴을 한 번 수동 트리거해서 `/me` 대시보드에 새 공고가 뜨는지 확인. 401/400 에러 없이 ingest가 성공하는지 확인.

- [ ] **Step 4: 알려진 한계 기록**

`INGEST_SECRET`이 루틴 설정(프롬프트)에 평문으로 저장됨 — 1인 전용 단계라 허용, 나중에 다른 사용자에게 여는 시점엔 루틴별 시크릿 관리 방식으로 교체 필요. (커밋할 코드는 없음 — 이 계획 문서에 한계로 남겨둠.)

---

## Self-Review 체크리스트 (참고용, 실행 전 확인됨)

- 스펙의 모든 섹션(아키텍처, 컴포넌트 4개, 에러 처리, 테스트, 범위 밖)이 Task 1~8에 대응됨.
- 플레이스홀더 없음 — 모든 스텝에 실제 코드/SQL/프롬프트 포함.
- 타입/함수명 일관성: `createClient`(client.ts, server.ts) vs `createServiceClient`(service-client.ts) 이름 충돌 없이 태스크 전체에서 동일하게 사용됨. `markAsRead`, `saveProfile` 각 파일 내부에서만 쓰이고 다른 태스크가 import 안 함 — 이름 불일치 리스크 없음.
