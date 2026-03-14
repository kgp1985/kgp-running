import { supabase } from '../lib/supabaseClient.js'

/**
 * Fetch the community feed: all public runs from users who have set is_public = true
 * on their profile. Joins profiles for display_name.
 *
 * Returns an array of run objects enriched with:
 *   displayName — the runner's chosen display name (or email fallback)
 *   userId      — the runner's user id (so we can batch-fetch their PRs)
 */
export async function fetchCommunityFeed({ limit = 50, offset = 0 } = {}) {
  // Join runs → profiles via user_id = profiles.id
  // Only include runs where the profile is public AND the run is_public
  const { data, error } = await supabase
    .from('runs')
    .select(`
      id,
      user_id,
      date,
      distance,
      distance_unit,
      duration,
      heart_rate,
      workout_type,
      weather,
      notes,
      subtitle,
      is_public,
      shoe_id,
      reps_count,
      rep_distance_meters,
      rest_seconds,
      created_at,
      profiles!inner (
        id,
        display_name,
        is_public
      )
    `)
    .eq('is_public', true)
    .eq('profiles.is_public', true)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return data.map(row => ({
    id:                 row.id,
    userId:             row.user_id,
    date:               row.date,
    distance:           Number(row.distance),
    distanceUnit:       row.distance_unit,
    duration:           row.duration,
    heartRate:          row.heart_rate,
    workoutType:        row.workout_type,
    weather:            row.weather ?? '',
    notes:              row.notes ?? '',
    subtitle:           row.subtitle ?? '',
    isPublic:           row.is_public,
    shoeId:             row.shoe_id ?? null,
    repsCount:          row.reps_count ?? null,
    repDistanceMeters:  row.rep_distance_meters ?? null,
    restSeconds:        row.rest_seconds ?? null,
    createdAt:          row.created_at,
    displayName:        row.profiles?.display_name || 'Anonymous Runner',
  }))
}

/**
 * Fetch personal records for a batch of user IDs.
 * Returns a Map<userId, prsObject> where prsObject is { 'Marathon': { time, date }, ... }
 */
export async function fetchPRsForUsers(userIds) {
  if (!userIds.length) return new Map()

  const { data, error } = await supabase
    .from('personal_records')
    .select('user_id, distance_label, time, date, race_name')
    .in('user_id', userIds)

  if (error) throw error

  const map = new Map()
  for (const row of data) {
    if (!map.has(row.user_id)) map.set(row.user_id, {})
    map.get(row.user_id)[row.distance_label] = {
      time:      row.time,
      date:      row.date,
      raceName:  row.race_name ?? '',
    }
  }
  return map
}

/**
 * Fetch active shoes for a batch of user IDs.
 * Returns a Map<shoeId, shoeName>
 */
export async function fetchShoesForUsers(userIds) {
  if (!userIds.length) return new Map()

  const { data, error } = await supabase
    .from('shoes')
    .select('id, name, user_id')
    .in('user_id', userIds)

  if (error) throw error

  const map = new Map()
  for (const row of data) {
    map.set(row.id, row.name)
  }
  return map
}
