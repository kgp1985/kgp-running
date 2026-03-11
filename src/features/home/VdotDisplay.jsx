import { useMemo } from 'react'
import { usePersonalRecordsDb } from '../../hooks/usePersonalRecordsDb.js'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { useVdotGoal } from '../../hooks/useVdotGoal.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { calculateCurrentVDOT } from '../../utils/vdot.js'

// Map recency weight → human label
function weightLabel(w) {
  if (w >= 0.95) return 'last 6 mo'
  if (w >= 0.60) return '6–12 mo'
  return '12–18 mo'
}

// Interpret the delta between current and goal
function deltaLabel(current, goal) {
  const diff = +(goal - current).toFixed(1)
  if (diff <= 0) return { text: `${Math.abs(diff)} ahead of goal 🎉`, color: 'text-green-600' }
  if (diff <= 2) return { text: `${diff} pts to go`, color: 'text-yellow-600' }
  return { text: `${diff} pts to go`, color: 'text-red-500' }
}

export default function VdotDisplay() {
  const { user } = useAuth()
  const { prs, loading: prsLoading } = usePersonalRecordsDb()
  const { runs, loading: runsLoading } = useRunningLogDb()
  const { goalData, loading: goalLoading } = useVdotGoal()

  const current = useMemo(() => {
    if (prsLoading || runsLoading) return null
    return calculateCurrentVDOT(prs, runs)
  }, [prs, runs, prsLoading, runsLoading])

  const loading = prsLoading || runsLoading || goalLoading

  // Don't render if not logged in and no data at all
  if (!user) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">📊 VDOT Fitness</h2>
        {!goalLoading && !goalData && (
          <a
            href="/calculator"
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Set a goal →
          </a>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">

          {/* ── Current VDOT ───────────────────────────────────── */}
          <div className={`rounded-xl p-4 text-center ${current ? 'bg-black' : 'bg-gray-50'}`}>
            {current ? (
              <>
                <p className="text-4xl font-bold text-red-400 leading-none">{current.vdot}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase">Current VDOT</p>
                {current.modifier !== 0 && (
                  <p className={`text-[10px] mt-1 ${current.modifier > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {current.modifier > 0 ? `+${current.modifier}` : current.modifier} training adj.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-3xl text-gray-300 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-1">Current VDOT</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-snug">Log a 5K+ PR to calculate</p>
              </>
            )}
          </div>

          {/* ── Goal VDOT ──────────────────────────────────────── */}
          <div className={`rounded-xl p-4 text-center ${goalData ? 'bg-red-50 border-2 border-red-100' : 'bg-gray-50'}`}>
            {goalData ? (
              <>
                <p className="text-4xl font-bold text-red-500 leading-none">{goalData.goalVdot.toFixed(1)}</p>
                <p className="text-xs text-red-400 mt-1 font-medium tracking-wide uppercase">Goal VDOT</p>
                {goalData.goalRaceDist && (
                  <p className="text-[10px] text-red-400 mt-0.5 truncate">
                    {goalData.goalRaceDist}
                    {goalData.goalRaceTime ? ` · ${goalData.goalRaceTime}` : ''}
                  </p>
                )}
                {current && goalData && (
                  <p className={`text-[10px] mt-1.5 font-medium ${deltaLabel(current.vdot, goalData.goalVdot).color}`}>
                    {deltaLabel(current.vdot, goalData.goalVdot).text}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-3xl text-gray-300 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-1">Goal VDOT</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-snug">Set on the Race Calculator page</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── How it's calculated ─────────────────────────────────── */}
      {current && (
        <div className="mt-3 text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
          <p className="font-medium text-gray-500 mb-1">How current VDOT is calculated</p>
          <p>
            Weighted average of your {current.contributing.length > 1 ? `${current.contributing.length} recent PRs` : 'most recent PR'} using
            Jack Daniels' VO₂max formula.{' '}
            PRs within 6 months count fully; 6–12 months at 65%; 12–18 months at 30%.
            {current.modifier !== 0
              ? ` A training-volume adjustment of ${current.modifier > 0 ? '+' : ''}${current.modifier} pts was applied based on your 8-week vs. 52-week average mileage.`
              : ''}
          </p>
          {current.contributing.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
              {current.contributing.map(c => (
                <span key={c.label} className="text-gray-400">
                  {c.label} <span className="text-gray-600 font-medium">{c.vdot}</span>
                  <span className="text-gray-300"> ({weightLabel(c.weight)})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
