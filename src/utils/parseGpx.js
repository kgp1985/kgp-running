/**
 * GPX file parser for extracting run metrics from GPS tracks.
 * Supports track points (trkpt) with latitude, longitude, elevation, time, and optional heart rate.
 */

/**
 * Parse a GPX File object and extract run metrics.
 * @param {File} file - The GPX file to parse
 * @returns {Promise<{date, distanceMiles, durationSeconds, elevationGainFeet, heartRate, source}>}
 */
export async function parseGpxFile(file) {
  const text = await file.text()
  return parseGpxString(text)
}

/**
 * Parse GPX XML string and extract run metrics.
 * @param {string} gpxText - The raw GPX XML string
 * @returns {{date, distanceMiles, durationSeconds, elevationGainFeet, heartRate, source}}
 * @throws Error if parsing fails
 */
export function parseGpxString(gpxText) {
  if (!gpxText || typeof gpxText !== 'string') {
    throw new Error('Invalid GPX input')
  }

  let doc
  try {
    const parser = new DOMParser()
    doc = parser.parseFromString(gpxText, 'application/xml')

    // Check for XML parse errors
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Failed to parse GPX: invalid XML')
    }
  } catch (err) {
    throw new Error(`Failed to parse GPX: ${err.message}`)
  }

  // Extract track points (trkpt elements)
  const trkpts = Array.from(doc.getElementsByTagName('trkpt'))
  if (trkpts.length === 0) {
    throw new Error('No track points found in GPX file')
  }

  // Parse each track point
  const points = trkpts.map((trkpt) => {
    const lat = parseFloat(trkpt.getAttribute('lat'))
    const lon = parseFloat(trkpt.getAttribute('lon'))

    if (isNaN(lat) || isNaN(lon)) {
      return null
    }

    // Get elevation (ele element)
    const eleElem = trkpt.querySelector('ele')
    const ele = eleElem ? parseFloat(eleElem.textContent) : null

    // Get timestamp (time element)
    const timeElem = trkpt.querySelector('time')
    const time = timeElem ? timeElem.textContent : null

    // Get heart rate — try both gpxtpx:hr and ns3:hr
    let hr = null
    const hrElem = trkpt.querySelector('[*|localName="hr"]')
      || trkpt.querySelector('gpxtpx\\:hr')
      || trkpt.querySelector('ns3\\:hr')
    if (hrElem) {
      const hrVal = parseFloat(hrElem.textContent)
      hr = !isNaN(hrVal) && hrVal > 0 ? hrVal : null
    }

    return { lat, lon, ele, time, hr }
  }).filter(Boolean)

  if (points.length === 0) {
    throw new Error('No valid track points in GPX file')
  }

  // Extract date from first timestamp
  const firstTime = points[0].time
  let date = null
  if (firstTime) {
    try {
      date = new Date(firstTime).toISOString().slice(0, 10)
    } catch {
      // Fall back to today if parsing fails
      date = new Date().toISOString().slice(0, 10)
    }
  } else {
    date = new Date().toISOString().slice(0, 10)
  }

  // Calculate distance using Haversine formula
  const distanceMeters = calculateDistance(points)
  const distanceMiles = distanceMeters / 1609.344

  // Calculate duration from first to last timestamp
  let durationSeconds = 0
  if (points[0].time && points[points.length - 1].time) {
    try {
      const start = new Date(points[0].time).getTime()
      const end = new Date(points[points.length - 1].time).getTime()
      durationSeconds = Math.round((end - start) / 1000)
    } catch {
      durationSeconds = 0
    }
  }

  // Calculate elevation gain (sum of positive deltas > 1m, filtering GPS noise)
  let elevationGainFeet = null
  if (points.some((p) => p.ele !== null)) {
    let totalGainMeters = 0
    for (let i = 1; i < points.length; i++) {
      const prevEle = points[i - 1].ele
      const currEle = points[i].ele
      if (prevEle !== null && currEle !== null) {
        const delta = currEle - prevEle
        if (delta > 1) {
          totalGainMeters += delta
        }
      }
    }
    if (totalGainMeters > 0) {
      elevationGainFeet = Math.round(totalGainMeters * 3.28084)
    }
  }

  // Calculate average heart rate from valid HR data
  let heartRate = null
  const hrValues = points
    .map((p) => p.hr)
    .filter((hr) => hr !== null && hr > 0)
  if (hrValues.length > 0) {
    heartRate = Math.round(
      hrValues.reduce((s, v) => s + v, 0) / hrValues.length
    )
  }

  return {
    date,
    distanceMiles: parseFloat(distanceMiles.toFixed(2)),
    durationSeconds,
    elevationGainFeet,
    heartRate,
    source: 'gpx',
  }
}

/**
 * Calculate total distance in meters using Haversine formula.
 * @param {Array} points - Array of {lat, lon, ele, time, hr} objects
 * @returns {number} Distance in meters
 */
function calculateDistance(points) {
  if (points.length < 2) return 0

  const R = 6371000 // Earth radius in meters
  let totalDistance = 0

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1]
    const p2 = points[i]

    const lat1 = (p1.lat * Math.PI) / 180
    const lat2 = (p2.lat * Math.PI) / 180
    const deltaLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const deltaLon = ((p2.lon - p1.lon) * Math.PI) / 180

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    totalDistance += distance
  }

  return totalDistance
}
