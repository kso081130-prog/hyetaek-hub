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
