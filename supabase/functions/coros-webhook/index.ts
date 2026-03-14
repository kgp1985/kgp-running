/**
 * coros-webhook
 *
 * Receives activity push notifications from Coros Open API.
 * Register this URL in the Coros developer portal as your webhook endpoint.
 *
 * Coros sends a POST with workout data after each activity syncs.
 * API reference: https://open.coros.com/
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'GET') {
    // Verification ping from Coros
    return new Response('OK', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()

    // Coros wraps data in a "data" array
    const activities: any[] = Array.isArray(body.data)
      ? body.data
      : Array.isArray(body) ? body : [body]

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    for (const activity of activities) {
      const corosUserId = String(activity.openId ?? activity.userId ?? '')
      if (!corosUserId) continue

      // Look up KGP user
      const { data: conn } = await serviceClient
        .from('watch_connections')
        .select('user_id')
        .eq('provider', 'coros')
        .eq('provider_user_id', corosUserId)
        .maybeSingle()

      if (!conn) continue

      // Coros distances are in meters
      const distanceMeters  = Number(activity.distance ?? 0)
      const durationSeconds = Number(activity.totalTime ?? activity.duration ?? 0)
      const heartRate       = activity.avgHr ? Number(activity.avgHr) : null
      const externalId      = String(activity.sportDataId ?? activity.workoutId ?? activity.id ?? '')

      // Coros timestamps are Unix epoch seconds
      const startDate = activity.startTime
        ? new Date(Number(activity.startTime) * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      if (distanceMeters < 100 || durationSeconds < 60) continue

      await serviceClient.from('pending_runs').upsert({
        user_id:          conn.user_id,
        provider:         'coros',
        external_id:      externalId,
        date:             startDate,
        distance_meters:  distanceMeters,
        duration_seconds: durationSeconds,
        heart_rate:       heartRate,
        status:           'pending',
        raw_data:         activity,
      }, { onConflict: 'provider, external_id', ignoreDuplicates: true })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('coros-webhook error:', err)
    return new Response('Error', { status: 500 })
  }
})
