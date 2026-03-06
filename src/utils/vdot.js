import { VDOT_TABLE } from '../data/vdotTable.js'

// Jack Daniels VO2max formula components
// t = time in minutes, v = velocity in meters/minute

function percentVO2max(t) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t)
}

function vo2FromVelocity(v) {
  return -4.60 + 0.182258 * v + 0.000104 * v * v
}

/**
 * Calculate VDOT from a race performance.
 * @param {number} distanceMeters
 * @param {number} timeSeconds
 * @returns {number} VDOT value
 */
export function calculateVDOT(distanceMeters, timeSeconds) {
  if (!distanceMeters || !timeSeconds || timeSeconds <= 0) return null
  const tMin = timeSeconds / 60
  const v = distanceMeters / tMin // meters per minute
  const vo2 = vo2FromVelocity(v)
  const pct = percentVO2max(tMin)
  const vdot = vo2 / pct
  // Clamp to valid range
  return Math.max(30, Math.min(85, vdot))
}

/**
 * Predict race time for a given VDOT and distance using bisection search.
 * @param {number} vdot
 * @param {number} distanceMeters
 * @returns {number} predicted time in seconds
 */
export function predictRaceTime(vdot, distanceMeters) {
  if (!vdot || !distanceMeters) return null
  // Bisection: find t such that vo2(d/t) / pct(t) = vdot
  let lo = distanceMeters / 1000 * 60 // very fast (roughly world record pace)
  let hi = distanceMeters / 30 * 60   // very slow

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const tMin = mid / 60
    const v = distanceMeters / tMin
    const estimated = vo2FromVelocity(v) / percentVO2max(tMin)
    if (estimated > vdot) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return Math.round((lo + hi) / 2)
}

/**
 * Get training paces for a given VDOT.
 * Returns pace in seconds per mile for each zone.
 *
 * Easy and Recovery are MP-anchored (Approach 5):
 *   Easy     = marathon + 60s  to  marathon + 90s  per mile
 *   Recovery = marathon + 90s  to  marathon + 150s per mile
 *
 * @param {number} vdot
 * @returns {{ easy: {lo, hi}, recovery: {lo, hi}, marathon: number, threshold: number, interval: number, repetition: number }}
 */
export function getTrainingPaces(vdot) {
  if (!vdot) return null

  const lo = Math.max(30, Math.floor(vdot))
  const hi = Math.min(85, Math.ceil(vdot))
  const frac = vdot - lo

  function interp(a, b) {
    return Math.round(a + (b - a) * frac)
  }

  const loEntry = VDOT_TABLE[lo]
  const hiEntry = VDOT_TABLE[hi] || loEntry

  // Derive marathon pace from the pure formula so it's consistent with race predictions
  const marathonRaceTime = predictRaceTime(vdot, 42195)
  const marathon = Math.round(marathonRaceTime / 26.2188)

  return {
    // MP-anchored easy/recovery zones
    easy:       { lo: marathon + 60,  hi: marathon + 90  },
    recovery:   { lo: marathon + 90,  hi: marathon + 150 },
    marathon,
    threshold:  interp(loEntry.threshold,  hiEntry.threshold),
    interval:   interp(loEntry.interval,   hiEntry.interval),
    repetition: interp(loEntry.repetition, hiEntry.repetition),
  }
}

// Race distances used for equivalent race predictions (meters)
const EQUIVALENT_RACE_DISTANCES = {
  '1500m':          1500,
  '1mile':          1609.344,
  '3K':             3000,
  '5K':             5000,
  '10K':            10000,
  'HM':             21097.5,
  'M':              42195,
}

/**
 * Get equivalent race times for a given VDOT across all standard distances.
 * Uses the pure Daniels formula (predictRaceTime) for zero drift —
 * the same VDOT derived from a marathon will predict that same marathon time back.
 * @param {number} vdot
 * @returns {Object} keyed by distance label, values in seconds
 */
export function getEquivalentRaceTimes(vdot) {
  if (!vdot) return null

  const result = {}
  for (const [key, meters] of Object.entries(EQUIVALENT_RACE_DISTANCES)) {
    result[key] = predictRaceTime(vdot, meters)
  }
  return result
}
