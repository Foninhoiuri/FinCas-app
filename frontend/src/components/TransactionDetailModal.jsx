import { useState } from 'react';
import { 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, 
  Button, Chip 
} from "@heroui/react";
import { 
  Wifi, Lock, Receipt, Zap, CreditCard, Trash2, Edit2, 
  CheckCircle2, Clock, Calendar, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import DeleteConfirmationModal from './DeleteConfirmationModal';

function formatDate(d) {
  if (!d) return '--/--';
  try {
    const date = new Date(d.includes('T') ? d : d + 'T12:00:00');
    if (isNaN(date.getTime())) return '--/--';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '--/--';
  }
}

export default function TransactionDetailModal({ 
  isOpen, 
  onClose, 
  item, 
  onEdit, 
  onDelete, 
  onTogglePaid 
}) {
  const { currency, valuesHidden } = useAuth();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, scope: 'single' });

  if (!item) return null;

  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const isIncome = item.type === 'income';
  const isPaid = item.status === 'paid' || item.status === 'received' || item.is_paid;

  // Detect type for deletion/editing
  const itemType = item._type || (item.isTransaction ? 'transaction' : (item.isRecurring ? 'recurring' : (item.isCardPurchase ? 'transaction' : 'bill')));

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4",
          closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
        }}
      >
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col items-start gap-0.5 pt-8 px-6">
              <h2 className="text-lg font-bold text-white leading-tight">Lançamento</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Visualização Detalhada</p>
              
              <div className="flex items-center gap-3 mt-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 h-5 rounded-full ${item.visibility === 'shared' ? 'bg-primary text-black' : 'bg-warning text-black'}`}>
                  {item.visibility === 'shared' ? <Wifi size={8} /> : <Lock size={8} />}
                  <span className="text-[7px] font-black uppercase tracking-tighter">
                    {item.visibility === 'shared' ? 'Casa' : 'Privado'}
                  </span>
                </div>
                
                {item.time && item.time !== '00:00:00' && (
                  <div className="flex items-center text-white/50">
                    <span className="text-[11px] font-black tracking-widest text-white/80">
                      {item.time.slice(0, 5)}
                    </span>
                  </div>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="py-1 space-y-6 px-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white/5 text-4xl shadow-2xl border border-white/5">
                  {item.category_icon ? (
                    <span className="text-4xl">{item.category_icon}</span>
                  ) : (
                    <Receipt size={40} className="text-white/20" />
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-2xl font-black text-white tracking-tighter leading-none">{item.service_name || item.description}</p>
                  <p className={`text-xl font-bold ${isIncome ? 'text-success' : 'text-white/60'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                  </p>
                  <Chip 
                    size="sm" 
                    variant="flat" 
                    onClick={onTogglePaid ? () => onTogglePaid(item) : undefined}
                    className={`h-6 px-4 text-[9px] font-black uppercase tracking-[0.1em] ${onTogglePaid ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''} ${isPaid ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger border border-danger/20'}`}
                  >
                    {isPaid ? (isIncome ? 'Recebido' : 'Confirmado / Pago') : 'Aguardando Pagamento'}
                  </Chip>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Categoria</p>
                  <p className="text-sm text-white font-bold">{item.category_name || 'Sem Categoria'}</p>
                </div>
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Método</p>
                  <p className="text-sm text-white font-bold uppercase">
                    {item.payment_method === 'credit' ? 'Crédito' : 
                     item.payment_method === 'debit' ? 'Débito' : 
                     item.payment_method === 'pix' ? 'PIX' : 
                     item.payment_method === 'cash' ? 'Dinheiro' : 
                     item.payment_method || 'Outro'}
                  </p>
                </div>
                
                {item.bank_name && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Conta/Banco</p>
                    <p className="text-sm text-white font-bold">{item.bank_name}</p>
                  </div>
                )}

                {item.card_name && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Cartão de Crédito</p>
                    <p className="text-sm text-primary font-bold flex items-center gap-2">
                      <CreditCard size={14} />
                      {item.card_name}
                    </p>
                  </div>
                )}

                {item.budget_name && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Limite/Budget</p>
                    <p className="text-sm text-accent font-bold flex items-center gap-2">
                      <Zap size={14} />
                      {item.budget_name}
                    </p>
                  </div>
                )}

                {item.installment_num && (
                  <>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Parcela</p>
                      <p className="text-sm text-white font-bold">
                        {item.installment_num} / {item.total_num}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Valor Total</p>
                      <p className="text-sm text-white/60 font-bold">
                        {formatCurrency(item.purchase_total || (item.amount * item.total_num))}
                      </p>
                    </div>
                  </>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 col-span-2">
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Vencimento/Data</p>
                  <p className="text-sm text-white font-bold">{formatDate(item.due_date || item.date)}</p>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 py-6 px-6">
              <Button 
                fullWidth 
                className="bg-danger text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl shadow-lg shadow-danger/20 active:scale-95 transition-all glow-danger"
                onPress={() => {
                  setDeleteModal({ isOpen: true, scope: 'single' });
                }}
                startContent={<Trash2 size={14} />}
              >
                Apagar
              </Button>
              <Button 
                fullWidth 
                className="bg-accent text-black font-black uppercase text-[10px] tracking-widest h-11 rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all"
                onPress={() => {
                  onClose();
                  onEdit(item);
                }}
                startContent={<Edit2 size={14} />}
              >
                Editar
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <DeleteConfirmationModal 
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, scope: 'single' })}
          onConfirm={(scopeSelected) => {
            const finalScope = scopeSelected || deleteModal.scope;
            onDelete(item.id, itemType, finalScope);
            setDeleteModal({ isOpen: false, scope: 'single' });
            onClose();
          }}
          title={item.installment_num && item.total_num > 1 ? "Excluir Parcela?" : "Excluir Lançamento?"}
          message={
            item.installment_num && item.total_num > 1
              ? `Este lançamento é a parcela ${item.installment_num}/${item.total_num} de uma compra no cartão. Deseja excluir apenas esta parcela ou a compra inteira?`
              : `Tem certeza que deseja excluir "${item.service_name || item.description}"? Esta ação não poderá ser desfeita.`
          }
          isInstallment={!!(item.installment_num && item.total_num > 1)}
        />
      )}
    </>
  );
}
