import { usePersonalRecordsDb } from '../../hooks/usePersonalRecordsDb.js'
import { secondsToTimeStr } from '../../utils/paceCalc.js'
import { formatDate } from '../../utils/formatters.js'

const DISTANCE_ORDER = ['Mile', '5K', '10K', 'Half Marathon', 'Marathon']

export default function PersonalRecords() {
  const { prs } = usePersonalRecordsDb()

  const prList = DISTANCE_ORDER
    .filter(d => prs[d])
    .map(d => ({ label: d, ...prs[d] }))

  const otherPRs = Object.keys(prs)
    .filter(d => !DISTANCE_ORDER.includes(d))
    .map(d => ({ label: d, ...prs[d] }))

  const allPRs = [...prList, ...otherPRs]

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Records</h2>
      {allPRs.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">🏅</p>
          <p className="text-sm">No PRs yet. Log races in the Running Log and PRs will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allPRs.map(pr => (
            <div key={pr.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm font-medium text-gray-700">{pr.label}</span>
              <div className="text-right">
                <span className="text-sm font-bold text-red-500">{secondsToTimeStr(pr.time, true)}</span>
                {pr.date && (
                  <span className="text-xs text-gray-400 ml-2">{formatDate(pr.date)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        PRs update automatically when you log races near standard distances.
      </p>
    </div>
  )
}
