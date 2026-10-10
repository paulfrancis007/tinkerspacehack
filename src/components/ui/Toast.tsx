"use client";

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle className="text-primary" size={24} />,
    error: <AlertCircle className="text-destructive" size={24} />,
    info: <Info className="text-accent" size={24} />
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="bg-panel border border-foreground/10 shadow-lg rounded-xl p-4 flex gap-4 items-start w-full max-w-sm pointer-events-auto"
      role="alert"
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-foreground">{toast.title}</h4>
        {toast.description && (
          <p className="text-sm text-foreground/70 mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-foreground/50 hover:text-foreground transition-colors p-1 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// Global Toast Container (in a real app this would be driven by context or Zustand)
export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[], onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 left-0 md:left-auto p-4 z-50 flex flex-col gap-2 pointer-events-none pb-[100px] md:pb-4 safe-area-bottom">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
