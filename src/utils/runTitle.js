/**
 * Auto-generate a human-readable title for a run post card.
 *
 * Priority:
 *  1. If the run has reps → interval-style title ("6 × 800m", "5 × 1000m", etc.)
 *  2. Match distance against named race distances
 *  3. Fall back to workout-type label + distance
 */

const WORKOUT_LABELS = {
  easy:       'Easy Run',
  recovery:   'Recovery Jog',
  long:       'Long Run',
  tempo:      'Tempo Run',
  interval:   'Interval Session',
  repetition: 'Speed Session',
  tuneup:     'Tune-up Race',
  keyrace:    'Race Day',
}

// Named race distances in miles (approximate match windows)
const NAMED_DISTANCES = [
  { label: 'Mile',          min: 0.95,  max: 1.05  },
  { label: '5K',            min: 3.02,  max: 3.23  },
  { label: '10K',           min: 6.04,  max: 6.40  },
  { label: 'Half Marathon', min: 12.90, max: 13.60 },
  { label: 'Marathon',      min: 26.10, max: 27.00 },
]

/**
 * Format a distance in miles for display.
 * e.g. 8.0 → "8 mi", 8.27 → "8.3 mi"
 */
function fmtDist(miles) {
  return miles % 1 === 0
    ? `${miles} mi`
    : `${miles.toFixed(1)} mi`
}

/**
 * Format meters into a readable rep distance string.
 * 400 → "400m", 1000 → "1000m", 1609 → "1 mi"
 */
function fmtRepDist(meters) {
  if (!meters) return ''
  if (meters >= 1600 && meters <= 1620) return '1 mi'
  if (meters >= 1000) return `${meters}m`
  return `${meters}m`
}

/**
 * Generate an auto-title for a run.
 *
 * @param {object} run — camelCase run object from the DB mapper
 * @returns {string}
 */
export function generateRunTitle(run) {
  const dist = run.distance   // always stored in miles

  // 1. Interval / rep workout
  if (run.repsCount && run.repDistanceMeters) {
    const repStr = fmtRepDist(run.repDistanceMeters)
    return `${run.repsCount} × ${repStr}`
  }

  // 2. Named race distance
  for (const { label, min, max } of NAMED_DISTANCES) {
    if (dist >= min && dist <= max) {
      const typeLabel = WORKOUT_LABELS[run.workoutType] ?? ''
      // For tune-up / key races, prefix with the distance
      if (run.workoutType === 'tuneup' || run.workoutType === 'keyrace') {
        return `${label} — ${typeLabel}`
      }
      return `${label} · ${fmtDist(dist)}`
    }
  }

  // 3. Workout-type label + distance
  const base = WORKOUT_LABELS[run.workoutType] ?? 'Run'
  return `${base} · ${fmtDist(dist)}`
}
