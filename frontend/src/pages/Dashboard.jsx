import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, ArrowDownRight,
  BarChart3, CalendarDays,
  AlertTriangle, RefreshCw, CreditCard, Target, Clock, Landmark,
  Flame, Gauge, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useModals } from '../context/ModalContext';
import SegmentedProgress from '../components/SegmentedProgress';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import {
  Card, CardBody, Button, Progress,
  Chip
} from "@heroui/react";
import PageHeader from '../components/PageHeader';
import MonthPicker from '../components/MonthPicker';
import KPI from '../components/KPI';
import KPIGroup from '../components/KPIGroup';
import TrendChip from '../components/TrendChip';

import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

// --- Error Banner -----------------------------------------
function ErrorBanner({ error, onRetry }) {
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    api.addLog({ level: 'error', source: 'dashboard', message: error, details: { url: window.location.href } }).catch(() => { });
  }, [error]);

  return (
    <Card className="bg-danger/10 border border-danger/20">
      <CardBody className="p-4 gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-danger" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">Erro ao carregar dados</p>
            <p className="text-xs text-white/40 mt-0.5">{error}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" onClick={onRetry} startContent={<RefreshCw size={14} />}>
            Tentar Novamente
          </Button>
          <Button size="sm" variant="light" color="danger" onClick={() => setShowLog(!showLog)}>
            Ver Log
          </Button>
        </div>
        {showLog && (
          <div className="mt-2 p-3 rounded-xl bg-black/50 text-[10px] text-white/50 font-mono overflow-auto max-h-32">
            {error}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// --- Breakdown Chart --------------------------------------
function BreakdownChart({ data, totalIncome, currency = 'BRL' }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-white/30 text-sm">Nenhum gasto registrado</div>;
  }
  
  const chartData = data.slice(0, 5).map(item => ({
    name: item.name,
    total: Number(item.total),
    color: item.color,
    icon: item.icon
  }));

  return (
    <div className="space-y-8">
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }}
              interval={0}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{item.icon}</span>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{item.name}</p>
                      </div>
                      <p className="text-sm font-black text-white">{formatCurrencyUtil(item.total, currency)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Evolution Chart --------------------------------------
function EvolutionChart({ data, currency = 'BRL' }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-white/30 text-sm">Carregando dados historicos...</div>;
  }

  const chartData = data.map(d => {
    const [year, month] = d.month.split('-');
    const date = new Date(year, month - 1);
    const label = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    return {
      ...d,
      name: label,
      income: Number(d.income),
      expense: Number(d.expense)
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[9px] font-bold text-success uppercase">Entradas</span>
              <span className="text-xs font-black text-white">{formatCurrencyUtil(payload[0].value, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[9px] font-bold text-danger uppercase">Saidas</span>
              <span className="text-xs font-black text-white">{formatCurrencyUtil(payload[1].value, currency)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full min-w-0 mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" animationDuration={1500} />
          <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionSkeleton({ height = "h-40", className = "", delay = "0ms" }) {
  return (
    <div 
      className={`bg-white/5 rounded-[40px] border border-white/10 skeleton-pulse animate-load-vertical ${height} ${className}`} 
      style={{ animationDelay: delay }}
    />
  );
}

export default function Dashboard() {
  const { user, currency, currencySymbol, valuesHidden } = useAuth();
  const formatCurrency = (v) => valuesHidden ? '••••' : formatCurrencyUtil(v, currency);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedMonth = searchParams.get('month') || nowStr;

  const { data: summary, isLoading: loadingSummary, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard', 'summary', selectedMonth],
    queryFn: () => api.getSummary({ month: selectedMonth, user_id: user?.id }),
  });

  const { data: breakdown } = useQuery({
    queryKey: ['dashboard', 'breakdown', selectedMonth],
    queryFn: () => api.getBreakdown({ month: selectedMonth, user_id: user?.id }),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', selectedMonth],
    queryFn: () => api.getBudgets({ user_id: user?.id, month: selectedMonth }),
  });

  const { data: pending = [] } = useQuery({
    queryKey: ['dashboard-pending', selectedMonth],
    queryFn: () => api.getTransactions({ month: selectedMonth, is_paid: false, user_id: user?.id }),
  });

  const { data: evolution = [] } = useQuery({
    queryKey: ['dashboard-evolution', user?.id],
    queryFn: () => api.getEvolution({ user_id: user?.id }),
  });

  const isLoading = (loadingSummary && !summary);

  const totalBudgetRemaining = budgets.reduce((acc, b) => acc + Number(b.remaining || 0), 0);
  const totalCanSpendToday = budgets.reduce((acc, b) => acc + (b.percentage < 100 ? Number(b.per_day || 0) : 0), 0);
  const avgBurnRate = budgets.length > 0 ? budgets.reduce((acc, b) => acc + Number(b.percentage || 0), 0) / budgets.length : 0;
  const criticalBudgets = budgets.filter(b => b.percentage >= 90).length;
  const warningBudgets = budgets.filter(b => b.percentage >= 75 && b.percentage < 90).length;

  const income = Number(summary?.total_income || 0);
  const expense = Number(summary?.total_expense || 0);
  const balance = Number(summary?.balance || 0);
  const comprometimento = income > 0 ? (expense / income) * 100 : 0;
  const economia = income > 0 ? (balance / income) * 100 : 0;

  const lastTx = summary?.last_transaction;
  const lastDelta = lastTx ? (lastTx.type === 'income' ? Number(lastTx.amount) : -Number(lastTx.amount)) : 0;
  const prevBal = balance - lastDelta;

  let trendVal = 0;
  let trendDir = 'neutral';
  if (prevBal !== 0 && lastDelta !== 0) {
    trendVal = (lastDelta / Math.abs(prevBal)) * 100;
    trendDir = trendVal > 0 ? 'up' : trendVal < 0 ? 'down' : 'neutral';
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <PageHeader title="Dashboard">
        <MonthPicker currentMonth={selectedMonth} onChange={(m) => navigate(`/?month=${m}`)} />
      </PageHeader>

      {summaryError && <ErrorBanner error={summaryError.message} onRetry={() => refetchSummary()} />}

      {isLoading ? (
        <SectionSkeleton height="h-[220px]" className="mb-6" />
      ) : (
        <>
          <KPI className="mb-4 border-accent/30 shadow-[0_20px_50px_rgba(198,241,80,0.1)] !overflow-visible">
            <KPI.Header>
              <KPI.Icon status="success"><Landmark size={20} /></KPI.Icon>
              <KPI.Title>Saldo Disponivel</KPI.Title>
            </KPI.Header>
            <KPI.Content className="items-center justify-center py-6 sm:py-10 px-6 !overflow-visible">
              <div className="relative flex items-center justify-center w-fit max-w-full">
                <KPI.Value value={balance} prefix={`${currencySymbol} `} className="text-3xl sm:text-5xl whitespace-nowrap" />
                {trendVal !== 0 && (
                  <div className="absolute left-[calc(100%+8px)] -translate-y-1/2 mt-1 z-10">
                    <TrendChip trend={trendDir} variant="soft" size="sm" className="shadow-lg">
                      <TrendChip.Prefix>{trendVal >= 0 ? '+' : ''}</TrendChip.Prefix>
                      {Math.abs(trendVal).toFixed(0)}%
                    </TrendChip>
                  </div>
                )}
              </div>
              {balance < 0 && (
                <Chip size="sm" variant="flat" color="danger" className="mt-4 animate-pulse uppercase font-black text-[9px]">
                  Atencao: Saldo Negativo
                </Chip>
              )}
            </KPI.Content>
          </KPI>

          <KPIGroup className="mb-6 !overflow-visible">
            <KPI className="flex-1 bg-transparent border-none shadow-none hover:border-transparent !overflow-visible">
              <KPI.Header>
                <KPI.Icon status="success"><TrendingUp size={20} /></KPI.Icon>
                <KPI.Title>Entradas</KPI.Title>
              </KPI.Header>
              <KPI.Content className="pb-6 px-4 !overflow-visible">
                <KPI.Value value={income} prefix={`${currencySymbol} `} className="text-xl sm:text-3xl whitespace-nowrap" />
              </KPI.Content>
            </KPI>
            <KPIGroup.Separator />
            <KPI className="flex-1 bg-transparent border-none shadow-none hover:border-transparent !overflow-visible">
              <KPI.Header>
                <KPI.Icon status="danger"><TrendingDown size={20} /></KPI.Icon>
                <KPI.Title>Saidas</KPI.Title>
              </KPI.Header>
              <KPI.Content className="pb-6 px-4 !overflow-visible">
                <KPI.Value value={expense} prefix={`${currencySymbol} `} className="text-xl sm:text-3xl whitespace-nowrap" />
              </KPI.Content>
            </KPI>
          </KPIGroup>
        </>
      )}

      <div className="flex flex-col gap-4 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isLoading ? (
            <><SectionSkeleton height="h-24" /><SectionSkeleton height="h-24" /></>
          ) : (
            <>
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="success"><CreditCard size={18} /></KPI.Icon>
                  <KPI.Title>Limite Disponivel</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={(summary?.total_card_limit || 0) - (summary?.total_card_used || 0)} prefix={`${currencySymbol} `} />
                </KPI.Content>
                <KPI.Footer>Total Cartao: {formatCurrency(summary?.total_card_limit || 0)}</KPI.Footer>
              </KPI>
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="success"><Target size={18} /></KPI.Icon>
                  <KPI.Title>Metas Acumuladas</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={summary?.total_saved || 0} prefix={`${currencySymbol} `} />
                </KPI.Content>
                <KPI.Progress value={(summary?.total_saved / (summary?.total_target || 1)) * 100} />
              </KPI>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isLoading ? (
            <><SectionSkeleton height="h-24" /><SectionSkeleton height="h-24" /></>
          ) : (
            <>
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="danger"><TrendingDown size={18} /></KPI.Icon>
                  <KPI.Title>Limite Usado</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={summary?.total_card_used || 0} prefix={`${currencySymbol} `} />
                </KPI.Content>
                <KPI.Progress status="danger" value={(summary?.total_card_used / (summary?.total_card_limit || 1)) * 100} />
              </KPI>
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="warning"><CalendarDays size={18} /></KPI.Icon>
                  <KPI.Title>Falta para Metas</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={Math.max(0, (summary?.total_target || 0) - (summary?.total_saved || 0))} prefix={`${currencySymbol} `} />
                </KPI.Content>
                <KPI.Footer>Objetivo Total: {formatCurrency(summary?.total_target || 0)}</KPI.Footer>
              </KPI>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <SectionSkeleton height="h-80" />
        ) : (
          <Card className="bg-black/40 backdrop-blur-xl border border-accent/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/3 pointer-events-none opacity-30" />
            <CardBody className="p-8">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40"><TrendingUp size={20} /></div>
                  <div><h2 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Historico Mensal</h2><p className="text-[9px] text-white/20 uppercase font-bold">Evolucao dos ultimos 6 meses</p></div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Entradas</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger" /><span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Saidas</span></div>
                </div>
              </div>
              <EvolutionChart data={evolution} currency={currency} />
            </CardBody>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <><SectionSkeleton height="h-28" /><SectionSkeleton height="h-28" /></>
          ) : (
            <>
              {/* Entradas e Saidas movidos para o KPIGroup no topo */}
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="warning"><Clock size={18} /></KPI.Icon>
                  <KPI.Title>Contas Pendentes</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={summary?.pending_bills_amount || 0} prefix={`${currencySymbol} `} />
                </KPI.Content>
                <KPI.Footer>{summary?.pending_bills_count || 0} contas este mes</KPI.Footer>
              </KPI>
              <KPI>
                <KPI.Header>
                  <KPI.Icon status="primary"><Flame size={18} /></KPI.Icon>
                  <KPI.Title>Gasto Diario Medio</KPI.Title>
                </KPI.Header>
                <KPI.Content>
                  <KPI.Value value={expense / 30} prefix={`${currencySymbol} `} />
                </KPI.Content>
              </KPI>
            </>
          )}
        </div>

        {isLoading ? (
          <SectionSkeleton height="h-64" />
        ) : (
          <Card className="bg-black/40 backdrop-blur-xl border border-accent/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-50" />
            <CardBody className="p-8">
              <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/10 text-accent"><BarChart3 size={20} /></div><div><h2 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Desempenho</h2><p className="text-[9px] text-accent/30 uppercase font-bold">Saude Financeira</p></div></div>
              <div className="flex flex-row items-center justify-center gap-8 py-4">
                <div className="flex flex-col items-center gap-4"><SegmentedProgress value={comprometimento} label="GASTOS" primaryColor={comprometimento > 80 ? "#f87171" : "#c6f150"} size={130} /><Chip size="sm" variant="flat" className={`font-black text-[8px] ${comprometimento < 50 ? 'bg-success/20 text-success' : comprometimento < 80 ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger animate-pulse'}`}>{comprometimento < 50 ? 'Saudavel' : comprometimento < 80 ? 'Alerta' : 'Critico'}</Chip></div>
                <div className="flex flex-col items-center gap-4"><SegmentedProgress value={economia} label="POUPANCA" primaryColor="#3b82f6" size={130} /><Chip size="sm" variant="flat" className={`font-black text-[8px] ${economia >= 20 ? 'bg-success/20 text-success' : economia >= 10 ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>{economia >= 20 ? 'Excelente' : economia >= 10 ? 'Bom' : 'Baixo'}</Chip></div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {isLoading ? (
          <SectionSkeleton height="h-80" />
        ) : (
          <Card className="bg-black/40 backdrop-blur-xl border border-accent/10 shadow-2xl relative overflow-hidden">
            <CardBody className="p-8">
              <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center border border-danger/10 text-danger"><ArrowDownRight size={20} /></div><h2 className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Por Categoria</h2></div><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-accent/60 border border-accent/10">{breakdown?.length || 0}</div></div>
              <BreakdownChart data={breakdown} totalIncome={income} currency={currency} />
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          {isLoading ? (
            <><SectionSkeleton height="h-28" /><SectionSkeleton height="h-28" /><SectionSkeleton height="h-28" /><SectionSkeleton height="h-28" /></>
          ) : (
            [
              { label: 'Disponivel Hoje', value: totalCanSpendToday, status: totalCanSpendToday > 0 ? 'success' : 'danger', icon: Flame },
              { label: 'Burn Rate Medio', value: avgBurnRate, status: avgBurnRate > 90 ? 'danger' : avgBurnRate > 70 ? 'warning' : 'success', icon: Gauge, suffix: '%' },
              { label: 'Folego p/ Mes', value: totalBudgetRemaining, status: 'success', icon: Landmark },
              { label: 'Limites Ativos', value: budgets.length, status: 'warning', icon: ShieldCheck, decimals: 0 },
            ].map((s, idx) => (
              <KPI key={idx}><KPI.Header><KPI.Icon status={s.status}><s.icon size={14} /></KPI.Icon><KPI.Title>{s.label}</KPI.Title></KPI.Header><KPI.Content><KPI.Value value={s.value} prefix={s.suffix ? '' : `${currencySymbol} `} suffix={s.suffix || ''} decimals={s.decimals !== undefined ? s.decimals : 2} /></KPI.Content></KPI>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center text-warning border border-warning/10"><Clock size={16} /></div><h2 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Pendencias</h2></div>
            <div className="space-y-3">
              {pending.slice(0, 4).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-white/90 truncate">{p.description}</p><p className="text-[9px] text-white/30 uppercase font-black">{p.category_name}</p></div><p className="text-xs font-black text-danger ml-2">{formatCurrency(p.amount, currency)}</p></div>
              ))}
              {pending.length === 0 && <p className="text-center py-4 text-[10px] text-white/20 uppercase font-black">Nenhuma pendencia</p>}
            </div>
          </CardBody>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center gap-3 mb-6"><div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${criticalBudgets > 0 ? 'bg-danger/20 text-danger border-danger/10' : 'bg-success/20 text-success border-success/10'}`}>{criticalBudgets > 0 ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}</div><h2 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Saude dos Limites</h2></div>
            <div className="flex flex-col items-center justify-center py-4 gap-4">
              <div className="text-center"><p className="text-[9px] text-white/30 uppercase font-black mb-1">Status do Planejamento</p><h4 className={`text-2xl font-black tracking-tighter ${criticalBudgets > 0 ? 'text-danger' : 'text-accent'}`}>{criticalBudgets > 0 ? `${criticalBudgets} Limite(s) Critico(s)` : 'Tudo sob controle'}</h4><p className="text-[8px] text-white/20 uppercase font-black mt-1">{warningBudgets > 0 ? `${warningBudgets} em atencao` : 'Nenhum estouro proximo'}</p></div>
              <div className="w-full space-y-2 mt-4"><div className="flex justify-between text-[9px] font-black uppercase text-white/40"><span>Uso Geral dos Orcamentos</span><span>{Math.round(avgBurnRate)}%</span></div><Progress size="sm" value={avgBurnRate} aria-label="Uso geral dos budgets" className="h-1.5" classNames={{ indicator: avgBurnRate > 90 ? 'bg-danger' : avgBurnRate > 75 ? 'bg-warning' : 'bg-accent' }} /></div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
