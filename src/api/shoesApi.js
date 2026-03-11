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
    isSuperShoe:   row.is_super_shoe ?? false,
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

export async function insertShoe(userId, name, addedDate, isSuperShoe = false) {
  const { data, error } = await supabase
    .from('shoes')
    .insert({ user_id: userId, name, added_date: addedDate, is_super_shoe: isSuperShoe })
    .select()
    .single()

  if (error) throw error
  return dbShoeToShoe(data)
}

export async function updateShoe(shoeId, { name, addedDate, mileageOffset, isSuperShoe }) {
  const updates = {}
  if (name          !== undefined) updates.name           = name
  if (addedDate     !== undefined) updates.added_date     = addedDate
  if (mileageOffset !== undefined) updates.mileage_offset = mileageOffset
  if (isSuperShoe   !== undefined) updates.is_super_shoe  = isSuperShoe

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
