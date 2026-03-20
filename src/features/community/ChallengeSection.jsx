import { useState, useEffect } from 'react'
import { createChallenge, inviteToChallenge, respondToChallenge, getUserChallenges } from '../../api/challengesApi'

export default function ChallengeSection({ user, friends }) {
  const [challenges, setChallenges] = useState([])
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserChallenges(user.id)
      .then(setChallenges)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Challenges</h3>
        {user && (
          <button
            onClick={() => setShowCreateWizard(true)}
            className="text-sm font-semibold bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            + Start a Challenge
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <p className="text-gray-500 text-sm">No challenges yet.</p>
          <p className="text-gray-400 text-xs mt-1">Challenge a friend to race an event or see who can log the most miles!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => (
            <ChallengeCard key={c.id} challenge={c} user={user} onRespond={async (accept) => {
              await respondToChallenge(c.id, user.id, accept)
              getUserChallenges(user.id).then(setChallenges)
            }} />
          ))}
        </div>
      )}

      {showCreateWizard && (
        <CreateChallengeModal
          user={user}
          friends={friends}
          onClose={() => setShowCreateWizard(false)}
          onCreate={async (data) => {
            const ch = await createChallenge({ ...data, creatorId: user.id })
            if (data.inviteeIds?.length) await inviteToChallenge(ch.id, data.inviteeIds)
            // Also add creator as accepted participant
            await inviteToChallenge(ch.id, [user.id])
            await respondToChallenge(ch.id, user.id, true)
            getUserChallenges(user.id).then(setChallenges)
            setShowCreateWizard(false)
          }}
        />
      )}
    </div>
  )
}

function ChallengeCard({ challenge, user, onRespond }) {
  const isPending = challenge.myStatus === 'invited'
  const isActive = challenge.status === 'active' || challenge.myStatus === 'accepted'
  const typeLabel = challenge.type === 'race_event' ? '🏁 Race Event' : '📈 Mileage'
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{challenge.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{typeLabel} · {challenge.start_date} → {challenge.end_date}</p>
        </div>
        {isPending && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onRespond(true)} className="text-xs font-semibold text-white bg-black px-3 py-1.5 rounded-lg">Accept</button>
            <button onClick={() => onRespond(false)} className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">Decline</button>
          </div>
        )}
        {!isPending && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${challenge.myStatus === 'accepted' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            {challenge.myStatus}
          </span>
        )}
      </div>
    </div>
  )
}

function CreateChallengeModal({ user, friends, onClose, onCreate }) {
  const [type, setType] = useState('race_event')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedFriends, setSelectedFriends] = useState([])
  const [saving, setSaving] = useState(false)

  const toggleFriend = (id) => setSelectedFriends(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const handleCreate = async () => {
    if (!title || !startDate || !endDate) return
    setSaving(true)
    try {
      await onCreate({ type, title, startDate, endDate, inviteeIds: selectedFriends })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Start a Challenge</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Challenge Type</label>
            <div className="flex gap-2">
              {[{ v: 'race_event', l: '🏁 Race Event' }, { v: 'mileage', l: '📈 Mileage' }].map(({ v, l }) => (
                <button key={v} onClick={() => setType(v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-colors ${type === v ? 'border-black text-black' : 'border-gray-200 text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'race_event' ? 'March 5K Showdown' : 'Who Runs Most in April?'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            </div>
          </div>

          {friends && friends.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Invite Friends</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {friends.map(f => (
                  <label key={f.friendId} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedFriends.includes(f.friendId)} onChange={() => toggleFriend(f.friendId)} className="rounded" />
                    <span className="text-sm text-gray-700">{f.displayName || f.friendId}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !title}
            className="flex-1 bg-black text-white font-semibold text-sm py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Challenge'}
          </button>
        </div>
      </div>
    </div>
  )
}
