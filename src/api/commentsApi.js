import { supabase } from '../lib/supabaseClient.js'

export async function getComments(runId) {
  const { data, error } = await supabase
    .from('run_comments')
    .select('id, run_id, user_id, body, created_at, profiles(display_name, avatar_url)')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addComment(runId, userId, body) {
  const { data, error } = await supabase
    .from('run_comments')
    .insert({ run_id: runId, user_id: userId, body })
    .select('id, run_id, user_id, body, created_at, profiles(display_name, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('run_comments').delete().eq('id', commentId)
  if (error) throw error
}
