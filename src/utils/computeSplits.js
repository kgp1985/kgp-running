/**
 * Compute best consecutive windows and extract mile splits from various sources.
 */

// Target distances in miles — hard minimum, window must cover >= this
const EVENT_TARGETS = {
  '1_mile':        1.0,
  '5k':            3.10686,
  '10k':           6.21371,
  'half_marathon': 13.10936,
  'marathon':      26.21875,
}

/**
 * Compute the fastest consecutive window for each event distance.
 * @param {Array} splits - Array of split objects sorted by mile_number:
 *   { mile_number, split_seconds, cumulative_seconds, cumulative_distance_miles }
 * @returns {Object} - e.g., { '1_mile': 245, '5k': 1102, ... } or {} if no valid windows
 */
export function computeBestWindows(splits) {
  if (!splits || splits.length === 0) return {}

  // Build prefix arrays (0-indexed, index 0 = start of run)
  const n = splits.length
  const cumDist = [0]
  const cumTime = [0]
  for (const s of splits) {
    cumDist.push(Number(s.cumulative_distance_miles))
    cumTime.push(s.cumulative_seconds)
  }

  const results = {}

  for (const [event, targetMiles] of Object.entries(EVENT_TARGETS)) {
    let best = null

    for (let i = 0; i < n; i++) {
      const startDist = cumDist[i]
      const startTime = cumTime[i]

      for (let j = i + 1; j <= n; j++) {
        const covered = cumDist[j] - startDist
        if (covered >= targetMiles) {
          // Interpolate to get exact time at the target distance boundary
          const prevCovered = cumDist[j - 1] - startDist
          const mileJDist = cumDist[j] - cumDist[j - 1]
          const mileJTime = cumTime[j] - cumTime[j - 1]
          const neededDist = targetMiles - prevCovered
          const fraction = mileJDist > 0 ? neededDist / mileJDist : 1
          const windowTime = (cumTime[j - 1] - startTime) + Math.round(fraction * mileJTime)

          if (best === null || windowTime < best) best = windowTime
          break
        }
      }
    }

    if (best !== null) results[event] = best
  }

  return results
}

/**
 * Extract mile splits from FIT record messages (array of {distance, timestamp}).
 * @param {Array} records - Array of { distance (meters), timestamp (Date or ms) }
 * @param {Date|number|string} startTimestamp - Session start time
 * @returns {Array} - Array of DB-ready split objects
 */
export function extractMileSplitsFromRecords(records, startTimestamp) {
  if (!records || records.length === 0) return []

  const METERS_PER_MILE = 1609.344
  const startMs = new Date(startTimestamp).getTime()
  const splits = []

  // Sort records by distance
  const sorted = [...records].filter(r => r.distance != null && r.timestamp != null)
    .sort((a, b) => a.distance - b.distance)

  let mileNumber = 1
  let prevMileCrossMs = startMs
  let prevMileCrossDist = 0

  while (true) {
    const targetDist = mileNumber * METERS_PER_MILE
    // Find the two records that straddle this mile marker
    const afterIdx = sorted.findIndex(r => r.distance >= targetDist)
    if (afterIdx === -1) {
      // Run ended before this mile marker — store partial last mile if meaningful
      const lastRecord = sorted[sorted.length - 1]
      if (lastRecord && lastRecord.distance > prevMileCrossDist + 50) {
        const lastMs = new Date(lastRecord.timestamp).getTime()
        const splitSeconds = Math.round((lastMs - prevMileCrossMs) / 1000)
        const cumSeconds = Math.round((lastMs - startMs) / 1000)
        const cumMiles = lastRecord.distance / METERS_PER_MILE
        if (splitSeconds > 0) {
          splits.push({
            mile_number: mileNumber,
            split_seconds: splitSeconds,
            cumulative_seconds: cumSeconds,
            cumulative_distance_miles: parseFloat(cumMiles.toFixed(4)),
          })
        }
      }
      break
    }

    const after = sorted[afterIdx]
    const before = afterIdx > 0 ? sorted[afterIdx - 1] : { distance: 0, timestamp: new Date(startMs) }

    // Interpolate exact crossing time
    const distRange = after.distance - before.distance
    const fraction = distRange > 0 ? (targetDist - before.distance) / distRange : 0
    const beforeMs = new Date(before.timestamp).getTime()
    const afterMs = new Date(after.timestamp).getTime()
    const crossMs = beforeMs + fraction * (afterMs - beforeMs)

    const splitSeconds = Math.round((crossMs - prevMileCrossMs) / 1000)
    const cumSeconds = Math.round((crossMs - startMs) / 1000)
    const cumMiles = targetDist / METERS_PER_MILE

    if (splitSeconds > 0) {
      splits.push({
        mile_number: mileNumber,
        split_seconds: splitSeconds,
        cumulative_seconds: cumSeconds,
        cumulative_distance_miles: parseFloat(cumMiles.toFixed(4)),
      })
    }

    prevMileCrossMs = crossMs
    prevMileCrossDist = targetDist
    mileNumber++
    if (mileNumber > 50) break // safety cap
  }

  return splits
}

