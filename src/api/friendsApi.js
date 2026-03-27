import { supabase } from '../lib/supabaseClient.js'

// Send friend request
export async function sendFriendRequest(requesterId, addresseeId) {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
    .select().single()
  if (error) throw error
  return data
}

// Accept a friend request
export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select().single()
  if (error) throw error
  return data
}

// Decline or remove friendship
export async function removeFriendship(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

// Get all accepted friends for a user (returns array of the OTHER user's id)
export async function getFriends(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')
  if (error) throw error
  return (data || []).map(f => ({
    friendshipId: f.id,
    friendId: f.requester_id === userId ? f.addressee_id : f.requester_id,
  }))
}

// Get pending incoming requests for a user
export async function getPendingRequests(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  if (error) throw error
  return data || []
}

// Search users by display name or username (for adding friends)
export async function searchUsers(query, currentUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(10)
  if (error) throw error
  return data ?? []
}

// Get friend's public runs (for Run Club feed)
export async function fetchFriendsFeed(friendIds, limit = 20, offset = 0) {
  if (!friendIds.length) return []
  const { data, error } = await supabase
    .from('runs')
    .select(`
      id, date, distance, distance_unit, duration, workout_type, notes, subtitle,
      user_id, shoe_id, is_public,
      profiles!inner(display_name, is_public)
    `)
    .in('user_id', friendIds)
    .eq('is_public', true)
    .eq('profiles.is_public', true)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data || []
}
