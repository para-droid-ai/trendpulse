import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../lib/themes';
import Portal from './Portal';

const ThemeSelector = () => {
  const { currentTheme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    changeTheme(themeName);
    setIsOpen(false);
  };

  const currentThemeData = themes[currentTheme];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
        title="Change Theme"
        type="button"
      >
        {/* Theme color preview */}
        <div className="flex items-center space-x-1">
          <div 
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: currentThemeData.colors.primary }}
          />
          <div 
            className="w-3 h-3 rounded-full border border-border"
            style={{ backgroundColor: currentThemeData.colors.accent }}
          />
        </div>
        <svg 
          className="w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </button>

      {isOpen && (
        <Portal>
          <div 
            className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ 
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="bg-card rounded-xl shadow-xl border border-border animate-in slide-in-from-top-2 duration-300"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '42rem',
                maxHeight: '80vh',
                margin: '0',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Choose Your Theme</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Theme Grid */}
              <div 
                className="p-6 overflow-y-auto"
                style={{ maxHeight: 'calc(80vh - 120px)' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(themes).map(([themeKey, themeData]) => (
                    <button
                      key={themeKey}
                      onClick={() => handleThemeChange(themeKey)}
                      className={`p-4 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                        currentTheme === themeKey 
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                          : 'border-border hover:border-border/80 hover:bg-accent/50'
                      }`}
                    >
                      {/* Theme Name */}
                      <div className="text-sm font-medium text-foreground mb-3 text-left">
                        {themeData.name}
                        {currentTheme === themeKey && (
                          <span className="ml-2 text-xs text-primary">✓ Active</span>
                        )}
                      </div>

                      {/* Color Preview */}
                      <div className="space-y-2">
                        {/* Primary colors row */}
                        <div className="flex space-x-1">
                          <div 
                            className="flex-1 h-6 rounded border"
                            style={{ 
                              backgroundColor: themeData.colors.background,
                              borderColor: themeData.colors.border 
                            }}
                            title="Background"
                          />
                          <div 
                            className="flex-1 h-6 rounded border"
                            style={{ 
                              backgroundColor: themeData.colors.card,
                              borderColor: themeData.colors.border 
                            }}
                            title="Card"
                          />
                        </div>
                        
                        {/* Accent colors row */}
                        <div className="flex space-x-1">
                          <div 
                            className="flex-1 h-6 rounded border"
                            style={{ 
                              backgroundColor: themeData.colors.primary,
                              borderColor: themeData.colors.border 
                            }}
                            title="Primary"
                          />
                          <div 
                            className="flex-1 h-6 rounded border"
                            style={{ 
                              backgroundColor: themeData.colors.accent,
                              borderColor: themeData.colors.border 
                            }}
                            title="Accent"
                          />
                          <div 
                            className="flex-1 h-6 rounded border"
                            style={{ 
                              backgroundColor: themeData.colors.muted,
                              borderColor: themeData.colors.border 
                            }}
                            title="Muted"
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  {Object.keys(themes).length} beautiful themes available • Your choice is automatically saved
                </p>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default ThemeSelector; 