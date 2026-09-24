// src/pages/GestionRegionCrud.jsx
import React, { useState, useEffect } from 'react';
import '../styles/gestion_crud.css';
import { Edit, Trash2, ArrowLeft, Plus, MapPin } from 'lucide-react';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const GestionRegionCrud = ({ onBack }) => {
  // ✅ LANGUE UNIQUE
  const { t } = useT();

  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [token, setToken] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRegion, setNewRegion] = useState({ nom: '', telephone: '' });

  const [editingRegion, setEditingRegion] = useState(null);
  const [editData, setEditData] = useState({ nom: '', telephone: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUserRole(storedToken);
      fetchRegions(storedToken);
    } else {
      setError(t(
        'Token d\'administration manquant. Veuillez vous reconnecter.',
        'Tsy misy ny mari-pahaizana admin. Mifandraisa indray.',
        'Admin token missing. Please log in again.'
      ));
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCurrentUserRole = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/current-user', {
        headers: { Authorization: `Bearer ${currentToken}`, adminToken: currentToken },
      });
      const data = await response.json();
      if (data.success && data.user) {
        setCurrentUserRole(data.user.role || 'user');
      } else {
        setCurrentUserRole('user');
      }
    } catch (error) {
      console.error('Erreur fetchCurrentUserRole:', error);
      setCurrentUserRole('user');
    }
  };

  const fetchRegions = async (currentToken) => {
    setLoading(true);
    setError(null);
    try {
      const headers = currentToken ? { adminToken: currentToken } : {};
      const response = await fetch('http://localhost:3001/api/regions', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setRegions(data.regions || []);
      } else {
        setError(data.message || t(
          'Erreur lors du chargement des régions',
          'Nisy olana tamin\'ny fakana ny faritra',
          'Error loading regions'
        ));
        setRegions([]);
      }
    } catch (error) {
      console.error('fetchRegions error:', error);
      setError(error.message || t(
        'Erreur de connexion',
        'Nisy olana tamin\'ny fifandraisana',
        'Connection error'
      ));
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  // AJOUT
  const handleAddRegion = async (e) => {
    e.preventDefault();
    const trimmedNom = newRegion.nom.trim();
    if (!trimmedNom) {
      setError(t(
        'Le nom de la région est obligatoire.',
        'Ilaina ny anaran\'ny faritra.',
        'Region name is required.'
      ));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!token) {
      setError(t(
        'Token manquant, veuillez vous reconnecter.',
        'Tsy misy ny mari-pahaizana. Mifandraisa indray.',
        'Token missing, please log in again.'
      ));
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/api/regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: token,
        },
        body: JSON.stringify({
          nom: trimmedNom,
          telephone: newRegion.telephone.trim() || null,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(
          `✅ Région "${trimmedNom}" ajoutée avec succès`,
          `✅ Nampiana soa aman-tsara ny faritra "${trimmedNom}"`,
          `✅ Region "${trimmedNom}" added successfully`
        ));
        setShowAddModal(false);
        setNewRegion({ nom: '', telephone: '' });
        await fetchRegions(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || t(
          'Erreur lors de l\'ajout',
          'Nisy olana tamin\'ny fampidirana',
          'Error while adding'
        ));
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('handleAddRegion error:', error);
      setError(`${t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error')} : ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // ÉDITION
  const handleEditClick = (region) => {
    setEditingRegion(region);
    setEditData({
      nom: region.nom || '',
      telephone: region.telephone || '',
    });
  };

  const handleUpdateRegion = async (e) => {
    e.preventDefault();
    const trimmedNom = editData.nom.trim();
    if (!trimmedNom) {
      setError(t(
        'Le nom de la région est obligatoire.',
        'Ilaina ny anaran\'ny faritra.',
        'Region name is required.'
      ));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!token) {
      setError(t('Token manquant', 'Tsy misy ny mari-pahaizana', 'Token missing'));
      return;
    }
    try {
      const response = await fetch(`http://localhost:3001/api/regions/${editingRegion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          adminToken: token,
        },
        body: JSON.stringify({
          nom: trimmedNom,
          telephone: editData.telephone.trim() || null,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(
          `✅ Région "${trimmedNom}" mise à jour`,
          `✅ Voaova ny faritra "${trimmedNom}"`,
          `✅ Region "${trimmedNom}" updated`
        ));
        setEditingRegion(null);
        setEditData({ nom: '', telephone: '' });
        await fetchRegions(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || t(
          'Erreur lors de la mise à jour',
          'Nisy olana tamin\'ny fanavaozana',
          'Error while updating'
        ));
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('handleUpdateRegion error:', error);
      setError(`${t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error')} : ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // SUPPRESSION
  const confirmDelete = (region) => {
    if (currentUserRole !== 'super_admin') {
      setError(t(
        '⚠️ Seul le Super Admin peut supprimer des régions.',
        '⚠️ Ny Super Admin ihany no afaka mamafa faritra.',
        '⚠️ Only Super Admin can delete regions.'
      ));
      setTimeout(() => setError(null), 3000);
      return;
    }
    setRegionToDelete(region);
    setShowDeleteModal(true);
  };

  const handleDeleteRegion = async () => {
    if (!regionToDelete) {
      setError(t('Aucune région sélectionnée', 'Tsy misy faritra voafidy', 'No region selected'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!token) {
      setError(t(
        'Token manquant, veuillez vous reconnecter',
        'Tsy misy ny mari-pahaizana. Mifandraisa indray.',
        'Token missing, please log in again'
      ));
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/regions/${regionToDelete.id}`, {
        method: 'DELETE',
        headers: { adminToken: token },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(
          `✅ Région "${regionToDelete.nom}" supprimée`,
          `✅ Voafafa ny faritra "${regionToDelete.nom}"`,
          `✅ Region "${regionToDelete.nom}" deleted`
        ));
        setShowDeleteModal(false);
        setRegionToDelete(null);
        await fetchRegions(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || t(
          'Erreur lors de la suppression',
          'Nisy olana tamin\'ny famafana',
          'Error while deleting'
        ));
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('❌ handleDeleteRegion error:', error);
      setError(`${t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error')} : ${error.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
  };

  if (loading) {
    return (
      <div className="gestion-crud-loading">
        <div className="spinner"></div>
        <p>{t('Chargement des régions...', 'Maka ny faritra...', 'Loading regions...')}</p>
      </div>
    );
  }

  if (error && !successMsg) {
    return (
      <div className="gestion-crud-error">
        <p>❌ {error}</p>
        <button onClick={() => fetchRegions(token)} className="retry-btn">
          🔄 {t('Réessayer', 'Andramo indray', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="gestion-crud-container">
      {successMsg && (
        <div className="success-banner">
          <span>✓</span> {successMsg}
        </div>
      )}
      {error && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="gestion-header">
        <div className="gestion-header-left">
          <h2><MapPin size={24} /> {t('Gestion des Régions', 'Fitantanana ny Faritra', 'Region Management')}</h2>
          <p className="gestion-subtitle">
            {currentUserRole === 'super_admin'
              ? t(
                  '👑 Super Admin - Vous pouvez ajouter, modifier et supprimer les régions',
                  '👑 Super Admin - Afaka manampy, manova ary mamafa faritra ianao',
                  '👑 Super Admin - You can add, edit and delete regions'
                )
              : t(
                  '👤 Vous pouvez consulter, ajouter et modifier les régions (suppression réservée au Super Admin)',
                  '👤 Afaka mijery, manampy ary manova faritra ianao (ny famafana dia natokana ho an\'ny Super Admin)',
                  '👤 You can view, add and edit regions (deletion reserved for Super Admin)'
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

      <div className="search-filter-container" style={{ justifyContent: 'space-between' }}>
        <div></div>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> {t('Ajouter une région', 'Hanampy faritra', 'Add a region')}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="usager-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('Nom', 'Anarana', 'Name')}</th>
              <th>{t('Téléphone', 'Finday', 'Phone')}</th>
              <th>{t('Actions', 'Hetsika', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {regions.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  📭 {t('Aucune région enregistrée', 'Tsy misy faritra voarakitra', 'No region recorded')}
                </td>
              </tr>
            ) : (
              regions.map(region => (
                <tr key={region.id}>
                  <td>{region.id}</td>
                  <td><strong>{region.nom}</strong></td>
                  <td>{formatPhone(region.telephone) || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleEditClick(region)} title={t('Modifier', 'Ovay', 'Edit')}>
                      <Edit size={16} /> {t('Modifier', 'Ovay', 'Edit')}
                    </button>
                    {currentUserRole === 'super_admin' && (
                      <button className="btn-delete" onClick={() => confirmDelete(region)} title={t('Supprimer', 'Fafao', 'Delete')}>
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

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Plus size={20} /> {t('Ajouter une région', 'Hanampy faritra', 'Add a region')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddRegion}>
              <div className="form-group">
                <label>{t('Nom', 'Anarana', 'Name')} *</label>
                <input
                  type="text"
                  value={newRegion.nom}
                  onChange={(e) => setNewRegion({ ...newRegion, nom: e.target.value })}
                  placeholder={t('Ex: Analamanga', 'Oh: Analamanga', 'E.g. Analamanga')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Téléphone (optionnel)', 'Finday (tsy voatery)', 'Phone (optional)')}</label>
                <input
                  type="text"
                  value={newRegion.telephone}
                  onChange={(e) => setNewRegion({ ...newRegion, telephone: e.target.value })}
                  placeholder={t('Ex: 0341234567', 'Oh: 0341234567', 'E.g. 0341234567')}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">
                  ✅ {t('Ajouter', 'Hanampy', 'Add')}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  ❌ {t('Annuler', 'Foanana', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition */}
      {editingRegion && (
        <div className="modal-overlay" onClick={() => setEditingRegion(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier la région', 'Ovay ny faritra', 'Edit the region')}</h3>
              <button className="modal-close" onClick={() => setEditingRegion(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateRegion}>
              <div className="form-group">
                <label>{t('Nom', 'Anarana', 'Name')} *</label>
                <input
                  type="text"
                  value={editData.nom}
                  onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                <input
                  type="text"
                  value={editData.telephone}
                  onChange={(e) => setEditData({ ...editData, telephone: e.target.value })}
                  placeholder={t('Ex: 0341234567', 'Oh: 0341234567', 'E.g. 0341234567')}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">
                  💾 {t('Enregistrer', 'Tehirizo', 'Save')}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setEditingRegion(null)}>
                  ❌ {t('Annuler', 'Foanana', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && regionToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {t('Confirmation de suppression', 'Fanamarinana ny famafana', 'Deletion confirmation')}</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-info">
                <p><strong>👑 Super Admin</strong></p>
                <p><strong>{t('Région', 'Faritra', 'Region')} :</strong> {regionToDelete.nom}</p>
                <p><strong>{t('Téléphone', 'Finday', 'Phone')} :</strong> {formatPhone(regionToDelete.telephone) || '—'}</p>
              </div>
              <div className="delete-confirmation-info">
                <p className="delete-warning">
                  ⚠️ {t('Cette action est irréversible !', 'Tsy azo ivalozana ity hetsika ity !', 'This action is irreversible!')}
                </p>
              </div>
              <div className="delete-actions">
                <button className="btn-confirm-delete" onClick={handleDeleteRegion}>
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

export default GestionRegionCrud;