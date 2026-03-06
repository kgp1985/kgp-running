import { secondsToTimeStr } from '../../utils/paceCalc.js'

const DISTANCES = [
  { key: '1500m', label: '1500m' },
  { key: '1mile', label: '1 Mile' },
  { key: '3K', label: '3K' },
  { key: '5K', label: '5K' },
  { key: '10K', label: '10K' },
  { key: 'HM', label: 'Half Marathon' },
  { key: 'M', label: 'Marathon' },
]

export default function EquivalentRaces({ raceTimes, inputDistanceKey }) {
  if (!raceTimes) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Equivalent Race Performances</h3>
      <div className="space-y-2">
        {DISTANCES.map(d => {
          const t = raceTimes[d.key]
          const isInput = d.key === inputDistanceKey
          return (
            <div
              key={d.key}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                isInput ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
              }`}
            >
              <span className={`font-medium ${isInput ? 'text-red-700' : 'text-gray-700'}`}>
                {d.label}
                {isInput && <span className="ml-1.5 text-xs text-red-400">(input)</span>}
              </span>
              <span className={`font-bold tabular-nums ${isInput ? 'text-red-600' : 'text-gray-900'}`}>
                {t ? secondsToTimeStr(t, t >= 3600) : '--'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
