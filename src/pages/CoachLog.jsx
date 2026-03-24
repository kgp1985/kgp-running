import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunPostCard from '../features/community/RunPostCard.jsx'
import LeaderboardWidget from '../features/community/LeaderboardWidget.jsx'
import ChallengeSection from '../features/community/ChallengeSection.jsx'
import { useCommunityFeed } from '../hooks/useCommunityFeed.js'
import { useProfile } from '../hooks/useProfile.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { calculateCurrentVDOT } from '../utils/vdot.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
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

// ── Pending Requests Modal ──────────────────────────────────────────────────────

function PendingRequestsModal({ requests, onAccept, onDecline, onClose }) {
  if (!requests.length) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Friend Requests</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-red-400">
                    {(req.display_name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{req.display_name || 'Runner'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onAccept(req.id)}
                  className="text-xs font-semibold text-white bg-black px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDecline(req.id)}
                  className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
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
  const [pendingRequestsEnriched, setPendingRequestsEnriched] = useState([])
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [pendingModalDismissed, setPendingModalDismissed] = useState(false)
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

  // Auto-show pending modal when on club tab with pending requests
  useEffect(() => {
    if (communityTab === 'club' && pendingRequestsEnriched.length > 0 && !pendingModalDismissed) {
      setShowPendingModal(true)
    } else if (communityTab !== 'club' || pendingRequestsEnriched.length === 0) {
      setShowPendingModal(false)
    }
  }, [communityTab, pendingRequestsEnriched.length, pendingModalDismissed])

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

      // Enrich pending requests with display names by fetching requester profiles
      if (pendingData.length > 0) {
        const requesterIds = pendingData.map(r => r.requester_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', requesterIds)

        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || [])
        const enriched = pendingData.map(req => ({
          ...req,
          display_name: profileMap.get(req.requester_id) || 'Runner',
        }))
        setPendingRequestsEnriched(enriched)

        // Auto-show modal if on club tab and modal not dismissed
        if (communityTab === 'club' && !pendingModalDismissed) {
          setShowPendingModal(true)
        }
      } else {
        setPendingRequestsEnriched([])
      }
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

      {/* ── Settings nudge (if display name not set) ── */}
      {user && !profile?.displayName && (
        <div className="card mb-6 bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm text-gray-700">
            👤 Add your display name on your <Link to="/profile" className="text-red-500 hover:text-red-700 font-semibold underline">Profile page</Link> to appear in the community.
          </p>
        </div>
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
          {/* ── Leaderboard Widget ── */}
          <LeaderboardWidget />

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
          {/* ── Challenges Section ── */}
          <div className="card mb-6">
            <ChallengeSection user={user} friends={friends} />
          </div>

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

      {/* ── Pending Requests Modal ── */}
      {showPendingModal && (
        <PendingRequestsModal
          requests={pendingRequestsEnriched}
          onAccept={handleAcceptRequest}
          onDecline={handleRemoveFriend}
          onClose={() => {
            setShowPendingModal(false)
            setPendingModalDismissed(true)
          }}
        />
      )}
    </PageWrapper>
  )
}
