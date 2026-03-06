const PILLARS = [
  {
    icon: '📈',
    title: 'Consistency Over Intensity',
    desc: 'Showing up every day beats the perfect workout once a week. The body adapts to sustained stimulus.',
  },
  {
    icon: '🐢',
    title: 'The 80/20 Rule',
    desc: '80% of training should be easy, conversational effort. This way you can attack the other 20% with hard efforts and recover effectively.',
  },
  {
    icon: '📊',
    title: 'Data-Informed Training',
    desc: 'Track pace, HR, and effort to understand trends and make smart adjustments over time.',
  },
  {
    icon: '😴',
    title: 'Recovery is Training',
    desc: 'Fitness is built during rest. Without proper recovery, your body cannot adapt to the stimulus of training. Recover to properly reap what you sow. Sleep, nutrition, and easy days are not optional extras.',
  },
  {
    icon: '📅',
    title: 'The KGP Rule of Race Recovery',
    desc: 'How many days should you take off after a marathon? Take your average weekly mileage from your training block, move the decimal point one to the left, and subtract that number from 10. Example: if you averaged 50 miles per week leading up to your race, you should take 5 days off post race (10 − 5.0 = 5 days off).',
  },
  {
    icon: '📏',
    title: 'The 10+1 Rule',
    desc: 'When building mileage, avoid increasing your total mileage by more than 10% each week AND more than 1 mile per run. For a runner doing 40 miles a week with a 15 mile long run, this means increasing mileage by no more than 4 miles, spread out as 1 mile increases across 4 runs.',
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
    </div>
  )
}
