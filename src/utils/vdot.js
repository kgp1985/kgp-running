import { VDOT_TABLE } from '../data/vdotTable.js'

// ─────────────────────────────────────────────────────────────────────────────
// Current VDOT estimation — derived from the user's personal records + training volume
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PR distance label → distance in meters.
 * Only labels ≥ 5K are included because Daniels' formula is most reliable
 * for races lasting 13+ minutes. Shorter distances inflate VDOT unpredictably.
 */
const PR_DIST_METERS = {
  '5K':            5000,
  '10K':           10000,
  'Half Marathon': 21097.5,
  'Marathon':      42195,
}

/**
 * Recency weight for a PR.
 *
 * Definition of "recent":
 *   0–6  months → weight 1.0  (full confidence — peak fitness indicator)
 *   6–12 months → weight 0.65 (solid indicator — fitness may have evolved)
 *  12–18 months → weight 0.30 (useful baseline — meaningful decay likely)
 *  > 18 months  → excluded     (too stale to be reliable)
 *
 * Rationale: Daniels recommends using "a recent all-out race effort from the
 * past 4–6 weeks" for single-point VDOT. We aggregate across distances and
 * apply decay so that older PRs inform rather than dominate the estimate.
 */
function prRecencyWeight(dateStr, todayISO) {
  if (!dateStr) return 0.25 // no date metadata → low weight
  const msPerDay  = 1000 * 60 * 60 * 24
  const msPerMonth = msPerDay * 30.44
  const monthsAgo = (new Date(todayISO) - new Date(dateStr)) / msPerMonth
  if (monthsAgo <= 6)  return 1.00
  if (monthsAgo <= 12) return 0.65
  if (monthsAgo <= 18) return 0.30
  return 0
}

/**
 * Training volume modifier — small adjustment (±1.5 pts max) based on whether
 * the runner's recent workload is above or below their baseline.
 *
 * Compares trailing 8-week average mileage to trailing 52-week average.
 * Rationale: Daniels acknowledges that VDOT from a stale race underestimates
 * current fitness when training volume has increased, and overestimates when
 * the runner has been detrained. We apply a conservative correction.
 *
 *  ratio (8wk / 52wk) → modifier
 *  ≥ 1.25             → +0.5  (clearly building fitness)
 *  0.80–1.25          → 0.0   (maintenance; no adjustment)
 *  ≤ 0.60             → -1.5  (significant detraining)
 *  between 0.60–0.80  → interpolated between -1.5 and 0
 */
function mileageModifier(runs) {
  if (!runs || runs.length < 5) return 0
  const now      = Date.now()
  const ms8w     = 8  * 7 * 24 * 60 * 60 * 1000
  const ms52w    = 52 * 7 * 24 * 60 * 60 * 1000
  const cut8w    = now - ms8w
  const cut52w   = now - ms52w

  const sum8w  = runs.filter(r => new Date(r.date).getTime() >= cut8w).reduce((s, r) => s + r.distance, 0)
  const sum52w = runs.filter(r => new Date(r.date).getTime() >= cut52w).reduce((s, r) => s + r.distance, 0)

  const avg8w  = sum8w  / 8
  const avg52w = sum52w / 52

  if (avg52w < 5) return 0 // insufficient training history — skip modifier

  const ratio = avg8w / avg52w
  if (ratio >= 1.25) return +0.5
  if (ratio >= 0.80) return 0
  if (ratio <= 0.60) return -1.5
  // interpolate between 0.60 and 0.80
  return -1.5 * (0.80 - ratio) / (0.80 - 0.60)
}

/**
 * Calculate the user's current VDOT from their personal records and run log.
 *
 * Algorithm:
 *  1. For each PR at distances ≥ 5K, compute VDOT via the Daniels formula.
 *  2. Assign a recency weight (see prRecencyWeight above).
 *  3. Compute a weighted average across all qualifying PRs.
 *  4. Apply a small training-volume modifier (see mileageModifier above).
 *
 * @param {Object} prs   - PR object from usePersonalRecordsDb (keyed by label)
 * @param {Array}  runs  - Run array from useRunningLogDb
 * @returns {{
 *   vdot: number,
 *   rawVdot: number,
 *   modifier: number,
 *   contributing: Array<{label, vdot, date, weight}>
 * } | null}   null if no qualifying PRs exist
 */
export function calculateCurrentVDOT(prs, runs = []) {
  const today = new Date().toISOString().slice(0, 10)

  let weightedSum = 0
  let totalWeight = 0
  const contributing = []

  for (const [label, meters] of Object.entries(PR_DIST_METERS)) {
    const pr = prs[label]
    if (!pr || !pr.time) continue

    const vdot = calculateVDOT(meters, pr.time)
    if (!vdot) continue

    const w = prRecencyWeight(pr.date, today)
    if (w === 0) continue

    weightedSum += vdot * w
    totalWeight += w
    contributing.push({ label, vdot: +vdot.toFixed(1), date: pr.date, weight: w })
  }

  if (totalWeight === 0) return null

  const rawVdot  = weightedSum / totalWeight
  const modifier = mileageModifier(runs)
  const finalVdot = Math.max(30, Math.min(85, rawVdot + modifier))

  return {
    vdot:        +finalVdot.toFixed(1),
    rawVdot:     +rawVdot.toFixed(1),
    modifier:    +modifier.toFixed(2),
    contributing,
  }
}

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
