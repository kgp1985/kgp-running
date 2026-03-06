import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'

export default function WorkoutSelector({ selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(WORKOUT_TYPES).map(type => {
        const colors = WORKOUT_TYPE_COLORS[type.color]
        const isSelected = selected === type.key
        return (
          <button
            key={type.key}
            onClick={() => onSelect(type.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              isSelected
                ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {type.label}
          </button>
        )
      })}
    </div>
  )
}
