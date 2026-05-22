import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark, Tag, Plus, Pencil, Trash2, X, Check, ChevronLeft,
  LayoutGrid, Palette, Users, User, Shield, Zap, MoreVertical,
  CreditCard, TrendingUp, TrendingDown, ArrowLeft
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Card, CardBody, Button, Input, Tabs, Tab,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Switch, Popover, PopoverTrigger, PopoverContent, Chip
} from "@heroui/react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import PageHeader from '../components/PageHeader';

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
  '#111111',
];

function ItemModal({ isOpen, onClose, item, type, categoryType, onSave, error: mutationError }) {
  const [name, setName] = useState(item?.name || '');
  const [color, setColor] = useState(item?.color || '#6366f1');
  const [emoji, setEmoji] = useState(item?.icon || '💰');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setValidationError('O nome é obrigatório');
      return;
    }
    const payload = {
      name: name.trim(),
      color,
      icon: emoji,
      type: categoryType
    };
    onSave(payload);
  };

  const activeError = mutationError || validationError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" backdrop="blur" classNames={{ base: "bg-surface-900 border border-white/10 rounded-[40px] m-4" }}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
          <h2 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
            {item ? 'Editar' : 'Nova'} {categoryType === 'income' ? 'Categoria de Entrada' : 'Categoria de Saída'}
          </h2>
        </ModalHeader>
        <ModalBody className="py-6 px-8 gap-6">
          {activeError && (
            <div className="p-4 rounded-2xl bg-danger/10 text-danger border border-danger/20 animate-shake flex items-center gap-3">
              <Shield size={16} className="shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest">{activeError}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/30 uppercase font-black tracking-widest px-1">Ícone</label>
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 transition-all active:scale-95 shadow-inner">
                    {emoji}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none bg-transparent">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(e) => setEmoji(e.emoji)}
                    lazyLoadEmojis={true}
                    skinTonesDisabled
                    searchPlaceHolder="Buscar..."
                    width={300}
                    height={400}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              label="Nome da Categoria"
              placeholder="Ex: Alimentação, Salário..."
              value={name}
              onValueChange={setName}
              autoFocus
              variant="flat"
              labelPlacement="outside"
              classNames={{
                base: "flex-1",
                label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl group-data-[focus=true]:border-accent/50"
              }}
            />
          </div>

          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mb-3 block px-1">Cor</label>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`aspect-square rounded-lg transition-all duration-300 ${color === c ? 'scale-110 ring-2 ring-white/50' : 'opacity-40 hover:opacity-100'
                    }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="p-8 pt-0">
          <Button
            fullWidth
            onPress={handleSubmit}
            className="bg-accent text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-accent/20 active:scale-95 transition-all"
          >
            {item ? 'Salvar Alterações' : 'Confirmar'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ItemRow({ item, type, onEdit, onDelete }) {
  const isCategory = type.startsWith('category');
  const icon = isCategory ? (item.icon || '📌') : (type === 'bank' ? '🏦' : '💳');

  return (
    <Card className="bg-surface-900 border border-white/5 hover:border-white/10 transition-all group animate-slide-up">
      <CardBody className="p-4 flex flex-row items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner relative overflow-hidden"
          style={{ background: `${item.color}15` }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: item.color }} />
          <span className="relative z-10 transition-all">{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white/90 truncate">{item.name || item.card_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
              {item.is_shared ? '👫 Família' : '👤 Privado'}
            </p>
          </div>
        </div>

        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly variant="light" size="sm" className="text-white/20 hover:text-white transition-colors">
              <MoreVertical size={16} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Ações"
            className="bg-surface-800 border border-white/10 rounded-xl"
            onAction={(key) => key === 'edit' ? onEdit(item) : onDelete(item.id)}
          >
            <DropdownItem key="edit" startContent={<Pencil size={14} />}>Editar</DropdownItem>
            <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 size={14} />}>Apagar</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardBody>
    </Card>
  );
}

export default function Manage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState(searchParams.get('tab') || 'cat-expense');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [mutationError, setMutationError] = useState('');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && currentTab !== tab) {
      setTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (key) => {
    setTab(key);
    setSearchParams({ tab: key });
  };

  // Data Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['manage-categories'],
    queryFn: () => api.getCategories(),
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Mutations
  const genericMutation = (apiFn, queryKey) => useMutation({
    mutationFn: (data) => apiFn(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setModalOpen(false); },
    onError: (err) => setMutationError(err.message),
  });

  const updateMutation = (apiFn, queryKey) => useMutation({
    mutationFn: ({ id, ...data }) => apiFn(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setModalOpen(false); },
    onError: (err) => setMutationError(err.message),
  });

  const deleteMutation = (apiFn, queryKey) => useMutation({
    mutationFn: (id) => apiFn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const mCreateCat = genericMutation(api.createCategory, 'manage-categories');
  const mUpdateCat = updateMutation(api.updateCategory, 'manage-categories');
  const mDeleteCat = deleteMutation(api.deleteCategory, 'manage-categories');

  const handleSave = (payload) => {
    setMutationError('');
    const type = tab === 'cat-income' ? 'income' : 'expense';
    editingItem ? mUpdateCat.mutate({ id: editingItem.id, ...payload, type }) : mCreateCat.mutate({ ...payload, type });
  };

  const getItems = () => {
    if (tab === 'cat-income') return incomeCategories;
    return expenseCategories;
  };

  const currentItems = getItems();

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-fade-in pt-4 px-2">
      {/* 1. TOP BAR */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="flat"
            onPress={() => navigate('/profile')}
            className="w-12 h-12 rounded-[20px] bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">Categorias</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-1">Configurações</p>
          </div>
        </div>
        <Button
          onPress={() => { setEditingItem(null); setModalOpen(true); }}
          isIconOnly
          className="w-12 h-12 rounded-[20px] bg-accent text-black shadow-lg shadow-accent/20 active:scale-90 transition-all"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* 2. TABS */}
      <div className="px-2">
        <Tabs
          fullWidth
          selectedKey={tab}
          onSelectionChange={handleTabChange}
          classNames={{
            tabList: "bg-surface-900 border border-white/5 p-1.5 rounded-[24px] shadow-xl",
            cursor: tab === 'cat-income' ? "!bg-success shadow-[0_0_20px_rgba(34,197,94,0.3)]" :
              "!bg-danger shadow-[0_0_20px_rgba(239,68,68,0.3)]",
            tabContent: "group-data-[selected=true]:text-black font-black uppercase tracking-widest text-[9px]",
            base: "w-full"
          }}
        >
          <Tab key="cat-income" title={<div className="flex items-center gap-2"><TrendingUp size={14} /><span>Entradas</span></div>} />
          <Tab key="cat-expense" title={<div className="flex items-center gap-2"><TrendingDown size={14} /><span>Saídas</span></div>} />
        </Tabs>
      </div>

      {/* 3. LIST OF ITEMS */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            {tab === 'cat-income' ? 'Categorias de Entrada' : 'Categorias de Saída'}
            <span className="ml-2 opacity-50">({currentItems.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-[32px] animate-pulse" />)
          ) : (
            currentItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                type={tab}
                onEdit={(item) => { setEditingItem(item); setModalOpen(true); }}
                onDelete={(id) => mDeleteCat.mutate(id)}
              />
            ))
          )}
        </div>

        {!isLoading && currentItems.length === 0 && (
          <Card className="bg-surface-900 border border-white/5 border-dashed rounded-[40px]">
            <CardBody className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                <LayoutGrid size={32} />
              </div>
              <p className="text-white/20 text-xs font-black uppercase tracking-widest">Vazio por aqui...</p>
              <Button
                variant="flat"
                className="bg-accent/10 text-accent font-black uppercase tracking-widest text-[9px] rounded-xl px-6"
                onPress={() => setModalOpen(true)}
              >
                Começar Agora
              </Button>
            </CardBody>
          </Card>
        )}
      </div>

      {modalOpen && (
        <ItemModal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          item={editingItem}
          type="category"
          categoryType={tab === 'cat-income' ? 'income' : 'expense'}
          onSave={handleSave}
          error={mutationError}
        />
      )}
    </div>
  );
}
