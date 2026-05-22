import { useEffect, useState } from 'react';

export default function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#4f46e5',
  trackColor = 'rgba(255, 255, 255, 0.05)',
  children
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Anima a barra circular ao montar
    const timeout = setTimeout(() => {
      const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
      setProgress(percentage);
    }, 100);
    return () => clearTimeout(timeout);
  }, [value, max]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Fundo (Track) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progresso (Fill) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${color}60)`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        {children || <span className="text-xl font-bold text-white">{Math.round(progress)}%</span>}
      </div>
    </div>
  );
}
