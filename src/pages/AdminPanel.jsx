// src/pages/AdminPanel.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanel.css';
import GestionCrud from './gestion_crud';
import GestionRegionCrud from './gestion_region_crud';
import {
  Users, FolderOpen, Activity, Settings,
  UserPlus, Edit, Trash2, CheckCircle, XCircle,
  Crown, BarChart, MapPin, Lock
} from 'lucide-react';
import { useT } from '../hooks/useT';

const AdminPanel = ({ onClose, adminToken: propToken, onLogout }) => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  // ✅ Rôle d'accès : 'super_admin' ou 'admin'
  const [accessRole, setAccessRole] = useState('super_admin');
  const isSuperAdmin = accessRole === 'super_admin';
  const isSimpleAdmin = accessRole === 'admin';

  const [users, setUsers] = useState([]);
  const [usagers, setUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditSuperAdmin, setShowEditSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [token, setToken] = useState(null);

  // ✅ Tableau de TOUS les super admins
  const [superAdmins, setSuperAdmins] = useState([]);
  // ✅ Super admin actuellement sélectionné pour modification
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

  // ----------------------------------------------
  // 1. CHARGEMENT INITIAL
  // ----------------------------------------------
  useEffect(() => {
    let currentToken = propToken;
    if (!currentToken) currentToken = localStorage.getItem('adminToken');

    if (!currentToken) {
      setError(t('Session expirée - Veuillez vous reconnecter', 'Lasa ny fotoana - Mifandraisa indray', 'Session expired - Please log in again'));
      setLoading(false);
      return;
    }

    const storedRole = localStorage.getItem('adminAccessRole') || localStorage.getItem('adminRole');
    if (storedRole === 'admin' || storedRole === 'super_admin') {
      setAccessRole(storedRole);
    } else {
      setAccessRole('super_admin');
    }

    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) setCurrentUserId(parsed.id);
      } catch (e) { /* ignore */ }
    }

    setToken(currentToken);
    fetchAllData(currentToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propToken]);

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

  // ----------------------------------------------
  // 2. REQUÊTES API
  // ----------------------------------------------
  const fetchUsers = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        headers: { adminToken: currentToken },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const usersList = data.users || [];
        setUsers(usersList);

        // ✅ Récupérer TOUS les super admins
        const allSuperAdmins = usersList.filter(u => u.role === 'super_admin');
        setSuperAdmins(allSuperAdmins);

        // Déterminer le super admin courant
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
          setSuperAdminData({
            nom: current.nom,
            email: current.email,
            mot_de_passe: '',
            confirm_mot_de_passe: '',
          });
        }

        // Stats
        const total = usersList.length;
        const active = usersList.filter(u => u.statut === 'actif').length;
        const inactive = usersList.filter(u => u.statut === 'inactif').length;
        const admins = usersList.filter(u => u.role === 'admin').length;
        const superAdminsCount = allSuperAdmins.length;
        const daf = usersList.filter(u => u.role === 'daf').length;
        setStats(prev => ({
          ...prev, totalUsers: total, activeUsers: active, inactiveUsers: inactive,
          admins, superAdmins: superAdminsCount, daf,
        }));
        setError(null);
      } else {
        setError(data.message || t('Erreur', 'Olana', 'Error'));
        if (response.status === 403) {
          localStorage.removeItem('adminToken');
          if (onLogout) onLogout();
        }
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
      const data = await response.json();
      let usagersData = [];
      if (Array.isArray(data)) usagersData = data;
      else if (data?.usagers) usagersData = data.usagers;
      else if (data?.data) usagersData = data.data;
      else usagersData = Object.values(data).filter(item => item && item.id);

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

  // ----------------------------------------------
  // 3. GESTION DES UTILISATEURS
  // ----------------------------------------------
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (!formData.nom || !formData.email || !formData.mot_de_passe) {
      alert(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'));
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
        setShowAddForm(false);
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible d\'ajouter l\'utilisateur', 'Tsy afaka manampy mpampiasa', 'Unable to add user')}`);
      }
    } catch (error) {
      console.error('handleAddUser error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    try {
      const updateData = {
        nom: editingUser.nom,
        email: editingUser.email,
        role: editingUser.role,
        statut: editingUser.statut,
      };
      if (editingUser.mot_de_passe && editingUser.mot_de_passe.trim() !== '') {
        updateData.mot_de_passe = editingUser.mot_de_passe;
      }
      const response = await fetch(`http://localhost:3001/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t('Utilisateur modifié', 'Voaova ny mpampiasa', 'User updated'));
        await logActivity(t('Modification utilisateur', 'Fanovana mpampiasa', 'Update user'), `${t('Modification de', 'Fanovana ny', 'Updating')} ${editingUser.nom}`);
        setEditingUser(null);
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de modifier l\'utilisateur', 'Tsy afaka manova mpampiasa', 'Unable to update user')}`);
      }
    } catch (error) {
      console.error('handleEditUser error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.role === 'super_admin') {
      alert(t('Vous ne pouvez pas modifier le statut du Super Admin', 'Tsy afaka manova ny satan\'ny Super Admin ianao', 'You cannot change the Super Admin status'));
      return;
    }
    const newStatus = user.statut === 'actif' ? 'inactif' : 'actif';
    const action = newStatus === 'actif'
      ? t('activer', 'hamelona', 'activate')
      : t('désactiver', 'hamono', 'deactivate');

    if (!window.confirm(t(
      `Voulez-vous vraiment ${action} l'utilisateur "${user.nom}" ?`,
      `Tena tianao ve ny ${action} ny mpampiasa "${user.nom}" ?`,
      `Do you really want to ${action} user "${user.nom}"?`
    ))) return;

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
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de modifier le statut', 'Tsy afaka manova ny sata', 'Unable to change status')}`);
      }
    } catch (error) {
      console.error('handleToggleStatus error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const handleDeleteUser = async (id, nom, role) => {
    if (!isSuperAdmin) {
      alert(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (role === 'super_admin') {
      alert(t('Impossible de supprimer le Super Admin', 'Tsy afaka mamafa Super Admin', 'Cannot delete the Super Admin'));
      return;
    }
    if (!window.confirm(t(
      `⚠️ Supprimer définitivement "${nom}" ?`,
      `⚠️ Hamafa tanteraka an'i "${nom}" ?`,
      `⚠️ Permanently delete "${nom}"?`
    ))) return;

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
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de supprimer l\'utilisateur', 'Tsy afaka mamafa mpampiasa', 'Unable to delete user')}`);
      }
    } catch (error) {
      console.error('handleDeleteUser error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const openEditSuperAdmin = (superAdmin) => {
    if (!isSuperAdmin) return;
    setCurrentSuperAdmin(superAdmin);
    setSuperAdminData({
      nom: superAdmin.nom,
      email: superAdmin.email,
      mot_de_passe: '',
      confirm_mot_de_passe: '',
    });
    setShowEditSuperAdmin(true);
  };

  const handleUpdateSuperAdmin = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert(t('Action réservée au Super Admin', 'Hetsika natokana ho Super Admin', 'Action reserved for Super Admin'));
      return;
    }
    if (!currentSuperAdmin) return;
    if (superAdminData.mot_de_passe !== superAdminData.confirm_mot_de_passe) {
      alert(t('Les mots de passe ne correspondent pas', 'Tsy mifanaraka ny teny miafina', 'Passwords do not match'));
      return;
    }
    try {
      const updateData = {
        nom: superAdminData.nom,
        email: superAdminData.email,
        role: 'super_admin',
        statut: 'actif',
      };
      if (superAdminData.mot_de_passe) updateData.mot_de_passe = superAdminData.mot_de_passe;

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
        setShowEditSuperAdmin(false);
        setSuperAdminData({ ...superAdminData, mot_de_passe: '', confirm_mot_de_passe: '' });
        fetchUsers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de modifier le Super Admin', 'Tsy afaka manova Super Admin', 'Unable to update Super Admin')}`);
      }
    } catch (error) {
      console.error('handleUpdateSuperAdmin error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  // ----------------------------------------------
  // 4. GESTION DES USAGERS
  // ----------------------------------------------
  const handleTypeChange = (type) => {
    setSelectedType(type);
    const usagersArray = Array.isArray(usagers) ? usagers : [];
    if (type === 'tous') setFilteredUsagers(usagersArray);
    else if (type) setFilteredUsagers(usagersArray.filter(u => u && u.type_usager === type));
    else setFilteredUsagers([]);
    setSelectedUsager(null);
  };

  const handleEditUsager = (usager) => {
    if (!isSuperAdmin) return;
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
    if (!isSuperAdmin || !selectedUsager) return;
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
        setShowEditUsager(false);
        setSelectedUsager(null);
        fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de modifier l\'usager', 'Tsy afaka manova mpampiasa', 'Unable to update user')}`);
      }
    } catch (error) {
      console.error('handleUpdateUsager error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  const confirmDeleteUsager = (usager) => {
    if (!isSuperAdmin) return;
    if (!usager) return;
    setUsagerToDelete(usager);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUsager = async () => {
    if (!isSuperAdmin || !usagerToDelete) return;
    try {
      const response = await fetch(`http://localhost:3001/api/usagers/${usagerToDelete.id}`, {
        method: 'DELETE',
        headers: { adminToken: token },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(`Usager "${usagerToDelete.denomination}" supprimé`, `Voafafa ny mpampiasa "${usagerToDelete.denomination}"`, `User "${usagerToDelete.denomination}" deleted`));
        await logActivity(t('Suppression usager', 'Famafana mpampiasa', 'Delete user'), `${t('Suppression de', 'Famafana an\'i', 'Deleting')} ${usagerToDelete.denomination}`);
        setShowDeleteConfirm(false);
        setUsagerToDelete(null);
        fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Impossible de supprimer l\'usager', 'Tsy afaka mamafa mpampiasa', 'Unable to delete user')}`);
      }
    } catch (error) {
      console.error('handleDeleteUsager error:', error);
      alert(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  // ----------------------------------------------
  // 5. RENDU
  // ----------------------------------------------
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
          <button onClick={onClose} className="close-btn">{t('Fermer', 'Hidio', 'Close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {successMsg && <div className="success-message">✓ {successMsg}</div>}
      {error && <div className="error-message">⚠️ {error}</div>}

      {/* ✅ En-tête unique : Administration OMDA */}
      <div className="admin-header">
        <div className="header-content">
          <h1>
            <Crown size={24} /> {t('Administration OMDA', 'Fitantanana OMDA', 'OMDA Administration')}
          </h1>
          <button className="close-btn" onClick={onClose}>
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

      {/* ✅ Onglets sans "Notifications" */}
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
            {isSuperAdmin && (
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
                  const isSuperAdminUser = user.role === 'super_admin';
                  const canToggle = !isSuperAdminUser;
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
                        {isSuperAdmin && !isSuperAdminUser && (
                          <>
                            <button className="btn-edit" onClick={() => setEditingUser(user)} title={t('Modifier', 'Ovay', 'Edit')}>
                              <Edit size={14} />
                            </button>
                            <button className="btn-delete" onClick={() => handleDeleteUser(user.id, user.nom, user.role)} title={t('Supprimer', 'Fafao', 'Delete')}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {isSuperAdmin && isSuperAdminUser && (
                          <span className="action-locked" title={t('Super Admin protégé', 'Voaaro ny Super Admin', 'Super Admin protected')}>
                            <Lock size={14} />
                          </span>
                        )}
                        {isSimpleAdmin && (
                          <span className="action-locked" title={t('Non autorisé', 'Tsy nahazo alalana', 'Not allowed')}>
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
              {t('Aucune activité enregistrée', 'Tsy misy hetsika voarakitra', 'No activity recorded')}
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

            {/* ✅ CARTE SUPER ADMINISTRATEURS (version simplifiée) */}
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
                      ? t('Tous les super administrateurs', 'Ny super administrateur rehetra', 'All super administrators')
                      : t('Lecture seule', 'Vakiana ihany', 'Read only')}
                  </p>
                </div>
              </div>
              <div className="settings-card-content">
                {superAdmins.length === 0 ? (
                  <p style={{ color: '#78909c', textAlign: 'center', padding: '20px' }}>
                    {t('Aucun Super Admin trouvé', 'Tsy misy Super Admin hita', 'No Super Admin found')}
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
                          {/* En-tête : avatar + nom + badge */}
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

                          {/* Corps : Email + Statut en flex */}
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

                          {/* Action */}
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

            {/* CARTE STATISTIQUES */}
            <div className="settings-card">
              <div className="settings-card-header">
                <BarChart size={24} className="settings-icon" />
                <div>
                  <h3>{t('Statistiques Générales', 'Statistika ankapobeny', 'General Statistics')}</h3>
                  <p className="settings-subtitle">
                    {t('Aperçu de l\'activité', 'Topi-mason\'ny hetsika', 'Activity overview')}
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

      {/* ---- MODAL : Ajout utilisateur ---- */}
      {showAddForm && isSuperAdmin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3><UserPlus size={20} /> {t('Ajouter un utilisateur', 'Hanampy mpampiasa', 'Add a user')}</h3>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana feno', 'Full name')} *</label>
                <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('Mot de passe', 'Teny miafina', 'Password')} *</label>
                <input type="password" maxLength="4" placeholder={t('4 chiffres', '4 isa', '4 digits')} value={formData.mot_de_passe} onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })} required />
                <small>{t('Le mot de passe doit contenir 4 chiffres', 'Tsy maintsy misy isa 4 ny teny miafina', 'Password must contain 4 digits')}</small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Rôle', 'Andraikitra', 'Role')}</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="user">👤 {t('Utilisateur', 'Mpampiasa', 'User')}</option>
                    <option value="admin">👑 {t('Administrateur', 'Mpandrindra', 'Administrator')}</option>
                    <option value="daf">📊 DAF</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('Statut', 'Toe-javatra', 'Status')}</label>
                  <select value={formData.statut} onChange={(e) => setFormData({ ...formData, statut: e.target.value })}>
                    <option value="actif">🟢 {t('Actif', 'Mavitrika', 'Active')}</option>
                    <option value="inactif">🔴 {t('Inactif', 'Tsy mavitrika', 'Inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">✅ {t('Ajouter', 'Hanampy', 'Add')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition utilisateur ---- */}
      {editingUser && isSuperAdmin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier', 'Ovay', 'Edit')} {editingUser.nom}</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana feno', 'Full name')}</label>
                <input type="text" value={editingUser.nom} onChange={(e) => setEditingUser({ ...editingUser, nom: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('Nouveau mot de passe', 'Teny miafina vaovao', 'New password')}</label>
                <input type="password" maxLength="4" placeholder={t('4 chiffres - laisser vide', '4 isa - avelao foana', '4 digits - leave blank')} value={editingUser.mot_de_passe || ''} onChange={(e) => setEditingUser({ ...editingUser, mot_de_passe: e.target.value })} />
                <small>{t('Le mot de passe doit contenir 4 chiffres', 'Tsy maintsy misy isa 4 ny teny miafina', 'Password must contain 4 digits')}</small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Rôle', 'Andraikitra', 'Role')}</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} disabled={editingUser.role === 'super_admin'}>
                    <option value="user">👤 {t('Utilisateur', 'Mpampiasa', 'User')}</option>
                    <option value="admin">👑 {t('Administrateur', 'Mpandrindra', 'Administrator')}</option>
                    <option value="daf">📊 DAF</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('Statut', 'Toe-javatra', 'Status')}</label>
                  <select value={editingUser.statut} onChange={(e) => setEditingUser({ ...editingUser, statut: e.target.value })} disabled={editingUser.role === 'super_admin'}>
                    <option value="actif">🟢 {t('Actif', 'Mavitrika', 'Active')}</option>
                    <option value="inactif">🔴 {t('Inactif', 'Tsy mavitrika', 'Inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={() => setEditingUser(null)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition Super Admin ---- */}
      {showEditSuperAdmin && currentSuperAdmin && isSuperAdmin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <Crown size={20} /> {t('Modifier le compte Super Admin', 'Ovay ny kaonty Super Admin', 'Edit Super Admin account')}
              </h3>
              <button className="modal-close" onClick={() => setShowEditSuperAdmin(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateSuperAdmin}>
              <div className="form-group">
                <label>{t('Nom complet', 'Anarana feno', 'Full name')}</label>
                <input type="text" value={superAdminData.nom} onChange={(e) => setSuperAdminData({ ...superAdminData, nom: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={superAdminData.email} onChange={(e) => setSuperAdminData({ ...superAdminData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('Nouveau mot de passe', 'Teny miafina vaovao', 'New password')}</label>
                <input type="password" maxLength="4" placeholder={t('4 chiffres', '4 isa', '4 digits')} value={superAdminData.mot_de_passe} onChange={(e) => setSuperAdminData({ ...superAdminData, mot_de_passe: e.target.value })} />
                <small>{t('Le mot de passe doit contenir 4 chiffres', 'Tsy maintsy misy isa 4 ny teny miafina', 'Password must contain 4 digits')}</small>
              </div>
              <div className="form-group">
                <label>{t('Confirmer le mot de passe', 'Hamafiso ny teny miafina', 'Confirm password')}</label>
                <input type="password" maxLength="4" placeholder={t('4 chiffres', '4 isa', '4 digits')} value={superAdminData.confirm_mot_de_passe} onChange={(e) => setSuperAdminData({ ...superAdminData, confirm_mot_de_passe: e.target.value })} />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditSuperAdmin(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Édition Usager ---- */}
      {showEditUsager && selectedUsager && isSuperAdmin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier', 'Ovay', 'Edit')} {selectedUsager.denomination}</h3>
              <button className="modal-close" onClick={() => setShowEditUsager(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateUsager}>
              <div className="form-group">
                <label>{t('Dénomination', 'Anarana', 'Name')} *</label>
                <input type="text" value={editingUsagerData.denomination} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, denomination: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('Demandeur', 'Mpangataka', 'Applicant')} *</label>
                <input type="text" value={editingUsagerData.demandeur} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, demandeur: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('Type d\'usager', 'Karazana mpampiasa', 'User type')} *</label>
                <select value={editingUsagerData.type_usager} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, type_usager: e.target.value })} required>
                  <option value="">-- {t('Sélectionner', 'Misafidiana', 'Select')} --</option>
                  {usagerTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('Région', 'Faritra', 'Region')}</label>
                <input type="text" value={editingUsagerData.region || ''} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, region: e.target.value })} placeholder={t('Ex: Analamanga', 'Oh: Analamanga', 'E.g. Analamanga')} />
              </div>
              <div className="form-group">
                <label>{t('Adresse', 'Adiresy', 'Address')}</label>
                <input type="text" value={editingUsagerData.adresse} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, adresse: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                  <input type="text" value={editingUsagerData.telephone} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, telephone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editingUsagerData.email} onChange={(e) => setEditingUsagerData({ ...editingUsagerData, email: e.target.value })} />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditUsager(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- MODAL : Confirmer suppression usager ---- */}
      {showDeleteConfirm && usagerToDelete && isSuperAdmin && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ {t('Confirmer la suppression', 'Hanamafisana ny famafana', 'Confirm deletion')}</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                {t('Voulez-vous vraiment supprimer l\'usager :', 'Tena tianao ve ny mamafa ny mpampiasa :', 'Do you really want to delete the user:')}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#c62828' }}>
                "{usagerToDelete.denomination}"
              </p>
              <p style={{ fontSize: '14px', color: '#78909c', marginTop: '10px' }}>
                {t('Type', 'Karazana', 'Type')}: {usagerToDelete.type_usager}<br />
                {t('Demandeur', 'Mpangataka', 'Applicant')}: {usagerToDelete.demandeur}
              </p>
              <p style={{ fontSize: '14px', color: '#c62828', marginTop: '10px', fontWeight: 'bold' }}>
                ⚠️ {t('Cette action est irréversible !', 'Tsy azo ivalozana ity hetsika ity !', 'This action is irreversible!')}
              </p>
            </div>
            <div className="modal-buttons">
              <button className="btn-save" onClick={handleDeleteUsager}>✅ {t('Confirmer', 'Hamarino', 'Confirm')}</button>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;