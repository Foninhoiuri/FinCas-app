import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertTriangle, Repeat, Clock, Calendar, Landmark, CreditCard, Eye, EyeOff, Hash, Check, DollarSign, Wallet, ArrowUpRight, Gauge, Target, Minus, Plus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, 
  Button, Input, Select, SelectItem, Tabs, Tab, Chip 
} from "@heroui/react";

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', icon: Hash, color: '#32BCAD' },
  { value: 'debit', label: 'Débito', icon: Wallet, color: '#3b82f6' },
  { value: 'credit', label: 'Crédito', icon: CreditCard, color: '#C6F150' },
  { value: 'cash', label: 'Dinheiro', icon: DollarSign, color: '#10b981' },
];

const formatDate = (dateInput, defaultMonth) => {
  if (!dateInput) {
    if (defaultMonth) {
      const now = new Date();
      const nowMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (defaultMonth === nowMonthStr) {
        return now.toISOString().slice(0, 10);
      }
      return `${defaultMonth}-01`;
    }
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof dateInput === 'string' && dateInput.length >= 10) {
    return dateInput.slice(0, 10);
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
};

export default function AddBillModal({ isOpen, onClose, transactionToEdit, initialData }) {
  const { user, currency, currencySymbol } = useAuth();
  const queryClient = useQueryClient();
  
  // States
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [categoryId, setCategoryId] = useState('');
  const [bankId, setBankId] = useState('');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountingDate, setAccountingDate] = useState(new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(false);
  const [isPaid, setIsPaid] = useState(true);
  const [visibility, setVisibility] = useState('shared');
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [budgetId, setBudgetId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [deductFromBalance, setDeductFromBalance] = useState(true);
  const [error, setError] = useState('');

  // Queries
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });
  const { data: banks = [] } = useQuery({ queryKey: ['banks'], queryFn: () => api.getBanks({ user_id: user?.id }) });
  const { data: creditCards = [] } = useQuery({ queryKey: ['cards'], queryFn: () => api.getCards({ user_id: user?.id }) });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => api.getGoals({ user_id: user?.id }) });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: () => api.getBudgets({ user_id: user?.id }) });

  const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

  // Reset and Load data
  useEffect(() => {
    if (!isOpen) return;

    if (transactionToEdit) {
      const isEdit = !!transactionToEdit.id;
      setType(transactionToEdit.type || 'expense');
      setAmount(isEdit ? formatCurrencyInput(Number(transactionToEdit.amount || 0), currency) : '');
      setDescription(transactionToEdit.description || '');
      setPaymentMethod(transactionToEdit.payment_method || 'pix');
      setCategoryId(transactionToEdit.category_id?.toString() || '');
      setBankId(transactionToEdit.bank_id?.toString() || '');
      setCardId(transactionToEdit.card_id?.toString() || '');
      setDate(formatDate(transactionToEdit.date, transactionToEdit.effective_month));
      setAccountingDate(formatDate(transactionToEdit.accounting_date, transactionToEdit.effective_month));
      setIsRecurring(!!transactionToEdit.recurring_id);
      setIsPaid(transactionToEdit.is_paid ?? true);
      setVisibility(transactionToEdit.visibility || 'shared');
      setTime(transactionToEdit.time?.slice(0, 5) || new Date().toTimeString().slice(0, 5));
      setBudgetId(transactionToEdit.budget_id || '');
      setGoalId(transactionToEdit.goal_id || '');
      setDeductFromBalance(true);
    } else if (initialData) {
      if (initialData.amount) setAmount(formatCurrencyInput(initialData.amount.toString(), currency));
      if (initialData.description) setDescription(initialData.description);
      if (initialData.bank_id) setBankId(initialData.bank_id.toString());
      if (initialData.type) setType(initialData.type);
      if (initialData.category_id) setCategoryId(initialData.category_id.toString());
      if (initialData.goal_id) setGoalId(initialData.goal_id.toString());
      if (initialData.is_paid !== undefined) setIsPaid(initialData.is_paid);
    } else {
      // Reset to defaults for new transaction
      setAmount('');
      setDescription('');
      setPaymentMethod('pix');
      setCategoryId('');
      setBankId('');
      setCardId('');
      setDate(formatDate(null));
      setAccountingDate(formatDate(null));
      setIsRecurring(false);
      setIsPaid(true);
      setBudgetId('');
      setGoalId('');
      setDeductFromBalance(true);
    }
  }, [isOpen, transactionToEdit, initialData]);

  // Logic for defaults
  useEffect(() => {
    if (paymentMethod === 'credit') setIsPaid(false);
    else if (paymentMethod === 'pix' || paymentMethod === 'debit') setIsPaid(true);
  }, [paymentMethod]);

  // Reset payment method when switching between income/expense
  useEffect(() => {
    if (type === 'income' && (paymentMethod === 'credit' || paymentMethod === 'debit')) {
      setPaymentMethod('pix');
    }
  }, [type]);
  
  // Flash Tracker Logic: Auto-suggest budget based on rules
  useEffect(() => {
    if (type !== 'expense' || transactionToEdit) return; // Only auto-select for new expenses

    const findBudget = () => {
      for (const b of budgets) {
        for (const rule of (b.rules || [])) {
          if (rule.rule_type === 'category' && rule.rule_value === categoryId) return b.id;
          if (rule.rule_type === 'card' && rule.rule_value === cardId && paymentMethod === 'credit') return b.id;
          if (rule.rule_type === 'bank' && rule.rule_value === bankId && paymentMethod !== 'credit' && paymentMethod !== 'cash') return b.id;
        }
      }
      return '';
    };

    const suggested = findBudget();
    if (suggested) setBudgetId(suggested);
  }, [categoryId, cardId, bankId, paymentMethod, type, budgets, transactionToEdit]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (transactionToEdit && transactionToEdit.id) {
        if (transactionToEdit._type === 'card-purchase') {
          return api.updatePurchase(transactionToEdit.id, {
            description: data.description,
            category_id: data.category_id
          });
        }
        return api.updateTransaction(transactionToEdit.id, data);
      }
      return api.addTransaction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['card-history'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoice'] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Erro ao processar transação');
      setTimeout(() => setError(''), 5000);
    }
  });

  const handleSubmit = () => {
    const numericAmount = parseCurrencyInput(amount);
    
    let errorMsg = '';
    if (!description) errorMsg = 'Dê um nome para este registro';
    else if (!numericAmount || numericAmount <= 0) errorMsg = 'O valor não pode ser zero';
    else if (paymentMethod === 'credit' && (!installments || parseInt(installments) < 1)) errorMsg = 'O número de parcelas é inválido';

    if (errorMsg) {
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const payload = {
      user_id: user?.id,
      type,
      amount: numericAmount,
      description,
      payment_method: type === 'income' ? paymentMethod : paymentMethod,
      category_id: categoryId || null,
      bank_id: (paymentMethod === 'cash' || !bankId) ? null : bankId,
      card_id: ((paymentMethod === 'credit' || paymentMethod === 'debit') && cardId) ? cardId : null,
      installments: paymentMethod === 'credit' ? parseInt(installments) : 1,
      date,
      accounting_date: accountingDate,
      time: time + ':00',
      is_paid: isPaid,
      visibility,
      is_recurring: isRecurring,
      goal_id: goalId || null,
      budget_id: budgetId || null,
      skip_bank_update: !deductFromBalance
    };

    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom-center" backdrop="blur" size="lg"
      classNames={{ base: "bg-surface-900 border-t border-white/10 rounded-[42px] max-h-[90vh]", closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4" }}>
      <ModalContent className="max-h-[90vh] overflow-hidden">
        <ModalHeader className="flex flex-col gap-1 px-8 pt-8 min-h-[90px]">
          {error ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <h2 className="text-2xl font-black text-danger tracking-tighter">Atenção!</h2>
              <p className="text-[11px] text-danger font-black uppercase tracking-[0.2em]">{error}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white tracking-tighter">Adicionar Registro</h2>
              <p className="text-[11px] text-accent font-black uppercase tracking-[0.2em]">Adicione uma entrada ou saída</p>
            </>
          )}
        </ModalHeader>
        <ModalBody className="px-8 py-6 gap-6 overflow-y-auto pb-32">
          
          <Tabs fullWidth selectedKey={type} onSelectionChange={setType} classNames={{
            tabList: "bg-white/5 p-1 rounded-2xl",
            cursor: type === 'expense' ? "!bg-danger shadow-lg" : "!bg-success shadow-lg",
            tabContent: "text-[10px] font-black uppercase tracking-widest group-data-[selected=true]:text-black"
          }}>
            <Tab key="expense" title="Saída" />
            <Tab key="income" title="Entrada" />
          </Tabs>

          <div className="space-y-4">
            <Input label="Valor" placeholder="0,00" variant="flat" labelPlacement="outside" value={amount}
              onValueChange={v => setAmount(formatCurrencyInput(v, currency))} startContent={<span className="text-white/20 text-sm">{currencySymbol}</span>}
              inputMode="decimal"
              classNames={{ input: "text-3xl font-bold text-white", inputWrapper: "bg-transparent h-16 border-b border-white/5 rounded-none" }} />
            
            <Input label="Descrição" placeholder="Ex: Mercado, Amazon..." variant="flat" labelPlacement="outside"
              value={description} onValueChange={setDescription}
              classNames={{ inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }} />
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-4 gap-2">
            {(type === 'expense' ? PAYMENT_METHODS : [
              { value: 'pix', label: 'Digital', icon: Hash, color: '#32BCAD' },
              { value: 'cash', label: 'Físico', icon: DollarSign, color: '#10b981' }
            ]).map(({ value, label, icon: PIcon, color }) => (
              <button key={value} onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                  paymentMethod === value ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-white/20 hover:bg-white/5'
                }`}>
                <PIcon size={16} style={{ color: paymentMethod === value ? color : 'inherit' }} />
                <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
              </button>
            ))}
          </div>

          {/* Custom Selectors Grid */}
          <div className="space-y-6">
            
            {/* Category Selector */}
            <div className="space-y-2">
              <span className="text-[9px] text-white/30 uppercase font-black tracking-widest px-1">Categoria</span>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map(c => (
                  <button key={c.id} onClick={() => {
                    setCategoryId(categoryId === c.id.toString() ? '' : c.id.toString());
                    setGoalId(''); // Reset goal if category selected
                  }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      categoryId === c.id.toString() ? 'bg-accent/20 border-accent/50 text-accent shadow-[0_0_15px_-5px] shadow-accent' : 'bg-white/5 border-white/5 text-white/40'
                    }`}>
                    <span className="text-sm">{c.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{c.name}</span>
                  </button>
                ))}

                {/* GOALS AS CATEGORIES */}
                {type === 'expense' && goals.map(g => (
                  <button key={g.id} onClick={() => {
                    setGoalId(goalId === g.id ? '' : g.id);
                    setCategoryId(''); // Reset category if goal selected
                    if (!description) setDescription(`Aporte: ${g.title}`);
                  }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      goalId === g.id ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_-5px] shadow-primary' : 'bg-white/5 border-white/5 text-white/40'
                    }`}>
                    <Target size={14} className={goalId === g.id ? 'text-primary' : 'text-white/20'} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{g.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bank/Card Selector - Split Model */}
            <div className="flex items-end gap-3">
              {/* Left: Cards/Banks List */}
              <div className="flex-1 min-w-0 space-y-2">
                <span className="text-[9px] text-white/30 uppercase font-black tracking-widest px-1">
                  {(paymentMethod === 'credit' || paymentMethod === 'debit') ? 'Selecione o Cartão' : 'Conta / Banco'}
                </span>
                <div className="relative group">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                    {(paymentMethod === 'credit' || paymentMethod === 'debit') ? (
                      creditCards.map(c => (
                        <button key={c.id} onClick={() => setCardId(cardId === c.id.toString() ? '' : c.id.toString())}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                            cardId === c.id.toString() ? 'bg-accent/20 border-accent text-accent shadow-[0_0_15px_-5px_var(--tw-shadow-color)] shadow-accent' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                          }`}>
                          <CreditCard size={14} className={cardId === c.id.toString() ? 'text-accent' : 'text-white/20'} />
                          <span className="text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">{c.card_name}</span>
                        </button>
                      ))
                    ) : (paymentMethod !== 'cash' || type === 'income') && (
                      banks.map(b => (
                        <button key={b.id} onClick={() => setBankId(bankId === b.id.toString() ? '' : b.id.toString())}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                            bankId === b.id.toString() ? 'bg-accent/20 border-accent text-accent shadow-[0_0_15px_-5px_var(--tw-shadow-color)] shadow-accent' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                          }`}>
                          <Landmark size={14} className={bankId === b.id.toString() ? 'text-accent' : 'text-white/20'} />
                          <span className="text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">{b.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {/* Gradient Shadow Indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-900 to-transparent pointer-events-none z-10" />
                </div>
              </div>

              {/* Right: Installments (Only for Credit) */}
              {paymentMethod === 'credit' && (
                <div className="flex-shrink-0 space-y-2">
                  <span className="text-[9px] text-white/30 uppercase font-black tracking-widest px-1">Parcelas</span>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl h-[42px] overflow-hidden group/stepper">
                    <button 
                      type="button"
                      onClick={() => setInstallments(Math.max(1, (parseInt(installments) || 1) - 1).toString())}
                      className="px-2 h-full hover:bg-white/10 text-white/20 hover:text-white transition-all active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number" 
                      inputMode="numeric" 
                      value={installments} 
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-8 bg-transparent text-[11px] font-black text-center text-accent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                    <button 
                      type="button"
                      onClick={() => setInstallments(((parseInt(installments) || 1) + 1).toString())}
                      className="px-2 h-full hover:bg-white/10 text-white/20 hover:text-white transition-all active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Deduct from Balance Toggle (Only for Goals) */}
            {goalId && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${deductFromBalance ? 'bg-success/10 text-success' : 'bg-white/5 text-white/20'}`}>
                    <Target size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/90 uppercase tracking-wider">Abater do saldo bancário?</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-tighter">
                      {deductFromBalance ? 'O valor será subtraído da conta selecionada' : 'Apenas registra o aporte na meta'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{deductFromBalance ? 'SIM' : 'NÃO'}</span>
                   <button 
                    type="button"
                    onClick={() => setDeductFromBalance(!deductFromBalance)}
                    className={`w-10 h-5 rounded-full transition-all relative ${deductFromBalance ? 'bg-success' : 'bg-white/10'}`}
                   >
                     <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${deductFromBalance ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[9px] text-white/20 uppercase font-black px-1">Data</span>
              <Input type="date" value={date} onValueChange={setDate}
                classNames={{ input: "text-[10px]", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-10 px-3 [color-scheme:dark]" }} />
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] text-white/20 uppercase font-black px-1">Contábil</span>
              <Input type="date" value={accountingDate} onValueChange={setAccountingDate}
                classNames={{ input: "text-[10px]", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-10 px-3 [color-scheme:dark]" }} />
            </div>
          </div>

          {/* Action Selectors (Recurrente, Pago) - Horizontal Model */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsRecurring(!isRecurring)} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${isRecurring ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-white/5 border-white/10 text-white/20'}`}>
              <Repeat size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Recorrente</span>
            </button>

            <button onClick={() => setIsPaid(!isPaid)} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${isPaid ? 'bg-success/10 border-success/30 text-success' : 'bg-white/5 border-white/10 text-white/20'}`}>
              <Check size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{type === 'expense' ? 'Já Pago' : 'Já Recebido'}</span>
            </button>
          </div>

          {/* Budget Link (Flash Tracker) */}
          {type === 'expense' && budgets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Vincular a um Limite</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {budgets.map(b => {
                  const isSelected = budgetId === b.id;
                  return (
                    <button key={b.id} onClick={() => setBudgetId(budgetId === b.id ? '' : b.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                        isSelected ? 'bg-white/10 border-white/20 shadow-[0_0_15px_-5px] shadow-current' : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100 hover:bg-white/10'
                      }`}
                      style={{ color: isSelected ? (b.color || '#fbbf24') : 'inherit' }}>
                      <span className="text-sm">{b.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{b.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="absolute bottom-0 left-0 right-0 bg-surface-900/90 backdrop-blur-xl border-t border-white/10 p-4 z-50 rounded-b-[42px]">
          <Button fullWidth onPress={handleSubmit} isLoading={mutation.isPending}
            className={`h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
              error ? 'bg-danger text-white' : 'bg-accent text-black shadow-accent/20'
            }`}>
            {mutation.isPending ? 'Processando...' : (transactionToEdit || initialData) ? 'Salvar Alterações' : 'Confirmar Registro'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
