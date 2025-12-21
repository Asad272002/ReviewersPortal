'use client';

import { useState, useEffect, useRef } from 'react';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { useAuth } from '../context/AuthContext';
import GuideManager from "../components/admin/GuideManager";
import * as THREE from 'three';

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
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchGuides();
    initThreeJS();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const initThreeJS = () => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    rendererRef.current = renderer;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Create guide-themed particles
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const guideColors = [
      new THREE.Color(0x9050E9), // Purple
      new THREE.Color(0xA96AFF), // Light purple
      new THREE.Color(0x6B46C1), // Deep purple
      new THREE.Color(0x8B5CF6), // Medium purple
      new THREE.Color(0xC084FC), // Soft purple
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const color = guideColors[Math.floor(Math.random() * guideColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 3 + 1;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Create floating geometric shapes (books, documents)
    const shapes: THREE.Mesh[] = [];
    
    // Create book-like shapes
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.BoxGeometry(0.3, 0.4, 0.05);
      const material = new THREE.MeshBasicMaterial({
        color: guideColors[Math.floor(Math.random() * guideColors.length)],
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      const shape = new THREE.Mesh(geometry, material);
      
      shape.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      
      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    // Create document-like planes
    for (let i = 0; i < 6; i++) {
      const geometry = new THREE.PlaneGeometry(0.4, 0.6);
      const material = new THREE.MeshBasicMaterial({
        color: guideColors[Math.floor(Math.random() * guideColors.length)],
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const shape = new THREE.Mesh(geometry, material);
      
      shape.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
      
      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    camera.position.z = 8;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Rotate particles
      particleSystem.rotation.x += 0.001;
      particleSystem.rotation.y += 0.002;

      // Animate shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.005 + index * 0.001;
        shape.rotation.y += 0.003 + index * 0.0005;
        shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.001;
      });

      // Update particle positions
      const positions = particleSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i * 0.1) * 0.002;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  };

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
      <div className="flex flex-col h-screen bg-[#0C021E] relative overflow-hidden">
        {/* Three.js Background */}
        <div 
          ref={mountRef} 
          className="fixed inset-0 z-0"
          style={{ pointerEvents: 'none' }}
        />
        
        <div className="relative z-10 flex flex-col h-full">
          <Header title="Process & Guides" />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                    <div className="text-white font-montserrat text-sm sm:text-base">Loading guides...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-4 text-red-300 shadow-2xl text-sm sm:text-base">
                  Error: {error}
                </div>
              ) : (
              <>
                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
                  <h2 className="font-montserrat font-semibold text-xl sm:text-2xl text-white mb-3 sm:mb-4">Step-by-Step Review Overview</h2>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex">
                      <div className="flex flex-col items-center mr-3 sm:mr-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm sm:text-base">1</span>
                        </div>
                        <div className="w-0.5 h-full bg-gradient-to-b from-[#9050E9] to-[#A96AFF] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-lg sm:text-xl text-white mb-2">Initial Screening</h3>
                        <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4] mb-3 sm:mb-4">
                          Review proposals for completeness and adherence to basic requirements. Ensure all required sections are present and properly formatted.
                        </p>
                        <div className="bg-[#9050E9]/10 p-3 sm:p-4 rounded-xl border border-[#9050E9]/30 font-montserrat text-xs sm:text-sm text-[#B8BAC4]">
                          <strong className="text-[#A96AFF]">Tip:</strong> Use the proposal checklist to ensure all required elements are present before proceeding with the detailed review.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-3 sm:mr-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm sm:text-base">2</span>
                        </div>
                        <div className="w-0.5 h-full bg-gradient-to-b from-[#9050E9] to-[#A96AFF] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-white mb-2">Technical Assessment</h3>
                        <p className="font-montserrat text-[#B8BAC4] mb-4">
                          Evaluate the technical feasibility, innovation, and implementation approach. Consider the technical expertise of the team and the soundness of the proposed solution.
                        </p>
                        <div className="bg-[#9050E9]/10 p-4 rounded-xl border border-[#9050E9]/30 font-montserrat text-sm text-[#B8BAC4]">
                          <strong className="text-[#A96AFF]">Tip:</strong> Focus on whether the technical approach is appropriate for the stated problem and if the team has demonstrated the necessary expertise.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">3</span>
                        </div>
                        <div className="w-0.5 h-full bg-gradient-to-b from-[#9050E9] to-[#A96AFF] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-white mb-2">Budget Review</h3>
                        <p className="font-montserrat text-[#B8BAC4] mb-4">
                          Analyze the proposed budget for reasonableness, efficiency, and alignment with project goals. Ensure all expenses are justified and necessary for the project&apos;s success.
                        </p>
                        <div className="bg-[#9050E9]/10 p-4 rounded-xl border border-[#9050E9]/30 font-montserrat text-sm text-[#B8BAC4]">
                          <strong className="text-[#A96AFF]">Tip:</strong> Compare the budget allocation with industry standards and look for any inconsistencies or inflated costs.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">4</span>
                        </div>
                        <div className="w-0.5 h-full bg-gradient-to-b from-[#9050E9] to-[#A96AFF] mt-2"></div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-white mb-2">Timeline Evaluation</h3>
                        <p className="font-montserrat text-[#B8BAC4] mb-4">
                          Review the proposed timeline and milestones for realism and achievability. Ensure the project can be completed within the proposed timeframe.
                        </p>
                        <div className="bg-[#9050E9]/10 p-4 rounded-xl border border-[#9050E9]/30 font-montserrat text-sm text-[#B8BAC4]">
                          <strong className="text-[#A96AFF]">Tip:</strong> Look for clear dependencies between milestones and whether contingency time has been factored into the schedule.
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">5</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-montserrat font-medium text-xl text-white mb-2">Final Scoring & Feedback</h3>
                        <p className="font-montserrat text-[#B8BAC4] mb-4">
                          Compile scores from all evaluation criteria and provide comprehensive feedback. Include both strengths and areas for improvement.
                        </p>
                        <div className="bg-[#9050E9]/10 backdrop-blur-sm p-4 rounded-xl border border-[#9050E9]/30 font-montserrat text-sm text-[#B8BAC4] shadow-lg">
                          <strong className="text-[#A96AFF]">Tip:</strong> Be specific in your feedback and provide actionable suggestions that can help proposers improve their submissions.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8 shadow-2xl">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">How Reviewers Assess Proposals</h2>
                  <div className="space-y-6">
                    <div className="border-b border-white/20 pb-6">
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">Scoring Criteria</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        Proposals are evaluated on a scale of 1-5 across multiple dimensions including technical feasibility, innovation, team capability, budget reasonableness, and potential impact. Each dimension is weighted according to its importance to the overall evaluation.
                      </p>
                    </div>

                    <div className="border-b border-white/20 pb-6">
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">Consensus Building</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        After individual assessments, reviewers participate in consensus discussions to reconcile any significant differences in scores and to arrive at a final recommendation. This collaborative approach ensures a fair and thorough evaluation process.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">Feedback Formulation</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        Reviewers provide detailed, constructive feedback that highlights both strengths and areas for improvement. Feedback is specific, actionable, and tied directly to the evaluation criteria to help proposers understand the assessment and improve future submissions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8 mt-8">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Guides</h2>
                  <div className="space-y-6">
                    {publishedGuides.length > 0 ? (
                      publishedGuides.map((guide, index) => (
                        <div
                          key={guide.id}
                          className={`${index < publishedGuides.length - 1 ? "border-b border-white/20 pb-6" : ""} bg-white/5 rounded-xl p-6 border border-[#9D9FA9]`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Image src="/icons/guides-icon.svg" alt="Guide" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-white">{guide.title}</h3>

                            {guide.category && (
                              <span className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white px-3 py-1 rounded-full text-xs font-montserrat shadow-lg">
                                {guide.category}
                              </span>
                            )}
                          </div>

                          <p className="font-montserrat text-[#B8BAC4] mb-3 pl-9">{guide.description}</p>

                          {guide.content && (
                            <div className="font-montserrat text-[#9D9FA9] mb-3 pl-9 whitespace-pre-wrap bg-white/5 rounded-lg p-4 border border-[#9D9FA9]">
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
                                      className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-4 py-2 rounded-xl border border-[#9050E9]/30 hover:bg-[#9050E9]/20"
                                    >
                                      {label}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="ml-9 mt-4 text-xs text-[#9D9FA9] font-montserrat bg-white/5 rounded-lg p-3 border border-[#9D9FA9]">
                            <span className="text-[#A96AFF]">Created:</span> {new Date(guide.createdAt).toLocaleDateString()}
                            {guide.updatedAt !== guide.createdAt && (
                              <span className="ml-4"><span className="text-[#A96AFF]">Updated:</span> {new Date(guide.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#B8BAC4] font-montserrat text-center py-12 bg-white/5 rounded-xl border border-[#9D9FA9]">
                        <div className="text-4xl mb-4">📚</div>
                        <p className="text-lg">No guides available at this time.</p>
                        <p className="text-sm text-[#9D9FA9] mt-2">Check back later for new content.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8 mt-8">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Frequently Asked Questions</h2>
                  <div className="space-y-6">
                    <div className="border-b border-white/20 pb-6">
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">How long should a review take?</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        A thorough review typically takes 2-3 hours per proposal, depending on the complexity and length of the submission. Reviewers should allocate sufficient time to carefully evaluate all aspects of the proposal.
                      </p>
                    </div>

                    <div className="border-b border-white/20 pb-6">
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">What if I have a conflict of interest?</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        If you identify a potential conflict of interest with a proposal, you should immediately notify the review coordinator and recuse yourself from evaluating that specific proposal. Transparency is essential to maintaining the integrity of the review process.
                      </p>
                    </div>

                    <div className="border-b border-white/20 pb-6">
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">How detailed should my feedback be?</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        Feedback should be comprehensive enough to provide clear guidance to proposers. Aim for 2-3 paragraphs per major evaluation criterion, with specific examples and suggestions for improvement where applicable.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-montserrat font-medium text-xl text-white mb-3">What if I need technical clarification?</h3>
                      <p className="font-montserrat text-[#B8BAC4]">
                        If you need clarification on technical aspects of a proposal, you can submit questions through the review coordinator. Direct contact with proposers is not permitted to maintain the anonymity and fairness of the review process.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
                {user?.role === 'admin' && (
                  <div className="mt-8">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                      <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Manage Guides</h2>
                      <GuideManager />
                    </div>
                  </div>
                )}
              <Footer />
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
