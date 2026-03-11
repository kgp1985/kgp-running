import { useShoesDb } from '../../hooks/useShoesDb.js'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { useAuth } from '../../context/AuthContext.jsx'

function Tombstone({ shoe, miles }) {
  return (
    <div className="flex flex-col items-center group">
      {/* Tombstone shape */}
      <div className="relative w-24 bg-gray-200 rounded-t-full border-2 border-gray-300 px-2 pt-4 pb-3 text-center shadow-sm group-hover:bg-gray-300 transition-colors">
        {/* RIP header */}
        <p className="text-xs font-bold text-gray-500 tracking-widest">R.I.P.</p>
        {/* Divider */}
        <div className="border-t border-gray-300 my-1" />
        {/* Shoe name */}
        <p className="text-xs font-semibold text-gray-700 leading-tight break-words">
          {shoe.name}
        </p>
        {/* Dates */}
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">
          {shoe.addedDate}
          <br />—<br />
          {shoe.retiredDate}
        </p>
        {/* Miles */}
        <p className="text-xs font-bold text-gray-600 mt-1">
          {miles.toFixed(0)} mi
        </p>
        {/* Little decorative cross */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-gray-400 text-base">✝</div>
      </div>
      {/* Base of tombstone */}
      <div className="w-28 h-2 bg-gray-300 rounded-b border-x-2 border-b-2 border-gray-300" />
      {/* Ground strip */}
      <div className="w-32 h-1.5 bg-gray-400 rounded-full mt-0.5 opacity-40" />
    </div>
  )
}

export default function ShoeGraveyard() {
  const { user } = useAuth()
  const { retiredShoes, loading } = useShoesDb()
  const { runs } = useRunningLogDb()

  const runMilesByShoe = runs.reduce((acc, r) => {
    if (r.shoeId) acc[r.shoeId] = (acc[r.shoeId] || 0) + r.distance
    return acc
  }, {})

  if (!user || (!loading && retiredShoes.length === 0)) return null

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">⚰️ Shoe Graveyard</h2>
      <p className="text-xs text-gray-400 mb-4">Retired shoes, honored for their service.</p>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-4 justify-start">
          {retiredShoes.map(shoe => (
            <Tombstone
              key={shoe.id}
              shoe={shoe}
              miles={(runMilesByShoe[shoe.id] || 0) + (shoe.mileageOffset || 0)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
