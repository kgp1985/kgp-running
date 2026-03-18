import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPlans, insertPlan, deletePlan } from '../api/plansApi.js'

export function usePlansDb() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setPlans([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPlans(user.id)
      .then(data => { if (!cancelled) { setPlans(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const addPlan = useCallback(async (planData) => {
    if (!user) return null
    const plan = await insertPlan(user.id, planData)
    setPlans(prev => [plan, ...prev])
    return plan
  }, [user])

  const removePlan = useCallback(async (id) => {
    if (!user) return
    await deletePlan(id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }, [user])

  return { plans, loading, addPlan, removePlan }
}
