import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children, openAddModal, confirmPaid }) => {
  return (
    <ModalContext.Provider value={{ openAddModal, confirmPaid }}>
      {children}
    </ModalContext.Provider>
  );
};
