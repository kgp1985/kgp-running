import { METERS_PER_MILE, METERS_PER_KM } from '../data/raceDistances.js'

/**
 * Convert total seconds to mm:ss or h:mm:ss string.
 */
export function secondsToTimeStr(totalSeconds, forceHours = false) {
  if (!totalSeconds && totalSeconds !== 0) return '--'
  const s = Math.round(totalSeconds)
  const hours = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hours > 0 || forceHours) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Parse a time string (mm:ss or h:mm:ss) to total seconds.
 * Returns null if invalid.
 */
export function timeStrToSeconds(str) {
  if (!str) return null
  const parts = str.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) {
    const [m, s] = parts
    if (s >= 60) return null
    return m * 60 + s
  }
  if (parts.length === 3) {
    const [h, m, s] = parts
    if (m >= 60 || s >= 60) return null
    return h * 3600 + m * 60 + s
  }
  return null
}

/**
 * Calculate pace in seconds per mile from distance (miles) and duration (seconds).
 */
export function calcPacePerMile(distanceMiles, durationSeconds) {
  if (!distanceMiles || !durationSeconds) return null
  return durationSeconds / distanceMiles
}

/**
 * Convert pace per mile (seconds) to pace per km (seconds).
 */
export function pacePerMileToKm(secsPerMile) {
  if (!secsPerMile) return null
  return secsPerMile * METERS_PER_KM / METERS_PER_MILE
}

/**
 * Convert pace per km (seconds) to pace per mile (seconds).
 */
export function pacePerKmToMile(secsPerKm) {
  if (!secsPerKm) return null
  return secsPerKm * METERS_PER_MILE / METERS_PER_KM
}

/**
 * Convert a distance in km to miles.
 */
export function kmToMiles(km) {
  return km / (METERS_PER_MILE / METERS_PER_KM)
}

/**
 * Convert a distance in miles to km.
 */
export function milesToKm(miles) {
  return miles * (METERS_PER_MILE / METERS_PER_KM)
}

/**
 * Convert distance to meters.
 */
export function distanceToMeters(value, unit) {
  if (unit === 'km') return value * METERS_PER_KM
  return value * METERS_PER_MILE // default miles
}

/**
 * Convert distance from miles to the given unit.
 */
export function milesTo(miles, unit) {
  if (unit === 'km') return milesToKm(miles)
  return miles
}

/**
 * Format a pace (seconds per mile or km) as mm:ss/unit string.
 */
export function formatPace(secsPerUnit, unit = 'mi') {
  if (!secsPerUnit) return '--'
  return `${secondsToTimeStr(secsPerUnit)}/${unit}`
}

/**
 * Given seconds/mile pace and target distance in miles, compute total time in seconds.
 */
export function paceToTime(secsPerMile, distanceMiles) {
  return secsPerMile * distanceMiles
}
