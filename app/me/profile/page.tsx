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
    <div className="mx-auto max-w-sm px-4 py-12">
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
    </div>
  )
}
