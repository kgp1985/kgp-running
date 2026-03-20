import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { parseFitFile } from '../../utils/parseFit'
import { parseTcxFile } from '../../utils/parseTcx'
import { parseGpxString } from '../../utils/parseGpx'
import { bulkInsertRuns } from '../../api/bulkRunsApi'

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

    const parsed = []
    const errors = []
    const byType = { fit: 0, gpx: 0, tcx: 0 }

    for (const file of fileList) {
      try {
        const ext = file.name.split('.').pop().toLowerCase()
        let run

        if (ext === 'fit') {
          run = await parseFitFile(await file.arrayBuffer())
          byType.fit++
        } else if (ext === 'gpx') {
          const text = await file.text()
          run = parseGpxString(text)
          // parseGpxString returns distanceMiles, durationSeconds, elevationGainFeet, heartRate
          // Normalize to our shape
          run = {
            date: run.date,
            distance: run.distanceMiles,
            duration: run.durationSeconds,
            workoutType: 'easy',
            notes: '',
            source: 'gpx',
            elevationGain: run.elevationGainFeet,
          }
          byType.gpx++
        } else if (ext === 'tcx') {
          run = parseTcxFile(await file.text())
          byType.tcx++
        }

        if (run && run.distance > 0) parsed.push(run)
      } catch (e) {
        errors.push(`${file.name}: ${e.message}`)
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    try {
      if (parsed.length > 0) await bulkInsertRuns(user.id, parsed)
      setResults({ imported: parsed.length, errors, byType })
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
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Import Runs</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Drag and drop or select .fit, .gpx, and .tcx files to bulk-import your run history.
            </p>

            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-white/60 bg-white/10'
                  : 'border-zinc-700 hover:border-zinc-500'
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
              <div>
                <p className="text-3xl mb-2">📤</p>
                <p className="text-sm font-semibold text-white">
                  {dragging ? 'Drop files here' : 'Drag files here or click to select'}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Supports Garmin, Coros, Strava, and other GPS watch exports
                </p>
              </div>
            </label>
          </>
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
