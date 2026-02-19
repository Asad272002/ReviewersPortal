'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0C021E] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#A3A3FF]/80 mb-2">
            Reviewers Portal
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-2">
            Terms of Use
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            Last updated: February 19, 2026
          </p>
        </header>

        <div className="space-y-5 sm:space-y-6 text-sm sm:text-base text-white/80">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              1. Purpose of the Portal
            </h2>
            <p>
              The Reviewers Portal is provided to support secure evaluation, coordination, and communication between reviewers, teams, and partners. By accessing the portal, you agree to use it only in connection with authorized program activities.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              2. Account Access and SSO
            </h2>
            <p className="mb-2">
              Access to the portal is granted through single sign-on and linked to your decentralized identifier (DID) or other approved identity. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.
            </p>
            <p>
              If you suspect unauthorized access, you must notify the program administrators as soon as possible.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              3. Acceptable Use
            </h2>
            <p>
              You agree not to misuse the portal, including by attempting to bypass security controls, accessing data you are not authorized to view, interfering with system operation, or using the portal for any unlawful, abusive, or fraudulent purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              4. Role-Based Permissions
            </h2>
            <p>
              Features and data available to you depend on your assigned role, such as reviewer, team, partner, or administrator. You must respect these boundaries and use information obtained through the portal only for legitimate program-related purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              5. No Warranties
            </h2>
            <p>
              The portal is provided on an “as is” and “as available” basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including any warranties of availability, accuracy, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              6. Limitation of Liability
            </h2>
            <p>
              To the extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the portal. Direct damages, if any, may be limited to the extent allowed under applicable rules and agreements.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              7. Changes to These Terms
            </h2>
            <p>
              We may update these Terms of Use from time to time to reflect changes in the portal, applicable law, or program requirements. Material changes will be communicated through the portal or other appropriate channels.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              8. Contact
            </h2>
            <p>
              For questions about these terms or your obligations when using the Reviewers Portal, you can contact the program administrators at{' '}
              <a href="mailto:asadnadeem6799@gmail.com" className="text-[#A3A3FF] underline decoration-[#A3A3FF]/60 hover:decoration-[#A3A3FF]">
                asadnadeem6799@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white text-sm sm:text-base font-semibold hover:from-[#A96AFF] hover:to-[#9050E9] transition-all shadow-lg shadow-[#9050E9]/40"
          >
            Back to Login
          </Link>
          <p className="text-xs sm:text-sm text-white/50 text-center sm:text-right">
            By using the portal you agree to these terms.
          </p>
        </div>
      </div>
    </div>
  );
}
