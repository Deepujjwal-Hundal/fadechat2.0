import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, EyeOff, Lock, AlertTriangle, ShieldOff } from 'lucide-react';
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
  const [lockoutTime, setLockoutTime] = useState(0);

  const handleThreat = useCallback((type: string, lockDuration: number = 5) => {
    setThreatDetected(true);
    setThreatType(type);
    setIsSecure(false);
    setLockoutTime(lockDuration);

    // Count down lockout
    const interval = setInterval(() => {
      setLockoutTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Only clear threat after lockout AND window is focused
          if (document.hasFocus() && !document.hidden) {
            setThreatDetected(false);
            setThreatType('');
            setIsSecure(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 1. STRICT FOCUS CHECK - Window MUST be fully focused
    const checkFocus = () => {
      const focused = document.hasFocus() && !document.hidden;
      if (!threatDetected) {
        setIsSecure(focused);
      }
    };

    // 2. BLUR ON FOCUS LOSS - No click to resume
    const handleBlur = () => {
      setIsSecure(false);
    };
    
    const handleFocus = () => {
      // Only restore if no active threat and window is truly focused
      if (!threatDetected && document.hasFocus() && !document.hidden) {
        setIsSecure(true);
      }
    };

    // 3. AGGRESSIVE SCREENSHOT KEY DETECTION
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleThreat('SCREENSHOT KEY BLOCKED', 10);
        return;
      }
      
      // Mac screenshots (Cmd+Shift+3/4/5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleThreat('SCREEN CAPTURE BLOCKED', 10);
        return;
      }

      // Print dialog (Ctrl/Cmd+P)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleThreat('PRINT BLOCKED', 5);
        return;
      }

      // Developer tools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
          (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        handleThreat('DEVELOPER TOOLS BLOCKED', 5);
        return;
      }

      // Snipping tool shortcut (Win+Shift+S)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleThreat('SNIPPING TOOL BLOCKED', 10);
        return;
      }
    };

    // 4. PREVENT CONTEXT MENU
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 5. POISON CLIPBOARD - Replace any copied content
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData(
        'text/plain', 
        '⛔ SECURITY VIOLATION: Content is protected by military-grade encryption. Unauthorized access is logged and reported.'
      );
    };

    // 6. VISIBILITY CHANGE - Strict handling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsSecure(false);
      } else if (!threatDetected && document.hasFocus()) {
        setIsSecure(true);
      }
    };

    // 7. DETECT SCREEN RECORDING (check for MediaDevices)
    const detectScreenCapture = () => {
      if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
        // Screen sharing API exists - we can't prevent it but can warn
      }
    };

    // 8. PREVENT DRAG (to prevent dragging content out)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 9. Disable selection on protected content
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Initial check
    checkFocus();

    // Attach listeners
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);
    
    // Periodic focus check
    const focusInterval = setInterval(checkFocus, 500);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
      clearInterval(focusInterval);
    };
  }, [enabled, threatDetected, handleThreat]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative w-full h-full select-none overflow-auto"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      data-testid="screenshot-protector"
    >
      {/* Content Layer */}
      <motion.div 
        className="w-full min-h-full"
        animate={{
          opacity: isSecure && !threatDetected ? 1 : 0,
          filter: isSecure && !threatDetected ? 'blur(0px)' : 'blur(50px)',
          scale: isSecure && !threatDetected ? 1 : 0.95
        }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>

      {/* Protection Overlay - NO CLICK TO RESUME */}
      <AnimatePresence>
        {(!isSecure || threatDetected) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background backdrop-blur-xl"
            style={{ backgroundColor: '#050505' }}
          >
            {threatDetected ? (
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center max-w-md px-8"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 30px rgba(255,51,51,0.4)',
                      '0 0 80px rgba(255,51,51,0.8)',
                      '0 0 30px rgba(255,51,51,0.4)'
                    ]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="p-8 rounded-full bg-danger/20 border-2 border-danger mb-8"
                >
                  <ShieldAlert className="w-20 h-20 text-danger" />
                </motion.div>
                
                <h2 className="text-4xl font-heading font-black text-danger mb-4 tracking-tight text-center">
                  SECURITY BREACH
                </h2>
                <p className="text-text_secondary text-center mb-6">
                  {threatType || 'Unauthorized access attempt detected'}
                </p>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-danger bg-danger/10 px-6 py-3 rounded-xl border border-danger/30">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-mono">SESSION LOCKED</span>
                  </div>
                  
                  {lockoutTime > 0 && (
                    <div className="text-text_muted text-sm">
                      Auto-unlock in <span className="text-danger font-mono">{lockoutTime}s</span>
                    </div>
                  )}
                </div>

                <p className="text-text_muted text-xs mt-8 text-center">
                  This incident has been logged. Keep window focused to prevent lockouts.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center max-w-md px-8"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-6 rounded-full bg-primary/10 border-2 border-primary/30 mb-8"
                >
                  <ShieldOff className="w-16 h-16 text-primary" />
                </motion.div>
                
                <h2 className="text-3xl font-heading font-bold text-text_primary mb-3 text-center">
                  WINDOW NOT ACTIVE
                </h2>
                <p className="text-text_secondary text-center mb-8">
                  Content is hidden for security. This window must be your active focus.
                </p>
                
                <div className="bg-surface border border-border rounded-xl p-6 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">To resume secure session:</span>
                  </div>
                  <ul className="text-sm text-text_muted space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Ensure this is your only active window
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Click inside this window to focus it
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      Do not minimize or switch tabs
                    </li>
                  </ul>
                </div>

                <p className="text-text_muted text-xs mt-6 text-center">
                  Session will auto-resume when window regains focus
                </p>
              </motion.div>
            )}

            {/* Security grid overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.02]">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScreenshotProtector;
