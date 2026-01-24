'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type QuestionType = 'mcq' | 'text';

type QuestionForm = {
  localId: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  options: any;
  correctAnswers: string[];
  marks: number;
  required: boolean;
};

type TestForm = {
  name: string;
  guidelines: string;
  durationSeconds: number;
  status: 'draft' | 'active' | 'archived';
  gradingMode?: 'auto' | 'manual';
  questions: QuestionForm[];
};

const defaultTest: TestForm = {
  name: '',
  guidelines: '',
  durationSeconds: 900,
  status: 'draft',
  gradingMode: 'auto',
  questions: [],
};

function newQuestion(nextOrder: number): QuestionForm {
  return {
    localId: Math.random().toString(36).slice(2),
    orderIndex: nextOrder,
    type: 'mcq',
    prompt: '',
    options: ['Option 1', 'Option 2'],
    correctAnswers: [],
    marks: 1,
    required: true,
  };
}

export default function ReviewerTestsManager() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TestForm>({ ...defaultTest });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subViewOpen, setSubViewOpen] = useState(false);
  const [subViewTestId, setSubViewTestId] = useState<string | null>(null);
  const [subViewLoading, setSubViewLoading] = useState(false);
  const [subViewError, setSubViewError] = useState<string | null>(null);
  const [subViewData, setSubViewData] = useState<any[]>([]);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [gradingAnswers, setGradingAnswers] = useState<any[]>([]);
  const [gradingQuestions, setGradingQuestions] = useState<any[]>([]);
  const [finalDecision, setFinalDecision] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviewer-tests');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch tests');
      setTests(json.tests || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

  const resetForm = () => {
    setForm({ ...defaultTest });
    setEditingId(null);
    setShowForm(false);
  };

  const onAddQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion(prev.questions.length + 1)],
    }));
  };

  const onUpdateQuestion = (localId: string, patch: Partial<QuestionForm>) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.localId === localId ? { ...q, ...patch } : q),
    }));
  };

  const onRemoveQuestion = (localId: string) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.localId !== localId).map((q, idx) => ({ ...q, orderIndex: idx + 1 })),
    }));
  };

  const onEditTest = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviewer-tests/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch test');
      const t = json.test;
      const qs = (json.questions || []).map((q: any, idx: number) => ({
        localId: q.id || Math.random().toString(36).slice(2),
        orderIndex: q.order_index ?? idx + 1,
        type: (q.type === 'text' ? 'text' : 'mcq') as QuestionType,
        prompt: q.prompt || '',
        options: q.options ?? (q.type === 'mcq' ? [] : null),
        correctAnswers: q.correct_answers || [],
        marks: Number(q.marks || 1),
        required: !!q.required,
      }));
      setForm({
        name: t.name || '',
        guidelines: t.guidelines || '',
        durationSeconds: Number(t.duration_seconds || 900),
        status: t.status || 'draft',
        gradingMode: (t.grading_mode === 'manual' ? 'manual' : 'auto'),
        questions: qs,
      });
      setEditingId(t.id);
      setShowForm(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to open test');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteTest = async (id: string) => {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviewer-tests/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      await fetchTests();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const openSubmissions = async (id: string) => {
    setSubViewOpen(true);
    setSubViewTestId(id);
    setSubViewLoading(true);
    setSubViewError(null);
    setSubViewData([]);
    try {
      const res = await fetch(`/api/admin/reviewer-tests/${id}/submissions`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch submissions');
      setSubViewData(json.submissions || []);
    } catch (e: any) {
      setSubViewError(e?.message || 'Failed to fetch submissions');
    } finally {
      setSubViewLoading(false);
    }
  };

  const closeSubmissions = () => {
    setSubViewOpen(false);
    setSubViewTestId(null);
    setSubViewData([]);
    setSubViewError(null);
    setSubViewLoading(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        guidelines: form.guidelines,
        durationSeconds: form.durationSeconds,
        status: form.status,
        gradingMode: form.gradingMode,
        questions: form.questions.map(q => ({
          orderIndex: q.orderIndex,
          type: q.type,
          prompt: q.prompt,
          options: q.type === 'mcq' ? q.options : (q.options && typeof q.options === 'object' ? q.options : undefined),
          correctAnswers: q.type === 'mcq' ? q.correctAnswers : undefined,
          marks: q.marks,
          required: q.required,
        })),
      };
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/admin/reviewer-tests/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/reviewer-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save');
      if (!editingId) {
        const newId = json.test?.id;
        if (newId) {
          const res2 = await fetch(`/api/admin/reviewer-tests/${newId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const j2 = await res2.json();
          if (!j2.success) throw new Error(j2.error || 'Failed to save questions');
        }
      }
      resetForm();
      await fetchTests();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-montserrat font-semibold text-xl text-white">Reviewer Tests</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...defaultTest }); }}
            className="px-3 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded"
          >
            + New Test
          </button>
          <button
            onClick={fetchTests}
            className="px-3 py-2 bg-[#2A1A4A] hover:bg-[#3A2A5A] text-white rounded border border-[#9D9FA9]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-white">Loading tests...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-200">
            <thead>
              <tr className="border-b border-[#9D9FA9]">
                <th className="py-2">Name</th>
                <th className="py-2">Status</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Created</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-[#2A1A4A]">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.status}</td>
                  <td className="py-2">{t.duration_seconds ? `${t.duration_seconds}s` : '-'}</td>
                  <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="py-2 flex gap-2">
                    <button onClick={() => openSubmissions(t.id)} className="px-2 py-1 bg-[#2A1A4A] text-white rounded border border-[#9D9FA9]">Submissions</button>
                    <button onClick={() => window.open(`/reviewer-tests/${t.id}?preview=true`, '_blank')} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-400/30">Preview</button>
                    <button onClick={() => onEditTest(t.id)} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">Edit</button>
                    <button onClick={() => onDeleteTest(t.id)} className="px-2 py-1 bg-red-500/20 text-red-300 rounded border border-red-400/30">Delete</button>
                  </td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#9D9FA9]">No tests yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="mt-6 bg-[#1A0A3A] border border-[#9D9FA9] rounded-lg p-4">
          <h4 className="text-white font-montserrat text-lg mb-3">{editingId ? 'Edit Test' : 'Create Test'}</h4>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                  placeholder="Enter test name"
                  required
                />
              </div>
              <div>
                <label className="block text-white mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-white mb-1">Grading Mode</label>
                <select
                  value={form.gradingMode}
                  onChange={e => setForm(prev => ({ ...prev, gradingMode: e.target.value as 'auto' | 'manual' }))}
                  className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                >
                  <option value="auto">Auto score (use answer keys for MCQ; scenario graded by admin)</option>
                  <option value="manual">Manual grading (admin grades all questions)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white mb-1">Guidelines</label>
              <textarea
                value={form.guidelines}
                onChange={e => setForm(prev => ({ ...prev, guidelines: e.target.value }))}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 h-28"
                placeholder="Instructions for reviewers"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  value={form.durationSeconds}
                  min={60}
                  step={30}
                  onChange={e => setForm(prev => ({ ...prev, durationSeconds: Number(e.target.value) }))}
                  className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-white font-montserrat">Questions</h5>
                <button type="button" onClick={onAddQuestion} className="px-3 py-1 bg-[#9050E9] text-white rounded">+ Add Question</button>
              </div>
              {form.questions.length === 0 && (
                <div className="text-[#9D9FA9]">No questions yet</div>
              )}
              <div className="space-y-3">
                {form.questions.map((q) => (
                  <div key={q.localId} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#9D9FA9]">#{q.orderIndex}</span>
                      <select
                        value={q.type}
                        onChange={e => onUpdateQuestion(q.localId, { type: e.target.value as QuestionType, options: e.target.value === 'mcq' ? (Array.isArray(q.options) ? q.options : ['Option 1','Option 2']) : (q.options && typeof q.options === 'object' ? q.options : null), correctAnswers: e.target.value === 'mcq' ? q.correctAnswers : [] })}
                        className="text-white px-2 py-1 bg-[#0C021E] border border-[#9D9FA9] rounded"
                      >
                        <option value="mcq">Type: MCQ</option>
                        <option value="text">Type: Scenario (Text)</option>
                      </select>
                      <input
                        type="number"
                        value={q.marks}
                        min={0}
                        onChange={e => onUpdateQuestion(q.localId, { marks: Number(e.target.value) })}
                        className="bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-2 py-1 w-20"
                      />
                      <label className="flex items-center gap-2 text-white">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={e => onUpdateQuestion(q.localId, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <button type="button" onClick={() => onRemoveQuestion(q.localId)} className="ml-auto px-2 py-1 bg-red-500/20 text-red-300 rounded border border-red-400/30">
                        Remove
                      </button>
                    </div>

                    <div className="mb-2">
                      <textarea
                        value={q.prompt}
                        onChange={e => onUpdateQuestion(q.localId, { prompt: e.target.value })}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 h-24 whitespace-pre-wrap"
                        placeholder="Question prompt (supports Markdown)"
                      />
                    </div>

                    {q.type === 'mcq' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateQuestion(q.localId, { options: [...q.options, `Option ${q.options.length + 1}`] })}
                            className="px-2 py-1 bg-[#9050E9] text-white rounded"
                          >
                            + Add Option
                          </button>
                          <span className="text-[#9D9FA9]">Select correct answer(s)</span>
                        </div>
                        {q.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={q.correctAnswers.includes(String(idx))}
                              onChange={e => {
                                const id = String(idx);
                                const next = e.target.checked
                                  ? Array.from(new Set([...q.correctAnswers, id]))
                                  : q.correctAnswers.filter(x => x !== id);
                                onUpdateQuestion(q.localId, { correctAnswers: next });
                              }}
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={e => {
                                const nextOpts = [...q.options];
                                nextOpts[idx] = e.target.value;
                                onUpdateQuestion(q.localId, { options: nextOpts });
                              }}
                              className="flex-1 bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextOpts = q.options.filter((_, i) => i !== idx);
                                const nextCorrect = q.correctAnswers.filter(x => x !== String(idx)).map(x => {
                                  const xi = Number(x);
                                  return xi > idx ? String(xi - 1) : x;
                                });
                                onUpdateQuestion(q.localId, { options: nextOpts, correctAnswers: nextCorrect });
                              }}
                              className="px-2 py-1 bg-red-500/20 text-red-300 rounded border border-red-400/30"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-white mb-1">Optional Answer Key (for guided grading)</label>
                        <textarea
                          value={q.options?.answerKey || ''}
                          onChange={e => onUpdateQuestion(q.localId, { options: { ...(q.options || {}), answerKey: e.target.value } })}
                          className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 h-24"
                          placeholder="Provide a reference answer or rubric notes"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white rounded disabled:opacity-60"
              >
                {saving ? 'Saving...' : (editingId ? 'Update Test' : 'Create Test')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-[#2A1A4A] hover:bg-[#3A2A5A] text-white rounded border border-[#9D9FA9]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {subViewOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h4 className="text-white font-montserrat text-lg">Submissions</h4>
              <button onClick={closeSubmissions} className="px-2 py-1 bg-[#2A1A4A] text-white rounded border border-[#9D9FA9]">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {subViewLoading ? (
              <div className="text-white">Loading submissions...</div>
            ) : subViewError ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{subViewError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-200">
                  <thead>
                    <tr className="border-b border-[#9D9FA9]">
                      <th className="py-2">Reviewer</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Submitted</th>
                      <th className="py-2">Time Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subViewData.map((s: any) => (
                      <tr key={s.id} className="border-b border-[#2A1A4A]">
                        <td className="py-2">{s.username || s.user_id}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs border ${s.status === 'graded' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                            {s.status === 'graded' ? 'Graded' : 'Pending grading'}
                          </span>
                        </td>
                        <td className="py-2">{s.status === 'graded' ? (s.total_score ?? '-') : '-'}</td>
                        <td className="py-2">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '-'}</td>
                        <td className="py-2">{s.time_taken_seconds != null ? `${s.time_taken_seconds}s` : '-'}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setGradingOpen(true);
                                setGradingSubmissionId(s.id);
                                setGradingLoading(true);
                                setGradingError(null);
                                setGradingSubmission(null);
                                setGradingAnswers([]);
                                setGradingQuestions([]);
                                setFinalDecision(s.final_decision || '');
                                try {
                                  const res = await fetch(`/api/admin/reviewer-tests/submissions/${s.id}`);
                                  const json = await res.json();
                                  if (!json.success) throw new Error(json.error || 'Failed to load submission');
                                  setGradingSubmission(json.submission);
                                  setGradingAnswers(json.answers || []);
                                  setGradingQuestions(json.questions || []);
                                } catch (e: any) {
                                  setGradingError(e?.message || 'Failed to load submission');
                                } finally {
                                  setGradingLoading(false);
                                }
                              }}
                              className="px-2 py-1 bg-[#9050E9] text-white rounded"
                            >
                              Grade
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subViewData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#9D9FA9]">No submissions yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {gradingOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1A0A3A] border border-[#9D9FA9] rounded-xl p-6 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-montserrat text-lg">Grade Submission</h4>
              <button
                onClick={() => { setGradingOpen(false); setGradingSubmissionId(null); }}
                className="px-2 py-1 bg-[#2A1A4A] text-white rounded border border-[#9D9FA9]"
              >
                Close
              </button>
            </div>
            {gradingLoading ? (
              <div className="text-white">Loading...</div>
            ) : gradingError ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded p-3">{gradingError}</div>
            ) : gradingSubmission ? (
              <div className="space-y-4">
                <div className="text-[#9D9FA9]">Reviewer: {gradingSubmission.username || gradingSubmission.user_id}</div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {gradingQuestions.map((q: any, idx: number) => {
                    const ans = gradingAnswers.find((a: any) => String(a.question_id) === String(q.id));
                    const isText = q.type === 'text';
                    return (
                      <div key={q.id} className="bg-[#0C021E] border border-[#9D9FA9] rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-white">Q{idx + 1}. {q.prompt}</h5>
                          <span className="text-[#9D9FA9]">Marks: {q.marks}</span>
                        </div>
                        {isText ? (
                          <div className="space-y-2">
                            <div className="text-white">
                              <span className="text-[#9D9FA9]">Answer:</span>
                              <div className="mt-1 bg-[#1A0A3A] border border-[#9D9FA9]/40 rounded p-2 text-white whitespace-pre-wrap">
                                {String(ans?.answer_text || '')}
                              </div>
                            </div>
                            <div>
                              <label className="block text-white mb-1">Score</label>
                              <input
                                type="number"
                                min={0}
                                max={Number(q.marks || 0)}
                                value={ans?.score != null ? Number(ans.score) : ''}
                                onChange={e => {
                                  const scoreVal = e.target.value === '' ? null : Number(e.target.value);
                                  setGradingAnswers(prev => prev.map(a => a.id === ans.id ? { ...a, score: scoreVal } : a));
                                }}
                                className="w-32 bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-2 py-1"
                              />
                            </div>
                            {q.options?.answerKey && (
                              <div className="text-[#9D9FA9] text-sm">
                                Reference: {String(q.options.answerKey)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 text-white">
                            <div className="text-[#9D9FA9]">Selected: {Array.isArray(ans?.selected_options) ? (ans.selected_options || []).join(', ') : '-'}</div>
                            <div className="text-[#9D9FA9]">Auto Score: {ans?.score != null ? Number(ans.score) : 0}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white mb-1">Final Decision</label>
                    <select
                      value={finalDecision}
                      onChange={e => setFinalDecision(e.target.value)}
                      className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    >
                      <option value="">Select decision</option>
                      <option value="Approved">Approved</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!gradingSubmissionId) return;
                      setGradingLoading(true);
                      setGradingError(null);
                      try {
                        const payload = {
                          answers: gradingAnswers
                            .filter((a: any) => gradingQuestions.find((q: any) => String(q.id) === String(a.question_id))?.type === 'text')
                            .map((a: any) => ({ answerId: a.id, score: a.score })),
                          finalDecision: finalDecision || undefined,
                        };
                        const res = await fetch(`/api/admin/reviewer-tests/submissions/${gradingSubmissionId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'Failed to save grading');
                        setGradingOpen(false);
                        if (subViewTestId) await openSubmissions(subViewTestId);
                      } catch (e: any) {
                        setGradingError(e?.message || 'Failed to save grading');
                      } finally {
                        setGradingLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#9050E9] text-white rounded"
                  >
                    Save Grading
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
