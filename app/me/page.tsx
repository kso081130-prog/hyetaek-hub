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
