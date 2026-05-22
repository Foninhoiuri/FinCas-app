import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from "@heroui/react";

if (typeof HeroUIProvider === 'undefined') {
  console.error("ERRO: HeroUIProvider está undefined! Verifique as dependências.");
  alert("ERRO: HeroUIProvider não encontrado. O app pode falhar.");
}
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AlertProvider } from './context/AlertContext';
import App from './App';
import './index.css';

// Diagnóstico de erro fatal
window.addEventListener('error', (event) => {
  const msg = `ERRO FATAL: ${event.message} em ${event.filename}:${event.lineno}`;
  console.error(msg);
  alert(msg);
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = `PROMISE REJECTED: ${event.reason}`;
  console.error(msg);
  alert(msg);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <AlertProvider>
                <App />
              </AlertProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HeroUIProvider>
  </React.StrictMode>
);

// ─── Service Worker Registration ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registrado:', reg.scope);

        // Quando volta online, reenvia mutations pendentes
        window.addEventListener('online', () => {
          reg.active?.postMessage('REPLAY_QUEUE');
        });

        // Ouve mensagens do SW (sync complete)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_COMPLETE') {
            console.log(`[SW] ${event.data.count} mutations sincronizadas!`);
            // Invalida todos os caches do React Query
            queryClient.invalidateQueries();
          }
        });
      })
      .catch((err) => console.warn('[SW] Falha:', err));
  });
}
