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

test('url이 http(s)가 아니면 400', async () => {
  process.env.INGEST_SECRET = 'test-secret'
  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const res = await POST(
    makeRequest({ ...validPosting, url: 'javascript:alert(1)' }, 'test-secret')
  )
  assert.equal(res.status, 400)
})

test('deadline이 문자열/null이 아니면 400', async () => {
  process.env.INGEST_SECRET = 'test-secret'
  const { POST } = await import('../../app/api/postings/ingest/route.ts')
  const res = await POST(
    makeRequest({ ...validPosting, deadline: 12345 }, 'test-secret')
  )
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
