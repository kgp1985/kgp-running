import { useState } from 'react'
import { useShoesDb } from '../../hooks/useShoesDb.js'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { useAuth } from '../../context/AuthContext.jsx'

const WARN_MILES = 400
const MAX_MILES = 500

function MileageBar({ miles }) {
  const pct = Math.min((miles / MAX_MILES) * 100, 100)
  const color = miles >= MAX_MILES
    ? 'bg-red-500'
    : miles >= WARN_MILES
    ? 'bg-yellow-400'
    : 'bg-green-500'

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{miles.toFixed(0)} mi</span>
        <span>{MAX_MILES} mi max</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {miles >= MAX_MILES && (
        <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Consider retiring these shoes</p>
      )}
      {miles >= WARN_MILES && miles < MAX_MILES && (
        <p className="text-xs text-yellow-600 mt-1 font-medium">⚠️ Getting close — {(MAX_MILES - miles).toFixed(0)} mi left</p>
      )}
    </div>
  )
}

const EMPTY_EDIT = { name: '', addedDate: '', mileageOffset: '' }

export default function ActiveShoes() {
  const { user } = useAuth()
  const { activeShoes, loading, addShoe, updateShoeById, retireShoeById, removeShoe } = useShoesDb()
  const { runs } = useRunningLogDb()

  // Add shoe form
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))

  // Edit modal
  const [editModal, setEditModal] = useState(null) // null | { shoeId, runMiles }
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editErrors, setEditErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Inline confirmations
  const [confirmRetire, setConfirmRetire] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Miles per shoe from runs
  const milesByShoe = runs.reduce((acc, r) => {
    if (r.shoeId) acc[r.shoeId] = (acc[r.shoeId] || 0) + r.distance
    return acc
  }, {})

  // ── Add shoe ────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return
    await addShoe(newName.trim(), newDate)
    setNewName('')
    setNewDate(new Date().toISOString().slice(0, 10))
    setShowForm(false)
  }

  // ── Edit shoe ───────────────────────────────────────────
  const openEdit = (shoe, runMiles) => {
    setEditForm({
      name: shoe.name,
      addedDate: shoe.addedDate,
      mileageOffset: shoe.mileageOffset > 0 ? String(shoe.mileageOffset) : '',
    })
    setEditErrors({})
    setEditModal({ shoeId: shoe.id, runMiles })
  }

  const closeEdit = () => {
    setEditModal(null)
    setEditErrors({})
  }

  const setEdit = (field, value) => {
    setEditForm(f => ({ ...f, [field]: value }))
    if (editErrors[field]) setEditErrors(e => ({ ...e, [field]: null }))
  }

  const handleEditSave = async () => {
    const errs = {}
    if (!editForm.name.trim()) errs.name = 'Required'
    if (!editForm.addedDate) errs.addedDate = 'Required'
    const offset = editForm.mileageOffset === '' ? 0 : parseFloat(editForm.mileageOffset)
    if (isNaN(offset) || offset < 0) errs.mileageOffset = 'Enter a valid number (0 or more)'
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return }

    setSaving(true)
    try {
      await updateShoeById(editModal.shoeId, {
        name: editForm.name.trim(),
        addedDate: editForm.addedDate,
        mileageOffset: offset,
      })
      closeEdit()
    } catch {
      setEditErrors({ submit: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Retire / Delete ─────────────────────────────────────
  const handleRetire = async (shoeId) => {
    await retireShoeById(shoeId)
    setConfirmRetire(null)
  }

  const handleDelete = async (shoeId) => {
    await removeShoe(shoeId)
    setConfirmDelete(null)
  }

  if (!user) return null

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">👟 Active Shoes</h2>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Shoe'}
        </button>
      </div>

      {/* Add shoe form */}
      {showForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-2">
          <input
            type="text"
            className="input"
            placeholder="Shoe name (e.g. Nike Vaporfly 3)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500 shrink-0">Start date</label>
            <input
              type="date"
              className="input flex-1"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">
            Save Shoe
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : activeShoes.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">👟</p>
          <p className="text-sm">No active shoes. Add your first pair!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeShoes.map(shoe => {
            const runMiles = milesByShoe[shoe.id] || 0
            const totalMiles = runMiles + shoe.mileageOffset
            return (
              <div key={shoe.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{shoe.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Since {shoe.addedDate}</p>
                    {shoe.mileageOffset > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {runMiles.toFixed(0)} tracked + {shoe.mileageOffset.toFixed(0)} prior
                      </p>
                    )}
                  </div>

                  {/* Action buttons / confirmations */}
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmRetire === shoe.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500">Retire?</span>
                        <button
                          onClick={() => handleRetire(shoe.id)}
                          className="text-xs bg-gray-800 text-white px-2 py-1 rounded-lg hover:bg-black"
                        >Yes</button>
                        <button
                          onClick={() => setConfirmRetire(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >No</button>
                      </div>
                    ) : confirmDelete === shoe.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          onClick={() => handleDelete(shoe.id)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                        >Yes</button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >No</button>
                      </div>
                    ) : (
                      <>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(shoe, runMiles)}
                          className="p-1.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
                          title="Edit shoe"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                        {/* Retire */}
                        <button
                          onClick={() => setConfirmRetire(shoe.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 transition-colors"
                        >
                          Retire
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDelete(shoe.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 rounded transition-colors"
                          title="Delete shoe"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <MileageBar miles={totalMiles} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Edit Shoe</h3>

            {/* Name */}
            <div className="mb-4">
              <label className="label">Shoe Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Nike Vaporfly 3"
                value={editForm.name}
                onChange={e => setEdit('name', e.target.value)}
              />
              {editErrors.name && <p className="text-red-500 text-xs mt-1">{editErrors.name}</p>}
            </div>

            {/* Start date */}
            <div className="mb-4">
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={editForm.addedDate}
                onChange={e => setEdit('addedDate', e.target.value)}
              />
              {editErrors.addedDate && <p className="text-red-500 text-xs mt-1">{editErrors.addedDate}</p>}
            </div>

            {/* Prior miles */}
            <div className="mb-6">
              <label className="label">
                Prior Miles <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input"
                placeholder="0"
                value={editForm.mileageOffset}
                onChange={e => setEdit('mileageOffset', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Miles worn before you started tracking.
                Currently {editModal.runMiles.toFixed(0)} mi logged from runs.
                {editForm.mileageOffset !== '' && parseFloat(editForm.mileageOffset) > 0
                  ? ` Total will show as ${(editModal.runMiles + parseFloat(editForm.mileageOffset)).toFixed(0)} mi.`
                  : ''}
              </p>
              {editErrors.mileageOffset && <p className="text-red-500 text-xs mt-1">{editErrors.mileageOffset}</p>}
            </div>

            {editErrors.submit && <p className="text-red-500 text-xs mb-3">{editErrors.submit}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={closeEdit} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleEditSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
