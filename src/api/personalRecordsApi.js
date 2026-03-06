import { supabase } from '../lib/supabaseClient.js'

function dbPrToPr(row) {
  return {
    distanceLabel: row.distance_label,
    time:          row.time,
    date:          row.date,
    raceName:      row.race_name ?? '',
  }
}

// Returns object keyed by distanceLabel — matches the existing prs shape throughout the app
export async function fetchPRs(userId) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error

  return data.reduce((acc, row) => {
    acc[row.distance_label] = dbPrToPr(row)
    return acc
  }, {})
}

// Insert or update a PR (unique per user+distance_label)
export async function upsertPR(userId, distanceLabel, time, date, raceName = '') {
  const { data, error } = await supabase
    .from('personal_records')
    .upsert(
      {
        user_id:        userId,
        distance_label: distanceLabel,
        time,
        date:           date || null,
        race_name:      raceName,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,distance_label' }
    )
    .select()
    .single()

  if (error) throw error
  return dbPrToPr(data)
}

export async function deletePR(userId, distanceLabel) {
  const { error } = await supabase
    .from('personal_records')
    .delete()
    .eq('user_id', userId)
    .eq('distance_label', distanceLabel)

  if (error) throw error
}
