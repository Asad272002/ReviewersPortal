'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0C021E] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#A3A3FF]/80 mb-2">
            Reviewers Portal
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-white/60">
            Last updated: February 19, 2026
          </p>
        </header>

        <div className="space-y-5 sm:space-y-6 text-sm sm:text-base text-white/80">
          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              1. Information We Collect
            </h2>
            <p className="mb-2">
              When you sign in to the Reviewers Portal, we may receive a decentralized identifier (DID) from your identity provider, along with limited profile information such as your display name, username, and email address if it is shared with us.
            </p>
            <p>
              Within the portal, we also collect information related to your role, project assignments, submissions, decisions, and activity necessary to operate a secure reviewer workflow.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              2. How We Use Your Information
            </h2>
            <p className="mb-2">
              We use your DID and associated profile data to authenticate you, determine your role-based access, and connect your account to the appropriate teams, partners, and projects.
            </p>
            <p>
              Activity data such as reviews, submissions, and status changes may be stored as part of an audit trail to support transparent, accountable decision making.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              3. Cookies and Sessions
            </h2>
            <p>
              The portal uses session cookies and similar technologies to keep you securely signed in, prevent unauthorized access, and protect against abuse. These cookies do not track you across unrelated websites and are used only to operate and secure the portal.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              4. Sharing of Information
            </h2>
            <p>
              We do not sell or rent your personal information. Data may be shared only with service providers and infrastructure that are required to operate the portal, process submissions, or comply with legal obligations, subject to appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              5. Data Retention
            </h2>
            <p>
              We retain account, assignment, and audit data for as long as necessary to administer the reviewer program, comply with applicable requirements, and maintain accurate records. When data is no longer needed, it may be anonymized or securely deleted.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              6. Security
            </h2>
            <p>
              We implement technical and organizational measures to protect your information, including encrypted transport, role-based access controls, and restricted administrative access. No system can be completely secure, but we continuously work to protect the portal and its data.
            </p>
          </section>

          <section>
            <h2 className="text-base sm:text-lg font-semibold text-white mb-2">
              7. Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy or how your data is handled within the Reviewers Portal, you can contact the program administrators at{' '}
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
            This policy applies to use of the SSO-enabled Reviewers Portal.
          </p>
        </div>
      </div>
    </div>
  );
}
