import React, { createContext, useContext, useState, useCallback } from 'react';
import { Button } from "@heroui/button";
import { AnimatePresence, motion } from "framer-motion";

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  // status: "default" | "accent" | "success" | "warning" | "danger"
  const showAlert = useCallback((title, description = '', status = 'default') => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { id, title, description, status }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto"
            >
              <div className={`p-4 rounded-xl border shadow-2xl flex items-center justify-between pointer-events-auto bg-surface-900 border-white/10 ${
                alert.status === 'danger' ? 'border-danger/50' : 
                alert.status === 'success' ? 'border-success/50' : 
                'border-white/10'
              }`}>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{alert.title}</p>
                  {alert.description && (
                    <p className="text-white/60 text-xs mt-0.5">{alert.description}</p>
                  )}
                </div>
                <Button 
                  isIconOnly 
                  size="sm" 
                  variant="light" 
                  className="min-w-0 text-white/50 hover:text-white ml-4"
                  onPress={() => removeAlert(alert.id)}
                >
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
