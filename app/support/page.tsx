'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";

import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Create support-themed particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;

      // Support-themed colors (purples, blues, whites)
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        colors[i] = 0.56; colors[i + 1] = 0.31; colors[i + 2] = 0.91; // Purple
      } else if (colorChoice < 0.7) {
        colors[i] = 0.4; colors[i + 1] = 0.7; colors[i + 2] = 1.0; // Light blue
      } else {
        colors[i] = 1.0; colors[i + 1] = 1.0; colors[i + 2] = 1.0; // White
      }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      
      particles.rotation.x += 0.001;
      particles.rotation.y += 0.002;
      
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/admin/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitMessage('Support ticket submitted successfully! We will get back to you soon.');
        setFormData({
          name: '',
          email: '',
          category: '',
          message: ''
        });
      } else {
        const errorData = await response.json();
        setSubmitMessage(`Error: ${errorData.error || 'Failed to submit ticket'}`);
      }
    } catch (error) {
      setSubmitMessage('Error: Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0C021E] via-[#1A0A3A] to-[#2A1A4A] relative">
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 z-0"
          style={{ pointerEvents: 'none' }}
        />
        <Header title="Contact & Support" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Email" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-gray-200">Email Support</h3>
                    </div>
                    <p className="font-montserrat text-gray-200 pl-11 mb-1">For general inquiries:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">support@reviewcircle.com</p>
                    
                    <p className="font-montserrat text-gray-200 pl-11 mb-1 mt-3">For technical issues:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">tech@reviewcircle.com</p>
                  </div>
                  
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Phone" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-gray-200">Phone Support</h3>
                    </div>
                    <p className="font-montserrat text-gray-200 pl-11 mb-1">Support Hotline:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">+1 (555) 123-4567</p>
                    
                    <p className="font-montserrat text-gray-200 pl-11 mb-1 mt-3">Hours of Operation:</p>
                    <p className="font-montserrat text-gray-200 pl-11">Monday - Friday, 9:00 AM - 5:00 PM UTC</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Live Chat" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-gray-200">Live Chat</h3>
                    </div>
                    <p className="font-montserrat text-gray-200 pl-11 mb-2">Available during business hours</p>
                    <button className="font-montserrat ml-11 px-4 py-2 bg-[#9050E9] text-white rounded-lg hover:bg-[#A96AFF] transition-all duration-300">
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Submit Support Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block font-montserrat text-gray-200 mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded-lg text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-montserrat text-gray-200 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded-lg text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-montserrat text-gray-200 mb-2">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded-lg text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    >
                      <option value="">Select a category</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-montserrat text-gray-200 mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded-lg text-white font-montserrat focus:outline-none focus:border-[#9050E9] resize-none"
                      placeholder="Please describe your issue or question in detail..."
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] text-white font-montserrat font-medium rounded-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
                
                {submitMessage && (
                  <div className={`mt-4 p-3 rounded-lg font-montserrat ${
                    submitMessage.includes('Error') 
                      ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                      : 'bg-green-500/20 border border-green-500/50 text-green-300'
                  }`}>
                    {submitMessage}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] p-6">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div className="border-b border-[#9D9FA9] pb-4">
                  <h3 className="font-montserrat font-medium text-lg text-gray-200 mb-2">How do I reset my password?</h3>
                  <p className="font-montserrat text-gray-300">You can reset your password by clicking the "Forgot Password" link on the login page and following the instructions sent to your email.</p>
                </div>
                
                <div className="border-b border-[#9D9FA9] pb-4">
                  <h3 className="font-montserrat font-medium text-lg text-gray-200 mb-2">How do I submit a proposal for review?</h3>
                  <p className="font-montserrat text-gray-300">Navigate to the "Requirement Documents" section and click on "Submit Your Proposal" to access the submission form.</p>
                </div>
                
                <div>
                  <h3 className="font-montserrat font-medium text-lg text-gray-200 mb-2">What file formats are supported for document uploads?</h3>
                  <p className="font-montserrat text-gray-300">We support PDF, DOC, DOCX, and TXT file formats for document uploads. Maximum file size is 10MB per file.</p>
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
