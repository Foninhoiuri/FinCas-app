import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress, Chip, Tabs, Tab } from "@heroui/react";
import { CreditCard, Check, AlertTriangle, History, Receipt, Calendar } from 'lucide-react';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { useModals } from '../context/ModalContext';
import TransactionDetailModal from './TransactionDetailModal';

export default function InvoiceModal({ isOpen, onClose, card, month, initialTab = 'invoice' }) {
  const { user, currency } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const qc = useQueryClient();
  const { openAddModal } = useModals();
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewingItem, setViewingItem] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: ({ id, type, scope }) => {
      if (type === 'card-purchase') {
        return api.deletePurchase(id);
      }
      return api.deleteTransaction(id, { scope });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoice'] });
      qc.invalidateQueries({ queryKey: ['card-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['card-invoice', card?.id, month],
    queryFn: () => api.getCardInvoice(card.id, { month }),
    enabled: isOpen && activeTab === 'invoice' && !!card?.id && !!month,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['card-history', card?.id],
    queryFn: () => api.getCardPurchases(card.id, {}),
    enabled: isOpen && activeTab === 'history' && !!card?.id,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ['banks-for-payment'],
    queryFn: () => api.getBanks({ user_id: user?.id }),
    enabled: isOpen,
  });

  const payMutation = useMutation({
    mutationFn: () => api.payCardInvoice(card.id, { month, bank_id: selectedBankId, user_id: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoice'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    }
  });

  const [y, m] = (month || '').split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = m ? `${monthNames[parseInt(m) - 1]} ${y}` : month;

  const items = invoice?.items || [];
  const totalPending = invoice?.total_pending || 0;
  const allPaid = items.length > 0 && totalPending === 0;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" placement="center" backdrop="blur" scrollBehavior="inside"
      classNames={{ base: "bg-surface-900 sm:rounded-[32px] border border-white/10 max-h-[90vh]", closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4" }}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pt-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter uppercase">{card?.card_name}</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Gerenciamento do Cartão</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
               <CreditCard size={20} style={{ color: card?.color || '#c6f150' }} />
            </div>
          </div>
          
          <Tabs 
            variant="underlined" 
            selectedKey={activeTab} 
            onSelectionChange={setActiveTab}
            className="mt-4"
            classNames={{
              tabList: "p-0 gap-6",
              cursor: "w-full bg-accent",
              tab: "max-w-fit px-0 h-10",
              tabContent: "font-black uppercase tracking-widest text-[10px] group-data-[selected=true]:text-white"
            }}
          >
            <Tab key="invoice" title="Fatura Mensal" />
            <Tab key="history" title="Histórico de Compras" />
          </Tabs>
        </ModalHeader>

        <ModalBody className="py-4 gap-4 px-6">
          {activeTab === 'invoice' ? (
            <>
              {loadingInvoice ? (
                <div className="space-y-3 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-2xl" />)}
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/20 text-sm">Nenhuma parcela em {monthLabel}</p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Fatura de {monthLabel}</p>
                      <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(invoice?.total)}</p>
                    </div>
                    {allPaid ? (
                      <Chip color="success" variant="flat" className="font-black uppercase text-[8px]" startContent={<Check size={12} />}>Totalmente Paga</Chip>
                    ) : (
                      <Chip color="warning" variant="flat" className="font-black uppercase text-[8px]" startContent={<AlertTriangle size={12} />}>Pendente</Chip>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-white/10 active:scale-[0.98] ${
                          item.is_paid ? 'bg-success/5 border-success/10' : 'bg-white/5 border-white/5'
                        }`}
                        onClick={() => setViewingItem({
                          ...item,
                          _type: 'transaction',
                          service_name: item.description,
                          card_name: card?.card_name,
                          payment_method: 'credit',
                          isTransaction: true
                        })}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Receipt size={14} className="text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/90 truncate">{item.description}</p>
                          <p className="text-[9px] text-white/30">{item.installment_num}/{item.total_num} • {item.category_name || 'Sem categoria'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black ${item.is_paid ? 'text-success/60' : 'text-white/80'}`}>
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!allPaid && (
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Pagar com</p>
                      <select className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white text-sm px-4 focus:outline-none"
                        value={selectedBankId || ''} onChange={e => setSelectedBankId(e.target.value || null)}>
                        <option value="">Selecionar banco</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {loadingHistory ? (
                <div className="space-y-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl" />)}
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-white/20 text-sm">Nenhuma compra registrada neste cartão</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                   {history.map((h, idx) => (
                     <div
                       key={idx}
                       className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all"
                       onClick={() => setViewingItem({
                         ...h,
                         _type: 'card-purchase',
                         id: h.id,
                         service_name: h.description,
                         amount: h.amount,
                         installment_num: h.installments_paid,
                         total_num: h.installments,
                         purchase_total: h.total_amount || (h.amount * h.installments),
                         card_name: card?.card_name,
                         payment_method: 'credit',
                         due_date: h.purchase_date,
                         is_paid: h.installments_paid === h.installments,
                         isTransaction: true
                       })}
                     >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                           {h.category_icon || '🛍️'}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-black text-white truncate">{h.description}</p>
                           <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">
                              {new Date(h.purchase_date).toLocaleDateString('pt-BR')} • {h.installments}x {formatCurrency(h.amount)}
                           </p>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-base font-black text-white tracking-tighter">
                              {formatCurrency(h.total_amount || h.amount * h.installments)}
                           </p>
                           <Progress 
                              size="sm" 
                              value={(h.installments_paid / h.installments) * 100} 
                              className="w-16 h-1 mt-1" 
                              color={h.installments_paid === h.installments ? "success" : "primary"} 
                           />
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </>
          )}
        </ModalBody>

        {activeTab === 'invoice' && !allPaid && totalPending > 0 && (
          <ModalFooter className="px-6 pb-8">
            <Button fullWidth className="bg-accent text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-accent/20"
              onPress={() => payMutation.mutate()} isLoading={payMutation.isPending} isDisabled={!selectedBankId}>
              {payMutation.isPending ? 'Processando...' : `Confirmar Pagamento (${formatCurrency(totalPending)})`}
            </Button>
          </ModalFooter>
        )}
        
        {activeTab === 'history' && (
          <ModalFooter className="px-6 pb-8">
             <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-3">
                   <AlertTriangle size={16} className="text-accent" />
                   <p className="text-[10px] text-accent font-black uppercase tracking-widest">Comprometimento de Limite</p>
                </div>
                <p className="text-sm font-black text-white">
                   {formatCurrency(card?.total_used)}
                </p>
             </div>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>

    {viewingItem && (
      <TransactionDetailModal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
        onEdit={(t) => {
          onClose();
          openAddModal(t, month);
        }}
        onDelete={(id, type, scope) => {
          deleteMutation.mutate({ id, type, scope });
        }}
      />
    )}
  </>
  );
}
