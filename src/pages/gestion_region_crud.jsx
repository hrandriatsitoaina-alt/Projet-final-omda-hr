// src/pages/GestionRegionCrud.jsx
import React, { useState, useEffect } from 'react';
import '../styles/gestion_crud.css';
import { Edit, Trash2, ArrowLeft, Plus, MapPin, AlertCircle, Home, Building2 } from 'lucide-react';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';
const DELETE_TIMEOUT_MS = 10000;

const GestionRegionCrud = ({ onBack }) => {
  const { t } = useT();

  const [regions, setRegions] = useState([]);          // [{ id, nom, villes: [...] }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [token, setToken] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Modal ajout ville
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVille, setNewVille] = useState({
    region_nom: '',
    ville: '',
    quartier: '',
    telephone: '',
  });

  // Modal édition ville
  const [editingVille, setEditingVille] = useState(null);
  const [editData, setEditData] = useState({
    region_nom: '',
    ville: '',
    quartier: '',
    telephone: '',
  });

  // Modal suppression ville
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [villeToDelete, setVilleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // ============================================================
  // INITIALISATION
  // ============================================================
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    const storedRole =
      localStorage.getItem('adminAccessRole') ||
      localStorage.getItem('adminRole');

    console.log('🔎 Init GestionRegionCrud');
    console.log('   token :', storedToken ? 'présent' : 'absent');
    console.log('   role  :', storedRole);

    if (storedToken) {
      setToken(storedToken);
      setCurrentUserRole(storedRole || 'user');
      fetchRegionsAvecVilles(storedToken);
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

  // ============================================================
  // ✅ CHARGEMENT : Régions + Villes (via /regions/avec-villes)
  // ============================================================
  const fetchRegionsAvecVilles = async (currentToken) => {
    setLoading(true);
    setError(null);
    try {
      const headers = currentToken ? { adminToken: currentToken } : {};

      // ✅ APPELER /regions/avec-villes AU LIEU DE /regions
      const response = await fetch(`${API_URL}/regions/avec-villes`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      console.log('📦 /regions/avec-villes réponse:', data);

      if (data.success) {
        setRegions(data.regions || []);
      } else {
        setError(data.message || t('Erreur', 'Olana', 'Error'));
        setRegions([]);
      }
    } catch (err) {
      console.error('fetchRegionsAvecVilles error:', err);

      // ✅ FALLBACK : si /avec-villes échoue, construire manuellement
      console.log('⚠️ Fallback : construction manuelle depuis /regions + /villes');
      try {
        const headers = currentToken ? { adminToken: currentToken } : {};

        const [regionsRes, villesRes] = await Promise.all([
          fetch(`${API_URL}/regions`, { headers }).then(r => r.json()),
          fetch(`${API_URL}/villes`, { headers }).then(r => r.json()),
        ]);

        if (regionsRes.success) {
          const regionsAvecVilles = (regionsRes.regions || []).map(r => ({
            ...r,
            villes: villesRes.success
              ? (villesRes.villes || []).filter(v => v.region_id === r.id)
              : [],
          }));
          setRegions(regionsAvecVilles);
        } else {
          setError(regionsRes.message || t('Erreur', 'Olana', 'Error'));
          setRegions([]);
        }
      } catch (err2) {
        console.error('Fallback error:', err2);
        setError(err2.message || t('Erreur de connexion', 'Nisy olana', 'Connection error'));
        setRegions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // AJOUT VILLE
  // ============================================================
  const handleAddVille = async (e) => {
    e.preventDefault();
    const trimmedRegion = newVille.region_nom.trim();
    const trimmedVille = newVille.ville.trim();

    if (!trimmedRegion) {
      setError(t('La région est obligatoire', 'Ilaina ny faritra', 'Region required'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!trimmedVille) {
      setError(t('La ville est obligatoire', 'Ilaina ny tanàna', 'City required'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!token) {
      setError(t('Token manquant', 'Tsy misy token', 'Token missing'));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/regions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({
          nom: trimmedRegion,
          ville: trimmedVille,
          quartier: newVille.quartier.trim() || null,
          telephone: newVille.telephone.trim() || null,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(
          `✅ Ville "${trimmedVille}" ajoutée à "${trimmedRegion}"`,
          `✅ Nampiana "${trimmedVille}" tamin'ny "${trimmedRegion}"`,
          `✅ City "${trimmedVille}" added to "${trimmedRegion}"`
        ));
        setShowAddModal(false);
        setNewVille({ region_nom: '', ville: '', quartier: '', telephone: '' });
        await fetchRegionsAvecVilles(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || t('Erreur ajout', 'Olana', 'Add error'));
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      console.error('handleAddVille error:', err);
      setError(`${t('Erreur de connexion', 'Nisy olana', 'Connection error')} : ${err.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // ============================================================
  // ÉDITION VILLE
  // ============================================================
  const handleEditClick = (ville, regionNom) => {
    setEditingVille(ville);
    setEditData({
      region_nom: regionNom || '',
      ville: ville.nom || '',
      quartier: ville.quartier || '',
      telephone: ville.telephone || '',
    });
  };

  const handleUpdateVille = async (e) => {
    e.preventDefault();
    if (!editingVille) return;

    const trimmedVille = editData.ville.trim();
    if (!trimmedVille) {
      setError(t('La ville est obligatoire', 'Ilaina ny tanàna', 'City required'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!token) {
      setError(t('Token manquant', 'Tsy mysy token', 'Token missing'));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/villes/${editingVille.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({
          nom: trimmedVille,
          quartier: editData.quartier.trim() || null,
          telephone: editData.telephone.trim() || null,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(t(
          `✅ Ville "${trimmedVille}" mise à jour`,
          `✅ Voaova "${trimmedVille}"`,
          `✅ City "${trimmedVille}" updated`
        ));
        setEditingVille(null);
        setEditData({ region_nom: '', ville: '', quartier: '', telephone: '' });
        await fetchRegionsAvecVilles(token);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || t('Erreur mise à jour', 'Olana', 'Update error'));
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('handleUpdateVille error:', err);
      setError(`${t('Erreur de connexion', 'Nisy olana', 'Connection error')} : ${err.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // ============================================================
  // SUPPRESSION VILLE
  // ============================================================
  const confirmDelete = (ville, regionNom) => {
    if (currentUserRole !== 'super_admin') {
      setError(t(
        `⚠️ Seul le Super Admin peut supprimer. Votre rôle : ${currentUserRole || 'inconnu'}`,
        `⚠️ Super Admin ihany. Ny andraikitrao : ${currentUserRole || 'tsy fantatra'}`,
        `⚠️ Only Super Admin. Your role: ${currentUserRole || 'unknown'}`
      ));
      setTimeout(() => setError(null), 5000);
      return;
    }
    setVilleToDelete({ ...ville, region_nom: regionNom });
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteVille = async () => {
    if (!villeToDelete) return;
    if (!token) {
      setDeleteError(t('Token manquant', 'Tsy misy token', 'Token missing'));
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⏱️  Timeout suppression dépassé');
    }, DELETE_TIMEOUT_MS);

    try {
      const url = `${API_URL}/villes/${villeToDelete.id}`;
      console.log('🗑️  DELETE', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { adminToken: token },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('❌ Réponse non-JSON:', rawText.slice(0, 200));
        throw new Error(`Réponse invalide (HTTP ${response.status})`);
      }

      console.log('← status :', response.status, '| data :', data);

      if (response.ok && data.success) {
        const nomSupprime = villeToDelete.nom;
        setShowDeleteModal(false);
        setVilleToDelete(null);
        setDeleteError(null);

        setSuccessMsg(t(
          `✅ Ville "${nomSupprime}" supprimée`,
          `✅ Voafafa "${nomSupprime}"`,
          `✅ City "${nomSupprime}" deleted`
        ));

        await fetchRegionsAvecVilles(token);
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }

      if (response.status === 409) {
        setDeleteError({
          title: t('Suppression impossible', 'Tsy azo atao', 'Deletion impossible'),
          message: data.message,
          details: data.details || [],
          hint: data.hint,
        });
        setIsDeleting(false);
        return;
      }

      throw new Error(data.message || `HTTP ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('❌ handleDeleteVille error:', err);

      let errorMessage;
      if (err.name === 'AbortError') {
        errorMessage = t('⏱️ Délai dépassé', '⏱️ Ela loatra', '⏱️ Timeout');
      } else {
        errorMessage = err.message || t('Erreur de connexion', 'Nisy olana', 'Connection error');
      }

      setDeleteError({
        title: t('Erreur', 'Olana', 'Error'),
        message: errorMessage,
        details: [],
      });
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setVilleToDelete(null);
    setDeleteError(null);
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
        <p>{t('Chargement...', 'Maka...', 'Loading...')}</p>
      </div>
    );
  }

  if (error && !successMsg && regions.length === 0) {
    return (
      <div className="gestion-crud-error">
        <p>❌ {error}</p>
        <button onClick={() => fetchRegionsAvecVilles(token)} className="retry-btn">
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
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2em' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="gestion-header">
        <div className="gestion-header-left">
          <h2><MapPin size={24} /> {t('Gestion des Régions', 'Fitantanana ny Faritra', 'Region Management')}</h2>
          <p className="gestion-subtitle">
            {currentUserRole === 'super_admin'
              ? t('👑 Super Admin', '👑 Super Admin', '👑 Super Admin')
              : t(
                  `👤 Rôle : ${currentUserRole || 'utilisateur'}`,
                  `👤 Andraikitra : ${currentUserRole || 'mpampiasa'}`,
                  `👤 Role: ${currentUserRole || 'user'}`
                )}
          </p>
        </div>
        <div className="gestion-header-right">
          {onBack && (
            <button className="btn-back-admin" onClick={onBack}>
              <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
          )}
        </div>
      </div>

      <div className="search-filter-container" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> {t('Ajouter une ville', 'Hanampy tanàna', 'Add a city')}
        </button>
      </div>

      {/* ✅ TABLEAU GROUPÉ PAR RÉGION */}
      <div className="table-wrapper">
        <table className="usager-table region-grouped-table">
          <thead>
            <tr>
              <th>{t('Région', 'Faritra', 'Region')}</th>
              <th>{t('Ville', 'Tanàna', 'City')}</th>
              <th>{t('Quartier', 'Fokontany', 'Neighborhood')}</th>
              <th>{t('Téléphone', 'Finday', 'Phone')}</th>
              <th>{t('Actions', 'Hetsika', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {regions.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  📭 {t('Aucune région enregistrée', 'Tsy misy faritra', 'No region')}
                </td>
              </tr>
            ) : (
              regions.map((region) => {
                const villesDeLaRegion = region.villes || [];

                // Cas 1 : aucune ville
                if (villesDeLaRegion.length === 0) {
                  return (
                    <tr key={region.id} className="region-row">
                      <td className="region-name-cell">
                        <strong className="region-badge">
                          <MapPin size={13} /> {region.nom}
                        </strong>
                      </td>
                      <td colSpan="4" className="no-data-inline">
                        {t('Aucune ville', 'Tsy misy tanàna', 'No city')}
                      </td>
                    </tr>
                  );
                }

                // Cas 2 : une ligne par ville
                return villesDeLaRegion.map((ville, idx) => (
                  <tr key={`${region.id}-${ville.id}`} className="ville-row">
                    {/* Région : affichée seulement sur la première ligne */}
                    <td className="region-name-cell">
                      {idx === 0 ? (
                        <strong className="region-badge">
                          <MapPin size={13} /> {region.nom}
                        </strong>
                      ) : (
                        <span className="region-empty">↳</span>
                      )}
                    </td>

                    {/* Ville */}
                    <td className="ville-cell">
                      <span className="ville-badge">
                        <Home size={12} /> {ville.nom}
                      </span>
                    </td>

                    {/* Quartier */}
                    <td className="quartier-cell">
                      {ville.quartier ? (
                        <span className="quartier-badge">
                          <Building2 size={12} /> {ville.quartier}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Téléphone */}
                    <td className="telephone-cell">
                      {ville.telephone ? formatPhone(ville.telephone) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="actions-cell">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditClick(ville, region.nom)}
                        title={t('Modifier', 'Ovay', 'Edit')}
                      >
                        <Edit size={16} /> {t('Modifier', 'Ovay', 'Edit')}
                      </button>
                      {currentUserRole === 'super_admin' && (
                        <button
                          className="btn-delete"
                          onClick={() => confirmDelete(ville, region.nom)}
                          title={t('Supprimer', 'Fafao', 'Delete')}
                        >
                          <Trash2 size={16} /> {t('Supprimer', 'Fafao', 'Delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================ MODAL AJOUT VILLE ================ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Plus size={20} /> {t('Ajouter une ville', 'Hanampy tanàna', 'Add a city')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddVille}>
              <div className="form-group">
                <label>{t('Région', 'Faritra', 'Region')} *</label>
                <input
                  type="text"
                  value={newVille.region_nom}
                  onChange={(e) => setNewVille({ ...newVille, region_nom: e.target.value })}
                  placeholder={t('Ex: Analamanga', 'Oh: Analamanga', 'E.g. Analamanga')}
                  list="regions-datalist-add"
                  required
                />
                <datalist id="regions-datalist-add">
                  {regions.map(r => <option key={r.id} value={r.nom} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label>{t('Ville', 'Tanàna', 'City')} *</label>
                <input
                  type="text"
                  value={newVille.ville}
                  onChange={(e) => setNewVille({ ...newVille, ville: e.target.value })}
                  placeholder={t('Ex: ANTANANARIVO', 'Oh: ANTANANARIVO', 'E.g. ANTANANARIVO')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Quartier', 'Fokontany', 'Neighborhood')}</label>
                <input
                  type="text"
                  value={newVille.quartier}
                  onChange={(e) => setNewVille({ ...newVille, quartier: e.target.value })}
                  placeholder={t('Ex: Antaninandro', 'Oh: Antaninandro', 'E.g. Antaninandro')}
                />
              </div>
              <div className="form-group">
                <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                <input
                  type="text"
                  value={newVille.telephone}
                  onChange={(e) => setNewVille({ ...newVille, telephone: e.target.value })}
                  placeholder={t('Ex: 0341234567', 'Oh: 0341234567', 'E.g. 0341234567')}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">✅ {t('Ajouter', 'Hanampy', 'Add')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================ MODAL ÉDITION VILLE ================ */}
      {editingVille && (
        <div className="modal-overlay" onClick={() => setEditingVille(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit size={20} /> {t('Modifier la ville', 'Ovay ny tanàna', 'Edit city')}</h3>
              <button className="modal-close" onClick={() => setEditingVille(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateVille}>
              <div className="form-group">
                <label>{t('Région', 'Faritra', 'Region')}</label>
                <input
                  type="text"
                  value={editData.region_nom}
                  disabled
                  style={{ background: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>{t('Ville', 'Tanàna', 'City')} *</label>
                <input
                  type="text"
                  value={editData.ville}
                  onChange={(e) => setEditData({ ...editData, ville: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('Quartier', 'Fokontany', 'Neighborhood')}</label>
                <input
                  type="text"
                  value={editData.quartier}
                  onChange={(e) => setEditData({ ...editData, quartier: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                <input
                  type="text"
                  value={editData.telephone}
                  onChange={(e) => setEditData({ ...editData, telephone: e.target.value })}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-save">💾 {t('Enregistrer', 'Tehirizo', 'Save')}</button>
                <button type="button" className="btn-cancel" onClick={() => setEditingVille(null)}>❌ {t('Annuler', 'Foanana', 'Cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================ MODAL SUPPRESSION ================ */}
      {showDeleteModal && villeToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {t('Confirmation', 'Fanamarinana', 'Confirmation')}</h3>
              <button className="modal-close" onClick={closeDeleteModal} disabled={isDeleting}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-info">
                <p><strong>{t('Région', 'Faritra', 'Region')} :</strong> {villeToDelete.region_nom}</p>
                <p><strong>{t('Ville', 'Tanàna', 'City')} :</strong> {villeToDelete.nom}</p>
                <p><strong>{t('Quartier', 'Fokontany', 'Neighborhood')} :</strong> {villeToDelete.quartier || '—'}</p>
                <p><strong>{t('Téléphone', 'Finday', 'Phone')} :</strong> {formatPhone(villeToDelete.telephone) || '—'}</p>
              </div>

              {deleteError && (
                <div className="delete-error-box">
                  <div className="delete-error-header">
                    <AlertCircle size={20} />
                    <strong>{deleteError.title}</strong>
                  </div>
                  <p className="delete-error-message">{deleteError.message}</p>
                  {deleteError.details && deleteError.details.length > 0 && (
                    <div className="delete-error-details">
                      <ul>
                        {deleteError.details.map((d, i) => (
                          <li key={i}><strong>{d.count}</strong> {d.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {deleteError.hint && <p className="delete-error-hint">💡 {deleteError.hint}</p>}
                </div>
              )}

              {!deleteError && (
                <div className="delete-confirmation-info">
                  <p className="delete-warning">
                    ⚠️ {t('Cette action est irréversible !', 'Tsy azo ivalozana !', 'Irreversible!')}
                  </p>
                </div>
              )}

              <div className="delete-actions">
                {!deleteError && (
                  <button className="btn-confirm-delete" onClick={handleDeleteVille} disabled={isDeleting}>
                    {isDeleting
                      ? t('Suppression…', 'Famafana…', 'Deleting…')
                      : (<><Trash2 size={16} /> {t('Confirmer', 'Hamarino', 'Confirm')}</>)}
                  </button>
                )}
                <button className="btn-cancel" onClick={closeDeleteModal} disabled={isDeleting}>
                  {deleteError ? `← ${t('Fermer', 'Hidio', 'Close')}` : `❌ ${t('Annuler', 'Foanana', 'Cancel')}`}
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