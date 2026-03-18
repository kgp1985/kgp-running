import { useState, useEffect, useRef } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import PlannedRunForm from '../features/plan/PlannedRunForm.jsx'
import RunForm from '../features/log/RunForm.jsx'
import { usePlannedRunsDb } from '../hooks/usePlannedRunsDb.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { useRacesDb } from '../hooks/useRacesDb.js'
import { useVdotGoal } from '../hooks/useVdotGoal.js'
import { useAuth } from '../context/AuthContext.jsx'
import { calculateCurrentVDOT, calculateVDOT, getTrainingPaces } from '../utils/vdot.js'
import { generatePlan } from '../utils/planGenerator.js'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../data/workoutTypes.js'

// ─ Scroll arrow component ─
function ScrollArrow() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
      <span className="text-xs text-white/40 tracking-widest uppercase">scroll</span>
      <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

function formatRestLabel(secs) {
  if (!secs) return ''
  if (secs < 60) return `${secs}s rest`
  if (secs % 60 === 0) return `${secs / 60}min rest`
  return `${secs}s rest`
}

function RepsBadge({ run }) {
  if (!run.repsCount) return null
  return (
    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
      {run.repsCount} × {run.repDistanceMeters}m{run.restSeconds ? ` · ${formatRestLabel(run.restSeconds)}` : ''}
    </span>
  )
}

