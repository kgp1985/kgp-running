import { supabase } from '../lib/supabaseClient.js'

function dbProfileToProfile(row) {
  return {
    id:          row.id,
    displayName: row.display_name ?? null,
    isPublic:    row.is_public ?? false,
  }
}

/**
 * Fetch the current user's own profile.
 */
export async function fetchMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, is_public')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ? dbProfileToProfile(data) : null
}

/**
 * Update display_name and/or is_public for the signed-in user.
 * Uses plain update — only touches the two community columns.
 * Falls back to upsert if update returns no rows (no profile row yet).
 */
export async function updateMyProfile(userId, updates) {
  const dbUpdates = {}
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
  if (updates.isPublic    !== undefined) dbUpdates.is_public    = updates.isPublic

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select('id, display_name, is_public')
    .single()

  if (error) throw error
  return dbProfileToProfile(data)
}
