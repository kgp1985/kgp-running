import { useState, useRef, useCallback, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunForm from '../features/log/RunForm.jsx'
import LogFilters from '../features/log/LogFilters.jsx'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { useProfile } from '../hooks/useProfile.js'
import { useAuth } from '../context/AuthContext.jsx'
import { secondsToTimeStr } from '../utils/paceCalc.js'
import PendingRunBanner from '../features/watch/PendingRunBanner.jsx'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../data/workoutTypes.js'

const DEFAULT_FILTERS = { workoutType: '', dateFrom: '', dateTo: '', sortBy: 'date-desc' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPace(distance, duration, distanceUnit) {
  if (!distance || !duration) return null
  const miles = distanceUnit === 'km' ? distance / 1.60934 : distance
  const secPerMile = duration / miles
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function getTypeStyle(workoutType) {
  const type = WORKOUT_TYPES[workoutType]
  const color = type?.color ?? 'green'
  return { label: type?.label ?? workoutType, color, style: WORKOUT_TYPE_COLORS[color] }
}

// ── ViewToggle ─────────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
      <button
        onClick={() => onChange('spinner')}
        title="Spinner view"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          view === 'spinner'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {/* drum / cylinder icon */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <ellipse cx="8" cy="3.5" rx="5" ry="1.8" />
          <line x1="3" y1="3.5" x2="3" y2="12.5" />
          <line x1="13" y1="3.5" x2="13" y2="12.5" />
          <ellipse cx="8" cy="12.5" rx="5" ry="1.8" />
          <line x1="3" y1="8" x2="13" y2="8" strokeDasharray="1.5 1.5" />
        </svg>
        Spin
      </button>
      <button
        onClick={() => onChange('classic')}
        title="Classic list view"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          view === 'classic'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {/* list icon */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <line x1="5" y1="4" x2="13" y2="4" />
          <line x1="5" y1="8" x2="13" y2="8" />
          <line x1="5" y1="12" x2="13" y2="12" />
          <circle cx="2.5" cy="4"  r="1" fill="currentColor" stroke="none" />
          <circle cx="2.5" cy="8"  r="1" fill="currentColor" stroke="none" />
          <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
        List
      </button>
    </div>
  )
}

// ── ClassicList ────────────────────────────────────────────────────────────────

function ClassicList({ runs, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="w-2.5 flex-shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-24 hidden sm:block">Date</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-28 hidden sm:block">Type</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-20">Distance</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-16 hidden sm:block">Time</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-20 hidden md:block">Pace</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-1 hidden lg:block">Details</p>
      </div>
      <div className="divide-y divide-gray-50">
        {runs.map(run => {
          const { style, label } = getTypeStyle(run.workoutType)
          const pace = fmtPace(run.distance, run.duration, run.distanceUnit)
          return (
            <div key={run.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
              <p className="text-xs text-gray-500 w-24 flex-shrink-0 hidden sm:block">{fmtDate(run.date)}</p>
              <span className={`hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full w-28 justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                {label}
              </span>
              <p className="text-sm font-bold text-gray-900 w-20 flex-shrink-0">{run.distance.toFixed(2)} mi</p>
              <p className="text-xs text-gray-500 w-16 flex-shrink-0 hidden sm:block">
                {secondsToTimeStr(run.duration, run.duration >= 3600)}
              </p>
              {pace
                ? <p className="text-xs text-gray-500 w-20 flex-shrink-0 hidden md:block">{pace} /mi</p>
                : <div className="w-20 hidden md:block flex-shrink-0" />
              }
              <div className="hidden lg:flex gap-3 flex-1">
                {run.heartRate && <p className="text-xs text-gray-400">{run.heartRate} bpm</p>}
                {run.elevationGain && <p className="text-xs text-gray-400">{run.elevationGain.toLocaleString()} ft ↑</p>}
              </div>
              <p className="text-xs text-gray-400 flex-1 truncate sm:hidden">{run.subtitle || run.notes || label}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => onEdit(run)} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">Edit</button>
                <button onClick={() => onDelete(run.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── YearInMiles ────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const GOAL_KEY = 'kgp_annual_mile_goal'

function YearInMiles({ runs }) {
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem(GOAL_KEY)
    return saved ? parseInt(saved) : 1000
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const year = new Date().getFullYear()
  const currentMonth = new Date().getMonth() // 0-indexed

  const yearRuns = runs.filter(r => r.date.startsWith(String(year)))
  const totalMiles = yearRuns.reduce((s, r) =>
    s + (r.distanceUnit === 'km' ? r.distance / 1.60934 : r.distance), 0)
  const progress = Math.min(1, totalMiles / goal)
  const pct = Math.round(progress * 100)

  const months = MONTH_LABELS.map((label, i) => {
    const monthStr = String(i + 1).padStart(2, '0')
    const miles = yearRuns
      .filter(r => r.date.startsWith(`${year}-${monthStr}`))
      .reduce((s, r) => s + (r.distanceUnit === 'km' ? r.distance / 1.60934 : r.distance), 0)
    return { label, miles, isCurrent: i === currentMonth, isFuture: i > currentMonth }
  })
  const maxMiles = Math.max(...months.map(m => m.miles), 1)

  const saveGoal = () => {
    const val = parseInt(goalInput)
    if (val > 0) {
      setGoal(val)
      localStorage.setItem(GOAL_KEY, String(val))
    }
    setEditingGoal(false)
  }

  // SVG arc — 180° semicircle
  const R = 76
  const cx = 100, cy = 92
  const arcLen = Math.PI * R // half circumference
  const dashOffset = arcLen * (1 - progress)
  const milesLeft = Math.max(0, goal - totalMiles)

  return (
    <div className="bg-zinc-950 rounded-2xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row gap-8 items-center">

        {/* ── Arc gauge ── */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg width="200" height="114" viewBox="0 0 200 114" className="overflow-visible">
            {/* Track */}
            <path
              d={`M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`}
              fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round"
            />
            {/* Progress */}
            <path
              d={`M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`}
              fill="none" stroke="#EF4444" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={arcLen} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}
            />
            {/* Tick marks at 25% intervals */}
            {[0.25, 0.5, 0.75].map(t => {
              const angle = Math.PI * (1 - t) // 180° to 0°
              const x1 = cx + (R - 8) * Math.cos(angle)
              const y1 = cy - (R - 8) * Math.sin(angle)
              const x2 = cx + (R + 2) * Math.cos(angle)
              const y2 = cy - (R + 2) * Math.sin(angle)
              return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            })}
            {/* Miles number */}
            <text x={cx} y={cy - 22} textAnchor="middle" fill="white"
              fontSize="30" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-1">
              {Math.round(totalMiles).toLocaleString()}
            </text>
            <text x={cx} y={cy - 5} textAnchor="middle" fill="rgba(255,255,255,0.35)"
              fontSize="10" fontFamily="system-ui, sans-serif">
              miles in {year}
            </text>
            {/* End labels */}
            <text x={cx - R - 2} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.2)"
              fontSize="9" fontFamily="system-ui, sans-serif">0</text>
            <text x={cx + R + 2} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.2)"
              fontSize="9" fontFamily="system-ui, sans-serif">{goal.toLocaleString()}</text>
          </svg>

          {/* Progress pill + goal edit */}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
              pct >= 100 ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>{pct}%</span>
            {progress < 1 && (
              <span className="text-xs text-zinc-600">{Math.round(milesLeft)} mi to go</span>
            )}
            {progress >= 1 && (
              <span className="text-xs text-red-400 font-bold">Goal crushed 🔥</span>
            )}
          </div>

          {/* Goal setter */}
          <div className="mt-2">
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoal(false) }}
                  className="w-24 bg-zinc-800 text-white text-xs text-center rounded-lg px-2 py-1.5 border border-zinc-600 focus:border-red-500 focus:outline-none"
                  placeholder={String(goal)}
                />
                <button onClick={saveGoal} className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">Set</button>
                <button onClick={() => setEditingGoal(false)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setGoalInput(String(goal)); setEditingGoal(true) }}
                className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
                </svg>
                Goal: {goal.toLocaleString()} mi
              </button>
            )}
          </div>
        </div>

        {/* ── Monthly bars ── */}
        <div className="flex-1 w-full min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">
            {year} · Month by Month
          </p>
          <div className="flex items-end gap-1" style={{ height: '88px' }}>
            {months.map(({ label, miles, isCurrent, isFuture }) => {
              const barH = isFuture ? 0 : (miles / maxMiles) * 72
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  {/* Miles label above bar */}
                  <div className="flex-1 flex items-end justify-center w-full">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '72px' }}>
                      {miles > 0 && !isFuture && (
                        <span className={`text-[8px] mb-0.5 leading-none tabular-nums ${isCurrent ? 'text-red-400' : 'text-zinc-600'}`}>
                          {Math.round(miles)}
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t-sm transition-all duration-700 ${
                          isCurrent ? 'bg-red-500' :
                          isFuture  ? 'bg-zinc-900' :
                                      'bg-zinc-700 hover:bg-zinc-500'
                        }`}
                        style={{ height: `${Math.max(barH, isFuture ? 0 : miles > 0 ? 3 : 0)}px` }}
                      />
                    </div>
                  </div>
                  {/* Month label */}
                  <span className={`text-[9px] font-bold leading-none ${isCurrent ? 'text-red-400' : 'text-zinc-700'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pace stat footer */}
          {yearRuns.length > 0 && (
            <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-900">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-semibold">Runs</p>
                <p className="text-sm font-black text-zinc-300">{yearRuns.length}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-semibold">Avg / Run</p>
                <p className="text-sm font-black text-zinc-300">{(totalMiles / yearRuns.length).toFixed(1)} mi</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-semibold">Pace to Goal</p>
                <p className="text-sm font-black text-zinc-300">
                  {(() => {
                    const daysLeft = Math.max(1, Math.ceil((new Date(`${year}-12-31`) - new Date()) / 86400000))
                    const weeksLeft = daysLeft / 7
                    const milesPerWeek = milesLeft / weeksLeft
                    return milesLeft > 0 ? `${milesPerWeek.toFixed(1)} mi/wk` : '—'
                  })()}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-700 font-semibold">Best Month</p>
                <p className="text-sm font-black text-zinc-300">
                  {months.reduce((best, m) => m.miles > best.miles ? m : best, months[0]).label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const BORDER_MAP = {
  green:  'border-l-green-500',
  blue:   'border-l-blue-500',
  teal:   'border-l-teal-500',
  yellow: 'border-l-yellow-400',
  orange: 'border-l-orange-500',
  red:    'border-l-red-500',
  purple: 'border-l-purple-500',
  pink:   'border-l-pink-500',
  indigo: 'border-l-indigo-500',
}

function runToFormValues(run) {
  return {
    date:             run.date,
    distance:         run.distanceUnit === 'km'
      ? (run.distance * 1.60934).toFixed(2)
      : run.distance.toFixed(2),
    distanceUnit:     run.distanceUnit ?? 'mi',
    durationStr:      secondsToTimeStr(run.duration, run.duration >= 3600),
    heartRate:        run.heartRate ?? '',
    workoutType:      run.workoutType,
    weather:          run.weather ?? '',
    notes:            run.notes ?? '',
    subtitle:         run.subtitle ?? '',
    isPublic:         run.isPublic ?? false,
    elevationGain:    run.elevationGain ?? '',
    shoeId:           run.shoeId ?? '',
    hasReps:          !!run.repsCount,
    repsCount:        run.repsCount ?? '',
    repDistanceMeters: run.repDistanceMeters ?? '',
    restSeconds:      run.restSeconds ?? 90,
  }
}

// ── RunFeatureCard ─────────────────────────────────────────────────────────────

function RunFeatureCard({ run, onDelete, onEdit }) {
  const { label, color, style } = getTypeStyle(run.workoutType)
  const borderColor = BORDER_MAP[color] ?? 'border-l-gray-400'
  const distMi = run.distanceUnit === 'km' ? run.distance / 1.60934 : run.distance
  const pace = fmtPace(run.distance, run.duration, run.distanceUnit)

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${borderColor} overflow-hidden flex flex-col`}>
      <div className="px-5 pt-5 pb-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 font-medium">{fmtDate(run.date)}</p>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {label}
          </span>
        </div>
        {(run.subtitle || run.notes) && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {run.subtitle || run.notes}
          </p>
        )}
        <p className="text-4xl font-black text-gray-900 leading-none mb-1">
          {distMi.toFixed(2)} mi
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <Stat label="Time" value={secondsToTimeStr(run.duration, run.duration >= 3600)} />
          {pace && <Stat label="Pace" value={`${pace} /mi`} />}
          {run.heartRate && <Stat label="HR" value={`${run.heartRate} bpm`} />}
          {run.elevationGain && <Stat label="Vert" value={`${run.elevationGain.toLocaleString()} ft`} />}
        </div>
      </div>
      <div className="flex border-t border-gray-100">
        <button onClick={() => onEdit(run)} className="flex-1 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 py-2.5 transition-colors">
          Edit
        </button>
        <div className="w-px bg-gray-100" />
        <button onClick={() => onDelete(run.id)} className="flex-1 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 py-2.5 transition-colors">
          Delete
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-bold text-gray-700">{value}</p>
    </div>
  )
}

// ── HistorySpinner ─────────────────────────────────────────────────────────────
// Drum-barrel "word spinner" style navigation for older runs.

const ITEM_H = 68 // px per row in the drum

function HistorySpinner({ runs, onEdit, onDelete }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [dragStartY, setDragStartY] = useState(null)
  const containerRef = useRef(null)

  const safeIdx = Math.min(activeIdx, runs.length - 1)

  const spin = useCallback((dir) => {
    setActiveIdx(i => Math.max(0, Math.min(runs.length - 1, i + dir)))
  }, [runs.length])

  // Mouse wheel to spin
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      spin(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [spin])

  const handlePointerDown = (e) => setDragStartY(e.clientY)
  const handlePointerUp = (e) => {
    if (dragStartY === null) return
    const delta = dragStartY - e.clientY
    if (Math.abs(delta) > 12) spin(delta > 0 ? 1 : -1)
    setDragStartY(null)
  }

  if (!runs.length) return null

  // Dot indicator — max 8 shown, rest collapsed
  const DOT_MAX = 8
  const showDots = runs.length <= DOT_MAX

  return (
    <div className="bg-zinc-950 rounded-2xl overflow-hidden select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
          History · {runs.length} run{runs.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs tabular-nums text-zinc-600">{safeIdx + 1} / {runs.length}</p>
      </div>

      {/* Drum barrel */}
      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{ height: ITEM_H * 5, perspective: '700px' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setDragStartY(null)}
      >
        {/* Center highlight band */}
        <div
          className="absolute inset-x-0 pointer-events-none z-10"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: ITEM_H,
            background: 'rgba(255,255,255,0.03)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        />

        {/* Top fade mask */}
        <div
          className="absolute inset-x-0 top-0 z-20 pointer-events-none"
          style={{ height: ITEM_H * 2.2, background: 'linear-gradient(to bottom, #09090b 15%, transparent 100%)' }}
        />
        {/* Bottom fade mask */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
          style={{ height: ITEM_H * 2.2, background: 'linear-gradient(to top, #09090b 15%, transparent 100%)' }}
        />

        {/* Items */}
        {runs.map((run, i) => {
          const offset = i - safeIdx
          if (Math.abs(offset) > 4) return null

          const { style, label } = getTypeStyle(run.workoutType)
          const isActive = offset === 0
          const rotX = offset * -16
          const translateY = offset * ITEM_H
          const opacity = Math.max(0, 1 - Math.abs(offset) * 0.42)
          const scale = 1 - Math.abs(offset) * 0.055
          const pace = fmtPace(run.distance, run.duration, run.distanceUnit)

          return (
            <div
              key={run.id}
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: ITEM_H,
                transform: `translateY(calc(-50% + ${translateY}px)) rotateX(${rotX}deg) scale(${scale})`,
                opacity,
                transformOrigin: 'center center',
                transition: dragStartY !== null ? 'none' : 'all 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: isActive ? 5 : 1,
              }}
            >
              <div className="flex items-center gap-3 px-5 h-full">

                {/* Color dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} style={{ opacity: isActive ? 1 : 0.5 }} />

                {/* Date */}
                <p className={`text-xs flex-shrink-0 w-24 ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {fmtDate(run.date)}
                </p>

                {/* Distance — big when active */}
                <p className={`font-black flex-shrink-0 tabular-nums transition-all ${isActive ? 'text-2xl text-white' : 'text-sm text-zinc-500'}`}>
                  {run.distance.toFixed(2)} mi
                </p>

                {/* Active-only: type + stats */}
                {isActive && (
                  <>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${style.bg} ${style.text}`}>
                      {label}
                    </span>
                    <div className="flex gap-3 flex-1 overflow-hidden">
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {secondsToTimeStr(run.duration, run.duration >= 3600)}
                      </span>
                      {pace && <span className="text-xs text-zinc-500 flex-shrink-0">{pace}/mi</span>}
                      {run.heartRate && (
                        <span className="text-xs text-zinc-600 hidden sm:inline flex-shrink-0">{run.heartRate} bpm</span>
                      )}
                      {run.elevationGain && (
                        <span className="text-xs text-zinc-600 hidden sm:inline flex-shrink-0">{run.elevationGain.toLocaleString()} ft ↑</span>
                      )}
                    </div>
                  </>
                )}

                {/* Spacer for non-active */}
                {!isActive && <div className="flex-1" />}

                {/* Edit / Delete — active row only */}
                {isActive && (
                  <div className="flex gap-1 flex-shrink-0 z-30">
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onEdit(run) }}
                      className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onDelete(run.id) }}
                      className="text-xs text-red-600 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-5 pb-4 pt-2">
        <button
          onClick={() => spin(-1)}
          disabled={safeIdx === 0}
          className="text-[11px] font-semibold text-zinc-600 hover:text-white disabled:opacity-20 transition-colors tracking-wide"
        >
          ↑ Newer
        </button>

        {/* Dot indicators or range text */}
        {showDots ? (
          <div className="flex gap-1.5 items-center">
            {runs.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`rounded-full transition-all ${i === safeIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-700 tabular-nums">
            Scroll or drag to navigate
          </p>
        )}

        <button
          onClick={() => spin(1)}
          disabled={safeIdx === runs.length - 1}
          className="text-[11px] font-semibold text-zinc-600 hover:text-white disabled:opacity-20 transition-colors tracking-wide"
        >
          Older ↓
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RunningLog() {
  const [showForm, setShowForm]     = useState(false)
  const [editingRun, setEditingRun] = useState(null)
  const [filters, setFilters]       = useState(DEFAULT_FILTERS)
  const [viewMode, setViewMode]     = useState('spinner')
  const { runs, addRun, deleteRun, updateRun, loading } = useRunningLogDb()
  const { checkAndUpdatePR } = usePersonalRecordsDb()
  const { profile } = useProfile()
  const { user } = useAuth()

  const handleAddRun = async (runData) => {
    const newRun = await addRun(runData)
    if (newRun) await checkAndUpdatePR({ ...runData, id: newRun.id })
    setShowForm(false)
  }

  const handleUpdateRun = async (runData) => {
    await updateRun(editingRun.id, runData)
    setEditingRun(null)
  }

  const filtered = runs
    .filter(r => {
      if (filters.workoutType && r.workoutType !== filters.workoutType) return false
      if (filters.dateFrom && r.date < filters.dateFrom) return false
      if (filters.dateTo && r.date > filters.dateTo) return false
      return true
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-asc':      return a.date.localeCompare(b.date)
        case 'distance-desc': return b.distance - a.distance
        case 'distance-asc':  return a.distance - b.distance
        case 'pace-asc':      return (a.duration / a.distance) - (b.duration / b.distance)
        default:              return b.date.localeCompare(a.date) || (b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0)
      }
    })

  const recentRuns = filtered.slice(0, 3)
  const olderRuns  = filtered.slice(3)
  const totalMiles = filtered.reduce((s, r) => s + (r.distanceUnit === 'km' ? r.distance / 1.60934 : r.distance), 0)

  if (loading) {
    return (
      <PageWrapper>
        <p className="text-sm text-gray-400 text-center py-16">Loading your runs...</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PendingRunBanner />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              {profile?.displayName
                ? `${profile.displayName.trim().split(' ')[0]}'s Log`
                : 'My Log'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {runs.length} run{runs.length !== 1 ? 's' : ''} · {totalMiles.toFixed(1)} mi shown
            </p>
          </div>
          {olderRuns.length > 0 && (
            <ViewToggle view={viewMode} onChange={setViewMode} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowForm(s => !s)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? 'Cancel' : 'Log Run'}
          </button>
        </div>
      </div>

      {/* Year in Miles */}
      {runs.length > 0 && <YearInMiles runs={runs} />}

      {/* Log form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Run</h2>
          <RunForm
            onSubmit={handleAddRun}
            onCancel={() => setShowForm(false)}
            defaultIsPublic={profile?.isPublic ?? false}
          />
        </div>
      )}

      {/* Filters */}
      {runs.length > 0 && (
        <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6">
          <LogFilters filters={filters} onChange={setFilters} />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-sm font-medium text-gray-500">No runs yet</p>
          <p className="text-xs mt-1">Add your first run using the button above.</p>
        </div>
      )}

      {/* Recent feature cards */}
      {recentRuns.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-3">
            Recent runs
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRuns.map(run => (
              <RunFeatureCard
                key={run.id}
                run={run}
                onDelete={deleteRun}
                onEdit={run => setEditingRun(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* History — spinner or classic list */}
      {olderRuns.length > 0 && (
        viewMode === 'spinner'
          ? <HistorySpinner runs={olderRuns} onEdit={run => setEditingRun(run)} onDelete={deleteRun} />
          : (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">
                History · {olderRuns.length} run{olderRuns.length !== 1 ? 's' : ''}
              </p>
              <ClassicList runs={olderRuns} onEdit={run => setEditingRun(run)} onDelete={deleteRun} />
            </div>
          )
      )}

      {/* Edit modal */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-8 mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Edit Run</h2>
              <button
                onClick={() => setEditingRun(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <RunForm
              initialValues={runToFormValues(editingRun)}
              onSubmit={handleUpdateRun}
              onCancel={() => setEditingRun(null)}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
