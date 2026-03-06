import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROUTES } from '../constants/routes.js'
import PageWrapper from '../components/layout/PageWrapper.jsx'

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithGitHub } = useAuth()
  const navigate = useNavigate()

  // Already signed in — redirect to log
  useEffect(() => {
    if (!loading && user) navigate(ROUTES.LOG, { replace: true })
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <PageWrapper>
      <div className="max-w-sm mx-auto mt-16 text-center">
        {/* Logo / wordmark */}
        <p className="font-display text-3xl text-gray-900 tracking-wider mb-1">
          KGP <span className="text-red-500">RUNNING</span>
        </p>
        <h1 className="text-lg font-semibold text-gray-700 mb-2">Sign In</h1>
        <p className="text-sm text-gray-500 mb-8">
          Sign in to log runs and track your personal records. Your data is private to you.
        </p>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* GitHub */}
          <button
            onClick={signInWithGitHub}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.57.1.78-.25.78-.55v-1.93c-3.19.69-3.86-1.54-3.86-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.27-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 012.87-.39c.97.01 1.95.13 2.87.39 2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.2.66.79.55C20.21 21.42 23.5 17.1 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Your runs are private to you. The coach's public log is visible to everyone without signing in.
        </p>
      </div>
    </PageWrapper>
  )
}
