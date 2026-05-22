import { useState } from 'react';
// Categories management modal
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Pencil, Trash2, X, ChevronLeft, 
  TrendingUp, TrendingDown, LayoutGrid, MoreVertical, Shield
} from 'lucide-react';
import { api } from '../api/client';
import { 
  Card, CardBody, Button, Input, Tabs, Tab, 
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, 
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, 
  Popover, PopoverTrigger, PopoverContent, Divider
} from "@heroui/react";
import EmojiPicker, { Theme } from 'emoji-picker-react';

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
  '#111111',
];

function CategoryEditModal({ isOpen, onClose, category, type, onSave, error }) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#6366f1');
  const [emoji, setEmoji] = useState(category?.icon || '💰');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, icon: emoji, type });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" backdrop="blur" classNames={{ base: "bg-surface-950 border border-white/10 rounded-[40px] m-4", closeButton: "text-white/30 hover:text-white hover:bg-white/10 active:scale-90 transition-all rounded-full w-8 h-8 flex items-center justify-center mt-4 mr-4" }}>
      <ModalContent>
        <ModalHeader className="pt-8 px-8 flex flex-col gap-1">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">
            {category ? 'Editar' : 'Nova'} Categoria
          </h2>
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
            {type === 'income' ? 'Entrada' : 'Saída'}
          </p>
        </ModalHeader>
        <ModalBody className="py-6 px-8 gap-6">
          <div className="flex items-end gap-4">
            <Popover placement="bottom-start">
              <PopoverTrigger>
                <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl active:scale-90 transition-all">
                  {emoji}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 border-none bg-transparent">
                <EmojiPicker theme={Theme.DARK} onEmojiClick={(e) => setEmoji(e.emoji)} skinTonesDisabled width={280} height={350} />
              </PopoverContent>
            </Popover>
            <Input 
              label="Nome"
              placeholder="Ex: Alimentação"
              value={name}
              onValueChange={setName}
              variant="flat"
              labelPlacement="outside"
              classNames={{ 
                base: "flex-1", 
                label: "text-[10px] text-white/30 uppercase font-black tracking-widest",
                inputWrapper: "bg-white/5 border border-white/10 h-14 rounded-2xl" 
              }}
            />
          </div>
          <div>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_PALETTE.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`aspect-square rounded-lg ${color === c ? 'scale-110 ring-2 ring-white' : 'opacity-40'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && <p className="text-danger text-[10px] uppercase font-black text-center">{error}</p>}
        </ModalBody>
        <ModalFooter className="p-8 pt-0">
          <Button fullWidth onPress={handleSubmit} className="bg-accent text-black font-black h-14 rounded-2xl">Confirmar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function CategoriesModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('expense');
  const [editingCat, setEditingCat] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const mCreate = useMutation({
    mutationFn: (data) => api.createCategory(data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['categories'] }); 
      setShowEdit(false); 
    },
  });

  const mUpdate = useMutation({
    mutationFn: ({ id, ...data }) => api.updateCategory(id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['categories'] }); 
      setShowEdit(false); 
    },
  });

  const mDelete = useMutation({
    mutationFn: (id) => api.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const currentItems = categories.filter(c => c.type === tab);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="md" 
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        base: "bg-surface-900/60 border border-white/10 rounded-[40px] shadow-2xl backdrop-blur-3xl m-4",
        header: "border-b border-white/5 p-8",
        body: "p-0",
        closeButton: "hidden"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              isIconOnly 
              variant="flat" 
              onPress={onClose} 
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:scale-110 active:scale-95 transition-all text-white/40 hover:text-white"
            >
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Categorias</h2>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mt-1">Organizar Transações</p>
            </div>
          </div>
          <Button 
            isIconOnly 
            className="w-12 h-12 rounded-2xl bg-accent text-black shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all" 
            onPress={() => { setEditingCat(null); setShowEdit(true); }}
          >
            <Plus size={24} />
          </Button>
        </ModalHeader>
        <ModalBody>
          <div className="p-6 sticky top-0 bg-transparent backdrop-blur-md z-10">
            <Tabs 
              fullWidth
              selectedKey={tab} 
              onSelectionChange={setTab}
              classNames={{
                tabList: "bg-white/5 border border-white/5 p-1 rounded-2xl",
                cursor: tab === 'income' ? "!bg-success" : "!bg-danger",
                tabContent: "group-data-[selected=true]:text-black font-black uppercase tracking-widest text-[9px]"
              }}
            >
              <Tab key="income" title="Entradas" />
              <Tab key="expense" title="Saídas" />
            </Tabs>
          </div>

          <div className="px-6 pb-20 space-y-3">
            {isLoading ? (
              [1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
            ) : currentItems.map(cat => (
              <div key={cat.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${cat.color}20`, color: cat.color }}>
                  {cat.icon || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white uppercase truncate">{cat.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button isIconOnly variant="light" size="sm" className="text-white/20" onPress={() => { setEditingCat(cat); setShowEdit(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button isIconOnly variant="light" size="sm" className="text-danger/40" onPress={() => mDelete.mutate(cat.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ModalBody>

        <CategoryEditModal 
          isOpen={showEdit} 
          onClose={() => setShowEdit(false)} 
          category={editingCat}
          type={tab}
          onSave={(data) => editingCat ? mUpdate.mutate({ id: editingCat.id, ...data }) : mCreate.mutate(data)}
        />
      </ModalContent>
    </Modal>
  );
}
