import { WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'

export default function WorkoutExamples({ workouts, typeColor, hasVdot }) {
  const colors = WORKOUT_TYPE_COLORS[typeColor] || WORKOUT_TYPE_COLORS.blue

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          {hasVdot ? 'Personalized Workouts' : 'Example Workouts'}
        </h3>
        {!hasVdot && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            Log races for personalized paces
          </span>
        )}
      </div>

      <div className="space-y-3">
        {workouts.map((w, i) => (
          <div key={i} className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
            <h4 className={`text-sm font-bold ${colors.text}`}>{w.title}</h4>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{w.details}</p>
            <div className="flex items-center justify-between mt-2">
              {w.totalDist && (
                <span className="text-xs text-gray-500">Total: {w.totalDist}</span>
              )}
              {w.notes && (
                <span className="text-xs text-gray-500 italic">{w.notes}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
