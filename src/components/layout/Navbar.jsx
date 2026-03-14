import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../constants/routes.js'
import { useAuth } from '../../context/AuthContext.jsx'

const NAV_LINKS = [
  { to: ROUTES.HOME,       label: 'Home' },
  { to: ROUTES.LOG,        label: 'My Log' },
  { to: ROUTES.PLAN,       label: 'Training Plan' },
  { to: ROUTES.COACH_LOG,  label: 'Community' },
  { to: ROUTES.CALCULATOR, label: 'Race Calculator' },
  { to: ROUTES.WORKOUTS,   label: 'Workout Types' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut } = useAuth()

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
              {label}
            </NavLink>
          ))}
          {/* Auth */}
          {user ? (
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-white text-sm transition-colors duration-150 border border-zinc-700 rounded-lg px-3 py-1 hover:border-zinc-500"
            >
              Sign Out
            </button>
          ) : (
            <NavLink to={ROUTES.LOGIN} className={linkClass}>
              Sign In
            </NavLink>
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
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.HOME}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          {/* Auth in mobile */}
          {user ? (
            <button
              onClick={() => { signOut(); setMobileOpen(false) }}
              className="block w-full text-left px-4 py-2.5 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors duration-150 text-sm"
            >
              Sign Out
            </button>
          ) : (
            <NavLink
              to={ROUTES.LOGIN}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
