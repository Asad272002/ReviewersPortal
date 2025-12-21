'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import * as THREE from 'three';

interface Proposal {
  proposalId: string;
  proposalTitle: string;
  reviewerName: string;
  projectCategory: string;
  teamSize: string;
  budgetEstimate: string;
  timelineWeeks: string;
  proposalSummary: string;
  technicalApproach: string;
  submissionDate: string;
  votingDeadline: string;
  status: 'active' | 'expired' | 'completed';
  totalUpvotes: number;
  totalDownvotes: number;
  netScore: number;
  voterCount: number;
  userVote?: 'upvote' | 'downvote' | null;
}

interface VoteResponse {
  success: boolean;
  message: string;
  proposal?: Proposal;
}

export default function VoteProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'deadline'>('newest');
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVotingRef = useRef<boolean>(false);

  useEffect(() => {
    if (user) {
      fetchProposals();
      
      // Set up auto-refresh with smart timing to avoid conflicts with voting
      const scheduleNextRefresh = () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
          // Only refresh if not currently voting
          if (!isVotingRef.current) {
            fetchProposals();
          }
          scheduleNextRefresh(); // Schedule the next refresh
        }, 2 * 60 * 1000); // 2 minutes
      };
      
      scheduleNextRefresh();
      
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [user]);

  // Three.js setup
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create voting-themed particles
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const votingColors = [
      new THREE.Color(0x4ade80), // Green for upvotes
      new THREE.Color(0xef4444), // Red for downvotes
      new THREE.Color(0x8b5cf6), // Purple for neutral
      new THREE.Color(0x06b6d4), // Cyan for active
      new THREE.Color(0xf59e0b), // Amber for deadline
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      
      const color = votingColors[Math.floor(Math.random() * votingColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 3 + 1;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += sin(time * 0.5 + position.x * 0.01) * 2.0;
          pos.x += cos(time * 0.3 + position.z * 0.01) * 1.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - (dist * 2.0);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      vertexColors: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Create floating geometric shapes for voting theme
    const geometries = [
      new THREE.OctahedronGeometry(0.8),
      new THREE.TetrahedronGeometry(1),
      new THREE.IcosahedronGeometry(0.6),
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: votingColors[Math.floor(Math.random() * votingColors.length)],
        transparent: true,
        opacity: 0.1,
        wireframe: true
      });
      
      const shape = new THREE.Mesh(geometry, material);
      shape.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
      
      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    camera.position.z = 30;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      particleMaterial.uniforms.time.value = time;
      
      // Rotate shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.005 + index * 0.001;
        shape.rotation.y += 0.003 + index * 0.0005;
        shape.position.y += Math.sin(time + index) * 0.01;
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
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);
  
  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !isVotingRef.current) {
        fetchProposals();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const url = user ? `/api/voting/proposals?userId=${user.id}` : '/api/voting/proposals';
      const response = await fetch(url, {
        // Add cache control headers for better performance
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProposals(data.proposals);
        
        // Show cache status in console for debugging
        if (data.cached) {
          console.log('📦 Proposals loaded from cache');
        } else {
          console.log('🔄 Proposals loaded from Google Sheets');
        }
      } else {
        console.error('Failed to fetch proposals:', data.message);
        // Don't throw here, just log the error to avoid breaking the UI
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      // Set empty proposals array on error to prevent UI issues
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, voteType: 'upvote' | 'downvote') => {
    if (!user || isVotingRef.current) return;
    
    // Set voting flag to prevent conflicts with auto-refresh
    isVotingRef.current = true;
    setVotingLoading(proposalId);
    
    try {
      const response = await fetch('/api/voting/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          voteType,
          userId: user.id,
          username: user.username
        }),
      });
      
      const data: VoteResponse = await response.json();
      
      if (data.success) {
        // Refresh all proposals to get latest vote counts
        await fetchProposals();
      } else {
        alert(data.message || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    } finally {
      setVotingLoading(null);
      // Clear voting flag after a short delay to ensure UI updates complete
      setTimeout(() => {
        isVotingRef.current = false;
      }, 1000);
    }
  };

  // Countdown Timer Component
  const ExpandableText = ({ text, maxLength = 200, proposalId, field }: { 
    text: string; 
    maxLength?: number; 
    proposalId: string; 
    field: string; 
  }) => {
    const expandKey = `${proposalId}-${field}`;
    const isExpanded = expandedProposals.has(expandKey);
    const shouldTruncate = text.length > maxLength;
    
    const toggleExpanded = () => {
      const newExpanded = new Set(expandedProposals);
      if (isExpanded) {
        newExpanded.delete(expandKey);
      } else {
        newExpanded.add(expandKey);
      }
      setExpandedProposals(newExpanded);
    };
    
    if (!shouldTruncate) {
      return <p className="text-[#9D9FA9] font-montserrat">{text}</p>;
    }
    
    return (
      <div className="max-w-full">
        <p className="text-[#9D9FA9] font-montserrat break-words whitespace-pre-wrap overflow-wrap-anywhere">
          {isExpanded ? text : `${text.slice(0, maxLength)}...`}
        </p>
        <button
          onClick={toggleExpanded}
          className="mt-2 text-purple-400 hover:text-purple-300 font-montserrat text-sm font-medium transition-colors"
        >
          {isExpanded ? '📖 Read less' : '📚 Read more'}
        </button>
      </div>
    );
  };

  const CountdownTimer = ({ deadline, proposalId, status }: { deadline: string; proposalId: string; status: string }) => {
    const [timeLeft, setTimeLeft] = useState<{
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
      expired: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
      // Debug logging
      console.log(`CountdownTimer for ${proposalId}: status="${status}", deadline="${deadline}"`);
      
      // If proposal status is already expired, set to expired state and don't start timer
      if (status === 'expired') {
        console.log(`Setting ${proposalId} to expired state`);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return; // Don't start any timer for expired proposals
      }

      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const deadlineDate = new Date(deadline).getTime();
        const diff = deadlineDate - now;

        if (diff <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, expired: false });
      };

      // Only start timer for active proposals
      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);

      return () => clearInterval(timer);
    }, [deadline, status]);

    // Show countdown format with 0000 for expired proposals
    if (timeLeft.expired || status === 'expired') {
       return (
         <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 border border-red-500/50 rounded-lg p-4">
           <div className="text-center">
             <div className="text-red-400 font-bold text-sm font-montserrat mb-2">⏰ VOTING ENDED</div>
             <div className="flex justify-center gap-2 text-center">
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">DAYS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">HOURS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">MINS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">SECS</div>
               </div>
             </div>
             <div className="text-red-300 text-sm font-montserrat mt-2">
               This proposal is no longer accepting votes
             </div>
           </div>
         </div>
       );
     }

    return (
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-white font-bold text-sm font-montserrat mb-2">⏰ TIME REMAINING</div>
          <div className="flex justify-center gap-2 text-center">
            {timeLeft.days > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
                <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.days}</div>
                <div className="text-xs text-[#9D9FA9] font-montserrat">DAYS</div>
              </div>
            )}
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.hours.toString().padStart(2, '0')}</div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">HOURS</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.minutes.toString().padStart(2, '0')}</div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">MINS</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className={`text-2xl font-bold font-montserrat ${
                timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5 
                  ? 'text-red-400 animate-pulse' 
                  : 'text-white'
              }`}>
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">SECS</div>
            </div>
          </div>
          {timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 10 && (
            <div className="mt-2 text-orange-400 text-sm font-montserrat font-semibold animate-pulse">
              🚨 VOTING ENDS SOON!
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredProposals = proposals.filter(proposal => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

  const sortedProposals = [...filteredProposals].sort((a, b) => {
    switch (sortBy) {
      case 'popular': {
        // Sort by netScore desc, then voterCount desc, then newest submission
        if (b.netScore !== a.netScore) return b.netScore - a.netScore;
        if (b.voterCount !== a.voterCount) return b.voterCount - a.voterCount;
        return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
      }
      case 'deadline': {
        // Move active proposals with valid deadlines to the top, soonest first; expired or invalid go last
        const aTime = new Date(a.votingDeadline).getTime();
        const bTime = new Date(b.votingDeadline).getTime();
        const aInvalid = isNaN(aTime);
        const bInvalid = isNaN(bTime);
        const aExpired = a.status === 'expired';
        const bExpired = b.status === 'expired';
        if (aInvalid && !bInvalid) return 1;
        if (!aInvalid && bInvalid) return -1;
        if (aExpired && !bExpired) return 1;
        if (!aExpired && bExpired) return -1;
        return aTime - bTime;
      }
      case 'newest':
      default:
        return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
    }
  });

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white relative overflow-hidden">
        {/* Three.js Background */}
        <div 
          ref={mountRef} 
          className="fixed inset-0 z-0 pointer-events-none"
        />
        
        {/* Content */}
        <Header />
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-4 sm:p-6">
                  <h1 className="text-2xl sm:text-3xl font-bold font-montserrat mb-2 text-white">🗳️ Vote for Proposals</h1>
                  <p className="text-gray-300 font-montserrat">
                    Review and vote on submitted proposals. Each user can cast one vote per proposal.
                  </p>
                </div>

                {/* Filters and Sorting */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-4 sm:p-6 mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="w-full sm:w-auto">
                      <label className="block text-sm font-montserrat text-gray-300 mb-2">Filter by Status</label>
                      <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-white/10 border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-white/40 focus:bg-white/15 w-full sm:w-auto"
                      >
                        <option value="all" className="bg-gray-800 text-white">All Proposals</option>
                        <option value="active" className="bg-gray-800 text-white">Active Voting</option>
                        <option value="expired" className="bg-gray-800 text-white">Voting Ended</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-auto">
                      <label className="block text-sm font-montserrat text-gray-300 mb-2">Sort by</label>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-white/10 border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-white/40 focus:bg-white/15 w-full sm:w-auto"
                      >
                        <option value="newest" className="bg-gray-800 text-white">Newest First</option>
                        <option value="popular" className="bg-gray-800 text-white">Most Popular</option>
                        <option value="deadline" className="bg-gray-800 text-white">Deadline Soon</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={fetchProposals}
                    disabled={loading}
                    className="bg-white/10 hover:bg-white/20 border border-[#9D9FA9] hover:border-white/40 text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        🔄 Refresh
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Proposals List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6 sm:p-8 max-w-md mx-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50 mx-auto mb-4"></div>
                    <p className="text-gray-300 font-montserrat">Loading proposals...</p>
                  </div>
                </div>
              ) : sortedProposals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6 sm:p-8 max-w-md mx-auto">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-montserrat mb-2 text-white">No Proposals Found</h3>
                    <p className="text-gray-300 font-montserrat text-lg">No proposals found for the selected filter.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedProposals.map((proposal) => (
                    <div key={proposal.proposalId} className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-4 sm:p-6">{/* Removed hover animation */}
                      
                      {/* Proposal Header */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-bold font-montserrat text-white mb-2">
                            {proposal.proposalTitle}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-300 font-montserrat">
                            <span>👤 {proposal.reviewerName}</span>
                            <span>📂 {proposal.projectCategory}</span>
                            <span>👥 {proposal.teamSize} members</span>
                            <span>💰 ${proposal.budgetEstimate}</span>
                            <span>⏱️ {proposal.timelineWeeks} weeks</span>
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <div className={`px-3 py-1 rounded-lg text-sm font-montserrat backdrop-blur-sm border ${
                            proposal.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            proposal.status === 'expired' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}>
                            {proposal.status === 'active' ? '🟢 Active' :
                             proposal.status === 'expired' ? '🔴 Expired' : '⚪ Completed'}
                          </div>
                        </div>
                      </div>

                      {/* Countdown Timer - Prominent Display */}
                      <div className="mb-4">
                        <CountdownTimer deadline={proposal.votingDeadline} proposalId={proposal.proposalId} status={proposal.status} />
                      </div>

                      {/* Proposal Content */}
                      <div className="mb-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                          <h4 className="font-semibold font-montserrat text-white mb-2">Summary:</h4>
                          <div className="mb-3">
                            <ExpandableText 
                              text={proposal.proposalSummary} 
                              maxLength={200} 
                              proposalId={proposal.proposalId} 
                              field="summary" 
                            />
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <h4 className="font-semibold font-montserrat text-white mb-2">Technical Approach:</h4>
                          <ExpandableText 
                            text={proposal.technicalApproach} 
                            maxLength={200} 
                            proposalId={proposal.proposalId} 
                            field="technical" 
                          />
                        </div>
                      </div>

                      {/* Voting Section */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-white/20">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                          {/* Vote Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVote(proposal.proposalId, 'upvote')}
                              disabled={proposal.status !== 'active' || votingLoading === proposal.proposalId || proposal.userVote !== null}
                              className={`flex items-center gap-1 px-4 py-3 sm:px-3 sm:py-2 rounded-lg font-montserrat transition-all duration-300 border w-full sm:w-auto justify-center ${
                                proposal.userVote === 'upvote' 
                                  ? 'bg-green-500/30 text-green-200 border-green-500/50' 
                                  : proposal.userVote !== null
                                  ? 'bg-white/5 text-gray-400 opacity-50 cursor-not-allowed border-white/10'
                                  : 'bg-white/5 text-gray-300 hover:bg-green-500/20 hover:text-green-300 hover:border-green-500/30 border-white/10'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={proposal.userVote !== null ? 'You have already voted on this proposal' : ''}
                            >
                              👍 {proposal.totalUpvotes}
                            </button>
                            <button
                              onClick={() => handleVote(proposal.proposalId, 'downvote')}
                              disabled={proposal.status !== 'active' || votingLoading === proposal.proposalId || proposal.userVote !== null}
                              className={`flex items-center gap-1 px-4 py-3 sm:px-3 sm:py-2 rounded-lg font-montserrat transition-all duration-300 border w-full sm:w-auto justify-center ${
                                proposal.userVote === 'downvote' 
                                  ? 'bg-red-500/30 text-red-200 border-red-500/50' 
                                  : proposal.userVote !== null
                                  ? 'bg-white/5 text-gray-400 opacity-50 cursor-not-allowed border-white/10'
                                  : 'bg-white/5 text-gray-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border-white/10'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={proposal.userVote !== null ? 'You have already voted on this proposal' : ''}
                            >
                              👎 {proposal.totalDownvotes}
                            </button>
                          </div>

                          {/* Vote Stats */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-montserrat">
                            <div className="bg-white/5 rounded-lg px-3 py-2 border border-[#9D9FA9]">
                              <span className={`font-semibold ${
                                proposal.netScore > 0 ? 'text-green-400' :
                                proposal.netScore < 0 ? 'text-red-400' : 'text-gray-300'
                              }`}>
                                Net Score: {proposal.netScore > 0 ? '+' : ''}{proposal.netScore}
                              </span>
                            </div>
                            <div className="bg-white/5 rounded-lg px-3 py-2 border border-[#9D9FA9]">
                              <span className="text-gray-300">
                                Total Voters: {proposal.voterCount}
                              </span>
                            </div>
                            {/* User Vote Status */}
                            {proposal.userVote && (
                              <span className={`px-3 py-2 rounded-lg text-xs font-semibold backdrop-blur-sm border ${
                                proposal.userVote === 'upvote' 
                                  ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}>
                                You voted: {proposal.userVote === 'upvote' ? '👍 Up' : '👎 Down'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Loading Indicator */}
                        {votingLoading === proposal.proposalId && (
                          <div className="flex items-center gap-2 text-[#9D9FA9] font-montserrat">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                            <span>Submitting vote...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              <Footer />
            </main>
          </div>
      </div>
    </ProtectedRoute>
  );
}