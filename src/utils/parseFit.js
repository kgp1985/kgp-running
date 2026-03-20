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
