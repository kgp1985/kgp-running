import { supabase } from '../lib/supabaseClient.js'

function dbPlanToRun(row) {
  return {
    id:               row.id,
    createdAt:        row.created_at,
    date:             row.date,
    distance:         Number(row.distance),
    workoutType:      row.workout_type,
    repsCount:        row.reps_count ?? null,
    repDistanceMeters:row.rep_distance_meters ?? null,
    restSeconds:      row.rest_seconds ?? null,
    notes:            row.notes ?? '',
    targetPace:       row.target_pace ?? '',
    targetRace:       row.target_race ?? '',
  }
}

export async function fetchPlannedRuns(userId) {
  const { data, error } = await supabase
    .from('planned_runs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) throw error
  return data.map(dbPlanToRun)
}

export async function insertPlannedRun(userId, run) {
  const { data, error } = await supabase
    .from('planned_runs')
    .insert({
      user_id:             userId,
      date:                run.date,
      distance:            run.distance,
      workout_type:        run.workoutType,
      reps_count:          run.repsCount ?? null,
      rep_distance_meters: run.repDistanceMeters ?? null,
      rest_seconds:        run.restSeconds ?? null,
      notes:               run.notes || null,
      target_pace:         run.targetPace || null,
      target_race:         run.targetRace || null,
    })
    .select()
    .single()

  if (error) throw error
  return dbPlanToRun(data)
}

export async function deletePlannedRun(id) {
  const { error } = await supabase
    .from('planned_runs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updatePlannedRun(id, updates) {
  const dbUpdates = {}
  if (updates.date               !== undefined) dbUpdates.date                 = updates.date
  if (updates.distance           !== undefined) dbUpdates.distance             = updates.distance
  if (updates.workoutType        !== undefined) dbUpdates.workout_type         = updates.workoutType
  if (updates.repsCount          !== undefined) dbUpdates.reps_count           = updates.repsCount
  if (updates.repDistanceMeters  !== undefined) dbUpdates.rep_distance_meters  = updates.repDistanceMeters
  if (updates.restSeconds        !== undefined) dbUpdates.rest_seconds         = updates.restSeconds
  if (updates.notes              !== undefined) dbUpdates.notes                = updates.notes
  if (updates.targetPace         !== undefined) dbUpdates.target_pace          = updates.targetPace
  if (updates.targetRace         !== undefined) dbUpdates.target_race          = updates.targetRace

  const { data, error } = await supabase
    .from('planned_runs')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dbPlanToRun(data)
}
