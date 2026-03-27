import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import BulkImportModal from '../features/import/BulkImportModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { supabase } from '../lib/supabaseClient.js'
import { getUserAwards } from '../api/awardsApi.js'
import {
  getPendingRequests,
  acceptFriendRequest,
  removeFriendship,
  getFriends,
} from '../api/friendsApi.js'
import {
  checkUsernameAvailable,
  fetchProfileById,
} from '../api/profilesApi.js'
import {
  fetchWatchConnections,
  connectGarmin,
  completeGarminCallback,
  connectCoros,
  completeCorosCallback,
  connectStrava,
  completeStravaCallback,
  disconnectWatch,
} from '../api/watchApi.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const AVAILABLE_WIDGETS = [
  { key: 'recent_runs',    label: 'Recent Runs',       desc: 'Your last few runs' },
  { key: 'mileage_chart',  label: 'Mileage Chart',     desc: 'Weekly mileage over time' },
  { key: 'fastest_times',  label: 'Fastest Times',     desc: 'Your PRs by distance' },
  { key: 'shoe_rack',      label: 'Shoe Rack',         desc: 'Your active shoes' },
  { key: 'upcoming_races', label: 'Upcoming Races',    desc: 'Races on your calendar' },
  { key: 'awards',         label: 'Awards',            desc: 'Medals and trophies earned' },
  { key: 'challenges',     label: 'Challenges',        desc: 'Active challenges' },
]

// ── Avatar Upload ─────────────────────────────────────────────────────────────

function AvatarSection({ profile, userId, onAvatarSaved }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const fileRef                   = useRef(null)

  const initials = (profile?.displayName || 'U')[0].toUpperCase()
  const avatarUrl = profile?.avatarUrl ?? null

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (file.size > 2 * 1024 * 1024)    { setError('Image must be under 2 MB.');    return }

    setUploading(true)
    setError(null)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await onAvatarSaved(publicUrl)
    } catch (err) {
      setError(err.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar circle */}
      <div className="relative group">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center border-2 border-gray-200">
            <span className="text-2xl font-bold text-red-400">{initials}</span>
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Change photo"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0" />
          </svg>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{profile?.displayName || 'Set your display name below'}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-red-500 hover:text-red-700 underline mt-0.5 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  )
}

// ── Watch Connection Row ───────────────────────────────────────────────────────

