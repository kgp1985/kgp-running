/**
 * Training plan generator
 *
 * Principles applied:
 *  - Week always starts on Monday (snapped from today)
 *  - Intra-phase mileage ramp (linear, not flat)
 *  - Cutback week every 3rd week (~80%) during base/development/peak
 *  - Two quality sessions per week for 4+ day plans
 *  - Medium-long run (MLR) for marathon plans with 6+ days
 *  - Progressive long-run distance (capped per distance)
 *  - Accurate raceDistance lookup for mileage targets
 */

import { getTrainingPaces } from './vdot.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function secToMinSec(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Plan config ─────────────────────────────────────────────────────────────

function getPlanConfig(raceDistance) {
  const configs = {
    marathon: {
      totalWeeks: 18,
      phases: [
        { name: 'base',        start: 1,  end: 4  },
        { name: 'development', start: 5,  end: 12 },
        { name: 'peak',        start: 13, end: 16 },
        { name: 'taper',       start: 17, end: 18 },
      ],
    },
    half: {
      totalWeeks: 12,
      phases: [
        { name: 'base',        start: 1,  end: 3  },
        { name: 'development', start: 4,  end: 9  },
        { name: 'peak',        start: 10, end: 11 },
        { name: 'taper',       start: 12, end: 12 },
      ],
    },
    '10k': {
      totalWeeks: 8,
      phases: [
        { name: 'base',        start: 1, end: 2 },
        { name: 'development', start: 3, end: 6 },
        { name: 'peak',        start: 7, end: 7 },
        { name: 'taper',       start: 8, end: 8 },
      ],
    },
    '5k': {
      totalWeeks: 6,
      phases: [
        { name: 'base',        start: 1, end: 1 },
        { name: 'development', start: 2, end: 4 },
        { name: 'peak',        start: 5, end: 5 },
        { name: 'taper',       start: 6, end: 6 },
      ],
    },
  }
  return configs[raceDistance] || configs.marathon
}

function findPhaseForWeek(phases, week) {
  for (const p of phases) {
    if (week >= p.start && week <= p.end) return p
  }
  return phases[phases.length - 1]
}

// ─── Default peak mileage by level ───────────────────────────────────────────

function getDefaultPeak(raceDistance, level) {
  const table = {
    beginner:     { marathon: 40, half: 30, '10k': 28, '5k': 22 },
    intermediate: { marathon: 55, half: 45, '10k': 40, '5k': 35 },
    advanced:     { marathon: 70, half: 60, '10k': 55, '5k': 48 },
  }
  return (table[level] || table.intermediate)[raceDistance] || 50
}

// ─── Mileage progression ─────────────────────────────────────────────────────

/**
 * Builds a week-by-week mileage array with:
 *  - Linear ramp within each non-taper phase
 *  - Cutback every 3rd overall week (80% of that week's target)
 *  - Sharp taper: week1 = 70%, week2 = 50% (of peak), etc.
 */
function buildMileageProgression(totalWeeks, planConfig, startMileage, peakMileage) {
  const phases = planConfig.phases

  // What fraction of peakMileage each phase tops out at
  const phaseTopPct = { base: 0.75, development: 0.90, peak: 1.0 }

  const result = []
  let prevPhaseTopMiles = startMileage

  for (let week = 1; week <= totalWeeks; week++) {
    const phaseObj = findPhaseForWeek(phases, week)
    const { name: phase, start: phaseStart, end: phaseEnd } = phaseObj
    const phaseLen = phaseEnd - phaseStart + 1
    const weekInPhase = week - phaseStart // 0-indexed

    let weekMileage

    if (phase === 'taper') {
      // Taper drops sharply: 70% → 50% → 40%
      const taperPcts = [0.70, 0.50, 0.40]
      weekMileage = Math.round(peakMileage * (taperPcts[weekInPhase] ?? 0.40))
    } else {
      const phaseTopMiles = Math.round(peakMileage * (phaseTopPct[phase] || 0.90))
      const phaseBottomMiles = prevPhaseTopMiles

      // Linear interpolation within the phase
      const t = phaseLen > 1 ? weekInPhase / (phaseLen - 1) : 1
      weekMileage = Math.round(phaseBottomMiles + t * (phaseTopMiles - phaseBottomMiles))

      // Cutback week every 3rd week (overall week number)
      if (week % 3 === 0) {
        weekMileage = Math.round(weekMileage * 0.80)
      }

      // Record this phase's top for the next phase's starting point
      if (week === phaseEnd) {
        prevPhaseTopMiles = phaseTopMiles
      }
    }

    result.push({
      week,
      phase,
      mileage: Math.max(10, weekMileage),
      isCutback: phase !== 'taper' && week % 3 === 0,
    })
  }

  return result
}

