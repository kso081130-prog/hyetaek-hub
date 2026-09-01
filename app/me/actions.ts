'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function markAsRead(id: string) {
  const supabase = await createClient()
  await supabase.from('postings').update({ is_read: true }).eq('id', id)
  revalidatePath('/me')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
