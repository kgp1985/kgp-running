import PageWrapper from '../components/layout/PageWrapper.jsx'
import Bio from '../features/home/Bio.jsx'
import PersonalRecords from '../features/home/PersonalRecords.jsx'
import TrainingPhilosophy from '../features/home/TrainingPhilosophy.jsx'
import RecentStats from '../features/home/RecentStats.jsx'
import WeeklyMileage from '../features/home/WeeklyMileage.jsx'

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
              <Bio />
            </div>
            <div className="space-y-6">
              <PersonalRecords />
              <TrainingPhilosophy />
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
