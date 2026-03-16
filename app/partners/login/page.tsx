'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, FileText, FolderOpen, LifeBuoy, LockKeyhole, Megaphone, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PartnerLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const partnerFeatures = [
    {
      title: 'Routed Milestone Reports',
      description: 'Access reviewer-submitted milestone reports for your assigned organizations/projects.',
      Icon: FileText
    },
    {
      title: 'Final Verdict Workflow',
      description: 'Approve or reject milestone reports with clear outcomes and optional comments.',
      Icon: CheckCircle2
    },
    {
      title: 'Organization-Scoped Access',
      description: 'See only the projects and reports relevant to your partner organization.',
      Icon: ShieldCheck
    },
    {
      title: 'Announcements & Updates',
      description: 'Stay aligned on operational changes, timelines, and process updates.',
      Icon: Megaphone
    },
    {
      title: 'Resources & Process Docs',
      description: 'Quick access to templates, guidance, and shared reference material.',
      Icon: FolderOpen
    },
    {
      title: 'Support',
      description: 'Get help for access issues or workflow questions through portal support.',
      Icon: LifeBuoy
    }
  ] as const;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    if (user?.role === 'partner') {
      router.replace('/partner-dashboard');
      return;
    }

    router.replace('/dashboard');
  }, [authLoading, isAuthenticated, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await login(username, password, true);
      if (success) {
        router.push('/partner-dashboard');
        return;
      }
      setError('Invalid partner credentials');
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_60%)]" />
      <div className="absolute inset-0 login-grid-mask" />
      <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <header className="sticky top-4 z-30">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 sm:px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <Image src="/reviewerlogo.png" alt="Reviewers Portal" width={32} height={32} />
              </div>
              <div className="leading-tight">
                <div className="font-montserrat font-semibold text-white text-lg">External Partner Access</div>
                <div className="text-xs text-white/60 tracking-wide">Dedicated partner portal login</div>
              </div>
            </div>

            <nav className="hidden sm:flex items-center gap-6 text-sm text-white/70">
              <Link href="/login" className="hover:text-white transition-colors">
                Review Circle Login
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </nav>
          </div>
        </header>

        <main className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-light" />
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">Partner Login</div>
                  <div className="text-sm text-white/60">
                    Sign in to review routed milestone reports and submit final verdicts.
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block">
                  <div className="text-sm text-white/70 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-white/60" />
                    Username
                  </div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0C021E]/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Enter your partner username"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block">
                  <div className="text-sm text-white/70 mb-2 flex items-center gap-2">
                    <LockKeyhole className="w-4 h-4 text-white/60" />
                    Password
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full px-4 py-3 rounded-xl bg-[#0C021E]/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold border border-white/10 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>

                <div className="text-xs text-white/50">
                  Need access? Contact the program admin for partner credentials.
                </div>
              </form>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="text-white font-semibold">Quick links</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Link href="/" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10 transition-colors">
                  Landing page
                </Link>
                <Link href="/support" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/75 hover:bg-white/10 transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/75">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Partner-only access
              </div>

              <h1 className="mt-6 font-montserrat font-bold text-3xl sm:text-4xl text-white tracking-tight">
                External Partners Portal
              </h1>
              <p className="mt-3 text-white/60 leading-relaxed max-w-2xl">
                A focused workspace for partners to receive routed milestone reports and provide the final verdict for teams.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {partnerFeatures.map(({ title, description, Icon }) => (
                  <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white/70" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-semibold">{title}</div>
                        <div className="mt-1 text-sm text-white/60 leading-relaxed">{description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/60">
                Review Circle members (including internal partners) should use the standard login page:
                <Link href="/login" className="ml-2 text-white underline underline-offset-4 hover:opacity-90">
                  /login
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-14 pt-8 border-t border-white/10 text-sm text-white/50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Reviewers Portal</div>
          <div className="flex items-center gap-4">
            <span className="text-white/40">External Partner Portal</span>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .login-grid-mask {
          background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(circle at 50% 35%, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.15) 62%, transparent 78%);
          opacity: 0.18;
        }
      `}</style>
    </div>
  );
}
