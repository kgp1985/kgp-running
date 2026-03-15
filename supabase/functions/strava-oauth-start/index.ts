/**
 * strava-oauth-start
 *
 * OAuth 2.0 Step 1: Build the Strava authorization URL and return it
 * so the client can redirect the user.
 *
 * Required Supabase secrets:
 *   STRAVA_CLIENT_ID
 *   APP_URL  (e.g. https://kgp-running.vercel.app)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize'

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

    const clientId   = Deno.env.get('STRAVA_CLIENT_ID') ?? ''
    const appUrl     = Deno.env.get('APP_URL') ?? ''
    const redirectUri = `${appUrl}/profile?strava_callback=1`

    const params = new URLSearchParams({
      client_id:       clientId,
      response_type:   'code',
      redirect_uri:    redirectUri,
      approval_prompt: 'auto',
      scope:           'activity:read_all',
    })

    const authUrl = `${STRAVA_AUTHORIZE_URL}?${params.toString()}`

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