function PlannedRunCard({ run, onDelete, onMarkDone, onEdit }) {
  const type = WORKOUT_TYPES[run.workoutType]
  const colors = WORKOUT_TYPE_COLORS[type?.color ?? 'green']
  const isToday = run.date === new Date().toISOString().slice(0, 10)
  const isPast  = run.date < new Date().toISOString().slice(0, 10)

  return (
    <div className={`border rounded-xl p-4 space-y-2 transition-colors ${
      isToday ? 'border-red-300 bg-red-50' : isPast ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isToday && <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Today</span>}
          <span className="text-sm font-semibold text-gray-900">
            {new Date(run.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
            {type?.label ?? run.workoutType}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900 shrink-0">{run.distance.toFixed(1)} mi</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <RepsBadge run={run} />
        {run.targetPace && (
          <span className="text-xs text-gray-500">🎯 {run.targetPace}</span>
        )}
        {run.targetRace && (
          <span className="text-xs text-gray-400 italic">📍 {run.targetRace}</span>
        )}
      </div>

      {run.notes && (
        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line line-clamp-3">{run.notes}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onMarkDone(run)}
          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          ✓ Mark as Done
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(run)}
            className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Edit
          </button>
        )}
        <button
          onClick={() => onDelete(run.id)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function groupByWeek(runs) {
  const groups = {}
  for (const run of runs) {
    const d = new Date(run.date + 'T00:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    const key = mon.toISOString().slice(0, 10)
    if (!groups[key]) groups[key] = { monday: mon, runs: [] }
    groups[key].runs.push(run)
  }
  return Object.values(groups).sort((a, b) => a.monday - b.monday)
}

function weekLabel(monday) {
  const sun = new Date(monday)
  sun.setDate(sun.getDate() + 6)
  return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function weekStats(runs) {
  const total = runs.reduce((s, r) => s + r.distance, 0)
  const typeCounts = runs.reduce((acc, r) => {
    const label = WORKOUT_TYPES[r.workoutType]?.label ?? r.workoutType
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})
  return { total, typeCounts }
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────────────────────────────────────────

function LandingPage({ plannedRuns, upcomingRuns, loading, onAddPlan, onMarkDone, onDelete, onEdit, onCreatePlan, markDoneRun, setMarkDoneRun, showForm, setShowForm }) {
  const planRef = useRef(null)
  const weekGroups = groupByWeek(plannedRuns)
  const today = new Date().toISOString().slice(0, 10)
  const thisWeekStart = new Date()
  const thisWeekEnd = new Date()
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6)
  const thisWeekEndStr = thisWeekEnd.toISOString().slice(0, 10)

  const thisWeekRuns = plannedRuns.filter(r => r.date >= today && r.date <= thisWeekEndStr)
  const upcomingPlannedRuns = plannedRuns.filter(r => r.date > thisWeekEndStr)
  const pastRuns = plannedRuns.filter(r => r.date < today)

  const handleScrollToView = () => {
    planRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* ─ Hero Section ─ */}
      {plannedRuns.length === 0 ? (
        <section className="relative min-h-[55vh] flex items-center justify-center overflow-hidden bg-black">
          <img
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

          <div className="relative z-10 text-center px-4">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-red-500 mb-4">Training Plan</p>
            <h1 className="font-black text-5xl sm:text-7xl text-white mb-3 leading-tight">The Road Ahead</h1>
            <p className="text-base text-white/60 mb-8">Every great race starts with a plan.</p>
            <button
              onClick={onCreatePlan}
              className="inline-block bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Start by Creating Your Training Plan
            </button>
          </div>
        </section>
      ) : (
        <section className="relative min-h-[55vh] flex items-center justify-center overflow-hidden bg-black">
          <img
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

          <div className="relative z-10 text-center px-4">
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-red-500 mb-4">Training Plan</p>
            <h1 className="font-black text-5xl sm:text-7xl text-white mb-3 leading-tight">The Road Ahead</h1>
            <p className="text-base text-white/60 mb-8">Every great race starts with a plan.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={onCreatePlan}
                className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Create a Plan
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="border-2 border-white text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Add a Workout
              </button>
              <button
                onClick={handleScrollToView}
                className="border-2 border-white/40 text-white/40 font-bold px-6 py-3 rounded-xl hover:border-white/60 hover:text-white/60 transition-colors"
              >
                View My Plan
              </button>
            </div>
          </div>

          <ScrollArrow />
        </section>
      )}

      {/* ─ Mark Done Modal ─ */}
      {markDoneRun && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Log Completed Run</h2>
            <p className="text-sm text-gray-500 mb-4">
              Review and fill in your actual distance, time, and notes — then save to your running log.
            </p>
            <RunForm
              onSubmit={onMarkDone}
              onCancel={() => setMarkDoneRun(null)}
              initialValues={{
                date:        markDoneRun.date,
                distance:    markDoneRun.distance.toString(),
                distanceUnit:'mi',
                workoutType: markDoneRun.workoutType,
                notes:       markDoneRun.notes,
              }}
            />
          </div>
        </div>
      )}

      {/* ─ Content ─ */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">

          {/* Add Workout Form */}
          {showForm && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Plan a Run</h2>
              <PlannedRunForm onSubmit={onAddPlan} onCancel={() => setShowForm(false)} />
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <p className="text-sm text-gray-400 text-center py-16">Loading your plan...</p>
          )}

          {/* This Week Section */}
          {!loading && plannedRuns.length > 0 && (
            <div ref={planRef} className="space-y-4">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-500">This Week</p>
              {thisWeekRuns.length === 0 ? (
                <div className="bg-zinc-950 rounded-2xl p-6 text-center">
                  <p className="text-sm text-zinc-400">Nothing planned yet — add a workout or create a plan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {thisWeekRuns.map(run => (
                    <PlannedRunCard
                      key={run.id}
                      run={run}
                      onDelete={onDelete}
                      onMarkDone={(r) => setMarkDoneRun(r)}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plan Section */}
          <div className="space-y-8">
            {!loading && plannedRuns.length > 0 && (
              <>
                {/* Upcoming sections */}
                {upcomingPlannedRuns.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-500 mb-4">Upcoming</p>
                    {groupByWeek(upcomingPlannedRuns).map(({ monday, runs }) => {
                      const { total, typeCounts } = weekStats(runs)
                      return (
                        <div key={monday.toISOString()} className="mb-6">
                          <div className="flex items-center justify-between mb-3 bg-zinc-900 rounded-xl px-4 py-3">
                            <h3 className="text-sm font-semibold text-zinc-100">{weekLabel(monday)}</h3>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-400">{Math.round(total)} mi</span>
                              <div className="flex gap-1">
                                {Object.entries(typeCounts).map(([label, count]) => (
                                  <span key={label} className="text-xs bg-zinc-800 text-zinc-300 rounded-full px-2 py-0.5">
                                    {count}x
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {runs.map(run => (
                              <PlannedRunCard
                                key={run.id}
                                run={run}
                                onDelete={onDelete}
                                onMarkDone={(r) => setMarkDoneRun(r)}
                                onEdit={onEdit}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Past runs collapsed section */}
                {pastRuns.length > 0 && (
                  <div>
                    <details className="space-y-3">
                      <summary className="cursor-pointer text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 hover:text-zinc-400">
                        {pastRuns.length} Past Run{pastRuns.length !== 1 ? 's' : ''}
                      </summary>
                      <div className="space-y-3">
                        {pastRuns.map(run => (
                          <PlannedRunCard
                            key={run.id}
                            run={run}
                            onDelete={onDelete}
                            onMarkDone={(r) => setMarkDoneRun(r)}
                            onEdit={onEdit}
                          />
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard Components
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i + 1 < currentStep ? 'bg-red-500 text-white' :
            i + 1 === currentStep ? 'bg-red-500 text-white' :
            'bg-gray-100 text-gray-400'
          }`}
        >
          {i + 1}
        </div>
      ))}
    </div>
  )
}

