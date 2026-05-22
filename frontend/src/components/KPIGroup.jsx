import React from 'react';

export const KPIGroup = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`kpi-group bg-gradient-to-br from-white/[0.07] via-transparent to-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-2xl rounded-[32px] flex flex-col sm:flex-row ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

KPIGroup.Separator = ({ className = "" }) => {
  return (
    <div 
      className={`kpi-group__separator bg-white/5 shrink-0 w-full h-px sm:w-px sm:h-auto self-stretch ${className}`} 
    />
  );
};

export default KPIGroup;
