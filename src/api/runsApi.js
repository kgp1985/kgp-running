import { supabase } from '../lib/supabaseClient.js'

// Convert DB snake_case row → camelCase UI object
function dbRunToRun(row) {
  return {
    id:                 row.id,
    createdAt:          row.created_at,
    date:               row.date,           // 'YYYY-MM-DD'
    distance:           Number(row.distance),
    distanceUnit:       row.distance_unit,
    duration:           row.duration,       // seconds
    heartRate:          row.heart_rate,
    workoutType:        row.workout_type,
    weather:            row.weather ?? '',
    notes:              row.notes ?? '',
    isPublic:           row.is_public,
    subtitle:           row.subtitle ?? '',
    shoeId:             row.shoe_id ?? null,
    repsCount:          row.reps_count ?? null,
    repDistanceMeters:  row.rep_distance_meters ?? null,
    restSeconds:        row.rest_seconds ?? null,
  }
}

// Convert camelCase UI object → DB snake_case insert shape
function runToDbInsert(userId, runData) {
  return {
    user_id:              userId,
    date:                 runData.date,
    distance:             runData.distance,
    distance_unit:        runData.distanceUnit ?? 'mi',
    duration:             runData.duration,
    heart_rate:           runData.heartRate ?? null,
    workout_type:         runData.workoutType ?? 'easy',
    weather:              runData.weather || null,
    notes:                runData.notes || null,
    is_public:            runData.isPublic ?? false,
    subtitle:             runData.subtitle || null,
    shoe_id:              runData.shoeId || null,
    reps_count:           runData.repsCount ?? null,
    rep_distance_meters:  runData.repDistanceMeters ?? null,
    rest_seconds:         runData.restSeconds ?? null,
  }
}

// Fetch all runs for the signed-in user, newest first
export async function fetchRuns(userId) {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbRunToRun)
}

// Fetch only public runs for a given user (used for Coach Log by non-owner visitors)
export async function fetchPublicRunsForUser(userId) {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbRunToRun)
}

// Fetch ALL runs for the owner (used when Kyle views his own Coach Log)
export async function fetchAllRunsForOwner(userId) {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbRunToRun)
}

export async function insertRun(userId, runData) {
  const { data, error } = await supabase
    .from('runs')
    .insert(runToDbInsert(userId, runData))
    .select()
    .single()

  if (error) throw error
  return dbRunToRun(data)
}

export async function deleteRun(runId) {
  const { error } = await supabase
    .from('runs')
    .delete()
    .eq('id', runId)

  if (error) throw error
}

export async function updateRun(runId, updates) {
  const dbUpdates = {}
  if (updates.date               !== undefined) dbUpdates.date                 = updates.date
  if (updates.distance           !== undefined) dbUpdates.distance             = updates.distance
  if (updates.distanceUnit       !== undefined) dbUpdates.distance_unit        = updates.distanceUnit
  if (updates.duration           !== undefined) dbUpdates.duration             = updates.duration
  if (updates.heartRate          !== undefined) dbUpdates.heart_rate           = updates.heartRate
  if (updates.workoutType        !== undefined) dbUpdates.workout_type         = updates.workoutType
  if (updates.weather            !== undefined) dbUpdates.weather              = updates.weather
  if (updates.notes              !== undefined) dbUpdates.notes                = updates.notes
  if (updates.isPublic           !== undefined) dbUpdates.is_public            = updates.isPublic
  if (updates.subtitle           !== undefined) dbUpdates.subtitle             = updates.subtitle
  if (updates.shoeId             !== undefined) dbUpdates.shoe_id              = updates.shoeId
  if (updates.repsCount          !== undefined) dbUpdates.reps_count           = updates.repsCount
  if (updates.repDistanceMeters  !== undefined) dbUpdates.rep_distance_meters  = updates.repDistanceMeters
  if (updates.restSeconds        !== undefined) dbUpdates.rest_seconds         = updates.restSeconds

  const { data, error } = await supabase
    .from('runs')
    .update(dbUpdates)
    .eq('id', runId)
    .select()
    .single()

  if (error) throw error
  return dbRunToRun(data)
}
