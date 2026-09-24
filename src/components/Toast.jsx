// src/components/Toast.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

// ✅ Conteneur DOM unique pour toute l'app, créé une seule fois.
// Ne dépend d'aucun composant qui se monte/démonte (Authentification, AdminPanel...).
let toastRootEl = null;
function getToastRootEl() {
  if (!toastRootEl) {
    toastRootEl = document.getElementById('toast-root');
    if (!toastRootEl) {
      toastRootEl = document.createElement('div');
      toastRootEl.id = 'toast-root';
      document.body.appendChild(toastRootEl);
    }
  }
  return toastRootEl;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message, type = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => removeToast(id), 4000);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {createPortal(
        <div
          className="toast-container"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 999999,
            pointerEvents: 'none', // ✅ ne bloque jamais les clics/focus quand vide
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast toast-${t.type}`}
              style={{ pointerEvents: 'auto' }}
            >
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <XCircle size={18} />}
              {t.type === 'info' && <AlertCircle size={18} />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        getToastRootEl()
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return (message, type = 'error') => {
      console.warn(`[Toast ${type}]`, message);
    };
  }
  return ctx;
}