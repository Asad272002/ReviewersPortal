'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import Image from 'next/image';
import AnnouncementManager from '../components/admin/AnnouncementManager';
import ResourceManager from '../components/admin/ResourceManager';
import ProcessManager from '../components/admin/ProcessManager';
import AwardedTeamsManager from '../components/admin/AwardedTeamsManager';
import SupportTicketManager from '../components/admin/SupportTicketManager';
import UserManager from '../components/admin/UserManager';
import VotingSettingsManager from '../components/admin/VotingSettingsManager';
import ReviewerTestsManager from '../components/admin/ReviewerTestsManager';
import MilestoneReportsManager from '../components/admin/MilestoneReportsManager';
import AwardedTeamsInfoManager from '../components/admin/AwardedTeamsInfoManager';
import PartnerManager from '../components/admin/PartnerManager';
import OrganizationManager from '../components/admin/OrganizationManager';
import { 
  Activity,
  Award,
  BarChart2,
  Briefcase,
  Building,
  FileText,
  FolderOpen,
  HelpCircle,
  Info,
  Megaphone,
  PenTool,
  RotateCw,
  Settings,
  Users
} from 'lucide-react';


interface SheetData {
  announcements: any[];
  resources: any[];
  processes: any[];
  users: any[];
  supportTickets: any[];
}

