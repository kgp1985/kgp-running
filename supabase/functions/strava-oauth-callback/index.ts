/**
 * strava-oauth-callback
 *
 * OAuth 2.0 Step 2: Exchange the authorization code for access + refresh tokens,
 * fetch the athlete profile, and save the connection to watch_connections.
 *
 * Required Supabase secrets:
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   APP_URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body     = await req.json()
    const code     = body.code as string
    const appUrl   = Deno.env.get('APP_URL') ?? ''

    // Exchange code for tokens
    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        code,
        grant_type:    'authorization_code',
        redirect_uri:  `${appUrl}/profile?strava_callback=1`,
      }),
    })

    if (!tokenRes.ok) {
      const detail = await tokenRes.text()
      return new Response(JSON.stringify({ error: 'Token exchange failed', detail }), {
        status: 502, headers: corsHeaders,
      })
    }

    const tokenData  = await tokenRes.json()
    const accessToken  = tokenData.access_token  as string
    const refreshToken = tokenData.refresh_token as string
    const expiresAt    = tokenData.expires_at    as number // unix timestamp
    const athlete      = tokenData.athlete
    const stravaUserId = String(athlete?.id ?? '')

    if (!accessToken || !stravaUserId) {
      return new Response(JSON.stringify({ error: 'Invalid token response from Strava' }), {
        status: 502, headers: corsHeaders,
      })
    }

    // Save to watch_connections via service role (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    await serviceClient.from('watch_connections').upsert({
      user_id:          user.id,
      provider:         'strava',
      provider_user_id: stravaUserId,
      access_token:     accessToken,
      refresh_token:    refreshToken,
      token_expires_at: new Date(expiresAt * 1000).toISOString(),
    }, { onConflict: 'user_id, provider' })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
