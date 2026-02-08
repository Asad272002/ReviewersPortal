'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink, BookOpen, Globe, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import dynamic from 'next/dynamic';

const BotpressChat = dynamic(() => import('../components/BotpressChat'), { ssr: false });

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPartnerLogin, setIsPartnerLogin] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  // Client-side guard: if already authenticated, go to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role === 'partner') {
        router.replace('/partner-dashboard');
      } else {
        router.replace('/');
      }
    }
  }, [authLoading, isAuthenticated, router, user]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create floating particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 150;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 20;
      posArray[i + 1] = (Math.random() - 0.5) * 20;
      posArray[i + 2] = (Math.random() - 0.5) * 20;
      
      // Color gradient from blue to purple
      const t = Math.random();
      colorArray[i] = 0.2 + t * 0.6; // R
      colorArray[i + 1] = 0.4 + t * 0.4; // G
      colorArray[i + 2] = 0.8 + t * 0.2; // B
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

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
        color: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.7, 0.6),
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      
      shapes.push(mesh);
      scene.add(mesh);
    }

    camera.position.z = 8;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Rotate particles
      particlesMesh.rotation.x += 0.001;
      particlesMesh.rotation.y += 0.002;
      
      // Animate shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.01 + index * 0.001;
        shape.rotation.y += 0.01 + index * 0.001;
        shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.002;
      });
      
      // Update particle positions for floating effect
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
      }
      particlesGeometry.attributes.position.needsUpdate = true;
      
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
      renderer.dispose();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(username, password, isPartnerLogin);
      
      if (success) {
        if (isPartnerLogin) {
          router.push('/partner-dashboard');
        } else {
          router.push('/');
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen relative overflow-hidden">
      {/* Three.js Canvas Background */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/30 to-indigo-900/40" style={{ zIndex: 1 }} />
      
      {/* Partner Login Toggle - Top Right */}
      <div className="absolute top-8 right-8 z-20 animate-fadeIn">
        <button
          onClick={() => setIsPartnerLogin(!isPartnerLogin)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
            ${isPartnerLogin 
              ? 'bg-purple-500/20 border-purple-400/50 text-purple-200 hover:bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}
          `}
        >
          <span className="text-sm font-semibold">
            {isPartnerLogin ? 'Partner Portal Active' : 'Partners Login'}
          </span>
          {isPartnerLogin && (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_#4ade80]" />
          )}
        </button>
      </div>

      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {/* Left Side - Info Card (Desktop - Absolute Positioned) */}
        <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 w-80 animate-fadeInRight z-20">
          <div className="backdrop-blur-xl bg-white/5 p-6 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Info size={18} className="text-purple-300" />
              </div>
              <h3 className="font-montserrat font-bold text-lg text-white">Review Circle Info</h3>
            </div>
            
            <div className="space-y-4">
              <a 
                href="https://df-manual.gitbook.io/df-book/review-circle" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">Review Circle Gitbook</div>
                      <div className="text-xs text-white/50">Structure & Governance</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-white/30 group-hover:text-white/70 transition-colors" />
                </div>
              </a>

              <a 
                href="https://deepfunding.ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all duration-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Deep Funding Site</div>
                      <div className="text-xs text-white/50">Official Website</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-white/30 group-hover:text-white/70 transition-colors" />
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Glassmorphism Login Card */}
          <div className="backdrop-blur-xl bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl animate-fadeIn">
            <div className="text-center mb-8">
              {/* Animated Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Image 
                        src="/icons/profile-icon.svg" 
                        alt="Login" 
                        width={32} 
                        height={32} 
                        className="text-white filter brightness-0 invert"
                      />
                    </div>
                  </div>
                  {/* Floating rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-purple-400/20 animate-pulse" />
                </div>
              </div>
              
              <h1 className="font-montserrat font-bold text-4xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                {isPartnerLogin ? 'Partner Portal' : 'Review Circle'}
              </h1>
              <p className="font-montserrat text-white/80 text-lg">
                {isPartnerLogin 
                  ? <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">Project Oversight & Approvals</span>
                  : <>Your Gateway To <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-semibold">Proposal Excellence</span></>
                }
              </p>
            </div>
            
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-white p-4 rounded-xl mb-6 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="block font-montserrat text-white/90 font-medium">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 font-montserrat"
                    placeholder="Enter your username"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block font-montserrat text-white/90 font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-300 font-montserrat"
                    placeholder="Enter your password"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-montserrat font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Sign In</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                )}
              </button>
            </form>

            {/* Mobile/Tablet Resources Links */}
            <div className="lg:hidden mt-8 border-t border-white/10 pt-6">
              <h3 className="font-montserrat font-bold text-sm text-white/80 mb-4 uppercase tracking-wider">Resources</h3>
              <div className="space-y-3">
                <a 
                  href="https://df-manual.gitbook.io/df-book/review-circle" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                >
                  <span className="text-sm text-white/90">Review Circle Gitbook</span>
                  <ExternalLink size={14} className="text-white/50" />
                </a>
                <a 
                  href="https://deepfunding.ai/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                >
                  <span className="text-sm text-white/90">Deep Funding Site</span>
                  <ExternalLink size={14} className="text-white/50" />
                </a>
              </div>
            </div>
          </div>
          
          {/* Floating Elements */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
      
      {/* Botpress Webchat UI - Only show when not authenticated */}
      {!isAuthenticated && <BotpressChat />}
    </>
  );
}