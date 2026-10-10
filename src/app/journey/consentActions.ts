'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestConnection(recipientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('request_connection', { p_recipient_id: recipientId })
  if (error) return { error: error.message }
  return { success: true, conversationId: data }
}

export async function respondConnection(conversationId: string, accept: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('respond_connection', { p_conversation_id: conversationId, p_accept: accept })
  if (error) return { error: error.message }
  return { success: true }
}

export async function revokeConnection(conversationId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('revoke_connection', { p_conversation_id: conversationId })
  if (error) return { error: error.message }
  return { success: true }
}

export async function blockUser(targetId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('block_user', { p_target_id: targetId })
  if (error) return { error: error.message }
  return { success: true }
}

export async function reportTarget(targetType: string, targetId: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('report_target', { 
    p_target_type: targetType, 
    p_target_id: targetId, 
    p_reason: reason 
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function requestCall(conversationId: string, kind: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('request_call', { p_conversation_id: conversationId, p_kind: kind, p_nonce: crypto.randomUUID() })
  if (error) return { error: error.message }
  return { success: true, callId: data }
}

