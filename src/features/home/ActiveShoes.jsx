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

export default function ActiveShoes() {
  const { user } = useAuth()
  const { activeShoes, loading, addShoe, retireShoeById } = useShoesDb()
  const { runs } = useRunningLogDb()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [confirmRetire, setConfirmRetire] = useState(null)

  // Calculate miles per shoe from runs
  const milesByShoe = runs.reduce((acc, r) => {
    if (r.shoeId) acc[r.shoeId] = (acc[r.shoeId] || 0) + r.distance
    return acc
  }, {})

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addShoe(newName.trim(), newDate)
    setNewName('')
    setNewDate(new Date().toISOString().slice(0, 10))
    setShowForm(false)
  }

  const handleRetire = async (shoeId) => {
    await retireShoeById(shoeId)
    setConfirmRetire(null)
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
            const miles = milesByShoe[shoe.id] || 0
            return (
              <div key={shoe.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{shoe.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Since {shoe.addedDate}</p>
                  </div>
                  {confirmRetire === shoe.id ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">Retire?</span>
                      <button
                        onClick={() => handleRetire(shoe.id)}
                        className="text-xs bg-gray-800 text-white px-2 py-1 rounded-lg hover:bg-black"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmRetire(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRetire(shoe.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Retire
                    </button>
                  )}
                </div>
                <MileageBar miles={miles} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
