import React from 'react';

/**
 * SegmentedProgress - Um gráfico radial premium com efeito de brilho e suporte a bilhão.
 */
export default function SegmentedProgress({ 
  value = 0, 
  size = 200, 
  strokeWidth = 12, 
  primaryColor = "#c6f150", 
  label = "" 
}) {
  const radius = 80; // Fixed inner radius for consistent scale
  const center = 95;
  
  // Circumference = 2 * PI * R
  const circumference = 2 * Math.PI * radius;
  
  // Se for 100% ou mais, garantimos que o círculo feche totalmente
  const dashArray = value >= 100 ? `${circumference}` : `${(circumference * value) / 100} ${circumference}`;
  const dashOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center group aspect-square overflow-hidden" style={{ width: size, height: size }}>
      <svg 
        viewBox="0 0 190 190" 
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <linearGradient id={`gradient-${label.replace(/\s+/g, '-').toLowerCase()}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Progress Stroke */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={`url(#gradient-${label.replace(/\s+/g, '-').toLowerCase()})`}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap={value >= 100 ? "butt" : "round"}
          style={{ 
            filter: value > 0 ? "url(#glow)" : "none",
            transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          className="rotate-[-90deg] origin-center"
        />
      </svg>
      
      {/* Center Content */}
      <div className="flex flex-col items-center justify-center text-center z-10 animate-fade-in mt-2">
        <span className="font-black text-white tracking-tighter leading-none" style={{ fontSize: size * 0.18 }}>
          {Math.round(value)}%
        </span>
        {label && (
          <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-2 block" style={{ color: primaryColor }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
