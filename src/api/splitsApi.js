import { supabase } from '../lib/supabaseClient.js'

export async function insertRunSplits(runId, userId, splits) {
  if (!splits || splits.length === 0) return
  const rows = splits.map(s => ({ run_id: runId, user_id: userId, ...s }))
  const { error } = await supabase.from('run_splits').insert(rows)
  if (error) throw error
}

export async function insertBestWindows(runId, userId, windows) {
  // windows: { '1_mile': 245, '5k': 1102, ... }
  const rows = Object.entries(windows).map(([event, fastest_seconds]) => ({
    run_id: runId,
    user_id: userId,
    event,
    fastest_seconds,
  }))
  if (!rows.length) return
  const { error } = await supabase
    .from('run_best_windows')
    .upsert(rows, { onConflict: 'run_id,event' })
  if (error) throw error
}

export async function getRunSplits(runId) {
  const { data, error } = await supabase
    .from('run_splits')
    .select('*')
    .eq('run_id', runId)
    .order('mile_number', { ascending: true })
  if (error) throw error
  return data || []
}
