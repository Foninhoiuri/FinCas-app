import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, Lock, Check, ChevronRight, Globe } from 'lucide-react';
import { Button, Input } from '@heroui/react';

const CURRENCIES = [
  { value: 'BRL', label: 'Real Brasileiro', symbol: 'R$', flag: '🇧🇷' },
  { value: 'USD', label: 'Dólar Americano', symbol: '$', flag: '🇺🇸' },
  { value: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
  { value: 'GBP', label: 'Libra Esterlina', symbol: '£', flag: '🇬🇧' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=casa, 1=admin, 2=pin
  const [householdName, setHouseholdName] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [adminName, setAdminName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (pin !== pinConfirm) {
      setError('Os PINs não coincidem');
      return;
    }
    if (pin.length < 4) {
      setError('PIN deve ter pelo menos 4 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_name: householdName,
          admin_name: adminName,
          admin_pin: pin,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao configurar');

      setDone(true);
      // Salva o household no localStorage para redirecionar corretamente
      localStorage.setItem('financas_household_id', data.household.id);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-24 h-24 rounded-[32px] bg-success/20 border border-success/30 flex items-center justify-center mx-auto shadow-2xl shadow-success/20">
            <Check size={40} className="text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Tudo pronto!</h1>
            <p className="text-white/40 text-sm mt-2">Redirecionando para o login...</p>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { icon: Home, label: 'Casa', title: 'Configure sua Casa' },
    { icon: User, label: 'Admin', title: 'Crie o Super Admin' },
    { icon: Lock, label: 'PIN', title: 'Defina seu PIN' },
  ];

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[28px] bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-accent/10">
            <span className="text-4xl">💸</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">FinCas</h1>
          <p className="text-white/30 text-sm font-black uppercase tracking-widest mt-1">Primeiro Acesso</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {steps.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isDone ? 'bg-success text-black shadow-lg shadow-success/30' :
                  isActive ? 'bg-accent text-black shadow-lg shadow-accent/30' :
                  'bg-white/5 text-white/20 border border-white/10'
                }`}>
                  {isDone ? <Check size={18} /> : <StepIcon size={18} />}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full transition-all duration-300 ${isDone ? 'bg-success' : 'bg-white/10'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-2">{steps[step].title}</h2>
          
          {error && (
            <div className="mb-6 p-3 rounded-2xl bg-danger/10 border border-danger/20">
              <p className="text-danger text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Step 0: Casa */}
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-white/40 text-sm mb-6">
                Dê um nome para a sua casa. Todos os membros vão compartilhar esta conta.
              </p>
              <Input
                label="Nome da Casa"
                placeholder="Ex: Família Silva, Casa do João..."
                variant="flat"
                labelPlacement="outside"
                value={householdName}
                onValueChange={setHouseholdName}
                classNames={{
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12",
                  input: "text-white"
                }}
                startContent={<Home size={16} className="text-white/20" />}
              />

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest block">
                  Moeda Padrão
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCurrency(c.value)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        currency === c.value
                          ? 'bg-accent/20 border-accent/40 text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{c.flag}</span>
                      <div className="text-left">
                        <p className="text-xs font-black">{c.symbol} · {c.value}</p>
                        <p className="text-[9px] opacity-50 uppercase tracking-wide">{c.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                fullWidth
                className="h-14 rounded-2xl bg-accent text-black font-black uppercase tracking-widest mt-2 shadow-xl shadow-accent/20"
                isDisabled={!householdName.trim()}
                onPress={() => setStep(1)}
                endContent={<ChevronRight size={18} />}
              >
                Próximo
              </Button>
            </div>
          )}

          {/* Step 1: Admin */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-white/40 text-sm mb-6">
                O Super Admin tem acesso total ao sistema, incluindo gerenciamento de membros e configurações avançadas.
              </p>
              <Input
                label="Seu Nome"
                placeholder="Ex: Igor, Maria..."
                variant="flat"
                labelPlacement="outside"
                value={adminName}
                onValueChange={setAdminName}
                classNames={{
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12",
                  input: "text-white"
                }}
                startContent={<User size={16} className="text-white/20" />}
              />
              <div className="flex gap-3">
                <Button
                  fullWidth
                  variant="flat"
                  className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 border border-white/10 text-white/40"
                  onPress={() => setStep(0)}
                >
                  Voltar
                </Button>
                <Button
                  fullWidth
                  className="h-12 rounded-2xl bg-accent text-black font-black uppercase tracking-widest shadow-xl shadow-accent/20"
                  isDisabled={!adminName.trim()}
                  onPress={() => setStep(2)}
                  endContent={<ChevronRight size={18} />}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: PIN */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-white/40 text-sm mb-6">
                Defina um PIN de 4 a 6 dígitos. Você usará ele para fazer login.
              </p>
              <Input
                label="PIN"
                placeholder="••••"
                type="password"
                inputMode="numeric"
                maxLength={6}
                variant="flat"
                labelPlacement="outside"
                value={pin}
                onValueChange={setPin}
                classNames={{
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12",
                  input: "text-white text-center tracking-widest text-xl"
                }}
                startContent={<Lock size={16} className="text-white/20" />}
              />
              <Input
                label="Confirmar PIN"
                placeholder="••••"
                type="password"
                inputMode="numeric"
                maxLength={6}
                variant="flat"
                labelPlacement="outside"
                value={pinConfirm}
                onValueChange={setPinConfirm}
                classNames={{
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: `bg-white/5 border rounded-2xl h-12 ${pinConfirm && pin !== pinConfirm ? 'border-danger/50' : 'border-white/10'}`,
                  input: "text-white text-center tracking-widest text-xl"
                }}
                startContent={<Lock size={16} className="text-white/20" />}
              />
              {pin && pinConfirm && pin !== pinConfirm && (
                <p className="text-danger text-[10px] font-black uppercase tracking-widest">PINs não coincidem</p>
              )}
              <div className="flex gap-3">
                <Button
                  fullWidth
                  variant="flat"
                  className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-white/5 border border-white/10 text-white/40"
                  onPress={() => setStep(1)}
                >
                  Voltar
                </Button>
                <Button
                  fullWidth
                  className="h-12 rounded-2xl bg-accent text-black font-black uppercase tracking-widest shadow-xl shadow-accent/20"
                  isDisabled={pin.length < 4 || pin !== pinConfirm || loading}
                  isLoading={loading}
                  onPress={handleSubmit}
                >
                  {loading ? 'Criando...' : 'Finalizar Setup'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Resumo */}
        {step > 0 && (
          <div className="mt-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-base">{householdName ? '🏠' : ''}</div>
            <div>
              <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Casa</p>
              <p className="text-xs font-black text-white/60">{householdName} · {currency}</p>
            </div>
            {step > 1 && (
              <>
                <div className="w-px h-6 bg-white/10" />
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-base">👤</div>
                <div>
                  <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Admin</p>
                  <p className="text-xs font-black text-white/60">{adminName}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
