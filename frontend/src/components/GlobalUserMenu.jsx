import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  User, Lock, LogOut, ChevronRight, 
  Landmark, UserPen, 
  ShieldCheck, X, Database, RefreshCw,
  LayoutGrid, BookOpen, Shield, Users, Crown,
  Globe, Server, Zap, Info
} from 'lucide-react';
import { 
  Popover, PopoverTrigger, PopoverContent,
  Card, CardBody, Button, Chip,
  Modal, ModalContent, ModalHeader, ModalBody,
  Badge, Avatar, Divider
} from "@heroui/react";

import ManageBanksModal from './ManageBanksModal';
import EditProfileModal from './EditProfileModal';
import CategoriesModal from './CategoriesModal';

export default function GlobalUserMenu({ customTrigger, minimal = false }) {
  const { user, logout, isSuperAdmin, isAdmin } = useAuth();
  const { connected: socketConnected } = useSocket() || { connected: false };
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals state
  const [showPinChange, setShowPinChange] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // 1. Data Queries
  const { data: health, isError, isFetching } = useQuery({
    queryKey: ['ping'],
    queryFn: () => api.health(),
    refetchInterval: 10000,
    retry: 0,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['household-members', user?.household_id],
    queryFn: () => api.getMembers(user?.household_id),
    enabled: !!user?.household_id && isOpen,
  });

  const apiOnline = !isError;
  const dbOnline = health?.database === 'connected' && health?.schema === 'valid';
  const allSystemsGo = apiOnline && dbOnline && socketConnected;

  const getRoleBadge = (role) => {
    if (role === 'super_admin') return { label: 'Super Admin', color: 'bg-red-500/20 text-red-400', icon: Shield };
    if (role === 'admin') return { label: 'Admin', color: 'bg-cyan-500/20 text-cyan-400', icon: Crown };
    return { label: 'Membro', color: 'bg-white/10 text-white/50', icon: User };
  };

  const getStatusColor = () => {
    if (allSystemsGo) return "success";
    if (apiOnline) return "warning";
    return "danger";
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  // 2. PIN Logic
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinLen] = useState(4);
  const [pinStep, setPinStep] = useState('current');
  const [lastPressed, setLastPressed] = useState(null);

  const handlePinChange = async () => {
    if (currentPin.length !== pinLen || newPin.length !== pinLen) {
      setPinFeedback({ ok: false, msg: `O PIN deve ter exatamente ${pinLen} dígitos` });
      return;
    }
    setPinLoading(true);
    setPinFeedback(null);
    try {
      await api.changePin({ user_id: user.id, current_pin: currentPin, new_pin: newPin });
      setPinFeedback({ ok: true, msg: 'PIN alterado com sucesso!' });
      setCurrentPin('');
      setNewPin('');
      setTimeout(() => setShowPinChange(false), 2000);
    } catch (err) {
      setPinFeedback({ ok: false, msg: err.message || 'Erro ao alterar PIN' });
      setTimeout(() => {
        setCurrentPin('');
        setNewPin('');
        setPinStep('current');
        setPinFeedback(null);
      }, 1500);
    } finally {
      setPinLoading(false);
    }
  };

  const handleDigit = (d) => {
    if (pinLoading || pinFeedback?.ok) return;
    setLastPressed(d);
    const val = pinStep === 'current' ? currentPin : newPin;
    if (val.length >= pinLen) return;
    const nextVal = val + d;
    if (pinStep === 'current') {
      setCurrentPin(nextVal);
      if (nextVal.length === pinLen) {
        setPinStep('new');
        setLastPressed(null);
      }
    } else {
      setNewPin(nextVal);
    }
  };

  const handleBack = () => {
    setLastPressed('back');
    if (pinStep === 'current') setCurrentPin(p => p.slice(0, -1));
    else {
      if (newPin === '') setPinStep('current');
      else setNewPin(p => p.slice(0, -1));
    }
  };

  const roleBadge = getRoleBadge(user?.role);
  const RoleIcon = roleBadge.icon;

  const statusColorClass = allSystemsGo ? 'bg-success shadow-success/40' : apiOnline ? 'bg-warning shadow-warning/40' : 'bg-danger shadow-danger/40';
  const statusShadowClass = allSystemsGo ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse' : apiOnline ? 'shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';

  return (
    <>
      <Popover 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        placement={isMobile ? "bottom-end" : "right-end"} 
        backdrop="blur"
        offset={isMobile ? 10 : 25} 
        crossOffset={isMobile ? 0 : -20}
        classNames={{
          content: "p-0 border-none bg-transparent shadow-none z-50"
        }}
      >
        <PopoverTrigger>
          {customTrigger || (
            <button className="outline-none active:scale-95 transition-transform p-1.5 m-0.5">
              <Badge 
                color={getStatusColor()} 
                content="" 
                shape="circle" 
                placement="bottom-right"
                className={allSystemsGo ? "animate-pulse" : ""}
                size="md"
              >
                <Avatar
                  isBordered
                  color={getStatusColor()}
                  src={user?.avatar_url}
                  className={`${minimal ? 'w-10 h-10' : 'w-14 h-14'} cursor-pointer shadow-2xl border-white/10`}
                  fallback={<User size={minimal ? 20 : 28} />}
                />
              </Badge>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent className="flex flex-col items-center">
          
          {/* FLOATING STATUS PILL (Above the card) */}
          <Popover placement="bottom" offset={10} backdrop="transparent">
            <PopoverTrigger>
              <button className={`mb-4 px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-3xl border border-white/10 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 z-50 ${statusShadowClass}`}>
                <div className={`w-2 h-2 rounded-full ${statusColorClass}`} />
                <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">
                  {allSystemsGo ? 'Server Online' : 'Connection Alert'}
                </span>
                <Info size={12} className="text-white/20" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-4 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-2xl min-w-[200px] z-[60]">
               <div className="space-y-4">
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Status do Sistema</p>
                    <div className="w-12 h-0.5 bg-accent/20 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1">
                     <span className="text-white/40 flex items-center gap-2.5"><Globe size={14} /> API</span>
                     <span className={apiOnline ? 'text-success' : 'text-danger'}>{apiOnline ? 'Operational' : 'Offline'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1">
                     <span className="text-white/40 flex items-center gap-2.5"><Server size={14} /> Database</span>
                     <span className={dbOnline ? 'text-success' : 'text-danger'}>{dbOnline ? 'Healthy' : 'Error'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest px-1">
                     <span className="text-white/40 flex items-center gap-2.5"><Zap size={14} /> Realtime</span>
                     <span className={socketConnected ? 'text-success' : 'text-danger'}>{socketConnected ? 'Synced' : 'Waiting'}</span>
                  </div>
                  {isFetching && (
                    <div className="pt-2 flex justify-center border-t border-white/5 mt-2">
                      <RefreshCw size={12} className="text-accent animate-spin" />
                    </div>
                  )}
               </div>
            </PopoverContent>
          </Popover>

          <Card className="border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] w-[340px] max-h-[70vh] overflow-y-auto rounded-[44px] backdrop-blur-3xl custom-scrollbar">
            <CardBody className="p-0">
              {/* SESSÃO 1: ÁREA DO USUÁRIO (Expansive Feel) */}
              <div className="bg-transparent p-6 bg-gradient-to-br from-white/5 to-transparent border-b border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar
                      src={user?.avatar_url}
                      className="w-20 h-20 rounded-[28px] border border-white/5 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => { setIsOpen(false); setShowEditProfile(true); }}
                      fallback={<User size={40} />}
                    />
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <div 
                        className="cursor-pointer group"
                        onClick={() => { setIsOpen(false); setShowEditProfile(true); }}
                      >
                        <h3 className="text-2xl font-black text-white tracking-tighter truncate uppercase italic leading-none group-hover:text-accent transition-colors">
                          {user?.nickname || user?.name || 'Usuário'}
                        </h3>
                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest truncate mt-0.5">
                          {user?.full_name || user?.name}
                        </p>
                      </div>

                      <Chip 
                        size="sm" 
                        variant="flat" 
                        startContent={<RoleIcon size={10} />}
                        className={`mt-1.5 h-5 px-2 text-[8px] font-black uppercase tracking-widest gap-1.5 ${roleBadge.color}`}
                      >
                        {roleBadge.label}
                      </Chip>
                    </div>
                  </div>
                  
                  <Button
                    isIconOnly
                    size="lg"
                    variant="solid"
                    className="bg-danger text-white w-14 h-14 rounded-[22px] min-w-0 shadow-lg shadow-danger/40 hover:scale-110 active:scale-95 transition-all"
                    onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  >
                    <LogOut size={24} />
                  </Button>
                </div>

                {/* Family Avatars & Admin Buttons Row */}
                {(members.length > 0 || isSuperAdmin || isAdmin) && (
                  <div className="mt-8 flex items-center justify-between w-full px-1">
                    {/* Left: Avatars */}
                    {members.length > 0 ? (
                      <div className="flex -space-x-4 items-center">
                        {members.map((m) => (
                          <div key={m.id} className="relative group">
                            <Avatar
                              src={m.avatar_url}
                              name={m.nickname || m.name}
                              isBordered
                              color={m.id === user?.id ? 'primary' : (m.is_active !== false ? 'success' : 'default')}
                              className={`w-11 h-11 border-2 border-surface-900 shadow-xl group-hover:translate-y-[-6px] group-hover:scale-110 transition-all cursor-pointer ${m.id === user?.id ? 'ring-2 ring-accent' : ''}`}
                            />
                          </div>
                        ))}
                        <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ml-6 opacity-40">
                          <Users size={18} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Right: Admin Icons */}
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && (
                        <Button
                          isIconOnly
                          onClick={() => { setIsOpen(false); navigate('/admin'); }}
                          className="w-11 h-11 rounded-[18px] bg-red-500/10 border border-white/5 text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-95 transition-all shadow-lg min-w-0 p-0 flex items-center justify-center"
                          title="Painel do Sistema"
                        >
                          <Shield size={18} />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          isIconOnly
                          onClick={() => { setIsOpen(false); navigate('/household'); }}
                          className="w-11 h-11 rounded-[18px] bg-cyan-500/10 border border-white/5 text-cyan-400 hover:bg-cyan-500/20 hover:scale-110 active:scale-95 transition-all shadow-lg min-w-0 p-0 flex items-center justify-center"
                          title="Gerenciar Família"
                        >
                          <Users size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SESSÃO 3: USER OPTIONS GRID */}
              <div className="p-8 bg-black/5">
                <div className="grid grid-cols-3 gap-5">
                  {[
                    { id: 'banks', label: 'Bancos', icon: Landmark, color: 'bg-blue-500', shadow: 'shadow-blue-500/20', action: () => setShowBanks(true) },
                    { id: 'categories', label: 'Tags', icon: LayoutGrid, color: 'bg-purple-500', shadow: 'shadow-purple-500/20', action: () => setShowCategories(true) },
                    { id: 'security', label: 'PIN', icon: Lock, color: 'bg-orange-500', shadow: 'shadow-orange-500/20', action: () => setShowPinChange(true) },
                    { id: 'logs', label: 'Logs', icon: Database, color: 'bg-green-500', shadow: 'shadow-green-500/20', action: () => { setIsOpen(false); navigate('/logs'); } },
                    { id: 'docs', label: 'Docs', icon: BookOpen, color: 'bg-zinc-500', shadow: 'shadow-zinc-500/20', action: () => { setIsOpen(false); navigate('/docs'); } },
                    { id: 'profile', label: 'Perfil', icon: UserPen, color: 'bg-accent', shadow: 'shadow-accent/20', action: () => setShowEditProfile(true) },
                  ].map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => { setIsOpen(false); item.action(); }}
                      className="flex flex-col items-center gap-3 group p-2 transition-all"
                    >
                      <div className={`w-16 h-16 rounded-[24px] ${item.color} text-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:scale-110 group-hover:shadow-[0_0_20px] group-hover:${item.shadow} transition-all duration-300`}>
                        <item.icon size={28} />
                      </div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.15em] group-hover:text-white transition-colors duration-300">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>

      {/* MODALS */}
      <ManageBanksModal isOpen={showBanks} onClose={() => setShowBanks(false)} userId={user?.id} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <CategoriesModal isOpen={showCategories} onClose={() => setShowCategories(false)} />

      <Modal 
        isOpen={showPinChange} 
        onClose={() => { setShowPinChange(false); setPinStep('current'); setCurrentPin(''); setNewPin(''); setPinFeedback(null); }}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-surface-900 border border-white/10 rounded-[40px] mx-4",
          closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
        }}
      >
        <ModalContent>
          <ModalBody className="flex flex-col p-8 items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-[22px] bg-accent/10 flex items-center justify-center mb-2 shadow-2xl border border-accent/20">
              {pinStep === 'current' ? <ShieldCheck size={32} className="text-accent" /> : <Lock size={32} className="text-accent" />}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter text-white">
                {pinStep === 'current' ? 'PIN Atual' : 'Novo PIN'}
              </h2>
              <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">
                {pinStep === 'current' ? 'Confirme sua identidade' : `Defina ${pinLen} dígitos`}
              </p>
            </div>

            <div className="flex gap-4 my-6">
              {Array.from({ length: pinLen }).map((_, i) => {
                const filled = pinStep === 'current' ? currentPin.length > i : newPin.length > i;
                const isError = pinFeedback && !pinFeedback.ok;
                return (
                  <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                    isError ? 'bg-danger border-danger shadow-[0_0_12px_rgba(248,113,113,0.5)]' :
                    filled ? 'bg-accent border-accent scale-110 shadow-[0_0_15px_rgba(198,241,80,0.5)]' : 'border-white/10'
                  }`} />
                );
              })}
            </div>

            {pinFeedback && (
              <p className={`text-[8px] font-black uppercase tracking-widest animate-fade-in mb-4 ${pinFeedback.ok ? 'text-success' : 'text-danger'}`}>
                {pinFeedback.msg}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'close', 0, 'back'].map((key) => {
                if (key === 'close') return (
                  <button key="c" onClick={() => setShowPinChange(false)} className="h-12 flex items-center justify-center text-white/20 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                );
                if (key === 'back') return (
                  <button key="b" onClick={handleBack} className={`h-12 rounded-xl flex items-center justify-center text-white/40 transition-all active:scale-90 ${lastPressed === 'back' ? 'bg-accent/20 text-accent' : 'bg-white/5'}`}>
                    <X className="rotate-180" size={18} />
                  </button>
                );
                return (
                  <button key={key} onClick={() => handleDigit(String(key))}
                    className="h-12 rounded-xl flex items-center justify-center text-lg font-black bg-white/5 text-white/80 border border-white/5 active:scale-90 transition-all">
                    {key}
                  </button>
                );
              })}
            </div>

            {pinStep === 'new' && newPin.length === pinLen && !pinFeedback?.ok && (
              <Button 
                fullWidth 
                onPress={handlePinChange} 
                isLoading={pinLoading}
                className="mt-6 h-12 rounded-xl bg-accent text-black font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/20 active:scale-95 transition-all"
              >
                Confirmar
              </Button>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
