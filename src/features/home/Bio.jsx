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
            {/* Customize this section with your background */}
            I'm a passionate distance runner focused on continuous improvement. This site is where I log
            every mile, study the science behind training, and chase my goals.
          </p>
          <p className="text-xs text-gray-400 italic">
            Update this section in <code>src/features/home/Bio.jsx</code> with your personal background.
          </p>
        </div>
      </div>
    </div>
  )
}
