import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import EquivalentRaces from '../features/calculator/EquivalentRaces.jsx'
import TrainingPaces from '../features/calculator/TrainingPaces.jsx'
import { calculateVDOT, getTrainingPaces, getEquivalentRaceTimes } from '../utils/vdot.js'
import { timeStrToSeconds, secondsToTimeStr, pacePerMileToKm } from '../utils/paceCalc.js'
import { CALCULATOR_DISTANCES } from '../data/raceDistances.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { useVdotGoal } from '../hooks/useVdotGoal.js'
import { useAuth } from '../context/AuthContext.jsx'

// Distance label to VDOT race key mapping
const DIST_TO_VDOT_KEY = {
  '5K': '5K',
  '10K': '10K',
  'Half Marathon': 'HM',
  'Marathon': 'M',
  '1 Mile': '1mile',
  '1500m': '1500m',
  '3K': '3K',
}

export default function RaceCalculator() {
  const [selectedDist, setSelectedDist] = useState(CALCULATOR_DISTANCES[0])
  const [inputMode, setInputMode] = useState('time') // 'time' | 'pace'
  const [timeStr, setTimeStr] = useState('')
  const [paceStr, setPaceStr] = useState('')
  const [paceUnit, setPaceUnit] = useState('mi')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalSaving, setGoalSaving] = useState(false)

  const { user } = useAuth()
  const { runs } = useRunningLogDb()
  const { setGoal } = useVdotGoal()

  const loadFromLog = () => {
    if (!runs.length) { setError('No runs in your log yet.'); return }

    // Find the fastest per-mile-pace run >= 1 mile
    const candidates = runs.filter(r => r.distance >= 1 && r.duration > 0)
    if (!candidates.length) { setError('No valid runs found in log.'); return }
    const best = candidates.reduce((b, r) => (r.duration / r.distance < b.duration / b.distance ? r : b))

    // Snap to nearest standard distance for the calculator
    const nearest = CALCULATOR_DISTANCES.reduce((prev, d) => {
      const prevDiff = Math.abs(prev.meters - best.distance * 1609.344)
      const currDiff = Math.abs(d.meters - best.distance * 1609.344)
      return currDiff < prevDiff ? d : prev
    })
    setSelectedDist(nearest)
    setInputMode('time')
    setTimeStr(secondsToTimeStr(best.duration, best.duration >= 3600))
    setError('')
  }

  const calculate = () => {
    setError('')
    let timeSeconds = null

    if (inputMode === 'time') {
      timeSeconds = timeStrToSeconds(timeStr)
      if (!timeSeconds) { setError('Enter time as mm:ss or h:mm:ss'); return }
    } else {
      // Pace mode: convert pace to total time
      const paceSeconds = timeStrToSeconds(paceStr)
      if (!paceSeconds) { setError('Enter pace as mm:ss'); return }
      const distanceMiles = paceUnit === 'km'
        ? selectedDist.meters / 1000
        : selectedDist.meters / 1609.344
      timeSeconds = paceSeconds * distanceMiles
    }

    const vdot = calculateVDOT(selectedDist.meters, timeSeconds)
    if (!vdot || vdot < 30 || vdot > 85) {
      setError('VDOT out of range (30–85). Check your time and distance.')
      return
    }

    const raceTimes = getEquivalentRaceTimes(vdot)
    const trainingPaces = getTrainingPaces(vdot)

    setResults({ vdot, raceTimes, trainingPaces, inputDistKey: DIST_TO_VDOT_KEY[selectedDist.label] })
    setGoalSaved(false) // reset saved state when new result calculated
  }

  const handleSetGoal = async () => {
    if (!results || !user) return
    setGoalSaving(true)
    try {
      const inputTimeStr = inputMode === 'time' ? timeStr : paceStr
      await setGoal(results.vdot, selectedDist.label, inputTimeStr)
      setGoalSaved(true)
    } catch {
      // silently fail — non-critical
    } finally {
      setGoalSaving(false)
    }
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Race Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Calculate equivalent race times and training paces using Jack Daniels VDOT.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="card space-y-5">
          {/* Distance selector */}
          <div>
            <label className="label">Race Distance</label>
            <div className="flex flex-wrap gap-2">
              {CALCULATOR_DISTANCES.map(d => (
                <button
                  key={d.label}
                  onClick={() => setSelectedDist(d)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedDist.label === d.label
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input mode toggle */}
          <div>
            <label className="label">Enter</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              <button
                onClick={() => setInputMode('time')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'time' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Finish Time
              </button>
              <button
                onClick={() => setInputMode('pace')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  inputMode === 'pace' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Race Pace
              </button>
            </div>
          </div>

          {/* Time / Pace input */}
          {inputMode === 'time' ? (
            <div>
              <label className="label">Finish Time (mm:ss or h:mm:ss)</label>
              <input
                type="text"
                className="input"
                placeholder={selectedDist.meters > 10000 ? '1:45:00' : '22:30'}
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && calculate()}
              />
            </div>
          ) : (
            <div>
              <label className="label">Race Pace</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="7:15"
                  value={paceStr}
                  onChange={e => setPaceStr(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && calculate()}
                />
                <select
                  className="input w-20"
                  value={paceUnit}
                  onChange={e => setPaceUnit(e.target.value)}
                >
                  <option value="mi">/mi</option>
                  <option value="km">/km</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={calculate}>
              Calculate
            </button>
            <button className="btn-secondary" onClick={loadFromLog} title="Load best effort from running log">
              From Log
            </button>
          </div>

          {/* VDOT badge + Set Goal button */}
          {results && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-black text-white rounded-xl px-4 py-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-400">{results.vdot.toFixed(1)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">VDOT</p>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <p className="font-medium text-slate-100">Your aerobic fitness index</p>
                  <p>Based on Jack Daniels' running formula. Higher = more aerobically fit.</p>
                </div>
              </div>

              {/* Set as Goal VDOT */}
              {user && (
                goalSaved ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Goal VDOT set to {results.vdot.toFixed(1)} — visible on your home page
                  </div>
                ) : (
                  <button
                    onClick={handleSetGoal}
                    disabled={goalSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium text-red-700 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                    </svg>
                    {goalSaving ? 'Saving…' : `Set VDOT ${results.vdot.toFixed(1)} as my goal`}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="space-y-6">
          {results ? (
            <>
              <div className="card">
                <EquivalentRaces raceTimes={results.raceTimes} inputDistanceKey={results.inputDistKey} />
              </div>
              <div className="card">
                <TrainingPaces paces={results.trainingPaces} />
              </div>
            </>
          ) : (
            <div className="card flex items-center justify-center py-16 text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-sm font-medium text-gray-500">Enter a time or pace to calculate</p>
                <p className="text-xs mt-1">Results appear here after you hit Calculate.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <span className="font-semibold">About VDOT: </span>
        Jack Daniels' VDOT is a measure of running economy and aerobic capacity derived from race performance.
        It's used to set training paces that target specific physiological adaptations without over- or under-training.
      </div>
    </PageWrapper>
  )
}
