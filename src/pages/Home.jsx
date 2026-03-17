import { useEffect, useRef, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import PersonalRecords from '../features/home/PersonalRecords.jsx'
import RecentStats from '../features/home/RecentStats.jsx'
import WeeklyMileage from '../features/home/WeeklyMileage.jsx'
import ActiveShoes from '../features/home/ActiveShoes.jsx'
import ShoeGraveyard from '../features/home/ShoeGraveyard.jsx'
import UpcomingTraining from '../features/home/UpcomingTraining.jsx'
import PeriodStats from '../features/home/PeriodStats.jsx'
import ThisWeek from '../features/home/ThisWeek.jsx'
import RaceCountdown from '../features/home/RaceCountdown.jsx'
import VdotDisplay from '../features/home/VdotDisplay.jsx'
import PendingRunBanner from '../features/watch/PendingRunBanner.jsx'

// ── Scroll reveal wrapper ─────────────────────────────────────────────────────
function ScrollReveal({ children, delay = 0, className = '' }) {
  const ref            = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// ── Scroll indicator arrow ────────────────────────────────────────────────────
function ScrollArrow() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
      <span className="text-xs text-white/40 tracking-widest uppercase">scroll</span>
      <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-500 mb-3">
      {children}
    </p>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-zinc-100 my-2" />
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="bg-white">

      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1920&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />

        {/* Gradient overlay — darker at top/bottom, lighter in middle */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70" />

        {/* Center content */}
        <div className="relative z-10 text-center px-4">
          <h1 className="font-display text-7xl sm:text-9xl tracking-widest text-white leading-none">
            KGP
          </h1>
          <h2 className="font-display text-4xl sm:text-6xl tracking-[0.3em] text-red-500 mt-1">
            RUNNING
          </h2>
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-white/30" />
            <p className="text-xs tracking-[0.25em] uppercase text-white/50">
              Track · Analyze · Improve
            </p>
            <div className="h-px w-12 bg-white/30" />
          </div>
        </div>

        <ScrollArrow />
      </section>

      {/* ── Content ── */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">

          {/* Watch sync */}
          <ScrollReveal>
            <PendingRunBanner />
          </ScrollReveal>

          {/* Weekly mileage */}
          <ScrollReveal>
            <SectionLabel>Training Volume</SectionLabel>
            <WeeklyMileage />
          </ScrollReveal>

          <Divider />

          {/* Race countdown */}
          <ScrollReveal>
            <SectionLabel>Race Day</SectionLabel>
            <RaceCountdown />
          </ScrollReveal>

          <Divider />

          {/* Stats grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left */}
            <div className="space-y-10">
              <ScrollReveal delay={0}>
                <SectionLabel>Fitness</SectionLabel>
                <VdotDisplay />
              </ScrollReveal>
              <ScrollReveal delay={80}>
                <SectionLabel>Period Stats</SectionLabel>
                <PeriodStats />
              </ScrollReveal>
              <ScrollReveal delay={160}>
                <SectionLabel>Recent Activity</SectionLabel>
                <RecentStats />
              </ScrollReveal>
            </div>

            {/* Right */}
            <div className="space-y-10">
              <ScrollReveal delay={40}>
                <SectionLabel>This Week</SectionLabel>
                <ThisWeek />
              </ScrollReveal>
              <ScrollReveal delay={120}>
                <SectionLabel>Upcoming</SectionLabel>
                <UpcomingTraining />
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <SectionLabel>Personal Records</SectionLabel>
                <PersonalRecords />
              </ScrollReveal>
            </div>
          </div>

          <Divider />

          {/* Shoes */}
          <ScrollReveal>
            <SectionLabel>Gear</SectionLabel>
            <ActiveShoes />
          </ScrollReveal>

          <ScrollReveal>
            <ShoeGraveyard />
          </ScrollReveal>

        </div>
      </div>

    </div>
  )
}
