import React from 'react';
import { Card, CardBody, Button, Progress, Divider } from "@heroui/react";
import { MoreVertical } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import NumberTicker from './NumberTicker';
import { useAuth } from '../context/AuthContext';

const KPIContext = React.createContext(null);

export const KPI = ({ children, ...props }) => {
  return (
    <Card 
      className="kpi bg-gradient-to-br from-white/[0.07] via-transparent to-white/[0.02] backdrop-blur-3xl border border-white/5 shadow-2xl relative group rounded-[32px] transition-all hover:border-accent/20"
      {...props}
    >
      <CardBody className="p-0 flex flex-col h-full">
        {children}
      </CardBody>
    </Card>
  );
};

KPI.Header = ({ children, className = "" }) => (
  <div className={`kpi__header flex items-center justify-between p-6 pb-2 ${className}`}>
    <div className="flex items-center gap-3">
      {children}
    </div>
  </div>
);

KPI.Icon = ({ children, status = "success" }) => {
  const colors = {
    success: "bg-success/20 text-success border-success/10",
    warning: "bg-warning/20 text-warning border-warning/10",
    danger: "bg-danger/20 text-danger border-danger/10",
    primary: "bg-primary/20 text-primary border-primary/10",
  };
  return (
    <div 
      className={`kpi__icon w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 ${colors[status] || colors.success}`}
      data-status={status}
    >
      {children}
    </div>
  );
};

KPI.Title = ({ children }) => (
  <dt className="kpi__title text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
    {children}
  </dt>
);

KPI.Content = ({ children, className = "" }) => (
  <div className={`kpi__content px-6 py-2 flex-1 flex flex-col gap-1 ${className}`}>
    {children}
  </div>
);

KPI.Value = ({ value, prefix = "", suffix = "", decimals = 2, children, className = "" }) => {
  const { valuesHidden } = useAuth();
  const formatted = `${prefix}${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals })}${suffix}`;
  
  if (valuesHidden) {
    return (
      <dd className={`kpi__value text-2xl sm:text-3xl font-black text-white tracking-tighter leading-tight select-none ${className}`}>
        <span className="tracking-widest opacity-40">••••</span>
      </dd>
    );
  }
  
  return (
    <dd className={`kpi__value text-2xl sm:text-3xl font-black text-white tracking-tighter leading-tight ${className}`}>
      {children ? children(formatted) : <NumberTicker value={value} prefix={prefix} suffix={suffix} decimals={decimals} />}
    </dd>
  );
};


KPI.Trend = ({ value, isUp = true, status = "success" }) => {
  const colors = {
    success: "bg-success/10 text-success border-success/10",
    warning: "bg-warning/10 text-warning border-warning/10",
    danger: "bg-danger/10 text-danger border-danger/10",
  };
  return (
    <div className={`kpi__trend flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${colors[status]}`}>
      {isUp ? "↑" : "↓"} {value}%
    </div>
  );
};

KPI.Progress = ({ value, status = "success" }) => (
  <div className="kpi__progress px-6 py-4">
    <div className="flex justify-between text-[9px] font-black uppercase text-white/40 mb-1.5">
       <span>Progresso</span>
       <span>{Math.round(value)}%</span>
    </div>
    <Progress 
      size="sm" 
      value={value} 
      aria-label="KPI Progress"
      classNames={{
        indicator: status === 'success' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-danger',
        track: "bg-white/5"
      }}
    />
  </div>
);

KPI.Chart = ({ data, dataKey = "value", color = "#c6f150", fillColor, height = 80 }) => {
  const gradientId = `kpi-chart-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className="kpi__chart w-full relative overflow-hidden" style={{ height }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

KPI.Separator = () => <Divider className="kpi__separator bg-white/5" />;

KPI.Actions = ({ children }) => (
  <div className="kpi__actions">
    <Button isIconOnly size="sm" variant="light" className="text-white/20 hover:text-white transition-colors">
      {children || <MoreVertical size={16} />}
    </Button>
  </div>
);

KPI.Footer = ({ children }) => (
  <div className="kpi__footer px-6 py-4 bg-black/10 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/30 border-t border-white/5">
    {children}
  </div>
);

export default KPI;
