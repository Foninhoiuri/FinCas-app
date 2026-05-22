import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plane, Shield, Laptop, PiggyBank, Plus, X, MoreVertical, Trash2, Edit2, TrendingUp, Calendar, History, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client';
import { useModals } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ConnectionStatus from '../components/ConnectionStatus';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Progress, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Select, SelectItem, Popover, PopoverTrigger, PopoverContent, Switch } from "@heroui/react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import PageHeader from '../components/PageHeader';
import MonthPicker from '../components/MonthPicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

// Helper moved inside components

const iconMap = {
  plane: Plane,
  shield: Shield,
  laptop: Laptop,
  'piggy-bank': PiggyBank,
  target: Target,
};

const ICONS = [
  { value: 'target', label: 'Alvo', icon: Target },
  { value: 'plane', label: 'Viagem', icon: Plane },
  { value: 'shield', label: 'Reserva', icon: Shield },
  { value: 'laptop', label: 'Compra', icon: Laptop },
  { value: 'piggy-bank', label: 'Poupança', icon: PiggyBank },
];

function GoalModal({ isOpen, onClose, goal }) {
  const { user, currency, currencySymbol } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    color: '#c6f150',
    icon: '🎯',
    visibility: 'shared',
  });

  useEffect(() => {
    if (goal && isOpen) {
      setFormData({
        title: goal.title || '',
        target_amount: formatCurrencyInput(Number(goal.target_amount || 0), currency),
        current_amount: formatCurrencyInput(Number(goal.current_amount || 0), currency),
        deadline: goal.deadline || '',
        color: goal.color || '#c6f150',
        icon: goal.icon || '🎯',
        visibility: goal.visibility || 'shared',
      });
    } else if (isOpen) {
      setFormData({
        title: '',
        target_amount: '',
        current_amount: '',
        deadline: '',
        color: '#c6f150',
        icon: '🎯',
        visibility: 'shared',
      });
    }
  }, [goal, isOpen]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        user_id: user?.id,
        target_amount: parseCurrencyInput(data.target_amount) || 0,
        current_amount: parseCurrencyInput(data.current_amount) || 0
      };
      return goal ? api.updateGoal(goal.id, payload) : api.createGoal(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onClose();
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: "bg-surface-900 sm:rounded-3xl border-t border-white/10",
        closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
          <h2 className="text-lg font-bold text-white">{goal ? 'Editar Meta' : 'Nova Meta'}</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Objetivo Financeiro</p>
        </ModalHeader>
        <ModalBody className="py-6 gap-4">
          <Input
            label="Nome da Meta"
            placeholder="Ex: Viagem Japão, Reserva de Emergência..."
            variant="flat" labelPlacement="outside"
            value={formData.title}
            onValueChange={v => setFormData({ ...formData, title: v })}
            classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Alvo"
              placeholder="0,00"
              variant="flat" labelPlacement="outside"
              inputMode="decimal"
              value={formData.target_amount}
              onValueChange={v => setFormData({ ...formData, target_amount: formatCurrencyInput(v, currency) })}
              startContent={<span className="text-white/20 text-xs">{currencySymbol}</span>}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
            <Input
              label="Já Guardado"
              placeholder="0,00"
              variant="flat" labelPlacement="outside"
              inputMode="decimal"
              value={formData.current_amount}
              onValueChange={v => setFormData({ ...formData, current_amount: formatCurrencyInput(v, currency) })}
              startContent={<span className="text-white/20 text-xs">{currencySymbol}</span>}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-bold px-1">Ícone / Emoji</label>
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <button className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 transition-colors">
                    {formData.icon || '🎯'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(e) => setFormData({ ...formData, icon: e.emoji })}
                    lazyLoadEmojis={true}
                    skinTonesDisabled
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              type="date" label="Prazo (Opcional)"
              variant="flat" labelPlacement="outside"
              value={formData.deadline}
              onValueChange={v => setFormData({ ...formData, deadline: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 [color-scheme:dark]" }}
            />
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.visibility === 'shared' ? 'bg-accent/10 text-accent-light' : 'bg-white/5 text-white/20'}`}>
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Meta Coletiva</p>
                <p className="text-[10px] text-white/30">Visível para todos da casa</p>
              </div>
            </div>
            <Switch
              isSelected={formData.visibility === 'shared'}
              onValueChange={v => setFormData({ ...formData, visibility: v ? 'shared' : 'personal' })}
              color="primary" size="sm"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button fullWidth className="bg-accent text-black font-black uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-accent/20" onPress={() => mutation.mutate(formData)} isLoading={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar Meta'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function GoalCard({ goal, onEdit, onDelete }) {
  const { openAddModal } = useModals();
  const { currency } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);
  const remaining = target - current;
  const percentage = target > 0 ? (current / target) * 100 : 0;

  const onAportar = (g) => {
    openAddModal({ goal_id: g.id, description: `Aporte: ${g.title}` });
  };

  return (
    <Card
      key={goal.id}
      className="bg-transparent shadow-none border-none overflow-visible group transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] cursor-pointer animate-slide-up"
      style={{
        '--card-shadow': `${goal.color || '#c6f150'}`,
        '--card-glow': `${goal.color || '#c6f150'}40`
      }}
    >


      <div className="w-full h-full rounded-[40px] overflow-hidden bg-surface-900 border border-white/10 relative shadow-2xl">
        {/* Glow de Canto (Sutil) */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-20"
          style={{ backgroundColor: 'var(--card-shadow)' }}
        />

        <CardBody className="p-5 relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Ícone com background tonalizado */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all"
                style={{ backgroundColor: `${goal.color || '#c6f150'}15`, color: goal.color || '#c6f150' }}
              >
                <span>{goal.icon || '🎯'}</span>
              </div>
              <div>
                <h3 className="text-base font-black tracking-tighter text-white truncate max-w-[150px]">
                  {goal.title}
                </h3>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">
                  Meta de Poupança
                </p>
              </div>
            </div>

            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white/20 hover:text-white h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Ações"
                className="bg-surface-800 border border-white/10 rounded-xl"
                onAction={(key) => key === 'edit' ? onEdit(goal) : onDelete(goal.id)}
              >
                <DropdownItem key="edit" startContent={<Edit2 size={14} />}>Editar</DropdownItem>
                <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={14} />}>Apagar</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          <div className="space-y-4">
            {/* Valores */}
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Acumulado</p>
                <p className="text-xl font-black tracking-tighter text-white">
                  {formatCurrency(current, currency)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Alvo</p>
                <p className="text-base font-bold text-white/60">
                  {formatCurrency(target, currency)}
                </p>
              </div>
            </div>

            {/* Barra de Progresso Neon */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-white/40">Faltam: {formatCurrency(remaining, currency)}</span>
                <span className="text-accent">{Math.round(percentage)}%</span>
              </div>
              <Progress
                value={percentage}
                aria-label={`Progresso da meta ${goal.title}`}
                className="h-2 rounded-full"
                classNames={{
                  indicator: "bg-accent shadow-[0_0_15px_rgba(198,241,80,0.6)]"
                }}
              />
            </div>

            <div className="pt-2">
              <Button
                fullWidth
                size="sm"
                variant="flat"
                className="bg-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] h-10 rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                onPress={() => onAportar(goal)}
              >
                Aportar
              </Button>
            </div>

          </div>
        </CardBody>
      </div>
    </Card>
  );
}

export default function Goals() {
  const { user, currency, currencySymbol } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const { openAddModal } = useModals();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = searchParams.get('month') || nowStr;

  const [modalGoal, setModalGoal] = useState(undefined);
  const [aportarGoal, setAportarGoal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.getGoals({}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setDeleteModal({ isOpen: false, id: null });
    },
  });

  const totalSaved = (goals || []).reduce((acc, g) => acc + Number(g.current_amount || 0), 0);
  const totalTarget = (goals || []).reduce((acc, g) => acc + Number(g.target_amount || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto pb-10 overflow-visible">
      <div className="space-y-4 mb-8">
        <PageHeader
          title="Metas"
          icon={Target}
        >
          <MonthPicker currentMonth={currentMonth} onChange={(m) => navigate(`/goals?month=${m}`)} />
        </PageHeader>

        {/* RESUMO INTEGRADO */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-1 pt-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-success" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Acumulado</span>
              <p className="text-sm font-black tracking-tight text-white">
                {formatCurrency(totalSaved, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Target size={16} className="text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Alvo Total</span>
              <p className="text-sm font-black tracking-tight text-white/60">
                {formatCurrency(totalTarget, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <Plus size={16} className="text-danger rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Falta</span>
              <p className="text-sm font-black tracking-tight text-danger">
                {formatCurrency(Math.max(0, totalTarget - totalSaved), currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-48 bg-white/5 rounded-3xl" />
          <div className="h-48 bg-white/5 rounded-3xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6 mt-8">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={setModalGoal} onDelete={(id) => setDeleteModal({ isOpen: true, id })} />
          ))}

          {goals.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/20">
                <Target size={32} />
              </div>
              <p className="text-white/40 text-sm">Nenhuma meta definida ainda.</p>
              <Button variant="light" color="primary" className="mt-4" onPress={() => setModalGoal(null)}>Clique para adicionar</Button>
            </div>
          )}
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed right-5 bottom-[180px] md:bottom-28 z-40 flex flex-col gap-4 animate-slide-up">
        <button
          onClick={() => setModalGoal(null)}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-[3px] border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Nova Meta"
        >
          <Target size={24} className="text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>

      {modalGoal !== undefined && (
        <GoalModal isOpen={true} goal={modalGoal} onClose={() => setModalGoal(undefined)} />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(deleteModal.id)}
        isLoading={deleteMutation.isPending}
        title="Excluir Meta Financeira?"
        message="Esta ação irá remover permanentemente a meta e todo o histórico de progresso associado a ela. Esta ação não pode ser desfeita."
      />
    </div>
  );
}
