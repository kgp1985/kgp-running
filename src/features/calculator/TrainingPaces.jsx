import { secondsToTimeStr, pacePerMileToKm } from '../../utils/paceCalc.js'

const ZONES = [
  {
    key: 'recovery',
    label: 'Recovery',
    desc: 'Very easy. Day-after-hard-workout jogs.',
    color: 'blue',
    isRange: true,
  },
  {
    key: 'easy',
    label: 'Easy',
    desc: 'Conversational effort. Daily training runs.',
    color: 'green',
    isRange: true,
  },
  {
    key: 'marathon',
    label: 'Marathon Pace',
    desc: 'Goal marathon effort. Long run finish miles.',
    color: 'teal',
  },
  {
    key: 'threshold',
    label: 'Threshold / Tempo',
    desc: 'Comfortably hard. 20-40 min tempo runs.',
    color: 'yellow',
  },
  {
    key: 'interval',
    label: 'Interval (VO2max)',
    desc: '5K effort. Hard reps with recovery.',
    color: 'orange',
  },
  {
    key: 'repetition',
    label: 'Repetition Speed',
    desc: 'Mile pace or faster. Short reps, full recovery.',
    color: 'red',
  },
]

const COLOR_MAP = {
  blue:   'bg-blue-50 border-blue-100 text-blue-700',
  green:  'bg-green-50 border-green-100 text-green-700',
  teal:   'bg-teal-50 border-teal-100 text-teal-700',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
  orange: 'bg-orange-50 border-orange-100 text-orange-700',
  red:    'bg-red-50 border-red-100 text-red-700',
}

export default function TrainingPaces({ paces }) {
  if (!paces) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Training Paces</h3>
      <div className="space-y-2">
        {ZONES.map(z => {
          const secsPerMile = z.isRange ? paces[z.key]?.hi : paces[z.key]
          const secsPerMileLo = z.isRange ? paces[z.key]?.lo : null
          const secsPerKm = secsPerMile ? pacePerMileToKm(secsPerMile) : null
          const secsPerKmLo = secsPerMileLo ? pacePerMileToKm(secsPerMileLo) : null

          const miStr = z.isRange && secsPerMileLo
            ? `${secondsToTimeStr(secsPerMileLo)}–${secondsToTimeStr(secsPerMile)}/mi`
            : secsPerMile ? `${secondsToTimeStr(secsPerMile)}/mi` : '--'

          const kmStr = z.isRange && secsPerKmLo
            ? `${secondsToTimeStr(secsPerKmLo)}–${secondsToTimeStr(secsPerKm)}/km`
            : secsPerKm ? `${secondsToTimeStr(secsPerKm)}/km` : '--'

          return (
            <div
              key={z.key}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${COLOR_MAP[z.color]}`}
            >
              <div>
                <p className="font-semibold">{z.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{z.desc}</p>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold text-sm">{miStr}</p>
                <p className="text-xs opacity-70">{kmStr}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
