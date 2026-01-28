'use client';

import { useState } from 'react';
import { Webchat, Fab, Configuration } from '@botpress/webchat';

const clientId = "9fdf924e-0ab1-458f-af70-d643bc7e3027";
const configuration: Configuration = { 
  color: '#9050E9', // Matching the purple theme
};

export default function BotpressChat() {
  const [isWebchatOpen, setIsWebchatOpen] = useState(false);
  const toggleWebchat = () => setIsWebchatOpen((prev) => !prev);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Fab onClick={toggleWebchat} />
      </div>
      <div 
        style={{ 
          display: isWebchatOpen ? 'block' : 'none',
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          zIndex: 50,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          width: '380px',
          height: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh'
        }} 
      > 
        <Webchat clientId={clientId} configuration={configuration} /> 
      </div>
    </>
  );
}
