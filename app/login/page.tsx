'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(username, password);
      
      if (success) {
        router.push('/');
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-card-bg p-8 rounded-xl border border-border-color shadow-card">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Image 
                src="/icons/profile-icon.svg" 
                alt="Login" 
                width={40} 
                height={40} 
                className="text-primary-light"
              />
            </div>
          </div>
          <h1 className="font-montserrat font-bold text-3xl text-white mb-2">Review Circle</h1>
          <p className="font-montserrat text-text-secondary">Your Gateway To <span className="text-primary-light">Proposal Excellence</span></p>
        </div>
        
        {error && (
          <div className="bg-error/10 border border-error text-white p-4 rounded-lg mb-6 animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block font-montserrat text-text-secondary mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block font-montserrat text-text-secondary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-light text-white font-montserrat font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-button"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging in...</span>
              </div>
            ) : 'Login'}
          </button>
        </form>
        
        <div className="mt-8 p-4 bg-background-light rounded-lg border border-border-color">
          <h3 className="font-montserrat font-medium text-white text-sm mb-2">Demo Credentials</h3>
          <div className="space-y-1 text-sm">
            <p className="font-montserrat text-text-secondary">
              <span className="text-primary-light">Reviewer:</span> reviewer1 / password123
            </p>
            <p className="font-montserrat text-text-secondary">
              <span className="text-primary-light">Admin:</span> admin1 / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}