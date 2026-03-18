/**
 * Training plan generator — creates week-by-week plans for goal races.
 * Based on Pfitzinger's Advanced Marathoning framework and adapted for 5K–Marathon distances.
 */

import { getTrainingPaces } from './vdot.js'

/**
 * Convert seconds to M:SS format.
 */
function secToMinSec(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Generate a complete training plan.
 * @param {Object} config
 *   - raceDistance: 'marathon' | 'half' | '10k' | '5k'
 *   - raceDate: 'YYYY-MM-DD' ISO date
 *   - currentVdot: number (e.g. 45.2)
 *   - mileageLevel: 'beginner' | 'intermediate' | 'advanced'
 *   - trainingDays: optional array of numbers 0-6 (0=Mon, 6=Sun), sorted. Defaults to [0,1,2,3,4,5,6]
 *   - startingMileage: optional override for starting weekly mileage
 *   - vdotApproach: 'current' | 'goal' | 'progressive' (defaults to 'current')
 *   - goalVdot: optional target VDOT for progressive mode
 * @returns {Array} Array of planned runs, ready to insert to DB
 */
export function generatePlan({ raceDistance, raceDate, currentVdot, mileageLevel, trainingDays, startingMileage, vdotApproach = 'current', goalVdot }) {
  if (!raceDistance || !raceDate || !currentVdot || !mileageLevel) {
    throw new Error('Missing required plan parameters')
  }

  const raceDateObj = new Date(raceDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Plan structure: total weeks, phases, etc.
  const planConfig = getPlanConfig(raceDistance)
  const basePaces = getTrainingPaces(currentVdot)

  // Calculate how many weeks until race
  const weeksToRace = Math.ceil((raceDateObj - today) / (7 * 24 * 60 * 60 * 1000))
  const totalWeeks = Math.min(planConfig.totalWeeks, Math.max(4, weeksToRace))

  // Default training days to all 7 if not provided
  const effectiveTrainingDays = trainingDays && trainingDays.length > 0 ? trainingDays.sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6]

  // Calculate progressive VDOT per week if needed
  const progressiveVdots = vdotApproach === 'progressive' && totalWeeks > 1
    ? calculateProgressiveVdots(currentVdot, goalVdot || currentVdot + 5, totalWeeks)
    : null

  // Generate week-by-week runs
  const allRuns = []

  for (let week = 1; week <= totalWeeks; week++) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7)

    // Find which phase we're in
    const phase = findPhase(planConfig.phases, week)

    // Get weekly mileage target for this phase
    let weeklyMileage = getWeeklyMileage(planConfig, phase, mileageLevel, week, totalWeeks, startingMileage)

    // Get the template for this week/phase — adapted for training days
    const weekTemplate = getWeekTemplate(raceDistance, phase, week, totalWeeks, effectiveTrainingDays)

    // Determine effective VDOT for this week
    let weekVdot = currentVdot
    if (vdotApproach === 'goal') {
      weekVdot = goalVdot || currentVdot
    } else if (vdotApproach === 'progressive' && progressiveVdots) {
      weekVdot = progressiveVdots[week - 1]
    }
    const paces = getTrainingPaces(weekVdot)

    // Generate runs for this week
    const weekRuns = generateWeekRuns(
      weekStart,
      weekTemplate,
      weeklyMileage,
      paces,
      raceDistance,
      `${raceDistance.charAt(0).toUpperCase() + raceDistance.slice(1)} ${raceDateObj.getFullYear()}`
    )

    allRuns.push(...weekRuns)
  }

  return allRuns
}

/**
 * Calculate progressive VDOT targets for each week.
 * Linearly interpolates from currentVdot to goalVdot over the plan duration.
 */
function calculateProgressiveVdots(currentVdot, goalVdot, totalWeeks) {
  const vdots = []
  const gap = goalVdot - currentVdot
  for (let week = 0; week < totalWeeks; week++) {
    const progress = week / (totalWeeks - 1) // 0 to 1
    const weekVdot = currentVdot + gap * progress
    vdots.push(Math.round(weekVdot * 10) / 10)
  }
  return vdots
}

/**
 * Get plan configuration (total weeks, phases) for a race distance.
 */
