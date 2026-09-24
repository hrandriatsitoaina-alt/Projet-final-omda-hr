// src/pages/GestionCrud.jsx
import React, { useState, useEffect, useMemo } from 'react';
import '../styles/gestion_crud.css';
import { Edit, Trash2, ArrowLeft, Search, X, FolderOpen } from 'lucide-react';
import { useT } from '../hooks/useT';

const GestionCrud = ({ onBack }) => {
  const { t } = useT();

  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [selectedType, setSelectedType] = useState('tous');
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usagerToDelete, setUsagerToDelete] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [token, setToken] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [regions, setRegions] = useState([]);
  const [deleteError, setDeleteError] = useState(null);

  // ✅ "Autre" placé APRÈS "Télé/Radio" (donc en dernier)
  const usagerTypes = useMemo(() => [
    'OCC',
    'Hôtel',
    'Grand Surface',
    'Bus',
    'Night club',
    'Télé/Radio',
    'Autre',          // ✅ DERNIER
  ], []);

  const usagerTypesLabels = useMemo(() => ({
    OCC: t('OCC', 'OCC', 'OCC'),
    'Hôtel': t('Hôtel', 'Hotely', 'Hotel'),
    'Grand Surface': t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface'),
    Bus: t('Bus', 'Bus', 'Bus'),
    'Night club': t('Night club', 'Club alina', 'Night club'),
    'Télé/Radio': t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'),
    'Autre': t('Autre', 'Hafa', 'Other'),        // ✅ DERNIER
  }), [t]);

  useEffect(() => {
    let storedToken = localStorage.getItem('adminToken');
    if (!storedToken) {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          storedToken = 'user_' + userData.id + '_' + Date.now();
          localStorage.setItem('adminToken', storedToken);
        } catch (e) { /* ignore */ }
      } else {
        storedToken = 'temp_' + Date.now();
        localStorage.setItem('adminToken', storedToken);
      }
    }
    setToken(storedToken);
    fetchCurrentUser(storedToken);
    fetchUsagers(storedToken);
    fetchRegions();
  }, []);

  const fetchCurrentUser = async (currentToken) => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData && userData.id) {
          setCurrentUserId(userData.id);
          setCurrentUserRole(userData.role || 'user');
        }
      }
    } catch (e) {
      console.error('Erreur lecture user localStorage:', e);
    }

    try {
      const response = await fetch('http://localhost:3001/api/auth/current-user', {
        headers: { Authorization: `Bearer ${currentToken}`, adminToken: currentToken },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success && data.user) {
        setCurrentUserId(data.user.id);
        setCurrentUserRole(data.user.role || 'user');
      }
    } catch (error) {
      console.error('Erreur fetchCurrentUser (rôle localStorage conservé si disponible):', error);
    }
  };

  const fetchUsagers = async (currentToken) => {
    setLoading(true);
    setError(null);
    try {
      const headers = currentToken ? { adminToken: currentToken } : {};
      const response = await fetch('http://localhost:3001/api/usagers', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      let usagersData = [];
      if (Array.isArray(data)) usagersData = data;
      else if (data && typeof data === 'object') {
        if (Array.isArray(data.usagers)) usagersData = data.usagers;
        else if (Array.isArray(data.data)) usagersData = data.data;
        else usagersData = Object.values(data).filter(item => typeof item === 'object' && item !== null && item.id);
      }
      usagersData = usagersData.map(u => {
        if (u.type_usager === 'Media' || u.type_usager === 'Télé/Radio' || u.type_usager === 'tele-radio') {
          u.type_usager = 'Télé/Radio';
        }
        u._uniqueKey = `${u.id}_${u.type_usager}`;
        return u;
      });
      const uniqueMap = new Map();
      for (const u of usagersData) if (!uniqueMap.has(u._uniqueKey)) uniqueMap.set(u._uniqueKey, u);
      usagersData = Array.from(uniqueMap.values());
      setUsagers(usagersData);
      updateStats(usagersData);
      filterByType(selectedType, usagersData, searchTerm);
    } catch (error) {
      console.error('Erreur fetchUsagers:', error);
      setError(error.message || t('Impossible de charger les usagers', 'Tsy afaka maka ny mpampiasa', 'Unable to load users'));
      setUsagers([]);
      setFilteredUsagers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/regions');
      const data = await response.json();
      if (data.success) setRegions(data.regions || []);
    } catch (error) {
      console.error('Erreur fetchRegions:', error);
    }
  };

  const updateStats = (data) => {
    const newStats = {};
    usagerTypes.forEach(type => { newStats[type] = data.filter(u => u.type_usager === type).length; });
    newStats.total = data.length;
    setStats(newStats);
  };

  const filterByType = (type, data = usagers, search = searchTerm) => {
    setSelectedType(type);
    let filtered = [...data];
    if (type && type !== 'tous') filtered = filtered.filter(u => u.type_usager === type);
    if (search.trim() !== '') {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(u =>
        (u.denomination && u.denomination.toLowerCase().includes(s)) ||
        (u.demandeur && u.demandeur.toLowerCase().includes(s)) ||
        (u.nom && u.nom.toLowerCase().includes(s)) ||
        (u.prenom && u.prenom.toLowerCase().includes(s)) ||
        (u.telephone && u.telephone.includes(search.trim())) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.region && u.region.toLowerCase().includes(s))
      );
    }
    setFilteredUsagers(filtered);
  };

  const handleTypeSelect = (type) => filterByType(type);
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    filterByType(selectedType);
  };
  const clearSearch = () => {
    setSearchTerm('');
    filterByType(selectedType);
  };

  const handleEdit = (usager) => {
    setSelectedUsager(usager);
    setEditingData({
      denomination: usager.denomination || '',
      demandeur: usager.demandeur || '',
      nom: usager.nom || '',
      prenom: usager.prenom || '',
      telephone: usager.telephone || '',
      email: usager.email || '',
      adresse: usager.adresse || '',
      region: usager.region || '',
      confirmation_nom: usager.confirmation_nom || '',
      representant_cin: usager.representant_cin || '',
      representant_cin_delivree: usager.representant_cin_delivree || '',
      representant_cin_lieu: usager.representant_cin_lieu || '',
      representant_par: usager.representant_par || '',
      representant_contact: usager.representant_contact || '',
      domicile: usager.domicile || '',
      frais_dossier: usager.frais_dossier || 0,
      montant_mensuel: usager.montant_mensuel || 0,
      type_usager: usager.type_usager || '',
      type_other: usager.type_other || '',
      mode_paiement: usager.mode_paiement || 'unique',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUsager) return;

    // ✅ Cas particulier : "Autre" → structure différente
    if (selectedUsager.type_usager === 'Autre') {
      try {
        const response = await fetch(
          `http://localhost:3001/api/usagers/other/${selectedUsager.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', adminToken: token },
            body: JSON.stringify({
              denomination: editingData.denomination,
              nom: editingData.nom,
              prenom: editingData.prenom,
              telephone: editingData.telephone,
              email: editingData.email,
              adresse: editingData.adresse,
              region: editingData.region,
              representant_par: editingData.representant_par,
              representant_cin: editingData.representant_cin,
              representant_cin_delivree: editingData.representant_cin_delivree,
              representant_cin_lieu: editingData.representant_cin_lieu,
              representant_contact: editingData.representant_contact,
              mode_paiement: editingData.mode_paiement,
            }),
          }
        );
        const data = await response.json();
        if (data.success) {
          setSuccessMsg(`✅ ${t('Usager modifié avec succès', 'Voaova ny mpampiasa', 'User updated successfully')}`);
          setShowEditModal(false);
          setSelectedUsager(null);
          fetchUsagers(token);
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          alert(`❌ ${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Erreur inconnue', 'Olana tsy fantatra', 'Unknown error')}`);
        }
      } catch (error) {
        console.error('Erreur handleUpdate (Autre):', error);
        alert(`❌ ${t('Erreur lors de la modification', 'Nisy olana tamin\'ny fanovana', 'Update error')}`);
      }
      return;
    }

    // ✅ Cas standard
    const updateData = { ...editingData, type_usager: editingData.type_usager || selectedUsager.type_usager };
    try {
      const response = await fetch(`http://localhost:3001/api/usagers/${selectedUsager.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(`✅ ${t('Usager modifié avec succès', 'Voaova ny mpampiasa', 'User updated successfully')}`);
        setShowEditModal(false);
        setSelectedUsager(null);
        fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(`❌ ${t('Erreur', 'Olana', 'Error')}: ${data.message || t('Erreur inconnue', 'Olana tsy fantatra', 'Unknown error')}`);
      }
    } catch (error) {
      console.error('Erreur handleUpdate:', error);
      alert(`❌ ${t('Erreur lors de la modification', 'Nisy olana tamin\'ny fanovana', 'Update error')}`);
    }
  };

  const initiateDelete = (usager) => {
    const role = (currentUserRole || '').toString().trim().toLowerCase();
    if (role !== 'super_admin') {
      alert(t('⚠️ Seul le Super Admin peut supprimer des usagers.', '⚠️ Ny Super Admin ihany no afaka mamafa mpampiasa.', '⚠️ Only Super Admin can delete users.'));
      return;
    }
    setDeleteError(null);
    setUsagerToDelete(usager);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!usagerToDelete) return;
    setDeleteError(null);

    const typeMap = {
      'Hôtel': 'hotel',
      'Grand Surface': 'grand-surface',
      'Télé/Radio': 'media',
      'OCC': 'occ',
      'Bus': 'bus',
      'Night club': 'nightclub',
      'Autre': 'other',
    };

    const typeParam = typeMap[usagerToDelete.type_usager] || usagerToDelete.type_usager;

    try {
      const response = await fetch(
        `http://localhost:3001/api/usagers/${typeParam}/${usagerToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            adminToken: token,
            'Content-Type': 'application/json',
          },
        }
      );

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        const text = await response.text();
        throw new Error(`${t('Réponse serveur', 'Valiny avy amin\'ny serveur', 'Server response')}: ${text || `HTTP ${response.status}`}`);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        setSuccessMsg(`✅ ${t('Usager supprimé avec succès', 'Vita ny famafana ny mpampiasa', 'User deleted successfully')}`);
        setShowDeleteModal(false);
        setUsagerToDelete(null);
        await fetchUsagers(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setDeleteError(data.message || t('Erreur inconnue', 'Olana tsy fantatra', 'Unknown error'));
      }
    } catch (error) {
      console.error('Erreur confirmDelete:', error);
      setDeleteError(error.message || t('Erreur lors de la suppression', 'Nisy olana tamin\'ny famafana', 'Deletion error'));
    }
  };

  if (loading) {
    return (
      <div className="gestion-crud-loading">
        <div className="spinner"></div>
        <p>{t('Chargement des usagers...', 'Maka ny mpampiasa...', 'Loading users...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gestion-crud-error">
        <p>❌ {error}</p>
        <button onClick={() => fetchUsagers(token)} className="retry-btn">
          🔄 {t('Réessayer', 'Andramo indray', 'Retry')}
        </button>
      </div>
    );
  }

  const isSuperAdmin = (currentUserRole || '').toString().trim().toLowerCase() === 'super_admin';

  return (
    <div className="gestion-crud-container">
      {successMsg && (
        <div className="success-banner">
          <span>✓</span> {successMsg}
        </div>
      )}

      <div className="gestion-header">
        <div className="gestion-header-left">
          <h2><FolderOpen size={24} /> {t('Gestion des Usagers', 'Fitantanana ny Mpampiasa', 'User management')}</h2>
          <p className="gestion-subtitle">
            {isSuperAdmin
              ? t(
                  '👑 Super Admin - Vous pouvez modifier et supprimer tous les usagers',
                  '👑 Super Admin - Afaka manova sy mamafa mpampiasa rehetra ianao',
                  '👑 Super Admin - You can edit and delete all users'
                )
              : t(
                  '👤 Vous pouvez modifier les usagers mais seul le Super Admin peut supprimer',
                  '👤 Afaka manova mpampiasa ianao fa ny Super Admin ihany no afaka mamafa',
                  '👤 You can edit users but only Super Admin can delete'
                )}
          </p>
        </div>
        <div className="gestion-header-right">
          {onBack && (
            <button className="btn-back-admin" onClick={onBack}>
              <ArrowLeft size={18} /> {t('Retour à l\'administration', 'Hiverina amin\'ny fitantanana', 'Back to administration')}
            </button>
          )}
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card-total">
          <span className="stat-number">{stats.total || 0}</span>
          <span className="stat-label">{t('Total Usagers', 'Totalin\'ny mpampiasa', 'Total Users')}</span>
        </div>
        {usagerTypes.map(type => (
          <div
            key={type}
            className={`stat-card-type ${selectedType === type ? 'active' : ''}`}
            onClick={() => handleTypeSelect(type)}
          >
            <span className="stat-number">{stats[type] || 0}</span>
            <span className="stat-label">{usagerTypesLabels[type]}</span>
          </div>
        ))}
      </div>

      <div className="search-filter-container">
        <div className="search-bar-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input-crud"
            placeholder={t(
              '🔍 Rechercher par nom, demandeur, téléphone, email, région...',
              '🔍 Hikaroka amin\'ny anarana, mpangataka, finday, mailaka, faritra...',
              '🔍 Search by name, applicant, phone, email, region...'
            )}
            value={searchTerm}
            onChange={handleSearch}
          />
          {searchTerm && (
            <button className="clear-search" onClick={clearSearch}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${selectedType === 'tous' ? 'active' : ''}`}
          onClick={() => handleTypeSelect('tous')}
        >
          📊 {t('Tous', 'Rehetra', 'All')}
        </button>
        {usagerTypes.map(type => (
          <button
            key={type}
            className={`filter-btn ${selectedType === type ? 'active' : ''}`}
            onClick={() => handleTypeSelect(type)}
          >
            {usagerTypesLabels[type]}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="usager-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('Type', 'Karazana', 'Type')}</th>
              <th>{t('Dénomination', 'Anarana', 'Name')}</th>
              <th>{t('Demandeur', 'Mpangataka', 'Applicant')}</th>
              <th>{t('Région', 'Faritra', 'Region')}</th>
              <th>{t('Téléphone', 'Finday', 'Phone')}</th>
              <th>{t('Actions', 'Hetsika', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsagers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  📭 {t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found')}
                  {searchTerm && ` ${t('pour', 'ho an\'ny', 'for')} "${searchTerm}"`}
                </td>
              </tr>
            ) : (
              filteredUsagers.map(usager => (
                <tr key={usager._uniqueKey || `${usager.id}_${usager.type_usager}`}>
                  <td>{usager.id}</td>
                  <td>
                    <span className="type-badge">
                      {usagerTypesLabels[usager.type_usager] || usager.type_usager || '-'}
                      {usager.type_usager === 'Autre' && usager.type_other && (
                        <span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 4 }}>
                          ({usager.type_other})
                        </span>
                      )}
                    </span>
                  </td>
                  <td><strong>{usager.denomination || 'N/A'}</strong></td>
                  <td>{usager.demandeur || 'N/A'}</td>
                  <td>{usager.region || '-'}</td>
                  <td>{usager.telephone || '-'}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleEdit(usager)} title={t('Modifier', 'Ovay', 'Edit')}>
                      <Edit size={16} /> {t('Modifier', 'Ovay', 'Edit')}
                    </button>
                    {isSuperAdmin && (
                      <button className="btn-delete" onClick={() => initiateDelete(usager)} title={t('Supprimer', 'Fafao', 'Delete')}>
                        <Trash2 size={16} /> {t('Supprimer', 'Fafao', 'Delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Modification */}
      {showEditModal && selectedUsager && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier', 'Ovay', 'Edit')} {selectedUsager.denomination}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              {selectedUsager.type_usager === 'Autre' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Dénomination', 'Anarana', 'Name')} *</label>
                      <input
                        type="text"
                        value={editingData.denomination}
                        onChange={(e) => setEditingData({ ...editingData, denomination: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('Mode paiement', 'Fomba fandoavana', 'Payment mode')}</label>
                      <select
                        value={editingData.mode_paiement || 'unique'}
                        onChange={(e) => setEditingData({ ...editingData, mode_paiement: e.target.value })}
                      >
                        <option value="unique">{t('Unique', 'Indray mandeha', 'One-time')}</option>
                        <option value="mensuel">{t('Mensuel', 'Isam-bolana', 'Monthly')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Nom', 'Anarana', 'Last name')}</label>
                      <input
                        type="text"
                        value={editingData.nom || ''}
                        onChange={(e) => setEditingData({ ...editingData, nom: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('Prénom', 'Fanampin\'anarana', 'First name')}</label>
                      <input
                        type="text"
                        value={editingData.prenom || ''}
                        onChange={(e) => setEditingData({ ...editingData, prenom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                      <input
                        type="text"
                        value={editingData.telephone}
                        onChange={(e) => setEditingData({ ...editingData, telephone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={editingData.email}
                        onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Région', 'Faritra', 'Region')}</label>
                      <select
                        value={editingData.region || ''}
                        onChange={(e) => setEditingData({ ...editingData, region: e.target.value })}
                      >
                        <option value="">-- {t('Sélectionner', 'Misafidiana', 'Select')} --</option>
                        {regions.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('Adresse', 'Adiresy', 'Address')}</label>
                      <input
                        type="text"
                        value={editingData.adresse || ''}
                        onChange={(e) => setEditingData({ ...editingData, adresse: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Représenté par', 'Solontenan\'ny', 'Represented by')}</label>
                      <input
                        type="text"
                        value={editingData.representant_par || ''}
                        onChange={(e) => setEditingData({ ...editingData, representant_par: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>CIN</label>
                      <input
                        type="text"
                        value={editingData.representant_cin || ''}
                        onChange={(e) => setEditingData({ ...editingData, representant_cin: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Dénomination', 'Anarana', 'Name')} *</label>
                      <input type="text" value={editingData.denomination} onChange={(e) => setEditingData({ ...editingData, denomination: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>{t('Demandeur', 'Mpangataka', 'Applicant')} *</label>
                      <input type="text" value={editingData.demandeur} onChange={(e) => setEditingData({ ...editingData, demandeur: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                      <input type="text" value={editingData.telephone} onChange={(e) => setEditingData({ ...editingData, telephone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={editingData.email} onChange={(e) => setEditingData({ ...editingData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('Région', 'Faritra', 'Region')}</label>
                      <select value={editingData.region || ''} onChange={(e) => setEditingData({ ...editingData, region: e.target.value })}>
                        <option value="">-- {t('Sélectionner', 'Misafidiana', 'Select')} --</option>
                        {regions.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('Adresse', 'Adiresy', 'Address')}</label>
                      <input type="text" value={editingData.adresse || ''} onChange={(e) => setEditingData({ ...editingData, adresse: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('Type d\'usager', 'Karazana mpampiasa', 'User type')}</label>
                    <select value={editingData.type_usager || selectedUsager.type_usager} onChange={(e) => setEditingData({ ...editingData, type_usager: e.target.value })}>
                      {usagerTypes.filter(tp => tp !== 'Autre').map(tp => <option key={tp} value={tp}>{usagerTypesLabels[tp]}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && usagerToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {t('Confirmation de suppression', 'Fanamarinana ny famafana', 'Deletion confirmation')}</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-info">
                <p><strong>👑 Super Admin</strong></p>
                <p><strong>{t('Usager', 'Mpampiasa', 'User')} :</strong> {usagerToDelete.denomination}</p>
                <p><strong>{t('Type', 'Karazana', 'Type')} :</strong> {usagerTypesLabels[usagerToDelete.type_usager] || usagerToDelete.type_usager}</p>
                <p><strong>{t('Demandeur', 'Mpangataka', 'Applicant')} :</strong> {usagerToDelete.demandeur}</p>
              </div>
              <div className="delete-confirmation-info">
                <p className="delete-warning">⚠️ {t('Cette action est irréversible !', 'Tsy azo ivalozana ity hetsika ity !', 'This action is irreversible!')}</p>
              </div>
              {deleteError && (
                <p className="delete-warning" style={{ color: '#c0392b', fontWeight: 'bold' }}>
                  ❌ {deleteError}
                </p>
              )}
              <div className="delete-actions">
                <button className="btn-confirm-delete" onClick={confirmDelete}>
                  🗑️ {t('Confirmer', 'Hamarino', 'Confirm')}
                </button>
                <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                  ❌ {t('Annuler', 'Foanana', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionCrud;