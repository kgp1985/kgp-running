import { useState, useMemo } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import WorkoutSelector from '../features/workouts/WorkoutSelector.jsx'
import WorkoutTypeCard from '../features/workouts/WorkoutTypeCard.jsx'
import WorkoutExamples from '../features/workouts/WorkoutExamples.jsx'
import { WORKOUT_TYPES } from '../data/workoutTypes.js'
import { generateWorkouts } from '../utils/workoutGenerator.js'
import { calculateCurrentVDOT, effectiveVdot, predictRaceTime } from '../utils/vdot.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { useVdotGoal } from '../hooks/useVdotGoal.js'
import { useAuth } from '../context/AuthContext.jsx'
import { secondsToTimeStr } from '../utils/paceCalc.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMarathon(vdot) {
  if (!vdot) return null
  const secs = predictRaceTime(vdot, 42195)
  return secondsToTimeStr(secs, true)
}

const MODE_CONFIG = {
  current: {
    label:       'Current',
    icon:        '📍',
    description: 'All paces based on your current fitness. Safe and accurate — right for base building and recovery phases.',
    badgeColor:  'bg-gray-800 text-white',
  },
  progressive: {
    label:       'Progressive',
    icon:        '↗',
    description: 'Smart blend per zone: easy/long stays at current fitness; threshold steps 25% toward goal; intervals push 50%; speed reps push 75%. This is the coaching-correct way to bridge toward a goal.',
    badgeColor:  'bg-violet-600 text-white',
  },
  goal: {
    label:       'Goal',
    icon:        '🎯',
    description: 'All paces based on your goal VDOT. Aspirational — best used only when the gap is ≤2 pts or you are in your final peak phase.',
    badgeColor:  'bg-red-500 text-white',
  },
}

