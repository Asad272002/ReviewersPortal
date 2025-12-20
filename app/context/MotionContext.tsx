'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MotionContextType {
  motionEnabled: boolean;
  toggleMotion: () => void;
}

const MotionContext = createContext<MotionContextType | undefined>(undefined);

export const MotionProvider = ({ children }: { children: ReactNode }) => {
  const [motionEnabled, setMotionEnabled] = useState(true); // Default to true initially to match server render or hydration

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboardMotion');
      if (saved) {
        setMotionEnabled(saved === 'on');
      } else {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setMotionEnabled(!reduce);
      }
    } catch {
      setMotionEnabled(true);
    }
  }, []);

  const toggleMotion = () => {
    setMotionEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboardMotion', next ? 'on' : 'off');
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <MotionContext.Provider value={{ motionEnabled, toggleMotion }}>
      {children}
    </MotionContext.Provider>
  );
};

export const useMotion = (): MotionContextType => {
  const context = useContext(MotionContext);
  if (context === undefined) {
    throw new Error('useMotion must be used within a MotionProvider');
  }
  return context;
};
