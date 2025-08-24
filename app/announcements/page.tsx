'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";
import ProtectedRoute from "../components/ProtectedRoute";
import AnnouncementManager from "../components/admin/AnnouncementManager";
import Image from "next/image";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'important' | 'general';
  duration?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [importantUpdates, setImportantUpdates] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    fetchImportantUpdates();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 5;

    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create announcement-themed particles (news/communication theme)
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      // Blue/cyan theme for announcements
      colors[i * 3] = Math.random() * 0.3 + 0.2; // R
      colors[i * 3 + 1] = Math.random() * 0.4 + 0.4; // G
      colors[i * 3 + 2] = Math.random() * 0.5 + 0.5; // B
      
      sizes[i] = Math.random() * 3 + 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create floating announcement icons/shapes
    const geometries = [
      new THREE.RingGeometry(0.3, 0.5, 8),
      new THREE.PlaneGeometry(0.6, 0.6),
      new THREE.CircleGeometry(0.4, 12)
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.7, 0.6),
        transparent: true,
        opacity: 0.3,
        wireframe: Math.random() > 0.5
      });
      
      const shape = new THREE.Mesh(geometry, material);
      shape.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Gentle floating motion for announcements
      particles.rotation.x += 0.0008;
      particles.rotation.y += 0.0012;
      
      // Animate announcement shapes
      shapes.forEach((shape, index) => {
        shape.rotation.z += 0.008 + index * 0.001;
        shape.position.x += Math.sin(Date.now() * 0.001 + index) * 0.01;
        shape.position.y += Math.cos(Date.now() * 0.0008 + index) * 0.01;
      });
      
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
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/admin/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } else {
        setError('Failed to load announcements');
      }
    } catch (error) {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportantUpdates = async () => {
    try {
      const response = await fetch('/api/admin/important-updates');
      if (response.ok) {
        const data = await response.json();
        setImportantUpdates(data || []);
      } else {
        console.error('Failed to load important updates');
      }
    } catch (error) {
      console.error('Failed to load important updates');
    }
  };

  const isAnnouncementActive = (announcement: Announcement) => {
    const now = new Date();
    const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
    
    return !expiresAt || now <= expiresAt;
  };

  const activeAnnouncements = announcements.filter(isAnnouncementActive);
  const importantAnnouncements = activeAnnouncements.filter(a => a.category === 'important');
  const generalAnnouncements = activeAnnouncements.filter(a => a.category === 'general');

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ background: 'transparent' }}
        />
        <Header title="Announcements" />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-8 relative">
            <div className="relative z-10">
              {/* Admin/Coordinator Controls */}
              {(user?.role === 'admin' || user?.role === 'coordinator') && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="bg-[#0C021E] hover:bg-white/10 border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 mb-4"
                  >
                    {showAdminPanel ? 'Hide Management Panel' : 'Show Management Panel'}
                  </button>
                  
                  {showAdminPanel && (
                    <div className="mb-6">
                      <AnnouncementManager onAnnouncementUpdate={fetchAnnouncements} />
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-white font-montserrat bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">Loading announcements...</div>
                </div>
              ) : error ? (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300">
                  {error}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center border border-red-400/50">
                        <Image src="/icons/alert-icon.svg" alt="Alert" width={16} height={16} />
                      </div>
                      <h2 className="font-montserrat font-semibold text-2xl text-white">Important Updates</h2>
                    </div>
                  
                    <div className="space-y-4">
                      {importantUpdates.length > 0 ? (
                        importantUpdates.map((announcement) => (
                          <div key={announcement.id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/20 transition-all duration-300">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-montserrat font-medium text-lg text-white">{announcement.title}</h3>
                              <span className="text-xs text-red-300 bg-red-500/30 px-2 py-1 rounded-lg border border-red-400/30">IMPORTANT</span>
                            </div>
                            <p className="font-montserrat text-gray-300 mb-3">
                              {announcement.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                              <div className="flex items-center gap-2">
                                <Image src="/icons/calendar-icon.svg" alt="Date" width={12} height={12} />
                                <span>Posted: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-red-600/80 text-white rounded-lg text-xs font-medium border border-red-500/50">Important</span>
                              </div>
                              {announcement.duration && (
                                <div className="flex items-center gap-2">
                                  <span>⏱️ Duration: {announcement.duration} days</span>
                                </div>
                              )}
                              {announcement.expiresAt && (
                                <div className="flex items-center gap-2">
                                  <span>📅 Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-300 font-montserrat text-center py-8 bg-white/5 rounded-xl border border-[#9D9FA9]">
                          No important announcements at this time.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center border border-blue-400/50">
                        <Image src="/icons/announcement-icon.svg" alt="Announcement" width={16} height={16} />
                      </div>
                      <h2 className="font-montserrat font-semibold text-2xl text-white">Latest Posts</h2>
                    </div>
                  
                    <div className="space-y-4">
                      {generalAnnouncements.length > 0 ? (
                        generalAnnouncements.map((announcement, index) => (
                          <div key={announcement.id} className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 ${index < generalAnnouncements.length - 1 ? "mb-4" : ""}`}>
                            <h3 className="font-montserrat font-medium text-lg text-white mb-2">{announcement.title}</h3>
                            <p className="font-montserrat text-gray-300 mb-3">
                              {announcement.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                              <div className="flex items-center gap-2">
                                <Image src="/icons/calendar-icon.svg" alt="Date" width={12} height={12} />
                                <span>Posted: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-sm text-white rounded-lg text-xs font-medium border border-blue-500/50">General</span>
                              </div>
                              {announcement.duration && (
                                <div className="flex items-center gap-2">
                                  <span>⏱️ Duration: {announcement.duration} days</span>
                                </div>
                              )}
                              {announcement.expiresAt && (
                                <div className="flex items-center gap-2">
                                  <span>📅 Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-300 font-montserrat text-center py-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          No general announcements at this time.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
        
        <LogoutButton />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}