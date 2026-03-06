import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import WorkoutSelector from '../features/workouts/WorkoutSelector.jsx'
import WorkoutTypeCard from '../features/workouts/WorkoutTypeCard.jsx'
import WorkoutExamples from '../features/workouts/WorkoutExamples.jsx'
import { WORKOUT_TYPES } from '../data/workoutTypes.js'
import { generateWorkouts } from '../utils/workoutGenerator.js'
import { calculateVDOT } from '../utils/vdot.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'

export default function WorkoutTypes() {
  const [selected, setSelected] = useState('easy')
  const { runs } = useRunningLogDb()

  // Derive best VDOT from the user's run log
  const vdot = (() => {
    const candidates = runs.filter(r => r.distance >= 1 && r.duration > 0)
    if (!candidates.length) return null
    let best = null
    for (const r of candidates) {
      const meters = r.distance * 1609.344
      const v = calculateVDOT(meters, r.duration)
      if (v && (!best || v > best)) best = v
    }
    return best
  })()
  const type = WORKOUT_TYPES[selected]
  const workouts = generateWorkouts(selected, vdot)

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workout Types</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Learn what each workout type trains and see{vdot ? ' personalized' : ''} example sessions.
          {vdot && (
            <span className="ml-1 text-red-600 font-medium">
              VDOT ~{vdot.toFixed(0)} (from your log)
            </span>
          )}
        </p>
      </div>

      {/* Type selector */}
      <div className="card mb-6">
        <WorkoutSelector selected={selected} onSelect={setSelected} />
      </div>

      {type && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkoutTypeCard type={type} />
          <WorkoutExamples
            workouts={workouts}
            typeColor={type.color}
            hasVdot={!!vdot}
          />
        </div>
      )}

      {/* Info footer */}
      {!vdot && (
        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
          <span className="font-semibold">Tip: </span>
          Add runs to your <a href="/log" className="underline font-semibold">Running Log</a> and workouts
          will automatically show personalized paces based on your fitness level.
        </div>
      )}
    </PageWrapper>
  )
}
