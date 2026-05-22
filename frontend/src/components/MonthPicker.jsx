import React from 'react';
import { 
  Button, Popover, PopoverTrigger, PopoverContent
} from "@heroui/react";
import { CalendarDays, MapPin } from 'lucide-react';

export default function MonthPicker({ currentMonth, onChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [year, month] = currentMonth.split('-').map(Number);
  // Format: "Jan. 2026"
  const dateObj = new Date(year, month - 1);
  const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
  const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const months = [];
  const startMonthDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const endMonthDate = new Date(now.getFullYear(), now.getMonth() + 36, 1);
  
  let curr = new Date(startMonthDate);
  while (curr <= endMonthDate) {
    months.push({
      value: `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`,
      label: curr.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace(' de ', ' '),
      year: curr.getFullYear()
    });
    curr.setMonth(curr.getMonth() + 1);
  }

  const scrollContainerRef = React.useRef(null);

  // Scroll to active month when opening
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeItem = scrollContainerRef.current?.querySelector('[data-selected="true"]');
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 100);
    }
  }, [isOpen]);

  return (
    <div className="flex items-center">
      <Popover 
        backdrop="blur" 
        isOpen={isOpen} 
        onOpenChange={setIsOpen} 
        placement="bottom-end"
        offset={10}
        shouldCloseOnScroll={false}
      >
        <PopoverTrigger>
          <Button 
            variant="flat" 
            size="sm"
            className="bg-white/5 border border-white/10 text-white/90 font-black uppercase tracking-[0.1em] text-[10px] h-8 px-4 rounded-xl hover:bg-white/10 transition-all"
            startContent={<CalendarDays size={14} className="text-accent" />}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-surface-900 border border-white/10 rounded-[32px] overflow-hidden w-64 shadow-2xl">
          <div className="relative h-[450px] flex flex-col">
            {/* Header do Picker */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
              <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em]">Selecionar Período</p>
            </div>

            {/* Scrollable List */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar pb-24"
            >
              {months.map((m, idx) => {
                const isSelected = m.value === currentMonth;
                const [mLabel, yLabel] = m.label.split(' ');
                
                return (
                  <button
                    key={m.value}
                    data-selected={isSelected}
                    onClick={() => {
                      onChange(m.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-5 py-4 rounded-2xl transition-all flex items-center justify-between group border ${
                      isSelected 
                        ? 'bg-accent border-accent text-black font-black shadow-[0_0_20px_rgba(198,241,80,0.2)] scale-[1.02]' 
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="capitalize text-xs font-black tracking-tight flex items-center gap-2">
                      {mLabel}
                    </span>
                    <span className={`text-[10px] font-black tracking-widest ${isSelected ? 'opacity-60' : 'opacity-20'}`}>
                      {yLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fixed Footer Overlay (Current Month) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-900 via-surface-900/95 to-transparent pt-12">
              <Button
                fullWidth
                size="lg"
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] h-14 rounded-2xl shadow-xl backdrop-blur-xl transition-all active:scale-95 group overflow-hidden"
                startContent={
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <div className="absolute inset-0 bg-accent/40 rounded-full animate-ping" />
                    <div className="relative w-2 h-2 rounded-full bg-accent" />
                  </div>
                }
                onPress={() => {
                  onChange(nowStr);
                  setIsOpen(false);
                }}
              >
                Mês Atual
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
