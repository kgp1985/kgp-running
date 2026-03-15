import PageWrapper from '../components/layout/PageWrapper.jsx'

const CONTACT_EMAIL = 'kgp.running@gmail.com'

const SECTIONS = [
  {
    provider: 'Strava',
    icon: '🟠',
    color: 'border-orange-200',
    badge: 'bg-orange-50 text-orange-700',
    steps: [
      {
        title: 'Connect your Strava account',
        body: 'Go to My Profile → Connected Watches and click Connect next to Strava. You\'ll be redirected to Strava to authorize KGP Running. Once approved, you\'ll be sent back automatically.',
      },
      {
        title: 'How auto-sync works',
        body: 'After connecting, every run you complete on Strava will automatically appear as a pending run on your Home and My Log pages. You can review the data, add notes, shoes, or a caption, then save it to your log — or dismiss it if you don\'t want to log it.',
      },
      {
        title: 'Elevation / Vert',
        body: 'If your Strava activity includes elevation data, it will be automatically pulled in and shown as "Vert" on the pending run card (in feet).',
      },
      {
        title: 'Disconnecting',
        body: 'To disconnect Strava, go to My Profile → Connected Watches and click Disconnect next to Strava. Future runs will no longer sync, but any runs already saved to your log will remain.',
      },
      {
        title: 'Troubleshooting',
        body: 'If runs aren\'t appearing, make sure your Strava activity type is set to "Run" (not Ride, Walk, etc.). Only running activities are synced. If the issue persists, try disconnecting and reconnecting your account.',
      },
    ],
  },
  {
    provider: 'Garmin',
    icon: '🟢',
    color: 'border-green-200',
    badge: 'bg-green-50 text-green-700',
    steps: [
      {
        title: 'Connect your Garmin account',
        body: 'Go to My Profile → Connected Watches and click Connect next to Garmin. You\'ll be redirected to Garmin Connect to authorize KGP Running. Once approved, you\'ll be sent back automatically.',
      },
      {
        title: 'How auto-sync works',
        body: 'After connecting, runs completed on your Garmin device will be pushed to KGP Running automatically via Garmin\'s Health API. They\'ll appear as pending runs on your Home and My Log pages for you to review and save.',
      },
      {
        title: 'Device compatibility',
        body: 'Any Garmin GPS watch that syncs to Garmin Connect is supported — Forerunner, Fenix, Vivoactive, and others. The sync happens when your watch uploads to Garmin Connect (typically via Bluetooth to the Garmin Connect app).',
      },
      {
        title: 'Disconnecting',
        body: 'Go to My Profile → Connected Watches and click Disconnect next to Garmin. You can also revoke access directly in Garmin Connect under Settings → Third-Party Apps.',
      },
      {
        title: 'Troubleshooting',
        body: 'Garmin API access is currently in the application process. If sync isn\'t working, it may still be pending approval. Email us for the latest status.',
      },
    ],
  },
  {
    provider: 'Coros',
    icon: '🔵',
    color: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700',
    steps: [
      {
        title: 'Connect your Coros account',
        body: 'Go to My Profile → Connected Watches and click Connect next to Coros. You\'ll be redirected to Coros to authorize KGP Running. Once approved, you\'ll be sent back automatically.',
      },
      {
        title: 'How auto-sync works',
        body: 'After connecting, runs completed on your Coros device will be pushed to KGP Running automatically. They\'ll appear as pending runs on your Home and My Log pages for you to review and save.',
      },
      {
        title: 'Device compatibility',
        body: 'Any Coros GPS watch that syncs to the Coros app is supported — PACE, APEX, VERTIX, and others. The sync happens when your watch uploads to the Coros app.',
      },
      {
        title: 'Disconnecting',
        body: 'Go to My Profile → Connected Watches and click Disconnect next to Coros. You can also revoke access in the Coros app under your account settings.',
      },
      {
        title: 'Troubleshooting',
        body: 'Coros API access is currently in the application process. If sync isn\'t working, it may still be pending approval. Email us for the latest status.',
      },
    ],
  },
  {
    provider: 'Apple Watch',
    icon: '🍎',
    color: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    steps: [
      {
        title: 'Why no direct connection?',
        body: 'Apple Watch does not offer a public web API for third-party apps to pull activity data directly. Instead, you can export a .fit file from Apple Health and upload it manually.',
      },
      {
        title: 'How to export a .fit file from Apple Health',
        body: 'Open the Apple Health app → tap your profile photo → Export All Health Data. This creates a ZIP file. Inside, navigate to the "workout-routes" folder to find .fit files for your runs.',
      },
      {
        title: 'Uploading a .fit file',
        body: 'Go to My Profile and scroll to the "Upload a .fit File" section. Drag and drop your .fit file or tap to choose it. The run will be parsed automatically and appear as a pending run to review and save.',
      },
      {
        title: 'What data is captured',
        body: 'Distance, duration, average heart rate, and elevation gain (vert) are all extracted automatically from the .fit file when available.',
      },
      {
        title: 'Troubleshooting',
        body: 'If the file fails to parse, make sure it\'s a valid .fit file exported from a GPS workout (not a non-GPS indoor workout). Files must be under 10 MB. If problems persist, email us with the error message.',
      },
    ],
  },
]

export default function Support() {
  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-10 py-4">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500 mt-1">
            Setup guides and troubleshooting for all connected services.
            Can't find your answer?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-500 hover:text-red-700 underline">
              Email us
            </a>
            .
          </p>
        </div>

        {/* Provider sections */}
        {SECTIONS.map(({ provider, icon, color, badge, steps }) => (
          <div key={provider} className={`rounded-2xl border ${color} overflow-hidden`}>
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-inherit">
              <span className="text-2xl">{icon}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{provider}</span>
            </div>

            {/* Steps */}
            <div className="divide-y divide-gray-100 bg-white">
              {steps.map((step, i) => (
                <div key={i} className="px-5 py-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact footer */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">Still need help?</p>
          <p className="text-sm text-gray-500 mb-3">
            Send us an email and we'll get back to you as soon as possible.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

      </div>
    </PageWrapper>
  )
}
