import { useState, useEffect } from 'react'
import { getMileageLeaders, getFastestEventTimes } from '../../api/leaderboardApi'

export default function LeaderboardWidget() {
  const [period, setPeriod] = useState('month')
  const [leaders, setLeaders] = useState([])
  const [fastest, setFastest] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getMileageLeaders(period), getFastestEventTimes()])
      .then(([l, f]) => { setLeaders(l); setFastest(f) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  const medals = ['🥇', '🥈', '🥉']

  // Format duration seconds to MM:SS or H:MM:SS
  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${m}:${String(s).padStart(2,'0')}`
  }

  return (
    <div className="bg-zinc-950 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-base">🏆 Leaderboard</h2>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
          {['month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${period === p ? 'bg-white text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {p === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Milers */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Top Milers</p>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : leaders.length === 0 ? (
            <p className="text-zinc-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {leaders.map((l, i) => (
                <div key={l.userId} className="flex items-center gap-3">
                  <span className="text-lg w-6">{medals[i]}</span>
                  <span className="text-white text-sm font-medium flex-1">{l.displayName || 'Runner'}</span>
                  <span className="text-zinc-400 text-sm">{l.miles} mi</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-zinc-600 text-xs mt-3">Top 3 at month-end earn a medal. Top 3 at year-end earn a trophy.</p>
        </div>

        {/* Fastest Times */}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Course Records</p>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : (
            <div className="space-y-2">
              {['5K', '10K', 'Half Marathon', 'Marathon'].map(event => {
                const record = fastest[event]
                return (
                  <div key={event} className="flex items-center gap-3">
                    <span className="text-zinc-400 text-xs w-24 shrink-0">{event}</span>
                    {record ? (
                      <>
                        <span className="text-white text-sm font-medium flex-1">{record.displayName || 'Runner'}</span>
                        <span className="text-zinc-400 text-sm font-mono">{fmtTime(record.duration)}</span>
                      </>
                    ) : (
                      <span className="text-zinc-600 text-sm">No record yet</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
