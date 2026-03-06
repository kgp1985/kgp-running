import { WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'

export default function WorkoutTypeCard({ type }) {
  const colors = WORKOUT_TYPE_COLORS[type.color] || WORKOUT_TYPE_COLORS.blue

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-3">
        <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
        <div>
          <h2 className="text-xl font-bold text-gray-900">{type.label}</h2>
          <p className="text-gray-600 text-sm mt-1 leading-relaxed">{type.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Effort</p>
          <p className={`text-sm font-bold ${colors.text}`}>{type.rpe}</p>
        </div>
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Frequency</p>
          <p className={`text-sm font-bold ${colors.text}`}>{type.weeklyFrequency}</p>
        </div>
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Duration</p>
          <p className={`text-sm font-bold ${colors.text}`}>{type.durationRange}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Purpose</p>
        <p className="text-sm text-gray-600">{type.purpose}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Guidelines</p>
        <ul className="space-y-1">
          {type.guidelines.map((g, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${colors.dot}`} />
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
