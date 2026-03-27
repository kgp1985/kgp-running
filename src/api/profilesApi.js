import { supabase } from '../lib/supabaseClient.js'

function dbProfileToProfile(row) {
  return {
    id:             row.id,
    displayName:    row.display_name ?? null,
    username:       row.username ?? null,
    bio:            row.bio ?? null,
    isPublic:       row.is_public ?? false,
    avatarUrl:      row.avatar_url ?? null,
    profileWidgets: row.profile_widgets ?? ['recent_runs','mileage_chart','fastest_times'],
  }
}

/**
 * Fetch the current user's own profile.
 */
export async function fetchMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, bio, is_public, avatar_url, profile_widgets')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ? dbProfileToProfile(data) : null
}

/**
 * Update display_name, username, bio, is_public, avatar_url, and/or profile_widgets for the signed-in user.
 * Uses plain update — only touches the community columns.
 * Falls back to upsert if update returns no rows (no profile row yet).
 */
export async function updateMyProfile(userId, updates) {
  const dbUpdates = {}
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
  if (updates.username !== undefined) dbUpdates.username = updates.username
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio
  if (updates.isPublic    !== undefined) dbUpdates.is_public    = updates.isPublic
  if (updates.avatarUrl   !== undefined) dbUpdates.avatar_url   = updates.avatarUrl
  if (updates.profileWidgets !== undefined) dbUpdates.profile_widgets = updates.profileWidgets

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select('id, display_name, username, bio, is_public, avatar_url, profile_widgets')
    .single()

  if (error) throw error
  return dbProfileToProfile(data)
}

/**
 * Check if a username is available (returns true if available).
 */
export async function checkUsernameAvailable(username) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()
  return !data
}

/**
 * Fetch any user's public profile by username.
 */
export async function fetchProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, bio, avatar_url, is_public, profile_widgets')
    .ilike('username', username)
    .maybeSingle()
  if (error) throw error
  return data ? {
    id: data.id,
    displayName: data.display_name ?? null,
    username: data.username ?? null,
    bio: data.bio ?? null,
    avatarUrl: data.avatar_url ?? null,
    isPublic: data.is_public ?? false,
    profileWidgets: data.profile_widgets ?? ['recent_runs','mileage_chart','fastest_times'],
  } : null
}

/**
 * Fetch profile by userId.
 */
export async function fetchProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, bio, avatar_url, is_public, profile_widgets')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? {
    id: data.id,
    displayName: data.display_name ?? null,
    username: data.username ?? null,
    bio: data.bio ?? null,
    avatarUrl: data.avatar_url ?? null,
    isPublic: data.is_public ?? false,
    profileWidgets: data.profile_widgets ?? ['recent_runs','mileage_chart','fastest_times'],
  } : null
}
