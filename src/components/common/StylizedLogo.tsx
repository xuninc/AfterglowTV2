import React from 'react';

interface StylizedLogoProps {
  className?: string;
  size?: number | string;
  mode?: 'icon-only' | 'app-icon' | 'banner';
}

export const StylizedLogo: React.FC<StylizedLogoProps> = ({
  className = '',
  size,
  mode = 'icon-only'
}) => {
  // Dimensions depending on mode
  const width = size || (mode === 'banner' ? 'auto' : mode === 'app-icon' ? 128 : 36);
  const height = size || (mode === 'banner' ? 44 : mode === 'app-icon' ? 128 : 36);

  const renderSVGLogo = (svgSize: number | string) => {
    return (
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none active:scale-98 transition-transform"
      >
        <defs>
          {/* Main A element gradient */}
          <linearGradient id="a-gradient" x1="20%" y1="90%" x2="80%" y2="10%">
            <stop offset="0%" stopColor="var(--afterglow-primary)" />
            <stop offset="100%" stopColor="var(--afterglow-accent)" />
          </linearGradient>

          {/* S-Swoop horizontal bar replacement gradient */}
          <linearGradient id="swoop-gradient" x1="10%" y1="80%" x2="90%" y2="20%">
            <stop offset="0%" stopColor="var(--afterglow-secondary)" />
            <stop offset="60%" stopColor="var(--afterglow-primary)" />
            <stop offset="100%" stopColor="var(--afterglow-secondary)" />
          </linearGradient>

          {/* Premium Radial background glow for App Icon style */}
          <radialGradient id="appicon-bg" cx="50%" cy="50%" r="50%" fx="50%" fy="30%">
            <stop offset="0%" stopColor="var(--afterglow-card)" />
            <stop offset="100%" stopColor="var(--afterglow-bg)" />
          </radialGradient>

          {/* Soft Shadow Filter for high fidelity depth */}
          <filter id="logo-drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Vibrant Glow filter for the neon A and swoop */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer background grid lines (Technical radar/receiver motif from the videos) */}
        <g opacity="0.14" stroke="currentColor" strokeWidth="0.5" className="text-white">
          <circle cx="50" cy="50" r="45" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="32" />
          <path d="M 50 2 L 50 98" />
          <path d="M 2 50 L 98 50" strokeDasharray="4 4" />
        </g>

        {/* Stylized Capital A and horizontal swoop scaled up to fill space grandly */}
        <g transform="translate(-30, -20.6) scale(1.6)">
          {/* Stylized Capital A base legs - High-precision organic curvature */}
          <path
            d="M 50 16 C 42.5 16, 31.5 42, 25 74 L 37 74 C 40.5 54, 46.5 38.5, 50 38.5 C 53.5 38.5, 59.5 54, 63 74 L 75 74 C 68.5 42, 57.5 16, 50 16 Z"
            fill="url(#a-gradient)"
            filter="url(#neon-glow)"
          />

          {/* Horizontal organic ribbon S-Swoop replacing crossbar - matching user assets perfectly */}
          <path
            d="M 22.5 56.5 C 29.5 51.5, 39.5 58, 51.5 50.5 C 61 44.5, 70 31.5, 78 28.5 C 74.5 42, 65.5 56.5, 54.5 60.5 C 42 65, 30.5 62, 22.5 56.5 Z"
            fill="url(#swoop-gradient)"
            filter="url(#neon-glow)"
          />
        </g>
      </svg>
    );
  };

  if (mode === 'app-icon') {
    // Dynamic rounded corners and padding based on size to prevent layout squeezing
    const parsedSize = typeof size === 'number' ? size : 140;
    const dynamicPadding = `${parsedSize * 0.05}px`;
    const dynamicRadius = `${parsedSize * 0.22}px`;

    return (
      <div 
        className={`relative flex items-center justify-center overflow-hidden aspect-square select-none ${className}`}
        style={{
          width: size || 140,
          height: size || 140,
          padding: dynamicPadding,
          borderRadius: dynamicRadius,
          background: 'radial-gradient(circle at 50% 25%, var(--afterglow-card) 0%, var(--afterglow-bg) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 12px 24px -10px rgba(0, 0, 0, 0.65)'
        }}
        id={`logo-app-icon-${Math.random().toString(36).substr(2, 4)}`}
      >
        {/* Abstract organic top-right neon shine overlay */}
        <div 
          className="absolute -top-1/4 -right-1/4 w-[120%] h-[120%] rounded-full opacity-[0.22] blur-3xl pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(circle, var(--afterglow-secondary) 0%, transparent 60%)`
          }}
        />

        {/* Technical crosshairs and compass lines in background of the icon */}
        <div className="absolute inset-0 opacity-[0.06] select-none pointer-events-none">
          <div className="w-full h-full border border-dashed border-white rounded-full scale-90" />
          <div className="w-full h-full border border-white rounded-full scale-50" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white translate-y-1/2" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white -translate-x-1/2" />
        </div>

        {/* Center SVG logo */}
        <div className="relative z-10 w-[94%] h-[94%] flex items-center justify-center">
          {renderSVGLogo('100%')}
        </div>
      </div>
    );
  }

  if (mode === 'banner') {
    return (
      <div className={`flex items-center gap-3.5 select-none ${className}`} id="logo-banner-group">
        {/* Mini App icon on left */}
        <div 
          className="rounded-xl flex items-center justify-center shadow-md border border-white/5 bg-gradient-to-b from-[var(--afterglow-card)] to-[var(--afterglow-bg)] shrink-0"
          style={{ width: height, height: height }}
        >
          <div className="w-[82%] h-[82%] flex items-center justify-center p-0.5">
            {renderSVGLogo('100%')}
          </div>
        </div>

        {/* Text brand on right */}
        <div className="flex flex-col">
          <h1 className="font-display text-base font-black tracking-[0.2em] text-white uppercase leading-none">
            AFTERGLOW <span className="text-[var(--afterglow-primary)]">TV</span>
          </h1>
          <span className="text-[8px] font-mono text-white/40 tracking-[0.3em] uppercase mt-1">
            RECEIVER ENGINE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`} 
      style={{ width, height }}
      id={`logo-icon-only-${Math.random().toString(36).substr(2, 4)}`}
    >
      {renderSVGLogo('100%')}
    </div>
  );
};
