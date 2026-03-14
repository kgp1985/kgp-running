import { supabase } from '../lib/supabaseClient.js'

function dbProfileToProfile(row) {
  return {
    id:          row.id,
    displayName: row.display_name ?? null,
    isPublic:    row.is_public ?? false,
    updatedAt:   row.updated_at ?? null,
  }
}

/**
 * Fetch the current user's own profile (always accessible — owner can see their own row).
 */
export async function fetchMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, is_public, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ? dbProfileToProfile(data) : null
}

/**
 * Upsert display_name and/or is_public for the signed-in user.
 * Only sends the fields that are provided.
 */
export async function updateMyProfile(userId, updates) {
  const dbUpdates = {}
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
  if (updates.isPublic    !== undefined) dbUpdates.is_public    = updates.isPublic
  dbUpdates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select('id, display_name, is_public, updated_at')
    .single()

  if (error) throw error
  return dbProfileToProfile(data)
}
