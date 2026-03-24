import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { parseFitFileWithRecords } from '../../utils/parseFit'
import { parseTcxFileWithTrackpoints } from '../../utils/parseTcx'
import { parseGpxString } from '../../utils/parseGpx'
import { bulkInsertRuns, insertRunWithSplits } from '../../api/bulkRunsApi'
import { extractMileSplitsFromRecords, extractMileSplitsFromTcx } from '../../utils/computeSplits'

const WATCH_GUIDES = [
  {
    brand: 'Garmin',
    icon: '⌚',
    format: '.FIT',
    steps: [
      'Connect your Garmin watch to your computer with its charging/data cable.',
      'The watch appears as a drive on your computer — open it like a USB stick.',
      'Navigate to the folder: GARMIN → Activity',
      'Select all files inside (Ctrl+A on Windows, Cmd+A on Mac).',
      'Drag them directly into the upload box above — done.',
    ],
    tip: 'This folder contains every activity ever recorded on the watch, so you can import your full history in one go.',
  },
  {
    brand: 'Coros',
    icon: '🏃',
    format: '.FIT',
    steps: [
      'On your computer, go to training.coros.com and log in.',
      'Click Workouts in the left sidebar.',
      'Check the box in the top-left to select all activities.',
      'Click Export → select FIT format → click Download.',
      'Unzip the downloaded folder, then drag all files into the upload box above.',
    ],
    tip: 'The exported zip will contain one FIT file per activity — select them all after unzipping.',
  },
  {
    brand: 'Polar',
    icon: '🔵',
    format: '.GPX or .TCX',
    steps: [
      'Go to flow.polar.com and log in.',
      'Click Training → Training Log.',
      'Open an activity, scroll to the bottom, and click Export.',
      'Choose GPX or TCX format and save the file.',
      'Repeat for each run, then drag all exported files into the upload box above.',
    ],
    tip: 'Polar exports one activity at a time. Use the calendar view to quickly open each run.',
  },
  {
    brand: 'Suunto',
    icon: '🔴',
    format: '.GPX',
    steps: [
      'Go to www.suunto.com and log into your account.',
      'Click on an activity from your diary.',
      'Click the three-dot menu (⋯) → Export → GPX.',
      'Save the file, then repeat for each run.',
      'Drag all exported files into the upload box above.',
    ],
    tip: 'Suunto exports one at a time. If you have a large history, set aside a few minutes to export in batches.',
  },
]

