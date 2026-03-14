/**
 * garmin-webhook
 *
 * Receives activity summary pushes from Garmin Health API.
 * Garmin POSTs to this URL after every activity syncs to Garmin Connect.
 *
 * Register this URL in the Garmin Health API developer portal as your
 * "Activity Details" callback URL.
 *
 * Payload reference:
 * https://developer.garmin.com/health-api/reference/#operation/getActivityDetails
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'GET') {
    // Garmin sends a GET ping to verify the webhook endpoint during registration
    return new Response('OK', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()

    // Garmin wraps activities in an array under "activityDetails"
    const activities: any[] = body.activityDetails ?? []

    if (activities.length === 0) {
      return new Response('No activities', { status: 200 })
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    for (const activity of activities) {
      const summary = activity.summary ?? activity
      const garminUserId = String(summary.userId ?? activity.userId ?? '')

      if (!garminUserId) continue

      // Look up which KGP user owns this Garmin account
      const { data: conn } = await serviceClient
        .from('watch_connections')
        .select('user_id')
        .eq('provider', 'garmin')
        .eq('provider_user_id', garminUserId)
        .maybeSingle()

      if (!conn) continue  // Unknown Garmin user — ignore

      // Parse activity fields
      const distanceMeters  = Number(summary.distanceInMeters ?? 0)
      const durationSeconds = Number(summary.durationInSeconds ?? 0)
      const heartRate       = summary.averageHeartRateInBeatsPerMinute
        ? Number(summary.averageHeartRateInBeatsPerMinute)
        : null
      const startTime       = summary.startTimeInSeconds
        ? new Date(Number(summary.startTimeInSeconds) * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const externalId      = String(summary.activityId ?? activity.activityId ?? '')

      if (distanceMeters < 100 || durationSeconds < 60) continue  // Skip trivial entries

      await serviceClient.from('pending_runs').upsert({
        user_id:          conn.user_id,
        provider:         'garmin',
        external_id:      externalId,
        date:             startTime,
        distance_meters:  distanceMeters,
        duration_seconds: durationSeconds,
        heart_rate:       heartRate,
        status:           'pending',
        raw_data:         summary,
      }, { onConflict: 'provider, external_id', ignoreDuplicates: true })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('garmin-webhook error:', err)
    return new Response('Error', { status: 500 })
  }
})
