import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Target,
  Gauge,
  BookOpen,
  User,
  LogOut,
  Crown,
  Shield,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import GlobalUserMenu from './GlobalUserMenu';
import { Avatar, Chip, Button } from "@heroui/react";

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/bills', icon: Receipt, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/budgets', icon: Gauge, label: 'Limites' },
  { to: '/docs', icon: BookOpen, label: 'Docs' },
];

const avatarColors = {
  Igor: 'from-indigo-500 to-purple-600',
  Flávia: 'from-pink-500 to-rose-600',
};

export default function Sidebar({ currentMonth }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: bills } = useQuery({ 
    queryKey: ['bills-badge'], 
    queryFn: () => api.getBills({ status: 'pending' }),
    staleTime: 60000 
  });
  const pendingCount = (bills || []).length;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        const item = navItems[index];
        if (item) {
          const to = item.to === '/' ? `/?month=${currentMonth}` : `${item.to}?month=${currentMonth}`;
          navigate(to);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMonth, navigate]);

  const getRoleBadge = (role) => {
    if (role === 'super_admin') return { label: 'Proprietário', color: 'bg-red-500/20 text-red-400', icon: Shield };
    if (role === 'admin') return { label: 'Admin', color: 'bg-cyan-500/20 text-cyan-400', icon: Crown };
    return { label: 'Membro', color: 'bg-white/10 text-white/50', icon: User };
  };

  const roleBadge = getRoleBadge(user?.role);
  const RoleIcon = roleBadge.icon;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col glass border-r border-white/5 z-30">
      {/* Logo */}
      <div className="flex items-center gap-4 px-6 py-8 border-b border-white/5">
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shrink-0">
           <img src="/fincas-logo.png" className="w-full h-full object-contain" alt="Logo" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white tracking-tight leading-none">Fin<span className="text-success">Cas</span></h1>
          <p className="text-[9px] text-white/20 tracking-[0.2em] font-black uppercase mt-1.5">Gestão Familiar</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ to, icon: Icon, label }, index) => (
          <NavLink
            key={to}
            to={to === '/' ? `/?month=${currentMonth}` : `${to}?month=${currentMonth}`}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-accent/10 text-accent-light glow-accent pl-5'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute left-1 w-1 h-7 bg-accent rounded-full shadow-[0_0_20px_rgba(198,241,80,0.8)]"
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
                    {to === '/bills' && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white shadow-lg shadow-danger/40 animate-bounce">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                  {label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer - EXACT GlobalUserMenu Header Copy */}
      <div className="border-t border-white/5 bg-gradient-to-br from-white/5 to-transparent">
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <GlobalUserMenu 
                customTrigger={
                  <Avatar
                    src={user?.avatar_url}
                    className="w-14 h-14 rounded-[18px] border border-white/5 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                    fallback={<User size={28} />}
                  />
                }
              />
              
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg font-black text-white tracking-tighter truncate uppercase italic leading-none">
                  {user?.nickname || user?.name || 'Usuário'}
                </h3>
                <p className="text-[8px] text-white/20 uppercase font-black tracking-widest truncate mt-1">
                  {user?.full_name || user?.name}
                </p>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  startContent={<RoleIcon size={8} />}
                  className={`mt-2 h-4 px-1.5 text-[7px] font-black uppercase tracking-widest gap-1 ${roleBadge.color}`}
                >
                  {roleBadge.label}
                </Chip>
              </div>
            </div>
            
            <Button
              isIconOnly
              size="sm"
              variant="solid"
              className="bg-danger/20 text-danger hover:bg-danger hover:text-white w-10 h-10 rounded-[14px] min-w-0 shadow-lg transition-all"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </Button>
          </div>

          <div className="flex items-center justify-between opacity-20 px-1">
             <div className="flex flex-col">
               <p className="text-[7px] text-white font-black tracking-[0.4em]">v2.5 Stable</p>
               <p className="text-[6px] text-white uppercase mt-0.5 tracking-widest">PC Optimized</p>
             </div>
             <img src="/fincas-logo.png" className="w-5 h-5 object-contain grayscale" alt="Logo" />
          </div>
        </div>
      </div>
    </aside>
  );
}