function getPlanConfig(raceDistance) {
  const configs = {
    marathon: {
      totalWeeks: 18,
      phases: [
        { name: 'base', weeks: '1-4' },
        { name: 'development', weeks: '5-12' },
        { name: 'peak', weeks: '13-16' },
        { name: 'taper', weeks: '17-18' },
      ],
    },
    half: {
      totalWeeks: 12,
      phases: [
        { name: 'base', weeks: '1-3' },
        { name: 'development', weeks: '4-9' },
        { name: 'peak', weeks: '10-11' },
        { name: 'taper', weeks: '12' },
      ],
    },
    '10k': {
      totalWeeks: 8,
      phases: [
        { name: 'base', weeks: '1-2' },
        { name: 'development', weeks: '3-6' },
        { name: 'peak', weeks: '7' },
        { name: 'taper', weeks: '8' },
      ],
    },
    '5k': {
      totalWeeks: 6,
      phases: [
        { name: 'base', weeks: '1' },
        { name: 'development', weeks: '2-4' },
        { name: 'peak', weeks: '5' },
        { name: 'taper', weeks: '6' },
      ],
    },
  }
  return configs[raceDistance] || configs.marathon
}

/**
 * Determine which phase a given week falls into.
 */
function findPhase(phases, week) {
  for (const p of phases) {
    const parts = p.weeks.split('-')
    const start = parseInt(parts[0])
    const end = parseInt(parts[1])
    if (week >= start && week <= end) return p.name
  }
  return 'peak'
}

/**
 * Calculate weekly mileage for a given phase and level.
 * @param {Object} config - plan configuration
 * @param {string} phase - phase name
 * @param {string} level - mileage level
 * @param {number} week - current week number
 * @param {number} totalWeeks - total weeks in plan
 * @param {number} startingMileage - optional override for starting weekly mileage
 */
function getWeeklyMileage(config, phase, level, week, totalWeeks, startingMileage) {
  // Mileage ramp-up patterns
  const mileageByLevel = {
    beginner: {
      marathon: { base: 35, development: 45, peak: 55, taper: 30 },
      half: { base: 25, development: 32, peak: 40, taper: 24 },
      '10k': { base: 20, development: 27, peak: 35, taper: 21 },
      '5k': { base: 15, development: 20, peak: 28, taper: 17 },
    },
    intermediate: {
      marathon: { base: 45, development: 55, peak: 65, taper: 40 },
      half: { base: 35, development: 42, peak: 50, taper: 30 },
      '10k': { base: 30, development: 37, peak: 45, taper: 27 },
      '5k': { base: 25, development: 30, peak: 38, taper: 23 },
    },
    advanced: {
      marathon: { base: 55, development: 68, peak: 80, taper: 50 },
      half: { base: 45, development: 55, peak: 60, taper: 36 },
      '10k': { base: 40, development: 48, peak: 55, taper: 33 },
      '5k': { base: 35, development: 42, peak: 48, taper: 29 },
    },
  }

  const distKey =
    Object.keys(config.phases[0]).includes('totalWeeks') ? 'marathon' : Object.keys(mileageByLevel[level])[0]
  const raceDist = Object.keys(mileageByLevel[level]).find((d) => {
    const cfg = getPlanConfig(d)
    return cfg.phases.some((p) => p.name === phase)
  }) || 'marathon'

  let baseMileage = mileageByLevel[level][raceDist][phase] || 40

  // Use startingMileage override if provided and we're in the base phase
  if (startingMileage && phase === 'base' && week === 1) {
    baseMileage = startingMileage
  } else if (startingMileage && phase === 'base') {
    // Scale up from starting mileage through base phase
    const defaultBase = mileageByLevel[level][raceDist]['base']
    const ratio = startingMileage / defaultBase
    baseMileage = Math.round(mileageByLevel[level][raceDist][phase] * ratio)
  }

  // Apply taper reduction
  if (phase === 'taper') {
    const weekInPhase = week % 2
    if (weekInPhase === 1) return Math.round(baseMileage * 0.7) // Week 1 of taper: -30%
    return Math.round(baseMileage * 0.5) // Week 2 of taper: -50%
  }

  return baseMileage
}

/**
 * Get the weekly run template (which days have which workout types).
 * @param {string} raceDistance - race distance
 * @param {string} phase - training phase
 * @param {number} week - current week
 * @param {number} totalWeeks - total weeks
 * @param {Array} trainingDays - array of day numbers (0-6, 0=Mon, 6=Sun) where runs are planned
 */
