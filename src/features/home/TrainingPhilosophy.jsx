const PILLARS = [
  {
    icon: '📈',
    title: 'Consistency Over Intensity',
    desc: 'Showing up every day beats the perfect workout once a week. The body adapts to sustained stimulus.',
  },
  {
    icon: '🐢',
    title: 'Mostly Easy Miles',
    desc: '80% of training should be easy — conversational effort. Hard days are only effective when you\'re fresh.',
  },
  {
    icon: '📊',
    title: 'Data-Informed Training',
    desc: 'Track pace, HR, and effort to understand trends and make smart adjustments over time.',
  },
  {
    icon: '😴',
    title: 'Recovery is Training',
    desc: 'Fitness is built during rest. Sleep, nutrition, and easy days are not optional extras.',
  },
]

export default function TrainingPhilosophy() {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Philosophy</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PILLARS.map(p => (
          <div key={p.title} className="flex gap-3">
            <span className="text-2xl flex-shrink-0">{p.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{p.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 italic mt-4">
        Customize in <code>src/features/home/TrainingPhilosophy.jsx</code>.
      </p>
    </div>
  )
}
