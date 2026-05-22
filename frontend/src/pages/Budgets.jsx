import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Gauge, Plus, MoreVertical, Trash2, Edit2, TrendingUp, TrendingDown,
  AlertTriangle, X, Flame, Calendar, ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { useModals } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import {
  Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Input, Progress, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Select, SelectItem, Popover, PopoverTrigger, PopoverContent, Switch, Checkbox
} from "@heroui/react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import PageHeader from '../components/PageHeader';
import MonthPicker from '../components/MonthPicker';

import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

// Helper moved inside components

// ─── Budget Modal ─────────────────────────────────────────────
function BudgetModal({ isOpen, onClose, budget }) {
  const { user, currency, currencySymbol } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });
  const { data: cards = [] } = useQuery({ queryKey: ['cards'], queryFn: () => api.getCards({ user_id: user?.id }) });
  const { data: banks = [] } = useQuery({ queryKey: ['banks'], queryFn: () => api.getBanks({ user_id: user?.id }) });

  const [formData, setFormData] = useState({
    title: '', icon: '📊', color: '#fbbf24',
    budget_limit: '', budget_type: 'category', period: 'monthly', visibility: 'shared',
  });
  const [selectedRules, setSelectedRules] = useState([]);

  useEffect(() => {
    if (budget && isOpen) {
      setFormData({
        title: budget.title || '',
        icon: budget.icon || '📊',
        color: budget.color || '#fbbf24',
        budget_limit: formatCurrencyInput(Math.round(Number(budget.budget_limit) * 100), currency),
        budget_type: budget.budget_type || 'category',
        period: budget.period || 'monthly',
        visibility: budget.visibility || 'shared',
      });
      setSelectedRules((budget.rules || []).map(r => r.rule_value));
    } else if (isOpen) {
      setFormData({
        title: '', icon: '📊', color: '#fbbf24',
        budget_limit: '', budget_type: 'category', period: 'monthly', visibility: 'shared',
      });
      setSelectedRules([]);
    }
  }, [budget, isOpen, currency]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const rules = selectedRules.map(val => ({
        rule_type: data.budget_type,
        rule_value: val,
      }));
      const payload = {
        ...data,
        user_id: user?.id,
        budget_limit: parseCurrencyInput(data.budget_limit) || 0,
        rules,
      };
      return budget ? api.updateBudget(budget.id, payload) : api.createBudget(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    }
  });

  const ruleOptions = useMemo(() => {
    if (formData.budget_type === 'category') {
      return categories.filter(c => c.type === 'expense').map(c => ({ value: String(c.id), label: `${c.icon || '📦'} ${c.name}` }));
    }
    if (formData.budget_type === 'card') {
      return cards.map(c => ({ value: c.id, label: `💳 ${c.card_name}` }));
    }
    if (formData.budget_type === 'bank') {
      return banks.map(b => ({ value: String(b.id), label: `🏦 ${b.name}` }));
    }
    return [];
  }, [formData.budget_type, categories, cards, banks]);

  const toggleRule = (val) => {
    setSelectedRules(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      placement="bottom-center" backdrop="blur" scrollBehavior="inside"
      classNames={{
        base: "bg-surface-900 sm:rounded-3xl border-t border-white/10",
        closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white">{budget ? 'Editar Limite' : 'Novo Limite'}</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Rastreador de Gastos</p>
        </ModalHeader>
        <ModalBody className="py-6 gap-4">
          <Input
            label="Nome do Limite" placeholder="Ex: Custo de Vida, Lazer..."
            variant="flat" labelPlacement="outside"
            value={formData.title} onValueChange={v => setFormData({ ...formData, title: v })}
            classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Limite Mensal" placeholder="0,00"
              variant="flat" labelPlacement="outside" value={formData.budget_limit}
              onValueChange={v => setFormData({ ...formData, budget_limit: formatCurrencyInput(v, currency) })}
              startContent={<span className="text-white/20 text-xs">{currencySymbol}</span>}
              inputMode="decimal"
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-bold px-1">Ícone</label>
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <button className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 transition-colors">
                    {formData.icon || '📊'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(e) => setFormData({ ...formData, icon: e.emoji })}
                    lazyLoadEmojis={true} skinTonesDisabled
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Budget Type Selection */}
          <div className="space-y-2">
            <label className="text-[10px] text-white/30 uppercase font-bold px-1">O que alimenta este limite?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'category', label: 'Categorias', icon: '📂' },
                { value: 'card', label: 'Cartão', icon: '💳' },
                { value: 'bank', label: 'Banco', icon: '🏦' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFormData({ ...formData, budget_type: opt.value }); setSelectedRules([]); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${formData.budget_type === opt.value
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rules Selection */}
          {formData.budget_type !== 'free' && ruleOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase font-bold px-1">
                Selecione {formData.budget_type === 'category' ? 'as categorias' : formData.budget_type === 'card' ? 'os cartões' : 'os bancos'}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {ruleOptions.map(opt => {
                  const isSelected = selectedRules.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleRule(opt.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-sm ${isSelected
                          ? 'bg-accent/10 border-accent/30 text-white'
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-accent border-accent' : 'border-white/20'
                        }`}>
                        {isSelected && <span className="text-black text-[10px] font-black">✓</span>}
                      </div>
                      <span className="truncate text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.visibility === 'shared' ? 'bg-accent/10 text-accent-light' : 'bg-white/5 text-white/20'}`}>
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">Limite Coletivo</p>
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
          <Button
            fullWidth
            className="bg-accent text-black font-black uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-accent/20"
            onPress={() => mutation.mutate(formData)}
            isLoading={mutation.isPending}
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar Limite'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─── Budget Card ──────────────────────────────────────────────
function BudgetCard({ budget, onEdit, onDelete }) {
  const { currency, currencySymbol } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const spent = Number(budget.spent || 0);
  const limit = Number(budget.budget_limit || 0);
  const remaining = Number(budget.remaining || 0);
  const pct = Number(budget.percentage || 0);
  const perDay = Number(budget.per_day || 0);
  const daysLeft = Number(budget.days_left || 0);

  const getBarColor = () => {
    if (pct >= 100) return 'bg-danger shadow-[0_0_20px_rgba(248,113,113,0.6)] animate-pulse';
    if (pct >= 75) return 'bg-warning shadow-[0_0_15px_rgba(245,158,11,0.4)]';
    return 'bg-accent shadow-[0_0_15px_rgba(198,241,80,0.4)]';
  };

  const getTextColor = () => {
    if (pct >= 100) return 'text-danger';
    if (pct >= 75) return 'text-warning';
    return 'text-accent';
  };

  const rulesLabel = (budget.rules || []).map(r => {
    if (r.rule_type === 'category') return r.rule_value;
    if (r.rule_type === 'card') return '💳';
    if (r.rule_type === 'bank') return '🏦';
    return r.rule_value;
  }).join(', ');

  return (
    <Card
      className="bg-transparent shadow-none border-none overflow-visible group transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] cursor-pointer animate-slide-up"
      style={{ '--card-shadow': budget.color || '#c6f150', '--card-glow': `${budget.color || '#c6f150'}40` }}
    >
      <div className="w-full h-full rounded-[40px] overflow-hidden bg-surface-900 border border-white/10 relative shadow-2xl">
        {/* Glow */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-25"
          style={{ backgroundColor: budget.color && budget.color !== '#c6f150' ? budget.color : '#fbbf24' }}
        />

        <CardBody className="p-5 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-2xl border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all"
                style={{ backgroundColor: `${budget.color || '#c6f150'}15` }}
              >
                <span>{budget.icon || '📊'}</span>
              </div>
              <div>
                <h3 className="text-base font-black tracking-tighter text-white truncate max-w-[150px]">
                  {budget.title}
                </h3>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-0.5">
                  {budget.budget_type === 'category' ? 'Por Categorias' : budget.budget_type === 'card' ? 'Por Cartão' : budget.budget_type === 'bank' ? 'Por Banco' : 'Livre'}
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
                aria-label="Ações" className="bg-surface-800 border border-white/10 rounded-xl"
                onAction={(key) => key === 'edit' ? onEdit(budget) : onDelete(budget.id)}
              >
                <DropdownItem key="edit" startContent={<Edit2 size={14} />}>Editar</DropdownItem>
                <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={14} />}>Apagar</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          {/* Values */}
          <div className="flex justify-between items-end mb-4">
            <div className="space-y-1">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Gasto</p>
              <p className={`text-xl font-black tracking-tighter ${getTextColor()}`}>
                {formatCurrency(spent, currency)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Limite</p>
              <p className="text-base font-bold text-white/60">
                {formatCurrency(limit, currency)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
              <span className="text-white/40">
                {pct >= 100 ? '⚠️ Estourado!' : `Resta: ${formatCurrency(remaining, currency)}`}
              </span>
              <span className={getTextColor()}>{Math.min(pct, 999)}%</span>
            </div>
            <Progress
              value={Math.min(pct, 100)}
              aria-label={`Progresso do limite ${budget.title}`}
              className="h-2.5 rounded-full"
              classNames={{ indicator: getBarColor() }}
            />
          </div>

          {/* Per Day */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2">
              <Flame size={14} className={getTextColor()} />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Pode gastar/dia</span>
            </div>
            <span className={`text-sm font-black tracking-tight ${getTextColor()}`}>
              {pct >= 100 ? `${currencySymbol} 0` : formatCurrency(perDay, currency)}
            </span>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Budgets() {
  const { user, currency, currencySymbol } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const { openAddModal } = useModals();
  const qc = useQueryClient();
  const [modalBudget, setModalBudget] = useState(undefined);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedMonth = searchParams.get('month') || nowStr;

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', selectedMonth],
    queryFn: () => api.getBudgets({ user_id: user?.id, month: selectedMonth }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteModal({ isOpen: false, id: null });
    },
  });

  const totalLimit = budgets.reduce((acc, b) => acc + Number(b.budget_limit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + Number(b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const healthLabel = totalPct >= 100 ? 'Crítico' : totalPct >= 80 ? 'Atenção' : totalPct >= 50 ? 'Moderado' : 'Saudável';
  const healthColor = totalPct >= 100 ? 'text-danger' : totalPct >= 80 ? 'text-warning' : totalPct >= 50 ? 'text-accent' : 'text-success';

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="space-y-4 mb-8">
        <PageHeader title="Limites" icon={Gauge}>
          <MonthPicker currentMonth={selectedMonth} onChange={(m) => navigate(`/budgets?month=${m}`)} />
        </PageHeader>

        {/* Master Budget Summary */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-1 pt-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-danger" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Comprometido</span>
              <p className="text-sm font-black tracking-tight text-danger">
                {formatCurrency(totalSpent, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Gauge size={16} className="text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Total de Limites</span>
              <p className="text-sm font-black tracking-tight text-white/60">
                {formatCurrency(totalLimit, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${totalPct >= 80 ? 'bg-danger/10' : 'bg-success/10'}`}>
              <ShieldAlert size={16} className={healthColor} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Saúde</span>
              <p className={`text-sm font-black tracking-tight ${healthColor}`}>
                {healthLabel}
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
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={setModalBudget}
              onDelete={(id) => setDeleteModal({ isOpen: true, id })}
            />
          ))}

          {budgets.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/20">
                <Gauge size={32} />
              </div>
              <p className="text-white/40 text-sm">Nenhum limite definido ainda.</p>
              <Button variant="light" color="primary" className="mt-4" onPress={() => setModalBudget(null)}>Clique para adicionar</Button>
            </div>
          )}
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed right-5 bottom-[180px] md:bottom-28 z-40 flex flex-col gap-4 animate-slide-up">
        <button
          onClick={() => setModalBudget(null)}
          className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-[3px] border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Novo Limite"
        >
          <Gauge size={24} className="text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>

      {modalBudget !== undefined && (
        <BudgetModal isOpen={true} budget={modalBudget} onClose={() => setModalBudget(undefined)} />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(deleteModal.id)}
        isLoading={deleteMutation.isPending}
        title="Excluir Limite de Gastos?"
        message="Esta ação irá remover permanentemente o planejamento de limite para este grupo. O histórico de gastos não será afetado, mas o monitoramento deste limite será removido."
      />
    </div>
  );
}