export default function AdminManagement() {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sheetData, setSheetData] = useState<SheetData>({
    announcements: [],
    resources: [],
    processes: [],
    users: [],
    supportTickets: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('overview');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const router = useRouter();

  const handleMilestoneReportRedirect = () => {
    router.push('/milestone-report');
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAuthorized(true);
      fetchSheetData();
    } else {
      setIsAuthorized(false);
    }
  }, [user]);

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

    // Create admin-themed particles (more structured)
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      
      // Admin purple/gold theme colors
      colors[i * 3] = Math.random() * 0.4 + 0.5; // R
      colors[i * 3 + 1] = Math.random() * 0.2 + 0.3; // G
      colors[i * 3 + 2] = Math.random() * 0.4 + 0.6; // B
      
      sizes[i] = Math.random() * 4 + 2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create admin dashboard geometric elements
    const geometries = [
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.CylinderGeometry(0.4, 0.4, 0.8),
      new THREE.SphereGeometry(0.4)
    ];

    const shapes: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      
      const shape = new THREE.Mesh(geometry, material);
      shape.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12
      );
      
      shapes.push(shape);
      scene.add(shape);
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Slower, more professional rotation
      particles.rotation.x += 0.0005;
      particles.rotation.y += 0.001;
      
      // Animate admin shapes
      shapes.forEach((shape, index) => {
        shape.rotation.x += 0.005 + index * 0.0005;
        shape.rotation.y += 0.005 + index * 0.0005;
        shape.position.y += Math.sin(Date.now() * 0.0008 + index) * 0.008;
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

  const fetchSheetData = async () => {
    setIsLoading(true);
    try {
      const endpoints: Record<string, string> = {
        announcements: '/api/admin/announcements',
        resources: '/api/admin/resources',
        processes: '/api/admin/processes',
        users: '/api/admin/users',
        supportTickets: '/api/admin/support-tickets'
      };

      const results = await Promise.allSettled(
        Object.entries(endpoints).map(([key, url]) =>
          fetch(url)
            .then(async (res) => {
              if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
              }
              const json = await res.json();
              return { key, data: json };
            })
            .catch((err) => {
              console.error(`Fetch failed for ${key} (${url}):`, err?.message || err);
              return { key, error: err };
            })
        )
      );

      const nextData = {
        announcements: [] as any[],
        resources: [] as any[],
        processes: [] as any[],
        users: [] as any[],
        supportTickets: [] as any[]
      };

      for (const r of results) {
        if (r.status === 'fulfilled') {
          const payload = r.value as { key: string; data?: any; error?: any };
          if (payload.error) {
            console.error(`Skipping ${payload.key} due to fetch error.`);
            continue;
          }
          const { key, data } = payload;
          if (key === 'announcements') nextData.announcements = data?.announcements || data?.data?.announcements || [];
          if (key === 'resources') nextData.resources = data?.resources || data?.data?.resources || [];
          if (key === 'processes') nextData.processes = data?.processes || data?.data?.processes || [];
          if (key === 'users') nextData.users = data?.users || data?.data?.users || [];
          if (key === 'supportTickets') nextData.supportTickets = data?.tickets || data?.data?.tickets || [];
        } else {
          console.error('Unexpected promise rejection while fetching admin data:', (r as any).reason);
        }
      }

      setSheetData(nextData);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = () => {
    fetchSheetData();
  };

  if (!isAuthorized) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* Three.js Canvas Background */}
          <canvas 
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'transparent' }}
          />
          <Header title="Access Denied" />
          <div className="flex flex-1 relative z-10 overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-8 text-center">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Access Denied</h2>
                <p className="font-montserrat text-gray-300">You need admin privileges to access this page.</p>
              </div>
              <Footer />
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const renderOverview = () => {
    // Calculate derived stats
    const totalUsers = sheetData.users.length;
    const reviewersCount = sheetData.users.filter((u: any) => u.role === 'reviewer').length;
    const teamCount = sheetData.users.filter((u: any) => u.role === 'team').length;
    
    const totalTickets = sheetData.supportTickets.length;
    const openTickets = sheetData.supportTickets.filter((t: any) => t.status === 'open' || t.status === 'pending').length;
    
    const stats = [
      { 
        label: 'Total Users', 
        value: totalUsers, 
        subValue: `${reviewersCount} Reviewers • ${teamCount} Teams`,
        icon: Users, 
        color: 'from-blue-500 to-cyan-400' 
      },
      { 
        label: 'Support Tickets', 
        value: totalTickets, 
        subValue: `${openTickets > 0 ? openTickets : 'No'} Pending`, 
        icon: HelpCircle, 
        color: 'from-orange-500 to-red-400' 
      },
      { 
        label: 'Announcements', 
        value: sheetData.announcements.length, 
        subValue: 'Active updates', 
        icon: Megaphone, 
        color: 'from-purple-500 to-pink-400' 
      },
      { 
        label: 'Resources', 
        value: sheetData.resources.length, 
        subValue: 'Files & Links', 
        icon: FileText, 
        color: 'from-emerald-500 to-teal-400' 
      }
    ];

    const quickActions = [
      { id: 'announcements', label: 'Announcements', desc: 'Manage system updates', icon: Megaphone },
      { id: 'resources', label: 'Resources', desc: 'Manage files & links', icon: FolderOpen },
      { id: 'processes', label: 'Process Docs', desc: 'Update workflows', icon: FileText },
      { id: 'users', label: 'Manage Users', desc: 'Add or edit users', icon: Users },
      { id: 'support-tickets', label: 'Support Tickets', desc: 'View user inquiries', icon: HelpCircle },
      { id: 'reviewer-tests', label: 'Reviewer Tests', desc: 'Manage quizzes', icon: PenTool },
      { id: 'milestone-reports', label: 'Milestone Reports', desc: 'View submissions', icon: BarChart2 },
      { id: 'voting-settings', label: 'Voting Settings', desc: 'Configure polls', icon: Settings },
      { id: 'awarded-teams', label: 'Awarded Teams Connect', desc: 'Manage awards', icon: Award },
      { id: 'awarded-teams-info', label: 'Teams Info', desc: 'Project details', icon: Info },
      { id: 'organizations', label: 'Organizations', desc: 'Manage partner orgs', icon: Building },
      { id: 'partners', label: 'Partner Portal', desc: 'Manage partners', icon: Briefcase },
      { id: 'sso-did-link', label: 'Link Deep-ID', desc: 'Attach DID to account', icon: Settings },
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="group relative bg-[#130b29]/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:bg-[#1A0B2E] hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500 rounded-full`}></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    Live
                  </span>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-gray-300 mb-1">{stat.label}</p>
                <p className="text-xs text-gray-500">{stat.subValue}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Quick Actions
            </h3>
            <button
              onClick={refreshAllData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-medium text-white transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5"
            >
              <RotateCw className="w-4 h-4 animate-spin-slow" />
              Refresh Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => setActiveSection(action.id)}
                className="flex items-start gap-4 p-4 rounded-xl bg-[#130b29]/80 backdrop-blur-md border border-purple-500/20 hover:bg-[#1A0B2E] hover:border-purple-500/50 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
              >
                <div className="p-2.5 rounded-lg bg-gray-800/50 group-hover:bg-purple-500/20 text-gray-400 group-hover:text-purple-300 transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors text-sm mb-1">
                    {action.label}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {action.desc}
                  </p>
                </div>
              </button>
            ))}
            
            {/* Special Actions */}
            <button
              onClick={handleMilestoneReportRedirect}
              className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 backdrop-blur-md"
            >
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors text-sm mb-1">
                  Submit Report
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Admin submission
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDataSection = (sectionName: string, data: any[]) => (
    <div className="space-y-6">
      <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white capitalize">{sectionName} Data</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveSection('overview')}
              className="bg-[#0C021E] hover:bg-white/10 border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 w-full sm:w-auto"
            >
              ← Back to Overview
            </button>
            <button
              onClick={refreshAllData}
              className="bg-[#0C021E] hover:bg-white/10 border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 w-full sm:w-auto"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {data.length === 0 ? (
          <p className="font-montserrat text-gray-300 text-center py-8">No data found in Google Sheets</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  {Object.keys(data[0] || {}).map((key) => (
                    <th key={key} className="text-left p-3 font-montserrat font-medium text-white capitalize">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b border-[#9D9FA9] hover:bg-[#1A0A3A] transition-all duration-200">
                    {Object.values(item).map((value: any, valueIndex) => (
                      <td key={valueIndex} className="p-3 font-montserrat text-gray-300 max-w-xs truncate">
                        {typeof value === 'string' && value.length > 50 
                          ? `${value.substring(0, 50)}...` 
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Admin Data Sources</h4>
        <p className="font-montserrat text-gray-300 mb-4">
          This data is fetched from the backend API (Supabase). Refresh to see the latest updates.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={refreshAllData}
            className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
          >
            🔄 Sync Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-8 text-center">
          <p className="font-montserrat text-gray-300">Loading admin data...</p>
        </div>
      );
    }

      switch (activeSection) {
        case 'announcements':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Announcement Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <AnnouncementManager />
              </div>
            </div>
          );
        case 'resources':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Resource Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <ResourceManager />
              </div>
            </div>
          );
        case 'processes':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Process Documentation Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <ProcessManager />
              </div>
            </div>
          );
        case 'awarded-teams':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Awarded Teams Connect Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <AwardedTeamsManager onBack={() => setActiveSection('overview')} users={sheetData.users} />
              </div>
            </div>
          );
        case 'awarded-teams-info':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Awarded Teams Info Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <AwardedTeamsInfoManager />
              </div>
            </div>
          );
        case 'users':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">User Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
                    <h4 className="font-montserrat font-medium text-white mb-2">Admins</h4>
                    <p className="text-2xl font-bold text-[#9050E9]">{sheetData.users.filter((u: any) => u.role === 'admin').length}</p>
                    <p className="text-sm text-[#9D9FA9]">Total admins</p>
                  </div>
                  <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
                    <h4 className="font-montserrat font-medium text-white mb-2">Reviewers</h4>
                    <p className="text-2xl font-bold text-[#9050E9]">{sheetData.users.filter((u: any) => u.role === 'reviewer').length}</p>
                    <p className="text-sm text-[#9D9FA9]">Total reviewers</p>
                  </div>
                  <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
                    <h4 className="font-montserrat font-medium text-white mb-2">Team Accounts</h4>
                    <p className="text-2xl font-bold text-[#9050E9]">{sheetData.users.filter((u: any) => u.role === 'team' || u.role === 'team_leader').length}</p>
                    <p className="text-sm text-[#9D9FA9]">Total team accounts</p>
                  </div>
                </div>
                <UserManager />
              </div>
            </div>
          );
        case 'support-tickets':
          return <SupportTicketManager />;

        case 'voting-settings':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Voting Settings Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <VotingSettingsManager />
              </div>
            </div>
          );
        case 'reviewer-tests':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Reviewer Tests Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <ReviewerTestsManager />
              </div>
            </div>
          );
        case 'milestone-reports':
          return (
            <div className="space-y-6">
              <MilestoneReportsManager onBack={() => setActiveSection('overview')} />
            </div>
          );

        case 'partners':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Partner Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <PartnerManager />
              </div>
            </div>
          );

        case 'sso-did-link':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Link Deep-ID DID</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <DIDLinker />
              </div>
            </div>
          );

        case 'organizations':
          return (
            <div className="space-y-6">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="font-montserrat font-semibold text-xl text-white">Organization Management</h3>
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                  >
                    ← Back to Overview
                  </button>
                </div>
                <OrganizationManager />
              </div>
            </div>
          );

      default:
        return renderOverview();
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ background: 'transparent' }}
        />
        <Header title="Admin Management" />
        
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative overflow-y-auto">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-[rgba(12,2,30,0.3)] rounded-3xl border border-[#9D9FA9] pointer-events-none" />
            <div className="relative z-10">
              {renderContent()}
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function DIDLinker() {
  const [lookup, setLookup] = useState('');
  const [deepDid, setDeepDid] = useState('');
  const [targetType, setTargetType] = useState<'auto'|'partners'|'awarded_team'|'user_app'>('auto');
  const [result, setResult] = useState<{ type: 'success'|'error'; message: string }|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ table: 'partners'|'awarded_team'|'user_app'; id: string; username: string; name: string; label: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [hoverIndex, setHoverIndex] = useState<number>(-1);

  useEffect(() => {
    let timer: any;
    if (lookup.trim().length > 0) {
      setLoadingSuggest(true);
      const q = lookup.trim();
      timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/admin/sso/search-users?q=${encodeURIComponent(q)}&target=${encodeURIComponent(targetType)}`, { credentials: 'include' });
          const data = await res.json();
          if (q === lookup.trim()) {
            setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
            setShowDropdown(true);
            setLastQuery(q);
          }
        } catch {
          setSuggestions([]);
          setShowDropdown(false);
        } finally {
          setLoadingSuggest(false);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setLoadingSuggest(false);
    }
    return () => timer && clearTimeout(timer);
  }, [lookup, targetType]);

  const submit = async () => {
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/sso/link-deep-did', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookup, deepDid, targetType }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setResult({ type: 'success', message: 'DID linked successfully.' });
      setLookup('');
      setDeepDid('');
      setTargetType('auto');
      setSuggestions([]);
      setShowDropdown(false);
    } catch (e: any) {
      setResult({ type: 'error', message: e?.message || 'Failed to link DID' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/80 mb-1">Lookup (username, ID, or name)</label>
          <div className="relative">
            <input
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g., alice, team_123, John Doe"
              value={lookup}
              onChange={(e) => { setLookup(e.target.value); setShowDropdown(true); }}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              onKeyDown={(e) => {
                if (!showDropdown || suggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHoverIndex((prev) => (prev + 1) % suggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHoverIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === 'Enter' && hoverIndex >= 0) {
                  e.preventDefault();
                  const s = suggestions[hoverIndex];
                  const val = s.username || s.name || s.id;
                  setLookup(val);
                  setTargetType(s.table);
                  setShowDropdown(false);
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
            />
            {showDropdown && (loadingSuggest || suggestions.length > 0) && (
              <div className="absolute z-20 mt-1 w-full bg-[#0C021E] border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-auto">
                {loadingSuggest && (
                  <div className="px-4 py-2 text-sm text-white/60">Searching...</div>
                )}
                {!loadingSuggest && suggestions.length === 0 && (
                  <div className="px-4 py-2 text-sm text-white/60">No matches</div>
                )}
                {!loadingSuggest && suggestions.map((s, idx) => {
                  const isActive = idx === hoverIndex;
                  return (
                    <button
                      key={`${s.table}:${s.id}`}
                      type="button"
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(-1)}
                      onClick={() => {
                        const val = s.username || s.name || s.id;
                        setLookup(val);
                        setTargetType(s.table);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-white/80'} hover:bg-white/10`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.label}</span>
                        <span className="text-xs text-white/40">{s.table}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/80 mb-1">Deep-ID (did:...)</label>
          <input
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="did:example:123456"
            value={deepDid}
            onChange={(e) => setDeepDid(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {(['auto','partners','awarded_team','user_app'] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-white/80 text-sm">
            <input
              type="radio"
              name="targetType"
              checked={targetType === opt}
              onChange={() => setTargetType(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={submitting || !lookup || !deepDid}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50 hover:from-purple-500 hover:to-indigo-500 transition-all"
        >
          {submitting ? 'Linking...' : 'Link DID'}
        </button>
        {result && (
          <span className={`text-sm ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {result.message}
          </span>
        )}
      </div>
      <p className="text-xs text-white/50">
        Auto mode searches across partners, awarded_team, and user_app and updates the first match.
      </p>
    </div>
  );
}
