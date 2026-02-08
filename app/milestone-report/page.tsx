'use client';

import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import ProtectedRoute from '../components/ProtectedRoute';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { validateUrl, validateNumber, validateRequiredText } from '../utils/validation';
import type { MilestoneReportData } from '@/lib/renderHtmlToPdf';

export default function MilestoneReportPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<MilestoneReportData>({
    reviewerHandle: '',
    proposalLink: '',
    proposalTitle: '',
    proposalId: '',
    milestoneTitle: '',
    milestoneNumber: '',
    milestoneBudgetAmount: '',
    date: '',
    demoProvided: 'Yes',
    testRunLink: '',
    verificationStatus: 'Yes',
    milestoneDescriptionFromProposal: '',
    deliverableLink: '',
    qDeliverablesMet: '',
    jDeliverablesMet: '',
    qQualityCompleteness: '',
    jQualityCompleteness: '',
    qEvidenceAccessibility: '',
    jEvidenceAccessibility: '',
    qBudgetAlignment: '',
    jBudgetAlignment: '',
    finalRecommendation: 'Approved',
    approvedWhy: '',
    rejectedWhy: '',
    suggestedChanges: ''
  });

  const setField = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const [projects, setProjects] = useState<{ code: string; title: string; link?: string }[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([])
  const [showTitleSug, setShowTitleSug] = useState(false)
  const [showCodeSug, setShowCodeSug] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [highlightFields, setHighlightFields] = useState(false)

  const s1 = ['proposalLink','proposalTitle','proposalId','milestoneTitle','milestoneNumber','milestoneBudgetAmount','date']
  const s2 = ['demoProvided','verificationStatus'].concat(form.demoProvided === 'Yes' ? ['testRunLink'] : [])
  const s3 = ['milestoneDescriptionFromProposal','deliverableLink','qDeliverablesMet','qQualityCompleteness','qEvidenceAccessibility','qBudgetAlignment']
  const s4 = ['finalRecommendation'].concat(
    form.finalRecommendation === 'Approved' ? ['approvedWhy'] : form.finalRecommendation === 'Rejected' ? ['rejectedWhy','suggestedChanges'] : []
  )
  const requiredKeys = [...s1, ...s2, ...s3, ...s4]
  const filledCount = requiredKeys.reduce((acc, k) => acc + (String((form as any)[k] || '').trim() ? 1 : 0), 0)
  const totalRequired = requiredKeys.length || 1
  const progressPercent = Math.round((filledCount / totalRequired) * 100)

  const scorePointsFor = (v: string) => (v === '1' ? 1 : v === '2' ? 0.5 : 0)
  const criteriaScore = scorePointsFor(form.qDeliverablesMet) + scorePointsFor(form.qQualityCompleteness) + scorePointsFor(form.qEvidenceAccessibility) + scorePointsFor(form.qBudgetAlignment)
  const criteriaDisplay = `${criteriaScore % 1 === 0 ? criteriaScore.toFixed(0) : criteriaScore.toFixed(1)}/4`
  const sectionOrder = [s1, s2, s3, s4]
  const activeIndex = sectionOrder.findIndex(arr => arr.some(k => !String((form as any)[k] || '').trim())) === -1 ? 3 : sectionOrder.findIndex(arr => arr.some(k => !String((form as any)[k] || '').trim()))

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setForm(prev => ({
      ...prev,
      reviewerHandle: user?.username || prev.reviewerHandle,
      date: `${yyyy}-${mm}-${dd}`
    }));

    // Load projects for proposal selection (from Supabase; fallback to file)
    (async () => {
      setLoadingProjects(true)
      try {
        const res = await fetch('/api/projects')
        const json = await res.json()
        const list = json?.data?.projects || []
        setProjects(list)
      } catch {}
      finally { setLoadingProjects(false) }
    })()

    if (!canvasRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      colors[i * 3] = 0.56; colors[i * 3 + 1] = 0.31; colors[i * 3 + 2] = 0.91;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMaterial = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    camera.position.z = 5;
    const animate = () => { requestAnimationFrame(animate); particles.rotation.y += 0.002; renderer.render(scene, camera); };
    animate();
    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); renderer.dispose(); };
  }, []);

  useEffect(() => {
    if (!form.proposalId) {
      setAvailableMilestones([]);
      return;
    }
    
    (async () => {
      try {
        const res = await fetch(`/api/projects/${form.proposalId}/milestones`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAvailableMilestones(json.data);
        } else {
          setAvailableMilestones([]);
        }
      } catch (e) {
        console.error(e);
        setAvailableMilestones([]);
      }
    })();
  }, [form.proposalId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null); setSuccess(null); setInvalidFields({});
    try {
      const errs: string[] = [];
      const newInvalidFields: Record<string, boolean> = {};

      const requiredTextFields = [
        ['proposalTitle', 'Proposal Title'],
        ['proposalId', 'Proposal ID'],
        ['milestoneTitle', 'Milestone Title'],
      ] as const;
      requiredTextFields.forEach(([key, label]) => {
        const v = validateRequiredText((form as any)[key], label, 1, 2000);
        if (!v.isValid) {
          errs.push(v.error!);
          newInvalidFields[key] = true;
        }
      });

      const urlChecks = [
        ['proposalLink', 'Proposal Link'],
        ['deliverableLink', 'Deliverable Link'],
      ] as const;
      urlChecks.forEach(([key]) => {
        const v = validateUrl((form as any)[key], { allowFormulas: true });
        if (!v.isValid) {
          errs.push(v.error!);
          newInvalidFields[key] = true;
        }
      });
      if (form.demoProvided === 'Yes') {
        const v = validateUrl(String(form.testRunLink || ''), { allowFormulas: true });
        if (!v.isValid) {
          errs.push(v.error! || 'Test Run Link must be a valid URL');
          newInvalidFields['testRunLink'] = true;
        }
        const req = validateRequiredText(String(form.testRunLink || ''), 'Test Run Link', 1, 2000, { allowFormulas: true });
        if (!req.isValid && !newInvalidFields['testRunLink']) {
          errs.push(req.error!);
          newInvalidFields['testRunLink'] = true;
        }
      }

      const numV = validateNumber(form.milestoneNumber, 'Milestone Number', 0, 100);
      if (!numV.isValid) {
        errs.push(numV.error!);
        newInvalidFields['milestoneNumber'] = true;
      }
      const budgetV = validateNumber(form.milestoneBudgetAmount, 'Milestone Budget Amount', 0);
      if (!budgetV.isValid) {
        errs.push(budgetV.error!);
        newInvalidFields['milestoneBudgetAmount'] = true;
      }

      const descV = validateRequiredText(form.milestoneDescriptionFromProposal, 'Milestone Description From Proposal', 1, 5000, { allowFormulas: true });
      if (!descV.isValid) {
        errs.push(descV.error!);
        newInvalidFields['milestoneDescriptionFromProposal'] = true;
      }

      // Validate Ratings
      const ratingFields = [
        ['qDeliverablesMet', 'Deliverables Rating'],
        ['qQualityCompleteness', 'Quality Rating'],
        ['qEvidenceAccessibility', 'Evidence Accessibility Rating'],
        ['qBudgetAlignment', 'Budget Alignment Rating'],
      ] as const;
      
      ratingFields.forEach(([key, label]) => {
        if (!form[key]) {
          errs.push(`${label} is required`);
          newInvalidFields[key] = true;
        }
      });

      if (form.finalRecommendation === 'Approved') {
        const v = validateRequiredText(String(form.approvedWhy || ''), 'Approved Why', 1, 3000, { allowFormulas: true });
        if (!v.isValid) {
          errs.push(v.error!);
          newInvalidFields['approvedWhy'] = true;
        }
      } else if (form.finalRecommendation === 'Rejected') {
        const v1 = validateRequiredText(String(form.rejectedWhy || ''), 'Rejected Why', 1, 3000, { allowFormulas: true });
        if (!v1.isValid) {
          errs.push(v1.error!);
          newInvalidFields['rejectedWhy'] = true;
        }
        const v2 = validateRequiredText(String(form.suggestedChanges || ''), 'Suggested Changes', 1, 3000, { allowFormulas: true });
        if (!v2.isValid) {
          errs.push(v2.error!);
          newInvalidFields['suggestedChanges'] = true;
        }
      }

      if (errs.length > 0) {
        setInvalidFields(newInvalidFields);
        // Scroll to first invalid field
        const firstInvalidKey = Object.keys(newInvalidFields)[0];
        if (firstInvalidKey) {
          const el = document.getElementById(firstInvalidKey);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
        }
        throw new Error(errs[0]); // Show first error message
      }

      const res = await fetch('/api/milestone-reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSuccess({ url: json?.reportUrl || '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0C021E] relative overflow-hidden">
        {success && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-in slide-in-from-top-10 fade-in duration-300">
            <div className="bg-[#1A0A3A]/90 backdrop-blur-md border border-[#22C55E] text-white rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)] p-4 relative">
              <button 
                onClick={() => setSuccess(null)}
                className="absolute top-2 right-2 text-[#B8BAC4] hover:text-white transition-colors p-1"
              >
                ✕
              </button>
              <div className="flex gap-4">
                <div className="bg-[#22C55E]/20 rounded-full p-2 h-fit text-xl">✅</div>
                <div className="flex-1">
                  <h4 className="font-montserrat font-semibold text-[#22C55E] mb-1">Report Submitted!</h4>
                  <div className="text-sm text-gray-200 space-y-2">
                    <p>
                      Your PDF report is ready: <a className="underline font-bold text-[#A96AFF] hover:text-[#c490ff]" href={success.url} target="_blank" rel="noreferrer">View PDF</a>
                    </p>
                    <p className="border-t border-white/10 pt-2 text-[#B8BAC4] text-xs uppercase font-bold tracking-wider">Next Step Required</p>
                    <p>
                      Please submit this data to the Operations Form: <br/>
                      <a href="https://docs.google.com/forms/d/e/1FAIpQLSdl2YJjNWzHvvNeE6095Hqw9mDdDHPFWu64CFUXuy4MTcHAJw/viewform" target="_blank" rel="noreferrer" className="underline font-bold text-[#22C55E] hover:text-[#4ade80]">Open Google Form →</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />
        <Header title="Milestone Report Submit" />
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
            {error && (
              <div className="bg-red-600/20 border border-red-500 text-red-300 rounded-xl p-4 mb-6">❌ {error}</div>
            )}
            <div className="bg-gradient-to-r from-[#1A0A3A] to-[#0C021E] border border-[#9D9FA9] rounded-2xl p-6 mb-6 shadow-2xl backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-montserrat font-semibold text-white">Progress</div>
                    <div className="font-montserrat text-sm text-[#B8BAC4]">{progressPercent}%</div>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div style={{ width: `${progressPercent}%` }} className="h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] transition-all duration-500"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-montserrat text-sm text-white">Criteria Met</div>
                  <div className="px-3 py-2 rounded-lg bg-[#0C021E] border border-[#9D9FA9] text-white font-montserrat shadow-lg">{criteriaDisplay}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {['Section 1','Section 2','Section 3','Section 4'].map((label, idx) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`${activeIndex===idx ? 'bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white' : 'bg-white/10 text-[#B8BAC4]'} w-8 h-8 rounded-full flex items-center justify-center font-montserrat font-semibold transition-all duration-300`}>{idx+1}</div>
                    <span className={`font-montserrat text-sm ${activeIndex===idx ? 'text-white' : 'text-[#B8BAC4]'}`}>{label}</span>
                    {idx<3 && <div className="w-8 h-[2px] bg-white/10"></div>}
                  </div>
                ))}
              </div>
            </div>
          <form onSubmit={onSubmit} className="space-y-6">
            {showGuide && !success && (
              <div className="bg-gradient-to-r from-[#A96AFF]/10 to-[#9050E9]/5 border border-[#A96AFF]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex-shrink-0 w-10 h-10 bg-[#A96AFF]/20 rounded-xl flex items-center justify-center text-xl shadow-[0_0_15px_rgba(169,106,255,0.3)]">
                  💡
                </div>
                <div className="flex-1">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    <span className="text-white font-semibold block sm:inline mb-1 sm:mb-0">Pro Tip: </span>
                    Start by selecting the <span className="text-[#A96AFF] font-bold">Proposal Code</span> and <span className="text-[#A96AFF] font-bold">Milestone Number</span> to auto-fill project details instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuide(false);
                    setHighlightFields(true);
                    setTimeout(() => setHighlightFields(false), 6000);
                  }}
                  className="flex-shrink-0 w-full sm:w-auto px-4 py-2 bg-[#A96AFF]/10 hover:bg-[#A96AFF]/20 border border-[#A96AFF]/30 rounded-lg text-xs font-semibold text-[#A96AFF] transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Got it, thanks!
                </button>
              </div>
            )}
              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/20 rounded-2xl p-6">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Section 1: Reviewer Identification and Project Context</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Reviewer Mattermost Handle" required value={form.reviewerHandle} readOnly />
                  <div className="relative">
                    <input className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition w-full pr-10" placeholder="Proposal Link" required value={form.proposalLink} onChange={e=>setField('proposalLink', e.target.value)} />
                    {form.proposalLink && (
                      <a 
                        href={form.proposalLink.startsWith('http') ? form.proposalLink : `https://${form.proposalLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A96AFF] hover:text-white transition-colors"
                        title="Open Link"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 relative">
                    <label className="text-white text-sm">Proposal Title (search)</label>
                    <input
                      className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition"
                      placeholder={loadingProjects ? 'Loading titles...' : 'Type to search title'}
                      value={form.proposalTitle}
                      onFocus={() => setShowTitleSug(true)}
                      onBlur={() => setTimeout(()=>setShowTitleSug(false), 120)}
                      onChange={e => {
                        const title = e.target.value
                        setField('proposalTitle', title)
                        const match = projects.find(p => p.title.toLowerCase() === title.toLowerCase())
                        if (match) {
                          if (match.code) setField('proposalId', match.code)
                          if (match.link) setField('proposalLink', match.link)
                        }
                        setShowTitleSug(true)
                      }}
                    />
                    {showTitleSug && (
                      <div className="absolute z-20 top-full mt-1 w-full max-h-52 overflow-auto bg-[#1A0A3A] border border-[#9D9FA9] rounded-lg shadow-xl">
                        {(projects.filter(p => p.title.toLowerCase().includes(String(form.proposalTitle||'').toLowerCase())).slice(0,50)).map((p, idx) => (
                          <button
                            type="button"
                            key={`t-${idx}`}
                            onMouseDown={() => {
                              setField('proposalTitle', p.title)
                              setField('proposalId', p.code)
                              setShowTitleSug(false)
                            }}
                            className="flex justify-between w-full text-left px-3 py-2 hover:bg-[#2A1A4A] text-white"
                          >
                            <span className="truncate pr-2">{p.title}</span>
                            <span className="text-[#B8BAC4] ml-2">{p.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 relative">
                    <label className="text-white text-sm">Proposal Code (search)</label>
                    <input
                      id="proposalId"
                      className={`bg-[#0C021E] border ${invalidFields['proposalId'] ? 'border-red-500 ring-1 ring-red-500' : highlightFields ? 'border-[#A96AFF] ring-2 ring-[#A96AFF] shadow-[0_0_15px_rgba(169,106,255,0.5)]' : 'border-[#9D9FA9]'} rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition duration-500`}
                      placeholder={loadingProjects ? 'Loading codes...' : 'Type to search code'}
                      value={form.proposalId}
                      onFocus={() => setShowCodeSug(true)}
                      onBlur={() => setTimeout(()=>setShowCodeSug(false), 120)}
                      onChange={e => {
                        const code = e.target.value
                        setField('proposalId', code)
                        const match = projects.find(p => p.code.toLowerCase() === code.toLowerCase())
                        if (match?.title) setField('proposalTitle', match.title)
                        setShowCodeSug(true)
                      }}
                    />
                    {showCodeSug && (
                      <div className="absolute z-20 top-full mt-1 w-full max-h-52 overflow-auto bg-[#1A0A3A] border border-[#9D9FA9] rounded-lg shadow-xl">
                        {(projects.filter(p => p.code.toLowerCase().includes(String(form.proposalId||'').toLowerCase())).slice(0,50)).map((p, idx) => (
                          <button
                            type="button"
                            key={`c-${idx}`}
                            onMouseDown={() => {
                              setField('proposalId', p.code)
                              setField('proposalTitle', p.title)
                              if (p.link) setField('proposalLink', p.link)
                              setShowCodeSug(false)
                            }}
                            className="flex justify-between w-full text-left px-3 py-2 hover:bg-[#2A1A4A] text-white"
                          >
                            <span>{p.code}</span>
                            <span className="text-[#B8BAC4] ml-2 truncate">{p.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input id="milestoneTitle" className={`bg-[#0C021E] border ${invalidFields['milestoneTitle'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition`} placeholder="Milestone Title" required value={form.milestoneTitle} onChange={e=>setField('milestoneTitle', e.target.value)} />
                  <div className="flex flex-col gap-2">
                    {availableMilestones.length > 0 ? (
                      <div className="relative">
                        <select
                          id="milestoneNumber"
                          className={`w-full bg-[#0C021E] border ${invalidFields['milestoneNumber'] ? 'border-red-500 ring-1 ring-red-500' : highlightFields ? 'border-[#A96AFF] ring-2 ring-[#A96AFF] shadow-[0_0_15px_rgba(169,106,255,0.5)]' : 'border-[#9D9FA9]'} rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition appearance-none duration-500`}
                          value={form.milestoneNumber}
                          onChange={e => {
                              const num = e.target.value;
                              setField('milestoneNumber', num);
                              const m = availableMilestones.find(x => x.milestone_number.toString() === num);
                              if (m) {
                                  setField('milestoneTitle', m.title);
                                  setField('milestoneBudgetAmount', m.budget?.toString() || '');
                                  setField('milestoneDescriptionFromProposal', [m.description, m.deliverables ? `Deliverables:\n${m.deliverables}` : ''].filter(Boolean).join('\n\n'));
                              }
                          }}
                        >
                          <option value="">Select Milestone</option>
                          {availableMilestones.map(m => (
                              <option key={m.id} value={m.milestone_number}>
                                  Milestone {m.milestone_number}: {m.title}
                              </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#9D9FA9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <input id="milestoneNumber" type="number" min={0} max={100} step={1} className={`bg-[#0C021E] border ${invalidFields['milestoneNumber'] ? 'border-red-500 ring-1 ring-red-500' : highlightFields ? 'border-[#A96AFF] ring-2 ring-[#A96AFF] shadow-[0_0_15px_rgba(169,106,255,0.5)]' : 'border-[#9D9FA9]'} rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition duration-500`} placeholder="Milestone Number (0–100)" required value={form.milestoneNumber} onChange={e=>setField('milestoneNumber', e.target.value)} />
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8BAC4]">$</span>
                    <input id="milestoneBudgetAmount" type="number" min={0} className={`bg-[#0C021E] border ${invalidFields['milestoneBudgetAmount'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg pl-7 p-3 text-white w-full focus:ring-2 focus:ring-[#A96AFF] transition`} placeholder="Milestone Budget Amount" required value={form.milestoneBudgetAmount} onChange={e=>setField('milestoneBudgetAmount', e.target.value)} />
                  </div>
                  <input id="date" type="date" className={`bg-[#0C021E] border ${invalidFields['date'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition`} required value={form.date} onChange={e=>setField('date', e.target.value)} />
              </div>
              </div>

              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/20 rounded-2xl p-6">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Section 2: Test Run Verification</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-white">
                    <div className="mb-2">Did the team provide a demo / prototype / repo test run?</div>
                    <div className="flex gap-2">
                      {['Yes','No'].map(val => (
                        <button type="button" key={val} onClick={()=>setField('demoProvided', val)} className={`px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 ${form.demoProvided===val ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-white/10 border-white/20 text-white'}`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.demoProvided === 'Yes' && (
                    <input className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 text-white focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Test Run Link (URL)" required value={form.testRunLink} onChange={e=>setField('testRunLink', e.target.value)} />
                  )}
                  <div className="text-white">
                    <div className="mb-2">Was the reviewer able to verify functionality?</div>
                    <div className="flex gap-2">
                      {['Yes','No'].map(val => (
                        <button type="button" key={val} onClick={()=>setField('verificationStatus', val)} className={`px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 ${form.verificationStatus===val ? (val==='Yes' ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-red-600/20 border-red-500 text-red-300') : 'bg-white/10 border-white/20 text-white'}`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/20 rounded-2xl p-6">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Section 3: Milestone Evaluation</h2>
                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-4 text-[#B8BAC4] mb-4">
                  <div className="font-montserrat mb-2">Rating Legend</div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#22C55E', color: '#052e0d' }}>1</span>
                      <span className="font-montserrat text-sm text-white">Fully Met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#FACC15', color: '#3b3005' }}>2</span>
                      <span className="font-montserrat text-sm text-white">Partially Met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#EF4444', color: '#3b0b0b' }}>3</span>
                      <span className="font-montserrat text-sm text-white">Not Met</span>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <textarea className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Milestone Description From Proposal" required value={form.milestoneDescriptionFromProposal} onChange={e=>setField('milestoneDescriptionFromProposal', e.target.value)} />
                </div>
                <div className="mb-4">
                  <input className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Deliverable Link (URL)" required value={form.deliverableLink} onChange={e=>setField('deliverableLink', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  <div id="qDeliverablesMet" className={`p-4 rounded-xl border ${invalidFields['qDeliverablesMet'] ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}>
                    <label className="text-white block mb-2">Deliverables match milestone description</label>
                    <div role="radiogroup" aria-label="Deliverables rating" className="flex gap-3 mb-2">
                      {['1','2','3'].map(val => (
                        <button 
                          type="button" 
                          role="radio" 
                          aria-checked={form.qDeliverablesMet===val} 
                          key={val} 
                          onClick={()=>setField('qDeliverablesMet', val)} 
                          className={`
                            px-4 py-2 rounded-xl border transition-all duration-300 font-montserrat font-medium
                            ${form.qDeliverablesMet===val 
                              ? (val==='1' ? 'bg-[#22C55E] border-[#22C55E] text-[#052e0d] ring-2 ring-white/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' 
                                : val==='2' ? 'bg-[#FACC15] border-[#FACC15] text-[#3b3005] ring-2 ring-white/50 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105' 
                                : 'bg-[#EF4444] border-[#EF4444] text-[#3b0b0b] ring-2 ring-white/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105')
                              : 'bg-white/5 border-white/10 text-[#B8BAC4] hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          {form.qDeliverablesMet===val && <span className="mr-1">✓</span>}
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-[#B8BAC4] mb-2">Selected: {form.qDeliverablesMet==='1' ? '1 – Fully Met' : form.qDeliverablesMet==='2' ? '2 – Partially Met' : '3 – Not Met'}</div>
                    <textarea className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white mt-2 focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Justification" value={form.jDeliverablesMet} onChange={e=>setField('jDeliverablesMet', e.target.value)} />
                  </div>
                  <div id="qQualityCompleteness" className={`p-4 rounded-xl border ${invalidFields['qQualityCompleteness'] ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}>
                    <label className="text-white block mb-2">Quality and completeness</label>
                    <div role="radiogroup" aria-label="Quality rating" className="flex gap-3 mb-2">
                      {['1','2','3'].map(val => (
                        <button 
                          type="button" 
                          role="radio" 
                          aria-checked={form.qQualityCompleteness===val} 
                          key={val} 
                          onClick={()=>setField('qQualityCompleteness', val)} 
                          className={`
                            px-4 py-2 rounded-xl border transition-all duration-300 font-montserrat font-medium
                            ${form.qQualityCompleteness===val 
                              ? (val==='1' ? 'bg-[#22C55E] border-[#22C55E] text-[#052e0d] ring-2 ring-white/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' 
                                : val==='2' ? 'bg-[#FACC15] border-[#FACC15] text-[#3b3005] ring-2 ring-white/50 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105' 
                                : 'bg-[#EF4444] border-[#EF4444] text-[#3b0b0b] ring-2 ring-white/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105')
                              : 'bg-white/5 border-white/10 text-[#B8BAC4] hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          {form.qQualityCompleteness===val && <span className="mr-1">✓</span>}
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-[#B8BAC4] mb-2">Selected: {form.qQualityCompleteness==='1' ? '1 – Fully Met' : form.qQualityCompleteness==='2' ? '2 – Partially Met' : '3 – Not Met'}</div>
                    <textarea className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white mt-2 focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Justification" value={form.jQualityCompleteness} onChange={e=>setField('jQualityCompleteness', e.target.value)} />
                  </div>
                  <div id="qEvidenceAccessibility" className={`p-4 rounded-xl border ${invalidFields['qEvidenceAccessibility'] ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}>
                    <label className="text-white block mb-2">Accessibility of supporting evidence</label>
                    <div role="radiogroup" aria-label="Evidence accessibility rating" className="flex gap-3 mb-2">
                      {['1','2','3'].map(val => (
                        <button 
                          type="button" 
                          role="radio" 
                          aria-checked={form.qEvidenceAccessibility===val} 
                          key={val} 
                          onClick={()=>setField('qEvidenceAccessibility', val)} 
                          className={`
                            px-4 py-2 rounded-xl border transition-all duration-300 font-montserrat font-medium
                            ${form.qEvidenceAccessibility===val 
                              ? (val==='1' ? 'bg-[#22C55E] border-[#22C55E] text-[#052e0d] ring-2 ring-white/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' 
                                : val==='2' ? 'bg-[#FACC15] border-[#FACC15] text-[#3b3005] ring-2 ring-white/50 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105' 
                                : 'bg-[#EF4444] border-[#EF4444] text-[#3b0b0b] ring-2 ring-white/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105')
                              : 'bg-white/5 border-white/10 text-[#B8BAC4] hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          {form.qEvidenceAccessibility===val && <span className="mr-1">✓</span>}
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-[#B8BAC4] mb-2">Selected: {form.qEvidenceAccessibility==='1' ? '1 – Fully Met' : form.qEvidenceAccessibility==='2' ? '2 – Partially Met' : '3 – Not Met'}</div>
                    <textarea className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white mt-2 focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Justification" value={form.jEvidenceAccessibility} onChange={e=>setField('jEvidenceAccessibility', e.target.value)} />
                  </div>
                  <div id="qBudgetAlignment" className={`p-4 rounded-xl border ${invalidFields['qBudgetAlignment'] ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}>
                    <label className="text-white block mb-2">Budget alignment (value for money)</label>
                    <div role="radiogroup" aria-label="Budget alignment rating" className="flex gap-3 mb-2">
                      {['1','2','3'].map(val => (
                        <button 
                          type="button" 
                          role="radio" 
                          aria-checked={form.qBudgetAlignment===val} 
                          key={val} 
                          onClick={()=>setField('qBudgetAlignment', val)} 
                          className={`
                            px-4 py-2 rounded-xl border transition-all duration-300 font-montserrat font-medium
                            ${form.qBudgetAlignment===val 
                              ? (val==='1' ? 'bg-[#22C55E] border-[#22C55E] text-[#052e0d] ring-2 ring-white/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' 
                                : val==='2' ? 'bg-[#FACC15] border-[#FACC15] text-[#3b3005] ring-2 ring-white/50 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105' 
                                : 'bg-[#EF4444] border-[#EF4444] text-[#3b0b0b] ring-2 ring-white/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105')
                              : 'bg-white/5 border-white/10 text-[#B8BAC4] hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          {form.qBudgetAlignment===val && <span className="mr-1">✓</span>}
                          {val}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-[#B8BAC4] mb-2">Selected: {form.qBudgetAlignment==='1' ? '1 – Fully Met' : form.qBudgetAlignment==='2' ? '2 – Partially Met' : form.qBudgetAlignment==='3' ? '3 – Not Met' : 'None'}</div>
                    <textarea className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg p-3 w-full text-white mt-2 focus:ring-2 focus:ring-[#A96AFF] transition" placeholder="Justification" value={form.jBudgetAlignment} onChange={e=>setField('jBudgetAlignment', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/20 rounded-2xl p-6">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Section 4: Recommendation & Feedback</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white block mb-2">Final Recommendation</label>
                    <div className="flex gap-2">
                      {['Approved','Rejected'].map(val => (
                        <button type="button" key={val} onClick={()=>setField('finalRecommendation', val)} className={`px-4 py-2 rounded-lg border transition-all duration-300 hover:scale-105 ${form.finalRecommendation===val ? (val==='Approved' ? 'bg-green-600/20 border-green-500 text-green-300' : 'bg-red-600/20 border-red-500 text-red-300') : 'bg-white/10 border-white/20 text-white'}`}>{val}</button>
                      ))}
                    </div>
                  </div>
                  {form.finalRecommendation === 'Approved' && (
                    <textarea id="approvedWhy" className={`bg-[#0C021E] border ${invalidFields['approvedWhy'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-[#A96AFF] transition`} placeholder="Why it meets success criteria" value={form.approvedWhy} onChange={e=>setField('approvedWhy', e.target.value)} />
                  )}
                  {form.finalRecommendation === 'Rejected' && (
                    <textarea id="rejectedWhy" className={`bg-[#0C021E] border ${invalidFields['rejectedWhy'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-[#A96AFF] transition`} placeholder="What was missing or not satisfactory" value={form.rejectedWhy} onChange={e=>setField('rejectedWhy', e.target.value)} />
                  )}
                  {form.finalRecommendation === 'Rejected' && (
                    <textarea id="suggestedChanges" className={`bg-[#0C021E] border ${invalidFields['suggestedChanges'] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#9D9FA9]'} rounded-lg p-3 w-full text-white focus:ring-2 focus:ring-[#A96AFF] transition`} placeholder="Suggested Changes" value={form.suggestedChanges} onChange={e=>setField('suggestedChanges', e.target.value)} />
                  )}
                </div>
              </div>

              <button disabled={submitting} className="font-montserrat px-6 py-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white rounded-xl border border-[#9D9FA9] hover:scale-105 transition-all duration-300">
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </main>
        </div>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
