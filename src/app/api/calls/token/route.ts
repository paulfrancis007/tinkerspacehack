import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AccessToken } from 'livekit-server-sdk'



export async function POST(request: Request) {
  // Same-origin check
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const expectedOrigin = process.env.APP_ORIGIN || `http://${host}`
  
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ error: 'Unauthorized origin' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body;
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { callId } = body
  if (!callId) {
    return NextResponse.json({ error: 'Missing callId' }, { status: 400 })
  }

  // Get payload (enforces quota, active status, auth)
  const { data: payload, error } = await supabase.rpc('get_call_token_payload', { p_call_id: callId })
  if (error || !payload) {
    return NextResponse.json({ error: error?.message || 'Failed to get token payload' }, { status: 403 })
  }

  const { room_name, kind } = payload

  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  // Generate 60s join token
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: String(user.id),
    ttl: 60,
  })

  at.addGrant({
    roomJoin: true,
    room: room_name,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources: (kind === 'video' 
      ? ['camera', 'microphone', 'screen_share', 'screen_share_audio'] 
      : ['microphone']) as any,
    roomAdmin: false
  })

  const token = await at.toJwt()

  // No caching!
  return NextResponse.json({ token, room: room_name }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}
