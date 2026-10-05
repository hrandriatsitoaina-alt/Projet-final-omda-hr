// src/components/ConfirmDialog.jsx
//
// ⚠️ POURQUOI CE FICHIER EXISTE ⚠️
// window.confirm() et window.alert() sont des dialogues NATIFS bloquants.
// Dans Electron, après leur fermeture, le renderer ne récupère pas toujours
// le focus clavier au niveau OS : la fenêtre semble active mais plus aucun
// <input> ne reçoit de frappe tant qu'un vrai événement de focus OS n'arrive
// pas (ex: redimensionner la fenêtre). C'est la cause root du bug "impossible
// de taper dans les inputs après avoir confirmé une action".
//
// Solution : ne JAMAIS utiliser confirm()/alert() dans une app Electron.
// On les remplace par des modales React 100% dans notre contrôle, plus un
// forceReflow() de sécurité à chaque fermeture.

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
  } from 'react';
  import { createPortal } from 'react-dom';
  import { AlertTriangle, Info, X } from 'lucide-react';
  import { forceReflow } from './Toast';
  
  const ConfirmContext = createContext(null);
  
  let confirmRootEl = null;
  function getConfirmRootEl() {
    if (typeof document === 'undefined') return null;
    if (confirmRootEl && document.body.contains(confirmRootEl)) return confirmRootEl;
    let el = document.getElementById('confirm-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'confirm-root';
      document.body.appendChild(el);
    }
    confirmRootEl = el;
    return confirmRootEl;
  }
  
  export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null); // { message, title, danger, resolve }
    const [alertDialog, setAlertDialog] = useState(null); // { message, title, resolve }
    const activeElRef = useRef(null);
  
    // ── confirm(message) -> Promise<boolean> ──────────────────────
    const confirm = useCallback((message, options = {}) => {
      activeElRef.current = document.activeElement;
      return new Promise((resolve) => {
        setDialog({
          message,
          title: options.title || null,
          danger: !!options.danger,
          confirmLabel: options.confirmLabel,
          cancelLabel: options.cancelLabel,
          resolve,
        });
      });
    }, []);
  
    // ── alertUser(message) -> Promise<void> (remplace alert()) ────
    const alertUser = useCallback((message, options = {}) => {
      return new Promise((resolve) => {
        setAlertDialog({
          message,
          title: options.title || null,
          resolve,
        });
      });
    }, []);
  
    const closeAndRefocus = useCallback(() => {
      // ⚠️ Le point critique : on force un reflow ET on retente de refocaliser
      // l'élément qui avait le focus avant l'ouverture de la modale.
      forceReflow();
      requestAnimationFrame(() => {
        document.body.focus?.();
        const el = activeElRef.current;
        if (el && document.body.contains(el) && typeof el.focus === 'function') {
          el.focus();
        }
        activeElRef.current = null;
      });
    }, []);
  
    const handleConfirm = useCallback((result) => {
      setDialog((current) => {
        current?.resolve?.(result);
        return null;
      });
      closeAndRefocus();
    }, [closeAndRefocus]);
  
    const handleAlertClose = useCallback(() => {
      setAlertDialog((current) => {
        current?.resolve?.();
        return null;
      });
      closeAndRefocus();
    }, [closeAndRefocus]);
  
    const rootEl = typeof document !== 'undefined' ? getConfirmRootEl() : null;
  
    return (
      <ConfirmContext.Provider value={{ confirm, alertUser }}>
        {children}
        {rootEl && dialog && createPortal(
          <div
            className="modal confirm-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleConfirm(false);
            }}
          >
            <div className="modal-content confirm-modal-content" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <AlertTriangle size={20} color={dialog.danger ? '#c62828' : '#f9a825'} />
                  {dialog.title || 'Confirmation'}
                </h3>
                <button className="modal-close" onClick={() => handleConfirm(false)}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '16px 0', whiteSpace: 'pre-line' }}>{dialog.message}</div>
              <div className="modal-buttons">
                <button
                  className={dialog.danger ? 'btn-delete' : 'btn-save'}
                  autoFocus
                  onClick={() => handleConfirm(true)}
                >
                  {dialog.confirmLabel || 'Confirmer'}
                </button>
                <button className="btn-cancel" onClick={() => handleConfirm(false)}>
                  {dialog.cancelLabel || 'Annuler'}
                </button>
              </div>
            </div>
          </div>,
          rootEl
        )}
        {rootEl && alertDialog && createPortal(
          <div
            className="modal confirm-modal-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleAlertClose();
            }}
          >
            <div className="modal-content confirm-modal-content" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Info size={20} color="#1565c0" /> {alertDialog.title || 'Information'}</h3>
                <button className="modal-close" onClick={handleAlertClose}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '16px 0', whiteSpace: 'pre-line' }}>{alertDialog.message}</div>
              <div className="modal-buttons">
                <button className="btn-save" autoFocus onClick={handleAlertClose}>OK</button>
              </div>
            </div>
          </div>,
          rootEl
        )}
      </ConfirmContext.Provider>
    );
  }
  
  // Usage: const { confirm, alertUser } = useConfirm();
  // const ok = await confirm('Supprimer ?', { danger: true });
  // await alertUser('Utilisateur ajouté');
  export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
      // Fallback (ne devrait jamais arriver si ConfirmProvider est bien monté à la racine)
      return {
        confirm: async (msg) => window.confirm(msg),
        alertUser: async (msg) => window.alert(msg),
      };
    }
    return ctx;
  }
  