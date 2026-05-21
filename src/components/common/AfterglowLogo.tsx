import React from 'react';
import { StylizedLogo } from './StylizedLogo';

interface AfterglowLogoProps {
  size?: number | string;
  showBg?: boolean;
  className?: string;
  animated?: boolean;
}

export const AfterglowLogo: React.FC<AfterglowLogoProps> = ({
  size = 32,
  showBg = false,
  className = '',
  animated = false
}) => {
  const hoverClass = animated ? 'hover:scale-105 hover:brightness-110 active:scale-95 transition-all duration-300 cursor-pointer' : '';
  return (
    <StylizedLogo 
      size={size} 
      mode={showBg ? 'app-icon' : 'icon-only'} 
      className={`${hoverClass} ${className}`.trim()} 
    />
  );
};
