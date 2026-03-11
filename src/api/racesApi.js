import { supabase } from '../lib/supabaseClient.js'

function dbRaceToRace(row) {
  return {
    id:        row.id,
    name:      row.name,
    date:      row.date,
    eventType: row.event_type,
    notes:     row.notes ?? '',
    createdAt: row.created_at,
  }
}

export async function fetchRaces(userId) {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) throw error
  return data.map(dbRaceToRace)
}

export async function insertRace(userId, { name, date, eventType, notes }) {
  const { data, error } = await supabase
    .from('races')
    .insert({ user_id: userId, name, date, event_type: eventType, notes: notes || null })
    .select()
    .single()

  if (error) throw error
  return dbRaceToRace(data)
}

export async function updateRace(raceId, { name, date, eventType, notes }) {
  const updates = {}
  if (name      !== undefined) updates.name       = name
  if (date      !== undefined) updates.date       = date
  if (eventType !== undefined) updates.event_type = eventType
  if (notes     !== undefined) updates.notes      = notes || null

  const { data, error } = await supabase
    .from('races')
    .update(updates)
    .eq('id', raceId)
    .select()
    .single()

  if (error) throw error
  return dbRaceToRace(data)
}

export async function deleteRace(raceId) {
  const { error } = await supabase
    .from('races')
    .delete()
    .eq('id', raceId)

  if (error) throw error
}
