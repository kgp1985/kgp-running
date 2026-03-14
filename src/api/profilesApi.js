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
 * Fetch the current user's own profile.
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
 * Uses upsert so it works even if no profile row exists yet.
 */
export async function updateMyProfile(userId, updates) {
  // Build the full upsert payload — always include id for the conflict target
  const payload = { id: userId, updated_at: new Date().toISOString() }
  if (updates.displayName !== undefined) payload.display_name = updates.displayName
  if (updates.isPublic    !== undefined) payload.is_public    = updates.isPublic

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, display_name, is_public, updated_at')
    .single()

  if (error) throw error
  return dbProfileToProfile(data)
}
