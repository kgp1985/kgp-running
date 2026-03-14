import { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunPostCard from '../features/community/RunPostCard.jsx'
import { useCommunityFeed } from '../hooks/useCommunityFeed.js'
import { useProfile } from '../hooks/useProfile.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { calculateCurrentVDOT } from '../utils/vdot.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { useAuth } from '../context/AuthContext.jsx'

// ── Profile Settings Panel ────────────────────────────────────────────────────

function ProfileSettingsPanel({ profile, loading, saveProfile }) {
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState(null)

  // Sync input whenever profile data arrives (fixes first-load blank state)
  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName)
  }, [profile?.displayName])

  const handleNameChange = (val) => {
    setDisplayName(val)
    setSaved(false)
    setError(null)
  }

  const handleTogglePublic = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveProfile({ isPublic: !(profile?.isPublic ?? false) })
    } catch (e) {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await saveProfile({ displayName: displayName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="card mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
          <span className="text-[10px] font-bold text-red-400">
            {(profile?.displayName || '?')[0].toUpperCase()}
          </span>
        </span>
        Your Profile Settings
      </h2>

      <div className="space-y-4">
        {/* Public toggle */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Public Profile</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {profile?.isPublic
                ? 'Your public runs appear in the Community feed'
                : 'Enable to share your runs with the community'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePublic}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              profile?.isPublic ? 'bg-red-500' : 'bg-gray-300'
            }`}
            aria-pressed={profile?.isPublic}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              profile?.isPublic ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Display name */}
        <div>
          <label className="label">Display Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Your name as shown on post cards"
              maxLength={40}
              value={displayName}
              onChange={e => handleNameChange(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={saving || !displayName.trim()}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              {saved ? '✓ Saved' : saving ? '…' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CommunityFeed() {
  const { user } = useAuth()
  const { runs: communityRuns, prsMap, shoesMap, loading, loadingMore, hasMore, loadMore, refresh } = useCommunityFeed()
  const { profile, loading: profileLoading, saveProfile } = useProfile()

  // For VDOT signal on the current user's own runs — optional enrichment
  const { prs } = usePersonalRecordsDb()
  const { runs: myRuns } = useRunningLogDb()
  const myCurrentVdot = myRuns.length || Object.keys(prs).length
    ? calculateCurrentVDOT(prs, myRuns)?.vdot ?? null
    : null

  const [filterType, setFilterType] = useState('')

  const filteredRuns = filterType
    ? communityRuns.filter(r => r.workoutType === filterType)
    : communityRuns

  // Unique workout types present in the feed for the filter chips
  const presentTypes = [...new Set(communityRuns.map(r => r.workoutType))]

  const TYPE_CHIP_LABELS = {
    easy: 'Easy', recovery: 'Recovery', long: 'Long Run',
    tempo: 'Tempo', interval: 'Intervals', repetition: 'Speed',
    tuneup: 'Tune-up', keyrace: 'Race',
  }

  return (
    <PageWrapper>
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Public runs from all runners on KGP Running
        </p>
      </div>

      {/* ── Profile settings (signed-in users only) ── */}
      {user && (
        <ProfileSettingsPanel
          profile={profile}
          loading={profileLoading}
          saveProfile={saveProfile}
        />
      )}

      {/* ── Filter chips ── */}
      {presentTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterType === ''
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            All
          </button>
          {presentTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(t => t === type ? '' : type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterType === type
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {TYPE_CHIP_LABELS[type] ?? type}
            </button>
          ))}
        </div>
      )}

      {/* ── Feed ── */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading community runs…</div>
      ) : filteredRuns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-sm font-medium text-gray-500">
            {communityRuns.length === 0
              ? 'No public runs yet. Be the first — toggle your profile public!'
              : 'No runs match the selected filter.'}
          </p>
          {user && !profile?.isPublic && communityRuns.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Enable "Public Profile" above and mark individual runs as public to share them here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRuns.map(run => {
            const userPrs  = prsMap.get(run.userId) ?? {}
            const shoeName = run.shoeId ? shoesMap.get(run.shoeId) ?? null : null
            // Use current user's VDOT for their own runs; can't compute for others without all their runs
            const vdot = run.userId === user?.id ? myCurrentVdot : null

            return (
              <RunPostCard
                key={run.id}
                run={run}
                prs={userPrs}
                shoeName={shoeName}
                currentVdot={vdot}
              />
            )
          })}
        </div>
      )}

      {/* ── Load more ── */}
      {!loading && hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* ── No signed-in prompt ── */}
      {!user && !loading && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-sm text-gray-600 text-center">
          <a href="/login" className="text-red-500 hover:text-red-700 font-semibold underline">Sign in</a>
          {' '}to share your runs and appear in the community feed.
        </div>
      )}
    </PageWrapper>
  )
}