function Step1PlanStyle({ data, setData }) {
  const [showCoachStyles, setShowCoachStyles] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-gray-900 mb-6">How would you like to build your plan?</h2>

      {!showCoachStyles ? (
        <div className="grid gap-3">
          <button
            onClick={() => setData({ ...data, planStyle: 'coach' })}
            className={`p-4 rounded-2xl border-2 text-left transition-colors ${
              data.planStyle === 'coach' ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-gray-900">Coach Philosophy</h3>
            <p className="text-sm text-gray-500 mt-1">Structured around proven coaching frameworks</p>
          </button>
          <button
            onClick={() => setData({ ...data, planStyle: 'custom' })}
            className={`p-4 rounded-2xl border-2 text-left transition-colors ${
              data.planStyle === 'custom' ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-300'
            }`}
          >
            <h3 className="font-bold text-gray-900">Custom Build</h3>
            <p className="text-sm text-gray-500 mt-1">Fully personalized to your fitness and schedule</p>
          </button>
        </div>
      ) : null}

      {data.planStyle === 'coach' && !showCoachStyles && (
        <div className="pt-4">
          <button onClick={() => setShowCoachStyles(true)} className="text-red-500 hover:text-red-700 text-sm font-medium">
            Choose coach style →
          </button>
        </div>
      )}

      {showCoachStyles && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-medium mb-3">Select a coaching philosophy:</p>
          {[
            { key: 'pfitzinger', label: 'Pfitzinger-Style', desc: 'High mileage, long-run focused, the serious marathoner\'s approach' },
            { key: 'daniels', label: 'Daniels-Style', desc: 'VDOT-precise pacing, quality over quantity' },
            { key: 'balanced', label: 'Balanced Build', desc: 'Gradual progression, sustainable for all levels' },
          ].map(style => (
            <button
              key={style.key}
              onClick={() => { setData({ ...data, coachStyle: style.key }); setShowCoachStyles(false) }}
              className={`w-full p-3 rounded-lg text-left border transition-colors ${
                data.coachStyle === style.key ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">{style.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{style.desc}</div>
            </button>
          ))}
          <p className="text-xs italic text-gray-400 mt-3">Plans are inspired by these coaches' principles, not reproductions of their published work.</p>
        </div>
      )}
    </div>
  )
}

