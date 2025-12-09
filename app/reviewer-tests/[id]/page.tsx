'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useParams, useRouter } from 'next/navigation';
import * as THREE from 'three';

type Question = {
  id: string;
  type: 'mcq' | 'text';
  prompt: string;
  // options can be strings or objects { id, label } from DB
  options?: Array<string | { id: string; label: string }>;
  marks: number;
  required: boolean;
  order_index: number;
};

export default function ReviewerTestRunner() {
  const params = useParams();
  const id = String((params as any)?.id || '');
  const [test, setTest] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ open: boolean; score: number | null }>(() => ({ open: false, score: null }));
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTs] = useState<number>(() => Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const router = useRouter();
  const [timeUp, setTimeUp] = useState(false);
  const autoSubmitTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    // Minimal animation backdrop
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x6b8cff, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    const animate = () => {
      mesh.rotation.x += 0.002;
      mesh.rotation.y += 0.003;
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

  const fetchTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviewer-tests/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setTest(json.test);
      setQuestions((json.questions || [])
        .filter((q: any) => q?.type === 'mcq')
        .map((q: any) => ({
        id: String(q.id),
        type: q.type,
        prompt: q.prompt,
        options: q.options || [],
        marks: Number(q.marks || 0),
        required: !!q.required,
        order_index: Number(q.order_index || 0),
      })));

      // Check if user already submitted this test
      const subRes = await fetch('/api/reviewer-tests/submissions');
      const subJson = await subRes.json();
      if (subJson?.success) {
        const has = (subJson.submissions || []).some((s: any) => String(s?.test_id || '') === String(id) && String(s?.status || '') === 'submitted');
        if (has) {
          setAlreadySubmitted(true);
          setError('You have already submitted this test. Only one attempt is allowed.');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (id) fetchTest(); }, [id]);

  const durationSec = useMemo(() => Number(test?.duration_seconds || 0), [test]);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const elapsed = Math.floor((nowTs - startTs) / 1000);
  const remaining = durationSec ? Math.max(durationSec - elapsed, 0) : null;

  // Auto-submit when time runs out
  useEffect(() => {
    if (durationSec && remaining === 0 && !alreadySubmitted && !autoSubmitTriggeredRef.current && !submitting) {
      setTimeUp(true);
      autoSubmitTriggeredRef.current = true;
      onAutoSubmit();
    }
  }, [durationSec, remaining, alreadySubmitted, submitting]);

  const onToggleMcq = (qid: string, optValue: string) => {
    setAnswers(prev => {
      const prevArr: string[] = Array.isArray(prev[qid]) ? prev[qid].map(String) : [];
      const val = String(optValue);
      const next = prevArr.includes(val) ? prevArr.filter(x => x !== val) : [...prevArr, val];
      return { ...prev, [qid]: next };
    });
  };

  const onSetText = (qid: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qid]: text }));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (alreadySubmitted) {
        throw new Error('You have already submitted this test');
      }
      // Basic required validation
      for (const q of questions) {
        const a = answers[q.id];
        if (q.required && (a == null || (q.type === 'mcq' && (!Array.isArray(a) || a.length === 0)))) {
          throw new Error('Please answer all required questions');
        }
      }
      const payload = {
        elapsedSeconds: elapsed,
        answers: questions.map(q => ({
          questionId: q.id,
          answer: answers[q.id],
        })),
      };
      const res = await fetch(`/api/reviewer-tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Submission failed');
      setSuccess(`Submitted! Auto score: ${json.totalScore}.`);
      setScorePopup({ open: true, score: Number(json.totalScore ?? 0) });
      setAlreadySubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const onAutoSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        elapsedSeconds: elapsed,
        answers: questions.map(q => ({
          questionId: q.id,
          answer: answers[q.id],
        })),
      };
      const res = await fetch(`/api/reviewer-tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Submission failed');
      setSuccess(`Time's up. Auto-submitted. Score: ${json.totalScore}.`);
      setScorePopup({ open: true, score: Number(json.totalScore ?? 0) });
      setAlreadySubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Auto submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["reviewer"]}>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: 'transparent' }} />
        <Header title="Reviewer Test" />
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <div className="text-white">Loading test...</div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{error}</div>
              ) : test ? (
                <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-white font-montserrat text-2xl">{test.name}</h1>
                      <p className="text-[#9D9FA9]">{test.guidelines || 'No guidelines provided.'}</p>
                    </div>
                    <div className="text-white">
                      {remaining != null ? (
                        <span className="px-3 py-1 bg-[#9050E9] rounded">Time left: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
                      ) : (
                        <span className="px-3 py-1 bg-[#2A1A4A] border border-[#9D9FA9] rounded">No timer</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="bg-[#0C021E] border border-[#9D9FA9] rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-montserrat">Q{idx + 1}. {q.prompt}</h3>
                          <span className="text-[#9D9FA9]">Marks: {q.marks}</span>
                        </div>
                        {q.type === 'mcq' ? (
                          <div className="space-y-2">
                            {(q.options || []).map((opt: any, i: number) => {
                              const selected: string[] = Array.isArray(answers[q.id]) ? answers[q.id].map(String) : [];
                              const optObj = typeof opt === 'string'
                                ? { id: String(i), label: opt }
                                : { id: String(opt?.id ?? i), label: String(opt?.label ?? String(opt)) };
                              const checked = selected.includes(optObj.id);
                              return (
                                <label key={optObj.id} className="flex items-center gap-2 text-white">
                                  <input type="checkbox" checked={checked} onChange={() => onToggleMcq(q.id, optObj.id)} disabled={alreadySubmitted || timeUp} />
                                  <span>{optObj.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-300 rounded p-3 mt-4">{success}</div>
                  )}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3 mt-4">{error}</div>
                  )}

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={onSubmit}
                      disabled={submitting || alreadySubmitted || timeUp}
                      className="px-4 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded disabled:opacity-60"
                    >
                      {submitting ? 'Submitting...' : (alreadySubmitted ? 'Already Submitted' : (timeUp ? 'Time Up' : 'Submit Test'))}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[#9D9FA9]">Test not found</div>
              )}
            </div>
          </main>
        </div>
        <Footer />
        {scorePopup.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6 w-full max-w-md text-center">
              <h3 className="text-white font-montserrat text-xl mb-2">Quiz Completed</h3>
              <p className="text-[#9D9FA9] mb-4">Your score: <span className="text-white font-semibold">{scorePopup.score ?? 0}</span></p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setScorePopup({ open: false, score: null }); router.push('/reviewer-tests'); }}
                  className="px-4 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}