function IdlePhase({ dragging, fileRef, handleDrop, handleDragOver, handleDragLeave, handleFileInput }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Garmin')

  const active = WATCH_GUIDES.find(g => g.brand === activeTab)

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-2">Import Runs</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Upload .fit, .gpx, or .tcx files from your GPS watch to import your full run history at once.
      </p>

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-white/60 bg-white/10' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".fit,.gpx,.tcx"
          className="hidden"
          onChange={handleFileInput}
        />
        <p className="text-3xl mb-2">📤</p>
        <p className="text-sm font-semibold text-white">
          {dragging ? 'Drop files here' : 'Drag files here or click to select'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          .fit · .gpx · .tcx — select as many as you like
        </p>
      </label>

      {/* How-to guide toggle */}
      <button
        onClick={() => setGuideOpen(o => !o)}
        className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full"
      >
        <span>{guideOpen ? '▾' : '▸'}</span>
        <span>How do I get files from my watch?</span>
      </button>

      {guideOpen && (
        <div className="mt-3 bg-zinc-900 rounded-xl overflow-hidden">
          {/* Brand tabs */}
          <div className="flex border-b border-zinc-800">
            {WATCH_GUIDES.map(g => (
              <button
                key={g.brand}
                onClick={() => setActiveTab(g.brand)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  activeTab === g.brand
                    ? 'text-white border-b-2 border-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g.icon} {g.brand}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="p-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-3">
              Exports as {active.format}
            </p>
            <ol className="space-y-2">
              {active.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-xs text-zinc-300 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            {active.tip && (
              <p className="mt-3 text-[11px] text-zinc-500 italic border-t border-zinc-800 pt-3">
                💡 {active.tip}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function BulkImportModal({ onClose, onImported }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState('idle') // idle | parsing | done
  const [progress, setProgress] = useState({ total: 0, done: 0 })
  const [results, setResults] = useState({ imported: 0, errors: [], byType: {} })
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const processFiles = useCallback(async (files) => {
    const fileList = [...files].filter(f => /\.(fit|gpx|tcx)$/i.test(f.name))
    if (!fileList.length) return

    setPhase('parsing')
    setProgress({ total: fileList.length, done: 0 })

    const gpxRuns = []
    const errors = []
    const byType = { fit: 0, gpx: 0, tcx: 0 }

    for (const file of fileList) {
      try {
        const ext = file.name.split('.').pop().toLowerCase()

        if (ext === 'fit') {
          // Parse FIT and extract splits
          const { run, records, startTime } = await parseFitFileWithRecords(await file.arrayBuffer())
          if (run && run.distance > 0) {
            const splits = extractMileSplitsFromRecords(records, startTime)
            await insertRunWithSplits(user.id, run, splits)
          }
          byType.fit++
        } else if (ext === 'tcx') {
          // Parse TCX and extract splits
          const { run, trackpoints } = await parseTcxFileWithTrackpoints(await file.text())
          if (run && run.distance > 0) {
            const splits = extractMileSplitsFromTcx(trackpoints)
            await insertRunWithSplits(user.id, run, splits)
          }
          byType.tcx++
        } else if (ext === 'gpx') {
          // Parse GPX (no splits extraction yet)
          const text = await file.text()
          const gpxRun = parseGpxString(text)
          const run = {
            date: gpxRun.date,
            distance: gpxRun.distanceMiles,
            duration: gpxRun.durationSeconds,
            workoutType: 'easy',
            notes: '',
            source: 'gpx',
            elevationGain: gpxRun.elevationGainFeet,
          }
          if (run.distance > 0) gpxRuns.push(run)
          byType.gpx++
        }
      } catch (e) {
        errors.push(`${file.name}: ${e.message}`)
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    try {
      // Bulk insert GPX runs (no splits)
      let totalImported = byType.fit + byType.tcx
      if (gpxRuns.length > 0) {
        await bulkInsertRuns(user.id, gpxRuns)
        totalImported += gpxRuns.length
      }

      setResults({ imported: totalImported, errors, byType })
      setPhase('done')
      if (onImported) onImported()
    } catch (e) {
      errors.push(`Database error: ${e.message}`)
      setResults({ imported: 0, errors, byType })
      setPhase('done')
    }
  }, [user, onImported])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleFileInput = (e) => {
    processFiles(e.target.files)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 rounded-2xl w-full max-w-lg p-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {phase === 'idle' && (
          <IdlePhase
            dragging={dragging}
            fileRef={fileRef}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleFileInput={handleFileInput}
          />
        )}

        {phase === 'parsing' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">Parsing Files</h2>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full" />
            </div>
            <p className="text-sm text-zinc-400 text-center">
              {progress.done} / {progress.total} files processed
            </p>
          </>
        )}

        {phase === 'done' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">Import Complete</h2>

            {results.imported > 0 && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 font-semibold">
                  ✓ Imported {results.imported} run{results.imported !== 1 ? 's' : ''}
                </p>
                <div className="text-xs text-green-300/70 mt-2 space-y-1">
                  {results.byType.fit > 0 && <p>• {results.byType.fit} FIT file{results.byType.fit !== 1 ? 's' : ''}</p>}
                  {results.byType.gpx > 0 && <p>• {results.byType.gpx} GPX file{results.byType.gpx !== 1 ? 's' : ''}</p>}
                  {results.byType.tcx > 0 && <p>• {results.byType.tcx} TCX file{results.byType.tcx !== 1 ? 's' : ''}</p>}
                </div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 font-semibold mb-2">
                  ⚠ {results.errors.length} error{results.errors.length !== 1 ? 's' : ''}
                </p>
                <div className="text-xs text-red-300/70 space-y-1 max-h-32 overflow-y-auto">
                  {results.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              </div>
            )}

            {results.imported === 0 && results.errors.length === 0 && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">No valid runs found in the selected files.</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-white text-black font-semibold py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Go to Running Log
            </button>
          </>
        )}
      </div>
    </div>
  )
}
