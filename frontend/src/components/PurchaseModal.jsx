import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@heroui/react";
import { CreditCard, ShoppingBag } from 'lucide-react';

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export default function PurchaseModal({ isOpen, onClose, card }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [categoryId, setCategoryId] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    enabled: isOpen,
  });

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const totalAmount = parseCurrencyInput(amount) || 0;
  const numInstallments = Math.max(1, parseInt(installments) || 1);
  const installmentValue = numInstallments > 0 ? totalAmount / numInstallments : 0;

  const mutation = useMutation({
    mutationFn: (data) => api.addPurchase(card.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-invoice'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleSubmit = () => {
    if (!description.trim() || totalAmount <= 0) return;
    mutation.mutate({
      description: description.trim(),
      amount: totalAmount,
      installments: numInstallments,
      category_id: categoryId || null,
      purchase_date: purchaseDate,
      user_id: user?.id,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom-center" backdrop="blur"
      classNames={{ base: "bg-surface-900 sm:rounded-[32px] border-t border-white/10", closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4" }}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white">Nova Compra</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-normal">{card?.card_name}</p>
        </ModalHeader>
        <ModalBody className="py-6 gap-5">
          <Input label="Descrição" placeholder="Ex: Amazon, iFood..." variant="flat" labelPlacement="outside"
            value={description} onValueChange={setDescription}
            classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12" }} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor Total" placeholder="0,00" variant="flat" labelPlacement="outside" inputMode="decimal"
              value={amount} onValueChange={v => setAmount(formatCurrencyInput(v))}
              startContent={<span className="text-white/20 text-xs">R$</span>}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }} />
            <Input type="number" label="Parcelas" placeholder="1" variant="flat" labelPlacement="outside" inputMode="numeric"
              min={1} max={48} value={installments} onValueChange={v => setInstallments(v > 48 ? '48' : v < 1 ? '1' : v)}
              classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 focus-within:border-accent/40" }} />
          </div>

          {/* Preview parcelas */}
          {totalAmount > 0 && numInstallments > 1 && (
            <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10 text-center">
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Parcelamento</p>
              <p className="text-lg font-black text-accent tracking-tighter">
                {numInstallments}x de {formatCurrency(installmentValue)}
              </p>
              <p className="text-[9px] text-white/20 uppercase font-black mt-1">
                Total: {formatCurrency(totalAmount)}
              </p>
            </div>
          )}

          <Input type="date" label="Data da Compra" variant="flat" labelPlacement="outside"
            value={purchaseDate} onValueChange={setPurchaseDate}
            classNames={{ label: "text-[10px] text-white/30 uppercase font-bold", inputWrapper: "bg-white/5 border border-white/10 rounded-2xl h-12 [color-scheme:dark]" }} />

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/30 uppercase font-bold px-1">Categoria</label>
            <select className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white text-sm px-4 focus:outline-none"
              value={categoryId || ''} onChange={e => setCategoryId(e.target.value || null)}>
              <option value="">Sem categoria</option>
              {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button fullWidth className="bg-accent text-black font-black uppercase tracking-widest h-12 rounded-2xl shadow-xl shadow-accent/20"
            onPress={handleSubmit} isLoading={mutation.isPending} isDisabled={!description.trim() || totalAmount <= 0}>
            {mutation.isPending ? 'Registrando...' : 'Confirmar Compra'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
