import { BookOpen, ExternalLink, Zap, Wifi, Home, Users, Shield, Key } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Accordion, AccordionItem, Card, CardBody, Button, Chip } from "@heroui/react";
import GlassCard from '../components/GlassCard';

export default function Docs() {
  const { connected } = useSocket() || {};
  const { isSuperAdmin } = useAuth();

  // Detecta o host da API para construir URL do Swagger
  const apiHost = window.location.hostname;
  const swaggerUrl = `http://${apiHost}:3001/api-docs`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={22} className="text-accent" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Documentação</h1>
        </div>
        <p className="text-sm text-white/40">
          Tudo sobre como o FinCas funciona — acesso, funcionalidades e métricas.
        </p>
      </div>

      {/* Status */}
      <GlassCard className="animate-slide-up">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-danger/50'}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80">
              {connected ? 'Conectado em tempo real' : 'WebSocket desconectado'}
            </p>
            <p className="text-xs text-white/30">
              {connected
                ? 'Atualizações aparecem instantaneamente.'
                : 'Reconectando automaticamente...'}
            </p>
          </div>
          <Wifi size={18} className={connected ? 'text-success' : 'text-white/20'} />
        </div>
      </GlassCard>

      {/* Swagger Link — only for super_admin */}
      {isSuperAdmin && (
        <a
          href={swaggerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block glass rounded-2xl p-6 hover:border-accent/20 transition-all duration-200 group animate-slide-up"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Zap size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white group-hover:text-accent-light transition-colors">
                Swagger UI
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Documentação técnica da API — apenas administradores do sistema.
              </p>
            </div>
            <ExternalLink size={20} className="text-white/20 group-hover:text-accent-light transition-colors" />
          </div>
        </a>
      )}

      {/* Info Accordion */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <Accordion variant="splitted" className="px-0">

          {/* 1. Como Acessar */}
          <AccordionItem
            key="1"
            aria-label="Como Acessar"
            title={<span className="text-sm font-semibold text-white/80">🏠 Como Acessar o FinCas</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <div className="space-y-3 text-xs text-white/50 pb-4 px-1">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Home size={12} className="text-accent" />
                </div>
                <div>
                  <p className="text-white/70 font-bold">1. Código da Casa</p>
                  <p>No primeiro acesso, digite o código da sua casa (ex: <span className="text-accent font-mono">ALVES-X79K</span>). Esse código vincula o dispositivo à sua família.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={12} className="text-accent" />
                </div>
                <div>
                  <p className="text-white/70 font-bold">2. Escolha seu Perfil</p>
                  <p>Após vincular, os perfis da sua casa aparecem. Toque no seu avatar para entrar.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Key size={12} className="text-accent" />
                </div>
                <div>
                  <p className="text-white/70 font-bold">3. Digite seu PIN</p>
                  <p>Use o teclado numérico para digitar seu PIN pessoal de 4 dígitos.</p>
                </div>
              </div>
              <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">💡 Dica</p>
                <p className="mt-1">Para trocar de casa, use o botão "Trocar Casa" na tela de login.</p>
              </div>
            </div>
          </AccordionItem>

          {/* 2. Papéis e Permissões */}
          <AccordionItem
            key="2"
            aria-label="Papéis e Permissões"
            title={<span className="text-sm font-semibold text-white/80">👥 Papéis e Permissões</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <div className="space-y-3 text-xs text-white/50 pb-4 px-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <Shield size={16} className="text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 font-bold">Administrador do Sistema</p>
                  <p>Gerencia todas as casas, cria novos espaços e pode resetar PINs de qualquer pessoa.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <Users size={16} className="text-cyan-400 shrink-0" />
                <div>
                  <p className="text-cyan-400 font-bold">Admin da Casa</p>
                  <p>Adiciona e remove membros na própria casa, edita perfis e redefine PINs.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Home size={16} className="text-white/40 shrink-0" />
                <div>
                  <p className="text-white/70 font-bold">Membro</p>
                  <p>Lança e visualiza as finanças da casa. Não pode gerenciar outros membros.</p>
                </div>
              </div>
            </div>
          </AccordionItem>

          {/* 3. Telas e Funcionalidades */}
          <AccordionItem
            key="3"
            aria-label="Guia de Uso"
            title={<span className="text-sm font-semibold text-white/80">📖 Telas e Funcionalidades</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <div className="space-y-4 text-xs text-white/50 pb-4 px-2">
              <div>
                <p className="text-white/70 font-bold mb-1 uppercase tracking-tighter">Telas Principais</p>
                <ul className="space-y-1">
                  <li>• <span className="text-accent-light">Dashboard:</span> Visão geral, saldo, comprometimento e últimos lançamentos.</li>
                  <li>• <span className="text-accent-light">Contas:</span> Lista de boletos e faturas. Filtre por pendentes ou pagos.</li>
                  <li>• <span className="text-accent-light">Cartões:</span> Gestão de limites, compras e faturas de cartões de crédito.</li>
                  <li>• <span className="text-accent-light">Metas:</span> Acompanhamento de objetivos de economia e progresso.</li>
                  <li>• <span className="text-accent-light">Orçamentos:</span> Limites de gastos por categoria com alertas visuais.</li>
                  <li>• <span className="text-accent-light">Categorias:</span> Organize seus gastos e entradas por tipo.</li>
                </ul>
              </div>

              <div>
                <p className="text-white/70 font-bold mb-1 uppercase tracking-tighter">Telas de Administração</p>
                <ul className="space-y-1">
                  <li>• <span className="text-red-400">Painel do Sistema:</span> Visível apenas para o administrador do sistema. Gerencia todas as casas.</li>
                  <li>• <span className="text-cyan-400">Gerenciar Família:</span> Visível para admins. Adicionar, editar e inativar membros da casa.</li>
                </ul>
              </div>
            </div>
          </AccordionItem>

          {/* 4. Métricas */}
          <AccordionItem
            key="4"
            aria-label="Entenda as Métricas"
            title={<span className="text-sm font-semibold text-white/80">📊 Entenda as Métricas</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <div className="space-y-3 text-xs text-white/50 pb-4 px-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-success font-bold">Economia:</span> 
                <span className="ml-1">Mostra quanto do seu dinheiro "sobrou" este mês em porcentagem (Saldo ÷ Entradas).</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-accent-light font-bold">Comprometimento:</span>
                <span className="ml-1">Porcentagem das suas entradas que já foram gastas. Acima de 80% é zona de alerta.</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-white/80 font-bold">Média/Dia:</span>
                <span className="ml-1">Quanto você gasta, em média, por dia neste mês.</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-warning font-bold">Projeção:</span>
                <span className="ml-1">Estimativa de gasto total do mês baseada na média diária atual.</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-accent-light font-bold">Dias Restantes:</span>
                <span className="ml-1">Contagem regressiva até o último dia do mês selecionado.</span>
              </div>
            </div>
          </AccordionItem>

          {/* 5. Tempo Real */}
          <AccordionItem
            key="5"
            aria-label="Tempo Real"
            title={<span className="text-sm font-semibold text-white/80">📡 Sincronização</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <ul className="space-y-1 text-xs text-white/50 pb-2">
              <li>• Dados sincronizados em tempo real entre todos os dispositivos da casa</li>
              <li>• Quando alguém lança um gasto, ele aparece instantaneamente para todos</li>
              <li>• O app funciona mesmo sem internet temporariamente (modo offline)</li>
              <li>• Ao reconectar, os dados são sincronizados automaticamente</li>
            </ul>
          </AccordionItem>

          {/* 6. Segurança — User-facing, no technical details */}
          <AccordionItem
            key="6"
            aria-label="Privacidade"
            title={<span className="text-sm font-semibold text-white/80">🔒 Privacidade e Segurança</span>}
            className="bg-white/5 border border-white/5 backdrop-blur-md"
          >
            <ul className="space-y-1 text-xs text-white/50 pb-2">
              <li>• Cada casa tem seus dados 100% isolados — ninguém de outra casa pode ver seus dados</li>
              <li>• O acesso requer o código da casa + PIN pessoal</li>
              <li>• Membros inativos perdem acesso mas o histórico é preservado</li>
              <li>• Casas suspensas bloqueiam todos os membros instantaneamente</li>
              <li>• Você pode alterar seu PIN a qualquer momento pelo menu de perfil</li>
              <li>• **Suporte Multimoeda:** Cada casa pode configurar sua própria moeda (Real, Dólar, Euro, etc).</li>
            </ul>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Version Badge */}
      <div className="flex justify-center pt-4 pb-8">
        <Chip size="sm" variant="flat" className="bg-white/5 text-white/20 text-[9px] font-black uppercase tracking-widest">
          FinCas v3.0 · International Multi-Tenant
        </Chip>
      </div>
    </div>
  );
}
