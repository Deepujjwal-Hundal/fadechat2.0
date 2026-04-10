import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { RoomTheme, ROOM_THEMES } from '../types';

interface RoomThemeSelectorProps {
  currentTheme: RoomTheme;
  onSelect: (theme: RoomTheme) => void;
  disabled?: boolean;
}

const themeColors = {
  cyan: {
    primary: '#00F0FF',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(0,240,255,0.3)]'
  },
  magenta: {
    primary: '#FF00FF',
    gradient: 'from-fuchsia-500/20 to-fuchsia-500/5',
    border: 'border-fuchsia-500/50',
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-400',
    glow: 'shadow-[0_0_20px_rgba(255,0,255,0.3)]'
  },
  green: {
    primary: '#00FF66',
    gradient: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    glow: 'shadow-[0_0_20px_rgba(0,255,102,0.3)]'
  }
};

export const RoomThemeSelector: React.FC<RoomThemeSelectorProps> = ({ 
  currentTheme, 
  onSelect,
  disabled 
}) => {
  return (
    <div className="space-y-3" data-testid="room-theme-selector">
      <div className="flex items-center gap-2 text-xs text-text_muted uppercase tracking-widest font-mono">
        <Palette className="w-3 h-3" />
        <span>Room Theme</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {ROOM_THEMES.map((theme) => {
          const colors = themeColors[theme.primaryColor];
          const isSelected = currentTheme.primaryColor === theme.primaryColor;
          
          return (
            <motion.button
              key={theme.primaryColor}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              onClick={() => !disabled && onSelect(theme)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${isSelected 
                  ? `${colors.border} ${colors.bg} ${colors.glow}` 
                  : 'border-border hover:border-white/20'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              data-testid={`theme-${theme.primaryColor}`}
            >
              {/* Color Preview */}
              <div 
                className={`w-8 h-8 rounded-full mx-auto mb-2 ${colors.bg} border-2 ${colors.border}`}
                style={{ backgroundColor: colors.primary }}
              />
              
              {/* Theme Name */}
              <p className={`text-xs font-medium text-center ${isSelected ? colors.text : 'text-text_secondary'}`}>
                {theme.name}
              </p>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center`}
                >
                  <Check className={`w-3 h-3 ${colors.text}`} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

interface ThemeBadgeProps {
  theme: RoomTheme;
  size?: 'sm' | 'md';
}

export const ThemeBadge: React.FC<ThemeBadgeProps> = ({ theme, size = 'sm' }) => {
  const colors = themeColors[theme.primaryColor];
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.border} border
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
      `}
      data-testid="theme-badge"
    >
      <div 
        className={`${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} rounded-full`}
        style={{ backgroundColor: colors.primary }}
      />
      <span className={colors.text}>{theme.name}</span>
    </div>
  );
};

export const getThemeColor = (primaryColor: 'cyan' | 'magenta' | 'green') => {
  return themeColors[primaryColor];
};

export default RoomThemeSelector;