// How much of the gap each zone absorbs in Progressive mode (mirrors vdot.js PROGRESSIVE_BLEND)
const ZONE_BLEND_LABEL = {
  easy:       'Current paces',
  recovery:   'Current paces',
  long:       'Current paces',
  tempo:      '25% toward goal',
  interval:   '50% toward goal',
  repetition: '75% toward goal',
  tuneup:     '40% toward goal',
  keyrace:    '50% toward goal',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkoutTypes() {
  const [selected, setSelected] = useState('easy')
  const [vdotMode, setVdotMode]  = useState('progressive')

  const { user }                           = useAuth()
  const { runs,  loading: runsLoading }    = useRunningLogDb()
  const { prs,   loading: prsLoading }     = usePersonalRecordsDb()
  const { goalData, loading: goalLoading } = useVdotGoal()

  // ── VDOT values ──────────────────────────────────────────────────────────────
  const currentResult = useMemo(() => {
    if (prsLoading || runsLoading) return null
    return calculateCurrentVDOT(prs, runs)
  }, [prs, runs, prsLoading, runsLoading])

  const currentVdot = currentResult?.vdot ?? null
  const goalVdot    = goalData?.goalVdot ?? null

  // The VDOT actually fed into workout generation for the selected workout type
  const workoutVdot = useMemo(() => {
    if (!currentVdot) return null
    return effectiveVdot(currentVdot, goalVdot, selected, vdotMode)
  }, [currentVdot, goalVdot, selected, vdotMode])

  const gap          = goalVdot && currentVdot ? +(goalVdot - currentVdot).toFixed(1) : null
  const gapTooLarge  = gap !== null && gap > 6
  const canUseGoalMode = !!goalVdot

  const type     = WORKOUT_TYPES[selected]
  const workouts = generateWorkouts(selected, workoutVdot)
  const loading  = runsLoading || prsLoading || goalLoading

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workout Types</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Personalized workout paces using Jack Daniels VDOT — anchored to your fitness and goal.
        </p>
      </div>

      {/* ── VDOT Summary + Training Mode Panel ──────────────────────────────── */}
      {!loading && (
        <div className="card mb-6">

          {/* VDOT numbers row */}
          <div className="flex items-center gap-6 flex-wrap mb-5">

            {/* Current VDOT */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-red-400">
                  {currentVdot ? currentVdot.toFixed(0) : '—'}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Current VDOT</p>
                {currentVdot
                  ? <p className="text-xs text-gray-600">{fmtMarathon(currentVdot)} marathon eq.</p>
                  : <p className="text-xs text-gray-400">Log a 5K+ PR to calculate</p>
                }
              </div>
            </div>

            {/* Gap arrow */}
            {gap !== null && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-gray-300 text-lg leading-none">→</div>
                <p className={`text-[10px] font-bold mt-0.5 ${gapTooLarge ? 'text-amber-600' : gap > 0 ? 'text-violet-600' : 'text-green-600'}`}>
                  {gap > 0 ? `+${gap}` : gap} pts
                </p>
              </div>
            )}

            {/* Goal VDOT */}
            {goalVdot ? (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-50 border-2 border-red-200 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-red-500">{goalVdot.toFixed(0)}</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Goal VDOT</p>
                  {goalData?.goalRaceDist && (
                    <p className="text-xs text-gray-600">
                      {goalData.goalRaceDist}{goalData.goalRaceTime ? ` · ${goalData.goalRaceTime}` : ''}
                    </p>
                  )}
                  {goalVdot && <p className="text-xs text-gray-400">{fmtMarathon(goalVdot)} marathon eq.</p>}
                </div>
              </div>
            ) : user && (
              <div className="text-xs text-gray-400">
                No goal set —{' '}
                <a href="/calculator" className="text-red-500 hover:text-red-700 font-medium underline">
                  set one on the Race Calculator
                </a>
              </div>
            )}
          </div>

          {/* Large gap warning */}
          {gapTooLarge && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 leading-relaxed">
              ⚠️ A {gap}-point VDOT gap is significant (~{Math.round(gap * 2.5)} sec/mi difference at marathon pace). Progressive mode is strongly recommended — Goal mode paces are aggressive for all zones and risk overtraining injury.
            </div>
          )}

          {/* Training mode selector */}
          {canUseGoalMode ? (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Training Mode</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setVdotMode(key)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      vdotMode === key
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {MODE_CONFIG[vdotMode].description}
              </p>
            </div>
          ) : (
            currentVdot && (
              <p className="text-xs text-gray-400">
                Training Mode unlocks when you{' '}
                <a href="/calculator" className="text-red-500 hover:text-red-700 underline font-medium">
                  set a goal VDOT on the Race Calculator
                </a>
                .{' '}It lets you progressively bridge toward your target fitness.
              </p>
            )
          )}
        </div>
      )}

      {/* ── Workout type selector ────────────────────────────────────────────── */}
      <div className="card mb-6">
        <WorkoutSelector selected={selected} onSelect={setSelected} />
      </div>

      {/* ── Active mode + zone badge ─────────────────────────────────────────── */}
      {canUseGoalMode && workoutVdot && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${MODE_CONFIG[vdotMode].badgeColor}`}>
            {MODE_CONFIG[vdotMode].icon} {MODE_CONFIG[vdotMode].label}
          </span>
          <span className="text-xs text-gray-500">
            {vdotMode === 'progressive' ? ZONE_BLEND_LABEL[selected] : ''}
            {' '}· VDOT {workoutVdot.toFixed(1)} for these paces
          </span>
        </div>
      )}

      {type && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkoutTypeCard type={type} />
          <WorkoutExamples
            workouts={workouts}
            typeColor={type.color}
            hasVdot={!!workoutVdot}
            vdotMode={canUseGoalMode ? vdotMode : 'current'}
            vdotValue={workoutVdot}
          />
        </div>
      )}

      {/* No VDOT yet */}
      {!currentVdot && !loading && (
        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
          <span className="font-semibold">Tip: </span>
          Add a 5K, 10K, half, or marathon PR in your{' '}
          <a href="/log" className="underline font-semibold">Running Log</a> and workouts
          will show personalized paces.
        </div>
      )}
    </PageWrapper>
  )
}
