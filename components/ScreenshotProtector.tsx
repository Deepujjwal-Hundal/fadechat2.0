import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, EyeOff, Lock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreenshotProtectorProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const ScreenshotProtector: React.FC<ScreenshotProtectorProps> = ({ 
  children,
  enabled = true 
}) => {
  const [isSecure, setIsSecure] = useState(true);
  const [threatDetected, setThreatDetected] = useState(false);
  const [threatType, setThreatType] = useState<string>('');

  const handleThreat = useCallback((type: string) => {
    setThreatDetected(true);
    setThreatType(type);
    setIsSecure(false);

    setTimeout(() => {
      setThreatDetected(false);
      setThreatType('');
      setIsSecure(document.hasFocus());
    }, 3000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. BLUR ON FOCUS LOSS
    const handleBlur = () => setIsSecure(false);
    const handleFocus = () => {
      if (!threatDetected) setIsSecure(true);
    };

    // 2. DETECT SCREENSHOT KEYS
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        handleThreat('Screenshot key detected');
        return;
      }
      
      // Mac screenshots (Cmd+Shift+3/4/5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        handleThreat('Screen capture shortcut detected');
        return;
      }

      // Print dialog (Ctrl/Cmd+P)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleThreat('Print attempt blocked');
        return;
      }

      // Developer tools (F12, Ctrl+Shift+I)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        handleThreat('Developer tools blocked');
        return;
      }
    };

    // 3. PREVENT CONTEXT MENU
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. POISON CLIPBOARD
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData(
        'text/plain', 
        '⚠️ SECURITY VIOLATION: Content is protected by FadeChat encryption protocol. Unauthorized copying is blocked.'
      );
    };

    // 5. VISIBILITY CHANGE
    const handleVisibilityChange = () => {
      if (!threatDetected) {
        setIsSecure(!document.hidden);
      }
    };

    // 6. DETECT DEVTOOLS (Basic)
    const checkDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // DevTools might be open
      }
    };

    // Attach listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', checkDevTools);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', checkDevTools);
    };
  }, [enabled, threatDetected, handleThreat]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative w-full h-full select-none overflow-hidden"
      style={{ WebkitUserSelect: 'none' }}
      data-testid="screenshot-protector"
    >
      {/* Content Layer */}
      <motion.div 
        className="w-full h-full"
        animate={{
          opacity: isSecure && !threatDetected ? 1 : 0,
          filter: isSecure && !threatDetected ? 'blur(0px)' : 'blur(30px)',
          scale: isSecure && !threatDetected ? 1 : 0.98
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

      {/* Protection Overlay */}
      <AnimatePresence>
        {(!isSecure || threatDetected) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/98 backdrop-blur-xl p-8 text-center"
          >
            {threatDetected ? (
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(255,51,51,0.3)',
                      '0 0 60px rgba(255,51,51,0.6)',
                      '0 0 20px rgba(255,51,51,0.3)'
                    ]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="p-6 rounded-full bg-danger/10 border border-danger/30 mb-6"
                >
                  <ShieldAlert className="w-16 h-16 text-danger" />
                </motion.div>
                
                <h2 className="text-3xl font-heading font-bold text-danger mb-3 tracking-tight">
                  SECURITY BREACH
                </h2>
                <p className="text-text_secondary text-sm max-w-md mb-4">
                  {threatType || 'Screen capture attempt detected'}
                </p>
                <div className="flex items-center gap-2 text-xs text-danger/80 bg-danger/10 px-4 py-2 rounded-full border border-danger/20">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Display terminated to protect session integrity</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-5 rounded-full bg-primary/10 border border-primary/30 mb-6"
                >
                  <EyeOff className="w-12 h-12 text-primary" />
                </motion.div>
                
                <h2 className="text-2xl font-heading font-bold text-text_primary mb-2">
                  Privacy Mode Active
                </h2>
                <p className="text-text_secondary text-sm mb-6">
                  Content hidden while window is inactive
                </p>
                
                <div className="flex items-center gap-2 text-xs text-text_muted bg-surface px-4 py-2 rounded-full border border-border">
                  <Lock className="w-3 h-3 text-primary" />
                  <span>Click anywhere to resume secure session</span>
                </div>
              </motion.div>
            )}

            {/* Animated security grid */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,240,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,240,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                  animation: 'moveGrid 20s linear infinite'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes moveGrid {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
};

export default ScreenshotProtector;
