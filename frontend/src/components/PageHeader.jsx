import React from 'react';
import GlobalUserMenu from './GlobalUserMenu';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function PageHeader({ title, subtitle, icon: Icon, children, actions }) {
  const { valuesHidden, toggleValuesHidden } = useAuth();

  return (
    <div className="flex flex-col gap-4 mb-10 overflow-visible">
      {/* Linha Principal: Logo + Titulo + Status */}
      <div className="flex items-center justify-between gap-4 overflow-visible">
        <div className="flex items-center gap-4 relative overflow-visible">
          {/* Global Background Glow - Moved slightly right to avoid clipping on left edge */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-20 bg-accent/20 blur-[40px] rounded-full pointer-events-none z-0" />
          
          <div className="relative z-10 flex items-center gap-4 overflow-visible">
            <div className="relative p-1 overflow-visible">
              <img 
                src="/fincas-logo.png" 
                className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(198,241,80,0.6)]" 
                alt="Logo" 
              />
            </div>
            
            <div className="flex flex-col -gap-1">
              <h1 className="text-[28px] sm:text-[34px] font-black text-white tracking-tighter leading-none">
                {title}
              </h1>
              {subtitle && typeof subtitle === 'string' && (
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/20 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* User Menu (Mobile Only) */}
        <div className="flex items-center md:hidden">
          <GlobalUserMenu />
        </div>
      </div>

      {/* Segunda Linha: MonthPicker + Botão Ocultar + Ações */}
      <div className="flex flex-row items-center justify-between gap-4">
        {/* Lado Esquerdo: MonthPicker ou similar */}
        <div className="flex items-center gap-3">
          {children}
        </div>

        {/* Lado Direito: Botão Ocultar + Subtítulo JSX + Botões de Ação */}
        <div className="flex items-center gap-2">
          {/* Botão de ocultar valores — sempre visível no header */}
          <button
            onClick={toggleValuesHidden}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
              valuesHidden
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10'
            }`}
            title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {valuesHidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          {subtitle && typeof subtitle !== 'string' && subtitle}
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Divisor sutil */}
      <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </div>
  );
}
