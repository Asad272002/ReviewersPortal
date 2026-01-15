'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import * as THREE from 'three';

type Question = {
  id: string;
  type: 'mcq' | 'text';
  prompt: string;
  options?: Array<string | { id: string; label: string }>;
  marks: number;
  required: boolean;
  order_index: number;
};

function renderInline(text: string): ReactNode[] {
  const parts = text.split('**');
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function renderRichText(content: string): ReactNode {
  if (!content) return null;
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      blocks.push(
        <h4 key={`h3-${i}`} className="text-base sm:text-lg font-semibold text-white mb-1">
          {renderInline(text)}
        </h4>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      blocks.push(
        <h3 key={`h2-${i}`} className="text-lg sm:text-xl font-semibold text-white mb-1">
          {renderInline(text)}
        </h3>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      blocks.push(
        <h2 key={`h1-${i}`} className="text-xl sm:text-2xl font-bold text-white mb-2">
          {renderInline(text)}
        </h2>
      );
      i += 1;
      continue;
    }

    if (/^(\*|-|•)\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^(\*|-|•)\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^(\*|-|•)\s+/, '');
        items.push(
          <li key={`ul-${i}`} className="mb-1">
            {renderInline(itemText)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ul key={`ul-block-${i}`} className="list-disc list-inside space-y-1">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        items.push(
          <li key={`ol-${i}`} className="mb-1">
            {renderInline(itemText)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ol key={`ol-block-${i}`} className="list-decimal list-inside space-y-1">
          {items}
        </ol>
      );
      continue;
    }

    let paragraph = line;
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(\*|-|•)\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('#')
    ) {
      paragraph += '\n' + lines[i].trimEnd();
      i += 1;
    }

    const keyIndex = i;
    blocks.push(
      <p key={`p-${keyIndex}`} className="mb-2 whitespace-pre-wrap">
        {renderInline(paragraph)}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

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
  const [mySubmission, setMySubmission] = useState<any | null>(null);
  const [scorePopup, setScorePopup] = useState<{ open: boolean; score: number | null }>(() => ({ open: false, score: null }));
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTs, setStartTs] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const [timeUp, setTimeUp] = useState(false);
  const autoSubmitTriggeredRef = useRef<boolean>(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; score?: number | null } | null>(null);

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
      setQuestions((json.questions || []).map((q: any) => ({
        id: String(q.id),
        type: q.type,
        prompt: q.prompt,
        options: q.options || [],
        marks: Number(q.marks || 0),
        required: !!q.required,
        order_index: Number(q.order_index || 0),
      })));

      // Check if user already submitted this test
      if (!isPreview) {
        const subRes = await fetch('/api/reviewer-tests/submissions');
        const subJson = await subRes.json();
        let isSubmitted = false;
        if (subJson?.success) {
          const sub = (subJson.submissions || []).find((s: any) => String(s?.test_id || '') === String(id));
          if (sub) {
            setMySubmission(sub);
            if (String(sub?.status || '') === 'submitted' || String(sub?.status || '') === 'graded') {
              isSubmitted = true;
              setAlreadySubmitted(true);
              setError('You have already submitted this test. Only one attempt is allowed.');
            } else if (String(sub?.status || '') === 'in_progress' && sub.started_at) {
              const ts = new Date(sub.started_at).getTime();
              if (!Number.isNaN(ts)) setStartTs(ts);
            }
          }
        }
        // If not submitted and no in_progress found, create start record
        if (!isSubmitted) {
          const sub = (subJson?.submissions || []).find((s: any) => String(s?.test_id || '') === String(id) && String(s?.status || '') === 'in_progress');
          if (!sub) {
            // Do not auto-start. Show guidelines modal instead.
            setShowGuidelines(true);
          } else {
            // Resuming session
            setMySubmission(sub);
            if (sub.started_at) {
               const ts = new Date(sub.started_at).getTime();
               if (!Number.isNaN(ts)) setStartTs(ts);
            }
          }
        }
      } else {
        // Preview mode
        setShowGuidelines(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (id) fetchTest(); }, [id]);

  const startTestSession = async () => {
    if (isPreview) {
      setMySubmission({ id: 'preview', status: 'in_progress', started_at: new Date().toISOString(), test_id: id });
      setStartTs(Date.now());
      setShowGuidelines(false);
      return;
    }
    setLoading(true);
    try {
      const startRes = await fetch(`/api/reviewer-tests/${id}/start`, { method: 'POST' });
      const startJson = await startRes.json();
      if (startJson?.success) {
        setMySubmission({ id: startJson.submissionId, status: 'in_progress', started_at: startJson.startedAt, test_id: id });
        const ts = new Date(startJson.startedAt).getTime();
        if (!Number.isNaN(ts)) setStartTs(ts);
        setShowGuidelines(false);
      } else {
        setError(startJson.error || 'Failed to start test');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const durationSec = useMemo(() => Number(test?.duration_seconds || 0), [test]);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const elapsed = startTs ? Math.floor((nowTs - startTs) / 1000) : 0;
  const remaining = durationSec ? Math.max(durationSec - elapsed, 0) : null;

  // Auto-submit when time runs out
  useEffect(() => {
    if (durationSec && remaining === 0 && !alreadySubmitted && !autoSubmitTriggeredRef.current && !submitting) {
      setTimeUp(true);
      autoSubmitTriggeredRef.current = true;
      onAutoSubmit();
    }
  }, [durationSec, remaining, alreadySubmitted, submitting]);

  const onSelectMcq = (qid: string, optValue: string) => {
    const val = String(optValue);
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const onSetText = (qid: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qid]: text }));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (isPreview) {
        setSubmitting(false);
        setSuccessData({ message: 'Preview Mode: Test submitted successfully (not saved).', score: null });
        setShowSuccess(true);
        setAlreadySubmitted(true);
        return;
      }
      if (alreadySubmitted) {
        throw new Error('You have already submitted this test');
      }
      for (const q of questions) {
        const a = answers[q.id];
        if (q.required) {
          if (q.type === 'mcq') {
            if (a == null || String(a).trim() === '') {
              throw new Error('Please answer all required questions');
            }
          } else if (q.type === 'text') {
            if (a == null || String(a).trim() === '') {
              throw new Error('Please answer all required questions');
            }
          }
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
      const autoCompleted = !!json.autoScoreCompleted;
      const manualOrPending = String(test?.grading_mode || '') === 'manual' || !autoCompleted;
      if (manualOrPending) {
        setSuccessData({ message: 'Submitted. Admins will review and grade your test. You will receive your score soon.', score: null });
      } else {
        setSuccessData({ message: 'Submitted! Your score: ' + json.totalScore, score: Number(json.totalScore ?? 0) });
      }
      setShowSuccess(true);
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
      if (isPreview) {
        setSubmitting(false);
        setSuccessData({ message: 'Preview Mode: Time is up. Test submitted successfully (not saved).', score: null });
        setShowSuccess(true);
        setAlreadySubmitted(true);
        return;
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
      const autoCompleted = !!json.autoScoreCompleted;
      const manualOrPending = String(test?.grading_mode || '') === 'manual' || !autoCompleted;
      if (manualOrPending) {
        setSuccessData({ message: 'Time is up and your test was auto-submitted. Admins will review and grade your answers.', score: null });
      } else {
        setSuccessData({ message: 'Time\'s up. Auto-submitted. Your score: ' + json.totalScore, score: Number(json.totalScore ?? 0) });
      }
      setShowSuccess(true);
      setAlreadySubmitted(true);
    } catch (e: any) {
      setError(e?.message || 'Auto submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["reviewer", "admin"]}>
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: 'transparent' }} />
        <Header title="Reviewer Test" />
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {isPreview && (
                <div className="bg-purple-500/20 border border-purple-500/40 text-purple-200 rounded-lg p-3 mb-6 text-center font-semibold">
                  👀 Preview Mode - Submissions will not be saved
                </div>
              )}
              {loading ? (
                <div className="text-white">Loading test...</div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{error}</div>
              ) : test ? (
                <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6 relative">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h1 className="text-white font-montserrat text-2xl">{test.name}</h1>
                      <div className="text-[#e5e7eb] mt-2 text-sm sm:text-base leading-relaxed">
                        {renderRichText(test.guidelines || 'No guidelines provided.')}
                      </div>
                    </div>
                    <div className="text-white shrink-0">
                      {remaining != null ? (
                        <span className="px-3 py-1 bg-[#9050E9] rounded whitespace-nowrap">Time left: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
                      ) : (
                        <span className="px-3 py-1 bg-[#2A1A4A] border border-[#9D9FA9] rounded whitespace-nowrap">No timer</span>
                      )}
                    </div>
                  </div>

                  <div className={`space-y-4 transition-opacity duration-300 ${(showGuidelines || showSuccess) ? 'opacity-10 pointer-events-none blur-sm' : 'opacity-100'}`}>
                    {questions.map((q, idx) => (
                      <div key={q.id} className="bg-gradient-to-br from-[#0C021E] to-[#12052A] border border-[#9D9FA9] rounded-xl p-4 sm:p-5 shadow-md">
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <h3 className="text-white font-montserrat text-base sm:text-lg">
                                Q{idx + 1}
                              </h3>
                              <span className="text-[#9D9FA9] text-xs sm:text-sm shrink-0">
                                Marks: {q.marks}
                                {q.required && (
                                  <span className="text-rose-400 text-[10px] sm:text-xs uppercase tracking-wide ml-2">
                                    Required
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="text-[#e5e7eb] text-sm sm:text-base leading-relaxed">
                              {renderRichText(q.prompt)}
                            </div>
                          </div>
                        </div>
                        {q.type === 'mcq' ? (
                          <div className="space-y-2">
                            {(q.options || []).map((opt: any, i: number) => {
                              const selected = String(answers[q.id] ?? '');
                              const optObj = typeof opt === 'string'
                                ? { id: String(i), label: opt }
                                : { id: String(opt?.id ?? i), label: String(opt?.label ?? String(opt)) };
                              const checked = selected === optObj.id;
                              return (
                                <label key={optObj.id} className="flex items-start gap-2 text-white cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                                  <input 
                                    type="radio"
                                    name={`q-${q.id}`}
                                    className="mt-1"
                                    checked={checked} 
                                    onChange={() => onSelectMcq(q.id, optObj.id)} 
                                    disabled={alreadySubmitted || timeUp || showGuidelines} 
                                  />
                                  <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                                    {renderRichText(optObj.label)}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              value={String(answers[q.id] || '')}
                              onChange={e => onSetText(q.id, e.target.value)}
                              disabled={alreadySubmitted || timeUp || showGuidelines}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 h-40 whitespace-pre-wrap"
                              placeholder="Write your answer here..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={onSubmit}
                        disabled={submitting || alreadySubmitted || timeUp || showGuidelines}
                        className="px-6 py-3 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded font-semibold disabled:opacity-60 transition-all shadow-lg hover:shadow-[#9050E9]/50"
                      >
                        {submitting ? 'Submitting...' : (alreadySubmitted ? 'Submitted' : (timeUp ? 'Time Up' : 'Submit Test'))}
                      </button>
                    </div>
                  </div>

                  {showGuidelines && (
                    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-md rounded-xl p-3 sm:p-4 overflow-y-auto">
                      <div className="bg-[#050018] border border-[#9D9FA9] rounded-2xl px-5 py-5 sm:px-7 sm:py-6 max-w-xl w-full shadow-2xl mt-10 sm:mt-16 mb-10">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 border-b border-[#9D9FA9]/30 pb-3 text-center">
                          Test Guidelines
                        </h2>
                        <div className="text-gray-200 mb-6 sm:mb-7 text-sm sm:text-base leading-relaxed">
                          {renderRichText(
                            test.guidelines ||
                              'Please read the questions carefully and answer to the best of your ability.'
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={startTestSession}
                            disabled={loading}
                            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded-lg font-semibold sm:font-bold text-sm sm:text-base transition-all shadow-lg hover:shadow-[#9050E9]/50 flex items-center gap-2"
                          >
                            {loading ? 'Starting...' : 'I have read the guidelines. Start Test'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Modal Overlay */}
                  {showSuccess && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                      <div className="bg-[#1A0A3A] border border-[#9050E9] rounded-2xl p-10 max-w-lg w-full text-center shadow-[0_0_50px_rgba(144,80,233,0.3)] animate-in fade-in zoom-in duration-300">
                        <div className="text-6xl mb-6 animate-bounce">🎉</div>
                        <h2 className="text-3xl font-bold text-white mb-4 font-montserrat">Thank You!</h2>
                        <p className="text-xl text-gray-300 mb-8 whitespace-pre-wrap leading-relaxed">
                          {successData?.message || 'Your test has been submitted successfully.'}
                        </p>
                        <button
                          onClick={() => router.push('/reviewer-tests')}
                          className="px-8 py-3 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-[#9050E9]/50 w-full"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-[#9D9FA9]">Test not found</div>
              )}
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
