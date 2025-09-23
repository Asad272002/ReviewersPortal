'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import InfoCard from "./components/InfoCard";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import LogoutButton from "./components/LogoutButton";
import AwardedTeamsConnect from "./components/AwardedTeamsConnect";
import ReviewerAssignmentView from "./components/ReviewerAssignmentView";
import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

export default function Home() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isAwardedTeamMember, setIsAwardedTeamMember] = useState(false);
  const [isCheckingTeamStatus, setIsCheckingTeamStatus] = useState(true);

  useEffect(() => {
    if (user?.role === 'team_leader') {
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
        // Check if this user is a team leader of any awarded team
        const isTeamLeader = data.data.awardedTeams?.some(
          (team: any) => team.teamLeaderUsername === user?.username
        );
        setIsAwardedTeamMember(isTeamLeader);
      }
    } catch (error) {
      console.error('Error checking team status:', error);
      setIsAwardedTeamMember(false);
    } finally {
      setIsCheckingTeamStatus(false);
    }
  };

  // Show loading while checking team status for team leaders
  if (user?.role === 'team_leader' && isCheckingTeamStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9050E9] mx-auto mb-4"></div>
          <p className="text-gray-300">Checking your team status...</p>
        </div>
      </div>
    );
  }

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

    // Create floating particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      // Blue to purple gradient colors
      colors[i * 3] = Math.random() * 0.5 + 0.3; // R
      colors[i * 3 + 1] = Math.random() * 0.3 + 0.4; // G
      colors[i * 3 + 2] = Math.random() * 0.3 + 0.7; // B
      
      sizes[i] = Math.random() * 3 + 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create geometric shapes
    const geometries = [
      new THREE.TetrahedronGeometry(0.5),
      new THREE.OctahedronGeometry(0.4),
      new THREE.IcosahedronGeometry(0.3)
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.3 + 0.6, 0.7, 0.5),
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      
      const shape = new THREE.Mesh(geometry, material);
      shape.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Rotate particles
      particles.rotation.x += 0.001;
      particles.rotation.y += 0.002;
      
      // Animate shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.01 + index * 0.001;
        shape.rotation.y += 0.01 + index * 0.001;
        shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.01;
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

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ background: 'transparent' }}
        />
        <Header />
        
        <div className="flex flex-1 relative z-10">
          {!(user?.role === 'team_leader' && isAwardedTeamMember) && user?.role !== 'reviewer' && <Sidebar />}
          
          <main className={`flex-1 p-8 overflow-auto animate-fadeIn relative ${(user?.role === 'team_leader' && isAwardedTeamMember) || user?.role === 'reviewer' ? 'max-w-4xl mx-auto' : ''}`}>
            {user?.role === 'reviewer' ? (
              // Reviewer Dashboard
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-full">
                  <div className="text-center mb-8">
                    <h1 className="font-montserrat font-bold text-4xl text-white mb-4">
                      Welcome to Review Circle
                    </h1>
                    <p className="font-montserrat text-xl text-gray-300">
                      Your reviewer assignments and responsibilities
                    </p>
                  </div>
                  
                  {/* Reviewer Dashboard */}
                  <div className="relative z-10">
                    <ReviewerAssignmentView />
                  </div>
                </div>
              </div>
            ) : user?.role === 'team_leader' && isAwardedTeamMember ? (
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
                </div>
              </div>
            ) : user?.role === 'admin' ? (
              // Admin Dashboard
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-full">
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
                      title="User Management" 
                      icon="admin-icon.svg"
                      content={[
                        "Manage user accounts",
                        "Role assignments",
                        "System settings"
                      ]}
                      linkText="Manage Users"
                      linkHref="/admin-management"
                    />
                    
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
                      title="System Overview" 
                      icon="dashboard-icon.svg"
                      content={[
                        "View system status",
                        "Monitor activities",
                        "Generate reports"
                      ]}
                      linkText="Manage System"
                      linkHref="/admin-management"
                    />
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
              </>
            )}
          </main>
        </div>
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
