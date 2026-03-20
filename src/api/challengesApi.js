import { supabase } from '../lib/supabaseClient'

export async function createChallenge(challenge) {
  // challenge: { title, type, targetDistanceKm, startDate, endDate, creatorId }
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      creator_id: challenge.creatorId,
      title: challenge.title,
      type: challenge.type,
      target_distance_km: challenge.targetDistanceKm || null,
      start_date: challenge.startDate,
      end_date: challenge.endDate,
      status: 'open',
    })
    .select().single()
  if (error) throw error
  return data
}

export async function inviteToChallenge(challengeId, userIds) {
  const rows = userIds.map(uid => ({ challenge_id: challengeId, user_id: uid, status: 'invited' }))
  const { error } = await supabase.from('challenge_participants').insert(rows)
  if (error) throw error
}

export async function respondToChallenge(challengeId, userId, accept) {
  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getUserChallenges(userId) {
  // Challenges where user is creator or participant
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('status, challenges(id, title, type, start_date, end_date, status, creator_id, target_distance_km)')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map(p => ({ ...p.challenges, myStatus: p.status }))
}

export async function getChallengeParticipants(challengeId) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('id, user_id, status, result_miles, profiles(display_name, avatar_url)')
    .eq('challenge_id', challengeId)
  if (error) throw error
  return data || []
}
