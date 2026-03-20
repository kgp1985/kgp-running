import { supabase } from '../lib/supabaseClient.js'

export async function getComments(runId) {
  const { data, error } = await supabase
    .from('run_comments')
    .select('id, run_id, user_id, body, created_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const comments = data || []
  if (!comments.length) return comments

  // Fetch display names separately — run_comments.user_id FK points to auth.users,
  // not profiles, so Supabase can't auto-join. We do it manually.
  const userIds = [...new Set(comments.map(c => c.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  return comments.map(c => ({ ...c, profiles: profileMap[c.user_id] || null }))
}

export async function addComment(runId, userId, body) {
  // Insert the comment
  const { data, error } = await supabase
    .from('run_comments')
    .insert({ run_id: runId, user_id: userId, body })
    .select('id, run_id, user_id, body, created_at')
    .single()
  if (error) throw error

  // Fetch display name separately (same pattern as getComments — FK is to auth.users, not profiles)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .single()

  return { ...data, profiles: profileData || null }
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('run_comments').delete().eq('id', commentId)
  if (error) throw error
}
