'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirect_to') as string) || '/dashboard'

  // Validate that the redirect destination is a relative path to prevent open redirect vulnerabilities
  const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/dashboard'

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Return error message for the client to display
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(safeRedirectTo)
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
