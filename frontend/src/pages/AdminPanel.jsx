import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Shield, Plus, Users, Calendar, Key, Trash2, Ban, CheckCircle,
  ArrowLeft, Copy, Check, RefreshCw, X, ChevronLeft
} from 'lucide-react';
import {
  Card, CardBody, Button, Input, Chip, Avatar,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Spinner, Tooltip, Popover, PopoverTrigger, PopoverContent
} from "@heroui/react";
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function AdminPanel() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [tokenResetTarget, setTokenResetTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);

  // New house form
  const [newHouse, setNewHouse] = useState({ name: '', admin_name: '', admin_email: '', admin_pin: '0000' });

  // Reset PIN form
  const [resetPin, setResetPin] = useState('');
  const [resetUserId, setResetUserId] = useState('');

  // Redirect if not super_admin
  if (!isSuperAdmin) {
    navigate('/', { replace: true });
    return null;
  }

  // Queries
  const { data: households = [], isLoading } = useQuery({
    queryKey: ['admin-households'],
    queryFn: api.getHouseholds,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: api.createHousehold,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['admin-households'] });
      setShowCreate(false);
      setNewHouse({ name: '', admin_name: '', admin_email: '', admin_pin: '0000' });
    },
  });
 
  const suspendMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateHousehold(id, { status }),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['admin-households'] });
      setSuspendTarget(null);
    },
  });
 
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteHousehold(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['admin-households'] });
      setDeleteTarget(null);
    },
  });

  const resetTokenMutation = useMutation({
    mutationFn: (id) => api.resetHouseholdToken(id),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['admin-households'] });
      setTokenResetTarget(null);
    },
  });

  const copyToken = (token) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token);
    } else {
      // Fallback for non-secure contexts (HTTP)
      const textArea = document.createElement("textarea");
      textArea.value = token;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto pb-32 space-y-8 animate-fade-in pt-8 px-4 relative w-full overflow-x-hidden">
      {/* Header Premium */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button
            isIconOnly 
            variant="flat"
            onPress={() => navigate('/')}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:scale-110 active:scale-95 transition-all text-white/40 hover:text-white"
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase leading-none flex items-center gap-3">
               Painel do Sistema
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                <Users size={10} className="text-white/30" />
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{households.length} Casas Ativas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" color="primary" />
        </div>
      )}

      {/* Household Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
        {households.map((h) => {
          const members = Array.isArray(h.members) ? h.members : 
                         (typeof h.members === 'string' ? JSON.parse(h.members) : []);
          const statusColor = h.status === 'suspended' ? '#ef4444' : '#c6f150';
          
          return (
            <Card 
              key={h.id} 
              className="bg-transparent shadow-none border-none overflow-visible group"
              style={{ 
                '--card-shadow': statusColor,
                '--card-glow': `${statusColor}40`
              }}
            >
              <div className={`w-full h-full rounded-[40px] overflow-hidden bg-surface-900 border border-white/10 relative shadow-2xl ${h.status === 'suspended' ? 'opacity-70' : ''}`}>
                {/* Glow de Canto */}
                <div 
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-20" 
                  style={{ backgroundColor: 'var(--card-shadow)' }}
                />

                <CardBody className="p-6 relative z-10 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-all">
                        <span className="text-2xl">🏠</span>
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tighter text-white leading-none uppercase">
                          {h.name}
                        </h3>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1.5">
                          Criada em {formatDate(h.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <Chip
                      size="sm"
                      variant="flat"
                      className={`text-[8px] font-black uppercase tracking-widest ${h.status === 'suspended' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}
                    >
                      {h.status === 'suspended' ? '🔴 Suspensa' : '🟢 Ativa'}
                    </Chip>
                  </div>

                  {/* Members & Invite Token */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Avatar Group */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[8px] text-white/30 uppercase font-black tracking-widest px-1">Membros</p>
                      <div className="flex -space-x-3">
                        {members.slice(0, 4).map((m, idx) => (
                          <Popover 
                            key={m.id || idx} 
                            placement="top"
                            classNames={{
                              content: "p-3 min-w-[140px] bg-surface-800 border border-white/10 shadow-2xl rounded-3xl"
                            }}
                          >
                            <PopoverTrigger>
                              <div className="outline-none">
                                <Avatar 
                                  src={m.avatar_url}
                                  name={m.nickname || m.name}
                                  size="sm"
                                  className="ring-2 ring-surface-900 w-8 h-8 cursor-pointer hover:ring-accent transition-all"
                                />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent>
                              <div className="flex flex-col gap-3 w-full p-1">
                                <div className="text-center border-b border-white/5 pb-2 mb-1">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white">{m.nickname || m.name}</p>
                                  <p className="text-[8px] text-white/30 uppercase font-bold mt-0.5">{m.role}</p>
                                </div>
                                
                                <div className="space-y-2">
                                  {m.full_name && (
                                    <div className="flex flex-col">
                                      <span className="text-[7px] text-white/20 uppercase font-bold">Nome Completo</span>
                                      <p className="text-[9px] text-white/70 font-semibold">{m.full_name}</p>
                                    </div>
                                  )}
                                  
                                  {m.email && (
                                    <div className="flex flex-col">
                                      <span className="text-[7px] text-white/20 uppercase font-bold">E-mail</span>
                                      <p className="text-[9px] text-blue-400 font-semibold truncate">{m.email}</p>
                                    </div>
                                  )}

                                  {m.cpf && (
                                    <div className="flex flex-col">
                                      <span className="text-[7px] text-white/20 uppercase font-bold">CPF</span>
                                      <p className="text-[9px] text-white/70 font-mono">{m.cpf}</p>
                                    </div>
                                  )}
                                </div>

                                <Button 
                                  size="sm" 
                                  variant="flat" 
                                  className="bg-blue-500/20 text-blue-400 w-full h-8 text-[9px] font-black uppercase rounded-xl border border-blue-500/20 active:scale-95 transition-all mt-1"
                                  onPress={() => { setResetTarget(h); setResetUserId(m.id); setResetPin(''); }}
                                >
                                  Reset PIN
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ))}
                        {members.length > 4 && (
                          <Tooltip 
                            content={`${members.length - 4} outros membros`}
                            placement="top"
                          >
                            <div className="w-8 h-8 rounded-full bg-white/5 ring-2 ring-surface-900 flex items-center justify-center text-[10px] text-white/40 font-black cursor-help">
                              +{members.length - 4}
                            </div>
                          </Tooltip>
                        )}
                        {members.length === 0 && (
                          <p className="text-[10px] text-white/20 font-black uppercase tracking-widest px-1">Vazio</p>
                        )}
                      </div>
                    </div>

                    {/* Invite Token Box */}
                    <div className="flex-1 max-w-[140px]">
                      <button 
                        onClick={() => copyToken(h.invite_token)}
                        className="w-full text-left p-2.5 rounded-2xl bg-white/5 border border-white/10 group/token hover:bg-white/10 transition-all active:scale-95"
                      >
                        <p className="text-[7px] text-white/30 uppercase font-black tracking-widest flex items-center justify-between">
                          Token 
                          {copiedToken === h.invite_token ? <Check size={8} className="text-success" /> : <Copy size={8} className="text-white/20 group-hover/token:text-white" />}
                        </p>
                        <p className="text-xs font-black text-accent mt-1 truncate">{h.invite_token}</p>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <Button
                      size="sm" variant="flat"
                      className={`flex-1 h-10 text-[9px] font-black uppercase tracking-widest rounded-xl ${h.status === 'suspended' ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-warning/10 text-warning hover:bg-warning/20'}`}
                      onPress={() => setSuspendTarget(h)}
                      isLoading={suspendMutation.isPending && suspendMutation.variables?.id === h.id}
                      startContent={h.status === 'suspended' ? <CheckCircle size={12} /> : <Ban size={12} />}
                    >
                      {h.status === 'suspended' ? 'Ativar' : 'Suspender'}
                    </Button>
                    <Button
                      size="sm" variant="flat"
                      className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest rounded-xl bg-accent/10 text-accent hover:bg-accent/20"
                      onPress={() => setTokenResetTarget(h)}
                      isLoading={resetTokenMutation.isPending && resetTokenMutation.variables === h.id}
                      startContent={<RefreshCw size={12} />}
                    >
                      Reset Token
                    </Button>
                    <Button
                      size="sm" variant="flat" isIconOnly
                      className="h-10 w-10 bg-danger/10 text-danger rounded-xl hover:bg-danger/20"
                      onPress={() => setDeleteTarget(h)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardBody>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {!isLoading && households.length === 0 && (
        <Card className="bg-surface-900 border border-white/5 border-dashed rounded-[40px]">
          <CardBody className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
              <Shield size={32} />
            </div>
            <p className="text-white/20 text-xs font-black uppercase tracking-widest">Nenhuma casa criada</p>
          </CardBody>
        </Card>
      )}
 
      {/* ═══ MODAL: Nova Casa ═══ */}
      <Modal
        isOpen={showCreate} onClose={() => setShowCreate(false)}
        placement="center" backdrop="blur"
        classNames={{ 
          base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4",
          closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
            <h2 className="text-xl font-black tracking-tighter text-white uppercase">Nova Casa</h2>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">Criar household + admin</p>
          </ModalHeader>
          <ModalBody className="py-6 px-8 gap-5">
            {createMutation.isError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-danger">{createMutation.error?.message}</p>
              </div>
            )}
            <Input label="Nome da Casa" placeholder="Ex: Casa do Matheus" value={newHouse.name}
              onValueChange={(v) => setNewHouse(p => ({ ...p, name: v }))} variant="flat" labelPlacement="outside"
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
            <Input label="Nome do Admin" placeholder="Ex: Matheus" value={newHouse.admin_name}
              onValueChange={(v) => setNewHouse(p => ({ ...p, admin_name: v }))} variant="flat" labelPlacement="outside"
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
            <Input label="Email do Admin" placeholder="matheus@email.com" value={newHouse.admin_email}
              onValueChange={(v) => setNewHouse(p => ({ ...p, admin_email: v }))} variant="flat" labelPlacement="outside"
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
            <Input label="PIN Inicial" placeholder="0000" value={newHouse.admin_pin}
              onValueChange={(v) => setNewHouse(p => ({ ...p, admin_pin: v }))} variant="flat" labelPlacement="outside" maxLength={6}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
          </ModalBody>
          <ModalFooter className="p-8 pt-0">
            <Button fullWidth onPress={() => createMutation.mutate(newHouse)} isLoading={createMutation.isPending}
              className="bg-accent text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-accent/20 active:scale-95 transition-all">
              Criar Casa + Admin
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
 
      {/* ═══ MODAL: Reset PIN ═══ */}
      <Modal
        isOpen={!!resetTarget} onClose={() => setResetTarget(null)}
        placement="center" backdrop="blur"
        classNames={{ 
          base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4",
          closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
            <h2 className="text-xl font-black tracking-tighter text-white uppercase">Reset de PIN</h2>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{resetTarget?.name}</p>
          </ModalHeader>
          <ModalBody className="py-6 px-8 gap-5">
            <Input label="ID do Usuário" placeholder="UUID do usuário" value={resetUserId}
              onValueChange={setResetUserId} variant="flat" labelPlacement="outside"
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
            <Input label="Novo PIN" placeholder="Ex: 1234" value={resetPin}
              onValueChange={setResetPin} variant="flat" labelPlacement="outside" maxLength={6}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-black tracking-widest", inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" }} />
          </ModalBody>
          <ModalFooter className="p-8 pt-0">
            <Button fullWidth
              onPress={async () => {
                await api.resetUserPin(resetTarget.id, { user_id: resetUserId, new_pin: resetPin });
                setResetTarget(null);
              }}
              className="bg-blue-500 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
              Redefinir PIN
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ═══ MODAL: Suspend Confirmation ═══ */}
      <DeleteConfirmationModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && suspendMutation.mutate({ id: suspendTarget.id, status: suspendTarget.status === 'suspended' ? 'active' : 'suspended' })}
        title={suspendTarget?.status === 'suspended' ? `Reativar "${suspendTarget?.name}"?` : `Suspender "${suspendTarget?.name}"?`}
        message={suspendTarget?.status === 'suspended' 
          ? "Esta casa voltará a ter acesso normal ao sistema e todos os usuários poderão fazer login." 
          : "Esta ação impedirá o login de TODOS os membros desta casa imediatamente. Os dados serão preservados, mas o acesso será bloqueado."}
        confirmText={suspendTarget?.status === 'suspended' ? "Reativar Agora" : "Confirmar Suspensão"}
        isLoading={suspendMutation.isPending}
      />

      {/* ═══ MODAL: Token Reset Confirmation ═══ */}
      <DeleteConfirmationModal
        isOpen={!!tokenResetTarget}
        onClose={() => setTokenResetTarget(null)}
        onConfirm={() => tokenResetTarget && resetTokenMutation.mutate(tokenResetTarget.id)}
        title={`Resetar Token de "${tokenResetTarget?.name}"?`}
        message="Esta ação irá gerar um NOVO código de convite. O código atual deixará de funcionar imediatamente para novos convites. Isso NÃO desconecta usuários já logados, mas invalida o código de segurança da casa."
        confirmText="Gerar novo Token"
        isLoading={resetTokenMutation.isPending}
      />

      {/* ═══ MODAL: Delete Confirmation ═══ */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={`Excluir "${deleteTarget?.name}"?`}
        message="Esta ação é IRREVERSÍVEL. Todos os dados da casa serão apagados permanentemente: usuários, transações, bancos, cartões, metas e orçamentos."
        confirmText="Excluir tudo permanentemente"
        isLoading={deleteMutation.isPending}
      />
      {/* Floating Add Button */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50">
        <Button
          onPress={() => setShowCreate(true)}
          className="h-12 px-6 rounded-2xl bg-accent text-black font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(198,241,80,0.2)] hover:scale-110 active:scale-95 transition-all flex items-center gap-2 text-[10px]"
          startContent={<Plus size={20} />}
        >
          Nova Casa
        </Button>
      </div>
    </div>
  );
}
