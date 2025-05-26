import React from 'react';

const OrbitalLoadingAnimation = ({ 
  size = 'medium', 
  variant = 'orbital', 
  overlay = false, 
  message = '', 
  className = '' 
}) => {
  
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24'
  };

  const planetSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5',
    xlarge: 'w-3 h-3'
  };

  const starSizes = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
    xlarge: 'w-5 h-5'
  };

  const OrbitalVariant = () => (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Central star - Fixed centering */}
      <div className={`absolute top-1/2 left-1/2 ${starSizes[size]} bg-gradient-radial from-yellow-400 to-orange-500 rounded-full animate-star-pulse`} style={{ transform: 'translate(-50%, -50%)' }}></div>
      
      {/* Single orbit ring with darker backdrop */}
      <div className="absolute inset-0 border border-border/20 rounded-full bg-muted/5"></div>
      
      {/* Two orbiting planets max - Fixed positioning */}
      <div className="absolute inset-0 animate-orbit-slow">
        <div className={`absolute ${planetSizes[size]} bg-gradient-to-br from-blue-400 to-blue-600 rounded-full`} style={{ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
      </div>
      
      <div className="absolute inset-0 animate-orbit-fast" style={{ animationDelay: '0.5s' }}>
        <div className={`absolute ${planetSizes[size]} bg-gradient-to-br from-purple-400 to-purple-600 rounded-full`} style={{ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
      </div>
    </div>
  );

  const GeometricVariant = () => (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Single rotating square */}
      <div className={`${sizeClasses[size]} border-2 border-primary animate-spin`} style={{ animationDuration: '2s' }}></div>
      
      {/* Inner circle that rotates opposite direction */}
      <div className={`absolute inset-2 border-2 border-blue-400 rounded-full animate-spin`} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
    </div>
  );

  const PulseVariant = () => (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Central dot */}
      <div className={`${starSizes[size]} bg-primary rounded-full`}></div>
      
      {/* Single pulsing ring */}
      <div className={`absolute inset-0 border-2 border-primary/50 rounded-full animate-ping`}></div>
    </div>
  );

  const WaveVariant = () => (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Central point */}
      <div className={`${starSizes[size]} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse`}></div>
      
      {/* Single radiating wave */}
      <div className={`absolute inset-0 border border-blue-400/30 rounded-full animate-ping`} style={{ animationDuration: '2s' }}></div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'orbital':
        return <OrbitalVariant />;
      case 'geometric':
        return <GeometricVariant />;
      case 'pulse':
        return <PulseVariant />;
      case 'wave':
        return <WaveVariant />;
      default:
        return <OrbitalVariant />;
    }
  };

  const content = (
    <div className={`flex items-center justify-center ${className}`}>
      {renderVariant()}
      {message && (
        <span className="ml-3 text-sm text-muted-foreground animate-pulse">
          {message}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-card/90 backdrop-blur border border-border/20 rounded-xl p-8">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default OrbitalLoadingAnimation; 