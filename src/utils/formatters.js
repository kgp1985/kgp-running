import { secondsToTimeStr, formatPace, pacePerMileToKm, milesTo } from './paceCalc.js'

/**
 * Format a distance for display.
 */
export function formatDistance(miles, unit = 'mi', decimals = 2) {
  const val = milesTo(miles, unit)
  return `${val.toFixed(decimals)} ${unit}`
}

/**
 * Format a duration in seconds as a readable time string.
 */
export function formatDuration(totalSeconds) {
  return secondsToTimeStr(totalSeconds, false)
}

/**
 * Format a pace in seconds/mile as both mi and km pace strings.
 */
export function formatBothPaces(secsPerMile) {
  if (!secsPerMile) return { mi: '--', km: '--' }
  const secsPerKm = pacePerMileToKm(secsPerMile)
  return {
    mi: formatPace(secsPerMile, 'mi'),
    km: formatPace(secsPerKm, 'km'),
  }
}

/**
 * Format a date string (ISO 8601) to readable format.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr + 'T00:00:00') // avoid timezone shifts
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format a date string to short format (Jan 5).
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format heart rate.
 */
export function formatHR(bpm) {
  if (!bpm) return '--'
  return `${Math.round(bpm)} bpm`
}

/**
 * Render an effort level as filled dots out of 10.
 */
export function effortDots(level, max = 10) {
  return '●'.repeat(level) + '○'.repeat(max - level)
}
