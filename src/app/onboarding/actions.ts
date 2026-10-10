'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveProfile(formData: FormData) {
  const displayName = formData.get('display_name') as string
  const avatarSeed = formData.get('avatar_seed') as string
  const bio = formData.get('bio') as string
  const interestsRaw = formData.get('interests') as string
  const isAdult = formData.get('is_adult') === 'on'

  const interests = interestsRaw 
    ? interestsRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5) 
    : []

  if (!isAdult) {
    return { error: 'You must attest to being 18 or older to use SIDEQUEST.' }
  }

  const supabase = await createClient()

  // Use the RPC we created
  const { error } = await supabase.rpc('save_profile', {
    p_display_name: displayName,
    p_avatar_seed: avatarSeed,
    p_bio: bio,
    p_interests: interests,
    p_adult_attested: isAdult
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
