import { supabase } from '../lib/supabaseClient.js'

function dbPendingRunToPendingRun(row) {
  return {
    id:              row.id,
    userId:          row.user_id,
    provider:        row.provider,        // 'garmin' | 'coros' | 'fit_file'
    externalId:      row.external_id,
    date:            row.date,
    distanceMeters:  Number(row.distance_meters),
    distanceMiles:   Number(row.distance_meters) / 1609.344,
    durationSeconds: Number(row.duration_seconds),
    heartRate:          row.heart_rate ?? null,
    elevationGainFeet:  row.elevation_gain_feet ?? null,
    status:             row.status,
    createdAt:          row.created_at,
  }
}

export async function fetchPendingRuns(userId) {
  const { data, error } = await supabase
    .from('pending_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('date', { ascending: false })

  if (error) throw error
  return data.map(dbPendingRunToPendingRun)
}

export async function dismissPendingRun(id) {
  const { error } = await supabase
    .from('pending_runs')
    .update({ status: 'dismissed' })
    .eq('id', id)

  if (error) throw error
}

export async function markPendingRunSaved(id) {
  const { error } = await supabase
    .from('pending_runs')
    .update({ status: 'saved' })
    .eq('id', id)

  if (error) throw error
}

/**
 * Insert a pending run created from a .fit file upload.
 * Called client-side after parsing a .fit file.
 */
export async function insertFitFilePendingRun(userId, parsed) {
  const { data, error } = await supabase
    .from('pending_runs')
    .insert({
      user_id:          userId,
      provider:         'fit_file',
      external_id:      null,
      date:             parsed.date,
      distance_meters:  parsed.distanceMeters,
      duration_seconds: parsed.durationSeconds,
      heart_rate:           parsed.heartRate ?? null,
      elevation_gain_feet:  parsed.elevationGainFeet ?? null,
      status:               'pending',
      raw_data:             parsed.rawData ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return dbPendingRunToPendingRun(data)
}
