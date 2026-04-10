import React from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs text-primary uppercase tracking-[0.15em] font-mono font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text_muted">
            {icon}
          </div>
        )}
        <input 
          className={`
            w-full bg-surface border text-text_primary text-base px-4 py-3 rounded-xl 
            outline-none transition-all placeholder-text_muted font-body
            ${icon ? 'pl-10' : ''}
            ${error 
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20' 
              : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-white/20'
            }
            ${className}
          `}
          {...props}
        />
        {/* Focus glow effect */}
        <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity opacity-0 focus-within:opacity-100">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5" />
        </div>
      </div>
      {error && (
        <motion.span 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-danger font-medium"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
};

export default Input;
