// app/api/postings/ingest/route.ts
import { NextResponse } from 'next/server'

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
  if (!VALID_CATEGORIES.has(record.category as string)) return false
  if (!/^https?:\/\//i.test(record.url as string)) return false
  if (record.deadline !== undefined && record.deadline !== null && typeof record.deadline !== 'string') {
    return false
  }
  return true
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

  const { createServiceClient } = await import('@/lib/supabase/service-client')
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
