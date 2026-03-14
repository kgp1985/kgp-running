/**
 * garmin-oauth-callback
 *
 * OAuth 1.0a Step 2: Exchange the request token + verifier for a permanent
 * access token and save it to watch_connections.
 *
 * Required Supabase secrets:
 *   GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GARMIN_ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token'

function oauthHeader(params: Record<string, string>): string {
  return 'OAuth ' + Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')
}

function buildBaseString(method: string, url: string, params: Record<string, string>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return [method, encodeURIComponent(url), encodeURIComponent(sorted)].join('&')
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body           = await req.json()
    const oauthToken     = body.oauth_token    as string
    const oauthVerifier  = body.oauth_verifier as string

    const consumerKey    = Deno.env.get('GARMIN_CONSUMER_KEY')    ?? ''
    const consumerSecret = Deno.env.get('GARMIN_CONSUMER_SECRET') ?? ''

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

    // Exchange request token for access token
    const oauthParams: Record<string, string> = {
      oauth_consumer_key:     consumerKey,
      oauth_nonce:            crypto.randomUUID().replace(/-/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
      oauth_token:            oauthToken,
      oauth_verifier:         oauthVerifier,
      oauth_version:          '1.0',
    }

    const baseString = buildBaseString('POST', GARMIN_ACCESS_TOKEN_URL, oauthParams)
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthToken)}`
    const signature  = btoa(String.fromCharCode(...new Uint8Array(
      await crypto.subtle.sign('HMAC', await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(signingKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
      ), new TextEncoder().encode(baseString))
    )))
    oauthParams.oauth_signature = signature

    const tokenRes  = await fetch(GARMIN_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: oauthHeader(oauthParams) },
    })
    const tokenBody = await tokenRes.text()
    const params    = new URLSearchParams(tokenBody)
    const accessToken      = params.get('oauth_token')        ?? ''
    const accessSecret     = params.get('oauth_token_secret') ?? ''
    const garminUserId     = params.get('user_id')            ?? ''

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Failed to get access token', detail: tokenBody }), {
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
      provider:         'garmin',
      provider_user_id: garminUserId,
      access_token:     accessToken,
      token_secret:     accessSecret,
    }, { onConflict: 'user_id, provider' })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