function WatchRow({ provider, label, icon, description, connected, connecting, onConnect, onDisconnect }) {
  const isComingSoon = provider === 'garmin' || provider === 'coros'

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-400">{connected ? '✓ Connected' : description}</p>
        </div>
      </div>
      {connected ? (
        <button
          onClick={() => onDisconnect(provider)}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
        >
          Disconnect
        </button>
      ) : isComingSoon ? (
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg cursor-default">
          Coming soon
        </span>
      ) : (
        <button
          onClick={() => onConnect(provider)}
          disabled={connecting}
          className="text-xs font-semibold bg-black text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, signOut }              = useAuth()
  const { profile, loading, saveProfile } = useProfile()
  const navigate                       = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [displayName, setDisplayName]   = useState('')
  const [username, setUsername]         = useState('')
  const [usernameStatus, setUsernameStatus] = useState(null) // 'checking' | 'available' | 'taken' | 'error'
  const [bio, setBio]                   = useState('')
  const [profileWidgets, setProfileWidgets] = useState(['recent_runs','mileage_chart','fastest_times'])
  const [nameSaving, setNameSaving]     = useState(false)
  const [nameSaved, setNameSaved]       = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [friends, setFriends]           = useState([])
  const [friendProfiles, setFriendProfiles] = useState({})
  const [friendsLoading, setFriendsLoading] = useState(true)

  const [watchConnections, setWatchConnections] = useState([])
  const [watchLoading, setWatchLoading]         = useState(true)
  const [connecting, setConnecting]             = useState(null) // provider currently being connected
  const [watchError, setWatchError]             = useState(null)

  const [awards, setAwards]                     = useState([])

  const [pendingRequests, setPendingRequests]   = useState([])

  const [showImport, setShowImport]     = useState(false)

  // Sync profile data when profile loads
  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName)
    if (profile?.username) setUsername(profile.username)
    if (profile?.bio) setBio(profile.bio)
    if (profile?.profileWidgets) setProfileWidgets(profile.profileWidgets)
  }, [profile?.displayName, profile?.username, profile?.bio, profile?.profileWidgets])

  // Load watch connections
  useEffect(() => {
    if (!user) return
    setWatchLoading(true)
    fetchWatchConnections(user.id)
      .then(setWatchConnections)
      .catch(console.error)
      .finally(() => setWatchLoading(false))
  }, [user])

  // Load awards
  useEffect(() => {
    if (!user) return
    getUserAwards(user.id)
      .then(setAwards)
      .catch(console.error)
  }, [user])

  // Load friends
  useEffect(() => {
    if (!user) return
    setFriendsLoading(true)
    getFriends(user.id)
      .then(async (friendsList) => {
        setFriends(friendsList)
        // Load friend profiles in parallel
        const profilesMap = {}
        if (friendsList.length > 0) {
          for (const friend of friendsList) {
            try {
              const profile = await fetchProfileById(friend.friendId)
              if (profile) {
                profilesMap[friend.friendId] = profile
              }
            } catch (err) {
              console.error('Failed to load friend profile:', err)
            }
          }
        }
        setFriendProfiles(profilesMap)
      })
      .catch(console.error)
      .finally(() => setFriendsLoading(false))
  }, [user])

  // Load pending friend requests
  useEffect(() => {
    if (!user) return
    loadPendingRequests()
  }, [user])

  const loadPendingRequests = async () => {
    try {
      const requests = await getPendingRequests(user.id)
      if (requests.length > 0) {
        // Enrich with display names
        const requesterIds = requests.map(r => r.requester_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', requesterIds)
        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || [])
        const enriched = requests.map(req => ({
          ...req,
          display_name: profileMap.get(req.requester_id) || req.requester_id,
        }))
        setPendingRequests(enriched)
      } else {
        setPendingRequests([])
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err)
    }
  }

  // Handle OAuth callbacks from Garmin / Coros redirects
  useEffect(() => {
    const isGarminCallback = searchParams.get('garmin_callback') === '1'
    const isCorosCallback  = searchParams.get('coros_callback')  === '1'

    if (isGarminCallback) {
      const oauthToken    = searchParams.get('oauth_token')    ?? ''
      const oauthVerifier = searchParams.get('oauth_verifier') ?? ''
      setConnecting('garmin')
      completeGarminCallback(oauthToken, oauthVerifier)
        .then(() => fetchWatchConnections(user.id).then(setWatchConnections))
        .catch(console.error)
        .finally(() => {
          setConnecting(null)
          setSearchParams({})
        })
    }

    if (isCorosCallback) {
      const code  = searchParams.get('code')  ?? ''
      const state = searchParams.get('state') ?? ''
      setConnecting('coros')
      completeCorosCallback(code, state)
        .then(() => fetchWatchConnections(user.id).then(setWatchConnections))
        .catch(console.error)
        .finally(() => {
          setConnecting(null)
          setSearchParams({})
        })
    }

    const isStravaCallback = searchParams.get('strava_callback') === '1'
    if (isStravaCallback) {
      const code = searchParams.get('code') ?? ''
      setConnecting('strava')
      completeStravaCallback(code)
        .then(() => fetchWatchConnections(user.id).then(setWatchConnections))
        .catch(console.error)
        .finally(() => {
          setConnecting(null)
          setSearchParams({})
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUsernameBlur = async (value) => {
    if (!value.trim() || value === profile?.username) {
      setUsernameStatus(null)
      return
    }
    // Validate format
    if (!/^[a-z0-9_]{3,20}$/.test(value.trim())) {
      setUsernameStatus('error')
      return
    }
    setUsernameStatus('checking')
    try {
      const available = await checkUsernameAvailable(value.trim())
      setUsernameStatus(available ? 'available' : 'taken')
    } catch (err) {
      console.error('Username check error:', err)
      setUsernameStatus('error')
    }
  }

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setNameSaving(true)
    setProfileError(null)
    try {
      const updates = { displayName: displayName.trim() }
      if (username.trim() && username !== profile?.username) {
        updates.username = username.trim()
      }
      if (bio !== profile?.bio) {
        updates.bio = bio
      }
      await saveProfile(updates)
      setNameSaved(true)
      setUsernameStatus(null)
      setTimeout(() => setNameSaved(false), 2500)
    } catch {
      setProfileError('Could not save. Try again.')
    } finally {
      setNameSaving(false)
    }
  }

  const handleToggleWidget = async (widgetKey) => {
    const newWidgets = profileWidgets.includes(widgetKey)
      ? profileWidgets.filter(w => w !== widgetKey)
      : [...profileWidgets, widgetKey]
    setProfileWidgets(newWidgets)
    try {
      await saveProfile({ profileWidgets: newWidgets })
    } catch (err) {
      console.error('Failed to update widgets:', err)
      setProfileError('Could not save widget preference.')
    }
  }

  const handleTogglePublic = async () => {
    setProfileError(null)
    try {
      await saveProfile({ isPublic: !(profile?.isPublic ?? false) })
    } catch {
      setProfileError('Could not save. Try again.')
    }
  }

  const handleAvatarSaved = async (url) => {
    await saveProfile({ avatarUrl: url })
  }

  const handleConnect = async (provider) => {
    setConnecting(provider)
    setWatchError(null)
    try {
      if (provider === 'garmin') await connectGarmin()
      if (provider === 'coros')  await connectCoros()
      if (provider === 'strava') await connectStrava()
    } catch (err) {
      console.error('Connect error:', err)
      setWatchError(`Could not connect ${provider}: ${err.message}`)
      setConnecting(null)
    }
    // connectGarmin/connectCoros/connectStrava redirect the page on success, so no finally needed
  }

  const handleDisconnect = async (provider) => {
    await disconnectWatch(user.id, provider)
    setWatchConnections(prev => prev.filter(c => c.provider !== provider))
  }

  const isConnected = (provider) => watchConnections.some(c => c.provider === provider)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId)
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error('Failed to accept request:', err)
    }
  }

  const handleDeclineRequest = async (requestId) => {
    try {
      await removeFriendship(requestId)
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error('Failed to decline request:', err)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <p className="text-center py-16 text-gray-400 text-sm">Loading…</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto space-y-6">

        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

        {/* ── Avatar ── */}
        <div className="card">
          <AvatarSection
            profile={profile}
            userId={user?.id}
            onAvatarSaved={handleAvatarSaved}
          />
        </div>

        {/* ── Pending Friend Requests ── */}
        {pendingRequests.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Friend Requests ({pendingRequests.length})</h2>
            <div className="space-y-2">
              {pendingRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">{request.display_name}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="text-xs font-semibold text-white bg-black px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.id)}
                      className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Community Settings ── */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Community Settings</h2>

          {/* Username */}
          <div>
            <label className="label">Your Handle <span className="text-xs text-gray-400">@username — used to find and tag you</span></label>
            <input
              type="text"
              className="input"
              placeholder="username_like_this"
              maxLength={20}
              pattern="[a-z0-9_]*"
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase()); setNameSaved(false) }}
              onBlur={e => handleUsernameBlur(e.target.value)}
            />
            {username && username !== profile?.username && (
              <div className="mt-1">
                {usernameStatus === 'checking' && <p className="text-xs text-gray-500">Checking…</p>}
                {usernameStatus === 'available' && <p className="text-xs text-green-600">✓ Available</p>}
                {usernameStatus === 'taken' && <p className="text-xs text-red-500">✗ Taken</p>}
                {usernameStatus === 'error' && /^[a-z0-9_]{3,20}$/.test(username) === false && (
                  <p className="text-xs text-red-500">Only lowercase letters, numbers, and underscores (3-20 chars)</p>
                )}
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="label">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Your name shown on community posts"
                maxLength={40}
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setNameSaved(false) }}
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !displayName.trim()}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                  nameSaved ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {nameSaved ? '✓ Saved' : nameSaving ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="label">Bio</label>
            <textarea
              className="input"
              placeholder="A short intro for your profile…"
              maxLength={160}
              rows={2}
              value={bio}
              onChange={e => { setBio(e.target.value); setNameSaved(false) }}
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length}/160</p>
          </div>

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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                profile?.isPublic ? 'bg-red-500' : 'bg-gray-300'
              }`}
              aria-pressed={profile?.isPublic}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                profile?.isPublic ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {profileError && <p className="text-xs text-red-500">{profileError}</p>}
        </div>

        {/* ── Your Public Profile ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Your Public Profile</h2>
          <p className="text-xs text-gray-400 mb-4">Choose which stats appear when others view your profile.</p>
          <div className="space-y-2">
            {AVAILABLE_WIDGETS.map(widget => (
              <div key={widget.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  id={`widget-${widget.key}`}
                  checked={profileWidgets.includes(widget.key)}
                  onChange={() => handleToggleWidget(widget.key)}
                  className="mt-0.5 cursor-pointer accent-red-500"
                />
                <label htmlFor={`widget-${widget.key}`} className="flex-1 cursor-pointer">
                  <p className="text-sm font-medium text-gray-800">{widget.label}</p>
                  <p className="text-xs text-gray-500">{widget.desc}</p>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* ── Friends ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Friends</h2>
          {friendsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-gray-500">No friends yet — search for runners on the Community page</p>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {friends.slice(0, 12).map(friend => {
                const friendProfile = friendProfiles[friend.friendId]
                return (
                  <div
                    key={friend.friendId}
                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {friendProfile?.avatarUrl ? (
                      <img
                        src={friendProfile.avatarUrl}
                        alt={friendProfile.displayName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border border-gray-200">
                        <span className="text-xs font-semibold text-gray-500">
                          {(friendProfile?.displayName || 'F')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-800 text-center line-clamp-2">
                      {friendProfile?.displayName || 'Friend'}
                    </p>
                  </div>
                )
              })}
              {friends.length > 12 && (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">+{friends.length - 12}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Watch Connections ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">Connected Watches</h2>
          <p className="text-xs text-gray-400 mb-4">
            Connect your watch to auto-sync runs. They'll appear as a prompt to review after each activity.
          </p>

          {watchError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{watchError}</p>
          )}

          {watchLoading ? (
            <p className="text-sm text-gray-400 py-2">Loading…</p>
          ) : (
            <div>
              <WatchRow
                provider="garmin"
                label="Garmin"
                icon="🟢"
                description="Sync from Garmin Connect"
                connected={isConnected('garmin')}
                connecting={connecting === 'garmin'}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
              <WatchRow
                provider="coros"
                label="Coros"
                icon="🔵"
                description="Sync from Coros app"
                connected={isConnected('coros')}
                connecting={connecting === 'coros'}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
              <WatchRow
                provider="strava"
                label="Strava"
                icon="🟠"
                description="Auto-sync runs from Strava"
                connected={isConnected('strava')}
                connecting={connecting === 'strava'}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />

              {/* Apple Watch — no direct API, offer file upload info */}
              <div className="flex items-start gap-3 py-3">
                <span className="text-2xl mt-0.5">🍎</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Apple Watch</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Apple Watch doesn't have a web API. Export a <strong>.fit</strong> file from the Apple Health app
                    and upload it below to sync your run.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Awards Shelf ── */}
        {awards.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Awards</h2>
            <div className="flex flex-wrap gap-3">
              {awards.map(a => (
                <div key={a.id} className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl p-3 min-w-[80px]">
                  <span className="text-2xl">{a.type === 'trophy' ? '🏆' : '🥇'}</span>
                  <p className="text-xs font-medium text-gray-700 text-center leading-tight">{a.label || a.category}</p>
                  <p className="text-xs text-gray-400">{a.month ? `${a.month}/${a.year}` : a.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Apple Watch .fit upload ── */}
        <div className="card" id="fit-upload">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">Upload a .fit File</h2>
          <p className="text-xs text-gray-400 mb-4">
            Works with Apple Watch, Garmin, Coros, and any GPS device that exports .fit files.
          </p>
          {/* FitFileUpload is rendered here — see FitFileUpload.jsx */}
          <FitFileUploadInline userId={user?.id} />
        </div>

        {/* ── GPX file upload ── */}
        <div className="card" id="gpx-upload">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">Upload a .gpx File</h2>
          <p className="text-xs text-gray-400 mb-4">
            Works with Garmin, Coros, Strava exports, and any GPS device that exports GPX files.
          </p>
          <GpxFileUploadInline userId={user?.id} />
        </div>

        {/* ── Bulk Import ── */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Import Run History</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload .fit, .gpx, or .tcx files from your Garmin, Coros, or GPS watch to bulk-import your past runs.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="bg-black text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Import Run History
          </button>
        </div>

        {/* ── Account ── */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{user?.email}</p>
              <p className="text-xs text-gray-400">Signed in with Google</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

      </div>

      {/* Import modal */}
      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </PageWrapper>
  )
}

// ── Inline fit file upload ─

function FitFileUploadInline({ userId }) {
  const [status, setStatus] = useState(null) // null | 'parsing' | 'done' | 'error'
  const [message, setMessage] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('parsing')
    setMessage('')
    try {
      // Dynamically import fit-file-parser (installed separately)
      const FitParser = (await import('fit-file-parser')).default
      const buffer    = await file.arrayBuffer()
      const parser    = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'm', elapsedRecordField: true, mode: 'cascade' })

      parser.parse(buffer, async (err, data) => {
        if (err) { setStatus('error'); setMessage('Could not read .fit file.'); return }

        // Extract session summary
        const session = data?.activity?.sessions?.[0]
        if (!session) { setStatus('error'); setMessage('No activity session found in file.'); return }

        const distMeters  = Number(session.total_distance ?? 0)
        const durSeconds  = Number(session.total_elapsed_time ?? 0)
        const avgHr       = session.avg_heart_rate ? Number(session.avg_heart_rate) : null
        const totalAscent = session.total_ascent ? Number(session.total_ascent) : null
        const elevFeet    = totalAscent !== null ? Math.round(totalAscent * 3.28084) : null
        const startTime   = session.start_time
          ? new Date(session.start_time).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)

        if (distMeters < 100 || durSeconds < 60) {
          setStatus('error')
          setMessage('Activity too short to import.')
          return
        }

        const { insertFitFilePendingRun } = await import('../api/pendingRunsApi.js')
        await insertFitFilePendingRun(userId, {
          date:               startTime,
          distanceMeters:     distMeters,
          durationSeconds:    durSeconds,
          heartRate:          avgHr,
          elevationGainFeet:  elevFeet,
          rawData:            { file: file.name },
        })
        setStatus('done')
        setMessage('Run uploaded! It will appear in the watch sync prompt on your Home and Log pages.')
      })
    } catch (err) {
      setStatus('error')
      setMessage(err.message ?? 'Upload failed.')
    }
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          status === 'done' ? 'border-green-300 bg-green-50' :
          status === 'error' ? 'border-red-300 bg-red-50' :
          'border-gray-200 hover:border-red-300 hover:bg-gray-50'
        }`}
      >
        <input ref={fileRef} type="file" accept=".fit" className="hidden" onChange={handleFile} />
        {status === 'parsing' ? (
          <p className="text-sm text-gray-500">Parsing file…</p>
        ) : status === 'done' ? (
          <>
            <span className="text-2xl mb-1">✅</span>
            <p className="text-sm font-medium text-green-700">{message}</p>
          </>
        ) : status === 'error' ? (
          <>
            <span className="text-2xl mb-1">⚠️</span>
            <p className="text-sm font-medium text-red-600">{message}</p>
            <p className="text-xs text-gray-400 mt-1">Try uploading again</p>
          </>
        ) : (
          <>
            <span className="text-3xl mb-2">📁</span>
            <p className="text-sm font-semibold text-gray-700">Drop a .fit file here or click to choose</p>
            <p className="text-xs text-gray-400 mt-1">Exported from Apple Health, Garmin Connect, Coros app, etc.</p>
          </>
        )}
      </label>
    </div>
  )
}

