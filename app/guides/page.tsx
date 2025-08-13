'use client';

import { useState, useEffect } from 'react';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { useAuth } from '../context/AuthContext';
import GuideManager from "../components/admin/GuideManager";

interface Guide {
  id: string;
  title: string;
  description: string;
  content?: string;
  order: number;
  isPublished: boolean;
  // Handles both string URLs and object-shaped attachments
  attachments?: Array<string | { id?: string; name?: string; url?: string }>;
  category?: string; // <-- added
  createdAt: string;
  updatedAt: string;
}

export default function Guides() {
  const { user } = useAuth();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/guides', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch guides');
      }
      const data = await response.json();

      // Normalize data a bit so UI is resilient
      const normalized: Guide[] = (Array.isArray(data) ? data : []).map((g: any) => ({
        id: g?.id,
        title: g?.title ?? '',
        description: g?.description ?? '',
        content: g?.content ?? '',
        order: typeof g?.order === 'number' ? g.order : parseInt(g?.order ?? '1', 10) || 1,
        isPublished: !!g?.isPublished,
        category: g?.category ?? undefined,
        attachments: Array.isArray(g?.attachments) ? g.attachments : [],
        createdAt: g?.createdAt ?? new Date().toISOString(),
        updatedAt: g?.updatedAt ?? g?.createdAt ?? new Date().toISOString(),
      }));

      setGuides(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const publishedGuides = Array.isArray(guides)
    ? [...guides]
        .filter((guide) => guide.isPublished)
        .sort((a, b) => (a.order ?? 1) - (b.order ?? 1))
    : [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Process & Guides" />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white font-montserrat">Loading guides...</div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                Error: {error}
              </div>
            ) : (
              <>
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Step-by-Step Review Overview</h2>
                  <div className="space-y-6">
                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-[#9050E9] flex items-center justify-center">
                          <span className="text-white font-bold">1</span>
                        </div>
                        <div className="w-0.5 h-full bg-[#9050E9] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Initial Screening</h3>
                        <p className="font-montserrat text-[#9D9FA9] mb-4">
                          Review proposals for completeness and adherence to basic requirements. Ensure all required sections are present and properly formatted.
                        </p>
                        <div className="bg-[rgba(144,80,233,0.05)] p-3 rounded border border-[#9050E9] font-montserrat text-sm text-[#9D9FA9]">
                          <strong>Tip:</strong> Use the proposal checklist to ensure all required elements are present before proceeding with the detailed review.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-[#9050E9] flex items-center justify-center">
                          <span className="text-white font-bold">2</span>
                        </div>
                        <div className="w-0.5 h-full bg-[#9050E9] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Technical Assessment</h3>
                        <p className="font-montserrat text-[#9D9FA9] mb-4">
                          Evaluate the technical feasibility, innovation, and implementation approach. Consider the technical expertise of the team and the soundness of the proposed solution.
                        </p>
                        <div className="bg-[rgba(144,80,233,0.05)] p-3 rounded border border-[#9050E9] font-montserrat text-sm text-[#9D9FA9]">
                          <strong>Tip:</strong> Focus on whether the technical approach is appropriate for the stated problem and if the team has demonstrated the necessary expertise.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-[#9050E9] flex items-center justify-center">
                          <span className="text-white font-bold">3</span>
                        </div>
                        <div className="w-0.5 h-full bg-[#9050E9] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Budget Review</h3>
                        <p className="font-montserrat text-[#9D9FA9] mb-4">
                          Analyze the proposed budget for reasonableness, efficiency, and alignment with project goals. Ensure all expenses are justified and necessary for the project&apos;s success.
                        </p>
                        <div className="bg-[rgba(144,80,233,0.05)] p-3 rounded border border-[#9050E9] font-montserrat text-sm text-[#9D9FA9]">
                          <strong>Tip:</strong> Compare the budget allocation with industry standards and look for any inconsistencies or inflated costs.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-[#9050E9] flex items-center justify-center">
                          <span className="text-white font-bold">4</span>
                        </div>
                        <div className="w-0.5 h-full bg-[#9050E9] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Timeline Evaluation</h3>
                        <p className="font-montserrat text-[#9D9FA9] mb-4">
                          Review the proposed timeline and milestones for realism and achievability. Ensure the project can be completed within the proposed timeframe.
                        </p>
                        <div className="bg-[rgba(144,80,233,0.05)] p-3 rounded border border-[#9050E9] font-montserrat text-sm text-[#9D9FA9]">
                          <strong>Tip:</strong> Look for clear dependencies between milestones and whether contingency time has been factored into the schedule.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-[#9050E9] flex items-center justify-center">
                          <span className="text-white font-bold">5</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Final Scoring & Feedback</h3>
                        <p className="font-montserrat text-[#9D9FA9] mb-4">
                          Compile scores from all evaluation criteria and provide comprehensive feedback. Include both strengths and areas for improvement.
                        </p>
                        <div className="bg-[rgba(144,80,233,0.05)] p-3 rounded border border-[#9050E9] font-montserrat text-sm text-[#9D9FA9]">
                          <strong>Tip:</strong> Be specific in your feedback and provide actionable suggestions that can help proposers improve their submissions.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">How Reviewers Assess Proposals</h2>
                  <div className="space-y-4">
                    <div className="border-b border-[#9D9FA9] pb-4">
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Scoring Criteria</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        Proposals are evaluated on a scale of 1-5 across multiple dimensions including technical feasibility, innovation, team capability, budget reasonableness, and potential impact. Each dimension is weighted according to its importance to the overall evaluation.
                      </p>
                    </div>

                    <div className="border-b border-[#9D9FA9] pb-4">
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Consensus Building</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        After individual assessments, reviewers participate in consensus discussions to reconcile any significant differences in scores and to arrive at a final recommendation. This collaborative approach ensures a fair and thorough evaluation process.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">Feedback Formulation</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        Reviewers provide detailed, constructive feedback that highlights both strengths and areas for improvement. Feedback is specific, actionable, and tied directly to the evaluation criteria to help proposers understand the assessment and improve future submissions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mt-8">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Guides</h2>
                  <div className="space-y-6">
                    {publishedGuides.length > 0 ? (
                      publishedGuides.map((guide, index) => (
                        <div
                          key={guide.id}
                          className={index < publishedGuides.length - 1 ? "border-b border-[#9D9FA9] pb-6" : ""}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Image src="/icons/guides-icon.svg" alt="Guide" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-white">{guide.title}</h3>

                            {guide.category && (
                              <span className="bg-[#9050E9] text-white px-2 py-1 rounded text-xs font-montserrat">
                                {guide.category}
                              </span>
                            )}
                          </div>

                          <p className="font-montserrat text-[#9D9FA9] mb-3 pl-9">{guide.description}</p>

                          {guide.content && (
                            <div className="font-montserrat text-[#B8BAC4] mb-3 pl-9 whitespace-pre-wrap">
                              {guide.content}
                            </div>
                          )}

                          {Array.isArray(guide.attachments) && guide.attachments.length > 0 && (
                            <div className="ml-9 mt-3">
                              <p className="font-montserrat text-sm text-[#9D9FA9] mb-2">Attachments:</p>
                              <div className="flex flex-wrap gap-2">
                                {guide.attachments.map((att, idx) => {
                                  const isString = typeof att === 'string';
                                  const href = isString ? att : att?.url || '#';
                                  const key = isString ? `${idx}-${att}` : att?.id || String(idx);
                                  const label = !isString && att?.name ? `📎 ${att.name}` : `📎 Attachment ${idx + 1}`;
                                  return (
                                    <a
                                      key={key}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors bg-[rgba(144,80,233,0.1)] px-3 py-1 rounded border border-[#9050E9]"
                                    >
                                      {label}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="ml-9 mt-3 text-xs text-[#9D9FA9] font-montserrat">
                            Created: {new Date(guide.createdAt).toLocaleDateString()}
                            {guide.updatedAt !== guide.createdAt && (
                              <span className="ml-4">Updated: {new Date(guide.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No guides available at this time.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mt-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    <div className="border-b border-[#9D9FA9] pb-4">
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">How long should a review take?</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        A thorough review typically takes 2-3 hours per proposal, depending on the complexity and length of the submission. Reviewers should allocate sufficient time to carefully evaluate all aspects of the proposal.
                      </p>
                    </div>

                    <div className="border-b border-[#9D9FA9] pb-4">
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">What if I have a conflict of interest?</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        If you identify a potential conflict of interest with a proposal, you should immediately notify the review coordinator and recuse yourself from evaluating that specific proposal. Transparency is essential to maintaining the integrity of the review process.
                      </p>
                    </div>

                    <div className="border-b border-[#9D9FA9] pb-4">
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">How detailed should my feedback be?</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        Feedback should be comprehensive enough to provide clear guidance to proposers. Aim for 2-3 paragraphs per major evaluation criterion, with specific examples and suggestions for improvement where applicable.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">What if I need technical clarification?</h3>
                      <p className="font-montserrat text-[#9D9FA9]">
                        If you need clarification on technical aspects of a proposal, you can submit questions through the review coordinator. Direct contact with proposers is not permitted to maintain the anonymity and fairness of the review process.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        {user?.role === 'admin' && (
          <div className="p-8">
            <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Manage Guides</h2>
            <GuideManager />
          </div>
        )}

        <LogoutButton />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
