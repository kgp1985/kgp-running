import { useState } from 'react'
import { useShoesDb } from '../../hooks/useShoesDb.js'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { useAuth } from '../../context/AuthContext.jsx'

function Tombstone({ shoe, miles, onEdit }) {
  return (
    <div className="flex flex-col items-center group relative">
      {onEdit && (
        <button
          onClick={() => onEdit(shoe)}
          className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-white border border-gray-300 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
          title="Edit mileage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
          </svg>
        </button>
      )}
      <div className="relative w-24 bg-gray-200 rounded-t-full border-2 border-gray-300 px-2 pt-4 pb-3 text-center shadow-sm group-hover:bg-gray-300 transition-colors">
        <p className="text-xs font-bold text-gray-500 tracking-widest">R.I.P.</p>
        <div className="border-t border-gray-300 my-1" />
        <p className="text-xs font-semibold text-gray-700 leading-tight break-words">{shoe.name}</p>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">
          {shoe.addedDate}<br />—<br />{shoe.retiredDate}
        </p>
        <p className="text-xs font-bold text-gray-600 mt-1">{miles.toFixed(0)} mi</p>
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-gray-400 text-base">✝</div>
      </div>
      <div className="w-28 h-2 bg-gray-300 rounded-b border-x-2 border-b-2 border-gray-300" />
      <div className="w-32 h-1.5 bg-gray-400 rounded-full mt-0.5 opacity-40" />
    </div>
  )
}

export default function ShoeGraveyard() {
  const { user } = useAuth()
  const { retiredShoes, loading, updateShoeById } = useShoesDb()
  const { runs } = useRunningLogDb()

  const [editModal, setEditModal] = useState(null)
  const [offsetInput, setOffsetInput] = useState('')
  const [offsetError, setOffsetError] = useState('')
  const [saving, setSaving] = useState(false)

  const runMilesByShoe = runs.reduce((acc, r) => {
    if (r.shoeId) acc[r.shoeId] = (acc[r.shoeId] || 0) + r.distance
    return acc
  }, {})

  const openEdit = (shoe) => {
    setOffsetInput(shoe.mileageOffset > 0 ? String(shoe.mileageOffset) : '')
    setOffsetError('')
    setEditModal({ shoe, runMiles: runMilesByShoe[shoe.id] || 0 })
  }

  const closeEdit = () => { setEditModal(null); setOffsetError('') }

  const handleSave = async () => {
    const offset = offsetInput === '' ? 0 : parseFloat(offsetInput)
    if (isNaN(offset) || offset < 0) { setOffsetError('Enter a valid number (0 or more)'); return }
    setSaving(true)
    try {
      await updateShoeById(editModal.shoe.id, { mileageOffset: offset })
      closeEdit()
    } catch {
      setOffsetError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!user || (!loading && retiredShoes.length === 0)) return null

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">⚰️ Shoe Graveyard</h2>
      <p className="text-xs text-gray-400 mb-4">Retired shoes, honored for their service. Hover a tombstone to edit its mileage.</p>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-6 justify-start">
          {retiredShoes.map(shoe => (
            <Tombstone
              key={shoe.id}
              shoe={shoe}
              miles={(runMilesByShoe[shoe.id] || 0) + (shoe.mileageOffset || 0)}
              onEdit={user ? openEdit : null}
            />
          ))}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit Mileage</h3>
            <p className="text-sm text-gray-500 mb-5">{editModal.shoe.name}</p>
            <div className="mb-2">
              <label className="label">Prior Miles <span className="normal-case font-normal text-gray-400">(optional)</span></label>
              <input
                type="number" min="0" step="0.1" className="input" placeholder="0"
                value={offsetInput}
                onChange={e => { setOffsetInput(e.target.value); setOffsetError('') }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Miles worn before tracking started.
                {editModal.runMiles > 0 && ` ${editModal.runMiles.toFixed(0)} mi logged from runs.`}
                {offsetInput !== '' && parseFloat(offsetInput) > 0
                  ? ` Total: ${(editModal.runMiles + parseFloat(offsetInput)).toFixed(0)} mi.`
                  : ''}
              </p>
              {offsetError && <p className="text-red-500 text-xs mt-1">{offsetError}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={closeEdit} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
