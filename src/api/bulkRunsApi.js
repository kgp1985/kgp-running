import { supabase } from '../lib/supabaseClient'
import { computeBestWindows } from '../utils/computeSplits.js'
import { insertRunSplits, insertBestWindows } from './splitsApi.js'

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

export async function insertRunWithSplits(userId, run, splits) {
  // Insert the run
  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id: userId,
      date: run.date,
      distance: run.distance,
      distance_unit: 'mi',
      duration: run.duration,
      workout_type: run.workoutType || 'easy',
      notes: run.notes || '',
      source: run.source || 'import',
      elevation_gain: run.elevationGain || null,
    })
    .select('id')
    .single()
  if (error) throw error

  const runId = data.id

  // Insert splits and compute best windows
  if (splits && splits.length > 0) {
    await insertRunSplits(runId, userId, splits)
    const windows = computeBestWindows(splits)
    await insertBestWindows(runId, userId, windows)
  }

  return runId
}
