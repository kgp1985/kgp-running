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

  // Hard minimums are the exact race distances in miles.
  // Upper bounds allow ~0.15 mi GPS variance so watches that run slightly long still qualify.
  const EVENTS = {
    '1 Mile':        { min: 1.0,   max: 1.15  },
    '5K':            { min: 3.107, max: 3.26  },
    '10K':           { min: 6.214, max: 6.37  },
    'Half Marathon': { min: 13.109, max: 13.26 },
    'Marathon':      { min: 26.219, max: 26.37 },
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
