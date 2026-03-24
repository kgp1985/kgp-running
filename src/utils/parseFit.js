import FitParser from 'fit-file-parser'

export function parseFitFile(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    })
    fitParser.parse(arrayBuffer, (error, data) => {
      if (error) return reject(error)
      const session = data?.activity?.sessions?.[0]
      if (!session) return reject(new Error('No session found in FIT file'))
      resolve({
        date: new Date(session.start_time).toISOString().slice(0, 10),
        distance: parseFloat((session.total_distance / 1.60934).toFixed(2)), // km to miles
        duration: Math.round(session.total_elapsed_time),
        workoutType: 'easy',
        notes: '',
        source: 'fit',
        elevationGain: session.total_ascent ? Math.round(session.total_ascent * 3.28084) : null,
      })
    })
  })
}

export function parseFitFileWithRecords(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    })
    fitParser.parse(arrayBuffer, (error, data) => {
      if (error) return reject(error)
      const session = data?.activity?.sessions?.[0]
      if (!session) return reject(new Error('No session found in FIT file'))

      const run = {
        date: new Date(session.start_time).toISOString().slice(0, 10),
        distance: parseFloat((session.total_distance / 1.60934).toFixed(2)),
        duration: Math.round(session.total_elapsed_time),
        workoutType: 'easy',
        notes: '',
        source: 'fit',
        elevationGain: session.total_ascent ? Math.round(session.total_ascent * 3.28084) : null,
      }

      // Extract record messages — try cascade structure first, then flat
      let rawRecords = []
      if (session.laps) {
        for (const lap of session.laps) {
          if (lap.records) rawRecords.push(...lap.records)
        }
      }
      if (rawRecords.length === 0 && data.records) {
        rawRecords = data.records
      }

      // Normalize: distance in meters, timestamp as Date
      const records = rawRecords
        .filter(r => r.distance != null && r.timestamp != null)
        .map(r => ({
          distance: r.distance * 1000, // km → meters
          timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
        }))

      resolve({ run, records, startTime: session.start_time })
    })
  })
}
