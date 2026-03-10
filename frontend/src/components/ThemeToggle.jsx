import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-card border border-theme hover:bg-brand-hover transition-all duration-200"
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Sun 
          className="w-5 h-5 text-brand-primary" 
          strokeWidth={2}
        />
      ) : (
        <Moon 
          className="w-5 h-5 text-brand-primary" 
          strokeWidth={2}
        />
      )}
    </button>
  );
};

export default ThemeToggle;
