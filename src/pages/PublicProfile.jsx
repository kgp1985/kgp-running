import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchProfileByUsername } from '../api/profilesApi.js'
import { fetchPublicRunsForProfile } from '../api/runsApi.js'
import { fetchPublicShoesForUser } from '../api/shoesApi.js'
import {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
} from '../api/friendsApi.js'
import { supabase } from '../lib/supabaseClient.js'

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtPace(distance, duration, unit) {
  if (!duration || !distance) return null
  const miles = unit === 'km' ? distance / 1.60934 : distance
  const secsPerMile = duration / miles
  const m = Math.floor(secsPerMile / 60)
  const s = Math.round(secsPerMile % 60)
  return `${m}:${s.toString().padStart(2, '0')}/mi`
}

function fmtTime(secs) {
  if (!secs) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Workout type label ──────────────────────────────────────────────────────

const WORKOUT_TYPE_LABELS = {
  easy: 'Easy',
  recovery: 'Recovery',
  long: 'Long Run',
  tempo: 'Tempo',
  interval: 'Intervals',
  repetition: 'Speed',
  tuneup: 'Tune-up',
  keyrace: 'Race',
  cross: 'Cross',
  strength: 'Strength',
}

function getWorkoutLabel(type) {
  return WORKOUT_TYPE_LABELS[type] || type || 'Run'
}

// ── Widget Components ──────────────────────────────────────────────────────

function RecentRunsWidget({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Runs</h3>
        <p className="text-sm text-gray-500">No runs logged yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Runs</h3>
      <div className="space-y-3">
        {runs.map((run) => (
          <div key={run.id} className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 last:border-b-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-white bg-black px-2.5 py-0.5 rounded-full">
                  {getWorkoutLabel(run.workout_type)}
                </span>
                <span className="text-xs text-gray-500">{formatDate(run.date)}</span>
              </div>
              <div className="text-sm text-gray-700">
                {run.distance} {run.distance_unit} {run.duration ? `• ${fmtPace(run.distance, run.duration, run.distance_unit)}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FastestTimesWidget({ userId }) {
  const [times, setTimes] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    // Fetch runs and compute fastest times client-side
    supabase
      .from('runs')
      .select('id, distance, distance_unit, duration')
      .eq('user_id', userId)
      .eq('is_public', true)
      .not('duration', 'is', null)
      .gt('duration', 0)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setLoading(false); return }

        const EVENTS = {
          '1 Mile': { min: 1.0, max: 1.15 },
          '5K': { min: 3.107, max: 3.26 },
          '10K': { min: 6.214, max: 6.37 },
          'Half Marathon': { min: 13.109, max: 13.26 },
          'Marathon': { min: 26.219, max: 26.37 },
        }

        const fastest = {}
        for (const [event] of Object.entries(EVENTS)) {
          fastest[event] = null
        }

        for (const run of data || []) {
          const miles = run.distance_unit === 'km' ? run.distance * 0.621371 : run.distance
          for (const [event, { min, max }] of Object.entries(EVENTS)) {
            if (miles >= min && miles <= max) {
              if (!fastest[event] || run.duration < fastest[event].duration) {
                fastest[event] = {
                  duration: run.duration,
                }
              }
            }
          }
        }

        if (!cancelled) {
          setTimes(fastest)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [userId])

  if (loading || !times) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Fastest Times</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Fastest Times</h3>
      <div className="space-y-2">
        {['1 Mile', '5K', '10K', 'Half Marathon', 'Marathon'].map((event) => (
          <div key={event} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{event}</span>
            <span className="font-semibold text-gray-900">{times[event]?.duration ? fmtTime(times[event].duration) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShoeRackWidget({ shoes }) {
  if (!shoes || shoes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Shoe Rack</h3>
        <p className="text-sm text-gray-500">No shoes added</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Shoe Rack</h3>
      <div className="space-y-3">
        {shoes.map((shoe) => (
          <div key={shoe.id} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{shoe.name}</p>
              {shoe.brand && <p className="text-xs text-gray-500">{shoe.brand}</p>}
            </div>
            {shoe.total_miles && (
              <span className="text-sm text-gray-600 ml-2">{Math.round(shoe.total_miles)} mi</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MileageWidget() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Mileage</h3>
      <p className="text-sm text-gray-500">Coming soon</p>
    </div>
  )
}

function PlaceholderWidget({ title }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-sm text-gray-500">Coming soon</p>
    </div>
  )
}

// ── Relationship Button ─────────────────────────────────────────────────────

function RelationshipButton({ profile, userId, isOwnProfile, onStatusChange }) {
  const [friends, setFriends] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [receivedRequests, setReceivedRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userId || !profile?.id) return
    loadRelationshipStatus()
  }, [userId, profile?.id])

  const loadRelationshipStatus = async () => {
    setLoading(true)
    try {
      const [friendsList, pendingReqs] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
      ])
      setFriends(friendsList || [])
      setReceivedRequests(pendingReqs || [])

      // Also fetch sent requests
      const { data: sent } = await supabase
        .from('friendships')
        .select('id, addressee_id, status')
        .eq('requester_id', userId)
        .eq('status', 'pending')
      setSentRequests(sent || [])
    } catch (err) {
      console.error('Error loading relationship status:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
      >
        Sign in to connect
      </button>
    )
  }

  if (isOwnProfile) {
    return (
      <button
        onClick={() => navigate('/profile')}
        className="text-sm font-semibold text-white bg-black px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Edit Profile
      </button>
    )
  }

  const isFriend = friends.some(f => f.friendId === profile.id)
  const sentRequest = sentRequests.find(r => r.addressee_id === profile.id)
  const receivedRequest = receivedRequests.find(r => r.requester_id === profile.id)

  if (isFriend) {
    const friendship = friends.find(f => f.friendId === profile.id)
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-600">Friends ✓</span>
        <button
          onClick={async () => {
            setLoading(true)
            try {
              await removeFriendship(friendship.friendshipId)
              setFriends(friends.filter(f => f.friendId !== profile.id))
              onStatusChange?.('removed')
            } catch (err) {
              console.error('Error removing friend:', err)
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Remove
        </button>
      </div>
    )
  }

  if (sentRequest) {
    return (
      <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
        Request Sent
      </span>
    )
  }

  if (receivedRequest) {
    return (
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setLoading(true)
            try {
              await acceptFriendRequest(receivedRequest.id)
              setReceivedRequests(receivedRequests.filter(r => r.id !== receivedRequest.id))
              setFriends([...friends, { friendshipId: receivedRequest.id, friendId: profile.id }])
              onStatusChange?.('accepted')
            } catch (err) {
              console.error('Error accepting request:', err)
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="text-sm font-semibold text-white bg-black px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Accept
        </button>
        <button
          onClick={async () => {
            setLoading(true)
            try {
              await removeFriendship(receivedRequest.id)
              setReceivedRequests(receivedRequests.filter(r => r.id !== receivedRequest.id))
              onStatusChange?.('declined')
            } catch (err) {
              console.error('Error declining request:', err)
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          className="text-sm font-semibold text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={async () => {
        setLoading(true)
        try {
          await sendFriendRequest(userId, profile.id)
          setSentRequests([...sentRequests, { addressee_id: profile.id, status: 'pending' }])
          onStatusChange?.('sent')
        } catch (err) {
          console.error('Error sending friend request:', err)
        } finally {
          setLoading(false)
        }
      }}
      disabled={loading}
      className="text-sm font-semibold text-white bg-black px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
    >
      Add Friend
    </button>
  )
}

// ── Main PublicProfile Component ────────────────────────────────────────────

export default function PublicProfile() {
  const { username } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [runs, setRuns] = useState([])
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const profileData = await fetchProfileByUsername(username)

      if (!profileData) {
        setError('User not found')
        setProfile(null)
        setLoading(false)
        return
      }

      // Check if profile is public (unless viewer is the owner)
      if (!profileData.isPublic && profileData.id !== user?.id) {
        setError('This profile is private')
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Load widgets based on profile configuration
      if (profileData.profileWidgets?.includes('recent_runs')) {
        try {
          const runsData = await fetchPublicRunsForProfile(profileData.id, 5)
          setRuns(runsData || [])
        } catch (err) {
          console.error('Error loading runs:', err)
        }
      }

      if (profileData.profileWidgets?.includes('shoe_rack')) {
        try {
          const shoesData = await fetchPublicShoesForUser(profileData.id)
          setShoes(shoesData || [])
        } catch (err) {
          console.error('Error loading shoes:', err)
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </PageWrapper>
    )
  }

  if (error || !profile) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Back to home
          </button>
        </div>
      </PageWrapper>
    )
  }

  const isOwnProfile = user?.id === profile.id
  const initials = (profile.displayName || 'U')[0].toUpperCase()

  return (
    <PageWrapper>
      {/* Header section */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center border-2 border-gray-200">
                  <span className="text-4xl font-bold text-red-400">{initials}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {profile.displayName || 'Runner'}
              </h1>
              <p className="text-lg text-gray-500 mb-3">@{profile.username || 'unknown'}</p>
              {profile.bio && (
                <p className="text-base text-gray-700 max-w-lg">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Right: Relationship button */}
          <div className="flex-shrink-0">
            <RelationshipButton
              profile={profile}
              userId={user?.id}
              isOwnProfile={isOwnProfile}
              onStatusChange={loadProfile}
            />
          </div>
        </div>
      </div>

      {/* Widgets section */}
      {profile.profileWidgets && profile.profileWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {profile.profileWidgets.map((widget) => {
            switch (widget) {
              case 'recent_runs':
                return <RecentRunsWidget key="recent_runs" runs={runs} />
              case 'fastest_times':
                return <FastestTimesWidget key="fastest_times" userId={profile.id} />
              case 'shoe_rack':
                return <ShoeRackWidget key="shoe_rack" shoes={shoes} />
              case 'mileage_chart':
                return <MileageWidget key="mileage_chart" />
              case 'upcoming_races':
                return <PlaceholderWidget key="upcoming_races" title="Upcoming Races" />
              case 'awards':
                return <PlaceholderWidget key="awards" title="Awards" />
              case 'challenges':
                return <PlaceholderWidget key="challenges" title="Challenges" />
              default:
                return null
            }
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No widgets configured yet</p>
        </div>
      )}
    </PageWrapper>
  )
}
