import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "relative font-heading font-bold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
  
  const variants = {
    primary: "bg-primary text-background hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:shadow-[0_0_30px_rgba(0,240,255,0.6)] border border-transparent",
    secondary: "bg-transparent border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary",
    danger: "bg-danger/10 border border-danger/50 text-danger hover:bg-danger hover:text-white",
    ghost: "bg-transparent text-text_secondary hover:text-text_primary hover:bg-surface"
  };

  const sizes = {
    sm: "px-3 py-1.5 rounded-lg text-xs",
    md: "px-4 py-2.5 rounded-xl text-sm",
    lg: "px-6 py-3.5 rounded-xl text-base"
  };

  return (
    <motion.button 
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {/* Animated shine effect */}
      <span className="absolute inset-0 overflow-hidden rounded-inherit">
        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </span>
      
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </motion.button>
  );
};

export default Button;
