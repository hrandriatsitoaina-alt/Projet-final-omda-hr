// src/components/Toast.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

let toastRootEl = null;
let providerInstances = 0; // détecte les <ToastProvider> montés en double

function getToastRootEl() {
  if (typeof document === 'undefined') return null;
  if (toastRootEl && document.body.contains(toastRootEl)) return toastRootEl;

  let el = document.getElementById('toast-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-root';
    document.body.appendChild(el);
  }
  // ⚠️ Taille réelle (inset:0), jamais width:0/height:0 : les conteneurs de
  // taille nulle provoquent des bugs de hit-testing dans Electron/Chromium
  // après des mutations DOM répétées.
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'z-index:2147483647',
  ].join(';');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'false');
  toastRootEl = el;
  return toastRootEl;
}

// ⚠️ LE VRAI FIX : demande au processus main d'Electron de faire un cycle
// setEnabled(false)/setEnabled(true) sur la fenêtre, ce qui force le focus
// clavier natif OS à revenir — c'est l'équivalent exact d'un resize.
// Détecte automatiquement le mode d'exposition (preload/contextBridge OU
// nodeIntegration direct) et se rabat sur le simple reflow CSS si aucun des
// deux n'est disponible (ex: build web hors Electron).
function nativeRefocus() {
  try {
    if (typeof window !== 'undefined' && window.electronFocusFix?.refocus) {
      window.electronFocusFix.refocus();
      return true;
    }
    if (typeof window !== 'undefined' && window.electronAPI?.refocusWindow) {
      window.electronAPI.refocusWindow();
      return true;
    }
    // Cas nodeIntegration: true, contextIsolation: false (require direct dans le renderer)
    // eslint-disable-next-line global-require
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (ipcRenderer) {
      ipcRenderer.send('force-refocus-window');
      return true;
    }
  } catch (e) {
    // pas dans Electron, ou API non exposée — on se rabat sur le CSS
  }
  return false;
}

// Repli CSS (utile hors Electron, ou en complément) — ne répare PAS le
// focus natif OS à lui seul, mais aide au repaint visuel.
function cssReflow() {
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    const b = document.body;
    if (!b) return;
    const prev = b.style.transform;
    b.style.transform = 'translateZ(0)';
    // eslint-disable-next-line no-unused-expressions
    b.offsetHeight; // lecture = force le reflow
    requestAnimationFrame(() => {
      b.style.transform = prev;
    });
  });
}

export function forceReflow() {
  const usedNativeFix = nativeRefocus();
  cssReflow();
  if (!usedNativeFix && typeof window !== 'undefined' && window.__IS_ELECTRON__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[forceReflow] electronFocusFix non trouvé — ajoute le handler IPC ' +
      '"force-refocus-window" dans main.js et expose-le via preload.js ' +
      '(voir main-snippet.js / preload-snippet.js).'
    );
  }
}

const ToastItem = memo(function ToastItem({ toast, onClose }) {
  const Icon =
    toast.type === 'success' ? CheckCircle :
    toast.type === 'error'   ? XCircle :
    AlertCircle;

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="status"
      style={{ pointerEvents: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => onClose(toast.id)}
    >
      <Icon size={18} />
      <span>{toast.message}</span>
    </div>
  );
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    providerInstances += 1;
    if (providerInstances > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Toast] Plusieurs <ToastProvider> sont montés simultanément. ' +
        'Ne le mets qu\'UNE seule fois, à la racine de l\'app (App.jsx). ' +
        'Deux providers qui se disputent le même DOM #toast-root cassent ' +
        'le hit-testing des inputs dans Electron.'
      );
    }
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      providerInstances -= 1;
    };
  }, []);

  const removeToast = useCallback((id) => {
    if (!isMountedRef.current) return;
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) forceReflow();
      return next;
    });
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, type = 'error') => {
      if (!message || !isMountedRef.current) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => removeToast(id), 4000);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const portalContent = useMemo(() => {
    if (toasts.length === 0) return null;
    return (
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          maxWidth: 'min(420px, calc(100vw - 32px))',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    );
  }, [toasts, removeToast]);

  const rootEl = typeof document !== 'undefined' ? getToastRootEl() : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {portalContent && rootEl ? createPortal(portalContent, rootEl) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return (message, type = 'error') => {
      // eslint-disable-next-line no-console
      console.warn(`[Toast ${type}]`, message);
    };
  }
  return ctx;
}