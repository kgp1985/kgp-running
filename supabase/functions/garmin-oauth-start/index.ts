/**
 * garmin-oauth-start
 *
 * OAuth 1.0a Step 1: Obtain a Garmin request token and return the
 * authorization URL for the user to visit.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   GARMIN_CONSUMER_KEY
 *   GARMIN_CONSUMER_SECRET
 *   APP_URL  (e.g. https://kgp-running.vercel.app)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GARMIN_REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token'
const GARMIN_AUTHORIZE_URL     = 'https://connect.garmin.com/oauthConfirm'

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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const consumerKey    = Deno.env.get('GARMIN_CONSUMER_KEY')    ?? ''
    const consumerSecret = Deno.env.get('GARMIN_CONSUMER_SECRET') ?? ''
    const appUrl         = Deno.env.get('APP_URL')                ?? ''
    const callbackUrl    = `${appUrl}/profile?garmin_callback=1`

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

    // Build OAuth 1.0a request token params
    const oauthParams: Record<string, string> = {
      oauth_callback:         callbackUrl,
      oauth_consumer_key:     consumerKey,
      oauth_nonce:            crypto.randomUUID().replace(/-/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
      oauth_version:          '1.0',
    }

    const baseString = buildBaseString('POST', GARMIN_REQUEST_TOKEN_URL, oauthParams)
    const signingKey = `${encodeURIComponent(consumerSecret)}&`
    const signature  = btoa(String.fromCharCode(...new Uint8Array(
      await crypto.subtle.sign('HMAC', await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(signingKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
      ), new TextEncoder().encode(baseString))
    )))
    oauthParams.oauth_signature = signature

    // Request the token from Garmin
    const tokenRes = await fetch(GARMIN_REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: oauthHeader(oauthParams) },
    })
    const tokenBody = await tokenRes.text()
    const params    = new URLSearchParams(tokenBody)
    const requestToken = params.get('oauth_token') ?? ''

    if (!requestToken) {
      return new Response(JSON.stringify({ error: 'Failed to get request token from Garmin', detail: tokenBody }), {
        status: 502, headers: corsHeaders,
      })
    }

    // Store the request token temporarily (so we can verify on callback)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    await serviceClient.from('user_settings').upsert({
      user_id: user.id,
      garmin_request_token: requestToken,
    }, { onConflict: 'user_id' })

    const authUrl = `${GARMIN_AUTHORIZE_URL}?oauth_token=${requestToken}`
    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