function Step2RaceGoals({ data, setData, upcomingRaces, raceDistances }) {
  const [showNewRace, setShowNewRace] = useState(false)

  const handleSelectRace = (race) => {
    setData({
      ...data,
      selectedRace: race.id,
      raceDate: race.date,
      raceName: race.name,
      raceDistance: race.eventType,
    })
  }

  const handleAddNewRace = () => {
    setData({
      ...data,
      selectedRace: null,
      newRaceAdded: true,
    })
    setShowNewRace(false)
  }

  const distLabels = { '5k': '5K', '10k': '10K', 'half': 'Half Marathon', 'marathon': 'Marathon' }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">What are you training for?</h2>

      {upcomingRaces.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Upcoming races:</p>
          <div className="space-y-2">
            {upcomingRaces.map(race => (
              <button
                key={race.id}
                onClick={() => handleSelectRace(race)}
                className={`w-full p-3 rounded-lg text-left border-2 transition-colors ${
                  data.selectedRace === race.id ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 text-sm">{race.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {distLabels[race.eventType] || race.eventType}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showNewRace && (
        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
          <div>
            <label className="label">Race Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Boston Marathon"
              value={data.raceName || ''}
              onChange={(e) => setData({ ...data, raceName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Race Date</label>
            <input
              type="date"
              className="input"
              value={data.raceDate || ''}
              onChange={(e) => setData({ ...data, raceDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Distance</label>
            <div className="grid grid-cols-2 gap-2">
              {raceDistances.map(d => (
                <button
                  key={d}
                  onClick={() => setData({ ...data, raceDistance: d })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    data.raceDistance === d ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {distLabels[d]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showNewRace && (
        <button
          onClick={() => setShowNewRace(true)}
          className="w-full p-3 rounded-lg text-center border-2 border-dashed border-gray-200 text-gray-600 hover:border-gray-400 transition-colors text-sm font-medium"
        >
          + Add a new race
        </button>
      )}

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.noRace || false}
            onChange={(e) => setData({ ...data, noRace: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">No specific race yet</span>
        </label>
      </div>

      {!data.noRace && (
        <div>
          <label className="label">Goal Time (HH:MM:SS)</label>
          <input
            type="text"
            className="input"
            placeholder="03:30:00"
            value={data.goalTime || ''}
            onChange={(e) => setData({ ...data, goalTime: e.target.value })}
          />
          {data.goalTime && data.raceDistance && (
            <p className="text-xs text-gray-500 mt-2">
              Estimated VDOT: {estimateVdotFromGoalTime(data.goalTime, data.raceDistance)}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.saveToProfile !== false}
            onChange={(e) => setData({ ...data, saveToProfile: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">Save to profile</span>
        </label>
      </div>
    </div>
  )
}

function estimateVdotFromGoalTime(timeStr, raceDistance) {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 'N/A'
  const totalSecs = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  const dists = { '5k': 5000, '10k': 10000, 'half': 21097.5, 'marathon': 42195 }
  const distMeters = dists[raceDistance]
  if (!distMeters) return 'N/A'
  const vdot = calculateVDOT(distMeters, totalSecs)
  return vdot ? vdot.toFixed(1) : 'N/A'
}

function Step3TrainingPrefs({ data, setData }) {
  const daysPerWeekOptions = [3, 4, 5, 6, 7]
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const defaultSelections = {
    3: [1, 3, 5], // Tue, Thu, Sat
    4: [0, 2, 4, 6], // Mon, Wed, Fri, Sun
    5: [0, 1, 2, 4, 6], // Mon, Tue, Wed, Fri, Sun
    6: [0, 1, 2, 3, 4, 6], // Mon–Fri, Sun
    7: [0, 1, 2, 3, 4, 5, 6],
  }

  const daysPerWeek = data.daysPerWeek || 5
  const selectedDays = data.trainingDays || defaultSelections[daysPerWeek] || [0, 1, 2, 4, 6]

  const handleToggleDay = (dayIdx) => {
    let updated = [...selectedDays]
    if (updated.includes(dayIdx)) {
      updated = updated.filter(d => d !== dayIdx)
    } else {
      updated = [...updated, dayIdx].sort((a, b) => a - b)
    }

    // Enforce constraint: must have exactly daysPerWeek days selected
    if (updated.length < daysPerWeek) {
      // Need to add more days
      const missing = daysPerWeek - updated.length
      for (let i = 0; i < 7 && missing > 0; i++) {
        if (!updated.includes(i)) {
          updated.push(i)
          updated.sort((a, b) => a - b)
          missing--
        }
      }
    } else if (updated.length > daysPerWeek) {
      // Deselect the earliest one to maintain constraint
      if (dayIdx === selectedDays[0]) {
        // User deselected the earliest one, so it's handled already
      } else {
        // User added a new one, deselect the earliest
        updated = updated.filter(d => d !== selectedDays[0])
      }
    }

    setData({ ...data, trainingDays: updated })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">How do you want to train?</h2>

      <div>
        <label className="label">Peak Weekly Mileage</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setData({ ...data, peakMileage: Math.max(15, (data.peakMileage || 50) - 5) })}
            className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg"
          >
            −
          </button>
          <input
            type="number"
            className="input flex-1 text-center"
            min={15}
            max={120}
            value={data.peakMileage || 50}
            onChange={(e) => setData({ ...data, peakMileage: parseInt(e.target.value) || 50 })}
          />
          <button
            onClick={() => setData({ ...data, peakMileage: Math.min(120, (data.peakMileage || 50) + 5) })}
            className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg"
          >
            +
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Peak weekly mileage (miles)</p>
      </div>

      <div>
        <label className="label mb-2">Days per Week</label>
        <div className="grid grid-cols-4 gap-2">
          {daysPerWeekOptions.map(d => (
            <button
              key={d}
              onClick={() => {
                const newDefaults = defaultSelections[d]
                setData({ ...data, daysPerWeek: d, trainingDays: newDefaults })
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                daysPerWeek === d ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label mb-3">Training Days</label>
        <p className="text-xs text-gray-500 mb-2">Select exactly {daysPerWeek} days</p>
        <div className="grid grid-cols-7 gap-2">
          {dayLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => handleToggleDay(idx)}
              className={`p-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedDays.includes(idx) ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function scoredWeeklyMileage(runs) {
  const today = new Date()
  const toMiles = r => r.distanceUnit === 'km' ? r.distance / 1.60934 : r.distance

  // Get weekly totals for the last 36 weeks
  const weeklyTotals = {} // key = "YYYY-WW"
  runs.forEach(r => {
    const d = new Date(r.date + 'T00:00:00')
    const weekAgo = (new Date(today) - d) / (7 * 86400000) // weeks ago
    if (weekAgo > 36) return
    // Get ISO week key (Monday-based)
    const mon = new Date(d)
    const day = d.getDay()
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    const key = mon.toISOString().slice(0, 10)
    weeklyTotals[key] = (weeklyTotals[key] || 0) + toMiles(r)
  })

  const sortedWeeks = Object.keys(weeklyTotals).sort().reverse() // most recent first

  const avg = (n) => {
    const weeks = sortedWeeks.slice(0, n)
    if (weeks.length === 0) return 0
    return weeks.reduce((s, k) => s + weeklyTotals[k], 0) / n
  }

  const a8  = avg(8)
  const a18 = avg(18)
  const a36 = avg(36)

  return Math.round(a8 * 0.25 + a18 * 0.50 + a36 * 0.25)
}

function Step4FitnessAssessment({ data, setData, runs, prs }) {
  const [showRaceEntry, setShowRaceEntry] = useState(false)

  const scoredMileage = scoredWeeklyMileage(runs)
  const peakMileage = data.peakMileage || 50

  // Calculate current VDOT
  const vdotData = calculateCurrentVDOT(prs, runs)
  const currentVdot = vdotData ? vdotData.vdot : null

  // Calculate goal VDOT from race time
  let goalVdot = null
  if (data.goalTime && data.raceDistance) {
    goalVdot = parseFloat(estimateVdotFromGoalTime(data.goalTime, data.raceDistance))
  }

  const hasLargeMileageGap = scoredMileage > 0 && peakMileage > scoredMileage * 1.5
  const hasLargeVdotGap = currentVdot && goalVdot && goalVdot > currentVdot + 5

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">Let's calibrate your starting point</h2>

      <div className="bg-gray-50 p-4 rounded-xl space-y-2">
        <p className="text-sm text-gray-600">
          Based on your recent training, your <span className="font-bold">scored weekly mileage</span> is <span className="font-bold">{scoredMileage} mi/week</span>
        </p>
        <p className="text-xs text-gray-500 italic">
          Calculated from 8-week (25%), 18-week (50%), and 36-week (25%) weighted averages
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Your goal peak mileage is <span className="font-bold">{peakMileage} mi/week</span>
        </p>
      </div>

      {hasLargeMileageGap && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-yellow-900">
            Your goal mileage is significantly higher than your recent training suggests.
          </p>
          <p className="text-sm text-yellow-800">
            We recommend starting at a lower base. What would you like your starting weekly mileage to be?
          </p>
          <input
            type="number"
            className="input"
            min={15}
            max={peakMileage}
            value={data.startingMileage || Math.max(scoredMileage, Math.round(peakMileage * 0.55))}
            onChange={(e) => setData({ ...data, startingMileage: parseInt(e.target.value) })}
          />
        </div>
      )}

      <div>
        <label className="label mb-3">VDOT Approach</label>
        <div className="space-y-2">
          {[
            { key: 'current', label: 'Current Fitness', desc: `Build workouts around your current VDOT (${currentVdot || 'N/A'})` },
            { key: 'goal', label: 'Goal Fitness', desc: 'Train at goal race paces (may be aggressive)' },
            { key: 'progressive', label: 'Progressive', desc: 'Start at current fitness, build toward goal (recommended)' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setData({ ...data, vdotApproach: opt.key })}
              className={`w-full p-3 rounded-lg text-left border-2 transition-colors ${
                data.vdotApproach === opt.key ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {currentVdot && (
        <p className="text-sm text-gray-600">
          Your current VDOT: <span className="font-bold">{currentVdot}</span>
        </p>
      )}

      {hasLargeVdotGap && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-yellow-900">
            Your goal fitness is significantly above your current calculated fitness.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRaceEntry || false}
              onChange={(e) => setShowRaceEntry(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-yellow-800">Would you like to enter a recent race result to update your VDOT?</span>
          </label>

          {showRaceEntry && (
            <div className="bg-white p-3 rounded-lg space-y-3 mt-3">
              <div>
                <label className="label text-sm">Race Distance</label>
                <div className="grid grid-cols-2 gap-2">
                  {['5k', '10k', 'half', 'marathon'].map(d => (
                    <button
                      key={d}
                      onClick={() => setData({ ...data, recentRaceDist: d })}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        data.recentRaceDist === d ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {d === 'half' ? 'Half' : d.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-sm">Race Date</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={data.recentRaceDate || ''}
                  onChange={(e) => setData({ ...data, recentRaceDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-sm">Finish Time (HH:MM:SS)</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="00:22:30"
                  value={data.recentRaceTime || ''}
                  onChange={(e) => setData({ ...data, recentRaceTime: e.target.value })}
                />
              </div>
              <p className="text-xs italic text-gray-500">This will be saved as a run and PR in your log.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Step5PreviewGenerate({ data, runs, prs }) {
  const peakMileage = data.peakMileage || 50
  const startingMileage = data.startingMileage || Math.max(scoredWeeklyMileage(runs), Math.round(peakMileage * 0.55))
  const trainingDays = data.trainingDays || [0, 1, 2, 4, 6]
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const daysLabel = trainingDays.map(d => dayLabels[d]).join(', ')

  const raceDists = { '5k': '5K', '10k': '10K', 'half': 'Half Marathon', 'marathon': 'Marathon' }
  const raceDate = new Date(data.raceDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weeksToRace = Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000))
  const planWeeks = Math.min(18, Math.max(4, weeksToRace))
  const baseBuildWeeks = weeksToRace > 18 ? weeksToRace - 18 : 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">Your training plan</h2>

      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Plan Style</p>
          <p className="text-lg font-bold text-gray-900">{data.planStyle === 'coach' ? `${data.coachStyle.charAt(0).toUpperCase() + data.coachStyle.slice(1)}-Inspired` : 'Custom Build'}</p>
        </div>

        {!data.noRace && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Race</p>
            <p className="text-lg font-bold text-gray-900">{data.raceName}</p>
            <p className="text-sm text-gray-600">{raceDists[data.raceDistance]} • {raceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
          <p className="text-lg font-bold text-gray-900">{planWeeks} weeks</p>
          {baseBuildWeeks > 0 && <p className="text-sm text-gray-600">+ {baseBuildWeeks} weeks base build before race-specific plan</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Peak Mileage</p>
            <p className="text-lg font-bold text-gray-900">{peakMileage} mi/week</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Starting Mileage</p>
            <p className="text-lg font-bold text-gray-900">{startingMileage} mi/week</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Training Days</p>
          <p className="text-lg font-bold text-gray-900">{daysLabel}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">VDOT Approach</p>
          <p className="text-lg font-bold text-gray-900 capitalize">{data.vdotApproach}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold">Phases</p>
          <p className="text-sm text-gray-600">Base → Development → Peak → Taper</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainingPlan() {
  const { plannedRuns, upcomingRuns, loading, addPlannedRun, removePlannedRun, editPlannedRun } = usePlannedRunsDb()
  const { runs } = useRunningLogDb()
  const { addRun } = useRunningLogDb()
  const { prs, checkAndUpdatePR } = usePersonalRecordsDb()
  const { upcomingRaces, addRace } = useRacesDb()
  const { goalData, setGoal } = useVdotGoal()
  const { user } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [markDoneRun, setMarkDoneRun] = useState(null)
  const [editingPlanned, setEditingPlanned] = useState(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState({
    planStyle: 'coach',
    coachStyle: 'balanced',
    daysPerWeek: 5,
    vdotApproach: 'progressive',
    saveToProfile: true,
  })
  const [generating, setGenerating] = useState(false)

  const handleAddPlan = async (data) => {
    await addPlannedRun(data)
    setShowForm(false)
  }

  const handleMarkDone = async (runData) => {
    const newRun = await addRun(runData)
    if (newRun) await checkAndUpdatePR({ ...runData, id: newRun.id })
    await removePlannedRun(markDoneRun.id)
    setMarkDoneRun(null)
  }

  const handleEditPlanned = async (runData) => {
    if (!editingPlanned) return
    await editPlannedRun(editingPlanned.id, runData)
    setEditingPlanned(null)
  }

  const openWizard = () => {
    setWizardStep(1)
    setWizardData({
      planStyle: 'coach',
      coachStyle: 'balanced',
      daysPerWeek: 5,
      vdotApproach: 'progressive',
      saveToProfile: true,
    })
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
  }

  const canProceedToNext = () => {
    if (wizardStep === 1) return wizardData.planStyle
    if (wizardStep === 2) return wizardData.raceDate || wizardData.noRace
    if (wizardStep === 3) return wizardData.daysPerWeek && wizardData.trainingDays
    if (wizardStep === 4) return true
    if (wizardStep === 5) return true
    return false
  }

  const handleGeneratePlan = async () => {
    if (generating) return
    setGenerating(true)

    try {
      // Save goal and race only if saveToProfile is true
      if (wizardData.saveToProfile) {
        if (wizardData.goalTime && wizardData.raceDistance) {
          const goalVdot = parseFloat(estimateVdotFromGoalTime(wizardData.goalTime, wizardData.raceDistance))
          await setGoal(goalVdot, wizardData.raceDistance, wizardData.goalTime)
        }

        if (wizardData.newRaceAdded && wizardData.raceName && wizardData.raceDate && wizardData.raceDistance) {
          await addRace({
            name: wizardData.raceName,
            date: wizardData.raceDate,
            eventType: wizardData.raceDistance,
            notes: '',
          })
        }
      }

      // If user entered a recent race for VDOT
      let effectiveVdot = null
      if (wizardData.recentRaceTime && wizardData.recentRaceDist && wizardData.recentRaceDate) {
        const parts = wizardData.recentRaceTime.split(':')
        const totalSecs = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
        const dists = { '5k': 5000, '10k': 10000, 'half': 21097.5, 'marathon': 42195 }
        const distMeters = dists[wizardData.recentRaceDist]
        effectiveVdot = calculateVDOT(distMeters, totalSecs)

        // Save as a run and check for PR
        const newRun = await addRun({
          date: wizardData.recentRaceDate,
          distance: distMeters / 1609.344,
          distanceUnit: 'mi',
          duration: totalSecs,
          workoutType: 'race',
          notes: `Recent race for VDOT calibration (${wizardData.recentRaceDist})`,
        })
        if (newRun) {
          await checkAndUpdatePR({
            date: wizardData.recentRaceDate,
            distance: distMeters / 1609.344,
            distanceUnit: 'mi',
            duration: totalSecs,
            id: newRun.id,
          })
        }
      }

      // Get current VDOT
      const vdotData = calculateCurrentVDOT(prs, runs)
      const currentVdot = effectiveVdot || vdotData?.vdot || 45

      // Get goal VDOT
      let goalVdot = null
      if (wizardData.goalTime && wizardData.raceDistance) {
        goalVdot = parseFloat(estimateVdotFromGoalTime(wizardData.goalTime, wizardData.raceDistance))
      }

      // Generate the plan
      const planRaceDistance = wizardData.raceDistance || 'marathon'
      const planRaceDate = wizardData.raceDate || new Date(Date.now() + 18 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      // Determine mileage level from coach style
      let mileageLevel = 'intermediate'
      if (wizardData.planStyle === 'coach') {
        if (wizardData.coachStyle === 'pfitzinger') mileageLevel = 'advanced'
        else if (wizardData.coachStyle === 'daniels') mileageLevel = 'intermediate'
        else mileageLevel = 'beginner'
      }

      const plannedRuns = generatePlan({
        raceDistance: planRaceDistance,
        raceDate: planRaceDate,
        currentVdot,
        mileageLevel,
        trainingDays: wizardData.trainingDays,
        startingMileage: wizardData.startingMileage,
        vdotApproach: wizardData.vdotApproach,
        goalVdot,
      })

      // Insert runs
      for (const run of plannedRuns) {
        await addPlannedRun({
          ...run,
          targetRace: wizardData.raceName || undefined,
        })
      }

      closeWizard()
    } catch (err) {
      console.error('Error generating plan:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-white">
      <LandingPage
        plannedRuns={plannedRuns}
        upcomingRuns={upcomingRuns}
        loading={loading}
        onAddPlan={handleAddPlan}
        onMarkDone={handleMarkDone}
        onDelete={removePlannedRun}
        onEdit={(run) => setEditingPlanned(run)}
        onCreatePlan={openWizard}
        markDoneRun={markDoneRun}
        setMarkDoneRun={setMarkDoneRun}
        showForm={showForm}
        setShowForm={setShowForm}
      />

      {/* Edit Modal */}
      {editingPlanned && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit Planned Run</h2>
            <p className="text-sm text-gray-500 mb-4">
              Update the details for this planned run.
            </p>
            <PlannedRunForm
              onSubmit={handleEditPlanned}
              onCancel={() => setEditingPlanned(null)}
              initialValues={{
                date:             editingPlanned.date,
                distance:         editingPlanned.distance.toString(),
                workoutType:      editingPlanned.workoutType,
                notes:            editingPlanned.notes,
                targetPace:       editingPlanned.targetPace,
                targetRace:       editingPlanned.targetRace,
                hasReps:          !!editingPlanned.repsCount,
                repsCount:        editingPlanned.repsCount?.toString() || '',
                repDistanceMeters:editingPlanned.repDistanceMeters?.toString() || '',
                restSeconds:      editingPlanned.restSeconds || 90,
              }}
            />
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            {/* Close button */}
            <button
              onClick={closeWizard}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>

            <StepIndicator currentStep={wizardStep} totalSteps={5} />

            {wizardStep === 1 && <Step1PlanStyle data={wizardData} setData={setWizardData} />}
            {wizardStep === 2 && <Step2RaceGoals data={wizardData} setData={setWizardData} upcomingRaces={upcomingRaces} raceDistances={['5k', '10k', 'half', 'marathon']} />}
            {wizardStep === 3 && <Step3TrainingPrefs data={wizardData} setData={setWizardData} />}
            {wizardStep === 4 && <Step4FitnessAssessment data={wizardData} setData={setWizardData} runs={runs} prs={prs} />}
            {wizardStep === 5 && <Step5PreviewGenerate data={wizardData} runs={runs} prs={prs} />}

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              {wizardStep > 1 && (
                <button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 font-medium text-sm"
                >
                  Back
                </button>
              )}
              {wizardStep < 5 && (
                <button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={!canProceedToNext()}
                  className="flex-1 px-4 py-2 rounded-lg bg-black text-white font-medium text-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              )}
              {wizardStep === 5 && (
                <button
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate & Save Plan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
