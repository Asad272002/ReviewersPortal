'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { MessageCircle, X } from 'lucide-react';

export default function BotpressChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTooltipDismissed, setIsTooltipDismissed] = useState(false);

  useEffect(() => {
    // Initialize botpress when the script is loaded
    if (isLoaded && window.botpress) {
      window.botpress.on("webchat:opened", () => setIsOpen(true));
      window.botpress.on("webchat:closed", () => setIsOpen(false));

      window.botpress.init({
        "botId": "b62b8ccf-747f-4199-b3da-cbd76cdb2a3e",
        "configuration": {
          "version": "v2",
          "botName": "Review Circle Assistant",
          "botAvatar": "https://files.bpcontent.cloud/2026/01/08/17/20260108174018-8HFKGK8J.png",
          "botDescription": "Ask me about Review Circle protocols, reviewers, or guidelines!",
          "website": {},
          "email": {},
          "phone": {},
          "termsOfService": {},
          "privacyPolicy": {},
          "color": "#9050E9",
          "variant": "solid",
          "headerVariant": "glass",
          "themeMode": "light",
          "fontFamily": "inter",
          "radius": 2,
          "feedbackEnabled": false,
          "footer": "https://botpress.com/?from=webchat",
          "soundEnabled": false,
          "proactiveMessageEnabled": false,
          "proactiveBubbleMessage": "Hi! 👋 Need help?",
          "proactiveBubbleTriggerType": "afterDelay",
          "proactiveBubbleDelayTime": 10
        },
        "clientId": "9fdf924e-0ab1-458f-af70-d643bc7e3027"
      });
    }
  }, [isLoaded]);

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end pointer-events-none">
      {/* Script Loader */}
      <Script 
        src="https://cdn.botpress.cloud/webchat/v3.5/inject.js" 
        onLoad={() => setIsLoaded(true)}
        strategy="lazyOnload"
      />
      
      {/* Information Card - Dismissible */}
      {!isOpen && !isTooltipDismissed && (
        <div className="absolute bottom-[80px] right-0 mb-4 mr-4 w-64 bg-white p-4 rounded-lg shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-700 z-50 pointer-events-auto">
          <button 
            onClick={() => setIsTooltipDismissed(true)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-full text-[#9050E9]">
              <MessageCircle size={20} />
            </div>
            <span className="font-semibold text-gray-800">Need Help?</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            I can answer all questions for the awarded team and milestones related to Gitbook.
          </p>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-100"></div>
        </div>
      )}
    </div>
  );
}

// Add types for window.botpress
declare global {
  interface Window {
    botpress: any;
  }
}
