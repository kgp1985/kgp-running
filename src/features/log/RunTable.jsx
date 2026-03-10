import RunRow from './RunRow.jsx'

const HEADERS = [
  { label: 'Date', key: 'date' },
  { label: 'Type', key: 'workoutType' },
  { label: 'Distance', key: 'distance' },
  { label: 'Time', key: 'duration' },
  { label: 'Pace', key: 'pace' },
  { label: 'HR', key: 'heartRate' },
  { label: '', key: 'actions' },
]

export default function RunTable({ runs, onDelete, onEdit }) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🏃</p>
        <p className="text-sm font-medium text-gray-500">No runs yet</p>
        <p className="text-xs mt-1">Add your first run using the form above.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-left min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100">
            {HEADERS.map(h => (
              <th key={h.key} className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {runs.map(run => (
            <RunRow key={run.id} run={run} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
