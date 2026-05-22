import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const s = io({
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    s.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      setConnected(true);
      s.emit('join', user?.id);
    });

    s.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
      setConnected(false);
    });

    // ─── Real-time events → invalidate React Query caches ────
    s.on('transaction:created', () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    });

    s.on('transaction:deleted', () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    });

    s.on('bank:updated', () => qc.invalidateQueries({ queryKey: ['manage-banks'] }));
    s.on('category:updated', () => qc.invalidateQueries({ queryKey: ['manage-categories'] }));
    s.on('user:updated', () => qc.invalidateQueries({ queryKey: ['profile'] }));

    s.on('goal:updated', () => qc.invalidateQueries({ queryKey: ['goals'] }));
    s.on('bill:updated', () => qc.invalidateQueries({ queryKey: ['bills'] }));

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
