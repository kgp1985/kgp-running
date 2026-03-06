import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = loading, null = logged out, object = logged in
  const [session, setSession] = useState(undefined)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Get current session on mount (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
      setUser(session?.user ?? null)
    })

    // Listen for auth state changes (login, logout, token refresh, OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session ?? null)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signInWithGitHub = () =>
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user,
    loading: session === undefined,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
