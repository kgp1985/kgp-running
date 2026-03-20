import { supabase } from '../lib/supabaseClient.js'

// Upsert reaction (turtle or hare) — one per user per run
export async function upsertReaction(runId, userId, reaction) {
  const { data, error } = await supabase
    .from('run_reactions')
    .upsert({ run_id: runId, user_id: userId, reaction }, { onConflict: 'run_id,user_id' })
    .select().single()
  if (error) throw error
  return data
}

// Remove reaction
export async function removeReaction(runId, userId) {
  const { error } = await supabase
    .from('run_reactions')
    .delete()
    .eq('run_id', runId)
    .eq('user_id', userId)
  if (error) throw error
}

// Get reactions for a run
export async function getReactions(runId) {
  const { data, error } = await supabase
    .from('run_reactions')
    .select('id, user_id, reaction')
    .eq('run_id', runId)
  if (error) throw error
  return data || []
}

// Bulk fetch reactions for multiple runs
export async function getReactionsForRuns(runIds) {
  if (!runIds.length) return []
  const { data, error } = await supabase
    .from('run_reactions')
    .select('id, run_id, user_id, reaction')
    .in('run_id', runIds)
  if (error) throw error
  return data || []
}