function getWeekTemplate(raceDistance, phase, week, totalWeeks, trainingDays = [0,1,2,3,4,5,6]) {
  // Mon=0, Tue=1, ... Sun=6
  const templates = {
    marathon: {
      base: [
        { day: 0, type: 'recovery', distPct: 0.08 }, // Mon
        { day: 1, type: 'easy', distPct: 0.12 }, // Tue
        { day: 2, type: 'recovery', distPct: 0.08 }, // Wed
        { day: 3, type: 'easy', distPct: 0.12 }, // Thu
        { day: 4, type: 'recovery', distPct: 0.07 }, // Fri
        { day: 5, type: 'easy', distPct: 0.13 }, // Sat
        { day: 6, type: 'long', distPct: 0.4 }, // Sun
      ],
      development: [
        { day: 0, type: 'recovery', distPct: 0.08 }, // Mon
        { day: 1, type: 'easy', distPct: 0.13 }, // Tue
        { day: 2, type: 'tempo', distPct: 0.15 }, // Wed (add LT)
        { day: 3, type: 'easy', distPct: 0.12 }, // Thu
        { day: 4, type: 'recovery', distPct: 0.07 }, // Fri
        { day: 5, type: 'easy', distPct: 0.13 }, // Sat
        { day: 6, type: 'long', distPct: 0.32 }, // Sun
      ],
      peak: [
        { day: 0, type: 'recovery', distPct: 0.08 }, // Mon
        { day: 1, type: 'easy', distPct: 0.12 }, // Tue
        { day: 2, type: 'tempo', distPct: 0.14 }, // Wed
        { day: 3, type: 'interval', distPct: 0.14 }, // Thu (add intervals)
        { day: 4, type: 'recovery', distPct: 0.07 }, // Fri
        { day: 5, type: 'easy', distPct: 0.13 }, // Sat
        { day: 6, type: 'long', distPct: 0.32 }, // Sun
      ],
      taper: [
        { day: 0, type: 'recovery', distPct: 0.1 }, // Mon
        { day: 1, type: 'easy', distPct: 0.15 }, // Tue
        { day: 2, type: 'tempo', distPct: 0.12 }, // Wed
        { day: 3, type: 'recovery', distPct: 0.08 }, // Thu
        { day: 4, type: 'recovery', distPct: 0.05 }, // Fri
        { day: 5, type: 'easy', distPct: 0.15 }, // Sat
        { day: 6, type: 'long', distPct: 0.35 }, // Sun
      ],
    },
    half: {
      base: [
        { day: 0, type: 'recovery', distPct: 0.08 },
        { day: 1, type: 'easy', distPct: 0.13 },
        { day: 2, type: 'recovery', distPct: 0.08 },
        { day: 3, type: 'easy', distPct: 0.13 },
        { day: 4, type: 'recovery', distPct: 0.08 },
        { day: 5, type: 'easy', distPct: 0.13 },
        { day: 6, type: 'long', distPct: 0.37 },
      ],
      development: [
        { day: 0, type: 'recovery', distPct: 0.08 },
        { day: 1, type: 'tempo', distPct: 0.14 },
        { day: 2, type: 'recovery', distPct: 0.08 },
        { day: 3, type: 'easy', distPct: 0.12 },
        { day: 4, type: 'recovery', distPct: 0.07 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.37 },
      ],
      peak: [
        { day: 0, type: 'recovery', distPct: 0.07 },
        { day: 1, type: 'tempo', distPct: 0.13 },
        { day: 2, type: 'recovery', distPct: 0.07 },
        { day: 3, type: 'interval', distPct: 0.13 },
        { day: 4, type: 'recovery', distPct: 0.07 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.39 },
      ],
      taper: [
        { day: 0, type: 'recovery', distPct: 0.1 },
        { day: 1, type: 'easy', distPct: 0.15 },
        { day: 2, type: 'tempo', distPct: 0.1 },
        { day: 3, type: 'recovery', distPct: 0.08 },
        { day: 4, type: 'recovery', distPct: 0.05 },
        { day: 5, type: 'easy', distPct: 0.17 },
        { day: 6, type: 'long', distPct: 0.35 },
      ],
    },
    '10k': {
      base: [
        { day: 0, type: 'recovery', distPct: 0.08 },
        { day: 1, type: 'easy', distPct: 0.14 },
        { day: 2, type: 'recovery', distPct: 0.08 },
        { day: 3, type: 'easy', distPct: 0.14 },
        { day: 4, type: 'recovery', distPct: 0.08 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.34 },
      ],
      development: [
        { day: 0, type: 'recovery', distPct: 0.08 },
        { day: 1, type: 'tempo', distPct: 0.14 },
        { day: 2, type: 'recovery', distPct: 0.08 },
        { day: 3, type: 'interval', distPct: 0.14 },
        { day: 4, type: 'recovery', distPct: 0.08 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.34 },
      ],
      peak: [
        { day: 0, type: 'recovery', distPct: 0.07 },
        { day: 1, type: 'tempo', distPct: 0.13 },
        { day: 2, type: 'recovery', distPct: 0.07 },
        { day: 3, type: 'interval', distPct: 0.13 },
        { day: 4, type: 'recovery', distPct: 0.07 },
        { day: 5, type: 'easy', distPct: 0.13 },
        { day: 6, type: 'long', distPct: 0.4 },
      ],
      taper: [
        { day: 0, type: 'recovery', distPct: 0.1 },
        { day: 1, type: 'easy', distPct: 0.15 },
        { day: 2, type: 'recovery', distPct: 0.1 },
        { day: 3, type: 'interval', distPct: 0.1 },
        { day: 4, type: 'recovery', distPct: 0.05 },
        { day: 5, type: 'easy', distPct: 0.15 },
        { day: 6, type: 'long', distPct: 0.35 },
      ],
    },
    '5k': {
      base: [
        { day: 0, type: 'recovery', distPct: 0.1 },
        { day: 1, type: 'easy', distPct: 0.15 },
        { day: 2, type: 'recovery', distPct: 0.1 },
        { day: 3, type: 'easy', distPct: 0.15 },
        { day: 4, type: 'recovery', distPct: 0.1 },
        { day: 5, type: 'easy', distPct: 0.15 },
        { day: 6, type: 'long', distPct: 0.25 },
      ],
      development: [
        { day: 0, type: 'recovery', distPct: 0.08 },
        { day: 1, type: 'interval', distPct: 0.15 },
        { day: 2, type: 'recovery', distPct: 0.08 },
        { day: 3, type: 'repetition', distPct: 0.14 },
        { day: 4, type: 'recovery', distPct: 0.08 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.33 },
      ],
      peak: [
        { day: 0, type: 'recovery', distPct: 0.07 },
        { day: 1, type: 'interval', distPct: 0.14 },
        { day: 2, type: 'recovery', distPct: 0.07 },
        { day: 3, type: 'repetition', distPct: 0.14 },
        { day: 4, type: 'recovery', distPct: 0.07 },
        { day: 5, type: 'easy', distPct: 0.14 },
        { day: 6, type: 'long', distPct: 0.37 },
      ],
      taper: [
        { day: 0, type: 'recovery', distPct: 0.1 },
        { day: 1, type: 'easy', distPct: 0.12 },
        { day: 2, type: 'recovery', distPct: 0.1 },
        { day: 3, type: 'repetition', distPct: 0.1 },
        { day: 4, type: 'recovery', distPct: 0.08 },
        { day: 5, type: 'easy', distPct: 0.15 },
        { day: 6, type: 'long', distPct: 0.35 },
      ],
    },
  }

  // Get the full 7-day template
  const fullTemplate = templates[raceDistance]?.[phase] || templates.marathon.development

  // If using all 7 days, return as-is
  if (trainingDays.length === 7) {
    return fullTemplate
  }

  // Otherwise, map the template to the specified training days
  // Strategy:
  //   - Sunday (day 6) if present → long run, else last day in trainingDays
  //   - Middle day → quality workout (tempo/interval)
  //   - First day → recovery
  //   - Others → easy/GA

  const mapped = []
  const hasSunday = trainingDays.includes(6)
  const longRunDayIdx = hasSunday ? 6 : trainingDays[trainingDays.length - 1]
  const firstDayIdx = trainingDays[0] // recovery
  const midIdx = Math.floor(trainingDays.length / 2)
  const midDayIdx = trainingDays[midIdx] // quality

  for (const dayIdx of trainingDays) {
    let slot = { day: dayIdx, type: 'easy', distPct: 0.14 }

    if (dayIdx === longRunDayIdx) {
      // Long run
      slot.type = 'long'
      slot.distPct = 0.40
    } else if (dayIdx === firstDayIdx) {
      // Recovery
      slot.type = 'recovery'
      slot.distPct = 0.08
    } else if (dayIdx === midDayIdx) {
      // Quality workout (tempo or interval depending on phase)
      if (phase === 'base') {
        slot.type = 'easy'
        slot.distPct = 0.13
      } else if (phase === 'development') {
        slot.type = 'tempo'
        slot.distPct = 0.15
      } else if (phase === 'peak') {
        slot.type = 'interval'
        slot.distPct = 0.14
      } else {
        slot.type = 'easy'
        slot.distPct = 0.13
      }
    }
    mapped.push(slot)
  }

  // Normalize distances to sum to 1.0 (approximately)
  const total = mapped.reduce((s, slot) => s + slot.distPct, 0)
  const scale = total > 0 ? 1.0 / total : 1.0
  mapped.forEach(slot => { slot.distPct = Math.round(slot.distPct * scale * 100) / 100 })

  return mapped
}

