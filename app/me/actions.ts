'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markAsRead(id: string) {
  const supabase = await createClient()
  await supabase.from('postings').update({ is_read: true }).eq('id', id)
  revalidatePath('/me')
}
