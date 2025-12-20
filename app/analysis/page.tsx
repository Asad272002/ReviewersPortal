'use client';

import { useState, useEffect, useRef } from 'react';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Report {
  id: string;
  proposal_title: string;
  milestone_title: string;
  milestone_number: string;
  date: string;
  verdict: string;
  document_url: string;
  created_at: string;
}

interface ReviewerStats {
    name: string;
    total: number;
    approved: number;
    rejected: number;
    lastActive: string;
}

interface AdminData {
    totalReports: number;
    approvedCount: number;
    rejectedCount: number;
    reviewers: ReviewerStats[];
}

export default function AnalysisPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, [viewMode]);

  useEffect(() => {
      // Three.js background
      if (!canvasRef.current) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      camera.position.z = 5;

      const particles = new THREE.BufferGeometry();
      const count = 100;
      const positions = new Float32Array(count * 3);
      for(let i=0; i<count*3; i++) positions[i] = (Math.random() - 0.5) * 20;
      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ size: 0.05, color: 0x9050E9, transparent: true, opacity: 0.5 });
      const points = new THREE.Points(particles, material);
      scene.add(points);

      const animate = () => {
          requestAnimationFrame(animate);
          points.rotation.y += 0.001;
          points.rotation.x += 0.0005;
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'global' ? '/api/admin/analysis' : '/api/analysis';
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (data.success) {
          if (viewMode === 'global') {
              setAdminData(data.data);
          } else {
              setReports(data.reports);
          }
      }
    } catch (error) {
      console.error('Failed to fetch analysis data', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Logic
  const stats = viewMode === 'global' && adminData ? {
      total: adminData.totalReports,
      approved: adminData.approvedCount,
      rejected: adminData.rejectedCount
  } : {
      total: reports.length,
      approved: reports.filter(r => r.verdict === 'Approved').length,
      rejected: reports.filter(r => r.verdict === 'Rejected').length
  };

  const otherCount = stats.total - stats.approved - stats.rejected;

  const chartData = [
    { name: 'Approved', value: stats.approved, color: '#4CAF50' },
    { name: 'Rejected', value: stats.rejected, color: '#F44336' },
    ...(otherCount > 0 ? [{ name: 'Pending/Other', value: otherCount, color: '#FF9800' }] : [])
  ];

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E] relative overflow-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />
        <Header title={viewMode === 'global' ? "Global Analysis" : "My Analysis"} />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Role-based Toggle */}
              {user?.role === 'admin' && (
                  <div className="flex justify-center mb-6">
                      <div className="bg-[#1A0A3A] border border-[#9D9FA9]/30 rounded-full p-1 flex gap-1 shadow-lg">
                          <button
                              onClick={() => setViewMode('personal')}
                              className={`px-6 py-2 rounded-full font-montserrat text-sm font-medium transition-all ${viewMode === 'personal' ? 'bg-[#9050E9] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                          >
                              My Stats
                          </button>
                          <button
                              onClick={() => setViewMode('global')}
                              className={`px-6 py-2 rounded-full font-montserrat text-sm font-medium transition-all ${viewMode === 'global' ? 'bg-[#9050E9] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                          >
                              Global Overview
                          </button>
                      </div>
                  </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#9D9FA9]/30 rounded-2xl p-6 shadow-lg hover:shadow-[0_0_20px_rgba(144,80,233,0.15)] transition-all animate-fade-in" style={{animationDelay: '0.1s'}}>
                  <h3 className="text-gray-400 font-montserrat text-sm uppercase tracking-wider mb-2">{viewMode === 'global' ? 'Global Reports' : 'Total Reports'}</h3>
                  <p className="text-4xl font-bold text-white font-montserrat">{stats.total}</p>
                </div>
                <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#4CAF50]/30 rounded-2xl p-6 shadow-lg hover:shadow-[0_0_20px_rgba(76,175,80,0.15)] transition-all animate-fade-in" style={{animationDelay: '0.2s'}}>
                  <h3 className="text-green-400 font-montserrat text-sm uppercase tracking-wider mb-2">Approved</h3>
                  <p className="text-4xl font-bold text-white font-montserrat">{stats.approved}</p>
                </div>
                <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#F44336]/30 rounded-2xl p-6 shadow-lg hover:shadow-[0_0_20px_rgba(244,67,54,0.15)] transition-all animate-fade-in" style={{animationDelay: '0.3s'}}>
                  <h3 className="text-red-400 font-montserrat text-sm uppercase tracking-wider mb-2">Rejected</h3>
                  <p className="text-4xl font-bold text-white font-montserrat">{stats.rejected}</p>
                </div>
              </div>

              {/* Chart Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#9D9FA9]/30 rounded-2xl p-6 shadow-xl animate-slide-down">
                   <h3 className="text-xl font-semibold text-white font-montserrat mb-6">Verdict Distribution</h3>
                   <div className="h-[300px] w-full">
                     {isMounted && stats.total > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              isAnimationActive={true}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1A0A3A', borderColor: '#9D9FA9', color: '#fff', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                     ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <p className="text-gray-500 font-montserrat">No data available</p>
                        </div>
                     )}
                   </div>
                </div>

                {/* Second Card: Submission Trend OR Reviewer Stats */}
                 <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#9D9FA9]/30 rounded-2xl p-6 shadow-xl animate-slide-down flex flex-col" style={{animationDelay: '0.1s'}}>
                   <h3 className="text-xl font-semibold text-white font-montserrat mb-6">
                       {viewMode === 'global' ? 'Reviewer Activity' : 'Submission Trend'}
                   </h3>
                   {viewMode === 'global' ? (
                       <div className="flex-1 flex flex-col justify-center items-center text-center gap-4">
                           <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                               <span className="text-2xl font-bold text-primary">{adminData?.reviewers.length || 0}</span>
                           </div>
                           <div>
                               <p className="text-white font-montserrat font-medium">Active Reviewers</p>
                               <p className="text-gray-400 text-sm font-montserrat mt-1">Contributors tracked in system</p>
                           </div>
                       </div>
                   ) : (
                       <div className="h-[300px] w-full flex items-center justify-center flex-col gap-4 text-center p-6">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                          </div>
                          <p className="text-gray-400 font-montserrat">Trend analysis coming soon.</p>
                       </div>
                   )}
                </div>
              </div>

              {/* Data Table: Reviewer Leaderboard OR Personal Reports */}
              <div className="bg-[#1A0A3A]/80 backdrop-blur-md border border-[#9D9FA9]/30 rounded-2xl p-6 shadow-xl animate-slide-down" style={{animationDelay: '0.2s'}}>
                <h3 className="text-xl font-semibold text-white font-montserrat mb-6">
                    {viewMode === 'global' ? 'Reviewer Performance' : 'Recent Submissions'}
                </h3>
                
                {loading ? (
                    <div className="text-center py-8 text-gray-400 font-montserrat">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        {viewMode === 'global' && adminData ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#9D9FA9]/30 text-left">
                                        <th className="pb-4 pl-4 font-montserrat text-gray-400 font-medium">Reviewer</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium text-center">Total Reports</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium text-center">Approved</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium text-center">Rejected</th>
                                        <th className="pb-4 pr-4 font-montserrat text-gray-400 font-medium text-right">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#9D9FA9]/10">
                                    {adminData.reviewers.map((rev, idx) => (
                                        <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 pl-4 font-montserrat text-white font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                                                        {rev.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {rev.name}
                                                </div>
                                            </td>
                                            <td className="py-4 text-center font-montserrat text-white">{rev.total}</td>
                                            <td className="py-4 text-center font-montserrat text-green-400">{rev.approved}</td>
                                            <td className="py-4 text-center font-montserrat text-red-400">{rev.rejected}</td>
                                            <td className="py-4 pr-4 text-right font-montserrat text-gray-400 text-sm">
                                                {new Date(rev.lastActive).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#9D9FA9]/30 text-left">
                                        <th className="pb-4 pl-4 font-montserrat text-gray-400 font-medium">Date</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium">Milestone</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium">Proposal</th>
                                        <th className="pb-4 font-montserrat text-gray-400 font-medium">Verdict</th>
                                        <th className="pb-4 pr-4 font-montserrat text-gray-400 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#9D9FA9]/10">
                                    {reports.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400 font-montserrat">No reports submitted yet.</td></tr>
                                    ) : reports.map((report) => (
                                        <tr key={report.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 pl-4 font-montserrat text-white">{report.date}</td>
                                            <td className="py-4 font-montserrat text-white">{report.milestone_title} <span className="text-gray-500 text-sm">#{report.milestone_number}</span></td>
                                            <td className="py-4 font-montserrat text-gray-300">{report.proposal_title}</td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold font-montserrat
                                                    ${report.verdict === 'Approved' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
                                                      report.verdict === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
                                                      'bg-gray-500/20 text-gray-400 border border-gray-500/50'}`}>
                                                    {report.verdict}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                {report.document_url && (
                                                    <a 
                                                        href={report.document_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-primary hover:text-primary-light transition-colors font-montserrat text-sm"
                                                    >
                                                        View Report
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
              </div>
            </div>
          </main>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
