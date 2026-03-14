/**
 * Derive celebration badges / signals for a run post card.
 *
 * Returns an array of badge objects: { icon, label, color }
 * Shown in order of priority — the caller can limit to N badges.
 */
import { calculateVDOT } from './vdot.js'

// Named race distance ranges for PR detection (mirrors usePersonalRecordsDb bounds)
const PR_DISTANCES = [
  { label: 'Mile',          min: 0.98,  max: 1.02  },
  { label: '5K',            min: 3.02,  max: 3.23  },
  { label: '10K',           min: 6.04,  max: 6.40  },
  { label: 'Half Marathon', min: 13.00, max: 13.60 },
  { label: 'Marathon',      min: 26.19, max: 27.00 },
]

const LONG_RUN_MILESTONES = [20, 18, 16]   // miles — in descending order
const WEEKLY_MILEAGE_MILESTONES = [50, 40, 30, 60, 70, 80, 100]

/**
 * Check if this run beats the user's existing PR for its distance.
 * @param {object} run     camelCase run
 * @param {object} prs     { 'Marathon': { time, date }, ... }
 * @returns {string|null}  PR distance label if it's a PR, else null
 */
function detectPR(run, prs) {
  for (const { label, min, max } of PR_DISTANCES) {
    if (run.distance >= min && run.distance <= max) {
      const existing = prs?.[label]
      if (!existing || run.duration < existing.time) {
        return label
      }
    }
  }
  return null
}

/**
 * Compute run VDOT for race-quality signal detection.
 * Returns null if the run distance or duration is too short/unreliable.
 */
function runVdot(run) {
  // Only check distances ≥ 5K (VDOT formula unreliable for shorter efforts)
  if (run.distance < 3.02) return null
  const distMeters = run.distance * 1609.344
  return calculateVDOT(distMeters, run.duration)
}

/**
 * Derive celebration badges for a community run post.
 *
 * @param {object} run          camelCase run object
 * @param {object} prs          user's PRs map { 'Marathon': { time, date }, ... }
 * @param {number|null} currentVdot  runner's current VDOT (from calculateCurrentVDOT)
 * @returns {Array<{ icon, label, color }>}
 */
export function getCelebrations(run, prs = {}, currentVdot = null) {
  const badges = []

  // 1. PR badge — highest priority
  const prLabel = detectPR(run, prs)
  if (prLabel) {
    badges.push({ icon: '🏆', label: `${prLabel} PR`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' })
  }

  // 2. VDOT signal — race-quality effort
  // A run qualifies if its VDOT is meaningfully higher than the runner's baseline
  if (currentVdot) {
    const vdot = runVdot(run)
    if (vdot && vdot > currentVdot + 0.5) {
      badges.push({ icon: '⚡', label: `Race-effort VDOT ${vdot.toFixed(0)}`, color: 'bg-violet-100 text-violet-700 border-violet-200' })
    }
  }

  // 3. Long run milestones
  for (const milestone of LONG_RUN_MILESTONES) {
    if (run.distance >= milestone && (run.workoutType === 'long' || run.distance >= 14)) {
      badges.push({ icon: '💪', label: `${milestone}+ mile long run`, color: 'bg-teal-100 text-teal-700 border-teal-200' })
      break
    }
  }

  // 4. Quality interval session badge
  if (run.repsCount && run.repDistanceMeters) {
    const repLabel = run.repDistanceMeters >= 1000
      ? `${run.repsCount} × ${run.repDistanceMeters}m intervals`
      : `${run.repsCount} × ${run.repDistanceMeters}m`
    badges.push({ icon: '🔥', label: repLabel, color: 'bg-orange-100 text-orange-700 border-orange-200' })
  }

  return badges
}

/**
 * Format the PR summary line for a runner's profile header on the post card.
 * e.g. "5K · 20:45  |  HM · 1:32:10  |  M · 2:57:12"
 *
 * @param {object} prs   { 'Marathon': { time }, 'Half Marathon': { time }, ... }
 * @returns {string}
 */
export function formatPRLine(prs) {
  if (!prs || Object.keys(prs).length === 0) return ''

  const SHORT_LABELS = {
    'Mile':          'Mile',
    '5K':            '5K',
    '10K':           '10K',
    'Half Marathon': 'HM',
    'Marathon':      'M',
  }

  const ORDER = ['Mile', '5K', '10K', 'Half Marathon', 'Marathon']

  const parts = ORDER
    .filter(label => prs[label])
    .map(label => {
      const secs  = prs[label].time
      const h     = Math.floor(secs / 3600)
      const m     = Math.floor((secs % 3600) / 60)
      const s     = secs % 60
      const timeStr = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${m}:${String(s).padStart(2,'0')}`
      return `${SHORT_LABELS[label]} · ${timeStr}`
    })

  return parts.join('  |  ')
}
