import React, { useEffect, useState } from 'react';
import { ShieldAlert, EyeOff } from 'lucide-react';

export const ScreenshotProtector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSecure, setIsSecure] = useState(true);
  const [threatDetected, setThreatDetected] = useState(false);

  useEffect(() => {
    // 1. BLUR ON FOCUS LOSS (e.g. clicking away to snipping tool)
    const handleBlur = () => setIsSecure(false);
    const handleFocus = () => setIsSecure(true);

    // 2. DETECT SCREENSHOT KEYS (Best Effort)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect PrintScreen, Cmd+Shift+3/4 (Mac), Ctrl+P, etc.
      if (
        e.key === 'PrintScreen' || 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p')
      ) {
        setThreatDetected(true);
        // Force hide immediately
        setIsSecure(false);
        
        // Reset after a moment to allow normal usage again
        setTimeout(() => {
          setThreatDetected(false);
          setIsSecure(document.hasFocus());
        }, 2000);
      }
    };

    // 3. PREVENT CONTEXT MENU (Right Click)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // 4. POISON CLIPBOARD (Prevent Copy)
    const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault(); 
        if(e.clipboardData) {
            e.clipboardData.setData('text/plain', 'ACCESS DENIED: Content is encrypted and protected by FadeChat protocol.');
        }
    }

    // Attach listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy as any);
    document.addEventListener('visibilitychange', () => {
        setIsSecure(!document.hidden);
    });

    // Cleanup
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy as any);
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none -webkit-user-select-none overflow-hidden">
      {/* Content Layer - Only visible if secure and no threat */}
      {/* We use opacity/filter instead of unmounting to keep websocket connection alive */}
      <div 
        className={`w-full h-full transition-all duration-150 ${
          isSecure && !threatDetected ? 'opacity-100 blur-none filter-none' : 'opacity-0 blur-xl grayscale'
        }`}
      >
        {children}
      </div>

      {/* Protection Overlay */}
      {(!isSecure || threatDetected) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neon-dark/95 backdrop-blur-xl p-4 md:p-8 text-center animate-fade-in">
            {threatDetected ? (
                <div className="flex flex-col items-center">
                    <ShieldAlert className="w-16 h-16 md:w-20 md:h-20 text-red-500 mb-4 md:mb-6 animate-pulse" />
                    <h2 className="text-xl md:text-3xl font-bold text-red-500 mb-2 tracking-widest uppercase">Security Threat</h2>
                    <p className="text-sm md:text-base text-gray-400 max-w-md">Screen capture attempt detected. Display has been terminated to protect session integrity.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <EyeOff className="w-12 h-12 md:w-16 md:h-16 text-neon-blue mb-4 md:mb-6" />
                    <h2 className="text-lg md:text-2xl font-bold text-white mb-2 tracking-wide">Privacy Mode Active</h2>
                    <p className="text-sm md:text-base text-gray-500">Content is hidden while window is inactive.</p>
                    <p className="text-xs text-gray-700 mt-4">Click anywhere to resume session.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};