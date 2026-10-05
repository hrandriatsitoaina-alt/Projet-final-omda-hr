// src/pages/AdminPanel.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import '../styles/AdminPanel.css';
import GestionCrud from './gestion_crud';
import GestionRegionCrud from './gestion_region_crud';
import GestionBdAdmin from './gestion_bd_admin';
import {
  Users, FolderOpen, Activity, Settings,
  UserPlus, Edit, Trash2, CheckCircle, XCircle,
  Crown, BarChart, MapPin, Lock, AlertTriangle, Info, X,
  Database,
} from 'lucide-react';
import { useT } from '../hooks/useT';
import { useToast, forceReflow } from '../components/Toast';

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DAF: 'daf',
  ADMIN: 'admin',
  USER: 'user',
};

// ============================================================
// CONFIRM PROVIDER
// ============================================================
const LocalConfirmContext = React.createContext(null);

function LocalConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);
  const activeElRef = useRef(null);

  const confirmFn = useCallback((message, options = {}) => {
    activeElRef.current = document.activeElement;
    return new Promise((resolve) => {
      setDialog({
        message,
        title: options.title || 'Confirmation',
        danger: !!options.danger,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        resolve,
      });
    });
  }, []);

  const alertFn = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setAlertDialog({ message, title: options.title || 'Information', resolve });
    });
  }, []);

  const refocusAfterClose = useCallback(() => {
    forceReflow();
    requestAnimationFrame(() => {
      const el = activeElRef.current;
      if (el && document.body.contains(el) && typeof el.focus === 'function') {
        try { el.focus(); } catch (e) { /* ignore */ }
      }
      activeElRef.current = null;
    });
  }, []);

  const handleConfirm = useCallback((result) => {
    setDialog((cur) => { cur?.resolve?.(result); return null; });
    refocusAfterClose();
  }, [refocusAfterClose]);

  const handleAlertClose = useCallback(() => {
    setAlertDialog((cur) => { cur?.resolve?.(); return null; });
    refocusAfterClose();
  }, [refocusAfterClose]);

  const canUsePortal = typeof document !== 'undefined' && document.body;

  return (
    <LocalConfirmContext.Provider value={{ confirm: confirmFn, alertUser: alertFn }}>
      {children}

      {canUsePortal && dialog && createPortal(
        <div
          className="confirm-modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2147483646, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleConfirm(false); }}
        >
          <div className="confirm-modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>
                <AlertTriangle size={20} color={dialog.danger ? '#c62828' : '#f9a825'} />
                {dialog.title}
              </h3>
              <button className="confirm-modal-close" onClick={() => handleConfirm(false)} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="confirm-modal-body">{dialog.message}</div>
            <div className="confirm-modal-buttons">
              <button
                type="button"
                className={dialog.danger ? 'btn-delete' : 'btn-save'}
                autoFocus
                onClick={() => handleConfirm(true)}
              >
                {dialog.confirmLabel || 'Confirmer'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => handleConfirm(false)}>
                {dialog.cancelLabel || 'Annuler'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {canUsePortal && alertDialog && createPortal(
        <div
          className="confirm-modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2147483646, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleAlertClose(); }}
        >
          <div className="confirm-modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3><Info size={20} color="#1565c0" /> {alertDialog.title}</h3>
              <button className="confirm-modal-close" onClick={handleAlertClose} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="confirm-modal-body">{alertDialog.message}</div>
            <div className="confirm-modal-buttons">
              <button type="button" className="btn-save" autoFocus onClick={handleAlertClose}>OK</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </LocalConfirmContext.Provider>
  );
}

function useLocalConfirm() {
  const ctx = React.useContext(LocalConfirmContext);
  if (!ctx) {
    return {
      confirm: async (msg) => window.confirm(msg),
      alertUser: async (msg) => window.alert(msg),
    };
  }
  return ctx;
}

const filterPassword = (value) => String(value || '').slice(0, 4);

// ============================================================
// ADMIN PANEL INNER
// ============================================================
const AdminPanelInner = ({ onClose, adminToken: propToken, onLogout }) => {
  const navigate = useNavigate();
  const { t, langue } = useT();
  const showToast = useToast();
  const { confirm, alertUser } = useLocalConfirm();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [accessRole, setAccessRole] = useState(null);
  const isSuperAdmin = accessRole === ROLES.SUPER_ADMIN;
  const isDaf = accessRole === ROLES.DAF || accessRole === ROLES.ADMIN;

  const canChangeStatus = isSuperAdmin || isDaf;
  const canManageUsers = isSuperAdmin;

  const [users, setUsers] = useState([]);
  const [usagers, setUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    nom: '', email: '', mot_de_passe: '', role: 'user', statut: 'actif',
  });

  const [showEditSuperAdmin, setShowEditSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [token, setToken] = useState(null);

  const [superAdmins, setSuperAdmins] = useState([]);
  const [currentSuperAdmin, setCurrentSuperAdmin] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [superAdminData, setSuperAdminData] = useState({
    nom: '', email: '', mot_de_passe: '', confirm_mot_de_passe: '',
  });
  const [stats, setStats] = useState({
    totalUsers: 0, totalUsagers: 0, activeUsers: 0, inactiveUsers: 0,
    admins: 0, superAdmins: 0, daf: 0,
  });
  const [activities, setActivities] = useState([]);

  const [selectedType, setSelectedType] = useState('');
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showEditUsager, setShowEditUsager] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usagerToDelete, setUsagerToDelete] = useState(null);
  const [editingUsagerData, setEditingUsagerData] = useState({
    denomination: '', demandeur: '', type_usager: '', adresse: '',
    telephone: '', email: '', region: '',
  });

  const usagerTypes = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'OCC', 'Bus', 'Night club'];

  const [formData, setFormData] = useState({
    nom: '', email: '', mot_de_passe: '', role: 'user', statut: 'actif',
  });

  const addUserFirstInputRef = useRef(null);
  const editUserFirstInputRef = useRef(null);
  const editSuperAdminFirstInputRef = useRef(null);
  const editUsagerFirstInputRef = useRef(null);

  const closeAddForm = useCallback(() => { setShowAddForm(false); forceReflow(); }, []);
  const closeEditUser = useCallback(() => {
    setEditingUserId(null);
    setEditUserForm({ nom: '', email: '', mot_de_passe: '', role: 'user', statut: 'actif' });
    forceReflow();
  }, []);
  const closeEditSuperAdmin = useCallback(() => {
    setShowEditSuperAdmin(false);
    forceReflow();
  }, []);
  const closeEditUsager = useCallback(() => { setShowEditUsager(false); setSelectedUsager(null); forceReflow(); }, []);
  const closeDeleteConfirm = useCallback(() => { setShowDeleteConfirm(false); setUsagerToDelete(null); forceReflow(); }, []);

  const handleClosePanel = useCallback(() => {
    forceReflow();
    onClose?.();
  }, [onClose]);

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================
  useEffect(() => {
    let currentToken = propToken;
    if (!currentToken) currentToken = localStorage.getItem('adminToken');

    if (!currentToken) {
      setError(t('Session expirée - Veuillez vous reconnecter', 'Lasa ny fotoana - Mifandraisa indray', 'Session expired - Please log in again'));
      setLoading(false);
      return;
    }

    const storedRole =
      localStorage.getItem('adminAccessRole') ||
      localStorage.getItem('adminRole');

    let normalizedRole = null;
    if (storedRole === ROLES.SUPER_ADMIN) normalizedRole = ROLES.SUPER_ADMIN;
    else if (storedRole === ROLES.DAF) normalizedRole = ROLES.DAF;
    else if (storedRole === ROLES.ADMIN) normalizedRole = ROLES.ADMIN;

    if (normalizedRole) {
      setAccessRole(normalizedRole);
    }

    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) setCurrentUserId(parsed.id);
        if (!normalizedRole && parsed?.role) {
          if (parsed.role === ROLES.SUPER_ADMIN) setAccessRole(ROLES.SUPER_ADMIN);
          else if (parsed.role === ROLES.DAF) setAccessRole(ROLES.DAF);
          else if (parsed.role === ROLES.ADMIN) setAccessRole(ROLES.ADMIN);
        }
      } catch (e) { /* ignore */ }
    }

    setToken(currentToken);
    fetchAllData(currentToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propToken]);

  useEffect(() => {
    if (!showAddForm) return;
    const id = setTimeout(() => addUserFirstInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [showAddForm]);

  useEffect(() => {
    if (!editingUserId) return;
    const id = setTimeout(() => editUserFirstInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [editingUserId]);

  useEffect(() => {
    if (!showEditSuperAdmin) return;
    const id = setTimeout(() => editSuperAdminFirstInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [showEditSuperAdmin]);

  useEffect(() => {
    if (!showEditUsager) return;
    const id = setTimeout(() => editUsagerFirstInputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [showEditUsager]);

  const fetchAllData = async (currentToken) => {
    try {
      await Promise.all([
        fetchUsers(currentToken),
        fetchUsagers(currentToken),
        fetchActivities(currentToken),
      ]);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        headers: { adminToken: currentToken },
      });

      if (response.status === 403) {
        console.warn('⚠️ /admin/users a renvoyé 403 — session invalide');
        setError(t(
          'Session invalide ou expirée',
          'Sesion diso na lany',
          'Invalid or expired session'
        ));
        return;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        const usersList = data.users || [];
        setUsers(usersList);

        const allSuperAdmins = usersList.filter(u => u.role === ROLES.SUPER_ADMIN);
        setSuperAdmins(allSuperAdmins);

        let current = null;
        const storedUser = localStorage.getItem('adminUser');
        let storedEmail = null;
        let storedId = null;
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            storedEmail = (parsed?.email || '').toLowerCase();
            storedId = parsed?.id;
          } catch (e) { /* ignore */ }
        }

        if (storedId) current = allSuperAdmins.find(u => u.id === storedId);
        if (!current && storedEmail) current = allSuperAdmins.find(u => (u.email || '').toLowerCase() === storedEmail);
        if (!current) current = allSuperAdmins[0] || null;
        setCurrentSuperAdmin(current);

        if (current) {
          setCurrentUserId(current.id);
          setSuperAdminData(prev => ({
            ...prev,
            nom: current.nom || '',
            email: current.email || '',
            mot_de_passe: '',
            confirm_mot_de_passe: '',
          }));
        }

        const total = usersList.length;
        const active = usersList.filter(u => u.statut === 'actif').length;
        const inactive = usersList.filter(u => u.statut === 'inactif').length;
        const admins = usersList.filter(u => u.role === 'admin').length;
        const superAdminsCount = allSuperAdmins.length;
        const daf = usersList.filter(u => u.role === ROLES.DAF).length;
        setStats(prev => ({
          ...prev, totalUsers: total, activeUsers: active, inactiveUsers: inactive,
          admins, superAdmins: superAdminsCount, daf,
        }));
        setError(null);
      } else {
        setError(data.message || t('Erreur', 'Olana', 'Error'));
      }
    } catch (error) {
      console.error('fetchUsers error:', error);
      setError(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const fetchUsagers = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/usagers', {
        headers: { adminToken: currentToken },
      });
      if (response.status === 403) {
        console.warn('⚠️ /usagers 403');
        return;
      }
      const data = await response.json();
      let usagersData = [];
      if (Array.isArray(data)) usagersData = data;
      else if (data?.usagers) usagersData = data.usagers;
      else if (data?.data) usagersData = data.data;
      else if (data && typeof data === 'object') {
        usagersData = Object.values(data).filter(item => item && item.id);
      }

      setUsagers(usagersData);
      setStats(prev => ({ ...prev, totalUsagers: usagersData.length }));
      if (selectedType) handleTypeChange(selectedType);
    } catch (error) {
      console.error('fetchUsagers error:', error);
      setUsagers([]);
    }
  };

  const fetchActivities = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/activities', {
        headers: { adminToken: currentToken },
      });
      if (response.status === 403) {
        console.warn('⚠️ /admin/activities 403');
        return;
      }
      const data = await response.json();
      if (data.success) setActivities(data.activities || []);
      else setActivities([]);
    } catch (error) {
      console.error('fetchActivities error:', error);
      setActivities([]);
    }
  };

  const logActivity = async (action, details) => {
    try {
      await fetch('http://localhost:3001/api/admin/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({ action, details, user_id: currentUserId || 1 }),
      });
      fetchActivities(token);
    } catch (error) {
      console.error('logActivity error:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!canManageUsers) {
      await alertUser(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (!formData.nom || !formData.email || !formData.mot_de_passe) {
      await alertUser(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'));
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t('Utilisateur ajouté', 'Nampiana ny mpampiasa', 'User added'));
        await logActivity(t('Ajout utilisateur', 'Fanampiana mpampiasa', 'Add user'), `${t('Ajout de', 'Fanampiana ny', 'Adding')} ${formData.nom}`);
        setFormData({ nom: '', email: '', mot_de_passe: '', role: 'user', statut: 'actif' });
        closeAddForm();
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleAddUser error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const openEditUser = useCallback((user) => {
    if (!user) return;
    setEditingUserId(user.id);
    setEditUserForm({
      nom: user.nom || '',
      email: user.email || '',
      mot_de_passe: '',
      role: user.role || 'user',
      statut: user.statut || 'actif',
    });
  }, []);

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!canManageUsers) {
      await alertUser(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (!editingUserId) return;

    if (editUserForm.mot_de_passe && editUserForm.mot_de_passe.length !== 4) {
      await alertUser(t(
        'Le mot de passe doit contenir exactement 4 caractères',
        'Tsy maintsy misy litera 4 marina ny teny miafina',
        'Password must contain exactly 4 characters'
      ));
      return;
    }

    try {
      const updateData = {
        nom: editUserForm.nom,
        email: editUserForm.email,
        role: editUserForm.role,
        statut: editUserForm.statut,
      };
      if (editUserForm.mot_de_passe && editUserForm.mot_de_passe.trim() !== '') {
        updateData.mot_de_passe = editUserForm.mot_de_passe;
      }

      const response = await fetch(`http://localhost:3001/api/admin/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t('Utilisateur modifié', 'Voaova ny mpampiasa', 'User updated'));
        await logActivity(t('Modification utilisateur', 'Fanovana mpampiasa', 'Update user'), `${t('Modification de', 'Fanovana ny', 'Updating')} ${editUserForm.nom}`);
        closeEditUser();
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleEditUser error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const handleToggleStatus = async (user) => {
    if (!canChangeStatus) {
      await alertUser(t('Non autorisé', 'Tsy nahazo alalana', 'Not allowed'));
      return;
    }
    if (user.role === ROLES.SUPER_ADMIN) {
      await alertUser(t('Vous ne pouvez pas modifier le statut du Super Admin', 'Tsy afaka manova ny satan\'ny Super Admin ianao', 'You cannot change the Super Admin status'));
      return;
    }
    if (isDaf && !isSuperAdmin && user.role === ROLES.DAF) {
      await alertUser(t('Vous ne pouvez pas modifier le statut d\'un autre DAF', 'Tsy afaka manova ny satan\'ny DAF hafa ianao', 'You cannot change another DAF status'));
      return;
    }

    const newStatus = user.statut === 'actif' ? 'inactif' : 'actif';
    const action = newStatus === 'actif'
      ? t('activer', 'hamelona', 'activate')
      : t('désactiver', 'hamono', 'deactivate');

    const ok = await confirm(t(
      `Voulez-vous vraiment ${action} l'utilisateur "${user.nom}" ?`,
      `Tena tianao ve ny ${action} ny mpampiasa "${user.nom}" ?`,
      `Do you really want to ${action} user "${user.nom}"?`
    ));
    if (!ok) return;

    try {
      const updateData = {
        nom: user.nom,
        email: user.email,
        role: user.role,
        statut: newStatus,
      };
      const response = await fetch(`http://localhost:3001/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(`${t('Utilisateur', 'Mpampiasa', 'User')} ${action}`);
        await logActivity(t('Modification statut', 'Fanovana sata', 'Status update'), `${action} ${t('de', 'ny', 'of')} ${user.nom}`);
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleToggleStatus error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      forceReflow();
    }
  };

  const handleDeleteUser = async (id, nom, role) => {
    if (!canManageUsers) {
      await alertUser(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (role === ROLES.SUPER_ADMIN) {
      await alertUser(t('Impossible de supprimer le Super Admin', 'Tsy afaka mamafa Super Admin', 'Cannot delete the Super Admin'));
      return;
    }
    const ok = await confirm(t(
      `Supprimer définitivement "${nom}" ?`,
      `Hamafa tanteraka an'i "${nom}" ?`,
      `Permanently delete "${nom}"?`
    ), { danger: true });
    if (!ok) return;

    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { adminToken: token },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(`Utilisateur "${nom}" supprimé`, `Voafafa ny mpampiasa "${nom}"`, `User "${nom}" deleted`));
        await logActivity(t('Suppression utilisateur', 'Famafana mpampiasa', 'Delete user'), `${t('Suppression de', 'Famafana an\'i', 'Deleting')} ${nom}`);
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleDeleteUser error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      forceReflow();
    }
  };

  const openEditSuperAdmin = (superAdmin) => {
    if (!isSuperAdmin) return;
    setCurrentSuperAdmin(superAdmin);
    setSuperAdminData({
      nom: superAdmin.nom || '',
      email: superAdmin.email || '',
      mot_de_passe: '',
      confirm_mot_de_passe: '',
    });
    setShowEditSuperAdmin(true);
  };

  const handleUpdateSuperAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      await alertUser(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (!currentSuperAdmin) return;

    const wantChangePwd = !!superAdminData.mot_de_passe;

    if (wantChangePwd) {
      if (superAdminData.mot_de_passe !== superAdminData.confirm_mot_de_passe) {
        await alertUser(t('Les mots de passe ne correspondent pas', 'Tsy mifanaraka ny teny miafina', 'Passwords do not match'));
        return;
      }
      if (superAdminData.mot_de_passe.length !== 4) {
        await alertUser(t(
          'Le mot de passe doit contenir exactement 4 caractères',
          'Tsy maintsy misy litera 4 marina ny teny miafina',
          'Password must contain exactly 4 characters'
        ));
        return;
      }
    }

    try {
      const updateData = {
        nom: superAdminData.nom,
        email: superAdminData.email,
        role: ROLES.SUPER_ADMIN,
        statut: 'actif',
      };
      if (wantChangePwd) updateData.mot_de_passe = superAdminData.mot_de_passe;

      const response = await fetch(`http://localhost:3001/api/admin/users/${currentSuperAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t('Compte Super Admin modifié', 'Voaova ny kaonty Super Admin', 'Super Admin account updated'));
        await logActivity(
          t('Modification Super Admin', 'Fanovana Super Admin', 'Update Super Admin'),
          `${t('Modification du compte', 'Fanovana ny kaonty', 'Updating account')} ${currentSuperAdmin.nom}`
        );
        closeEditSuperAdmin();
        setSuperAdminData(prev => ({ ...prev, mot_de_passe: '', confirm_mot_de_passe: '' }));
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleUpdateSuperAdmin error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    const usagersArray = Array.isArray(usagers) ? usagers : [];
    if (type === 'tous') setFilteredUsagers(usagersArray);
    else if (type) setFilteredUsagers(usagersArray.filter(u => u && u.type_usager === type));
    else setFilteredUsagers([]);
    setSelectedUsager(null);
  };

  const handleEditUsager = (usager) => {
    if (!canManageUsers) return;
    if (!usager) return;
    setSelectedUsager(usager);
    setEditingUsagerData({
      denomination: usager.denomination || '',
      demandeur: usager.demandeur || '',
      type_usager: usager.type_usager || '',
      adresse: usager.adresse || '',
      telephone: usager.telephone || '',
      email: usager.email || '',
      region: usager.region || '',
    });
    setShowEditUsager(true);
  };

  const handleUpdateUsager = async (e) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUsager) return;
    try {
      const response = await fetch(`http://localhost:3001/api/usagers/${selectedUsager.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({ ...editingUsagerData, type_usager: selectedUsager.type_usager }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t('Usager modifié', 'Voaova ny mpampiasa', 'User updated'));
        await logActivity(t('Modification usager', 'Fanovana mpampiasa', 'Update user'), `${t('Modification de', 'Fanovana ny', 'Updating')} ${selectedUsager.denomination}`);
        closeEditUsager();
        fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleUpdateUsager error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const confirmDeleteUsager = (usager) => {
    if (!canManageUsers) return;
    if (!usager) return;
    setUsagerToDelete(usager);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUsager = async () => {
    if (!canManageUsers || !usagerToDelete) return;
    try {
      const response = await fetch(`http://localhost:3001/api/usagers/${usagerToDelete.id}`, {
        method: 'DELETE',
        headers: { adminToken: token },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(`Usager "${usagerToDelete.denomination}" supprimé`, `Voafafa`, `Deleted`));
        await logActivity(t('Suppression usager', 'Famafana', 'Delete user'), `${t('Suppression de', 'Famafana', 'Deleting')} ${usagerToDelete.denomination}`);
        closeDeleteConfirm();
        fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        await alertUser(`${t('Erreur', 'Olana', 'Error')}: ${data.message || 'Erreur'}`);
      }
    } catch (error) {
      console.error('handleDeleteUsager error:', error);
      await alertUser(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const filteredUsers = users.filter(user =>
    user?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    const roleMap = {
      'super_admin': { label: `⭐ ${t('Super Admin', 'Super Admin', 'Super Admin')}`, className: 'role-super_admin' },
      'admin': { label: `👑 ${t('Admin', 'Admin', 'Admin')}`, className: 'role-admin' },
      'daf': { label: `📊 DAF`, className: 'role-daf' },
      'user': { label: `👤 ${t('Utilisateur', 'Mpampiasa', 'User')}`, className: 'role-user' },
    };
    return roleMap[role] || roleMap['user'];
  };

  if (loading) {
    return (
      <div className="admin-panel-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">
            {t('Chargement du panneau d\'administration...', 'Maka ny tabilao fitantanana...', 'Loading administration panel...')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-error">
        <div className="error-container">
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={handleClosePanel} className="close-btn">{t('Fermer', 'Hidio', 'Close')}</button>
        </div>
      </div>
    );
  }

  const editingUser = editingUserId ? users.find(u => u.id === editingUserId) : null;

  return (
    <div className="admin-panel">
      {successMsg && <div className="success-message">✓ {successMsg}</div>}

      <div className="admin-header">
        <div className="header-content">
          <h1>
            <Crown size={24} /> {t('Administration OMDA', 'Fitantanana OMDA', 'OMDA Administration')}
            {isSuperAdmin && <span className="role-tag role-super">⭐ Super Admin</span>}
            {!isSuperAdmin && <span className="role-tag role-super">👑 Admin</span>}
          </h1>
          <button className="close-btn" onClick={handleClosePanel}>
            ✕ {t('Fermer', 'Hidio', 'Close')}
          </button>
        </div>
      </div>

      <div className="stats-flex">
        <div className="stat-card">
          <div className="stat-value large-blue">{stats.totalUsers}</div>
          <div className="stat-label">{t('Utilisateurs', 'Mpampiasa', 'Users')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsagers}</div>
          <div className="stat-label">{t('Dossiers', 'Rakitra', 'Files')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeUsers}</div>
          <div className="stat-label">{t('Actifs', 'Mavitrika', 'Active')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.inactiveUsers}</div>
          <div className="stat-label">{t('Inactifs', 'Tsy mavitrika', 'Inactive')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.admins}</div>
          <div className="stat-label">{t('Admins', 'Mpandrindra', 'Admins')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.daf}</div>
          <div className="stat-label">DAF</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.superAdmins}</div>
          <div className="stat-label">{t('Super Admins', 'Super Admins', 'Super Admins')}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> {t('Utilisateurs', 'Mpampiasa', 'Users')}
        </button>
        <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
          <Activity size={16} /> {t('Activités', 'Hetsika', 'Activities')}
        </button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={16} /> {t('Paramètres', 'Kirakira', 'Settings')}
        </button>
        <button className={`tab ${activeTab === 'gestion' ? 'active' : ''}`} onClick={() => setActiveTab('gestion')}>
          <FolderOpen size={16} /> {t('Gestion Usagers', 'Fitantanana mpampiasa', 'User Management')}
        </button>
        <button className={`tab ${activeTab === 'regions' ? 'active' : ''}`} onClick={() => setActiveTab('regions')}>
          <MapPin size={16} /> {t('Régions', 'Faritra', 'Regions')}
        </button>
        {/* ✅ NOUVEAU : Onglet Gestion BD Admin (Super Admin uniquement) */}
        {isSuperAdmin && (
          <button className={`tab ${activeTab === 'gestion-bd' ? 'active' : ''}`} onClick={() => setActiveTab('gestion-bd')}>
            <Database size={16} /> {t('Gestion BD Admin', 'Fitantanana BD', 'DB Admin')}
          </button>
        )}
      </div>

      {/* ---- ONGLET UTILISATEURS ---- */}
      {activeTab === 'users' && (
        <div className="content">
          <div className="content-header">
            <input
              type="text"
              placeholder={t('Rechercher...', 'Hikaroka...', 'Search...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {canManageUsers && (
              <button className="btn-add" onClick={() => setShowAddForm(true)}>
                <UserPlus size={16} /> {t('Ajouter', 'Hanampy', 'Add')}
              </button>
            )}
          </div>
          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('Nom', 'Anarana', 'Name')}</th>
                  <th>Email</th>
                  <th>{t('Rôle', 'Andraikitra', 'Role')}</th>
                  <th>{t('Statut', 'Toe-javatra', 'Status')}</th>
                  <th>{t('Date', 'Daty', 'Date')}</th>
                  <th>{t('Actions', 'Hetsika', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const roleInfo = getRoleBadge(user.role);
                  const isSuperAdminUser = user.role === ROLES.SUPER_ADMIN;
                  const canToggle = canChangeStatus && !isSuperAdminUser;

                  return (
                    <tr key={user.id} className={user.statut === 'inactif' ? 'inactive-row' : ''}>
                      <td>{user.id}</td>
                      <td>{user.nom}</td>
                      <td>{user.email}</td>
                      <td><span className={`role ${roleInfo.className}`}>{roleInfo.label}</span></td>
                      <td>
                        <span
                          className={`status-badge status-${user.statut} ${canToggle ? '' : 'status-locked'}`}
                          onClick={() => canToggle && handleToggleStatus(user)}
                          title={canToggle
                            ? t('Cliquer pour changer', 'Tsindrio hanova', 'Click to change')
                            : t('Non modifiable', 'Tsy azo ovaina', 'Not editable')}
                        >
                          {user.statut === 'actif' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {user.statut === 'actif'
                            ? ` ${t('Actif', 'Mavitrika', 'Active')}`
                            : ` ${t('Inactif', 'Tsy mavitrika', 'Inactive')}`}
                          {!canToggle && <Lock size={12} style={{ marginLeft: 6, opacity: 0.7 }} />}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString(locale)}</td>
                      <td className="actions">
                        {canManageUsers && !isSuperAdminUser && (
                          <>
                            <button className="btn-edit" onClick={() => openEditUser(user)} title={t('Modifier', 'Ovay', 'Edit')}>
                              <Edit size={14} />
                            </button>
                            <button className="btn-delete" onClick={() => handleDeleteUser(user.id, user.nom, user.role)} title={t('Supprimer', 'Fafao', 'Delete')}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {canManageUsers && isSuperAdminUser && (
                          <span className="action-locked" title={t('Super Admin protégé', 'Voaaro', 'Protected')}>
                            <Lock size={14} />
                          </span>
                        )}
                        {!canManageUsers && isDaf && (
                          <span className="action-locked" title={t('Seul le statut est modifiable', 'Ny sata ihany', 'Only status')}>
                            <Lock size={14} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- ONGLET ACTIVITÉS ---- */}
      {activeTab === 'activities' && (
        <div className="content">
          <h3><Activity size={18} /> {t('Historique des activités', 'Tantaran\'ny hetsika', 'Activity history')}</h3>
          {activities.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#78909c', padding: '30px' }}>
              {t('Aucune activité enregistrée', 'Tsy misy hetsika', 'No activity')}
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>{t('Action', 'Hetsika', 'Action')}</th>
                    <th>{t('Détails', 'Antsipiriany', 'Details')}</th>
                    <th>{t('Utilisateur', 'Mpampiasa', 'User')}</th>
                    <th>{t('Date', 'Daty', 'Date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(a => (
                    <tr key={a.id}>
                      <td><span className="activity-badge">{a.action}</span></td>
                      <td>{a.details}</td>
                      <td><strong>{a.user_nom}</strong></td>
                      <td>{new Date(a.created_at).toLocaleString(locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- ONGLET PARAMÈTRES ---- */}
      {activeTab === 'settings' && (
        <div className="content">
          <div className="settings-container">
            <div className="settings-card">
              <div className="settings-card-header">
                <Crown size={24} className="settings-icon" />
                <div>
                  <h3>
                    {t(
                      `Comptes Super Administrateurs (${superAdmins.length})`,
                      `Kaonty Super Administrateurs (${superAdmins.length})`,
                      `Super Administrator Accounts (${superAdmins.length})`
                    )}
                  </h3>
                  <p className="settings-subtitle">
                    {isSuperAdmin
                      ? t('Tous les super administrateurs', 'Rehetra', 'All')
                      : t('Lecture seule', 'Vakiana ihany', 'Read only')}
                  </p>
                </div>
              </div>
              <div className="settings-card-content">
                {superAdmins.length === 0 ? (
                  <p style={{ color: '#78909c', textAlign: 'center', padding: '20px' }}>
                    {t('Aucun Super Admin trouvé', 'Tsy misy', 'None')}
                  </p>
                ) : (
                  <div className="superadmins-grid">
                    {superAdmins.map((sa) => {
                      const isCurrent = currentSuperAdmin && sa.id === currentSuperAdmin.id;
                      return (
                        <div
                          key={sa.id}
                          className={`superadmin-card ${isCurrent ? 'superadmin-card-current' : ''}`}
                        >
                          <div className="superadmin-card-header">
                            <div className="superadmin-avatar">
                              {sa.nom?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="superadmin-title">
                              <strong>{sa.nom}</strong>
                              <div className="superadmin-badges">
                                <span className="badge-super">⭐ Super Admin</span>
                                {isCurrent && (
                                  <span className="badge-current">
                                    {t('Connecté', 'Tafiditra', 'Logged in')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="superadmin-card-body">
                            <div className="superadmin-info-row">
                              <span className="superadmin-label">📧 Email</span>
                              <span className="superadmin-value">{sa.email}</span>
                            </div>
                            <div className="superadmin-info-row">
                              <span className="superadmin-label">📊 {t('Statut', 'Toe-javatra', 'Status')}</span>
                              <span className={`superadmin-value status-${sa.statut}`}>
                                {sa.statut === 'actif'
                                  ? t('Actif', 'Mavitrika', 'Active')
                                  : t('Inactif', 'Tsy mavitrika', 'Inactive')}
                              </span>
                            </div>
                          </div>

                          {isSuperAdmin && (
                            <div className="superadmin-card-actions">
                              <button
                                className="settings-btn"
                                onClick={() => openEditSuperAdmin(sa)}
                              >
                                <Edit size={14} /> {t('Modifier', 'Ovay', 'Edit')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <BarChart size={24} className="settings-icon" />
                <div>
                  <h3>{t('Statistiques Générales', 'Statistika', 'Statistics')}</h3>
                  <p className="settings-subtitle">
                    {t('Aperçu de l\'activité', 'Topi-maso', 'Overview')}
                  </p>
                </div>
              </div>
              <div className="settings-card-content">
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{stats.totalUsers}</span>
                    <span className="stat-name">{t('Utilisateurs', 'Mpampiasa', 'Users')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.totalUsagers}</span>
                    <span className="stat-name">{t('Dossiers', 'Rakitra', 'Files')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.activeUsers}</span>
                    <span className="stat-name">{t('Actifs', 'Mavitrika', 'Active')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{stats.inactiveUsers}</span>
                    <span className="stat-name">{t('Inactifs', 'Tsy mavitrika', 'Inactive')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- ONGLET GESTION USAGERS ---- */}
      {activeTab === 'gestion' && (
        <div className="content gestion-content">
          <GestionCrud onBack={() => setActiveTab('users')} />
        </div>
      )}

      {/* ---- ONGLET GESTION RÉGIONS ---- */}
      {activeTab === 'regions' && (
        <div className="content gestion-content">
          <GestionRegionCrud onBack={() => setActiveTab('users')} />
        </div>
      )}

      {/* ✅ NOUVEAU : Onglet Gestion BD Admin (Super Admin uniquement) */}
      {activeTab === 'gestion-bd' && isSuperAdmin && (
        <div className="content gestion-content">
          <GestionBdAdmin />
        </div>
      )}

      {/* ---- MODAL : Ajout utilisateur ---- */}
      {showAddForm && canManageUsers && (
        <div
          className="modal"
          key="modal-add-user"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeAddForm(); }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserPlus size={20} /> {t('Ajouter un utilisateur', 'Hanampy', 'Add a user')}</h3>
              <button className="modal-close" onClick={closeAddForm}>✕</button>
            </div>
            <form onSubmit={handleAddUser} autoComplete="off">
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana', 'Full name')} *</label>
                <input
                  key="add-nom"
                  ref={addUserFirstInputRef}
                  type="text"
                  name="add_nom"
                  autoComplete="off"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  key="add-email"
                  type="email"
                  name="add_email"
                  autoComplete="off"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Code d\'accès', 'Kaody', 'Access code')} *</label>
                <input
                  key="add-motdepasse"
                  type="text"
                  name="add_motdepasse"
                  autoComplete="off"
                  maxLength="4"
                  placeholder={t('4 caractères', '4 litera', '4 chars')}
                  value={formData.mot_de_passe}
                  onChange={(e) => {
                    const v = filterPassword(e.target.value);
                    setFormData(prev => ({ ...prev, mot_de_passe: v }));
                  }}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Rôle', 'Andraikitra', 'Role')}</label>
                  <select value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}>
                    <option value="user">👤 {t('Utilisateur', 'Mpampiasa', 'User')}</option>
                    <option value="daf">📊 DAF</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('Statut', 'Toe-javatra', 'Status')}</label>
                  <select value={formData.statut} onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value }))}>
                    <option value="actif">🟢 {t('Actif', 'Mavitrika', 'Active')}</option>
                    <option value="inactif">🔴 {t('Inactif', 'Tsy mavitrika', 'Inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">✅ {t('Ajouter', 'Hanampy', 'Add')}</button>
                <button type="button" className="btn-cancel" onClick={closeAddForm}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition utilisateur ---- */}
      {editingUserId && editingUser && canManageUsers && (
        <div
          className="modal"
          key={`modal-edit-user-${editingUserId}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditUser(); }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier', 'Ovay', 'Edit')} {editingUser.nom}</h3>
              <button className="modal-close" onClick={closeEditUser}>✕</button>
            </div>
            <form onSubmit={handleEditUser} autoComplete="off">
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana', 'Full name')}</label>
                <input
                  key="edit-user-nom"
                  ref={editUserFirstInputRef}
                  type="text"
                  name="edit_user_nom"
                  autoComplete="off"
                  value={editUserForm.nom}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  key="edit-user-email"
                  type="email"
                  name="edit_user_email"
                  autoComplete="off"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  {t('Nouveau code', 'Kaody vaovao', 'New code')}
                  <small style={{ color: '#78909c', marginLeft: 8, fontWeight: 'normal', fontSize: '0.85em' }}>
                    ({t('laisser vide pour ne pas changer', 'avelao foana', 'leave empty to keep')})
                  </small>
                </label>
                <input
                  key="edit-user-motdepasse"
                  type="text"
                  name="edit_user_motdepasse"
                  autoComplete="off"
                  maxLength="4"
                  placeholder="••••"
                  value={editUserForm.mot_de_passe}
                  onChange={(e) => {
                    const v = filterPassword(e.target.value);
                    setEditUserForm(prev => ({ ...prev, mot_de_passe: v }));
                  }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Rôle', 'Andraikitra', 'Role')}</label>
                  <select
                    key="edit-user-role"
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
                    disabled={editUserForm.role === ROLES.SUPER_ADMIN}
                  >
                    <option value="user">👤 {t('Utilisateur', 'Mpampiasa', 'User')}</option>
                    <option value="daf">📊 DAF</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('Statut', 'Toe-javatra', 'Status')}</label>
                  <select
                    key="edit-user-statut"
                    value={editUserForm.statut}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, statut: e.target.value }))}
                    disabled={editUserForm.role === ROLES.SUPER_ADMIN}
                  >
                    <option value="actif">🟢 {t('Actif', 'Mavitrika', 'Active')}</option>
                    <option value="inactif">🔴 {t('Inactif', 'Tsy mavitrika', 'Inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={closeEditUser}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition Super Admin ---- */}
      {showEditSuperAdmin && currentSuperAdmin && isSuperAdmin && (
        <div
          className="modal"
          key={`modal-edit-super-admin-${currentSuperAdmin.id}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditSuperAdmin(); }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Crown size={20} /> {t('Modifier le compte Super Admin', 'Ovay', 'Edit Super Admin')}</h3>
              <button className="modal-close" onClick={closeEditSuperAdmin}>✕</button>
            </div>
            <form onSubmit={handleUpdateSuperAdmin} autoComplete="off">
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana', 'Full name')}</label>
                <input
                  key="sa-nom"
                  ref={editSuperAdminFirstInputRef}
                  type="text"
                  name="sa_nom"
                  autoComplete="off"
                  value={superAdminData.nom}
                  onChange={(e) => setSuperAdminData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  key="sa-email"
                  type="email"
                  name="sa_email"
                  autoComplete="off"
                  value={superAdminData.email}
                  onChange={(e) => setSuperAdminData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  {t('Nouveau code', 'Kaody vaovao', 'New code')}
                  <small style={{ color: '#78909c', marginLeft: 8, fontWeight: 'normal', fontSize: '0.85em' }}>
                    ({t('laisser vide pour ne pas changer', 'avelao foana', 'leave empty to keep')})
                  </small>
                </label>
                <input
                  key="sa-motdepasse"
                  type="text"
                  name="sa_motdepasse"
                  autoComplete="off"
                  maxLength="4"
                  placeholder="••••"
                  value={superAdminData.mot_de_passe}
                  onChange={(e) => {
                    const v = filterPassword(e.target.value);
                    setSuperAdminData(prev => ({ ...prev, mot_de_passe: v }));
                  }}
                />
              </div>
              <div className="form-group">
                <label>{t('Confirmer le code', 'Hamafiso', 'Confirm')}</label>
                <input
                  key="sa-confirm"
                  type="text"
                  name="sa_confirm"
                  autoComplete="off"
                  maxLength="4"
                  placeholder="••••"
                  value={superAdminData.confirm_mot_de_passe}
                  onChange={(e) => {
                    const v = filterPassword(e.target.value);
                    setSuperAdminData(prev => ({ ...prev, confirm_mot_de_passe: v }));
                  }}
                  disabled={!superAdminData.mot_de_passe}
                />
                {!superAdminData.mot_de_passe && (
                  <small style={{ color: '#78909c', fontSize: '0.8em', display: 'block', marginTop: 4 }}>
                    {t('Le champ se déverrouille dès que vous saisissez un nouveau code.',
                       'Mihidy ny saha raha tsy misy kaody vaovao.',
                       'Field unlocks once you enter a new code.')}
                  </small>
                )}
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={closeEditSuperAdmin}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition Usager ---- */}
      {showEditUsager && selectedUsager && canManageUsers && (
        <div
          className="modal"
          key={`modal-edit-usager-${selectedUsager.id}`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditUsager(); }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier', 'Ovay', 'Edit')} {selectedUsager.denomination}</h3>
              <button className="modal-close" onClick={closeEditUsager}>✕</button>
            </div>
            <form onSubmit={handleUpdateUsager} autoComplete="off">
              <div className="form-group">
                <label>{t('Dénomination', 'Anarana', 'Name')} *</label>
                <input
                  key={`us-denom-${selectedUsager.id}`}
                  ref={editUsagerFirstInputRef}
                  type="text"
                  name="us_denom"
                  autoComplete="off"
                  value={editingUsagerData.denomination}
                  onChange={(e) => setEditingUsagerData(prev => ({ ...prev, denomination: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Demandeur', 'Mpangataka', 'Applicant')} *</label>
                <input
                  key={`us-demandeur-${selectedUsager.id}`}
                  type="text"
                  name="us_demandeur"
                  autoComplete="off"
                  value={editingUsagerData.demandeur}
                  onChange={(e) => setEditingUsagerData(prev => ({ ...prev, demandeur: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Type d\'usager', 'Karazana', 'User type')} *</label>
                <select
                  key={`us-type-${selectedUsager.id}`}
                  value={editingUsagerData.type_usager}
                  onChange={(e) => setEditingUsagerData(prev => ({ ...prev, type_usager: e.target.value }))}
                  required
                >
                  <option value="">-- {t('Sélectionner', 'Misafidiana', 'Select')} --</option>
                  {usagerTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('Région', 'Faritra', 'Region')}</label>
                <input
                  key={`us-region-${selectedUsager.id}`}
                  type="text"
                  name="us_region"
                  autoComplete="off"
                  value={editingUsagerData.region}
                  onChange={(e) => setEditingUsagerData(prev => ({ ...prev, region: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>{t('Adresse', 'Adiresy', 'Address')}</label>
                <input
                  key={`us-adresse-${selectedUsager.id}`}
                  type="text"
                  name="us_adresse"
                  autoComplete="off"
                  value={editingUsagerData.adresse}
                  onChange={(e) => setEditingUsagerData(prev => ({ ...prev, adresse: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                  <input
                    key={`us-tel-${selectedUsager.id}`}
                    type="text"
                    name="us_tel"
                    autoComplete="off"
                    value={editingUsagerData.telephone}
                    onChange={(e) => setEditingUsagerData(prev => ({ ...prev, telephone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    key={`us-email-${selectedUsager.id}`}
                    type="email"
                    name="us_email"
                    autoComplete="off"
                    value={editingUsagerData.email}
                    onChange={(e) => setEditingUsagerData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={closeEditUsager}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Confirmer suppression usager ---- */}
      {showDeleteConfirm && usagerToDelete && canManageUsers && (
        <div
          className="modal"
          key="modal-delete-usager"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeDeleteConfirm(); }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {t('Confirmer la suppression', 'Hamafiso', 'Confirm deletion')}</h3>
              <button className="modal-close" onClick={closeDeleteConfirm}>✕</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                {t('Voulez-vous vraiment supprimer :', 'Hamafa tokoa ve :', 'Delete:')}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#c62828' }}>
                "{usagerToDelete.denomination}"
              </p>
              <p style={{ fontSize: '14px', color: '#78909c', marginTop: '10px' }}>
                {t('Type', 'Karazana', 'Type')}: {usagerToDelete.type_usager}<br />
                {t('Demandeur', 'Mpangataka', 'Applicant')}: {usagerToDelete.demandeur}
              </p>
              <p style={{ fontSize: '14px', color: '#c62828', marginTop: '10px', fontWeight: 'bold' }}>
                ⚠️ {t('Cette action est irréversible !', 'Tsy azo ivalozana !', 'Irreversible!')}
              </p>
            </div>
            <div className="modal-buttons">
              <button className="btn-save" onClick={handleDeleteUsager}>✅ {t('Confirmer', 'Hamarino', 'Confirm')}</button>
              <button className="btn-cancel" onClick={closeDeleteConfirm}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPanel = (props) => {
  return (
    <LocalConfirmProvider>
      <AdminPanelInner {...props} />
    </LocalConfirmProvider>
  );
};

export default AdminPanel;