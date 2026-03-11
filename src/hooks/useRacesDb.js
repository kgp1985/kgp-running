import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchRaces, insertRace, updateRace, deleteRace } from '../api/racesApi.js'

export function useRacesDb() {
  const { user } = useAuth()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setRaces([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchRaces(user.id)
      .then(data => { if (!cancelled) { setRaces(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const addRace = useCallback(async (raceData) => {
    if (!user) return null
    const race = await insertRace(user.id, raceData)
    setRaces(prev => [...prev, race].sort((a, b) => a.date.localeCompare(b.date)))
    return race
  }, [user])

  const editRace = useCallback(async (raceId, updates) => {
    if (!user) return null
    const updated = await updateRace(raceId, updates)
    setRaces(prev =>
      prev.map(r => r.id === raceId ? updated : r).sort((a, b) => a.date.localeCompare(b.date))
    )
    return updated
  }, [user])

  const removeRace = useCallback(async (raceId) => {
    if (!user) return
    await deleteRace(raceId)
    setRaces(prev => prev.filter(r => r.id !== raceId))
  }, [user])

  const today = new Date().toISOString().slice(0, 10)
  const upcomingRaces = races.filter(r => r.date >= today)
  const pastRaces     = races.filter(r => r.date < today)

  return { races, upcomingRaces, pastRaces, loading, addRace, editRace, removeRace }
}
