import { WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'

const MODE_BADGE = {
  current:     { label: '📍 Current paces',     color: 'bg-gray-100 text-gray-600' },
  progressive: { label: '↗ Progressive paces',  color: 'bg-violet-100 text-violet-700' },
  goal:        { label: '🎯 Goal paces',         color: 'bg-red-100 text-red-600' },
}

export default function WorkoutExamples({ workouts, typeColor, hasVdot, vdotMode = 'current', vdotValue }) {
  const colors = WORKOUT_TYPE_COLORS[typeColor] || WORKOUT_TYPE_COLORS.blue
  const badge  = MODE_BADGE[vdotMode] || MODE_BADGE.current

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base font-semibold text-gray-900">
          {hasVdot ? 'Personalized Workouts' : 'Example Workouts'}
        </h3>
        {hasVdot && vdotValue ? (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        ) : (
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
            <div className="flex items-start justify-between mt-2 gap-2">
              {w.totalDist && (
                <span className="text-xs text-gray-500 shrink-0">Total: {w.totalDist}</span>
              )}
              {w.notes && (
                <span className="text-xs text-gray-500 italic text-right">{w.notes}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