// ─── Day schedule templates ───────────────────────────────────────────────────
// Offsets from Monday (Mon=0, Tue=1, ... Sun=6)

const DAY_SCHEDULES = {
  3: [0, 3, 6],              // Mon, Thu, Sun
  4: [0, 2, 5, 6],           // Mon, Wed, Sat, Sun
  5: [0, 1, 3, 5, 6],        // Mon, Tue, Thu, Sat, Sun
  6: [1, 2, 3, 4, 5, 6],     // Tue, Wed, Thu, Fri, Sat, Sun (rest Mon)
  7: [0, 1, 2, 3, 4, 5, 6],  // All days
}

// Long-run distance caps (miles)
const LONG_RUN_CAPS = { marathon: 22, half: 16, '10k': 13, '5k': 10 }

/**
 * Determine quality session workout type for a given slot.
 * slotNum: 0 = first quality session (mid-week), 1 = second quality (late week)
 */
function qualityType(raceDistance, phase, slotNum) {
  if (phase === 'base' || phase === 'taper') return 'easy'

  if (raceDistance === '5k') {
    return slotNum === 0 ? 'interval' : 'repetition'
  }
  if (raceDistance === '10k') {
    if (phase === 'development') return slotNum === 0 ? 'tempo' : 'interval'
    return slotNum === 0 ? 'interval' : 'repetition'
  }
  // half / marathon
  if (phase === 'development') return slotNum === 0 ? 'tempo' : 'interval'
  if (phase === 'peak') return slotNum === 0 ? 'tempo' : 'interval'
  return 'easy'
}

/**
 * Build a week's run template: array of { dayOffset, type, distance }.
 * Distances are in whole miles and sum to ~weeklyMileage.
 */
function buildWeekTemplate(raceDistance, phase, daysPerWeek, weeklyMileage) {
  const clampedDays = Math.max(3, Math.min(7, daysPerWeek))
  const days = DAY_SCHEDULES[clampedDays] || DAY_SCHEDULES[5]
  const n = days.length

  // Identify roles:
  // - Last day (Sun or last in schedule) = long run
  // - Index 0 = recovery day
  // - For n >= 4: two quality sessions at indices Math.floor(n/2)-1 and n-2
  // - For n == 3: one quality session at index 1
  // - For marathon n >= 6: index 3 = medium-long run (MLR)

  const longIdx = n - 1
  const recIdx = 0

  let qualityIdxs = []
  if (n >= 4) {
    const q1 = Math.floor(n / 2) - 1  // ~mid-week quality
    const q2 = n - 2                   // day before long run
    qualityIdxs = [q1, q2]
  } else if (n >= 3) {
    qualityIdxs = [1] // single quality between recovery and long
  }

  // Medium-long run: marathon plans, 6+ days, index 3
  const mlrIdx = (raceDistance === 'marathon' && n >= 6) ? 3 : -1

  // Long run: capped per distance
  const longCap = LONG_RUN_CAPS[raceDistance] || 22
  const longDist = Math.min(longCap, Math.max(4, Math.round(weeklyMileage * (phase === 'taper' ? 0.28 : 0.34))))

  // MLR: 65% of long run, capped
  const mlrDist = mlrIdx >= 0
    ? Math.min(16, Math.max(6, Math.round(longDist * 0.65)))
    : 0

  // Distribute remaining miles among all other slots using relative weights:
  // recovery = 0.6, quality = 1.1, easy = 1.0
  const remaining = weeklyMileage - longDist - mlrDist

  const slotWeights = []
  for (let i = 0; i < n; i++) {
    if (i === longIdx) continue
    if (mlrIdx >= 0 && i === mlrIdx) continue
    const w = i === recIdx ? 0.6 : qualityIdxs.includes(i) ? 1.1 : 1.0
    slotWeights.push({ idx: i, w })
  }

  const totalW = slotWeights.reduce((s, sw) => s + sw.w, 0)
  const distByIdx = {}
  for (const { idx, w } of slotWeights) {
    distByIdx[idx] = Math.max(3, Math.round(remaining * w / totalW))
  }

  // Build template
  const template = []
  let qualSlotNum = 0

  for (let i = 0; i < n; i++) {
    const dayOffset = days[i]
    let type, distance

    if (i === longIdx) {
      type = 'long'; distance = longDist
    } else if (mlrIdx >= 0 && i === mlrIdx) {
      type = 'mediumlong'; distance = mlrDist
    } else if (i === recIdx) {
      type = 'recovery'; distance = distByIdx[i]
    } else if (qualityIdxs.includes(i)) {
      type = qualityType(raceDistance, phase, qualSlotNum)
      distance = distByIdx[i]
      qualSlotNum++
    } else {
      type = 'easy'; distance = distByIdx[i]
    }

    template.push({ dayOffset, type, distance: Math.max(1, distance) })
  }

  return template
}

