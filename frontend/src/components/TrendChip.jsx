import React from 'react';
import { Chip } from "@heroui/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const TrendChip = ({ 
  children, 
  trend = 'up', 
  size = 'sm', 
  variant = 'soft', 
  className = '', 
  ...props 
}) => {
  const getTrendConfig = () => {
    switch (trend) {
      case 'up':
        return {
          color: 'success',
          icon: <TrendingUp size={12} />,
          className: 'bg-success/20 text-success border-success/10'
        };
      case 'down':
        return {
          color: 'danger',
          icon: <TrendingDown size={12} />,
          className: 'bg-danger/20 text-danger border-danger/10'
        };
      default:
        return {
          color: 'default',
          icon: <Minus size={12} />,
          className: 'bg-white/10 text-white/40 border-white/5'
        };
    }
  };

  const config = getTrendConfig();

  return (
    <Chip
      size={size}
      variant={variant}
      startContent={config.icon}
      className={`trend-chip font-black uppercase tracking-widest h-6 px-2 ${config.className} ${className}`}
      {...props}
    >
      <div className="flex items-center gap-1 text-[10px]">
        {children}
      </div>
    </Chip>
  );
};

TrendChip.Prefix = ({ children, className = "" }) => (
  <span className={`trend-chip__prefix opacity-50 ${className}`}>{children}</span>
);

TrendChip.Indicator = ({ children }) => (
  <span className="trend-chip__indicator">{children}</span>
);

TrendChip.Suffix = ({ children, className = "" }) => (
  <span className={`trend-chip__suffix opacity-50 ${className}`}>{children}</span>
);

export default TrendChip;
