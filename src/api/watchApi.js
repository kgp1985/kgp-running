import { supabase } from '../lib/supabaseClient.js'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co/functions/v1') ?? ''

async function callEdgeFunction(name, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Edge function ${name} failed with ${res.status}`)
  }
  return res.json()
}

// ── Garmin ────────────────────────────────────────────────────────────────────

/**
 * Start Garmin OAuth: get authorization URL from Edge Function and redirect.
 */
export async function connectGarmin() {
  const { authUrl } = await callEdgeFunction('garmin-oauth-start')
  window.location.href = authUrl
}

/**
 * Complete Garmin OAuth callback after redirect back from Garmin.
 * Call this when the URL contains ?garmin_callback=1&oauth_token=...&oauth_verifier=...
 */
export async function completeGarminCallback(oauthToken, oauthVerifier) {
  return callEdgeFunction('garmin-oauth-callback', { oauth_token: oauthToken, oauth_verifier: oauthVerifier })
}

// ── Coros ─────────────────────────────────────────────────────────────────────

/**
 * Start Coros OAuth: get authorization URL and redirect.
 */
export async function connectCoros() {
  const { authUrl } = await callEdgeFunction('coros-oauth-start')
  window.location.href = authUrl
}

/**
 * Complete Coros OAuth callback.
 * Call when URL contains ?coros_callback=1&code=...&state=...
 */
export async function completeCorosCallback(code, state) {
  return callEdgeFunction('coros-oauth-callback', { code, state })
}

// ── Strava ────────────────────────────────────────────────────────────────────

/**
 * Start Strava OAuth: get authorization URL from Edge Function and redirect.
 */
export async function connectStrava() {
  const { authUrl } = await callEdgeFunction('strava-oauth-start')
  window.location.href = authUrl
}

/**
 * Complete Strava OAuth callback after redirect back from Strava.
 * Call when URL contains ?strava_callback=1&code=...
 */
export async function completeStravaCallback(code) {
  return callEdgeFunction('strava-oauth-callback', { code })
}

// ── Watch Connections ─────────────────────────────────────────────────────────

export async function fetchWatchConnections(userId) {
  const { data, error } = await supabase
    .from('watch_connections')
    .select('provider, provider_user_id, created_at')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function disconnectWatch(userId, provider) {
  const { error } = await supabase
    .from('watch_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)

  if (error) throw error
}
