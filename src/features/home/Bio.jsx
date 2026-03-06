export default function Bio() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">About Me</h2>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Avatar placeholder */}
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-3xl flex-shrink-0 border-2 border-red-200">
          🏃
        </div>
        <div className="text-gray-600 text-sm leading-relaxed space-y-2">
          <p>
            Welcome to <span className="font-semibold text-gray-900">KGP Running</span> — my personal running hub
            where I track training, analyze performance, and keep pushing for new PRs.
          </p>
          <p>
            I'm a passionate distance runner focused on continuous improvement. I have run 5 marathons with a personal best of 2:57:40, 3 half marathons with a personal best of 1:20:42, and 2 10Ks with a personal best of 37:47. I hope to share what I have learned along the way and help others in their running journey.
          </p>
          <p>
            The goal of this site is to build something that allows everyone to track their runs, their progress, and learn more about training smart without the pressure of social media. I intend to continually add features to ultimately have a one stop shop for your training with logs, workouts, plans, and everything in between communicating with each other to set you up for success in your next race.
          </p>
        </div>
      </div>
    </div>
  )
}
