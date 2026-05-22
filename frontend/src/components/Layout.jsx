import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Header from './Header';
import AddBillModal from './AddBillModal';
import GlobalUserMenu from './GlobalUserMenu';
import { ModalProvider } from '../context/ModalContext';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from "@heroui/react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Layout() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullThreshold = 80;
  
  const pullY = useMotionValue(0);
  const pullOpacity = useTransform(pullY, [0, pullThreshold], [0, 1]);
  const pullRotate = useTransform(pullY, [0, pullThreshold], [0, 360]);
  const pullIndicatorY = useTransform(pullY, [0, pullThreshold], [-20, 0]);
  const contentY = useTransform(pullY, [0, pullThreshold], [0, 20]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { item, type: 'transaction'|'bill' }
  
  const { validateSession, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Month persistence
  const searchParams = new URLSearchParams(location.search);
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = searchParams.get('month') || nowStr;

  const updateTx = useMutation({
    mutationFn: ({ id, is_paid }) => api.updateTransaction(id, { is_paid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const updateBill = useMutation({
    mutationFn: ({ id, status }) => api.updateBill(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] })
  });

  const openAddModal = (item = null, defaultMonth = null) => {
    if (item && item.target_amount !== undefined) {
      // It's a goal
      setEditingTransaction({ type: 'expense', goal_id: item.id, effective_month: defaultMonth });
    } else if (item) {
      setEditingTransaction(item);
    } else if (defaultMonth) {
      // New transaction with default month
      setEditingTransaction({ effective_month: defaultMonth });
    } else {
      setEditingTransaction(null);
    }
    setShowAddModal(true);
  };

  const confirmPaid = (item, type = 'transaction') => {
    setConfirmData({ item, type });
  };

  const handleConfirm = () => {
    if (!confirmData) return;
    const { item, type } = confirmData;
    if (type === 'transaction') {
      updateTx.mutate({ id: item.id, is_paid: !item.is_paid });
    } else if (type === 'recurring') {
      const now = new Date();
      api.addTransaction({
        user_id: user?.id,
        type: item.type,
        description: item.service_name,
        amount: item.amount,
        category_id: item.type === 'income' ? 1 : 11,
        date: item.due_date,
        time: now.toTimeString().slice(0, 5) + ':00',
        payment_method: 'pix',
        is_paid: true,
        recurring_id: item.id,
        effective_month: item.due_date.slice(0, 7)
      }).then(() => {
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: ['recurring'] });
      });
    } else {
      updateBill.mutate({ id: item.id, status: item.status === 'paid' ? 'pending' : 'paid' });
    }
    setConfirmData(null);
  };

  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e) => {
    if (window.scrollY <= 1) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current || isRefreshing) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    if (diff > 5) {
      pullY.set(Math.min(diff * 0.5, pullThreshold + 20));
      setPullDistance(diff * 0.5);
      if (diff > 10 && e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;
    if (pullY.get() >= pullThreshold) {
      triggerRefresh();
    }
    animate(pullY, 0, { type: 'spring', stiffness: 300, damping: 30 });
    setPullDistance(0);
    isPulling.current = false;
  };

  const triggerRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await qc.invalidateQueries();
      // Sutil delay para feedback visual
      await new Promise(r => setTimeout(r, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openAddModal(null, currentMonth);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentMonth]);

  return (
    <ModalProvider openAddModal={openAddModal} confirmPaid={confirmPaid}>
      <div 
        className="relative min-h-screen flex"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Sidebar currentMonth={currentMonth} />
        
        {/* Pull Indicator */}
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
          <motion.div 
            style={{ 
              opacity: isRefreshing ? 1 : pullOpacity,
              y: isRefreshing ? pullThreshold / 2 : pullIndicatorY,
              rotate: isRefreshing ? 0 : pullRotate
            }}
            className={`w-10 h-10 rounded-full bg-surface-800 border transition-all duration-500 flex items-center justify-center text-accent ${
              isRefreshing 
                ? 'border-accent shadow-[0_0_20px_rgba(198,241,80,0.4)]' 
                : 'border-white/10 shadow-2xl'
            }`}
          >
            {isRefreshing ? (
              <Spinner size="sm" color="current" />
            ) : (
              <RefreshCw size={18} />
            )}
          </motion.div>
        </div>

        <main className="flex-1 md:ml-64 pb-24 md:pb-8 px-4 md:px-8 relative z-10 overflow-visible" 
              style={{ 
                paddingTop: window.innerWidth < 768 
                  ? 'calc(env(safe-area-inset-top) + 2rem)' 
                  : 'calc(env(safe-area-inset-top) + 1.5rem)' 
              }}>
          <motion.div style={{ y: isRefreshing ? 40 : contentY }}>
             <Outlet />
          </motion.div>
        </main>

        {/* Floating Action Button — Nova Conta */}
        <div className="fixed right-5 bottom-[110px] md:bottom-10 z-[100] animate-slide-up">
          <button
            onClick={() => openAddModal(null, currentMonth)}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark/60 backdrop-blur-[2px] flex items-center justify-center shadow-lg glow-accent hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Plus size={24} className="text-black" />
          </button>
        </div>

        <BottomNav currentMonth={currentMonth} />



        <AddBillModal 
          isOpen={showAddModal} 
          onClose={() => { setShowAddModal(false); setEditingTransaction(null); }} 
          transactionToEdit={editingTransaction}
        />

        <Modal 
          isOpen={!!confirmData} 
          onClose={() => setConfirmData(null)}
          placement="center"
          backdrop="blur"
          classNames={{ 
            base: "bg-surface-900 border border-white/10 rounded-[32px] mx-4",
            closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4"
          }}
        >
          <ModalContent>
            <ModalHeader>Confirmar Status</ModalHeader>
            <ModalBody className="py-4 text-center">
              <p className="text-sm text-white/60">
                Deseja marcar este lançamento como 
                <strong className="text-white ml-1">
                  {confirmData?.type === 'transaction' 
                    ? (confirmData?.item?.is_paid ? 'PENDENTE' : 'PAGO')
                    : (confirmData?.item?.status === 'paid' ? 'PENDENTE' : 'PAGO')}
                </strong>?
              </p>
            </ModalBody>
            <ModalFooter className="flex-col sm:flex-row gap-2">
              <Button fullWidth variant="flat" color="danger" className="font-bold" onPress={() => setConfirmData(null)}>Cancelar</Button>
              <Button fullWidth className="bg-accent text-black font-bold" onPress={handleConfirm}>Sim, Confirmar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </ModalProvider>
  );
}
