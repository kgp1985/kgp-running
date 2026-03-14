import PageWrapper from '../components/layout/PageWrapper.jsx'

const LAST_UPDATED = 'March 2026'
const CONTACT_EMAIL = 'kgp.running@gmail.com'

export default function Privacy() {
  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-sm text-gray-700 space-y-8">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Overview</h2>
            <p>
              KGP Running ("we", "us", "our") is a personal running training platform. This Privacy
              Policy explains how we collect, use, and protect your personal information, including
              activity data synced from third-party devices and services such as Garmin and Coros.
            </p>
            <p className="mt-2">
              <strong>We do not sell your data. Ever.</strong> Your activity data is used solely to
              power your own training analytics and the features of this platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Data We Collect</h2>
            <p>We collect the following categories of data:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li><strong>Account information</strong> — your email address, provided via Google sign-in (OAuth).</li>
              <li><strong>Activity data</strong> — when you connect a Garmin or Coros device, we receive activity summaries including distance, duration, and average heart rate for each workout.</li>
              <li><strong>User-entered data</strong> — run logs, shoe tracking, personal records, training plans, and notes that you manually enter on the platform.</li>
              <li><strong>Profile information</strong> — your display name and optional profile picture, if you choose to provide them.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">How We Use Your Data</h2>
            <p>Your data is used exclusively for the following purposes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Displaying your personal training history, statistics, and analytics within the platform.</li>
              <li>Calculating training metrics such as VDOT, weekly mileage, pace trends, and personal records.</li>
              <li>Powering optional community features, if you choose to make your profile and runs public.</li>
              <li>Improving the platform's features and internal models based on aggregated, anonymized usage patterns.</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> use your activity data for advertising, we do <strong>not</strong> sell
              or license it to any third party, and we do <strong>not</strong> share it with any external
              service except as strictly necessary to operate the platform (e.g., storing data in our
              database provider, Supabase).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Third-Party Integrations</h2>
            <p>
              When you connect your Garmin or Coros account, you authorize those platforms to share
              your activity summaries with KGP Running. We store your OAuth access tokens securely
              and use them only to receive activity data on your behalf. You can disconnect your
              device at any time from your Profile page, which removes your stored tokens and stops
              any further data sync.
            </p>
            <p className="mt-2">
              KGP Running is subject to Garmin's and Coros's own terms of service and privacy
              policies with respect to data originating from their platforms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Data Storage &amp; Security</h2>
            <p>
              Your data is stored in a secure database provided by Supabase, with row-level security
              policies that ensure only you can access your own data. Data is stored in the United
              States. We use industry-standard practices to protect your information from unauthorized
              access, disclosure, or loss.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Access all data we hold about you.</li>
              <li>Request deletion of your account and all associated data.</li>
              <li>Disconnect any third-party device integration at any time from your Profile page.</li>
              <li>Make your profile and runs private at any time from your Profile page.</li>
            </ul>
            <p className="mt-3">
              To request account deletion or a data export, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-500 hover:text-red-700 underline">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. When we do, we'll update the "Last updated"
              date at the top of this page. Continued use of the platform after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-500 hover:text-red-700 underline">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

        </div>
      </div>
    </PageWrapper>
  )
}
