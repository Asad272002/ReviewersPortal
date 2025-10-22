'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
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
      // Fetch data from all sheets
      const [announcementsRes, resourcesRes, processesRes, usersRes, supportTicketsRes] = await Promise.all([
        fetch('/api/admin/announcements'),
        fetch('/api/admin/resources'),
        fetch('/api/admin/processes'),
        fetch('/api/admin/users'),
        fetch('/api/admin/support-tickets')
      ]);

      const announcements = announcementsRes.ok ? await announcementsRes.json() : {};
      const resources = resourcesRes.ok ? await resourcesRes.json() : {};
      const processes = processesRes.ok ? await processesRes.json() : {};
      const users = usersRes.ok ? await usersRes.json() : {};
      const supportTickets = supportTicketsRes.ok ? await supportTicketsRes.json() : {};

      setSheetData({
        announcements: announcements.announcements || [],
        resources: resources.resources || [],
        processes: processes.processes || [],
        users: users.data?.users || [],
        supportTickets: supportTickets.tickets || []
      });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
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
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* Three.js Canvas Background */}
          <canvas 
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'transparent' }}
          />
          <Header title="Access Denied" />
          <div className="flex flex-1 relative z-10">
            <Sidebar />
            <main className="flex-1 p-8">
              <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-8 text-center">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Access Denied</h2>
                <p className="font-montserrat text-gray-300">You need admin privileges to access this page.</p>
              </div>
            </main>
          </div>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-[#0C021E] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-montserrat font-semibold text-xl text-white">Google Sheets Data Overview</h3>
          <button
            onClick={refreshAllData}
            className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
          >
            🔄 Refresh All Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Announcements</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.announcements.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
          
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Resources</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.resources.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
          
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Process Docs</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.processes.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
          
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Support Tickets</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.supportTickets.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total tickets</p>
          </div>
        </div>
      </div>
      
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h3 className="font-montserrat font-semibold text-lg text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSection('announcements')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📢 Manage Announcements</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete announcements with full CRUD operations</p>
          </button>
          
          <button
            onClick={() => setActiveSection('resources')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📚 Manage Resources</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete resources with file upload support</p>
          </button>
          
          <button
            onClick={() => setActiveSection('processes')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📚 Manage Process Documentation</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete process documents, workflows, and procedures</p>
          </button>
          
          <button
            onClick={() => setActiveSection('awarded-teams')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">🏆 Awarded Teams Connect</h4>
            <p className="text-sm text-[#9D9FA9]">Manage team-reviewer assignments and chat connections</p>
          </button>

          <button
            onClick={() => setActiveSection('users')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">👤 Manage Users</h4>
            <p className="text-sm text-[#9D9FA9]">Add, update, delete users; reviewer-specific fields</p>
          </button>
          
          <button
            onClick={() => setActiveSection('support-tickets')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">🎫 Support Tickets Management</h4>
            <p className="text-sm text-[#9D9FA9]">View, manage, and respond to user support tickets</p>
          </button>

          <button
            onClick={() => setActiveSection('voting-settings')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">⚙️ Voting Settings</h4>
            <p className="text-sm text-[#9D9FA9]">Configure voting duration, vote changes, and minimum votes</p>
          </button>

        </div>
      </div>
    </div>
  );

  const renderDataSection = (sectionName: string, data: any[]) => (
    <div className="space-y-6">
      <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white capitalize">{sectionName} Data</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('overview')}
              className="bg-[#0C021E] hover:bg-white/10 border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300"
            >
              ← Back to Overview
            </button>
            <button
              onClick={refreshAllData}
              className="bg-[#0C021E] hover:bg-white/10 border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300"
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
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Google Sheets Integration</h4>
        <p className="font-montserrat text-gray-300 mb-4">
          This data is directly synced with your Google Sheets. Any changes made in the sheets will be reflected here after refreshing.
        </p>
        <div className="flex gap-4">
          <a
            href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || 'your-sheet-id'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
          >
            📊 Open Google Sheets
          </a>
          <button
            onClick={refreshAllData}
            className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
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
          <p className="font-montserrat text-gray-300">Loading data from Google Sheets...</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Announcement Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Resource Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Process Documentation Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Awarded Teams Connect Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  ← Back to Overview
                </button>
              </div>
              <AwardedTeamsManager onBack={() => setActiveSection('overview')} users={sheetData.users} />
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="space-y-6">
            <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">User Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  ← Back to Overview
                </button>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Voting Settings Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-[#0C021E] hover:bg-[#1A0A3A] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  ← Back to Overview
                </button>
              </div>
              <VotingSettingsManager />
            </div>
          </div>
        );

      default:
        return renderOverview();
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Three.js Canvas Background */}
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ background: 'transparent' }}
        />
        <Header title="Admin Management - Google Sheets Integration" />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-8 relative">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-[rgba(12,2,30,0.3)] rounded-3xl border border-[#9D9FA9] pointer-events-none" />
            <div className="relative z-10">
              {renderContent()}
            </div>
          </main>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}