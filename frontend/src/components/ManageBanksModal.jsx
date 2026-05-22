import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Landmark, Plus, Pencil, Trash2, X, Shield, 
  Users, User, Check, MoreVertical, ChevronLeft
} from 'lucide-react';
import { api } from '../api/client';
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Switch, Card, CardBody, Dropdown, 
  DropdownTrigger, DropdownMenu, DropdownItem, Spinner
} from "@heroui/react";
import { useAuth } from '../context/AuthContext';
import { formatCurrency as formatCurrencyUtil, formatCurrencyInput, parseCurrencyInput } from '../utils/currency';

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
  '#111111',
];

export default function ManageBanksModal({ isOpen, onClose, userId }) {
  const { currency } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const qc = useQueryClient();
  const [editingBank, setEditingBank] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isShared, setIsShared] = useState(true);
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');

  // 1. Data Query
  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => api.getBanks({ user_id: userId }),
    enabled: !!userId && isOpen
  });

  // 2. Mutations
  const mCreate = useMutation({
    mutationFn: (data) => api.createBank(data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['banks'] }); 
      qc.invalidateQueries({ queryKey: ['budgets'] });
      closeForm(); 
    },
    onError: (err) => setError(err.message)
  });

  const mUpdate = useMutation({
    mutationFn: ({ id, ...data }) => api.updateBank(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['banks'] }); 
      qc.invalidateQueries({ queryKey: ['budgets'] });
      closeForm(); 
    },
    onError: (err) => setError(err.message)
  });

  const mDelete = useMutation({
    mutationFn: (id) => api.deleteBank(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const openForm = (bank = null) => {
    if (bank) {
      setEditingBank(bank);
      setName(bank.name);
      setColor(bank.color);
      setIsShared(bank.is_shared);
      setBalance(formatCurrencyInput(bank.balance || 0, currency));
    } else {
      setEditingBank(null);
      setName('');
      setColor('#6366f1');
      setIsShared(true);
      setBalance('');
    }
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBank(null);
  };

  const handleSave = () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    const payload = { 
      name: name.trim(), 
      color, 
      is_shared: isShared, 
      user_id: userId,
      balance: parseCurrencyInput(balance) || 0
    };
    if (editingBank) {
      mUpdate.mutate({ id: editingBank.id, ...payload });
    } else {
      mCreate.mutate(payload);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="md" 
      placement="center" 
      backdrop="blur"
      classNames={{ 
        base: "bg-surface-900/60 border border-white/10 rounded-[40px] shadow-2xl backdrop-blur-3xl m-4",
        closeButton: "hidden"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Button 
              isIconOnly 
              variant="flat" 
              onPress={onClose} 
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:scale-110 active:scale-95 transition-all text-white/40 hover:text-white"
            >
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Bancos</h2>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-1">Gerenciar Contas</p>
            </div>
          </div>
          <Button 
            isIconOnly 
            className="w-12 h-12 rounded-2xl bg-accent text-black shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all" 
            onPress={() => openForm()}
          >
            <Plus size={24} />
          </Button>
        </ModalHeader>

        <ModalBody className="py-6 px-8 min-h-[400px]">
          {isFormOpen ? (
            <div className="space-y-6 animate-fade-in">
              {error && (
                <div className="p-4 rounded-2xl bg-danger/10 text-danger border border-danger/20 flex items-center gap-3">
                   <Shield size={16} className="shrink-0" />
                   <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              <Input 
                label="Nome do Banco"
                placeholder="Ex: Nubank, Itaú..."
                value={name}
                onValueChange={setName}
                variant="flat"
                labelPlacement="outside"
                classNames={{ 
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl group-data-[focus=true]:border-accent/50" 
                }}
              />

              <Input 
                label="Saldo Atual"
                placeholder="0,00"
                value={balance}
                onValueChange={v => setBalance(formatCurrencyInput(v, currency))}
                variant="flat"
                labelPlacement="outside"
                startContent={<span className="text-white/20 text-xs">{currency === 'BRL' ? 'R$' : '$'}</span>}
                classNames={{ 
                  label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                  inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl group-data-[focus=true]:border-accent/50" 
                }}
              />

              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mb-3 block px-1">Cor do Banco</label>
                <div className="grid grid-cols-8 gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`aspect-square rounded-lg transition-all duration-300 ${
                        color === c ? 'scale-110 ring-2 ring-white/50' : 'opacity-40 hover:opacity-100'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isShared ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/20'}`}>
                    {isShared ? <Users size={16} /> : <User size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/90 uppercase tracking-tight">Compartilhado</p>
                    <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Visível para a família</p>
                  </div>
                </div>
                <Switch isSelected={isShared} onValueChange={setIsShared} color="success" size="sm" />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button fullWidth variant="flat" onPress={closeForm} className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</Button>
                <Button fullWidth onPress={handleSave} isLoading={mCreate.isPending || mUpdate.isPending} className="h-14 rounded-2xl bg-accent text-black font-black uppercase tracking-widest shadow-xl shadow-accent/20">Salvar</Button>
              </div>

              {editingBank && (
                <Button 
                  fullWidth 
                  variant="light" 
                  color="danger" 
                  onPress={() => mDelete.mutate(editingBank.id)}
                  className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] mt-2"
                  startContent={<Trash2 size={14} />}
                >
                  Excluir Banco
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 min-h-[400px]">
              <div className="flex-1 space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Spinner color="primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Buscando Bancos...</p>
                  </div>
                ) : banks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                    <Landmark size={48} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhum banco cadastrado</p>
                  </div>
                ) : (
                  banks.map((bank) => (
                    <Card 
                      key={bank.id} 
                      isPressable
                      fullWidth
                      onPress={() => openForm(bank)}
                      className="bg-black/40 border border-white/5 hover:border-white/10 transition-all group w-full"
                    >
                      <CardBody className="p-4 flex flex-row items-center gap-4 w-full">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner relative overflow-hidden shrink-0"
                             style={{ background: `${bank.color}15` }}>
                          <div className="absolute inset-0 opacity-10" style={{ background: bank.color }} />
                          <Landmark size={24} style={{ color: bank.color }} className="relative z-10" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{bank.name}</h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-xs font-semibold text-white/60">{formatCurrency(bank.balance)}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: bank.color }} />
                              <p className="text-[9px] text-white/20 uppercase tracking-widest font-black">
                                {bank.is_shared ? '👫 Família' : '👤 Privado'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Pencil size={16} className="text-white/10 group-hover:text-accent transition-colors shrink-0" />
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