// ─── Progressive VDOT ────────────────────────────────────────────────────────

function calculateProgressiveVdots(currentVdot, goalVdot, totalWeeks) {
  const vdots = []
  const gap = goalVdot - currentVdot
  for (let week = 0; week < totalWeeks; week++) {
    const progress = totalWeeks > 1 ? week / (totalWeeks - 1) : 1
    vdots.push(Math.round((currentVdot + gap * progress) * 10) / 10)
  }
  return vdots
}

// ─── Run data generation ──────────────────────────────────────────────────────

function generateRunData(date, workoutType, distance, paces, raceDistance, targetRace) {
  const easyLo      = secToMinSec(paces?.easy?.lo ?? 540)
  const easyHi      = secToMinSec(paces?.easy?.hi ?? 600)
  const recoveryLo  = secToMinSec(paces?.recovery?.lo ?? 600)
  const recoveryHi  = secToMinSec(paces?.recovery?.hi ?? 660)
  const threshold   = secToMinSec(paces?.threshold ?? 390)
  const interval    = secToMinSec(paces?.interval ?? 360)
  const repetition  = secToMinSec(paces?.repetition ?? 330)
  const marathon    = secToMinSec(paces?.marathon ?? 450)

  const templates = {
    recovery: {
      notes: `Easy recovery jog at ${recoveryLo}–${recoveryHi}/mi. Flush the legs, stay relaxed.`,
      targetPace: `${recoveryLo}/mi`,
    },
    easy: {
      notes: `General aerobic run at ${easyLo}–${easyHi}/mi. Conversational, comfortable effort.`,
      targetPace: `${easyLo}/mi`,
    },
    long: {
      notes: `Long run at easy effort (${easyLo}–${easyHi}/mi). Start conservatively. Last 20–25% can drift toward marathon pace (${marathon}/mi).`,
      targetPace: `${easyLo}/mi`,
    },
    mediumlong: {
      notes: `Medium-long run at easy effort (${easyLo}–${easyHi}/mi). Build aerobic endurance mid-week.`,
      targetPace: `${easyLo}/mi`,
    },
    tempo: {
      notes: `Lactate threshold work: 2mi warm-up + 20–25 min at threshold pace (${threshold}/mi) + 1.5mi cool-down.`,
      targetPace: threshold,
      repsCount: null,
      repDistanceMeters: null,
      restSeconds: null,
    },
    interval: {
      notes: `VO₂max intervals: 1.5mi warm-up, 5×1000m at ${interval}/mi with 90–120s jog recovery, 1.5mi cool-down.`,
      targetPace: interval,
      repsCount: 5,
      repDistanceMeters: 1000,
      restSeconds: 120,
    },
    repetition: {
      notes: `Speed reps: 8×200m at mile pace (${repetition}/mi or faster) with full 2–3 min walk/stand recovery.`,
      targetPace: repetition,
      repsCount: 8,
      repDistanceMeters: 200,
      restSeconds: 150,
    },
    generalspeed: {
      notes: `Fartlek or hill repeats. Run by feel with variable efforts between easy (${easyLo}/mi) and threshold (${threshold}/mi).`,
      targetPace: `${easyLo}–${threshold}`,
    },
  }

  const tpl = templates[workoutType]
  if (!tpl) return null

  return {
    date,
    distance: Math.max(1, distance),
    workoutType: workoutType === 'mediumlong' ? 'easy' : workoutType, // store MLR as easy
    notes: tpl.notes,
    targetPace: tpl.targetPace,
    targetRace,
    repsCount:          tpl.repsCount          ?? null,
    repDistanceMeters:  tpl.repDistanceMeters  ?? null,
    restSeconds:        tpl.restSeconds        ?? null,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a complete training plan.
 *
 * @param {Object} config
 *   raceDistance  - 'marathon' | 'half' | '10k' | '5k'
 *   raceDate      - 'YYYY-MM-DD'
 *   currentVdot   - number (e.g. 45.2)
 *   mileageLevel  - 'beginner' | 'intermediate' | 'advanced'
 *   daysPerWeek   - 3–7 (default 5)
 *   startingMileage - optional starting weekly miles override
 *   peakMileage   - optional peak weekly miles override
 *   vdotApproach  - 'current' | 'goal' | 'progressive'
 *   goalVdot      - optional target VDOT for progressive/goal mode
 * @returns {Array} Array of planned run objects ready to insert into DB
 */
export function generatePlan({
  raceDistance,
  raceDate,
  currentVdot,
  mileageLevel = 'intermediate',
  daysPerWeek = 5,
  startingMileage,
  peakMileage,
  vdotApproach = 'current',
  goalVdot,
}) {
  if (!raceDistance || !raceDate || !currentVdot) {
    throw new Error('Missing required plan parameters')
  }

  // ── Snap plan start to the coming Monday ────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() // 0 = Sun, 1 = Mon, ... 6 = Sat
  // Days until next Monday (0 if today is Monday)
  const daysToMonday = dow === 1 ? 0 : (1 - dow + 7) % 7
  const planStart = new Date(today)
  planStart.setDate(today.getDate() + daysToMonday)

  const raceDateObj = new Date(raceDate + 'T00:00:00')
  const planConfig = getPlanConfig(raceDistance)

  // Weeks from plan start until race day
  const weeksToRace = Math.ceil((raceDateObj - planStart) / (7 * 24 * 60 * 60 * 1000))
  const totalWeeks = Math.min(planConfig.totalWeeks, Math.max(4, weeksToRace))

  // Effective mileage targets
  const defaultPeak = getDefaultPeak(raceDistance, mileageLevel)
  const effectivePeak  = peakMileage    || defaultPeak
  const effectiveStart = startingMileage || Math.round(effectivePeak * 0.65)

  // Per-week mileage progression
  const mileageWeeks = buildMileageProgression(totalWeeks, planConfig, effectiveStart, effectivePeak)

  // Progressive VDOT array (if applicable)
  const progressiveVdots = vdotApproach === 'progressive' && totalWeeks > 1
    ? calculateProgressiveVdots(currentVdot, goalVdot || currentVdot + 5, totalWeeks)
    : null

  const raceName = `${raceDistance.charAt(0).toUpperCase() + raceDistance.slice(1)} ${raceDateObj.getFullYear()}`
  const allRuns = []

  for (let week = 1; week <= totalWeeks; week++) {
    const { phase, mileage: weeklyMileage } = mileageWeeks[week - 1]

    // Week start date (each week is a Monday)
    const weekStart = new Date(planStart)
    weekStart.setDate(planStart.getDate() + (week - 1) * 7)

    // Effective VDOT for pacing this week
    let weekVdot = currentVdot
    if (vdotApproach === 'goal') weekVdot = goalVdot || currentVdot
    else if (vdotApproach === 'progressive' && progressiveVdots) weekVdot = progressiveVdots[week - 1]
    const paces = getTrainingPaces(weekVdot)

    // Build the week's run slots
    const weekTemplate = buildWeekTemplate(raceDistance, phase, daysPerWeek, weeklyMileage)

    for (const slot of weekTemplate) {
      const runDate = new Date(weekStart)
      runDate.setDate(weekStart.getDate() + slot.dayOffset)
      const dateStr = runDate.toISOString().slice(0, 10)

      const run = generateRunData(dateStr, slot.type, slot.distance, paces, raceDistance, raceName)
      if (run) allRuns.push(run)
    }
  }

  return allRuns
}
