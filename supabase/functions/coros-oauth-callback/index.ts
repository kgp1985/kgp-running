/**
 * coros-oauth-callback
 *
 * OAuth 2.0: Exchange the authorization code for access + refresh tokens
 * and save to watch_connections.
 *
 * Required Supabase secrets:
 *   COROS_CLIENT_ID, COROS_CLIENT_SECRET, APP_URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const COROS_TOKEN_URL    = 'https://open.coros.com/oauth2/accesstoken'
const COROS_PROFILE_URL  = 'https://open.coros.com/user/detail'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body        = await req.json()
    const code        = body.code  as string
    const state       = body.state as string

    const clientId     = Deno.env.get('COROS_CLIENT_ID')     ?? ''
    const clientSecret = Deno.env.get('COROS_CLIENT_SECRET') ?? ''
    const appUrl       = Deno.env.get('APP_URL')             ?? ''
    const redirectUri  = `${appUrl}/profile?coros_callback=1`

    // Decode state to get userId
    const stateData = JSON.parse(atob(state))
    const userId    = stateData.userId as string

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid state' }), { status: 400, headers: corsHeaders })
    }

    // Exchange code for tokens
    const tokenRes = await fetch(COROS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'Token exchange failed', detail: tokenData }), {
        status: 502, headers: corsHeaders,
      })
    }

    const accessToken   = tokenData.access_token  as string
    const refreshToken  = tokenData.refresh_token as string
    const expiresIn     = Number(tokenData.expires_in ?? 3600)
    const expiresAt     = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Fetch Coros user ID
    const profileRes = await fetch(COROS_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profileData  = await profileRes.json()
    const corosUserId  = String(profileData?.data?.openId ?? profileData?.openId ?? userId)

    // Save tokens via service role
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    await serviceClient.from('watch_connections').upsert({
      user_id:          userId,
      provider:         'coros',
      provider_user_id: corosUserId,
      access_token:     accessToken,
      refresh_token:    refreshToken,
      token_expires_at: expiresAt,
    }, { onConflict: 'user_id, provider' })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
