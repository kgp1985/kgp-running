import { supabase } from '../lib/supabaseClient'

export async function bulkInsertRuns(userId, runs) {
  const rows = runs.map(r => ({
    user_id: userId,
    date: r.date,
    distance: r.distance,
    distance_unit: 'mi',
    duration: r.duration,
    workout_type: r.workoutType || 'easy',
    notes: r.notes || '',
    source: r.source || 'import',
    elevation_gain: r.elevationGain || null,
  }))
  const { data, error } = await supabase.from('runs').insert(rows).select()
  if (error) throw error
  return data
}
