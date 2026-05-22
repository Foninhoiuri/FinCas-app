import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, X, Check, MoreVertical, Trash2, Edit2, Wallet, ArrowUpRight, ArrowDownRight, Landmark as LandmarkIcon, Calendar, Lock, ShoppingBag, Receipt } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ConnectionStatus from '../components/ConnectionStatus';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { Card, CardBody, CardHeader, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip, Progress, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from "@heroui/react";
import PageHeader from '../components/PageHeader';
import MonthPicker from '../components/MonthPicker';
import ManageBanksModal from '../components/ManageBanksModal';
import PurchaseModal from '../components/PurchaseModal';
import InvoiceModal from '../components/InvoiceModal';
import { useNavigate, useSearchParams } from 'react-router-dom';

const IconMap = {
  landmark: LandmarkIcon,
  wallet: Wallet,
  creditcard: CreditCard,
};

function DynamicIcon({ name, ...props }) {
  if (!name) return <CreditCard {...props} />;

  const lowerName = String(name).toLowerCase().trim();

  // Map common names to components
  const Icon = IconMap[lowerName];
  if (Icon) return <Icon {...props} />;

  // Special case for 'landmark' if not in IconMap or just double-check
  if (lowerName === 'landmark') return <LandmarkIcon {...props} />;

  // If it looks like a single emoji or short text, render as span
  if (name.length <= 4) {
    return <span className="text-2xl" style={props.style}>{name}</span>;
  }

  // Fallback
  return <CreditCard {...props} />;
}

import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

// Helper moved inside component

const PRESET_COLORS = [
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Verde', hex: '#10b981' },
  { name: 'Amarelo', hex: '#f59e0b' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Indigo', hex: '#6366f1' },
];

function CardModal({ isOpen, onClose, card }) {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    card_name: card?.card_name || '',
    card_brand: card?.card_brand || '',
    credit_limit: card ? formatCurrencyInput(card.credit_limit) : '',
    closing_day: card?.closing_day || '',
    due_day: card?.due_day || '',
    color: card?.color || '#3b82f6',
    is_shared: card?.is_shared ?? true,
    bank_id: card?.bank_id || '',
  });

  const { user, currency, currencySymbol } = useAuth();
  const queryClient = useQueryClient();

  const { data: banks = [] } = useQuery({
    queryKey: ['banks'],
    queryFn: () => api.getBanks({}),
    enabled: isOpen
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        user_id: user?.id,
        credit_limit: parseCurrencyInput(data.credit_limit),
        bank_id: data.bank_id ? Number(data.bank_id) : null
      };
      return card ? api.updateCard(card.id, payload) : api.createCard(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Erro ao salvar cartão');
      setTimeout(() => setError(''), 5000);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-center"
      backdrop="blur"
      classNames={{
        base: "bg-surface-900 sm:rounded-[32px] border-t border-white/10",
        closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white">{card ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Cartão de Crédito</p>
        </ModalHeader>
        <ModalBody className="py-6 gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome do Cartão"
              placeholder="Ex: Nubank, Inter..."
              variant="flat" labelPlacement="outside"
              value={formData.card_name}
              onValueChange={v => setFormData({ ...formData, card_name: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-bold px-1">Banco Associado (Opcional)</label>
              <select
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white text-sm px-4 focus:outline-none focus:border-accent/40"
                value={formData.bank_id}
                onChange={e => setFormData({ ...formData, bank_id: e.target.value })}
              >
                <option value="">Nenhum</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bandeira"
              placeholder="Ex: Mastercard"
              variant="flat" labelPlacement="outside"
              value={formData.card_brand}
              onValueChange={v => setFormData({ ...formData, card_brand: v })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }}
            />
            <Input
              label="Limite"
              placeholder="0,00"
              variant="flat" labelPlacement="outside"
              inputMode="decimal"
              value={formData.credit_limit}
              onValueChange={v => setFormData({ ...formData, credit_limit: formatCurrencyInput(v) })}
              startContent={<span className="text-white/20 text-xs">{currencySymbol}</span>}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number" label="Dia Fechamento"
              variant="flat" labelPlacement="outside"
              inputMode="numeric"
              min={1} max={31}
              value={formData.closing_day}
              onValueChange={v => setFormData({ ...formData, closing_day: v > 31 ? 31 : (v < 1 ? '' : v) })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
            <Input
              type="number" label="Dia Vencimento"
              variant="flat" labelPlacement="outside"
              inputMode="numeric"
              min={1} max={31}
              value={formData.due_day}
              onValueChange={v => setFormData({ ...formData, due_day: v > 31 ? 31 : (v < 1 ? '' : v) })}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-white/30 uppercase font-bold px-1">Cor do Cartão</label>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setFormData({ ...formData, color: c.hex })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.is_shared ? 'bg-accent/10 text-accent-light' : 'bg-white/5 text-white/20'}`}>
                <CreditCard size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-tighter">Cartão Compartilhado</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Visível para todos da casa</p>
              </div>
            </div>
            <Switch isSelected={formData.is_shared} onValueChange={v => setFormData({ ...formData, is_shared: v })} color="primary" size="sm" />
          </div>
          {error && (
            <p className="text-danger text-[10px] uppercase font-black text-center animate-pulse">
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button fullWidth className="bg-accent text-black font-black uppercase tracking-widest h-12 rounded-2xl shadow-xl shadow-accent/20" onPress={() => mutation.mutate(formData)} isLoading={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar Cartão'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function CardItem({ card, onEdit, onDelete, onInvoice, onHistory }) {
  const { currency, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const limit = Number(card.credit_limit);
  const used = Number(card.total_used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return (
    <Card
      tabIndex={0}
      className="bg-transparent shadow-none border-none overflow-visible group transition-all duration-500 hover:-translate-y-1 focus:outline-none focus:scale-[1.02] active:scale-[0.98] cursor-pointer"
      style={{
        '--card-shadow': `${card.color || '#c6f150'}`,
        '--card-glow': `${card.color || '#c6f150'}40`
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onHistory(card);
      }}
      onClick={() => onHistory(card)}
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
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-all">
                <DynamicIcon name={card.bank_icon || 'creditcard'} size={24} style={{ color: card.color || '#c6f150' }} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tighter text-white leading-none">
                  {card.card_name}
                </h3>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1.5">
                  {card.bank_name || 'Banco'}
                </p>
              </div>
            </div>

            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm" className="text-white/20 hover:text-white h-8 w-8 bg-transparent hover:bg-white/5 border-none shadow-none">
                  <MoreVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Ações"
                className="bg-surface-800 border border-white/10 rounded-xl"
                onAction={(key) => key === 'edit' ? onEdit(card) : onDelete(card.id)}
              >
                <DropdownItem key="edit" startContent={<Edit2 size={14} />}>Editar</DropdownItem>
                <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={14} />}>Apagar</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>

          <div className="space-y-4">
            {/* Resumo de Limites */}
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Limite Utilizado</p>
                <p className="text-xl font-black tracking-tighter text-white">
                  {formatCurrency(used)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Total</p>
                <p className="text-base font-bold text-white/60">{formatCurrency(limit)}</p>
              </div>
            </div>

            {/* Barra de Limite com Alerta de Cor */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-white/40">Disponível: {formatCurrency(limit - used)}</span>
                <span className={percentage > 85 ? 'text-danger animate-pulse' : 'text-accent'}>
                  {Math.round(percentage)}%
                </span>
              </div>
              <Progress
                value={percentage}
                aria-label={`Limite utilizado do cartão ${card.card_name}`}
                className="h-2 rounded-full"
                classNames={{
                  indicator: percentage > 85 ? 'bg-danger' : 'bg-accent shadow-[0_0_20px_rgba(198,241,80,0.6)]'
                }}
              />
            </div>

            {/* Datas de Fechamento/Vencimento */}
            <div className="flex gap-4 pt-4 border-t border-white/5">
              <div className="flex-1 flex items-center gap-2">
                <Calendar size={14} className="text-white/20" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Fecha dia {card.closing_day}
                </span>
              </div>
              <div className="flex-1 flex items-center gap-2 justify-end">
                <Lock size={14} className="text-white/20" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Vence dia {card.due_day}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                fullWidth
                size="sm"
                variant="flat"
                className="bg-white/5 text-white/40 font-black uppercase tracking-widest text-[9px] h-10 rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                onPress={() => onInvoice(card)}
              >
                Pagar Fatura
              </Button>
              <Button
                fullWidth
                size="sm"
                variant="flat"
                className="bg-white/5 text-white/40 font-black uppercase tracking-widest text-[9px] h-10 rounded-2xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                onPress={() => onHistory(card)}
              >
                Histórico
              </Button>
            </div>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}

export default function CreditCards() {
  const { user, currency, currencySymbol, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const navigate = useNavigate();
  const { openAddModal } = useModals();
  const queryClient = useQueryClient();
  const [modalCard, setModalCard] = useState(undefined);
  const [showBanks, setShowBanks] = useState(false);
  const [purchaseCard, setPurchaseCard] = useState(null);
  const [invoiceCard, setInvoiceCard] = useState(null);
  const [invoiceTab, setInvoiceTab] = useState('invoice');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const [searchParams] = useSearchParams();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = searchParams.get('month') || nowStr;

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards', currentMonth],
    queryFn: () => api.getCards({ user_id: user?.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setDeleteModal({ isOpen: false, id: null });
    },
    onError: (err) => {
      alert(`Não foi possível apagar o cartão: ${err.message}. Verifique se existem compras ou transações vinculadas a ele.`);
    }
  });

  const totalUsed = useMemo(() => cards.reduce((a, c) => a + Number(c.total_used), 0), [cards]);
  const totalLimit = useMemo(() => (cards || []).reduce((acc, c) => acc + Number(c.credit_limit || 0), 0), [cards]);

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <div className="space-y-4 mb-8">
        <PageHeader
          title="Cartões"
          icon={CreditCard}
        >
          <MonthPicker currentMonth={currentMonth} onChange={(m) => navigate(`/cards?month=${m}`)} />
        </PageHeader>

        {/* RESUMO INTEGRADO */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-1 pt-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <CreditCard size={16} className="text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Limite Total</span>
              <p className="text-sm font-black tracking-tight text-white">
                {formatCurrency(totalLimit, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <ArrowDownRight size={16} className="text-danger" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Utilizado</span>
              <p className="text-sm font-black tracking-tight text-danger">
                {formatCurrency(totalUsed, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Check size={16} className="text-success" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Disponível</span>
              <p className="text-sm font-black tracking-tight text-success">
                {formatCurrency(totalLimit - totalUsed, currency)}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 mt-8">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onEdit={setModalCard} onDelete={(id) => setDeleteModal({ isOpen: true, id })} onInvoice={(c) => { setInvoiceTab('invoice'); setInvoiceCard(c); }} onHistory={(c) => { setInvoiceTab('history'); setInvoiceCard(c); }} />
          ))}

          {cards.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/20">
                <CreditCard size={32} />
              </div>
              <p className="text-white/40 text-sm">Nenhum cartão cadastrado ainda.</p>
              <Button variant="light" color="primary" className="mt-4" onPress={() => setModalCard(null)}>Clique para adicionar</Button>
            </div>
          )}
        </div>
      )}

      {/* Floating Buttons Grid - Auxiliares */}
      <div className="fixed right-5 bottom-[180px] md:bottom-28 z-40 flex flex-col gap-4 animate-slide-up">
        <button
          onClick={() => setShowBanks(true)}
          className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-[3px] border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Bancos"
        >
          <LandmarkIcon size={20} className="text-white/40 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={() => setModalCard(null)}
          className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-[3px] border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 group"
          title="Novo Cartão"
        >
          <CreditCard size={20} className="text-white/40 group-hover:text-white transition-colors" />
        </button>
      </div>

      <ManageBanksModal
        isOpen={showBanks}
        onClose={() => setShowBanks(false)}
        userId={user?.id}
      />

      {modalCard !== undefined && (
        <CardModal isOpen={true} card={modalCard} onClose={() => setModalCard(undefined)} />
      )}

      {purchaseCard && (
        <PurchaseModal isOpen={true} card={purchaseCard} onClose={() => setPurchaseCard(null)} />
      )}

      {invoiceCard && (
        <InvoiceModal isOpen={true} card={invoiceCard} month={currentMonth} initialTab={invoiceTab} onClose={() => setInvoiceCard(null)} />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={() => deleteMutation.mutate(deleteModal.id)}
        isLoading={deleteMutation.isPending}
        title="Excluir Cartão de Crédito?"
        message="Esta ação irá remover permanentemente o cartão e todos os registros de compras associados a ele. Esta ação não pode ser desfeita."
      />
    </div>
  );
}
