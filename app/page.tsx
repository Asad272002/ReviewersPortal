'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import InfoCard from "./components/InfoCard";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import LogoutButton from "./components/LogoutButton";

import ProtectedRoute from "./components/ProtectedRoute";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

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
          <Sidebar />
          
          <main className="flex-1 p-8 overflow-auto animate-fadeIn relative">
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
          </main>
        </div>
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
