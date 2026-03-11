import { supabase } from '../lib/supabaseClient.js'

function dbShoeToShoe(row) {
  return {
    id:            row.id,
    name:          row.name,
    addedDate:     row.added_date,
    retired:       row.retired,
    retiredDate:   row.retired_date ?? null,
    createdAt:     row.created_at,
    mileageOffset: Number(row.mileage_offset ?? 0),
  }
}

export async function fetchShoes(userId) {
  const { data, error } = await supabase
    .from('shoes')
    .select('*')
    .eq('user_id', userId)
    .order('added_date', { ascending: false })

  if (error) throw error
  return data.map(dbShoeToShoe)
}

export async function insertShoe(userId, name, addedDate) {
  const { data, error } = await supabase
    .from('shoes')
    .insert({ user_id: userId, name, added_date: addedDate })
    .select()
    .single()

  if (error) throw error
  return dbShoeToShoe(data)
}

export async function updateShoe(shoeId, { name, addedDate, mileageOffset }) {
  const updates = {}
  if (name          !== undefined) updates.name           = name
  if (addedDate     !== undefined) updates.added_date     = addedDate
  if (mileageOffset !== undefined) updates.mileage_offset = mileageOffset

  const { data, error } = await supabase
    .from('shoes')
    .update(updates)
    .eq('id', shoeId)
    .select()
    .single()

  if (error) throw error
  return dbShoeToShoe(data)
}

export async function retireShoe(shoeId, retiredDate) {
  const { data, error } = await supabase
    .from('shoes')
    .update({ retired: true, retired_date: retiredDate })
    .eq('id', shoeId)
    .select()
    .single()

  if (error) throw error
  return dbShoeToShoe(data)
}

export async function deleteShoe(shoeId) {
  const { error } = await supabase
    .from('shoes')
    .delete()
    .eq('id', shoeId)

  if (error) throw error
}
