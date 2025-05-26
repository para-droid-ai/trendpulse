import React from 'react';

const StreamLoadingOverlay = ({ 
  message = 'Creating stream...', 
  subMessage = 'Initializing AI search and generating first summary',
  progress = 0,
  className = '',
  isModal = false // New prop to determine if it's inside a modal
}) => {
  
  // Different styling for modal vs full screen
  const containerClasses = isModal 
    ? `absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-10 rounded-2xl ${className}`
    : `stream-loading-overlay fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`;
  
  const contentClasses = isModal
    ? "flex flex-col items-center justify-center h-full px-8 py-12"
    : "bg-card/90 backdrop-blur border border-border/20 rounded-2xl p-12 max-w-2xl w-full mx-4 min-h-[400px] flex flex-col items-center justify-center";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        
        {/* Main Orbital System - Single Spinning Element */}
        <div className="relative w-32 h-32 mb-8">
          {/* Central Star with improved glow */}
          <div 
            className="absolute top-1/2 left-1/2 w-6 h-6 bg-gradient-radial from-yellow-400 via-orange-500 to-red-500 rounded-full animate-star-pulse shadow-lg" 
            style={{ transform: 'translate(-50%, -50%)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)' }}
          ></div>
          
          {/* Darker orbit ring */}
          <div className="absolute inset-0 border border-border/30 rounded-full bg-muted/10"></div>
          
          {/* Two orbiting planets */}
          <div className="absolute inset-0 animate-orbit-slow">
            <div 
              className="absolute w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-md" 
              style={{ 
                top: '10%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)' 
              }}
            ></div>
          </div>
          
          <div className="absolute inset-0 animate-orbit-fast">
            <div 
              className="absolute w-2.5 h-2.5 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-md" 
              style={{ 
                top: '25%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 6px rgba(147, 51, 234, 0.5)' 
              }}
            ></div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="w-full max-w-md text-center space-y-6">
          {/* Current Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground animate-pulse">
              {message}
            </h3>
            {subMessage && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {subMessage}
              </p>
            )}
          </div>

          {/* Enhanced Progress Bar */}
          <div className="space-y-3">
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden border border-border/20">
              <div 
                className="h-full bg-gradient-to-r from-primary via-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${Math.max(progress, 0)}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            {/* Progress Percentage */}
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Processing...</span>
              <span className="font-mono font-medium">
                {Math.round(Math.max(progress, 0))}%
              </span>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="text-xs text-muted-foreground/70">
            <p>This usually takes about 30 seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamLoadingOverlay; 