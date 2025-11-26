import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs text-neon-blue uppercase tracking-widest mb-1">{label}</label>}
      <input 
        className={`bg-neon-panel border ${error ? 'border-red-500' : 'border-gray-700 focus:border-neon-blue'} 
          text-white px-4 py-3 rounded-lg outline-none transition-colors placeholder-gray-600 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
};