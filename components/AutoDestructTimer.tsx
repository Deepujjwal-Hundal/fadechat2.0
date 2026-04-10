import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

interface AutoDestructTimerProps {
  expiresAt: number;
  ttl: number;
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showWarning?: boolean;
}

export const AutoDestructTimer: React.FC<AutoDestructTimerProps> = ({
  expiresAt,
  ttl,
  onExpire,
  size = 'sm',
  showWarning = true
}) => {
  const [remaining, setRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const calculateRemaining = useCallback(() => {
    const now = Date.now();
    const diff = Math.max(0, expiresAt - now);
    return Math.ceil(diff / 1000);
  }, [expiresAt]);

  useEffect(() => {
    setRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const newRemaining = calculateRemaining();
      setRemaining(newRemaining);

      if (newRemaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, isExpired, onExpire]);

  const progress = ttl > 0 ? (remaining / ttl) * 100 : 0;
  const isWarning = remaining <= 10 && remaining > 0;
  const circumference = 2 * Math.PI * 10;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const sizes = {
    sm: { wrapper: 'w-6 h-6', text: 'text-[8px]', stroke: 2 },
    md: { wrapper: 'w-8 h-8', text: 'text-[10px]', stroke: 2.5 },
    lg: { wrapper: 'w-12 h-12', text: 'text-xs', stroke: 3 }
  };

  const config = sizes[size];

  if (isExpired) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" data-testid="auto-destruct-timer">
      <div className={`relative ${config.wrapper}`}>
        {/* Background Circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-surface"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={isWarning ? 'text-danger' : 'text-warning'}
            initial={false}
            animate={{
              strokeDashoffset,
              stroke: isWarning ? '#FF3333' : '#FFD700'
            }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        
        {/* Timer Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${config.text} font-mono ${isWarning ? 'text-danger' : 'text-warning'}`}>
            {remaining}
          </span>
        </div>
      </div>

      {showWarning && isWarning && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-danger"
        >
          <AlertTriangle className="w-3 h-3 animate-pulse" />
        </motion.div>
      )}
    </div>
  );
};

interface DestructBadgeProps {
  ttl: number;
  isOwnMessage?: boolean;
}

export const DestructBadge: React.FC<DestructBadgeProps> = ({ ttl, isOwnMessage }) => {
  if (ttl <= 0) return null;

  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono
        ${isOwnMessage ? 'bg-background/20 text-background/70' : 'bg-warning/10 text-warning'}
      `}
      data-testid="destruct-badge"
    >
      <Clock className="w-2.5 h-2.5" />
      <span>{ttl}s</span>
    </div>
  );
};

export default AutoDestructTimer;
