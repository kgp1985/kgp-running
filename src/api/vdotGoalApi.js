import { supabase } from '../lib/supabaseClient.js'

/**
 * Fetch the user's saved goal VDOT settings.
 * Returns null if no goal has been set yet.
 */
export async function fetchVdotGoal(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('goal_vdot, goal_race_dist, goal_race_time, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.goal_vdot == null) return null

  return {
    goalVdot:      Number(data.goal_vdot),
    goalRaceDist:  data.goal_race_dist ?? null,
    goalRaceTime:  data.goal_race_time ?? null,
    updatedAt:     data.updated_at,
  }
}

/**
 * Save (upsert) the user's goal VDOT.
 * @param {string} userId
 * @param {number} goalVdot   - VDOT value
 * @param {string} raceDist   - e.g. "Marathon"
 * @param {string} raceTime   - e.g. "3:30:00"
 */
export async function saveVdotGoal(userId, goalVdot, raceDist, raceTime) {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id:         userId,
        goal_vdot:       goalVdot,
        goal_race_dist:  raceDist,
        goal_race_time:  raceTime,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('goal_vdot, goal_race_dist, goal_race_time, updated_at')
    .single()

  if (error) throw error

  return {
    goalVdot:     Number(data.goal_vdot),
    goalRaceDist: data.goal_race_dist ?? null,
    goalRaceTime: data.goal_race_time ?? null,
    updatedAt:    data.updated_at,
  }
}
