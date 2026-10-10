'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function joinJourney(formData: FormData) {
  const mode = formData.get('mode') as string
  const operatorCode = formData.get('operator_code') as string
  const serviceNumber = formData.get('service_number') as string
  const serviceDate = formData.get('service_date') as string
  const originCode = formData.get('origin_code') as string
  const destCode = formData.get('destination_code') as string
  const originLabel = formData.get('origin_label') as string
  const destLabel = formData.get('destination_label') as string
  
  if (!mode || !operatorCode || !serviceNumber || !serviceDate || !originCode || !destCode) {
    return { error: 'Please fill out all required fields.' }
  }

  // Basic native date generation
  const start = new Date(`${serviceDate}T00:00:00Z`)
  const startsAt = start.toISOString()
  
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const endsAt = end.toISOString()

  const supabase = await createClient()

  const { error } = await supabase.rpc('join_journey', {
    p_mode: mode,
    p_operator_code: operatorCode,
    p_service_number: serviceNumber,
    p_service_date: serviceDate,
    p_origin_code: originCode,
    p_destination_code: destCode,
    p_origin_label: originLabel || originCode,
    p_destination_label: destLabel || destCode,
    p_timezone: 'UTC',
    p_starts_at: startsAt,
    p_ends_at: endsAt
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/journey')
  redirect('/journey')
}

export async function leaveJourney(journeyId: string) {
  const supabase = await createClient()
  await supabase.rpc('leave_journey', { p_journey_id: journeyId })
  revalidatePath('/journey')
  redirect('/dashboard')
}

export async function updateMembership(journeyId: string, discoverable: boolean, loungeConsent: boolean, socialMode: string) {
  const supabase = await createClient()
  await supabase.rpc('update_membership', {
    p_journey_id: journeyId,
    p_discoverable: discoverable,
    p_lounge_consent: loungeConsent,
    p_social_mode: socialMode
  })
}
