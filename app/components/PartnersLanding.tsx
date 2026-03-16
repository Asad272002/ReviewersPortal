'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import * as THREE from 'three';
import { BarChart3, CheckCircle2, LifeBuoy, MessagesSquare, ShieldCheck, Sparkles, Vote } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMotion } from '../context/MotionContext';

type Stat = {
  label: string;
  value: string;
};

type FeatureCard = {
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
  tone: 'blue' | 'purple' | 'emerald' | 'amber';
};

const isWebGLAvailable = () => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
};

const useInView = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      options ?? { root: null, threshold: 0.25, rootMargin: '0px 0px -25% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
};

function Reveal({
  children,
  className,
  delayMs,
  variant
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: 'fade' | 'fly';
}) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      data-inview={inView ? 'true' : 'false'}
      style={{ ['--d' as unknown as string]: `${delayMs ?? 0}ms` }}
      className={`reveal reveal--${variant ?? 'fade'} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export default function PartnersLanding() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { motionEnabled, toggleMotion } = useMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const scrollYRef = useRef(0);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const statsSectionRef = useRef<HTMLDivElement | null>(null);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      scrollYRef.current = window.scrollY || 0;
      const hero = heroRef.current;
      if (!hero) return;
      const t = Math.min(1, (window.scrollY || 0) / Math.max(1, window.innerHeight * 0.9));
      hero.style.transform = `translate3d(0, ${t * 18}px, 0)`;
      hero.style.opacity = `${1 - t * 0.5}`;
    };

    update();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    if (user?.role === 'partner') {
      router.replace('/partner-dashboard');
      return;
    }
    router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router, user]);

  const stats: Stat[] = useMemo(
    () => [
      { value: '4', label: 'User Roles' },
      { value: '12+', label: 'Core Modules' },
      { value: '360°', label: 'Review Coverage' },
      { value: '∞', label: 'Transparency' }
    ],
    []
  );

  const modules: FeatureCard[] = useMemo(
    () => [
      {
        title: 'Milestone Reviews',
        description: 'Structured review workflows with validation, PDF reports, and partner verdict routing.',
        Icon: CheckCircle2,
        tone: 'emerald'
      },
      {
        title: 'Governance Voting',
        description: 'Configurable voting for proposals with quorum logic, limits, and audit-friendly outcomes.',
        Icon: Vote,
        tone: 'purple'
      },
      {
        title: 'Anonymized Chat',
        description: 'Coordinator-overseen communication between reviewers and awarded teams preserving identity.',
        Icon: MessagesSquare,
        tone: 'blue'
      },
      {
        title: 'Reviewer Tests',
        description: 'Qualification quizzes and timed assessments to validate readiness for milestone reviews.',
        Icon: ShieldCheck,
        tone: 'amber'
      },
      {
        title: 'Analytics & Insights',
        description: 'Role-based performance metrics, verdict breakdowns, and portfolio-level visibility.',
        Icon: BarChart3,
        tone: 'blue'
      },
      {
        title: 'Support & Operations',
        description: 'Submit tickets, track resolution, and stay aligned via announcements and documentation.',
        Icon: LifeBuoy,
        tone: 'purple'
      }
    ],
    []
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    const ok = isWebGLAvailable();
    setWebglOk(ok);
    if (!ok) return;
    if (!motionEnabled) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(3, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7c3aed, 0.55);
    rim.position.set(-3, -1, 3);
    scene.add(rim);

    const grid = new THREE.GridHelper(24, 24, 0x1f3b73, 0x13264a);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    grid.position.y = -2.7;
    scene.add(grid);

    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const colorA = new THREE.Color('#60a5fa');
    const colorB = new THREE.Color('#a78bfa');
    const colorC = new THREE.Color('#22d3ee');
    const colorD = new THREE.Color('#5cf2b3');

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const r = 28 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = (Math.random() - 0.5) * 10;
      starPositions[i3 + 2] = r * Math.cos(phi);

      const pick = Math.random();
      const c = pick < 0.35 ? colorA : pick < 0.65 ? colorB : pick < 0.85 ? colorC : colorD;
      starColors[i3 + 0] = c.r;
      starColors[i3 + 1] = c.g;
      starColors[i3 + 2] = c.b;
    }

    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.03,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      depthWrite: false
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const makeWireSphere = (radius: number, color: number) => {
      const geo = new THREE.IcosahedronGeometry(radius, 1);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.28 });
      return new THREE.Mesh(geo, mat);
    };

    const spheres = [
      (() => {
        const s = makeWireSphere(1.1, 0x60a5fa);
        s.position.set(-2.4, 0.6, -0.8);
        return s;
      })(),
      (() => {
        const s = makeWireSphere(0.8, 0x22d3ee);
        s.position.set(1.9, 1.4, -1.6);
        return s;
      })(),
      (() => {
        const s = makeWireSphere(0.9, 0xa78bfa);
        s.position.set(2.6, -0.9, -0.2);
        return s;
      })()
    ];
    spheres.forEach((s) => scene.add(s));
    const sphereBases = spheres.map((s) => s.position.clone());

    const ringGeo = new THREE.BufferGeometry();
    const ringPoints: THREE.Vector3[] = [];
    const ringCurve = new THREE.EllipseCurve(0, 0, 4.8, 4.1, 0, Math.PI * 2, false, 0);
    const ring2Curve = new THREE.EllipseCurve(0, 0, 6.2, 5.3, 0, Math.PI * 2, false, Math.PI / 7);
    const ring3Curve = new THREE.EllipseCurve(0, 0, 7.1, 6.1, 0, Math.PI * 2, false, Math.PI / 3);

    for (const curve of [ringCurve, ring2Curve, ring3Curve]) {
      const pts = curve.getPoints(220);
      for (const p of pts) ringPoints.push(new THREE.Vector3(p.x, p.y, -2.5));
    }

    ringGeo.setFromPoints(ringPoints);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.14 });
    const rings = new THREE.LineSegments(ringGeo, ringMat);
    rings.rotation.x = 0.35;
    rings.rotation.y = -0.15;
    scene.add(rings);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const scroll = scrollYRef.current;
      const s = Math.min(1.5, Math.max(0, scroll / Math.max(1, window.innerHeight)));

      stars.rotation.y = t * 0.03 + s * 0.06;
      stars.rotation.x = Math.sin(t * 0.08) * 0.03 + s * 0.02;
      rings.rotation.z = t * 0.02 + s * 0.28;
      rings.rotation.y = -0.15 + s * 0.06;

      camera.position.y = -s * 0.22;
      camera.position.z = 8 + s * 0.55;
      camera.lookAt(0, -s * 0.15, 0);

      spheres[0].position.y = sphereBases[0].y - s * 0.18 + Math.sin(t * 0.7) * 0.05;
      spheres[1].position.y = sphereBases[1].y - s * 0.12 + Math.cos(t * 0.85) * 0.04;
      spheres[2].position.y = sphereBases[2].y - s * 0.15 + Math.sin(t * 0.6) * 0.04;

      spheres[0].rotation.set(t * 0.12, t * 0.18 + s * 0.2, t * 0.1);
      spheres[1].rotation.set(t * 0.16, t * 0.1 + s * 0.16, t * 0.14);
      spheres[2].rotation.set(t * 0.1, t * 0.14 + s * 0.18, t * 0.12);

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      spheres.forEach((s) => {
        s.geometry.dispose();
        (s.material as THREE.Material).dispose();
      });
      scene.clear();
      rendererRef.current = null;
    };
  }, [motionEnabled]);

  return (
    <div className="min-h-screen bg-[#070A12] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.16),transparent_60%)]" />
        <div className="absolute inset-0 partners-grid-mask" />
        {!webglOk || !motionEnabled ? <div className="absolute inset-0 partners-starfield" /> : null}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <header className="sticky top-4 z-30">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 sm:px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <Image src="/reviewerlogo.png" alt="Deep Funding" width={34} height={34} />
              </div>
              <div className="leading-tight">
                <div className="font-montserrat font-semibold text-white text-lg">Deep Funding</div>
                <div className="text-xs text-white/60 tracking-wide">Review Circle • Partners</div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMotion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4 text-white/70" />
              {motionEnabled ? 'Motion On' : 'Motion Off'}
            </button>
          </div>
        </header>

        <main className="pt-12">
          <div ref={heroRef} className="min-h-[80vh] flex flex-col justify-center transition-[transform,opacity] duration-200 ease-out">
            <Reveal className="flex justify-center" delayMs={0}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl text-sm text-white/75">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Review Circle Portal — Active
              </div>
            </Reveal>

            <Reveal className="mt-8 text-center" delayMs={80}>
              <h1 className="font-montserrat font-bold text-5xl sm:text-6xl tracking-tight text-white">
                Deep Funding
                <span className="block mt-3 partners-gradient-text">Review Circle</span>
              </h1>
              <p className="mt-6 text-white/65 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
                A centralized platform for managing milestone review operations, partner verdict workflows, and role-based collaboration across
                the Deep Funding ecosystem.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-white/10 transition-all shadow-[0_20px_80px_rgba(59,130,246,0.22)] hover:-translate-y-0.5"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Review Circle Portal
                  <span className="text-white/70">›</span>
                </Link>
                <Link
                  href="/partners/login"
                  className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold border border-white/10 transition-all shadow-[0_20px_80px_rgba(168,85,247,0.22)] hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  External Partners
                  <span className="text-white/70">›</span>
                </Link>
              </div>
              <div className="mt-6 text-white/45 text-sm">Scroll to explore</div>
              <button
                type="button"
                onClick={() => statsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl text-white/70 text-sm hover:bg-white/10 transition-colors"
              >
                <span className="scroll-dot" />
                Scroll
              </button>
            </Reveal>
          </div>

          <section className="mt-24">
            <div ref={statsSectionRef} />
            <Reveal delayMs={0}>
              <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-8 py-10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {stats.map((s, idx) => (
                    <Reveal key={s.label} className="text-center" delayMs={idx * 70}>
                      <div className="text-4xl sm:text-5xl font-montserrat font-bold text-blue-300">{s.value}</div>
                      <div className="mt-2 text-white/55 text-sm">{s.label}</div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>

          <section className="mt-28">
            <Reveal className="text-center" delayMs={0}>
              <h2 className="font-montserrat font-bold text-4xl text-white">Everything in one place</h2>
              <p className="mt-3 text-white/60 max-w-3xl mx-auto">
                A comprehensive ecosystem designed for seamless collaboration between reviewers, teams, admins, and partners.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map(({ title, description, Icon, tone }, idx) => (
                <Reveal key={title} delayMs={idx * 60}>
                  <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${
                          tone === 'blue'
                            ? 'bg-blue-500/10 border-blue-400/20'
                            : tone === 'purple'
                              ? 'bg-purple-500/10 border-purple-400/20'
                              : tone === 'emerald'
                                ? 'bg-emerald-500/10 border-emerald-400/20'
                                : 'bg-amber-500/10 border-amber-400/20'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            tone === 'blue'
                              ? 'text-blue-300'
                              : tone === 'purple'
                                ? 'text-purple-300'
                                : tone === 'emerald'
                                  ? 'text-emerald-300'
                                  : 'text-amber-300'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-semibold text-lg">{title}</div>
                        <div className="mt-2 text-white/60 leading-relaxed text-sm">{description}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mt-28 pb-24">
            <Reveal className="text-center" delayMs={0}>
              <h2 className="font-montserrat font-bold text-4xl text-white">Ready to get started?</h2>
              <p className="mt-3 text-white/60">Choose your portal and join the Deep Funding review ecosystem.</p>
            </Reveal>
            <Reveal className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4" delayMs={80}>
              <Link
                href="/login"
                className="w-full sm:w-auto min-w-[260px] inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-white/10 transition-all hover:-translate-y-0.5"
              >
                Review Circle
              </Link>
              <Link
                href="/partners/login"
                className="w-full sm:w-auto min-w-[260px] inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold border border-white/10 transition-all hover:-translate-y-0.5"
              >
                External Partners
              </Link>
            </Reveal>
          </section>
        </main>

        <footer className="pb-10 text-center text-white/35 text-sm">
          <div>© {new Date().getFullYear()} Deep Funding Review Circle</div>
        </footer>
      </div>

      <style jsx global>{`
        .reveal {
          opacity: 0;
          transform: translate3d(0, 22px, 0);
          transition:
            opacity 700ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 700ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 700ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: var(--d, 0ms);
          will-change: transform, opacity, filter;
        }
        .reveal--fade {
          filter: blur(0);
        }
        .reveal--fly {
          transform: translate3d(0, 56px, 0) rotateX(9deg) scale(0.98);
          filter: blur(10px);
        }
        .reveal[data-inview='true'] {
          opacity: 1;
        }
        .reveal--fade[data-inview='true'] {
          transform: translate3d(0, 0, 0);
        }
        .reveal--fly[data-inview='true'] {
          transform: translate3d(0, 0, 0) rotateX(0deg) scale(1);
          filter: blur(0);
        }
        .scroll-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(34, 211, 238, 0.95);
          box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.12), 0 0 30px rgba(34, 211, 238, 0.2);
          animation: pulse 1.35s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          60% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(0.9);
            opacity: 0.85;
          }
        }
        .partners-gradient-text {
          background: linear-gradient(90deg, rgba(96, 165, 250, 1) 0%, rgba(167, 139, 250, 1) 55%, rgba(34, 211, 238, 1) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .partners-grid-mask {
          background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(circle at 50% 35%, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.15) 62%, transparent 78%);
          opacity: 0.18;
        }
        .partners-starfield {
          background-image: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.55) 0 1px, transparent 2px),
            radial-gradient(circle at 35% 70%, rgba(34, 211, 238, 0.55) 0 1px, transparent 2px),
            radial-gradient(circle at 70% 35%, rgba(168, 85, 247, 0.55) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 68%, rgba(92, 242, 179, 0.55) 0 1px, transparent 2px),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.45) 0 1px, transparent 2px);
          background-size: 260px 260px, 320px 320px, 280px 280px, 360px 360px, 240px 240px;
          opacity: 0.35;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .reveal--fly {
            filter: none;
          }
          .scroll-dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
