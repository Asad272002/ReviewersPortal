'use client';

import { useState } from 'react';
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
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Contact & Support" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Email" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Email Support</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] pl-11 mb-1">For general inquiries:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">support@reviewcircle.com</p>
                    
                    <p className="font-montserrat text-[#9D9FA9] pl-11 mb-1 mt-3">For technical issues:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">tech@reviewcircle.com</p>
                  </div>
                  
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Phone" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Phone Support</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] pl-11 mb-1">Support Hotline:</p>
                    <p className="font-montserrat text-[#9050E9] pl-11">+1 (555) 123-4567</p>
                    
                    <p className="font-montserrat text-[#9D9FA9] pl-11 mb-1 mt-3">Hours of Operation:</p>
                    <p className="font-montserrat text-[#9D9FA9] pl-11">Monday - Friday, 9:00 AM - 5:00 PM UTC</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                        <Image src="/icons/support-icon.svg" alt="Chat" width={16} height={16} />
                      </div>
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Live Chat</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] pl-11 mb-3">Available during business hours for immediate assistance.</p>
                    <button className="ml-11 bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors">
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Submit a Support Ticket</h2>
                {submitMessage && (
                  <div className={`mb-4 p-3 rounded ${
                    submitMessage.includes('Error') 
                      ? 'bg-red-500/20 border border-red-500 text-red-300' 
                      : 'bg-green-500/20 border border-green-500 text-green-300'
                  }`}>
                    {submitMessage}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block font-montserrat text-[#9D9FA9] mb-2">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block font-montserrat text-[#9D9FA9] mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                      placeholder="Your Email"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block font-montserrat text-[#9D9FA9] mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                      required
                    >
                      <option value="">Select a Category</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account Access</option>
                      <option value="review">Review Process</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block font-montserrat text-[#9D9FA9] mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                      placeholder="Describe your issue or question"
                      required
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </form>
              </div>
              
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">FAQ</h2>
                <div className="space-y-4">
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">How do I reset my password?</h3>
                    <p className="font-montserrat text-[#9D9FA9]">
                      To reset your password, click on the "Forgot Password" link on the login page. You will receive an email with instructions to create a new password.
                    </p>
                  </div>
                  
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">What if I can't access my assigned proposals?</h3>
                    <p className="font-montserrat text-[#9D9FA9]">
                      If you're having trouble accessing your assigned proposals, please contact technical support at tech@reviewcircle.com with your username and a description of the issue.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9] mb-2">How do I update my profile information?</h3>
                    <p className="font-montserrat text-[#9D9FA9]">
                      You can update your profile information by navigating to the "Profile" section in your account settings. From there, you can edit your personal information, contact details, and notification preferences.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Support Resources</h2>
                <div className="space-y-4">
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">User Guide</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">Comprehensive guide to using the Review Circle platform.</p>
                    <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors ml-9">
                      View Guide
                    </button>
                  </div>
                  
                  <div className="border-b border-[#9D9FA9] pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Video Tutorials</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">Step-by-step video guides for common tasks and procedures.</p>
                    <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors ml-9">
                      View Tutorials
                    </button>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                      <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Troubleshooting Guide</h3>
                    </div>
                    <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">Solutions to common issues and technical problems.</p>
                    <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors ml-9">
                      View Guide
                    </button>
                  </div>
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