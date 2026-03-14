import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchMyProfile, updateMyProfile } from '../api/profilesApi.js'

/**
 * Hook to read and update the signed-in user's profile settings
 * (display_name, is_public).
 *
 * Returns:
 *   profile  — { id, displayName, isPublic } or null while loading
 *   loading  — boolean
 *   saveProfile(updates) — async fn; updates = { displayName?, isPublic? }
 */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchMyProfile(user.id)
      .then(data => { if (!cancelled) { setProfile(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const saveProfile = useCallback(async (updates) => {
    if (!user) return
    const updated = await updateMyProfile(user.id, updates)
    setProfile(updated)
    return updated
  }, [user])

  return { profile, loading, saveProfile }
}
