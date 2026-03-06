import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { formatDistance, formatDuration } from '../../utils/formatters.js'
import { secondsToTimeStr } from '../../utils/paceCalc.js'

export default function RecentStats() {
  const { getRecentRuns, computeStats } = useRunningLogDb()
  const recent = getRecentRuns(30)
  const stats = computeStats(recent)

  const StatBlock = ({ label, value, sub }) => (
    <div className="text-center p-4 bg-gray-50 rounded-xl">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-red-500 font-medium">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )

  const avgPaceStr = stats.avgPacePerMile ? secondsToTimeStr(stats.avgPacePerMile) + '/mi' : '--'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Last 30 Days</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{stats.totalRuns} run{stats.totalRuns !== 1 ? 's' : ''}</span>
      </div>

      {stats.totalRuns === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No runs logged yet. Head to the Running Log to add your first run!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBlock
            label="Total Miles"
            value={stats.totalMiles.toFixed(1)}
            sub="miles"
          />
          <StatBlock
            label="Total Time"
            value={formatDuration(recent.reduce((s, r) => s + r.duration, 0))}
          />
          <StatBlock
            label="Longest Run"
            value={stats.longestMiles.toFixed(1)}
            sub="miles"
          />
          <StatBlock
            label="Avg Pace"
            value={avgPaceStr}
          />
        </div>
      )}
    </div>
  )
}
