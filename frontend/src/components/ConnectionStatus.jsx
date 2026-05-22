import { Wifi, WifiOff, Database, Cloud, RefreshCw, Zap, ZapOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useSocket } from '../context/SocketContext';

export default function ConnectionStatus() {
  const { connected: socketConnected } = useSocket() || { connected: false };
  const { data: health, isError, status } = useQuery({
    queryKey: ['ping'],
    queryFn: () => api.health(),
    refetchInterval: 10000,
    retry: 3, // Tenta algumas vezes antes de dar erro definitivo
    staleTime: 5000,
  });

  const apiOnline = status === 'success' && !isError;
  const dbOnline = apiOnline && health?.database === 'connected';
  const allSystemsGo = apiOnline && dbOnline && socketConnected;

  return (
    <Popover placement="bottom-end" backdrop="blur">
      <PopoverTrigger>
        <Button 
          variant="flat" 
          size="sm"
          className="bg-white/5 border border-white/10 rounded-full h-8 min-w-0 px-3"
          startContent={
            <div className={`w-2 h-2 rounded-full ${allSystemsGo ? 'bg-success animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : (apiOnline ? 'bg-warning' : 'bg-danger')} shadow-[0_0_8px_rgba(248,113,113,0.5)]`} />
          }
        >
          <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
            {allSystemsGo ? 'Online' : (apiOnline ? 'Alerta' : 'Offline')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 border-none bg-transparent">
        <Card className="bg-surface-800/90 border border-white/10 backdrop-blur-xl shadow-2xl w-64">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Status do Sistema</h4>
              {isFetching && <RefreshCw size={12} className="text-accent animate-spin" />}
            </div>
            
            <div className="space-y-4">
              {/* API Server */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${apiOnline ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {apiOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Servidor API</p>
                  <p className="text-[10px] text-white/40">{apiOnline ? 'Conectado e operante' : 'Inacessível no momento'}</p>
                </div>
              </div>
              
              {/* Database */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dbOnline ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  <Database size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Banco de Dados</p>
                  <p className="text-[10px] text-white/40">{dbOnline ? 'Conexão ativa' : 'Falha na conexão'}</p>
                </div>
              </div>

              {/* WebSocket */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${socketConnected ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/20'}`}>
                  {socketConnected ? <Zap size={18} /> : <ZapOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">WebSocket</p>
                  <p className="text-[10px] text-white/40">{socketConnected ? 'Sincronização em tempo real' : 'Sincronização inativa'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <p className="text-[9px] text-white/20">Última verificação: {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
