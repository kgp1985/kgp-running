/**
 * coros-oauth-start
 *
 * OAuth 2.0: Build and return the Coros authorization URL.
 *
 * Required Supabase secrets:
 *   COROS_CLIENT_ID
 *   APP_URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const COROS_AUTH_URL = 'https://open.coros.com/oauth2/authorize'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const clientId   = Deno.env.get('COROS_CLIENT_ID') ?? ''
    const appUrl     = Deno.env.get('APP_URL')         ?? ''
    const redirectUri = `${appUrl}/profile?coros_callback=1`

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Generate state param to verify on callback (store userId)
    const state = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }))

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: 'code',
      scope:         'activity',
      state,
    })

    const authUrl = `${COROS_AUTH_URL}?${params.toString()}`
    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
