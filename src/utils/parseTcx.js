export function parseTcxFile(text) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')
  const activity = xml.querySelector('Activity')
  const startTime = activity?.querySelector('Id')?.textContent || ''
  const totalTime = parseFloat(xml.querySelector('TotalTimeSeconds')?.textContent || '0')
  const distanceM = parseFloat(xml.querySelector('DistanceMeters')?.textContent || '0')

  // Compute elevation gain from track points
  const altitudes = [...xml.querySelectorAll('AltitudeMeters')]
    .map(el => parseFloat(el.textContent))
    .filter(n => !isNaN(n))
  let elevGainM = 0
  for (let i = 1; i < altitudes.length; i++) {
    const delta = altitudes[i] - altitudes[i - 1]
    if (delta > 0) elevGainM += delta
  }

  return {
    date: startTime ? new Date(startTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    distance: parseFloat((distanceM / 1609.34).toFixed(2)),
    duration: Math.round(totalTime),
    workoutType: 'easy',
    notes: '',
    source: 'tcx',
    elevationGain: elevGainM > 0 ? Math.round(elevGainM * 3.28084) : null,
  }
}

export function parseTcxFileWithTrackpoints(text) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')

  // Get start time from first trackpoint
  const firstTime = xml.querySelector('TrackPoint Time')?.textContent
  const startMs = firstTime ? new Date(firstTime).getTime() : null

  const trackpointEls = [...xml.querySelectorAll('Trackpoint')]
  const trackpoints = trackpointEls
    .map(tp => {
      const timeStr = tp.querySelector('Time')?.textContent
      const distStr = tp.querySelector('DistanceMeters')?.textContent
      if (!timeStr || !distStr) return null
      const distMeters = parseFloat(distStr)
      const elapsedSeconds = startMs ? (new Date(timeStr).getTime() - startMs) / 1000 : null
      if (isNaN(distMeters) || elapsedSeconds === null) return null
      return { distanceMeters: distMeters, elapsedSeconds }
    })
    .filter(Boolean)

  // Also compute the summary run object (reuse existing parseTcxFile logic)
  const run = parseTcxFile(text)
  return { run, trackpoints }
}