/**
 * Extract mile splits from Strava's splits_standard array.
 * @param {Array} splitsStandard - Strava splits_standard array
 * @returns {Array} - DB-ready split objects
 */
export function extractMileSplitsFromStrava(splitsStandard) {
  if (!splitsStandard || !splitsStandard.length) return []

  const METERS_PER_MILE = 1609.344
  const splits = []
  let cumulativeSeconds = 0
  let cumulativeDistance = 0

  for (const s of splitsStandard) {
    const splitSecs = s.elapsed_time || s.moving_time || 0
    const distMeters = s.distance || METERS_PER_MILE
    cumulativeSeconds += splitSecs
    cumulativeDistance += distMeters

    splits.push({
      mile_number: s.split,
      split_seconds: splitSecs,
      cumulative_seconds: cumulativeSeconds,
      cumulative_distance_miles: parseFloat((cumulativeDistance / METERS_PER_MILE).toFixed(4)),
    })
  }

  return splits
}

/**
 * Extract mile splits from TCX trackpoints.
 * @param {Array} trackpoints - Array of { distanceMeters, elapsedSeconds }
 * @returns {Array} - DB-ready split objects
 */
export function extractMileSplitsFromTcx(trackpoints) {
  if (!trackpoints || trackpoints.length === 0) return []

  const METERS_PER_MILE = 1609.344
  const splits = []
  const sorted = [...trackpoints]
    .filter(t => t.distanceMeters != null && t.elapsedSeconds != null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  let mileNumber = 1
  let prevCrossSeconds = 0
  let prevCrossDist = 0

  while (true) {
    const targetDist = mileNumber * METERS_PER_MILE
    const afterIdx = sorted.findIndex(t => t.distanceMeters >= targetDist)

    if (afterIdx === -1) {
      // Partial last mile
      const last = sorted[sorted.length - 1]
      if (last && last.distanceMeters > prevCrossDist + 50) {
        const splitSecs = Math.round(last.elapsedSeconds - prevCrossSeconds)
        if (splitSecs > 0) {
          splits.push({
            mile_number: mileNumber,
            split_seconds: splitSecs,
            cumulative_seconds: Math.round(last.elapsedSeconds),
            cumulative_distance_miles: parseFloat((last.distanceMeters / METERS_PER_MILE).toFixed(4)),
          })
        }
      }
      break
    }

    const after = sorted[afterIdx]
    const before = afterIdx > 0 ? sorted[afterIdx - 1] : { distanceMeters: 0, elapsedSeconds: 0 }

    const distRange = after.distanceMeters - before.distanceMeters
    const fraction = distRange > 0 ? (targetDist - before.distanceMeters) / distRange : 0
    const crossSeconds = before.elapsedSeconds + fraction * (after.elapsedSeconds - before.elapsedSeconds)

    const splitSecs = Math.round(crossSeconds - prevCrossSeconds)
    if (splitSecs > 0) {
      splits.push({
        mile_number: mileNumber,
        split_seconds: splitSecs,
        cumulative_seconds: Math.round(crossSeconds),
        cumulative_distance_miles: parseFloat((targetDist / METERS_PER_MILE).toFixed(4)),
      })
    }

    prevCrossSeconds = crossSeconds
    prevCrossDist = targetDist
    mileNumber++
    if (mileNumber > 50) break
  }

  return splits
}
