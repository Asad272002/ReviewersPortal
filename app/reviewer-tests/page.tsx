'use client';

import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import Link from 'next/link';
import * as THREE from 'three';

export default function ReviewerTestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [subsMap, setSubsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Simple particles background (reuse style)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    const geometry = new THREE.BufferGeometry();
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x9050e9, size: 0.05 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    const animate = () => {
      points.rotation.y += 0.0008;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reviewer-tests');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setTests(json.tests || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/reviewer-tests/submissions');
      const json = await res.json();
      if (!json.success) return; // silently ignore
      const map: Record<string, any> = {};
      (json.submissions || []).forEach((s: any) => {
        map[String(s.test_id)] = s;
      });
      setSubsMap(map);
    } catch {}
  };
  useEffect(() => { fetchTests(); fetchSubmissions(); }, []);

  return (
    <ProtectedRoute allowedRoles={["reviewer"]}>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: 'transparent' }} />
        <Header title="Reviewer Tests" />
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <h1 className="font-montserrat font-bold text-3xl text-white">Active Tests</h1>
                <p className="text-gray-300">Complete available tests within the time limit.</p>
              </div>
              {loading ? (
                <div className="text-white">Loading tests...</div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{error}</div>
              ) : tests.length === 0 ? (
                <div className="text-[#9D9FA9]">No active tests right now.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.map((t) => (
                    <div key={t.id} className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-4">
                      <h3 className="text-white font-montserrat text-lg">{t.name}</h3>
                      <p className="text-[#9D9FA9] text-sm mb-2">Duration: {t.duration_seconds ? `${Math.round(t.duration_seconds/60)} min` : '—'}</p>
                      {/* Submission status badge */}
                      {subsMap[t.id] ? (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {subsMap[t.id].status === 'graded' ? 'Graded' : 'Submitted'}
                          </span>
                          <span className="text-xs text-gray-300">
                            Score: {subsMap[t.id].total_score != null ? subsMap[t.id].total_score : '—'}
                          </span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">Not started</span>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{t.guidelines || 'No specific guidelines provided.'}</p>
                      <Link href={`/reviewer-tests/${t.id}`} className="px-3 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded inline-block">Start Test</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}