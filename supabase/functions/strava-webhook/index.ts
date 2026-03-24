/**
 * strava-webhook
 *
 * Handles two request types from Strava:
 *
 *   GET  — Webhook subscription verification (hub challenge)
 *   POST — Activity event push (new run created by any connected user)
 *
 * Required Supabase secrets:
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   STRAVA_WEBHOOK_VERIFY_TOKEN  (any string you choose, used once during setup)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE  = 'https://www.strava.com/api/v3'
const METERS_TO_FEET   = 3.28084

/** Refresh an expired Strava access token and update watch_connections. */
async function refreshStravaToken(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const data = await res.json()

  // Persist refreshed tokens
  await serviceClient.from('watch_connections').update({
    access_token:     data.access_token,
    refresh_token:    data.refresh_token,
    token_expires_at: new Date(data.expires_at * 1000).toISOString(),
  }).eq('user_id', userId).eq('provider', 'strava')

  return data.access_token as string
}

serve(async (req) => {
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── GET: Strava webhook subscription verification ─────────────────────────
  if (req.method === 'GET') {
    const url          = new URL(req.url)
    const mode         = url.searchParams.get('hub.mode')
    const challenge    = url.searchParams.get('hub.challenge')
    const verifyToken  = url.searchParams.get('hub.verify_token')
    const expectedToken = Deno.env.get('STRAVA_WEBHOOK_VERIFY_TOKEN') ?? ''

    if (mode === 'subscribe' && verifyToken === expectedToken && challenge) {
      return new Response(JSON.stringify({ 'hub.challenge': challenge }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // ── POST: Activity event from Strava ──────────────────────────────────────
  if (req.method === 'POST') {
    const event = await req.json()

    // Only process new run/activity creations
    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      return new Response('ok', { status: 200 })
    }

    const activityId    = event.object_id  as number
    const stravaOwnerId = String(event.owner_id)

    try {
      // Look up the user in watch_connections by Strava athlete ID
      const { data: conn, error: connErr } = await serviceClient
        .from('watch_connections')
        .select('user_id, access_token, refresh_token, token_expires_at')
        .eq('provider', 'strava')
        .eq('provider_user_id', stravaOwnerId)
        .single()

      if (connErr || !conn) {
        console.error('No watch connection found for Strava user', stravaOwnerId)
        return new Response('ok', { status: 200 })
      }

      // Refresh token if expired
      let accessToken = conn.access_token
      if (conn.token_expires_at) {
        const expiresAt = new Date(conn.token_expires_at).getTime()
        if (Date.now() >= expiresAt - 60_000) {
          accessToken = await refreshStravaToken(serviceClient, conn.user_id, conn.refresh_token)
        }
      }

      // Fetch full activity details from Strava API
      const actRes = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!actRes.ok) {
        console.error('Failed to fetch Strava activity', activityId, await actRes.text())
        return new Response('ok', { status: 200 })
      }

      const activity = await actRes.json()

      // Only process runs (not rides, swims, etc.)
      const actType = (activity.sport_type ?? activity.type ?? '').toLowerCase()
      if (!['run', 'trailrun', 'virtualrun'].includes(actType)) {
        return new Response('ok', { status: 200 })
      }

      const distanceMeters  = Number(activity.distance ?? 0)
      const durationSeconds = Number(activity.moving_time ?? 0)
      const avgHr           = activity.average_heartrate ? Math.round(activity.average_heartrate) : null
      const elevMeters      = activity.total_elevation_gain ? Number(activity.total_elevation_gain) : null
      const elevFeet        = elevMeters !== null ? Math.round(elevMeters * METERS_TO_FEET) : null
      const startDate       = activity.start_date_local
        ? new Date(activity.start_date_local).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      if (distanceMeters < 100 || durationSeconds < 60) {
        return new Response('ok', { status: 200 }) // too short
      }

      // Insert into pending_runs (ignore duplicates)
      // NOTE: activity.splits_standard is available for future per-mile extraction
      // extractMileSplitsFromStrava(activity.splits_standard) returns DB-ready split objects
      await serviceClient.from('pending_runs').upsert({
        user_id:              conn.user_id,
        provider:             'strava',
        external_id:          String(activityId),
        date:                 startDate,
        distance_meters:      distanceMeters,
        duration_seconds:     durationSeconds,
        heart_rate:           avgHr,
        elevation_gain_feet:  elevFeet,
        status:               'pending',
        raw_data:             activity,
      }, { onConflict: 'provider, external_id', ignoreDuplicates: true })

    } catch (err) {
      console.error('strava-webhook error:', err)
    }

    return new Response('ok', { status: 200 })
  }

  return new Response('Method not allowed', { status: 405 })
})