/**
 * Generate runs for a single week.
 */
function generateWeekRuns(
  weekStartDate,
  weekTemplate,
  weeklyMileage,
  paces,
  raceDistance,
  targetRace
) {
  const runs = []

  for (const slot of weekTemplate) {
    const runDate = new Date(weekStartDate)
    runDate.setDate(runDate.getDate() + slot.day)
    const dateStr = runDate.toISOString().slice(0, 10)

    // Calculate and round distance to whole miles (minimum 1)
    const distance = Math.max(1, Math.round(weeklyMileage * slot.distPct))

    // Generate run data
    const run = generateRunData(
      dateStr,
      slot.type,
      distance,
      paces,
      raceDistance,
      targetRace
    )

    if (run) runs.push(run)
  }

  return runs
}

/**
 * Generate individual run data.
 */
function generateRunData(date, workoutType, distance, paces, raceDistance, targetRace) {
  // Format paces using actual VDOT values
  const easyLo = secToMinSec(paces?.easy?.lo ?? 540)
  const easyHi = secToMinSec(paces?.easy?.hi ?? 600)
  const recoveryLo = secToMinSec(paces?.recovery?.lo ?? 600)
  const recoveryHi = secToMinSec(paces?.recovery?.hi ?? 660)
  const thresholdPace = secToMinSec(paces?.threshold ?? 390)
  const intervalPace = secToMinSec(paces?.interval ?? 360)
  const repetitionPace = secToMinSec(paces?.repetition ?? 330)
  const marathonPace = secToMinSec(paces?.marathon ?? 450)

  const templates = {
    recovery: {
      notes: `Easy recovery jog at ${recoveryLo}–${recoveryHi}/mi pace. Focus on flushing legs.`,
      targetPace: `${recoveryLo}/mi`,
    },
    easy: {
      notes: `General aerobic run at ${easyLo}–${easyHi}/mi. Conversational, comfortable effort.`,
      targetPace: `${easyLo}/mi`,
    },
    long: {
      notes: `Long run at easy pace (${easyLo}–${easyHi}/mi). Start conservatively. Last 25% can progress toward marathon pace (${marathonPace}/mi).`,
      targetPace: `${easyLo}/mi`,
    },
    tempo: {
      notes: `Lactate threshold work. 2mi warm-up + 15–25 min at threshold pace (${thresholdPace}/mi) + 2mi cool-down.`,
      targetPace: thresholdPace,
      repsCount: null,
      repDistanceMeters: null,
      restSeconds: null,
    },
    interval: {
      notes: `VO₂max intervals. 2mi warm-up, 5×1000m at ${intervalPace}/mi with 180 sec (3 min) recovery, 2mi cool-down.`,
      targetPace: intervalPace,
      repsCount: 5,
      repDistanceMeters: 1000,
      restSeconds: 180,
    },
    repetition: {
      notes: `Speed work. 8×200m at mile pace (${repetitionPace}/mi or faster) with full recovery (2–3 min walk/stand between reps).`,
      targetPace: repetitionPace,
      repsCount: 8,
      repDistanceMeters: 200,
      restSeconds: 120,
    },
    generalspeed: {
      notes: `Fartlek or hill repeats. Run by feel with variable efforts between easy (${easyLo}/mi) and threshold (${thresholdPace}/mi).`,
      targetPace: `${easyLo}–${thresholdPace}`,
    },
  }

  const template = templates[workoutType]
  if (!template) return null

  return {
    date,
    distance: distance, // already rounded to whole mile
    workoutType,
    notes: template.notes,
    targetPace: template.targetPace,
    targetRace,
    repsCount: template.repsCount ?? null,
    repDistanceMeters: template.repDistanceMeters ?? null,
    restSeconds: template.restSeconds ?? null,
  }
}
