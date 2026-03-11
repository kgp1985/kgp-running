import { useState } from 'react'
import { useRacesDb } from '../../hooks/useRacesDb.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ── Event types ─────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { key: 'marathon',      label: 'Marathon',      color: 'bg-red-600 text-white' },
  { key: 'half',          label: 'Half Marathon',  color: 'bg-orange-500 text-white' },
  { key: '10mile',        label: '10 Mile',        color: 'bg-amber-500 text-white' },
  { key: '15k',           label: '15K',            color: 'bg-yellow-500 text-gray-900' },
  { key: '10k',           label: '10K',            color: 'bg-green-500 text-white' },
  { key: '5k',            label: '5K',             color: 'bg-teal-500 text-white' },
  { key: '50k',           label: '50K',            color: 'bg-purple-600 text-white' },
  { key: 'other',         label: 'Other',          color: 'bg-gray-500 text-white' },
]

function getEventType(key) {
  return EVENT_TYPES.find(e => e.key === key) ?? EVENT_TYPES[EVENT_TYPES.length - 1]
}

function daysUntil(dateISO) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const race  = new Date(dateISO + 'T00:00:00')
  return Math.round((race - today) / 86400000)
}

function formatRaceDate(dateISO) {
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Add / Edit form ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  date: '',
  eventType: 'marathon',
  notes: '',
}

function RaceForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  const handleSave = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.date) errs.date = 'Required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div>
        <label className="label">Race Name</label>
        <input
          type="text" className="input" placeholder="e.g. Boston Marathon"
          value={form.name} onChange={e => set('name', e.target.value)}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date" className="input"
            value={form.date} onChange={e => set('date', e.target.value)}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="label">Event Type</label>
          <select className="input" value={form.eventType} onChange={e => set('eventType', e.target.value)}>
            {EVENT_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
        <input
          type="text" className="input" placeholder="Goal time, course notes..."
          value={form.notes} onChange={e => set('notes', e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save Race'}
        </button>
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

// ── Race card ────────────────────────────────────────────────────────────────
function RaceCard({ race, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const days = daysUntil(race.date)
  const et   = getEventType(race.eventType)

  const isToday  = days === 0
  const isPast   = days < 0
  const isUrgent = days > 0 && days <= 7

  return (
    <div className={`relative rounded-2xl p-4 min-w-[200px] flex-shrink-0 border transition-all ${
      isToday  ? 'bg-red-600 text-white border-red-500' :
      isPast   ? 'bg-gray-100 border-gray-200'          :
      isUrgent ? 'bg-black text-white border-gray-800'   :
                 'bg-gray-900 text-white border-gray-700'
    }`}>
      {/* Top row: event badge + actions */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${et.color}`}>
          {et.label}
        </span>
        {!confirmDelete ? (
          <div className="flex gap-1 -mt-0.5 -mr-0.5">
            <button
              onClick={onEdit}
              className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
              title="Edit race"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity"
              title="Delete race"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5 items-center">
            <span className="text-xs opacity-70">Delete?</span>
            <button onClick={onDelete} className="text-xs text-red-400 font-semibold hover:text-red-300">Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs opacity-50 hover:opacity-100">No</button>
          </div>
        )}
      </div>

      {/* Race name */}
      <p className={`font-bold text-base leading-tight mb-1 ${isPast ? 'text-gray-600' : ''}`}>
        {race.name}
      </p>

      {/* Date */}
      <p className={`text-xs mb-3 ${isPast ? 'text-gray-400' : 'opacity-60'}`}>
        {formatRaceDate(race.date)}
      </p>

      {/* Countdown */}
      <div>
        {isToday ? (
          <p className="text-2xl font-black tracking-tight">RACE DAY 🎉</p>
        ) : isPast ? (
          <p className="text-sm font-semibold text-gray-400">{Math.abs(days)} days ago</p>
        ) : (
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-black leading-none ${isUrgent ? 'text-red-400' : 'text-white'}`}>
              {days}
            </span>
            <span className={`text-sm pb-0.5 ${isUrgent ? 'text-red-300' : 'opacity-60'}`}>
              day{days !== 1 ? 's' : ''} away
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {race.notes && (
        <p className="text-xs mt-2 opacity-50 line-clamp-1">{race.notes}</p>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function RaceCountdown() {
  const { user } = useAuth()
  const { races, upcomingRaces, pastRaces, loading, addRace, editRace, removeRace } = useRacesDb()

  const [showForm, setShowForm]     = useState(false)
  const [editingRace, setEditingRace] = useState(null) // race object being edited
  const [saving, setSaving]         = useState(false)
  const [showPast, setShowPast]     = useState(false)

  if (!user) return null

  // Show component if user has any races OR if they haven't loaded yet
  if (!loading && races.length === 0 && !showForm) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🏁 Race Countdown</h2>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full font-medium transition-colors"
          >
            + Add Race
          </button>
        </div>
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">🏁</p>
          <p className="text-sm">No races added yet. Add your next race to start the countdown!</p>
        </div>
        {showForm && (
          <div className="mt-4">
            <RaceForm
              onSave={async (data) => {
                setSaving(true)
                try { await addRace(data); setShowForm(false) }
                catch { /* ignore */ }
                finally { setSaving(false) }
              }}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        )}
      </div>
    )
  }

  const handleAdd = async (data) => {
    setSaving(true)
    try { await addRace(data); setShowForm(false) }
    catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleEdit = async (data) => {
    setSaving(true)
    try { await editRace(editingRace.id, data); setEditingRace(null) }
    catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🏁 Race Countdown</h2>
        <button
          onClick={() => { setShowForm(s => !s); setEditingRace(null) }}
          className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Race'}
        </button>
      </div>

      {/* Add form */}
      {showForm && !editingRace && (
        <div className="mb-5">
          <RaceForm onSave={handleAdd} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : (
        <>
          {/* Upcoming race cards — horizontal scroll */}
          {upcomingRaces.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {upcomingRaces.map(race => (
                editingRace?.id === race.id ? (
                  <div key={race.id} className="min-w-[280px] flex-shrink-0">
                    <RaceForm
                      initial={{ name: race.name, date: race.date, eventType: race.eventType, notes: race.notes }}
                      onSave={handleEdit}
                      onCancel={() => setEditingRace(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <RaceCard
                    key={race.id}
                    race={race}
                    onEdit={() => { setEditingRace(race); setShowForm(false) }}
                    onDelete={() => removeRace(race.id)}
                  />
                )
              ))}
            </div>
          )}

          {/* Past races toggle */}
          {pastRaces.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPast(s => !s)}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                {showPast ? '▲ Hide' : '▼ Show'} {pastRaces.length} past race{pastRaces.length !== 1 ? 's' : ''}
              </button>
              {showPast && (
                <div className="flex gap-3 overflow-x-auto pb-2 mt-3 -mx-1 px-1">
                  {pastRaces.slice().reverse().map(race => (
                    <RaceCard
                      key={race.id}
                      race={race}
                      onEdit={() => { setEditingRace(race); setShowForm(false) }}
                      onDelete={() => removeRace(race.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