// ── Inline GPX file upload ─

function GpxFileUploadInline({ userId }) {
  const [status, setStatus] = useState(null) // null | 'parsing' | 'done' | 'error'
  const [message, setMessage] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('parsing')
    setMessage('')
    try {
      const { parseGpxFile } = await import('../utils/parseGpx.js')
      const parsed = await parseGpxFile(file)

      const { insertGpxPendingRun } = await import('../api/pendingRunsApi.js')
      await insertGpxPendingRun(userId, parsed)
      setStatus('done')
      setMessage('Run uploaded! It will appear in the watch sync prompt on your Home and Log pages.')
    } catch (err) {
      setStatus('error')
      setMessage(err.message ?? 'Upload failed.')
    }
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          status === 'done' ? 'border-green-300 bg-green-50' :
          status === 'error' ? 'border-red-300 bg-red-50' :
          'border-gray-200 hover:border-red-300 hover:bg-gray-50'
        }`}
      >
        <input ref={fileRef} type="file" accept=".gpx" className="hidden" onChange={handleFile} />
        {status === 'parsing' ? (
          <p className="text-sm text-gray-500">Parsing file…</p>
        ) : status === 'done' ? (
          <>
            <span className="text-2xl mb-1">✅</span>
            <p className="text-sm font-medium text-green-700">{message}</p>
          </>
        ) : status === 'error' ? (
          <>
            <span className="text-2xl mb-1">⚠️</span>
            <p className="text-sm font-medium text-red-600">{message}</p>
            <p className="text-xs text-gray-400 mt-1">Try uploading again</p>
          </>
        ) : (
          <>
            <span className="text-3xl mb-2">🗺️</span>
            <p className="text-sm font-semibold text-gray-700">Drop a .gpx file here or click to choose</p>
            <p className="text-xs text-gray-400 mt-1">Exported from Garmin Connect, Coros app, Strava, etc.</p>
          </>
        )}
      </label>
    </div>
  )
}
