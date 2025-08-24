'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";

import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";

import { useAuth } from '../context/AuthContext';
import ResourceManager from "../components/admin/ResourceManager";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  attachments?: string[];
  createdAt: string;
}

export default function Resources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchResources();
    
    // Three.js setup
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create resource-themed particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;
      
      // Resource-themed colors (blues, purples, teals)
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i] = 0.3; colors[i + 1] = 0.6; colors[i + 2] = 1.0; // Blue
      } else if (colorChoice < 0.66) {
        colors[i] = 0.6; colors[i + 1] = 0.3; colors[i + 2] = 1.0; // Purple
      } else {
        colors[i] = 0.2; colors[i + 1] = 0.8; colors[i + 2] = 0.8; // Teal
      }
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create floating geometric shapes for resources
    const shapes: THREE.Mesh[] = [];
    
    // Add cubes (representing data/files)
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.7, 0.5),
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      shapes.push(cube);
      scene.add(cube);
    }
    
    // Add spheres (representing knowledge/resources)
    for (let i = 0; i < 6; i++) {
      const geometry = new THREE.SphereGeometry(0.08, 16, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0.5 + Math.random() * 0.3, 0.8, 0.6),
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
      shapes.push(sphere);
      scene.add(sphere);
    }

    camera.position.z = 5;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Rotate particles
      particles.rotation.x += 0.001;
      particles.rotation.y += 0.002;
      
      // Animate shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.01 + index * 0.001;
        shape.rotation.y += 0.01 + index * 0.001;
        shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.0005;
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
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/admin/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        setError('Failed to load resources');
      }
    } catch (error) {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const getResourcesByCategory = (category: string) => {
    return resources.filter(resource => resource.category === category);
  };
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0C021E] via-[#1A0A3A] to-[#2A1A4A] relative">
        <div 
          ref={mountRef} 
          className="fixed inset-0 z-0"
          style={{ pointerEvents: 'none' }}
        />
        <Header title="Resources" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8 relative z-10">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="bg-[#0C021E] rounded-2xl border border-[#9D9FA9] p-8">
                  <div className="text-white font-montserrat text-lg">Loading resources...</div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-red-300">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Review Tools</h2>
                  <div className="space-y-6">
                    {getResourcesByCategory('review-tools').length > 0 ? (
                      getResourcesByCategory('review-tools').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('review-tools').length - 1 ? "border-b border-white/20 pb-6" : ""}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-[#9D9FA9]">
                              <Image src="/icons/resources-icon.svg" alt="Tool" width={24} height={24} />
                            </div>
                            <h3 className="font-montserrat font-medium text-xl text-white">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#B8BAC4] mb-3 pl-16">{resource.description}</p>
                          <div className="ml-16 mt-3 space-y-2">
                            {resource.url && (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block">
                                🔗 Access Tool
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block ml-2">
                                📁 {resource.fileName || 'Download File'}
                              </a>
                            )}
                            {resource.attachments && resource.attachments.length > 0 && (
                              <div className="space-y-2">
                                {resource.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block mr-2">
                                    📎 Download {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/5 rounded-xl border border-[#9D9FA9] p-6">
                        <div className="text-[#B8BAC4] font-montserrat text-center py-4">
                          No review tools available at this time.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              
                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Reference Materials</h2>
                  <div className="space-y-6">
                    {getResourcesByCategory('reference-materials').length > 0 ? (
                      getResourcesByCategory('reference-materials').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('reference-materials').length - 1 ? "border-b border-white/20 pb-6" : ""}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-[#9D9FA9]">
                              <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                            </div>
                            <h3 className="font-montserrat font-medium text-xl text-white">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#B8BAC4] mb-3 pl-16">{resource.description}</p>
                          <div className="ml-16 mt-3 space-y-2">
                            {resource.url && (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block">
                                🔗 View Document
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block ml-2">
                                📁 {resource.fileName || 'Download File'}
                              </a>
                            )}
                            {resource.attachments && resource.attachments.length > 0 && (
                              <div className="space-y-2">
                                {resource.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block mr-2">
                                    📎 Download {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/5 rounded-xl border border-[#9D9FA9] p-6">
                        <div className="text-[#B8BAC4] font-montserrat text-center py-4">
                          No reference materials available at this time.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8 md:col-span-2">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Training Materials</h2>
                  <div className="space-y-6">
                    {getResourcesByCategory('training-materials').length > 0 ? (
                      getResourcesByCategory('training-materials').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('training-materials').length - 1 ? "border-b border-white/20 pb-6" : ""}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-[#9D9FA9]">
                              <Image src="/icons/resources-icon.svg" alt="Training" width={24} height={24} />
                            </div>
                            <h3 className="font-montserrat font-medium text-xl text-white">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#B8BAC4] mb-3 pl-16">{resource.description}</p>
                          <div className="ml-16 mt-3 space-y-2">
                            {resource.url && (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block">
                                🔗 Access Training
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block ml-2">
                                📁 {resource.fileName || 'Download File'}
                              </a>
                            )}
                            {resource.attachments && resource.attachments.length > 0 && (
                              <div className="space-y-2">
                                {resource.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-all duration-300 bg-[#9050E9]/10 px-3 py-2 rounded-lg border border-[#9050E9]/30 hover:bg-[#9050E9]/20 inline-block mr-2">
                                    📎 Download {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/5 rounded-xl border border-[#9D9FA9] p-6">
                        <div className="text-[#B8BAC4] font-montserrat text-center py-4">
                          No training materials available at this time.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        
        {user?.role === 'admin' && (
          <div className="p-8">
            <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-2xl p-8">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Admin Controls</h2>
              <ResourceManager />
            </div>
          </div>
        )}
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}



