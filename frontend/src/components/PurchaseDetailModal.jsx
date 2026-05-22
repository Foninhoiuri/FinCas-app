import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Progress, Chip
} from "@heroui/react";
import { CreditCard, Trash2, Edit2, Check, Clock, X, Receipt, Calendar, Tag } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function PurchaseDetailModal({ isOpen, onClose, purchase, cardName }) {
  const { user, currency, currencySymbol } = useAuth();
  const formatCurrency = (v) => formatCurrencyUtil(v, currency);
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (isOpen && purchase) {
      setDescription(purchase.description || '');
      setIsEditing(false);
    }
  }, [isOpen, purchase]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    enabled: isOpen,
  });

  const installmentsPaid = Number(purchase?.installments_paid || 0);
  const totalInstallments = Number(purchase?.installments || 1);
  const progress = totalInstallments > 0 ? (installmentsPaid / totalInstallments) * 100 : 0;
  const isFullyPaid = installmentsPaid >= totalInstallments;

  const category = categories.find(c => c.id === purchase?.category_id);

  const updateMutation = useMutation({
    mutationFn: (data) => api.updatePurchase(purchase.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-history'] });
      qc.invalidateQueries({ queryKey: ['card-invoice'] });
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deletePurchase(purchase.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-history'] });
      qc.invalidateQueries({ queryKey: ['card-invoice'] });
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setShowDelete(false);
      onClose();
    },
  });

  const handleSave = () => {
    if (!description.trim()) return;
    updateMutation.mutate({ description: description.trim() });
  };

  if (!purchase) return null;

  const purchaseDate = purchase.purchase_date
    ? new Date(purchase.purchase_date.includes('T') ? purchase.purchase_date : purchase.purchase_date + 'T12:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '--';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="bottom-center"
        backdrop="blur"
        size="lg"
        classNames={{
          base: "bg-surface-900 border-t border-white/10 rounded-t-[42px] max-h-[90vh]",
          closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 px-8 pt-8 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1 flex items-center gap-1.5">
                  <CreditCard size={10} />
                  {cardName}
                </p>
                {isEditing ? (
                  <Input
                    autoFocus
                    value={description}
                    onValueChange={setDescription}
                    variant="flat"
                    classNames={{
                      inputWrapper: "bg-white/5 border border-accent/30 rounded-2xl h-12",
                      input: "text-xl font-black text-white"
                    }}
                  />
                ) : (
                  <h2 className="text-2xl font-black text-white tracking-tighter leading-tight">
                    {purchase.description}
                  </h2>
                )}
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1"
                style={{ background: `${category?.color || '#ffffff'}15`, border: `1px solid ${category?.color || '#ffffff'}25` }}
              >
                <span className="text-xl">{category?.icon || '🛍️'}</span>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="px-8 py-4 gap-5 overflow-y-auto">
            {/* Valor e parcelas */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Total da compra</p>
                  <p className="text-3xl font-black text-white tracking-tighter">
                    {formatCurrency(purchase.total_amount || purchase.amount * totalInstallments)}
                  </p>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  startContent={isFullyPaid ? <Check size={10} /> : <Clock size={10} />}
                  className={`font-black uppercase text-[8px] ${isFullyPaid ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}
                >
                  {isFullyPaid ? 'Quitado' : 'Em aberto'}
                </Chip>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/30 font-black uppercase tracking-widest">
                    {installmentsPaid}/{totalInstallments} parcelas pagas
                  </span>
                  <span className="text-white/60 font-black">
                    {formatCurrency(purchase.amount)} / parcela
                  </span>
                </div>
                <Progress
                  value={progress}
                  size="sm"
                  classNames={{
                    indicator: isFullyPaid ? 'bg-success' : 'bg-accent'
                  }}
                />
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-white/30" />
                </div>
                <div>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Data da Compra</p>
                  <p className="text-xs font-black text-white/80 mt-0.5">{purchaseDate}</p>
                </div>
              </div>

              {category && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${category.color}20` }}
                  >
                    <span className="text-base">{category.icon}</span>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Categoria</p>
                    <p className="text-xs font-black text-white/80 mt-0.5">{category.name}</p>
                  </div>
                </div>
              )}

              {!isFullyPaid && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-accent/5 border border-accent/10">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Receipt size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-[9px] text-accent/60 uppercase font-black tracking-widest">Restante</p>
                    <p className="text-xs font-black text-accent mt-0.5">
                      {formatCurrency(purchase.amount * (totalInstallments - installmentsPaid))} em {totalInstallments - installmentsPaid} parcela(s)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter className="px-8 pb-8 flex-col gap-3">
            {isEditing ? (
              <div className="flex gap-3 w-full">
                <Button
                  fullWidth
                  variant="flat"
                  className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white/5 border border-white/10 text-white/40"
                  onPress={() => { setIsEditing(false); setDescription(purchase.description); }}
                >
                  Cancelar
                </Button>
                <Button
                  fullWidth
                  className="h-12 rounded-2xl bg-accent text-black font-black uppercase tracking-widest text-[10px] shadow-xl shadow-accent/20"
                  onPress={handleSave}
                  isLoading={updateMutation.isPending}
                  isDisabled={!description.trim()}
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <Button
                  isIconOnly
                  variant="flat"
                  className="w-12 h-12 rounded-2xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all shrink-0"
                  onPress={() => setShowDelete(true)}
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  fullWidth
                  className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  onPress={() => setIsEditing(true)}
                  startContent={<Edit2 size={14} />}
                >
                  Editar Descrição
                </Button>
              </div>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <DeleteConfirmationModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        title="Excluir Compra?"
        message={`Isso irá remover "${purchase?.description}" e todas as ${totalInstallments} parcela(s) vinculadas. Esta ação não pode ser desfeita.`}
      />
    </>
  );
}
