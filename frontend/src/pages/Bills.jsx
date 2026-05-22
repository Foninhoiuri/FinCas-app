import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Zap, Droplets, Smartphone, Wifi, CheckCircle2, 
  Clock, AlertTriangle, Receipt, MoreVertical, 
  Edit2, Trash2, Calendar, Wallet, ArrowRight, Plus, History,
  ArrowUp, ArrowDown, CreditCard
} from 'lucide-react';
import { api } from '../api/client';
import { useModals } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { Card, CardBody, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Chip, Progress, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import PageHeader from '../components/PageHeader';
import MonthPicker from '../components/MonthPicker';

import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

// Helper moved inside component

function formatDate(d) {
  if (!d) return '--/--';
  try {
    const date = new Date(d.includes('T') ? d : d + 'T12:00:00');
    if (isNaN(date.getTime())) return '--/--';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '--/--';
  }
}

const serviceIcons = { 
  Salário: Wallet, Pix: ArrowRight, Dividendos: ArrowRight,
  CPFL: Zap, Energia: Zap, 
  Água: Droplets, Sabesp: Droplets, 
  Celular: Smartphone, Vivo: Smartphone, Claro: Smartphone, 
  Internet: Wifi 
};

function getIcon(name) {
  for (const [k, I] of Object.entries(serviceIcons)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return I;
  }
  return Receipt;
}

const statusCfg = {
  paid:    { label: 'Pago',     icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  received: { label: 'Recebido', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  pending: { label: 'Pendente', icon: Clock,        color: 'text-warning', bg: 'bg-warning/10' },
  overdue: { label: 'Atrasado', icon: AlertTriangle, color: 'text-danger',  bg: 'bg-danger/10'  },
};

function getDayLabel(dateStr) {
  if (!dateStr) return '';
  const dateOnly = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const today = new Date().toISOString().slice(0, 10);
  
  if (dateOnly === today) return 'Hoje';
  
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = yesterdayObj.toISOString().slice(0, 10);
  if (dateOnly === yesterday) return 'Ontem';
  
  const d = new Date(dateOnly + 'T12:00:00');
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7 && diffDays >= 0) {
    return d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  }
  
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function BillCard({ bill, onToggle, onEdit, onDelete }) {
  const { currency, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const isIncome = bill.type === 'income';
  const Icon = getIcon(bill.service_name);
  const isPaid = bill.status === 'paid' || bill.status === 'received';
  const isExpense = bill.type === 'expense';
  
  const bgClass = isPaid 
    ? (isExpense ? 'bg-danger/5 border-danger/10 hover:bg-danger/20' : 'bg-success/5 border-success/10 hover:bg-success/20')
    : 'bg-white/5 border-white/5 hover:bg-white/10';

  const iconColor = isPaid 
    ? (isExpense ? 'text-danger' : 'text-success')
    : 'text-white/20';

  return (
    <div 
      className={`group flex items-center gap-4 p-4 rounded-2xl transition-all animate-slide-up border ${bgClass} cursor-pointer active:scale-[0.98]`}
      onClick={() => onEdit(bill)}
    >
      <div className="relative">
        <div 
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
            isPaid 
              ? (isExpense ? 'bg-danger/20 text-danger shadow-inner' : 'bg-success/20 text-success shadow-inner')
              : 'bg-white/10 text-white/20'
          }`}
        >
          <Icon size={20} className={iconColor} />
        </div>
        {bill.user_avatar && (
          <img 
            src={bill.user_avatar} 
            alt="User" 
            className="w-5 h-5 rounded-full absolute -bottom-1 -left-1 border border-surface-900 object-cover"
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-black truncate tracking-tight ${isPaid ? 'text-white/90' : 'text-white/40'}`}>
            {bill.service_name}
          </p>
          {bill.isRecurring && (
             <div className="w-1 h-1 rounded-full bg-accent animate-pulse shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'text-white/40' : 'text-white/20'}`}>
            {isIncome ? 'Receita' : (bill.category_name || 'Conta')}
          </span>
          <span className="text-[9px] text-white/10">•</span>
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold truncate">
             {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-2">
        <p className={`text-sm sm:text-base font-black tracking-tighter ${isIncome ? 'text-success' : (isPaid ? 'text-white/90' : 'text-danger')}`}>
          {isIncome ? '+' : '-'}{formatCurrencyUtil(bill.amount, currency)}
        </p>
        <div className="flex items-center gap-2">
          {bill.payment_method && (
            <Chip
              size="sm"
              variant="flat"
              className={`h-5 px-2 text-[8px] font-black uppercase tracking-widest ${
                bill.payment_method === 'pix' ? 'bg-success/10 text-success' :
                bill.payment_method === 'credit' ? 'bg-warning/10 text-warning' :
                bill.payment_method === 'debit' ? 'bg-primary/10 text-primary' :
                'bg-white/10 text-white/40'
              }`}
            >
              {bill.payment_method === 'pix' ? 'PIX' :
               bill.payment_method === 'credit' ? 'Crédito' :
               bill.payment_method === 'debit' ? 'Débito' :
               bill.payment_method === 'cash' ? 'Dinheiro' :
               bill.payment_method === 'transfer' ? 'Transf.' : bill.payment_method}
            </Chip>
          )}
          <Chip 
            size="sm" 
            variant="flat" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(bill);
            }}
            className={`h-5 px-2 text-[8px] font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all ${
              isPaid 
                ? (isIncome ? 'bg-success/20 text-success' : 'bg-white/10 text-white/40') 
                : 'bg-danger/20 text-danger border border-danger/20'
            }`}
            startContent={isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
          >
            {isPaid ? (isIncome ? 'Recebido' : 'Pago') : 'Pendente'}
          </Chip>
          
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <MoreVertical size={14} className="text-white/20" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu 
              aria-label="Ações" 
              className="bg-surface-800 border border-white/10 rounded-xl"
              onAction={(key) => {
                if (key === 'edit') onEdit(bill);
                else onDelete(bill.id, bill);
              }}
            >
              <DropdownItem key="edit" startContent={<Edit2 size={12} />}>Editar</DropdownItem>
              <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={12} />}>Apagar</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export default function Bills() {
  const { user, currency, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { openAddModal, confirmPaid } = useModals();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = searchParams.get('month') || nowStr;
  
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, scope: 'single' });

  // 1. Faturas Manuais (Luz, Água, etc)
  const { data: rawBills = [], isLoading: loadingBills } = useQuery({ 
    queryKey: ['bills', currentMonth], 
    queryFn: () => api.getBills({ user_id: user?.id }), 
  });

  const bills = useMemo(() => rawBills.map(b => ({ ...b, _type: 'bill' })), [rawBills]);

  // 2. Transações do Mês
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', currentMonth],
    queryFn: () => api.getTransactions({ month: currentMonth, user_id: user?.id }),
  });

  // 3. Recorrentes do Mês
  const { data: recurring = [], isLoading: loadingRecurring } = useQuery({
    queryKey: ['recurring', currentMonth],
    queryFn: () => api.getRecurringMonth(currentMonth, { user_id: user?.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type, month, scope }) => {
      if (type === 'bill') return api.deleteBill(id);
      if (type === 'transaction') return api.deleteTransaction(id, { scope });
      if (type === 'recurring') return api.deleteRecurring(id, 'all', month);
      return Promise.reject(new Error('Tipo desconhecido'));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['recurring'] });
      setDeleteModal({ isOpen: false, item: null, scope: 'single' });
    },
  });

  const isLoading = loadingBills || loadingTransactions || loadingRecurring;

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.getBudgets({ user_id: user?.id })
  });

  const mappedTransactions = useMemo(() => {
    return transactions
      // Filtra apenas "Pagamento de Fatura" (transfer) que já está contabilizado nas parcelas
      .filter(t => t.payment_method !== 'transfer')
      .map(t => {
        const dateMonth = t.date ? t.date.slice(0, 7) : '';
        const accMonth = t.accounting_date ? t.accounting_date.slice(0, 7) : dateMonth;

        const isGreyedOut = dateMonth === currentMonth && accMonth > currentMonth;
        const isClone = accMonth === currentMonth && dateMonth < currentMonth;

        return {
          ...t,
          id: t.id,
          _type: 'transaction',
          service_name: t.description,
          amount: t.amount,
          due_date: t.date,
          type: t.type,
          status: t.is_paid ? 'paid' : 'pending',
          budget_name: budgets.find(b => b.id === t.budget_id)?.name,
          isTransaction: true,
          isGreyedOut,
          isClone,
          originalDate: t.date,
          isCardPurchase: !!t.is_direct_card_purchase,
        };
      });
  }, [transactions, budgets, currentMonth]);

  const mappedRecurring = useMemo(() => {
    return recurring
      .filter(r => !transactions.some(t => t.recurring_id === r.id))
      .map(r => ({
        ...r,
        id: r.id,
        _type: 'recurring',
        service_name: r.description,
        amount: r.amount,
        due_date: `${currentMonth}-${String(r.day_of_month).padStart(2, '0')}`,
        type: r.type,
        status: 'pending',
        isRecurring: true
      }));
  }, [recurring, transactions, currentMonth]);

  const allItems = useMemo(() => {
    return [...bills, ...mappedTransactions, ...mappedRecurring]
      .map(i => {
        const dateStr = i.due_date || i.date || i.created_at?.slice(0, 10);
        const timeStr = i.time || '00:00:00';
        return { ...i, _sortKey: `${dateStr}T${timeStr}` };
      })
      .sort((a, b) => b._sortKey.localeCompare(a._sortKey));
  }, [bills, mappedTransactions, mappedRecurring]);

  const expenses = allItems.filter(i => i.type === 'expense');
  const incomes = allItems.filter(i => i.type === 'income');
  
  const pending = expenses.filter((b) => b.status !== 'paid' && !b.isGreyedOut);
  const paid = expenses.filter((b) => b.status === 'paid' && !b.isGreyedOut);
  const received = incomes.filter((b) => b.status === 'paid' && !b.isGreyedOut);
  
  const totalPending = pending.reduce((a, b) => a + Number(b.amount), 0);
  const totalPaid = paid.reduce((a, b) => a + Number(b.amount), 0);
  const totalIncome = incomes.filter(i => !i.isGreyedOut).reduce((a, b) => a + Number(b.amount), 0);
  const totalReceived = received.reduce((a, b) => a + Number(b.amount), 0);
  
  const totalExpenses = totalPending + totalPaid;
  const totalIncomes = totalIncome; 
  
  // Para despesas: se houver pendência, o máximo é 99%
  let paidPct = totalExpenses > 0 ? (totalPaid / totalExpenses) * 100 : 0;
  if (totalPending > 0 && paidPct >= 100) paidPct = 99.9;
  
  // Para receitas: se houver pendência (totalIncome > totalReceived), o máximo é 99%
  let receivedPct = totalIncomes > 0 ? (totalReceived / totalIncomes) * 100 : 0;
  const totalPendingIncome = totalIncomes - totalReceived;
  if (totalPendingIncome > 0 && receivedPct >= 100) receivedPct = 99.9;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* 1. HEADER COM RESUMO INTEGRADO */}
      <div className="space-y-4">
        <PageHeader 
          title="Contas"
        >
          <MonthPicker currentMonth={currentMonth} onChange={(m) => navigate(`/bills?month=${m}`)} />
        </PageHeader>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-1 pt-0 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <ArrowUp size={16} className="text-success" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Entradas</span>
              <p className="text-sm font-black tracking-tight text-success">
                {formatCurrency(totalIncomes, currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <ArrowDown size={16} className="text-danger" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">Saídas</span>
              <p className="text-sm font-black tracking-tight text-danger">
                {formatCurrency(totalExpenses, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROGRESSO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pagamentos */}
        <Card 
          className="bg-transparent shadow-none border-none overflow-visible group transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
          style={{ '--card-shadow': 'rgba(248, 113, 113, 0.4)' }}
        >

          <div className="w-full h-full rounded-[40px] overflow-hidden bg-surface-900 border border-white/10 relative shadow-2xl min-h-[160px] flex flex-col justify-center">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-20 bg-danger" />
            
            <CardBody className="p-6 relative z-10 h-full">
              <div className="flex flex-col justify-between h-full min-h-[120px]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Pagamentos</p>
                    <Chip size="sm" variant="flat" className="bg-danger/10 text-danger font-black uppercase text-[8px] h-5 px-2 border-none">
                      {pending.length} Pendentes
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <p className="text-xl font-black text-white tracking-tighter">
                      {formatCurrency(totalPaid, currency)}
                    </p>
                    <div className="flex flex-col items-end">
                      <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Total</p>
                      <p className="text-[11px] font-bold text-white/60 tracking-tight">
                        {formatCurrency(totalExpenses, currency)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">Pagos</span>
                    <p className="text-xs font-black text-danger tracking-widest">{Math.floor(paidPct)}%</p>
                  </div>
                  <Progress 
                    value={paidPct} 
                    aria-label="Progresso de pagamentos"
                    className="h-2 rounded-full"
                    classNames={{ indicator: "bg-danger shadow-[0_0_20px_rgba(248,113,113,0.5)]" }}
                  />
                </div>
              </div>
            </CardBody>
          </div>
        </Card>

        {/* Recebimentos */}
        <Card 
          className="bg-transparent shadow-none border-none overflow-visible group transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
          style={{ '--card-shadow': 'rgba(52, 211, 153, 0.4)' }}
        >

          <div className="w-full h-full rounded-[40px] overflow-hidden bg-surface-900 border border-white/10 relative shadow-2xl min-h-[160px] flex flex-col justify-center">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-20 bg-success" />
            
            <CardBody className="p-6 relative z-10 h-full">
              <div className="flex flex-col justify-between h-full min-h-[120px]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Recebimentos</p>
                    <Chip size="sm" variant="flat" className="bg-success/10 text-success font-black uppercase text-[8px] h-5 px-2 border-none">
                      {incomes.filter(i => i.status !== 'paid').length} Pendentes
                    </Chip>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <p className="text-xl font-black text-white tracking-tighter">
                      {formatCurrency(totalReceived, currency)}
                    </p>
                    <div className="flex flex-col items-end">
                      <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Total</p>
                      <p className="text-[11px] font-bold text-white/60 tracking-tight">
                        {formatCurrency(totalIncomes, currency)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">Recebido</span>
                    <p className="text-xs font-black text-success tracking-widest">{Math.floor(receivedPct)}%</p>
                  </div>
                  <Progress 
                    value={receivedPct} 
                    aria-label="Progresso de recebimentos"
                    className="h-2 rounded-full"
                    classNames={{ indicator: "bg-success shadow-[0_0_20px_rgba(52,153,113,0.5)]" }}
                  />
                </div>
              </div>
            </CardBody>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          {pending.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Pendências do Mês</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {pending.map((b) => (
                   <BillRow 
                    key={b.id + (b.isTransaction ? '-t' : '') + (b.isRecurring ? '-r' : '')} 
                    bill={b} 
                    onView={setViewingItem}
                    onTogglePaid={(item) => confirmPaid(item, item.isTransaction ? 'transaction' : 'bill')}
                    onEdit={openAddModal}
                    onDelete={(id, item) => {
                      const type = item.isTransaction ? 'transaction' : (item.isRecurring ? 'recurring' : 'bill');
                      deleteMutation.mutate({ id, type, month: currentMonth });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-2 px-1 border-b border-white/5 pb-2">
              <History size={14} className="text-white/20" />
              <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Linha do Tempo</h2>
            </div>
            
            {(() => {
              const groups = allItems.reduce((acc, item) => {
                const label = getDayLabel(item.due_date);
                if (!acc[label]) acc[label] = [];
                acc[label].push(item);
                return acc;
              }, {});

              return Object.entries(groups).map(([label, items]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center gap-3 px-2 py-1">
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">{label}</span>
                    <div className="flex-1 h-[1px] bg-white/[0.03]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map((b) => (
                      <BillRow 
                        key={b.id + (b.isTransaction ? '-t' : '') + (b.isRecurring ? '-r' : '')} 
                        bill={b} 
                        onView={setViewingItem}
                        onTogglePaid={(item) => confirmPaid(item, item.isTransaction ? 'transaction' : 'bill')}
                        onEdit={openAddModal}
                        onDelete={(id, item) => setDeleteModal({ isOpen: true, item, scope: 'single' })}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {allItems.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-white/10">
                <Receipt size={32} />
              </div>
              <p className="text-white/20 text-sm">Nenhum lançamento encontrado.</p>
            </div>
          )}
        </div>
      )}

      <TransactionDetailModal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
        onEdit={(t) => openAddModal(t, currentMonth)}
        onDelete={(id, type, scope) => {
          deleteMutation.mutate({ id, type, month: currentMonth, scope });
        }}
        onTogglePaid={(t) => confirmPaid(t, t._type || (t.isTransaction ? 'transaction' : 'bill'))}
      />
    </div>
  );
}

function BillRow({ bill, onView, onTogglePaid, onEdit, onDelete }) {
  const { currency, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const isIncome = bill.type === 'income';
  const isPaid = bill.status === 'paid' || bill.status === 'received';
  const isExpense = bill.type === 'expense';
  
  return (
    <div 
      tabIndex={0}
      className={`flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.03] focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-accent/30 rounded-2xl transition-all cursor-pointer group border-b border-white/[0.02] last:border-0 ${
        bill.isGreyedOut ? 'opacity-40 grayscale-[40%]' : ''
      }`}
      onClick={() => onView(bill)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onView(bill);
      }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
        <div className="relative">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onTogglePaid(bill);
            }}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner transition-all active:scale-95 ${
              isPaid 
                ? (isIncome ? 'bg-success/10 text-success' : 'bg-white/5 text-white/40')
                : 'bg-danger/10 text-danger'
            }`}
          >
            {isPaid ? (
              <CheckCircle2 size={20} />
            ) : (
              <Clock size={20} className="animate-pulse" />
            )}
          </div>
          {bill.user_avatar && (
            <img 
              src={bill.user_avatar} 
              alt="User" 
              className="w-5 h-5 rounded-full absolute -bottom-1 -left-1 border border-surface-900 object-cover"
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-white tracking-tighter truncate flex items-center flex-wrap gap-1.5">
            <span>{bill.service_name || bill.description}</span>
            {bill.isGreyedOut && (
              <span className="text-[7px] font-black uppercase tracking-wider text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                Mês Seguinte
              </span>
            )}
            {bill.isClone && (
              <span className="text-[7px] font-black uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                Mês Passado
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[9px] text-white/30 uppercase font-black tracking-widest truncate">
              {bill.category_name || (isIncome ? 'Receita' : 'Conta')} • {bill.time ? bill.time.slice(0, 5) : '--:--'}
              {bill.isClone && bill.originalDate && ` • Original: ${new Date(bill.originalDate).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`}
            </p>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <p className={`text-sm sm:text-base font-black tracking-tighter ${isIncome ? 'text-success' : (isPaid ? 'text-white/90' : 'text-danger')}`}>
          {isIncome ? '+' : '-'}{formatCurrency(bill.amount)}
        </p>
        <div className="flex items-center gap-1.5">
          <Chip 
            size="sm" 
            variant="flat" 
            className={`h-5 px-1.5 text-[8px] font-black uppercase tracking-widest ${
              isPaid ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
            }`}
          >
            {isIncome ? (isPaid ? 'Recebido' : 'Pendente') : (isPaid ? 'Pago' : 'Pendente')}
          </Chip>
          {bill.payment_method && (
            <Chip 
              size="sm" 
              variant="flat" 
              className={`h-5 px-1.5 text-[8px] font-black uppercase tracking-widest ${
                bill.payment_method === 'pix' ? 'bg-success/10 text-success' :
                bill.payment_method === 'credit' ? 'bg-warning/10 text-warning' :
                bill.payment_method === 'debit' ? 'bg-primary/10 text-primary' :
                'bg-white/5 text-white/40'
              }`}
            >
              {bill.payment_method === 'credit' ? 'Crédito' : 
               bill.payment_method === 'debit' ? 'Débito' : 
               bill.payment_method === 'pix' ? 'PIX' : 
               bill.payment_method === 'cash' ? 'Dinheiro' : 
               bill.payment_method || 'Outro'}
            </Chip>
          )}
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 min-w-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical size={14} className="text-white/20" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu 
              aria-label="Ações" 
              className="bg-surface-800 border border-white/10 rounded-xl"
              onAction={(key) => {
                if (key === 'edit') onEdit(bill);
                else onDelete(bill.id, bill);
              }}
            >
              <DropdownItem key="edit" startContent={<Edit2 size={12} />}>Editar</DropdownItem>
              <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={12} />}>Apagar</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
