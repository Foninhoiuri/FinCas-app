import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Target,
  Gauge,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import GlobalUserMenu from './GlobalUserMenu';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/bills', icon: Receipt, label: 'Contas' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/budgets', icon: Gauge, label: 'Limites' },
];

export default function BottomNav({ currentMonth }) {
  const location = useLocation();
  const { data: bills } = useQuery({
    queryKey: ['bills-badge'],
    queryFn: () => api.getBills({ status: 'pending' }),
    staleTime: 60000
  });
  const pendingCount = (bills || []).length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to === '/' ? `/?month=${currentMonth}` : `${to}?month=${currentMonth}`}
            onClick={(e) => {
              const targetPath = to === '/' ? '/' : to;
              if (location.pathname === targetPath) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${isActive
                ? 'text-accent-light'
                : 'text-white/40 active:text-white/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-accent/20 shadow-[0_0_25px_rgba(198,241,80,0.4)] ring-1 ring-accent/30' : ''}`}>
                  <Icon size={21} className={isActive ? 'text-accent' : 'text-white/40'} strokeWidth={1.5} />
                  {to === '/bills' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white shadow-lg shadow-danger/40 animate-bounce">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-accent' : 'text-white/40'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
