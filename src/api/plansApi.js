import { supabase } from '../lib/supabaseClient.js'

function dbPlanToObj(row) {
  return {
    id:           row.id,
    createdAt:    row.created_at,
    name:         row.name,
    raceDistance: row.race_distance ?? null,
    raceDate:     row.race_date ?? null,
    planStyle:    row.plan_style ?? null,
    coachStyle:   row.coach_style ?? null,
    daysPerWeek:  row.days_per_week ?? null,
    peakMileage:  row.peak_mileage ?? null,
    totalWeeks:   row.total_weeks ?? null,
  }
}

export async function fetchPlans(userId) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(dbPlanToObj)
}

export async function insertPlan(userId, plan) {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id:       userId,
      name:          plan.name,
      race_distance: plan.raceDistance ?? null,
      race_date:     plan.raceDate ?? null,
      plan_style:    plan.planStyle ?? null,
      coach_style:   plan.coachStyle ?? null,
      days_per_week: plan.daysPerWeek ?? null,
      peak_mileage:  plan.peakMileage ?? null,
      total_weeks:   plan.totalWeeks ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return dbPlanToObj(data)
}

export async function deletePlan(id) {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deletePlanWithRuns(planId) {
  // Delete all planned_runs belonging to this plan first
  const { error: runsError } = await supabase
    .from('planned_runs')
    .delete()
    .eq('plan_id', planId)

  if (runsError) throw runsError

  // Then delete the plan itself
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) throw error
}
