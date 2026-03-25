import { useState, useRef } from 'react'
import { WORKOUT_TYPE_OPTIONS } from '../../data/workoutTypes.js'

function parseCSVContent(text) {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) throw new Error('CSV must have at least a header and one data row')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  // Detect column positions (case-insensitive)
  const dateIdx = headers.findIndex(h => h === 'date')
  const distanceIdx = headers.findIndex(h => h.includes('distance'))
  const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('workout'))
  const notesIdx = headers.findIndex(h => h === 'notes')
  const paceIdx = headers.findIndex(h => h.includes('pace'))

  if (dateIdx === -1 || distanceIdx === -1) {
    throw new Error('CSV must have "Date" and "Distance" columns')
  }

  const rows = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    if (cols.length < 2 || cols.every(c => !c)) continue

    try {
      const dateStr = cols[dateIdx]?.trim() || ''
      const distStr = cols[distanceIdx]?.trim() || ''
      const typeStr = cols[typeIdx]?.trim() || 'easy'
      const notesStr = cols[notesIdx]?.trim() || ''
      const paceStr = cols[paceIdx]?.trim() || ''

      // Parse date - try multiple formats
      let parsedDate = null
      if (dateStr) {
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          parsedDate = dateStr
        } else {
          // Try MM/DD/YYYY or other common formats
          const d = new Date(dateStr)
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString().slice(0, 10)
          }
        }
      }

      if (!parsedDate) {
        errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`)
        continue
      }

      // Parse distance
      const distance = parseFloat(distStr)
      if (isNaN(distance) || distance < 0) {
        errors.push(`Row ${i + 1}: Invalid distance "${distStr}"`)
        continue
      }

      // Validate workout type
      const validType = WORKOUT_TYPE_OPTIONS.find(t =>
        t.key === typeStr || t.label.toLowerCase() === typeStr.toLowerCase()
      )
      const workoutType = validType?.key || 'easy'

      rows.push({
        id: `import-${Date.now()}-${Math.random()}`,
        date: parsedDate,
        distance: distance.toString(),
        workoutType,
        notes: notesStr,
        targetPace: paceStr,
      })
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`)
    }
  }

  if (rows.length === 0) {
    throw new Error('No valid rows found in CSV')
  }

  return { rows, errors }
}

export default function ExcelImportModal({ onClose, onImport }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [parseErrors, setParseErrors] = useState([])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    setImporting(true)
    setError(null)
    setParseErrors([])

    try {
      // Accept .xlsx, .csv, or .xls files
      if (!file.name.match(/\.(xlsx?|csv)$/i)) {
        throw new Error('Please upload an Excel (.xlsx, .xls) or CSV file')
      }

      const text = await file.text()

      // If it's an Excel file, we'll try to parse it as CSV (Excel can export as CSV)
      // For .xlsx files, parsing is limited without external libraries
      const { rows, errors } = parseCSVContent(text)

      if (rows.length === 0) {
        throw new Error('No valid rows parsed from file')
      }

      if (errors.length > 0) {
        setParseErrors(errors)
        // Still import valid rows if any exist
        if (rows.length === 0) {
          setError('All rows had errors')
          setImporting(false)
          return
        }
      }

      // Pass parsed rows to parent and close
      onImport(rows)
    } catch (err) {
      setError(err.message || 'Failed to parse file')
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Training Plan</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a CSV or Excel file with your training data.</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-yellow-900 mb-2">Import warnings ({parseErrors.length}):</p>
            <ul className="text-xs text-yellow-800 space-y-1">
              {parseErrors.slice(0, 5).map((err, i) => (
                <li key={i}>• {err}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>• ... and {parseErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Drag-drop zone */}
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-black bg-black/5' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            disabled={importing}
            className="hidden"
          />
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm font-semibold text-gray-900">
            {dragging ? 'Drop file here' : 'Drag file here or click to select'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            .xlsx · .xls · .csv
          </p>
        </label>

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Expected file format:</p>
          <div className="text-xs text-gray-600 space-y-1 font-mono">
            <div>Date, Distance, WorkoutType, Notes, TargetPace</div>
            <div>2026-04-01, 5.0, easy, Morning run, 8:30</div>
            <div>2026-04-02, 7.5, tempo, Threshold work, 7:30</div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            • Date format: YYYY-MM-DD or MM/DD/YYYY
            • Distance in miles
            • WorkoutType: easy, recovery, long, tempo, interval, repetition, tuneup, keyrace, generalspeed
            • Notes and TargetPace are optional
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
