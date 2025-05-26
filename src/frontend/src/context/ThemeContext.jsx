import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, getTheme } from '../lib/themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('claude');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('trendpulse-theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    try {
      const theme = getTheme(currentTheme);
      const root = document.documentElement;
      
      // Apply CSS custom properties
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    } catch (error) {
      console.error('Error applying theme:', error);
      // Fallback to claude theme if there's an error
      const fallbackTheme = getTheme('claude');
      const root = document.documentElement;
      Object.entries(fallbackTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    }
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('trendpulse-theme', themeName);
    }
  };

  const value = {
    currentTheme,
    changeTheme,
    theme: getTheme(currentTheme),
    availableThemes: Object.keys(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 