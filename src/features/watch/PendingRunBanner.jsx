/**
 * PendingRunBanner
 *
 * Shown at the top of the page when the signed-in user has watch-synced runs
 * awaiting review. Mirrors the Strava post-run prompt experience.
 */
import { useState } from 'react'
import { usePendingRuns } from '../../hooks/usePendingRuns.js'
import { useProfile } from '../../hooks/useProfile.js'
import PendingRunCard from './PendingRunCard.jsx'

export default function PendingRunBanner() {
  const { pendingRuns, loading, saveRun, dismiss } = usePendingRuns()
  const { profile } = useProfile()
  const [expanded, setExpanded] = useState(true)

  if (loading || pendingRuns.length === 0) return null

  const count = pendingRuns.length

  return (
    <div className="mb-6">
      {/* Banner header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between bg-black text-white rounded-2xl px-5 py-3.5 mb-3 hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">⌚</span>
          <div className="text-left">
            <p className="text-sm font-bold">
              {count === 1
                ? '1 run synced from your watch'
                : `${count} runs synced from your watch`}
            </p>
            <p className="text-xs text-gray-400">
              Review and save {count === 1 ? 'it' : 'them'} to your log
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Run cards */}
      {expanded && (
        <div className="space-y-4">
          {pendingRuns.map(run => (
            <PendingRunCard
              key={run.id}
              run={run}
              onSave={saveRun}
              onDismiss={dismiss}
              defaultIsPublic={profile?.isPublic ?? false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
