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
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [resultSubmission, setResultSubmission] = useState<any | null>(null);
  const [resultAnswers, setResultAnswers] = useState<any[]>([]);
  const [resultQuestions, setResultQuestions] = useState<any[]>([]);
  const [resultTest, setResultTest] = useState<any | null>(null);
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
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: 'transparent' }} />
        <Header title="Reviewer Tests" />
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10 overflow-y-auto">
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
                      {/* Submission attempt status */}
                      {subsMap[t.id] ? (
                        <div className="mb-2">
                          <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Attempted
                          </span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Not attempted
                          </span>
                        </div>
                      )}
                      <p className="text-gray-300 text-sm mb-4 line-clamp-3">{t.guidelines || 'No specific guidelines provided.'}</p>
                      {subsMap[t.id] ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-[#2A1A4A] text-[#9D9FA9] rounded inline-block cursor-not-allowed border border-[#9D9FA9]/40"
                        >
                          Test completed
                        </button>
                      ) : (
                        <Link
                          href={`/reviewer-tests/${t.id}`}
                          className="px-3 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded inline-block"
                        >
                          Start Test
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-10">
                <h2 className="font-montserrat font-bold text-2xl text-white mb-3">Quiz Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(subsMap).length === 0 ? (
                    <div className="text-[#9D9FA9]">No quiz results yet.</div>
                  ) : (
                    Object.values(subsMap).map((s: any) => (
                      <div key={s.id} className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-montserrat text-lg">Test: {tests.find(t => t.id === s.test_id)?.name || s.test_id}</h3>
                          <span className={`px-2 py-1 rounded text-xs border ${s.status === 'graded' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                            {s.status === 'graded' ? 'Graded' : 'Pending grading'}
                          </span>
                        </div>
                        <div className="text-[#9D9FA9] mt-2">
                          <div>Score: <span className="text-white">{s.status === 'graded' && s.total_score != null ? s.total_score : '—'}</span></div>
                          <div>Final Decision: <span className="text-white">{s.final_decision || '—'}</span></div>
                          <div>Submitted: <span className="text-white">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</span></div>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={async () => {
                              setResultModalOpen(true);
                              setResultLoading(true);
                              setResultError(null);
                              setResultSubmission(null);
                              setResultAnswers([]);
                              setResultQuestions([]);
                              setResultTest(null);
                              try {
                                const res = await fetch(`/api/reviewer-tests/submissions/${s.id}`);
                                const json = await res.json();
                                if (!json.success) throw new Error(json.error || 'Failed to load result');
                                setResultSubmission(json.submission);
                                setResultAnswers(json.answers || []);
                                setResultQuestions(json.questions || []);
                                setResultTest(json.test || null);
                              } catch (e: any) {
                                setResultError(e?.message || 'Failed to load result');
                              } finally {
                                setResultLoading(false);
                              }
                            }}
                            className="px-3 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded inline-block"
                          >
                            View Quiz Result
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <Footer />
          </main>
        </div>

        {resultModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-montserrat text-lg">Quiz Result</h3>
                <button
                  onClick={() => setResultModalOpen(false)}
                  className="px-2 py-1 bg-[#2A1A4A] text-white rounded border border-[#9D9FA9]"
                >
                  Close
                </button>
              </div>
              {resultLoading ? (
                <div className="text-white">Loading...</div>
              ) : resultError ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{resultError}</div>
              ) : resultSubmission ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="text-[#9D9FA9] space-y-1">
                    {resultSubmission.status !== 'graded' ? (
                      <>
                        <div className="text-yellow-300 font-medium">
                          Pending grading by admins. You will see your score once grading is complete.
                        </div>
                        <div>Submitted: <span className="text-white">{resultSubmission.submitted_at ? new Date(resultSubmission.submitted_at).toLocaleString() : '—'}</span></div>
                      </>
                    ) : (
                      <>
                        <div>Total Score: <span className="text-white">{Number(resultSubmission.total_score || 0)}</span></div>
                        <div>Final Decision: <span className="text-white">{resultSubmission.final_decision || '—'}</span></div>
                        <div>Submitted: <span className="text-white">{resultSubmission.submitted_at ? new Date(resultSubmission.submitted_at).toLocaleString() : '—'}</span></div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-2">
                    {resultQuestions.map((q: any, idx: number) => {
                      const ans = resultAnswers.find((a: any) => String(a.question_id) === String(q.id));
                      const isText = q.type === 'text';
                      const scored = resultSubmission.status === 'graded' && ans && ans.score != null;
                      return (
                        <div key={q.id} className="bg-[#0C021E] border border-[#9D9FA9] rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex flex-col">
                              <span className="text-xs text-[#9D9FA9]">Question {idx + 1}</span>
                              <h4 className="text-white font-montserrat text-sm">{q.prompt}</h4>
                            </div>
                            <div className="text-right">
                              <div className="text-[#9D9FA9] text-xs">Marks</div>
                              <div className="text-white text-sm">{q.marks}</div>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                            <div>
                              <div className="text-[#9D9FA9] text-xs mb-1">Your answer</div>
                              {isText ? (
                                <div className="bg-[#1A0A3A] border border-[#9D9FA9]/40 rounded p-2 text-white text-sm whitespace-pre-wrap min-h-[40px]">
                                  {String(ans?.answer_text || '') || 'No answer provided.'}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(ans?.selected_options) ? ans.selected_options : []).length > 0 ? (
                                    (Array.isArray(ans?.selected_options) ? ans.selected_options : []).map((opt: any, idx2: number) => (
                                      <span key={idx2} className="px-2 py-1 rounded-full bg-[#2A1A4A] text-white text-xs border border-[#9D9FA9]/40">
                                        {String(opt)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[#9D9FA9] text-sm">No option selected.</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-between">
                              {resultSubmission.status !== 'graded' ? (
                                <div className="text-yellow-300 text-xs font-medium">Pending grading</div>
                              ) : (
                                <div className="text-sm">
                                  <div className="text-[#9D9FA9] text-xs mb-1">Score</div>
                                  <div className="text-white">
                                    {ans && ans.score != null ? `${Number(ans.score)} / ${q.marks}` : `0 / ${q.marks}`}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
