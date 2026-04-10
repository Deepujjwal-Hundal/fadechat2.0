import React from 'react';
import { Shield, Eye, Clock, Wifi, Lock } from 'lucide-react';
import { SecurityStatus } from '../types';
import { motion } from 'framer-motion';

interface SecurityIndicatorProps {
  status: SecurityStatus;
  compact?: boolean;
}

export const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({ status, compact = false }) => {
  const indicators = [
    {
      key: 'e2e',
      icon: Lock,
      label: 'E2E Encrypted',
      active: status.e2eEncrypted,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30'
    },
    {
      key: 'ip',
      icon: Eye,
      label: 'IP Masked',
      active: status.ipMasked,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/30'
    },
    {
      key: 'screenshot',
      icon: Shield,
      label: 'Screenshot Protected',
      active: status.screenshotProtection,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      borderColor: 'border-secondary/30'
    },
    {
      key: 'autodestruct',
      icon: Clock,
      label: `Auto-destruct: ${status.autoDestructTime}s`,
      active: status.messageAutoDestruct,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30'
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="security-indicator-compact">
        {indicators.filter(i => i.active).map((ind) => (
          <motion.div
            key={ind.key}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`p-1.5 rounded-md ${ind.bgColor} border ${ind.borderColor}`}
            title={ind.label}
          >
            <ind.icon className={`w-3.5 h-3.5 ${ind.color}`} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="security-indicator">
      <div className="flex items-center gap-2 text-xs text-text_muted uppercase tracking-widest font-mono">
        <Shield className="w-3 h-3" />
        <span>Security Status</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {indicators.map((ind) => (
          <motion.div
            key={ind.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border
              ${ind.active ? `${ind.bgColor} ${ind.borderColor}` : 'bg-surface border-border opacity-50'}
            `}
          >
            <ind.icon className={`w-4 h-4 ${ind.active ? ind.color : 'text-text_muted'}`} />
            <span className={`text-xs font-medium ${ind.active ? ind.color : 'text-text_muted'}`}>
              {ind.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface SecurityBadgeProps {
  type: 'encrypted' | 'masked' | 'protected' | 'destruct';
  value?: string | number;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ type, value }) => {
  const config = {
    encrypted: { icon: Lock, color: 'text-primary', label: 'E2E' },
    masked: { icon: Eye, color: 'text-accent', label: 'IP Hidden' },
    protected: { icon: Shield, color: 'text-secondary', label: 'Protected' },
    destruct: { icon: Clock, color: 'text-warning', label: `${value}s` }
  };

  const { icon: Icon, color, label } = config[type];

  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface_elevated border border-border text-[10px] font-mono ${color}`}
      data-testid={`security-badge-${type}`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

export default SecurityIndicator;
