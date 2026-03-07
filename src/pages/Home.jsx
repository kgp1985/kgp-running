import PageWrapper from '../components/layout/PageWrapper.jsx'
import PersonalRecords from '../features/home/PersonalRecords.jsx'
import RecentStats from '../features/home/RecentStats.jsx'
import WeeklyMileage from '../features/home/WeeklyMileage.jsx'
import ActiveShoes from '../features/home/ActiveShoes.jsx'
import ShoeGraveyard from '../features/home/ShoeGraveyard.jsx'
import UpcomingTraining from '../features/home/UpcomingTraining.jsx'

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
          {/* Weekly mileage — full width */}
          <WeeklyMileage />

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <RecentStats />
              <ActiveShoes />
            </div>
            <div className="space-y-6">
              <UpcomingTraining />
              <PersonalRecords />
            </div>
          </div>

          {/* Shoe graveyard — full width, only shown when shoes have been retired */}
          <ShoeGraveyard />
        </div>
      </PageWrapper>
    </>
  )
}
