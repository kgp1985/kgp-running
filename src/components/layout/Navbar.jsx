import { useState, useRef, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useProfile } from '../../hooks/useProfile.js'
import { getPendingRequests } from '../../api/friendsApi.js'

const NAV_LINKS = [
  { to: ROUTES.HOME,       label: 'Home' },
  { to: ROUTES.LOG,        label: 'My Log' },
  { to: ROUTES.PLAN,       label: 'Training Plan' },
  { to: ROUTES.COACH_LOG,  label: 'Community' },
  { to: ROUTES.CALCULATOR, label: 'Race Calculator' },
  { to: ROUTES.WORKOUTS,   label: 'Workout Types' },
]

function ProfileDropdown({ user, profile, signOut }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials  = (profile?.displayName || user?.email || 'U')[0].toUpperCase()
  const avatarUrl = profile?.avatarUrl ?? null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-zinc-700 rounded-lg px-2.5 py-1.5 hover:border-zinc-500 transition-colors"
        aria-label="Profile menu"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
        )}
        <span className="text-sm text-gray-300 hidden sm:block">Profile</span>
        <svg className={`w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 z-50">
          <div className="px-4 py-2 border-b border-zinc-800">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.displayName || 'Runner'}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <Link
            to={ROUTES.PROFILE}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            My Profile
          </Link>
          <button
            onClick={() => { signOut(); setOpen(false) }}
            className="block w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Sign Out
          </button>
          <div className="border-t border-zinc-800 mt-1 pt-1">
            <Link
              to={ROUTES.SUPPORT}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-zinc-800 transition-colors"
            >
              Support
            </Link>
            <Link
              to={ROUTES.PRIVACY}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-zinc-800 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen]         = useState(false)
  const [pendingCount, setPendingCount]     = useState(0)
  const { user, signOut }                   = useAuth()
  const { profile }                         = useProfile()

  // Poll for pending friend requests every 60s
  useEffect(() => {
    if (!user) { setPendingCount(0); return }
    const check = () => getPendingRequests(user.id).then(r => setPendingCount(r.length)).catch(() => {})
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [user])

  const linkClass = ({ isActive }) =>
    isActive
      ? 'text-red-400 font-semibold border-b-2 border-red-400 pb-0.5'
      : 'text-gray-300 hover:text-white transition-colors duration-150'

  const mobileLinkClass = ({ isActive }) =>
    isActive
      ? 'block px-4 py-2.5 text-red-400 font-semibold bg-zinc-800 rounded-lg'
      : 'block px-4 py-2.5 text-gray-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors duration-150'

  return (
    <nav className="bg-black border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Wordmark */}
        <NavLink to={ROUTES.HOME} className="font-display text-2xl text-white tracking-wider hover:text-red-400 transition-colors duration-150">
          KGP <span className="text-red-500">RUNNING</span>
        </NavLink>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6 text-sm">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === ROUTES.HOME} className={linkClass}>
              {label === 'Community' && pendingCount > 0 ? (
                <span className="relative inline-flex items-center gap-1">
                  Community
                  <span className="absolute -top-1 -right-2.5 w-2 h-2 bg-red-500 rounded-full" />
                </span>
              ) : label}
            </NavLink>
          ))}
          {/* Auth */}
          {user ? (
            <ProfileDropdown user={user} profile={profile} signOut={signOut} />
          ) : (
            <NavLink to={ROUTES.LOGIN} className={linkClass}>Sign In</NavLink>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-gray-300 hover:text-white p-1"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-black border-t border-zinc-800 px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === ROUTES.HOME}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              {label === 'Community' && pendingCount > 0 ? (
                <span className="relative inline-flex items-center gap-1">
                  Community
                  <span className="absolute -top-1 -right-2.5 w-2 h-2 bg-red-500 rounded-full" />
                </span>
              ) : label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink to={ROUTES.PROFILE} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                My Profile
              </NavLink>
              <button
                onClick={() => { signOut(); setMobileOpen(false) }}
                className="block w-full text-left px-4 py-2.5 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors duration-150 text-sm"
              >
                Sign Out
              </button>
              <NavLink to={ROUTES.SUPPORT} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                Support
              </NavLink>
              <NavLink to={ROUTES.PRIVACY} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                Privacy Policy
              </NavLink>
            </>
          ) : (
            <NavLink to={ROUTES.LOGIN} className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
              Sign In
            </NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
