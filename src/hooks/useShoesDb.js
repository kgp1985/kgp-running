import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchShoes, insertShoe, updateShoe, retireShoe, deleteShoe } from '../api/shoesApi.js'

export function useShoesDb() {
  const { user } = useAuth()
  const [shoes, setShoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setShoes([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchShoes(user.id)
      .then(data => { if (!cancelled) { setShoes(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const addShoe = useCallback(async (name, addedDate) => {
    if (!user) return null
    const shoe = await insertShoe(user.id, name, addedDate)
    setShoes(prev => [shoe, ...prev])
    return shoe
  }, [user])

  const updateShoeById = useCallback(async (shoeId, fields) => {
    if (!user) return
    const updated = await updateShoe(shoeId, fields)
    setShoes(prev => prev.map(s => s.id === shoeId ? updated : s))
    return updated
  }, [user])

  const retireShoeById = useCallback(async (shoeId) => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    const updated = await retireShoe(shoeId, today)
    setShoes(prev => prev.map(s => s.id === shoeId ? updated : s))
  }, [user])

  const removeShoe = useCallback(async (shoeId) => {
    if (!user) return
    await deleteShoe(shoeId)
    setShoes(prev => prev.filter(s => s.id !== shoeId))
  }, [user])

  const activeShoes = shoes.filter(s => !s.retired)
  const retiredShoes = shoes.filter(s => s.retired)

  return { shoes, activeShoes, retiredShoes, loading, addShoe, updateShoeById, retireShoeById, removeShoe }
}
