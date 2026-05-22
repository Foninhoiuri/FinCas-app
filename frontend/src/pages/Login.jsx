import { useState, useCallback, useEffect, useRef } from 'react';
import { User, ChevronRight, WifiOff, X, Home, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Modal, ModalContent, ModalBody, useDisclosure, Avatar } from "@heroui/react";

export default function Login() {
  const { login, isAuthenticated, householdId, setHouseholdId, clearHousehold } = useAuth();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const hiddenInputRef = useRef(null);
  const codeInputRef = useRef(null);

  const [users, setUsers]               = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin]                   = useState('');
  const [error, setError]               = useState('');
  const [apiError, setApiError]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [shake, setShake]               = useState(false);
  const [success, setSuccess]           = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [lastPressed, setLastPressed]   = useState(null);
  const [particles, setParticles]       = useState([]);

  // Device binding state
  const [houseCode, setHouseCode]         = useState('');
  const [codeError, setCodeError]         = useState('');
  const [codeLoading, setCodeLoading]     = useState(false);
  const [houseName, setHouseName]         = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch users only when household is bound
  useEffect(() => {
    if (!householdId) {
      setLoadingUsers(false);
      setUsers([]);
      return;
    }
    let mounted = true;
    setLoadingUsers(true);
    api.getUsers({ household_id: householdId })
      .then(data  => { if (mounted) { setUsers(data || []); setApiError(null); } })
      .catch(err  => { if (mounted) { setApiError(err.message || 'Sem conexão'); setUsers([]); } })
      .finally(() => { if (mounted) setLoadingUsers(false); });
    return () => { mounted = false; };
  }, [householdId]);

  // Validate house code
  const handleValidateCode = async () => {
    if (!houseCode.trim()) return;
    setCodeLoading(true);
    setCodeError('');
    try {
      const res = await api.validateToken(houseCode.trim());
      setHouseholdId(res.household_id);
      setHouseName(res.household_name);
    } catch (err) {
      setCodeError(err.message || 'Código inválido');
      setHouseCode('');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSwitchHouse = () => {
    clearHousehold();
    setUsers([]);
    setHouseCode('');
    setCodeError('');
    setHouseName('');
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user); setPin(''); setError('');
    setShake(false); setSuccess(false); setLastPressed(null); setParticles([]);
    onOpen();
    setTimeout(() => hiddenInputRef.current?.focus(), 300);
  };

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  const spawnParticles = useCallback(() => {
    const count = 20;
    setParticles(Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 14,
      distance: 52 + Math.random() * 62,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 180,
    })));
    setTimeout(() => setParticles([]), 1000);
  }, []);

  const handleLogin = useCallback(async (enteredPin) => {
    setLoading(true); setError('');
    try {
      const res = await api.login({ user_id: selectedUser.id, pin: enteredPin });
      setSuccess(true);
      spawnParticles();
      setTimeout(() => { onClose(); login(res.user); }, 1300);
    } catch (apiErr) {
      setError(apiErr.message || 'PIN incorreto');
      triggerShake();
      setTimeout(() => { setPin(''); setError(''); setLastPressed(null); }, 750);
    } finally {
      setLoading(false);
    }
  }, [selectedUser, login, triggerShake, onClose, spawnParticles]);

  const handlePinInput = useCallback((digit) => {
    const maxLen = selectedUser?.pin_length || 4;
    if (loading || success || pin.length >= maxLen) return;
    setError('');
    setLastPressed(digit);
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === maxLen) handleLogin(newPin);
  }, [pin, loading, success, selectedUser, handleLogin]);

  const handleBackspace = () => {
    if (loading || success) return;
    setPin(p => p.slice(0, -1));
    setError('');
    setLastPressed('back');
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setPin(''); setError(''); setLastPressed(null); setSuccess(false); }, 300);
  };

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          15% { transform:translateX(-9px); } 30% { transform:translateX(9px); }
          45% { transform:translateX(-6px); } 60% { transform:translateX(6px); }
          75% { transform:translateX(-3px); } 90% { transform:translateX(3px); }
        }
        @keyframes dot-success {
          0%   { transform:scale(1); }
          40%  { transform:scale(1.7); box-shadow:0 0 0 0 rgba(74,222,128,0.8); }
          70%  { box-shadow:0 0 0 12px rgba(74,222,128,0); }
          100% { transform:scale(1.3); box-shadow:0 0 0 14px rgba(74,222,128,0); }
        }
        @keyframes particle-burst {
          0%   { transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0) scale(1); opacity:1; }
          100% { transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--dist)) scale(0); opacity:0; }
        }
        @keyframes ring-out {
          0%   { transform:scale(0.85); opacity:0.7; }
          100% { transform:scale(2.5); opacity:0; }
        }
        @keyframes avatar-pop {
          0% { transform:scale(1); } 35% { transform:scale(1.1); }
          65% { transform:scale(0.97); } 100% { transform:scale(1.04); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }

        .anim-slide-up { animation: slide-up 0.38s ease-out both; }
        .shake-dots    { animation: shake 0.6s ease-in-out; }
        .dot-success   { animation: dot-success 0.55s ease-out forwards; }
        .avatar-pop    { animation: avatar-pop 0.6s ease-out forwards; }
        .ring-out      { animation: ring-out 0.95s ease-out forwards; }

        .particle {
          position:absolute; top:50%; left:50%;
          border-radius:50%; pointer-events:none;
          animation: particle-burst 0.85s ease-out forwards;
          animation-delay: var(--delay);
        }

        /* ── User card — pílula ── */
        .user-card {
          background: #080808;
          border: 1px solid rgba(198,241,80,0.11);
          border-radius: 999px;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
        }
        .user-card:hover  { border-color: rgba(198,241,80,0.28); background: #0d0d0d; }
        .user-card:active { transform: scale(0.985); }

        /* ── Keypad keys ── */
        .key-base {
          height: 64px;
          border-radius: 16px;
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.92);
          font-size: 1.5rem;
          font-weight: 300;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; user-select: none;
          transition: background 0.12s, border-color 0.12s, box-shadow 0.12s, color 0.12s;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .key-base:active { transform: scale(0.93); }

        .key-lit {
          background: rgba(198,241,80,0.1) !important;
          border-color: rgba(198,241,80,0.4) !important;
          box-shadow: 0 0 20px rgba(198,241,80,0.22), inset 0 0 12px rgba(198,241,80,0.08) !important;
          color: #c6f150 !important;
        }
        .key-close {
          height: 64px;
          border-radius: 16px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; outline: none;
          transition: color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .key-close:active { transform: scale(0.93); color: rgba(255,255,255,0.45); }

        /* ── Pin modal: no scroll ever ── */
        .pin-modal-body {
          overflow: hidden !important;
          overscroll-behavior: none;
          touch-action: none;
        }
      `}</style>

      {/* ══════════════════════════
          TELA DE PERFIS
      ══════════════════════════ */}
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 relative z-10 overflow-hidden"
        style={{ background: '#000' }}
      >
        {/* Fundo: gradiente verde radial saindo do centro-topo, degrade para preto */}
        <div
          aria-hidden
          style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(198,241,80,0.13) 0%, rgba(74,222,128,0.06) 40%, transparent 75%)',
          }}
        />

        <div className="w-full max-w-sm relative z-10">

          {/* ═══ STATE 1: No household — Enter Code ═══ */}
          {!householdId && !loadingUsers && (
            <div className="anim-slide-up">
              <div className="flex flex-col items-center pt-10 pb-8">
                <img src="/fincas-logo.png" alt="FinCas"
                     className="w-20 h-20 object-contain mb-5 drop-shadow-2xl" />
                <h1 className="text-xl font-black uppercase tracking-[0.18em] text-white">ENTRAR</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.38em] mt-1.5"
                   style={{ color: 'rgba(255,255,255,0.2)' }}>Digite o código da sua casa</p>
              </div>

              {codeError && (
                <div className="rounded-2xl p-4 mb-4"
                     style={{ background: '#0a0a0a', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 text-center">{codeError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Home size={18} style={{ color: 'rgba(198,241,80,0.4)' }} />
                  </div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={houseCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      setHouseCode(val.slice(0, 20));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
                    placeholder="EX: ALVES-X79K"
                    autoFocus
                    className="w-full h-14 rounded-2xl pl-12 pr-4 text-sm font-black uppercase tracking-[0.15em] text-white placeholder:text-white/15 outline-none transition-all focus:ring-2 focus:ring-accent/30"
                    style={{ 
                      background: '#0a0a0a', 
                      border: '1px solid rgba(198,241,80,0.12)',
                      caretColor: '#c6f150'
                    }}
                  />
                </div>

                <button
                  onClick={handleValidateCode}
                  disabled={codeLoading || !houseCode.trim()}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.97] disabled:opacity-30"
                  style={{
                    background: houseCode.trim() ? '#c6f150' : '#111',
                    color: houseCode.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                    border: houseCode.trim() ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {codeLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 animate-spin"
                         style={{ borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#000' }} />
                  ) : (
                    <>Entrar <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STATE 2: Household bound — Show users ═══ */}
          {householdId && (
            <>
              {/* API error */}
              {apiError && (
                <div className="rounded-2xl p-5 mb-4 anim-slide-up"
                     style={{ background: '#0a0a0a', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: 'rgba(239,68,68,0.07)' }}>
                      <WifiOff size={17} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Sem Conexão</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{apiError}</p>
                    </div>
                  </div>
                  <button onClick={() => window.location.reload()}
                    className="w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                    Tentar Novamente
                  </button>
                </div>
              )}

              {/* Loading */}
              {loadingUsers && !apiError && (
                <div className="flex flex-col items-center gap-4 py-20">
                  <div className="w-7 h-7 rounded-full border-2 animate-spin"
                       style={{ borderColor: 'rgba(198,241,80,0.1)', borderTopColor: '#c6f150' }} />
                  <p className="text-[10px] font-black uppercase tracking-[0.35em]"
                     style={{ color: 'rgba(255,255,255,0.15)' }}>Carregando</p>
                </div>
              )}

              {/* Users */}
              {!loadingUsers && users.length > 0 && (
                <div className="anim-slide-up">
                  <div className="flex flex-col items-center pt-10 pb-8">
                    <img src="/fincas-logo.png" alt="FinCas"
                         className="w-20 h-20 object-contain mb-5 drop-shadow-2xl" />
                    <h1 className="text-xl font-black uppercase tracking-[0.18em] text-white">BEM‑VINDO</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.38em] mt-1.5"
                       style={{ color: 'rgba(255,255,255,0.2)' }}>Escolha seu perfil</p>
                  </div>

                  <div className="space-y-3">
                    {users.map((user) => (
                      <button key={user.id} onClick={() => handleSelectUser(user)}
                        className="user-card w-full p-3 pr-5 flex items-center gap-4 focus:outline-none">
                        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                             style={{ background: '#111' }}>
                          {user.avatar_url
                            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            : <User size={26} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-base font-black uppercase tracking-wide text-white leading-tight">
                            {user.nickname || user.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            {user.name.toLowerCase() === 'demo' ? 'PIN: 0000' : user.email}
                          </p>
                        </div>
                        <ChevronRight size={16} style={{ color: 'rgba(198,241,80,0.4)' }} />
                      </button>
                    ))}
                  </div>

                  {/* Switch House button */}
                  <button
                    onClick={handleSwitchHouse}
                    className="w-full mt-6 py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] transition-all active:scale-95"
                    style={{ color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <LogOut size={12} /> Trocar Casa
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="fixed bottom-6 text-[9px] font-bold uppercase tracking-[0.3em] z-10"
           style={{ color: 'rgba(255,255,255,0.04)' }}>FinCas v2.0</p>
      </div>

      {/* ══════════════════════════
          MODAL DE PIN
      ══════════════════════════ */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        placement="center"
        backdrop="opaque"
        size="full"
        classNames={{
          base: "m-0",
          body: "p-0",
          closeButton: "hidden",
          backdrop: "bg-black/70",
        }}
      >
        <ModalContent style={{ background: '#000', overflow: 'hidden' }}>
          <ModalBody
            className="pin-modal-body flex flex-col relative"
            style={{
              height: '100dvh',
              background: '#000',
              /* Verde suave irradiando do topo */
              backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(198,241,80,0.14) 0%, rgba(74,222,128,0.05) 50%, transparent 75%)',
            }}
          >

            {/* ── SEÇÃO SUPERIOR: avatar + nome ── */}
            <div
              style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '12px' }}
            >
              <div className="relative mb-5">
                {/* Success rings */}
                {success && (
                  <>
                    <div className="ring-out absolute inset-0 rounded-[38%]"
                         style={{ border: '2px solid rgba(74,222,128,0.55)' }} />
                    <div className="ring-out absolute inset-0 rounded-[38%]"
                         style={{ border: '2px solid rgba(74,222,128,0.3)', animationDelay: '0.2s' }} />
                  </>
                )}
                {/* Particles */}
                {particles.map(p => (
                  <div key={p.id} className="particle" style={{
                    width: p.size, height: p.size,
                    '--angle': `${p.angle}deg`,
                    '--dist': `${p.distance}px`,
                    '--delay': `${p.delay}ms`,
                    background: p.id % 3 === 0 ? '#c6f150' : p.id % 3 === 1 ? '#4ade80' : '#86efac',
                    animationDelay: `${p.delay}ms`,
                  }} />
                ))}

                {/* Avatar */}
                <div
                  className={`w-36 h-36 rounded-[38%] overflow-hidden flex items-center justify-center transition-all duration-400 ${success ? 'avatar-pop' : ''}`}
                  style={{
                    background: '#0a0a0a',
                    border: `2px solid ${
                      success ? 'rgba(74,222,128,0.5)'
                      : error  ? 'rgba(239,68,68,0.38)'
                      :          'rgba(198,241,80,0.16)'
                    }`,
                    boxShadow: success
                      ? '0 0 40px rgba(74,222,128,0.3)'
                      : error
                        ? '0 0 20px rgba(239,68,68,0.12)'
                        : '0 0 30px rgba(198,241,80,0.06)',
                  }}
                >
                  {selectedUser?.avatar_url
                    ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <User size={52} style={{ color: 'rgba(255,255,255,0.28)' }} />}
                </div>
              </div>

              <h2 className="text-2xl font-black uppercase tracking-[0.14em] text-white">
                {selectedUser?.nickname || selectedUser?.name}
              </h2>
            </div>

            {/* ── SEÇÃO MEIO: dots + label ── */}
            <div
              style={{ flex: '0 0 12%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              {/* Label */}
              <div style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                {error ? (
                  <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#f87171' }}>{error}</p>
                ) : (
                  <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.32em', color: success ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                    {success ? '✓ Acesso Liberado' : 'Digite o PIN'}
                  </p>
                )}
              </div>

              {/* Dots — maiores */}
              <div className={`flex items-center gap-6 ${shake ? 'shake-dots' : ''}`}>
                {Array.from({ length: selectedUser?.pin_length || 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={success ? 'dot-success' : ''}
                    style={{
                      width: '18px', height: '18px',
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                      animationDelay: success ? `${i * 70}ms` : '0ms',
                      background: success
                        ? '#4ade80'
                        : error
                          ? '#f87171'
                          : pin.length > i
                            ? '#c6f150'
                            : 'rgba(255,255,255,0.08)',
                      border: (!success && !error && pin.length <= i)
                        ? '1.5px solid rgba(255,255,255,0.15)'
                        : 'none',
                      boxShadow: success
                        ? '0 0 12px rgba(74,222,128,0.7)'
                        : error
                          ? '0 0 10px rgba(248,113,113,0.5)'
                          : pin.length > i
                            ? '0 0 14px rgba(198,241,80,0.6)'
                            : 'none',
                      transform: (pin.length > i && !success && !error) ? 'scale(1.35)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── SEÇÃO INFERIOR: teclado ── */}
            <div
              style={{ flex: '0 0 48%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '12px 24px 20px' }}
            >
              <input
                ref={hiddenInputRef}
                type="tel" pattern="[0-9]*" inputMode="numeric"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= (selectedUser?.pin_length || 4)) {
                    setPin(val);
                    if (val.length === (selectedUser?.pin_length || 4)) handleLogin(val);
                  }
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', maxWidth: '310px', margin: '0 auto', width: '100%' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'close', 0, 'back'].map((key) => {

                  if (key === 'close') return (
                    <button key="close" onClick={handleClose} className="key-close focus:outline-none">
                      <X size={17} />
                    </button>
                  );

                  if (key === 'back') {
                    const lit = lastPressed === 'back';
                    return (
                      <button key="b" onClick={handleBackspace}
                        className={`key-base focus:outline-none ${lit ? 'key-lit' : ''}`}
                        style={{ fontSize: '1.15rem' }}>
                        ←
                      </button>
                    );
                  }

                  const lit = lastPressed === String(key);
                  return (
                    <button key={key} onClick={() => handlePinInput(String(key))}
                      className={`key-base focus:outline-none ${lit ? 'key-lit' : ''}`}>
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>

          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}