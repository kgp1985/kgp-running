import { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunPostCard from '../features/community/RunPostCard.jsx'
import { useCommunityFeed } from '../hooks/useCommunityFeed.js'
import { useProfile } from '../hooks/useProfile.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { calculateCurrentVDOT } from '../utils/vdot.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { useAuth } from '../context/AuthContext.jsx'
import { setAllRunsPublic } from '../api/runsApi.js'
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
  searchUsers,
  fetchFriendsFeed,
} from '../api/friendsApi.js'
import {
  upsertReaction,
  removeReaction,
  getReactionsForRuns,
} from '../api/reactionsApi.js'
import {
  getComments,
  addComment,
  deleteComment,
} from '../api/commentsApi.js'

// ── Workout type labels ────────────────────────────────────────────────────────

const TYPE_CHIP_LABELS = {
  easy: 'Easy', recovery: 'Recovery', long: 'Long Run',
  tempo: 'Tempo', interval: 'Intervals', repetition: 'Speed',
  tuneup: 'Tune-up', keyrace: 'Race',
}

// ── Profile Settings Panel ────────────────────────────────────────────────────

function ProfileSettingsPanel({ profile, loading, saveProfile, userId }) {
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
    const newIsPublic = !(profile?.isPublic ?? false)
    setSaving(true)
    setError(null)
    try {
      await saveProfile({ isPublic: newIsPublic })
      // When going public, bulk-flip all existing runs to public too
      if (newIsPublic && userId) {
        await setAllRunsPublic(userId)
      }
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

  // Tab state
  const [communityTab, setCommunityTab] = useState('world')

  // Friends + Run Club state
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [clubRuns, setClubRuns] = useState([])
  const [loadingClub, setLoadingClub] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Reactions state (bulk loaded)
  const [allReactions, setAllReactions] = useState([])

  // Filter state
  const [filterType, setFilterType] = useState('')

  const filteredRuns = filterType
    ? communityRuns.filter(r => r.workoutType === filterType)
    : communityRuns

  // Unique workout types present in the feed for the filter chips
  const presentTypes = [...new Set(communityRuns.map(r => r.workoutType))]

  // Load friends and pending requests on mount
  useEffect(() => {
    if (user?.id) {
      loadFriendsData()
    }
  }, [user?.id])

  // Load club feed when tab changes to 'club' or friends update
  useEffect(() => {
    if (communityTab === 'club' && user?.id) {
      loadClubFeed()
    }
  }, [communityTab, user?.id, friends.length])

  // Bulk load reactions for current feed
  useEffect(() => {
    const runIds = communityTab === 'world'
      ? filteredRuns.map(r => r.id)
      : clubRuns.map(r => r.id)

    if (runIds.length > 0) {
      getReactionsForRuns(runIds)
        .then(setAllReactions)
        .catch(err => console.error('Failed to load reactions:', err))
    } else {
      setAllReactions([])
    }
  }, [filteredRuns, clubRuns, communityTab])

  // Load friends and pending requests
  const loadFriendsData = async () => {
    try {
      const [friendsData, pendingData] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ])
      setFriends(friendsData)
      setPendingRequests(pendingData)
    } catch (err) {
      console.error('Failed to load friends data:', err)
    }
  }

  // Load Run Club feed
  const loadClubFeed = async () => {
    setLoadingClub(true)
    try {
      const friendIds = friends.map(f => f.friendId)
      const data = await fetchFriendsFeed(friendIds, 50, 0)
      setClubRuns(data || [])
    } catch (err) {
      console.error('Failed to load club feed:', err)
      setClubRuns([])
    } finally {
      setLoadingClub(false)
    }
  }

  // Search users
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setLoadingSearch(true)
    searchUsers(searchQuery)
      .then(results => {
        // Filter out self and existing friends
        const friendIds = new Set(friends.map(f => f.friendId))
        setSearchResults(results.filter(r => r.id !== user?.id && !friendIds.has(r.id)))
      })
      .catch(err => {
        console.error('Search failed:', err)
        setSearchResults([])
      })
      .finally(() => setLoadingSearch(false))
  }, [searchQuery, user?.id, friends])

  // Send friend request
  const handleSendFriendRequest = async (addresseeId) => {
    try {
      await sendFriendRequest(user.id, addresseeId)
      setSearchQuery('')
      setSearchResults([])
    } catch (err) {
      console.error('Failed to send friend request:', err)
    }
  }

  // Accept friend request
  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId)
      await loadFriendsData()
    } catch (err) {
      console.error('Failed to accept request:', err)
    }
  }

  // Remove friendship
  const handleRemoveFriend = async (friendshipId) => {
    try {
      await removeFriendship(friendshipId)
      await loadFriendsData()
    } catch (err) {
      console.error('Failed to remove friend:', err)
    }
  }

  // Handle reaction (upsert/remove toggle)
  const handleReact = async (runId, reaction) => {
    if (!user?.id) return
    try {
      const existing = allReactions.find(
        r => r.run_id === runId && r.user_id === user.id
      )
      if (existing?.reaction === reaction) {
        // Remove reaction
        await removeReaction(runId, user.id)
        setAllReactions(prev =>
          prev.filter(r => !(r.run_id === runId && r.user_id === user.id))
        )
      } else {
        // Upsert reaction
        const newReaction = await upsertReaction(runId, user.id, reaction)
        setAllReactions(prev => {
          const filtered = prev.filter(
            r => !(r.run_id === runId && r.user_id === user.id)
          )
          return [...filtered, newReaction]
        })
      }
    } catch (err) {
      console.error('Failed to react:', err)
    }
  }

  // Handle comment addition
  const handleAddComment = async (runId, body) => {
    if (!user?.id) return
    try {
      const comment = await addComment(runId, user.id, body)
      return comment
    } catch (err) {
      console.error('Failed to add comment:', err)
      throw err
    }
  }

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId)
    } catch (err) {
      console.error('Failed to delete comment:', err)
      throw err
    }
  }

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
          {communityTab === 'world'
            ? 'Public runs from all runners on KGP Running'
            : `Runs from ${profile?.displayName ? `${profile.displayName}'s` : 'your'} friends`}
        </p>
      </div>

      {/* ── Profile settings (signed-in users only) ── */}
      {user && (
        <ProfileSettingsPanel
          profile={profile}
          loading={profileLoading}
          saveProfile={saveProfile}
          userId={user.id}
        />
      )}

      {/* ── Tab bar ── */}
      {user && (
        <div className="flex gap-1 border-b border-gray-100 mb-6">
          <button
            onClick={() => setCommunityTab('world')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              communityTab === 'world'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            World View
          </button>
          <button
            onClick={() => setCommunityTab('club')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              communityTab === 'club'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {profile?.displayName ? `${profile.displayName}'s Run Club` : 'My Run Club'}
          </button>
        </div>
      )}

      {/* ── WORLD VIEW TAB ── */}
      {communityTab === 'world' && (
        <>
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
                const vdot = run.userId === user?.id ? myCurrentVdot : null
                const runReactions = allReactions.filter(r => r.run_id === run.id)

                return (
                  <RunPostCard
                    key={run.id}
                    run={run}
                    prs={userPrs}
                    shoeName={shoeName}
                    currentVdot={vdot}
                    reactions={runReactions}
                    currentUserId={user?.id}
                    onReact={handleReact}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
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
        </>
      )}

      {/* ── RUN CLUB TAB ── */}
      {communityTab === 'club' && user && (
        <>
          {/* ── Friend Management Section ── */}
          <div className="card mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Find Runners</h2>

            {/* Search bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Find runners by name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input w-full"
              />
              {loadingSearch && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  {searchResults.map(runner => (
                    <div key={runner.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-red-400">
                            {(runner.display_name || 'A')[0].toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{runner.display_name || 'Runner'}</p>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(runner.id)}
                        className="text-xs font-medium text-black px-2.5 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Pending Requests ({pendingRequests.length})</p>
                <div className="space-y-2">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                      <p className="text-sm text-gray-700">Friend request</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="text-xs font-medium text-white px-2.5 py-1 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(req.id)}
                          className="text-xs font-medium text-gray-700 px-2.5 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            {friends.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Friends ({friends.length})</p>
                <div className="flex flex-wrap gap-2">
                  {friends.map(f => (
                    <div key={f.friendshipId} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100">
                      <span className="text-xs text-gray-700">{f.friendId.slice(0, 8)}…</span>
                      <button
                        onClick={() => handleRemoveFriend(f.friendshipId)}
                        className="text-xs text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {friends.length === 0 && pendingRequests.length === 0 && searchResults.length === 0 && (
              <p className="text-xs text-gray-400">Find runners to follow and see their runs here.</p>
            )}
          </div>

          {/* ── Club Feed ── */}
          {loadingClub ? (
            <div className="text-center py-20 text-gray-400 text-sm">Loading run club…</div>
          ) : clubRuns.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm font-medium text-gray-500">
                {friends.length === 0
                  ? 'Add friends to see their runs here'
                  : 'No runs from your friends yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {clubRuns.map(run => {
                const userPrs = prsMap.get(run.user_id) ?? {}
                const shoeName = run.shoe_id ? shoesMap.get(run.shoe_id) ?? null : null
                const runReactions = allReactions.filter(r => r.run_id === run.id)

                return (
                  <RunPostCard
                    key={run.id}
                    run={{
                      id: run.id,
                      userId: run.user_id,
                      date: run.date,
                      distance: Number(run.distance),
                      distanceUnit: run.distance_unit,
                      duration: run.duration,
                      workoutType: run.workout_type,
                      notes: run.notes ?? '',
                      subtitle: run.subtitle ?? '',
                      shoeId: run.shoe_id ?? null,
                      displayName: run.profiles?.display_name || 'Runner',
                    }}
                    prs={userPrs}
                    shoeName={shoeName}
                    currentVdot={null}
                    reactions={runReactions}
                    currentUserId={user?.id}
                    onReact={handleReact}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                  />
                )
              })}
            </div>
          )}
        </>
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
