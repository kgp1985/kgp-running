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

export default function Home() {
  return (
    <>
      {/* Hero banner */}
      <div className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h1 className="font-display text-5xl sm:text-7xl tracking-wider">
            KGP <span className="text-red-500">RUNNING</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base">
            Track. Analyze. Improve.
          </p>
        </div>
      </div>

      <PageWrapper>
        <div className="space-y-6">
          {/* Watch sync pending runs prompt */}
          <PendingRunBanner />

          {/* Weekly mileage — full width, includes 8/18-week toggle */}
          <WeeklyMileage />

          {/* Race countdown — full width, only rendered for logged-in users */}
          <RaceCountdown />

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              <VdotDisplay />
              <PeriodStats />
              <RecentStats />
            </div>
            {/* Right column */}
            <div className="space-y-6">
              <ThisWeek />
              <UpcomingTraining />
              <PersonalRecords />
            </div>
          </div>

          {/* Active shoes — full width, 2-per-row grid */}
          <ActiveShoes />

          {/* Shoe graveyard — full width, only shown when shoes have been retired */}
          <ShoeGraveyard />
        </div>
      </PageWrapper>
    </>
  )
}
