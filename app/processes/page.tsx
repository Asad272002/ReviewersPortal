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
import { FileText, CheckCircle, ExternalLink, Link as LinkIcon, FileSpreadsheet, File } from 'lucide-react';

interface Process {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  order: number;
  status: 'published' | 'draft' | 'archived';
  steps: { title: string; description: string }[];
  requirements: string[];
  attachments: {
    links: { title: string; url: string }[];
    files: { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function Processes() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
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
      const loadedProcesses = data.processes || [];
      setProcesses(loadedProcesses);
      
      // Set the first published process as selected by default
      const published = loadedProcesses
        .filter((p: Process) => p.status === 'published')
        .sort((a: Process, b: Process) => a.order - b.order);
        
      if (published.length > 0) {
        setSelectedProcess(published[0]);
      }
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
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ background: 'transparent' }} />
        <Header title="Process Documentation" />
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {/* Process Navigation */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-4">
                  {publishedProcesses.map((process) => (
                    <button
                      key={process.id}
                      onClick={() => setSelectedProcess(process)}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                        selectedProcess?.id === process.id
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      {process.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Process Content */}
              {selectedProcess ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Overview Card */}
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
                    <p className="text-slate-300 leading-relaxed">{selectedProcess.description}</p>
                  </div>

                  {/* Steps */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Process Steps</h3>
                    {selectedProcess.steps?.map((step, index) => (
                      <div 
                        key={index}
                        className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-slate-700/30 p-4 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-1">{step.title}</h4>
                            <p className="text-sm text-slate-400">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  {/* Requirements */}
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      Requirements
                    </h3>
                    <ul className="space-y-3">
                      {selectedProcess.requirements?.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resources (Links & Files) */}
                  {(selectedProcess.attachments?.links?.length > 0 || selectedProcess.attachments?.files?.length > 0) && (
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-purple-400" />
                      Resources
                    </h3>
                    <div className="space-y-3">
                      {/* Files */}
                      {selectedProcess.attachments?.files?.map((file, idx) => (
                        <a 
                          key={`file-${idx}`} 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors border border-slate-600/30 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-lg">
                                {file.type === 'excel' ? <FileSpreadsheet className="w-5 h-5 text-green-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{file.title}</div>
                              <div className="text-xs text-slate-400 uppercase">{file.type}</div>
                            </div>
                          </div>
                        </a>
                      ))}

                      {/* Links */}
                      {selectedProcess.attachments?.links?.map((link, idx) => (
                        <a 
                          key={`link-${idx}`} 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors border border-slate-600/30 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-lg">
                                <LinkIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{link.title}</div>
                              <div className="text-xs text-slate-400">External Link</div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              </div>
              ) : (
                <div className="text-center text-slate-400 py-12">
                  <p>No process selected or available.</p>
                </div>
              )}
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}