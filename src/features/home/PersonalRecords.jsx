import { useState } from 'react'
import { usePersonalRecordsDb } from '../../hooks/usePersonalRecordsDb.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { secondsToTimeStr, timeStrToSeconds } from '../../utils/paceCalc.js'
import { formatDate } from '../../utils/formatters.js'

const DISTANCE_ORDER = ['Mile', '5K', '10K', 'Half Marathon', 'Marathon']
const STANDARD_DISTANCES = ['Mile', '5K', '10K', 'Half Marathon', 'Marathon']

const EMPTY_FORM = {
  distanceLabel: 'Mile',
  customLabel: '',
  timeStr: '',
  date: '',
  raceName: '',
  isCustom: false,
}

export default function PersonalRecords() {
  const { prs, setPR, deletePR } = usePersonalRecordsDb()
  const { user } = useAuth()

  const [modal, setModal] = useState(null) // null | { mode: 'add' | 'edit', originalLabel?: string }
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null) // distanceLabel awaiting confirm
  const [saving, setSaving] = useState(false)

  const prList = DISTANCE_ORDER
    .filter(d => prs[d])
    .map(d => ({ label: d, ...prs[d] }))

  const otherPRs = Object.keys(prs)
    .filter(d => !DISTANCE_ORDER.includes(d))
    .map(d => ({ label: d, ...prs[d] }))

  const allPRs = [...prList, ...otherPRs]

  // ── Helpers ─────────────────────────────────────────────
  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal({ mode: 'add' })
  }

  const openEdit = (pr) => {
    const isCustom = !STANDARD_DISTANCES.includes(pr.label)
    setForm({
      distanceLabel: isCustom ? 'Custom' : pr.label,
      customLabel: isCustom ? pr.label : '',
      timeStr: secondsToTimeStr(pr.time, true),
      date: pr.date || '',
      raceName: pr.raceName || '',
      isCustom,
    })
    setErrors({})
    setModal({ mode: 'edit', originalLabel: pr.label })
  }

  const closeModal = () => {
    setModal(null)
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    const label = form.isCustom ? form.customLabel.trim() : form.distanceLabel
    if (!label) errs.distanceLabel = 'Required'
    if (!form.timeStr) {
      errs.timeStr = 'Required'
    } else if (timeStrToSeconds(form.timeStr) === null) {
      errs.timeStr = 'Use format mm:ss or h:mm:ss'
    }
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const label = form.isCustom ? form.customLabel.trim() : form.distanceLabel
      const time = timeStrToSeconds(form.timeStr)
      await setPR(label, time, form.date || null, form.raceName)
      closeModal()
    } catch {
      setErrors({ submit: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (distanceLabel) => {
    await deletePR(distanceLabel)
    setConfirmDelete(null)
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Personal Records</h2>
        {user && (
          <button
            onClick={openAdd}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full font-medium transition-colors"
          >
            + Add PR
          </button>
        )}
      </div>

      {allPRs.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">🏅</p>
          <p className="text-sm">No PRs yet. Log races in the Running Log and PRs will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allPRs.map(pr => (
            <div key={pr.label} className="py-2 border-b border-gray-50 last:border-0">
              {confirmDelete === pr.label ? (
                /* Inline delete confirmation */
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Delete <span className="font-semibold">{pr.label}</span> PR?
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDelete(pr.label)}
                      className="text-sm text-red-500 hover:text-red-700 font-semibold"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-sm text-gray-400 hover:text-gray-600 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{pr.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-500">{secondsToTimeStr(pr.time, true)}</span>
                      {pr.date && (
                        <span className="text-xs text-gray-400 ml-2">{formatDate(pr.date)}</span>
                      )}
                    </div>
                    {user && (
                      <div className="flex gap-0.5 ml-2">
                        <button
                          onClick={() => openEdit(pr)}
                          className="p-1.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
                          title="Edit PR"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(pr.label)}
                          className="p-1.5 text-gray-300 hover:text-red-400 rounded transition-colors"
                          title="Delete PR"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        PRs update automatically when you log races near standard distances.
      </p>

      {/* ── Add / Edit Modal ────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">
              {modal.mode === 'add' ? 'Add Personal Record' : 'Edit Personal Record'}
            </h3>

            {/* Distance */}
            <div className="mb-4">
              <label className="label">Distance</label>
              <select
                className="input"
                value={form.isCustom ? 'Custom' : form.distanceLabel}
                onChange={e => {
                  const val = e.target.value
                  const custom = val === 'Custom'
                  setForm(f => ({
                    ...f,
                    isCustom: custom,
                    distanceLabel: custom ? '' : val,
                    customLabel: custom ? f.customLabel : '',
                  }))
                  if (errors.distanceLabel) setErrors(e => ({ ...e, distanceLabel: null }))
                }}
              >
                {STANDARD_DISTANCES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="Custom">Custom distance…</option>
              </select>
              {form.isCustom && (
                <input
                  type="text"
                  className="input mt-2"
                  placeholder="e.g. 8K, 15K, 30K"
                  value={form.customLabel}
                  onChange={e => set('customLabel', e.target.value)}
                />
              )}
              {errors.distanceLabel && (
                <p className="text-red-500 text-xs mt-1">{errors.distanceLabel}</p>
              )}
            </div>

            {/* Time */}
            <div className="mb-4">
              <label className="label">Time</label>
              <input
                type="text"
                className="input"
                placeholder="h:mm:ss"
                value={form.timeStr}
                onChange={e => set('timeStr', e.target.value)}
              />
              {errors.timeStr && (
                <p className="text-red-500 text-xs mt-1">{errors.timeStr}</p>
              )}
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="label">
                Date <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>

            {/* Race Name */}
            <div className="mb-6">
              <label className="label">
                Race Name <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Boston Marathon"
                value={form.raceName}
                onChange={e => set('raceName', e.target.value)}
              />
            </div>

            {errors.submit && (
              <p className="text-red-500 text-xs mb-3">{errors.submit}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save PR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
