'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from '../context/AuthContext';
import ProcessManager from "../components/admin/ProcessManager";
import Image from "next/image";

interface Process {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  order: number;
  status: 'published' | 'draft' | 'archived';
  attachments: {
    links: { title: string; url: string }[];
    files: { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function Processes() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Create floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 100;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x9050E9,
      transparent: true,
      opacity: 0.6
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 3;

    const animate = () => {
      requestAnimationFrame(animate);
      
      particlesMesh.rotation.x += 0.001;
      particlesMesh.rotation.y += 0.002;
      
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

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/processes');
      if (!response.ok) {
        throw new Error('Failed to fetch processes');
      }
      const data = await response.json();
      setProcesses(data.processes || []);
    } catch (err) {
      console.error('Error fetching processes:', err);
      setError('Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const publishedProcesses = Array.isArray(processes) ? processes.filter(process => process.status === 'published').sort((a, b) => a.order - b.order) : [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ background: 'transparent' }}
        />
        <Header title="Process Documentation" />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white font-montserrat text-sm sm:text-base">Loading processes...</div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-red-400 font-montserrat text-sm sm:text-base">{error}</div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 sm:mb-12">
                  <h1 className="font-montserrat font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-3 sm:mb-4">
                    Process Documentation
                  </h1>
                  <p className="font-montserrat text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto px-4">
                    Comprehensive documentation of our processes and procedures to help you understand our workflows and standards.
                  </p>
                </div>

                <div className="bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] p-4 sm:p-6">
                  <h2 className="font-montserrat font-semibold text-xl sm:text-2xl text-white mb-4 sm:mb-6">Process Documentation</h2>
                  <div className="space-y-4 sm:space-y-6">
                    {publishedProcesses.length > 0 ? (
                      publishedProcesses.map((process, index) => (
                        <div key={process.id} className={index < publishedProcesses.length - 1 ? "border-b border-[#9D9FA9] pb-4 sm:pb-6" : ""}>
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                            <Image src="/icons/document-icon.svg" alt="Process" width={20} height={20} className="sm:w-6 sm:h-6" />
                            <h3 className="font-montserrat font-medium text-lg sm:text-xl text-white">{process.title}</h3>
                            <span className="bg-[#9050E9] text-white px-2 py-1 rounded text-xs font-montserrat">
                              {process.category}
                            </span>
                          </div>
                          <p className="font-montserrat text-sm sm:text-base text-[#9D9FA9] mb-2 sm:mb-3 pl-6 sm:pl-9">{process.description}</p>
                          {process.content && (
                            <div className="font-montserrat text-xs sm:text-sm text-[#B8BAC4] mb-2 sm:mb-3 pl-6 sm:pl-9 whitespace-pre-wrap">
                              {process.content}
                            </div>
                          )}
                          {process.attachments && (process.attachments.links.length > 0 || process.attachments.files.length > 0) && (
                            <div className="ml-9 mt-3">
                              {process.attachments.links.length > 0 && (
                                <div className="mb-3">
                                  <p className="font-montserrat text-sm text-[#9D9FA9] mb-2">Related Links:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {process.attachments.links.map((link, idx) => (
                                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors bg-[rgba(144,80,233,0.1)] px-3 py-1 rounded border border-[#9050E9] flex items-center gap-1">
                                        🔗 {link.title}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {process.attachments.files.length > 0 && (
                                <div>
                                  <p className="font-montserrat text-sm text-[#9D9FA9] mb-2">Files & Documents:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {process.attachments.files.map((file, idx) => (
                                      <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors bg-[rgba(144,80,233,0.1)] px-3 py-1 rounded border border-[#9050E9] flex items-center gap-1">
                                        {file.type === 'pdf' ? '📄' : file.type === 'doc' ? '📝' : file.type === 'excel' ? '📊' : file.type === 'powerpoint' ? '📽️' : '📎'} {file.title}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="ml-9 mt-3 text-xs text-[#9D9FA9] font-montserrat">
                            Created: {new Date(process.createdAt).toLocaleDateString()}
                            {process.updatedAt !== process.createdAt && (
                              <span className="ml-4">Updated: {new Date(process.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No process documentation available at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}