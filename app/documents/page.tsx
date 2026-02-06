'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ProposalForm from "../components/ProposalForm";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from '../context/AuthContext';
import Image from "next/image";
import { FileText, CheckCircle, DollarSign, Clock, Users, Lightbulb, ChevronDown, ChevronUp, Send, FileCheck, Sparkles } from 'lucide-react';

export default function Documents() {
  const [showProposalForm, setShowProposalForm] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleFormSuccess = () => {
    // Optionally hide the form after successful submission
    setTimeout(() => setShowProposalForm(false), 3000);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Create document-themed particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;

      // Document-themed colors (blues, purples, whites)
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i] = 0.56; colors[i + 1] = 0.31; colors[i + 2] = 0.91; // Purple
      } else if (colorChoice < 0.7) {
        colors[i] = 0.4; colors[i + 1] = 0.7; colors[i + 2] = 1.0; // Light blue
      } else {
        colors[i] = 1.0; colors[i + 1] = 1.0; colors[i + 2] = 1.0; // White
      }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create floating geometric shapes representing documents
    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.PlaneGeometry(0.3, 0.4);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.5, 0.5),
        transparent: true,
        opacity: 0.1,
        wireframe: true
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

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate particles
      particles.rotation.x += 0.001;
      particles.rotation.y += 0.002;

      // Animate floating shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.005 + index * 0.001;
        shape.rotation.y += 0.003 + index * 0.001;
        shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.001;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);
  
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0C021E] relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
        />
        <Header title="Idea Box" />
        
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Submission Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-1 overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-purple-500/10 hover:border-white/20">
                <div className="bg-[#0C021E]/50 rounded-[22px] p-6 sm:p-10">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div>
                      <h2 className="font-montserrat font-bold text-3xl text-white mb-2 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-[#A96AFF]" />
                        Submit Your Proposal
                      </h2>
                      <p className="font-montserrat text-[#B8BAC4] text-lg max-w-xl">
                        Have a groundbreaking idea? Share it with us. Your proposal could be the next big thing we support.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowProposalForm(!showProposalForm)}
                      className="group flex items-center gap-2 font-montserrat px-8 py-4 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
                    >
                      {showProposalForm ? (
                        <>
                          <span>Hide Form</span>
                          <ChevronUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                        </>
                      ) : (
                        <>
                          <span>Start Submission</span>
                          <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out ${showProposalForm ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}`}>
                    {showProposalForm ? (
                      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 sm:p-8 animate-fadeIn">
                        <ProposalForm onSubmitSuccess={handleFormSuccess} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:bg-white/10 transition-colors">
                           <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-[#A96AFF]">
                             <FileText className="w-6 h-6" />
                           </div>
                           <h3 className="text-white font-semibold mb-2">Detailed Documentation</h3>
                           <p className="text-sm text-gray-400">Provide comprehensive details about your project vision and goals.</p>
                         </div>
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:bg-white/10 transition-colors">
                           <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                             <DollarSign className="w-6 h-6" />
                           </div>
                           <h3 className="text-white font-semibold mb-2">Budget Planning</h3>
                           <p className="text-sm text-gray-400">Outline your financial requirements and resource allocation.</p>
                         </div>
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:bg-white/10 transition-colors">
                           <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 text-green-400">
                             <Send className="w-6 h-6" />
                           </div>
                           <h3 className="text-white font-semibold mb-2">Direct Submission</h3>
                           <p className="text-sm text-gray-400">Send your proposal directly to our review team for evaluation.</p>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Guidelines Section */}
                <div className="bg-[#0C021E]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
                  <h2 className="font-montserrat font-bold text-2xl text-white mb-6 flex items-center gap-3">
                    <Lightbulb className="w-6 h-6 text-yellow-400" />
                    Key Guidelines
                  </h2>
                  <div className="space-y-4">
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold">1</span>
                        </div>
                        <div>
                          <h3 className="font-montserrat font-semibold text-lg text-white mb-1">Proposal Structure</h3>
                          <p className="font-montserrat text-sm text-[#B8BAC4]">Follow the standard structure: Executive Summary, Problem Statement, Solution, and Technical Details.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold">2</span>
                        </div>
                        <div>
                          <h3 className="font-montserrat font-semibold text-lg text-white mb-1">Budget Breakdown</h3>
                          <p className="font-montserrat text-sm text-[#B8BAC4]">Include a detailed budget breakdown with justification for all major expenses and resource costs.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9050E9] to-[#A96AFF] flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                          <span className="text-white font-bold">3</span>
                        </div>
                        <div>
                          <h3 className="font-montserrat font-semibold text-lg text-white mb-1">Timeline & Milestones</h3>
                          <p className="font-montserrat text-sm text-[#B8BAC4]">Define clear, measurable milestones with specific deliverables and realistic timelines.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="bg-[#0C021E]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
                  <h2 className="font-montserrat font-bold text-2xl text-white mb-6 flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-emerald-400" />
                    Document Checklist
                  </h2>
                  <div className="space-y-3">
                    {[
                      "Executive Summary (max 500 words)",
                      "Problem Statement and Solution",
                      "Technical Implementation Details",
                      "Team Background and Experience",
                      "Budget Breakdown with Justification",
                      "Timeline with Milestones"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="w-6 h-6 rounded-full border-2 border-[#9050E9] flex items-center justify-center shrink-0">
                          <div className="w-3 h-3 bg-[#A96AFF] rounded-full"></div>
                        </div>
                        <p className="font-montserrat text-[#B8BAC4] font-medium">{item}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 text-white/80">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-medium">Double-check all items before submitting</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}