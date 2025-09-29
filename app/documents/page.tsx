'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ProposalForm from "../components/ProposalForm";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from '../context/AuthContext';
import DocumentManager from "../components/admin/DocumentManager";
import Image from "next/image";

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
      <div className="flex flex-col min-h-screen bg-[#0C021E] relative">
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
        />
        <Header title="Requirement Documents" />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
              <h2 className="font-montserrat font-semibold text-xl sm:text-2xl text-white mb-4 sm:mb-6">Key Guidelines for Proposers</h2>
              <div className="space-y-4 sm:space-y-6">
                <div className="border-b border-white/20 pb-4 sm:pb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-full shadow-lg">
                      <span className="text-white font-semibold text-sm sm:text-base">1</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-lg sm:text-xl text-white">Proposal Structure</h3>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4] pl-8 sm:pl-11">All proposals must follow the standard structure outlined in the template document.</p>
                </div>
                
                <div className="border-b border-white/20 pb-4 sm:pb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-full shadow-lg">
                      <span className="text-white font-semibold text-sm sm:text-base">2</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-lg sm:text-xl text-white">Budget Breakdown</h3>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4] pl-8 sm:pl-11">Detailed budget breakdowns must be included with clear justification for all expenses.</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-full shadow-lg">
                      <span className="text-white font-semibold text-sm sm:text-base">3</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-lg sm:text-xl text-white">Timeline and Milestones</h3>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4] pl-8 sm:pl-11">Clearly defined milestones with specific deliverables and timeline must be provided.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 shadow-2xl">
              <h2 className="font-montserrat font-semibold text-xl sm:text-2xl text-white mb-4 sm:mb-6">Proposal Document Checklist</h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Executive Summary (max 500 words)</p>
                </div>
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Problem Statement and Solution</p>
                </div>
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Technical Implementation Details</p>
                </div>
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-sm">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Team Background and Experience</p>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-sm">
                    <div className="w-3 h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Budget Breakdown with Justification</p>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 mt-1 border-2 border-[#9050E9] rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-sm">
                    <div className="w-3 h-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-sm sm:text-base text-[#B8BAC4]">Timeline with Milestones</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Document Templates</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/20 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-[#9D9FA9]">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    </div>
                    <span className="font-montserrat text-white font-medium">Proposal Template</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-4 py-2 rounded-xl border border-[#9050E9]/30 hover:bg-[#9050E9]/20">
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-b border-white/20 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-[#9D9FA9]">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    </div>
                    <span className="font-montserrat text-white font-medium">Budget Spreadsheet</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-4 py-2 rounded-xl border border-[#9050E9]/30 hover:bg-[#9050E9]/20">
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    </div>
                    <span className="font-montserrat text-white font-medium">Milestone Tracker</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-[#9050E9]/30 shadow-lg hover:shadow-xl hover:bg-[#9050E9]/20 hover:scale-105">
                    Download
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white">Submit Your Proposal</h2>
                <button 
                  onClick={() => setShowProposalForm(!showProposalForm)}
                  className="font-montserrat px-6 py-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white rounded-xl border border-[#9D9FA9] hover:scale-105 transition-all duration-300"
                >
                  {showProposalForm ? 'Hide Form' : 'Show Form'}
                </button>
              </div>
              
              {showProposalForm ? (
                <div className="bg-white/5 rounded-xl border border-[#9D9FA9] p-6">
                  <ProposalForm onSubmitSuccess={handleFormSuccess} />
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl border border-[#9D9FA9] p-6">
                  <p className="font-montserrat text-[#B8BAC4] mb-4">
                    Ready to submit your proposal? Click the button above to access the submission form. 
                    Your proposal will be stored in our Google Sheets database for review.
                  </p>
                  <div className="flex items-center gap-3 text-[#9050E9]">
                    <span className="text-2xl">📝</span>
                    <span className="font-montserrat text-sm">All required fields must be completed before submission</span>
                  </div>
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