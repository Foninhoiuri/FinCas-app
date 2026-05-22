import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Users, Plus, ArrowLeft, User, UserX, UserCheck,
  Key, Pencil, Shield, Crown, X, ChevronLeft
} from 'lucide-react';
import {
  Card, CardBody, Button, Input, Chip, Avatar,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Spinner, Select, SelectItem
} from "@heroui/react";
import { validateCPF, formatCPF } from '../utils/validation';

export default function HouseholdManage() {
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);

  // New member form
  const [newMember, setNewMember] = useState({ name: '', nickname: '', pin: '', full_name: '', email: '', cpf: '' });
  const [pinLength, setPinLength] = useState(4);
  // Edit form
  const [editData, setEditData] = useState({ name: '', nickname: '', pin: '', full_name: '', email: '', cpf: '' });

  if (!isAdmin) {
    navigate('/', { replace: true });
    return null;
  }

  const householdId = user?.household_id;
 
  // Queries
  const { data: household, isLoading: loadingH } = useQuery({
    queryKey: ['household-details', householdId],
    queryFn: api.getOwnHousehold,
    enabled: !!householdId,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => api.getMembers(householdId),
    enabled: !!householdId,
  });
 
  // Mutations
  const currencyMutation = useMutation({
    mutationFn: (curr) => api.updateHouseholdCurrency(householdId, curr),
    onSuccess: (res, curr) => {
      qc.invalidateQueries({ queryKey: ['household-details'] });
      // Update local user object to reflect new currency
      if (user) {
        setUser({ ...user, currency: curr });
      }
      setTimeout(() => window.location.reload(), 100);
    },
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.addMember(householdId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household-members'] });
      setShowAdd(false);
      setNewMember({ name: '', nickname: '', pin: '', full_name: '', email: '', cpf: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, ...data }) => api.updateMember(householdId, uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household-members'] });
      setEditMember(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (uid) => api.toggleMember(householdId, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household-members'] }),
  });

  const getRoleBadge = (role) => {
    if (role === 'super_admin') return { label: 'Super Admin', color: 'bg-red-500/20 text-red-400', icon: Shield };
    if (role === 'admin') return { label: 'Admin', color: 'bg-cyan-500/20 text-cyan-400', icon: Crown };
    return { label: 'Membro', color: 'bg-white/10 text-white/50', icon: User };
  };

  const currencies = [
    { value: 'BRL', label: 'Real (R$)', flag: '🇧🇷' },
    { value: 'USD', label: 'Dólar (US$)', flag: '🇺🇸' },
    { value: 'CAD', label: 'Dólar Can. (C$)', flag: '🇨🇦' },
    { value: 'EUR', label: 'Euro (€)', flag: '🇪🇺' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-32 space-y-8 animate-fade-in pt-8 px-4 relative w-full overflow-x-hidden">
      {/* Header Premium */}
      <div className="flex items-center justify-between w-full min-w-0">
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <Button
            isIconOnly 
            variant="flat"
            onPress={() => navigate('/')}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:scale-110 active:scale-95 transition-all text-white/40 hover:text-white shrink-0"
          >
            <ChevronLeft size={24} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none truncate">
              {household?.name || 'Gerenciar Família'}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-1.5 shrink-0">
                <Users size={10} className="text-cyan-400" />
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{members.length} Membros</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-1.5 shrink-0">
                <Key size={10} className="text-accent" />
                <span className="text-[9px] font-black text-accent uppercase tracking-widest">{household?.invite_token}</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{household?.currency || 'BRL'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Household Settings */}
      {!loadingH && household && (
        <Card className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden w-full">
          <CardBody className="p-6">
            <div className="flex flex-row items-center justify-between gap-4">
              <div>
                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest">Moeda da Casa</p>
              </div>
              
              <div className="w-[120px] shrink-0">
                <Select
                  aria-label="Selecionar Moeda"
                  placeholder="Moeda"
                  variant="flat"
                  selectedKeys={[household.currency || 'BRL']}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0];
                    if (val) currencyMutation.mutate(val);
                  }}
                  classNames={{
                    trigger: "bg-white/5 border border-white/10 rounded-xl h-10 hover:bg-white/10 transition-all",
                    value: "text-[10px] font-black uppercase text-white tracking-widest",
                    popoverContent: "bg-surface-900 border border-white/10 rounded-2xl"
                  }}
                >
                  {currencies.map((c) => (
                    <SelectItem key={c.value} textValue={c.label}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.flag}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{c.value}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20 w-full">
          <Spinner size="lg" color="primary" />
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3 px-1 w-full">
        {members.map((m) => {
          const badge = getRoleBadge(m.role);
          const isInactive = !m.is_active;
          const BadgeIcon = badge.icon;

          return (
            <Card key={m.id} className={`w-full bg-gradient-to-br from-white/[0.07] via-transparent to-white/[0.02] backdrop-blur-2xl border border-white/5 hover:border-white/10 shadow-xl transition-all ${isInactive ? 'opacity-50' : ''} rounded-[32px] overflow-hidden group`}>
              <CardBody className="p-4 flex flex-row items-center gap-4">
                <Avatar
                  src={m.avatar_url}
                  className={`w-12 h-12 rounded-2xl ${isInactive ? 'grayscale' : ''} shadow-2xl border-white/5 shrink-0`}
                  isBordered
                  color={isInactive ? 'default' : m.role === 'admin' ? 'primary' : 'success'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-white uppercase tracking-tighter truncate leading-none group-hover:text-accent transition-colors">
                        {m.nickname || m.name}
                      </h3>
                      <p className="text-[8px] text-white/30 font-bold uppercase truncate mt-1 tracking-wider">
                        {m.full_name || 'Nome não informado'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        startContent={<BadgeIcon size={8} />}
                        className={`h-4 px-1.5 text-[7px] font-black uppercase tracking-widest gap-1 ${badge.color}`}
                      >
                        {badge.label}
                      </Chip>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] text-blue-400/50 font-medium lowercase truncate max-w-[90px]">{m.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {m.role !== 'super_admin' && (
                  <div className="flex gap-2">
                    <Button isIconOnly size="sm" variant="flat"
                      className="bg-white/5 text-white/20 rounded-xl h-10 w-10 hover:bg-white/10 hover:text-white transition-all"
                      onPress={() => {
                        setEditMember(m);
                        setEditData({ name: m.name, nickname: m.nickname || '', pin: '', full_name: m.full_name || '', email: m.email || '', cpf: m.cpf || '' });
                      }}>
                      <Pencil size={16} />
                    </Button>
                    <Button isIconOnly size="sm" variant="flat"
                      className={`rounded-xl h-10 w-10 transition-all ${isInactive ? 'bg-success/10 text-success/40 hover:text-success' : 'bg-warning/10 text-warning/40 hover:text-warning'}`}
                      onPress={() => toggleMutation.mutate(m.id)}
                      isLoading={toggleMutation.isPending}>
                      {isInactive ? <UserCheck size={16} /> : <UserX size={16} />}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {!isLoading && members.length === 0 && (
        <Card className="bg-surface-900 border border-white/5 border-dashed rounded-[40px]">
          <CardBody className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
              <Users size={32} />
            </div>
            <p className="text-white/20 text-xs font-black uppercase tracking-widest">Nenhum membro</p>
          </CardBody>
        </Card>
      )}

      {/* ═══ MODAL: Adicionar Membro ═══ */}
      <Modal
        isOpen={showAdd} onClose={() => setShowAdd(false)}
        placement="center" backdrop="blur"
        classNames={{ base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4" }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
            <h2 className="text-xl font-black tracking-tighter text-white uppercase">Novo Membro</h2>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">Adicionar à família</p>
          </ModalHeader>
          <ModalBody className="py-6 px-8 space-y-4">
            {addMutation.isError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-danger">{addMutation.error?.message}</p>
              </div>
            )}
            <Input
              label="Nome de Login (Acesso)"
              placeholder="Ex: João"
              variant="flat" labelPlacement="outside"
              value={newMember.name}
              onValueChange={v => setNewMember({ ...newMember, name: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <Input
              label="Nome Completo"
              placeholder="João Silva Sauro"
              variant="flat" labelPlacement="outside"
              value={newMember.full_name}
              onValueChange={v => setNewMember({ ...newMember, full_name: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <Input
              label="Email"
              type="email"
              placeholder="joao@exemplo.com"
              variant="flat" labelPlacement="outside"
              value={newMember.email}
              onValueChange={v => setNewMember({ ...newMember, email: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Apelido na UI"
                placeholder="Ex: Paizão"
                variant="flat" labelPlacement="outside"
                value={newMember.nickname}
                onValueChange={v => setNewMember({ ...newMember, nickname: v })}
                classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
              />
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                variant="flat" labelPlacement="outside"
                value={newMember.cpf}
                onValueChange={v => setNewMember({ ...newMember, cpf: formatCPF(v) })}
                errorMessage={newMember.cpf && !validateCPF(newMember.cpf) ? "CPF Inválido" : ""}
                isInvalid={newMember.cpf && !validateCPF(newMember.cpf)}
                classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-black px-1">Tamanho do PIN</label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {[4, 6].map(len => (
                  <Button
                    key={len}
                    size="sm"
                    variant={pinLength === len ? "solid" : "light"}
                    className={`flex-1 h-10 rounded-xl text-[10px] font-black ${pinLength === len ? 'bg-accent text-black' : 'text-white/40'}`}
                    onPress={() => setPinLength(len)}
                  >
                    {len} DÍGITOS
                  </Button>
                ))}
              </div>
            </div>

            <Input
              label={`PIN de Acesso (${pinLength} dígitos)`}
              placeholder="0000" 
              maxLength={pinLength}
              variant="flat" labelPlacement="outside"
              value={newMember.pin}
              onValueChange={v => setNewMember({ ...newMember, pin: v.replace(/\D/g, '') })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
          </ModalBody>
          <ModalFooter className="p-8 pt-0">
            <Button 
              fullWidth 
              className="bg-accent text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-accent/20 active:scale-95 transition-all" 
              onPress={() => {
                if (newMember.pin.length !== pinLength) return;
                addMutation.mutate(newMember);
              }}
              isLoading={addMutation.isPending}
              isDisabled={newMember.pin.length !== pinLength || (newMember.cpf && !validateCPF(newMember.cpf))}
            >
              Criar Membro
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ═══ MODAL: Editar Membro ═══ */}
      <Modal
        isOpen={!!editMember} onClose={() => setEditMember(null)}
        placement="center" backdrop="blur"
        classNames={{ base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4" }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
            <h2 className="text-xl font-black tracking-tighter text-white uppercase">Editar Membro</h2>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{editMember?.name}</p>
          </ModalHeader>
          <ModalBody className="py-6 px-8 space-y-4">
            {updateMutation.isError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-danger">{updateMutation.error?.message}</p>
              </div>
            )}
            <Input
              label="Nome Completo"
              variant="flat" labelPlacement="outside"
              value={editData.full_name}
              onValueChange={v => setEditData({ ...editData, full_name: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <Input
              label="Email"
              variant="flat" labelPlacement="outside"
              value={editData.email}
              onValueChange={v => setEditData({ ...editData, email: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Apelido"
                variant="flat" labelPlacement="outside"
                value={editData.nickname}
                onValueChange={v => setEditData({ ...editData, nickname: v })}
                classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
              />
              <Input
                label="CPF"
                variant="flat" labelPlacement="outside"
                value={editData.cpf}
                onValueChange={v => setEditData({ ...editData, cpf: formatCPF(v) })}
                errorMessage={editData.cpf && !validateCPF(editData.cpf) ? "CPF Inválido" : ""}
                isInvalid={editData.cpf && !validateCPF(editData.cpf)}
                classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-black px-1">Tamanho do PIN</label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {[4, 6].map(len => (
                  <Button
                    key={len}
                    size="sm"
                    variant={pinLength === len ? "solid" : "light"}
                    className={`flex-1 h-10 rounded-xl text-[10px] font-black ${pinLength === len ? 'bg-accent text-black' : 'text-white/40'}`}
                    onPress={() => { setPinLength(len); setEditData(prev => ({ ...prev, pin: '' })); }}
                  >
                    {len} DÍGITOS
                  </Button>
                ))}
              </div>
            </div>

            <Input
              label={`Novo PIN (${pinLength} dígitos)`}
              placeholder="Vazio para manter" 
              maxLength={pinLength}
              variant="flat" labelPlacement="outside"
              value={editData.pin}
              onValueChange={v => setEditData({ ...editData, pin: v.replace(/\D/g, '') })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
          </ModalBody>
          <ModalFooter className="p-8 pt-0">
            <Button 
              fullWidth 
              className="bg-accent text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-accent/20 active:scale-95 transition-all" 
              onPress={() => {
                if (editData.pin && editData.pin.length !== pinLength) return;
                const payload = { uid: editMember.id, ...editData };
                if (!editData.pin) delete payload.pin;
                updateMutation.mutate(payload);
              }}
              isLoading={updateMutation.isPending}
              isDisabled={(editData.pin && editData.pin.length !== pinLength) || (editData.cpf && !validateCPF(editData.cpf))}
            >
              Salvar Alterações
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Floating Add Button */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50">
        <Button
          onPress={() => setShowAdd(true)}
          className="h-12 px-6 rounded-2xl bg-accent text-black font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(198,241,80,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center gap-2 text-[10px]"
          startContent={<Plus size={20} />}
        >
          Novo Membro
        </Button>
      </div>
    </div>
  );
}
