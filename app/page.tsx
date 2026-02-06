'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import InfoCard from "./components/InfoCard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from './context/AuthContext';
import { useMotion } from './context/MotionContext';
import Image from "next/image";
import AwardedTeamsConnect from "./components/AwardedTeamsConnect";

export default function Home() {
  const { user } = useAuth();
  const { motionEnabled } = useMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isAwardedTeamMember, setIsAwardedTeamMember] = useState(false);
  const [isCheckingTeamStatus, setIsCheckingTeamStatus] = useState(true);

  useEffect(() => {
    if (user?.role === 'team') {
      checkIfAwardedTeamMember();
    } else {
      setIsCheckingTeamStatus(false);
    }
  }, [user]);

  const checkIfAwardedTeamMember = async () => {
    try {
      const response = await fetch('/api/admin/awarded-teams');
      if (response.ok) {
        const data = await response.json();
        // Match by username or fallback to id in case of normalization differences
        const isTeamLeader = data.data.awardedTeams?.some(
          (team: any) => {
            const teamUser = team.teamUsername ?? team.teamLeaderUsername;
            return teamUser === user?.username || team.id === user?.id;
          }
        );
        setIsAwardedTeamMember(Boolean(isTeamLeader));
      }
    } catch (error) {
      console.error('Error checking team status:', error);
      setIsAwardedTeamMember(false);
    } finally {
      setIsCheckingTeamStatus(false);
    }
  };



  useEffect(() => {
    // If motion is disabled, ensure canvas is hidden and any previous animation cleaned up
    if (!motionEnabled) {
      if (canvasRef.current) {
        canvasRef.current.classList.add('hidden');
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      sceneRef.current = null;
      return;
    }

    if (!canvasRef.current) return;
    canvasRef.current.classList.remove('hidden');

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 5;

    sceneRef.current = scene;
    rendererRef.current = renderer;
    // Restore original particle + geometric shapes background
    // Particles (purple/blue theme to match site)
    const particleCount = 150;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      positions[ix] = (Math.random() - 0.5) * 30;
      positions[ix + 1] = (Math.random() - 0.5) * 30;
      positions[ix + 2] = (Math.random() - 0.5) * 20;

      // purple/blue gradient
      const t = Math.random();
      const r = 0.35 + t * 0.35;
      const g = 0.30 + t * 0.25;
      const b = 0.75 + t * 0.20;
      colors[ix] = r;
      colors[ix + 1] = g;
      colors[ix + 2] = b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Floating geometric wireframe shapes
    const geometries = [
      new THREE.TetrahedronGeometry(0.8),
      new THREE.OctahedronGeometry(0.7),
      new THREE.IcosahedronGeometry(0.6),
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.72 + Math.random() * 0.08, 0.8, 0.6),
        transparent: true,
        opacity: 0.25,
        wireframe: true
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      shapes.push(mesh);
      scene.add(mesh);
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      particlesMesh.rotation.y += 0.0015;
      particlesMesh.rotation.x += 0.0008;

      for (const s of shapes) {
        s.rotation.x += 0.0015;
        s.rotation.y += 0.0020;
      }

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
  }, [motionEnabled]);

  // Show loading while checking team status for team members
  if (user?.role === 'team' && isCheckingTeamStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9050E9] mx-auto mb-4"></div>
          <p className="text-gray-300">Checking your team status...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${!motionEnabled ? 'hidden' : ''}`}
          style={{ background: 'transparent' }}
        />
        <Header />
        
        <div className="flex flex-1 relative z-10 overflow-hidden">
          {!(user?.role === 'team' && isAwardedTeamMember) && <Sidebar />}

          <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto animate-fadeIn relative ${(user?.role === 'team' && isAwardedTeamMember) ? 'max-w-4xl mx-auto' : ''} ${!(user?.role === 'team' && isAwardedTeamMember) ? 'lg:ml-0' : ''}`}>
            {user?.role === 'reviewer' ? (
              // Default Dashboard for Reviewers with Sidebar
              <>
                <HeroSection />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 relative z-10">
                  <InfoCard 
                    title="Announcements" 
                    icon="announcement-header-icon.svg"
                    content={[
                      "Important Updates",
                      "Latest Posts"
                    ]}
                    linkText="See all announcements"
                    linkHref="/announcements"
                  />
                  
                  <InfoCard 
                    title="Idea Box" 
                    icon="requirement-header-icon.svg"
                    content={[
                      "Project Requirements",
                      "Technical Specifications",
                      "Guidelines"
                    ]}
                    linkText="View documents"
                    linkHref="/documents"
                  />
                  
                  <InfoCard 
                    title="Resources" 
                    icon="resources-icon.svg"
                    content={[
                      "Helpful Links",
                      "Tools & Templates",
                      "Reference Materials"
                    ]}
                    linkText="Browse resources"
                    linkHref="/resources"
                  />
                  
                  <InfoCard 
                    title="Vote for Proposals" 
                    icon="vote-icon.svg"
                    content={[
                      "Review Proposals",
                      "Cast Your Vote",
                      "View Results"
                    ]}
                    linkText="Vote now"
                    linkHref="/vote-proposals"
                  />

                  <InfoCard 
                    title="Reviewer Tests" 
                    icon="documents-icon.svg"
                    content={[
                      "Assessments",
                      "Timed quizzes",
                      "Skills check"
                    ]}
                    linkText="Open Tests"
                    linkHref="/reviewer-tests"
                  />
                  
                  <InfoCard 
                    title="Process Documentation" 
                    icon="process-header-icon.svg"
                    content={[
                      "Workflows",
                      "Procedures",
                      "Guidelines"
                    ]}
                    linkText="View processes"
                    linkHref="/processes"
                  />
                  
                  <InfoCard 
                    title="Support" 
                    icon="support-icon.svg"
                    content={[
                      "Get Help",
                      "Submit Tickets",
                      "FAQ"
                    ]}
                    linkText="Get support"
                    linkHref="/support"
                  />
                </div>
              </>
            ) : user?.role === 'team' && isAwardedTeamMember ? (
              // Simplified Team Dashboard
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-full">
                  <div className="text-center mb-8">
                    <h1 className="font-montserrat font-bold text-4xl text-white mb-4">
                      Welcome to Review Circle
                    </h1>
                    <p className="font-montserrat text-xl text-gray-300">
                      Connect with your assigned reviewer
                    </p>
                  </div>
                  
                  {/* Team Dashboard - Only AwardedTeamsConnect */}
                  <div className="relative z-10">
                    <AwardedTeamsConnect />
                  </div>
                  <div className="mt-8">
                    <Footer />
                  </div>
                </div>
              </div>
            ) : user?.role === 'admin' ? (
              // Admin Dashboard with seven section flyers
              <div className="min-h-screen flex flex-col items-center justify-center py-10">
                <div className="w-full max-w-7xl">
                  <div className="text-center mb-8">
                    <h1 className="font-montserrat font-bold text-4xl text-white mb-4">
                      Admin Dashboard
                    </h1>
                    <p className="font-montserrat text-xl text-gray-300">
                      System administration and management
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    <InfoCard 
                      title="Announcements" 
                      icon="announcement-header-icon.svg"
                      content={[
                        "Create announcements",
                        "Manage posts",
                        "System notifications"
                      ]}
                      linkText="Manage Announcements"
                      linkHref="/announcements"
                    />

                    <InfoCard 
                      title="Idea Box" 
                      icon="requirement-header-icon.svg"
                      content={[
                        "Project Requirements",
                        "Technical Specifications",
                        "Guidelines"
                      ]}
                      linkText="View documents"
                      linkHref="/documents"
                    />

                    <InfoCard 
                      title="Resources" 
                      icon="resources-icon.svg"
                      content={[
                        "Helpful Links",
                        "Tools & Templates",
                        "Reference Materials"
                      ]}
                      linkText="Browse resources"
                      linkHref="/resources"
                    />

                    <InfoCard 
                      title="Vote for Proposals" 
                      icon="vote-icon.svg"
                      content={[
                        "Review Proposals",
                        "Cast Your Vote",
                        "View Results"
                      ]}
                      linkText="Manage voting"
                      linkHref="/vote-proposals"
                    />

                    <InfoCard 
                      title="Process Documentation" 
                      icon="process-header-icon.svg"
                      content={[
                        "Workflows",
                        "Procedures",
                        "Guidelines"
                      ]}
                      linkText="View processes"
                      linkHref="/processes"
                    />

                    <InfoCard 
                      title="Contact & Support" 
                      icon="support-icon.svg"
                      content={[
                        "Get Help",
                        "Submit Tickets",
                        "FAQ"
                      ]}
                      linkText="Manage support"
                      linkHref="/support"
                    />

                    <InfoCard 
                      title="Admin Management" 
                      icon="admin-icon.svg"
                      content={[
                        "Manage user accounts",
                        "Role assignments",
                        "System settings"
                      ]}
                      linkText="Go to Admin Management"
                      linkHref="/admin-management"
                    />
                  </div>
                  <div className="mt-8">
                    <Footer />
                  </div>
                </div>
              </div>
            ) : (
              // Default Dashboard for other users
              <>
                <HeroSection />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 relative z-10">
                  <InfoCard 
                    title="Announcements" 
                    icon="announcement-header-icon.svg"
                    content={[
                      "Important Updates",
                      "Latest Posts"
                    ]}
                    linkText="See all announcements"
                    linkHref="/announcements"
                  />
                  
                  <InfoCard 
                    title="Requirement Documents" 
                    icon="requirement-header-icon.svg"
                    content={[
                      "Key guidelines for Proposers",
                      "Proposal document Checklist",
                      "Document template Links"
                    ]}
                    linkText="View Documents"
                    linkHref="/documents"
                  />
                </div>
                
                <div className="mt-8 p-6 bg-[#1A0A3A] rounded-xl border border-[#9D9FA9] relative z-10">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Quick Access</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] hover:border-blue-400/70 hover:bg-[#3A2A5A] transition-all duration-300 cursor-pointer group">
                      <h3 className="font-montserrat font-medium text-white mb-2 group-hover:text-blue-200 transition-colors">Resources</h3>
                      <p className="font-montserrat text-gray-100 group-hover:text-white transition-colors">Access review tools and reference materials</p>
                    </div>
                    <div className="p-4 bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] hover:border-purple-400/70 hover:bg-[#3A2A5A] transition-all duration-300 cursor-pointer group">
                      <h3 className="font-montserrat font-medium text-white mb-2 group-hover:text-purple-200 transition-colors">Contact & Support</h3>
                      <p className="font-montserrat text-gray-100 group-hover:text-white transition-colors">Get help with the review process</p>
                    </div>
                  </div>
                </div>
                
                <Footer />
              </>
            )}
          </main>
        </div>
        
      </div>
    </ProtectedRoute>
  );
}
