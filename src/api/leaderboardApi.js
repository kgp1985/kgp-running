import { supabase } from '../lib/supabaseClient'

// Top 3 users by total distance this month or year
export async function getMileageLeaders(period = 'month') {
  const now = new Date()
  const start = period === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    : new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('runs')
    .select('user_id, distance, distance_unit, profiles(display_name, avatar_url)')
    .gte('date', start)
    .eq('profiles.is_public', true)

  if (error) throw error

  // Aggregate by user
  const totals = {}
  for (const run of data || []) {
    if (!run.profiles) continue
    const miles = run.distance_unit === 'km' ? run.distance * 0.621371 : run.distance
    if (!totals[run.user_id]) totals[run.user_id] = { userId: run.user_id, displayName: run.profiles.display_name, avatar: run.profiles.avatar_url, miles: 0 }
    totals[run.user_id].miles += miles
  }

  return Object.values(totals)
    .sort((a, b) => b.miles - a.miles)
    .slice(0, 3)
    .map(u => ({ ...u, miles: Math.round(u.miles * 10) / 10 }))
}

// Fastest event times — scans all runs within standard race distance ranges
export async function getFastestEventTimes() {
  const { data, error } = await supabase
    .from('runs')
    .select('id, user_id, date, distance, distance_unit, duration, profiles(display_name, is_public)')
    .not('duration', 'is', null)
    .gt('duration', 0)

  if (error) throw error

  // Map distances to events (in miles)
  const EVENTS = {
    '5K': { min: 3.0, max: 3.3 },
    '10K': { min: 6.0, max: 6.4 },
    'Half Marathon': { min: 12.9, max: 13.3 },
    'Marathon': { min: 26.0, max: 26.5 },
  }

  const fastest = {}
  for (const event of Object.keys(EVENTS)) fastest[event] = null

  for (const run of data || []) {
    if (!run.profiles?.is_public) continue
    const miles = run.distance_unit === 'km' ? run.distance * 0.621371 : run.distance
    for (const [event, { min, max }] of Object.entries(EVENTS)) {
      if (miles >= min && miles <= max) {
        if (!fastest[event] || run.duration < fastest[event].duration) {
          fastest[event] = {
            userId: run.user_id,
            displayName: run.profiles.display_name,
            duration: run.duration,
            date: run.date,
            miles,
          }
        }
      }
    }
  }
  return fastest
}
