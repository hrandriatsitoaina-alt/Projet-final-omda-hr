// src/pages/base_de_donnees.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  Database, Download, Upload, RefreshCw, HardDrive,
  FolderOpen, Loader2, ArrowLeft,
  ShieldCheck, History, X, Folder, AlertTriangle,
  Table, HardDrive as HardDriveIcon, CheckCircle2, FileWarning, Trash2,
  Lock, Eye, EyeOff, Key,
} from 'lucide-react';
import '../styles/base_de_donnees.css';
import { useT } from '../hooks/useT';
import { useParametres } from '../context/ParametreContext';

const API_BASE = 'http://localhost:3001/api';

function getUtilisateurId() {
  try {
    const raw = localStorage.getItem('utilisateur') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw).id;
  } catch (e) { /* ignore */ }
  return localStorage.getItem('userId') || null;
}

function getAdminToken() {
  return (
    localStorage.getItem('adminToken') ||
    localStorage.getItem('token') ||
    ''
  );
}

const BaseDeDonnees = () => {
  const navigate = useNavigate();
  const showToast = useToast();
  const { t, langue } = useT();
  const { parametres } = useParametres();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const userId = getUtilisateurId();

  const [loading, setLoading] = useState(true);
  const [dbSize, setDbSize] = useState('0 MB');
  const [dbTables, setDbTables] = useState(0);
  const [dossierBackup, setDossierBackup] = useState('');
  const [infoDossier, setInfoDossier] = useState({ nombreFichiers: 0, tailleTotale: '0 MB' });
  const [historique, setHistorique] = useState([]);

  const [isBackingUpManuel, setIsBackingUpManuel] = useState(false);
  const [isBackingUpAuto, setIsBackingUpAuto] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [fichierRestore, setFichierRestore] = useState(null);

  // Confirmation finale
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  // ✅ Sécurité — Mot de passe 4 chiffres
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const passwordInputRef = useRef(null);

  const [restoreResult, setRestoreResult] = useState(null);

  const styles = useMemo(() => ({
    fontFamily: parametres.police !== 'default' ? parametres.police : 'inherit',
    fontSize:
      parametres.tailleTexte === 'small' ? '13px' :
      parametres.tailleTexte === 'medium' ? '15px' :
      parametres.tailleTexte === 'large' ? '18px' : '21px',
  }), [parametres.police, parametres.tailleTexte]);

  // ============================================================
  // FETCH GLOBAL
  // ============================================================
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const dbRes = await fetch(`${API_BASE}/database/size`);
      const dbData = await dbRes.json();
      if (dbData && dbData.success) setDbSize(dbData.size || '0 MB');

      const dossierRes = await fetch(`${API_BASE}/backup/dossier-info`);
      const dossierData = await dossierRes.json();
      if (dossierData && dossierData.success) {
        setDossierBackup(dossierData.dossier || '');
        setInfoDossier({
          nombreFichiers: dossierData.nombreFichiers || 0,
          tailleTotale: dossierData.tailleTotale || '0 MB',
        });
      }

      const histoRes = await fetch(`${API_BASE}/backup/historique`);
      const histoData = await histoRes.json();
      if (histoData && histoData.success) setHistorique(histoData.historique || []);

      try {
        const tablesRes = await fetch(`${API_BASE}/parametres/db-tables-count`);
        const tablesData = await tablesRes.json();
        if (tablesData && tablesData.success) setDbTables(tablesData.count || 0);
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Erreur chargement:', error);
      showToast(t('Erreur de chargement', 'Nisy olana', 'Error loading'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (showPasswordStep) {
      const id = setTimeout(() => passwordInputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
  }, [showPasswordStep]);

  // ============================================================
  // SAUVEGARDE MANUELLE
  // ============================================================
  const handleBackupManuel = async () => {
    setIsBackingUpManuel(true);
    try {
      const res = await fetch(`${API_BASE}/backup/manuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      showToast(
        data.message || (data.success ? '✅ Sauvegarde effectuée' : '❌ Échec'),
        data.success ? 'success' : 'error'
      );

      if (data.success) await fetchAll();
    } catch (error) {
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'), 'error');
    } finally {
      setIsBackingUpManuel(false);
    }
  };

  // ============================================================
  // SAUVEGARDE AUTO
  // ============================================================
  const handleBackupAuto = async () => {
    setIsBackingUpAuto(true);
    try {
      const res = await fetch(`${API_BASE}/backup/auto`, { method: 'POST' });
      const data = await res.json();

      showToast(
        data.message || (data.success ? '✅ Sauvegarde effectuée' : '❌ Échec'),
        data.success ? 'success' : 'error'
      );

      if (data.success) await fetchAll();
    } catch (error) {
      showToast(t('❌ Erreur', '❌ Nisy olana', '❌ Error'), 'error');
    } finally {
      setIsBackingUpAuto(false);
    }
  };

  // ============================================================
  // ÉTAPE 1 : Sélection du fichier → ouvrir étape mot de passe
  // ============================================================
  const handleOpenPasswordStep = () => {
    if (!fichierRestore) {
      showToast(
        t('Veuillez sélectionner un fichier .sql', 'Misafidiana rakitra .sql', 'Please select a .sql file'),
        'error'
      );
      return;
    }
    if (fichierRestore.size === 0) {
      showToast(
        t('Le fichier est vide', 'Foana ny rakitra', 'File is empty'),
        'error'
      );
      return;
    }

    setSecurityPassword('');
    setPasswordError('');
    setShowPassword(false);
    setShowPasswordStep(true);
  };

  // ============================================================
  // ÉTAPE 2 : Vérification du mot de passe 4 chiffres
  // ============================================================
  const handleVerifyPassword = async () => {
    if (!/^\d{4}$/.test(securityPassword)) {
      setPasswordError(
        t('Saisissez exactement 4 chiffres', 'Ampidiro 4 isa marina', 'Enter exactly 4 digits')
      );
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError('');

    try {
      const res = await fetch(`${API_BASE}/gestionbd/restauration/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: getAdminToken(),
        },
        body: JSON.stringify({ password: securityPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setShowPasswordStep(false);
        setSecurityPassword('');
        setShowPassword(false);
        setShowConfirmStep(true);
      } else {
        setPasswordError(
          data.message || t('Mot de passe incorrect', 'Diso ny kaody', 'Wrong password')
        );
        setSecurityPassword('');
      }
    } catch (err) {
      console.error('handleVerifyPassword:', err);
      setPasswordError(
        t('Erreur de connexion', 'Nisy olana', 'Connection error')
      );
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // ============================================================
  // ÉTAPE 3 : Confirmation finale → Restauration effective
  // ============================================================
  const handleRestore = async () => {
    if (!fichierRestore) {
      showToast(
        t('Veuillez sélectionner un fichier .sql', 'Misafidiana rakitra .sql', 'Please select a .sql file'),
        'error'
      );
      return;
    }

    if (fichierRestore.size === 0) {
      showToast(
        t('Le fichier est vide', 'Foana ny rakitra', 'File is empty'),
        'error'
      );
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('backup', fichierRestore);
      formData.append('userId', userId || '');

      const res = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setRestoreResult({
          success: true,
          message: data.message,
          details: data.details,
        });

        showToast(data.message || '✅ Restauration effectuée', 'success');

        setShowConfirmStep(false);
        setShowRestoreModal(false);
        setFichierRestore(null);

        await fetchAll();

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast(data.message || '❌ Échec de la restauration', 'error');
        setRestoreResult({
          success: false,
          message: data.message,
        });
      }
    } catch (error) {
      console.error('Erreur restauration:', error);
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'), 'error');
      setRestoreResult({
        success: false,
        message: error.message,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // ============================================================
  // FERMETURE DES MODALES
  // ============================================================
  const closeAllModals = () => {
    if (isRestoring || isVerifyingPassword) return;
    setShowPasswordStep(false);
    setShowConfirmStep(false);
    setShowRestoreModal(false);
    setFichierRestore(null);
    setSecurityPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  const closePasswordStep = () => {
    if (isVerifyingPassword) return;
    setShowPasswordStep(false);
    setSecurityPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  const handleTelecharger = (type) => {
    window.open(`${API_BASE}/backup/telecharger/${type}`, '_blank');
  };

  const formatDate = useCallback((date) => {
    try {
      return new Date(date).toLocaleString(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return date; }
  }, [locale]);

  const formatTaille = (octets) => {
    if (!octets || octets === 0) return '-';
    if (octets < 1024) return `${octets} o`;
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / 1024 / 1024).toFixed(2)} Mo`;
  };

  if (loading) {
    return (
      <div className="bdd-loading" style={styles}>
        <Loader2 size={48} className="spinner" />
        <p>{t('Chargement...', 'Maka...', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div className="bdd-container" style={styles}>
      <div className="bdd-header">
        <button className="btn-back" onClick={() => navigate('/Parametre_global')}>
          <ArrowLeft size={20} /> {t('Retour', 'Hiverina', 'Back')}
        </button>
        <h1 style={{ color: 'var(--primary-color)' }}>
          <Database size={28} /> {t('Gestion de la base de données', 'Fitantanana ny tahiry', 'Database management')}
        </h1>
        <button className="btn-refresh" onClick={fetchAll}><RefreshCw size={18} /></button>
      </div>

      {/* Message de résultat */}
      {restoreResult && restoreResult.success && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #28a745',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <CheckCircle2 size={24} />
          <div>
            <strong>✅ {restoreResult.message}</strong>
            {restoreResult.details && (
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                📁 {restoreResult.details.fichier} • {(restoreResult.details.taille / 1024).toFixed(1)} Ko
              </div>
            )}
          </div>
        </div>
      )}

      {restoreResult && !restoreResult.success && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc3545',
        }}>
          ❌ {restoreResult.message}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STATISTIQUES — SANS LA CARTE "SAUVEGARDE AUTO" (info cachée)
          ═══════════════════════════════════════════════════════════ */}
      <div className="bdd-grid">
        <div className="bdd-card" style={{ borderLeftColor: 'var(--primary-color)' }}>
          <div className="bdd-card-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
            <HardDriveIcon size={22} />
          </div>
          <div>
            <span className="bdd-card-title">{t('Taille de la base', 'Haben\'ny tahiry', 'Database size')}</span>
            <span className="bdd-card-value">{dbSize}</span>
          </div>
        </div>
        <div className="bdd-card" style={{ borderLeftColor: '#3498db' }}>
          <div className="bdd-card-icon" style={{ backgroundColor: '#3498db20', color: '#3498db' }}>
            <Table size={22} />
          </div>
          <div>
            <span className="bdd-card-title">{t('Nombre de tables', 'Isan\'ny tabilao', 'Number of tables')}</span>
            <span className="bdd-card-value">29</span>
          </div>
        </div>
        <div className="bdd-card" style={{ borderLeftColor: '#f39c12' }}>
          <div className="bdd-card-icon" style={{ backgroundColor: '#f39c1220', color: '#f39c12' }}>
            <Folder size={22} />
          </div>
          <div>
            <span className="bdd-card-title">{t('Fichiers sauvegardés', 'Rakitra', 'Files')}</span>
            <span className="bdd-card-value">{infoDossier.nombreFichiers}</span>
            <span className="bdd-card-value-small" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {infoDossier.tailleTotale}
            </span>
          </div>
        </div>
      </div>

      {/* Dossier */}
      <div className="bdd-section">
        <h3><FolderOpen size={20} /> {t('Dossier de sauvegarde', 'Rakitra fitehirizana', 'Backup folder')}</h3>
        <div className="bdd-info-banner success" style={{ backgroundColor: '#27ae6020', color: '#27ae60' }}>
          <ShieldCheck size={18} />
          <span>📁 {t('Sauvegardes dans', 'Voatahiry ao amin\'ny', 'Backups in')} : <strong>{dossierBackup}</strong></span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ACTIONS — SANS la mention des jours de sauvegarde
          ═══════════════════════════════════════════════════════════ */}
      <div className="bdd-section">
        <h3><Download size={20} /> {t('Sauvegardes', 'Fitehirizana', 'Backups')}</h3>
        <div className="bdd-actions-grid">
          <div className="bdd-action-card">
            <h4>📥 {t('Sauvegarde manuelle', 'Fitehirizana manualy', 'Manual backup')}</h4>
            <p>{t('Génère un export SQL complet.', 'Mamorona export SQL feno.', 'Generates a complete SQL export.')}</p>
            <div className="bdd-action-buttons">
              <button className="btn-primary" onClick={handleBackupManuel} disabled={isBackingUpManuel}>
                {isBackingUpManuel ? <><Loader2 size={18} className="spinner" /> {t('En cours...', 'Mandalo...', 'In progress...')}</> : <><Download size={18} /> {t('Sauvegarder', 'Tehirizo', 'Backup')}</>}
              </button>
              <button className="btn-secondary" onClick={() => handleTelecharger('manuel')}>
                <Download size={16} /> {t('Télécharger', 'Alaina', 'Download')}
              </button>
            </div>
          </div>

          <div className="bdd-action-card">
            <h4>🔄 {t('Sauvegarde automatique', 'Fitehirizana ho azy', 'Auto backup')}</h4>
            <p>{t('S\'exécute automatiquement selon la planification.', 'Mandeha ho azy araka ny fandaharam-potoana.', 'Runs automatically according to schedule.')}</p>
            <div className="bdd-action-buttons">
              <button className="btn-secondary" onClick={handleBackupAuto} disabled={isBackingUpAuto}>
                {isBackingUpAuto ? <><Loader2 size={18} className="spinner" /> {t('En cours...', 'Mandalo...', 'In progress...')}</> : <><RefreshCw size={18} /> {t('Lancer ', 'Alefaso izao', 'Run now')}</>}
              </button>
              <button className="btn-secondary" onClick={() => handleTelecharger('auto')}>
                <Download size={16} /> {t('Télécharger', 'Alaina', 'Download')}
              </button>
            </div>
          </div>

          <div className="bdd-action-card">
            <h4>↩️ {t('Restauration', 'Famerenana', 'Restore')}</h4>
            <p>
              {t(
                'Importe un fichier .sql pour restaurer la base. Mot de passe 4 chiffres requis.',
                'Mampiditra rakitra .sql hamerenana. Ilaina ny kaody 4 isa.',
                'Imports a .sql file to restore. 4-digit password required.'
              )}
            </p>
            <div className="bdd-action-buttons">
              <button className="btn-danger" onClick={() => setShowRestoreModal(true)}>
                <Lock size={18} /> {t('Restaurer', 'Avereno', 'Restore')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="bdd-section">
        <h3>
          <History size={20} /> {t('Historique', 'Tantaran\'ny', 'History')}
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '10px' }}>
            ({historique.length})
          </span>
        </h3>
        <div className="bdd-historique-list">
          <div className="bdd-historique-header">
            <span>{t('Type', 'Karazana', 'Type')}</span>
            <span>{t('Fichier', 'Rakitra', 'File')}</span>
            <span>{t('Taille', 'Habe', 'Size')}</span>
            <span>{t('Statut', 'Toe-javatra', 'Status')}</span>
            <span>{t('Date', 'Daty', 'Date')}</span>
          </div>
          {historique.map((h, index) => (
            <div className="bdd-historique-row" key={h.id} style={{
              backgroundColor: index === 0 ? 'var(--primary-light)' : 'transparent',
            }}>
              <span className={`bdd-type-badge bdd-type-${h.type_backup}`}>
                {h.type_backup === 'manuel' ? '📥 Manuel' :
                 h.type_backup === 'auto' ? '🔄 Auto' :
                 h.type_backup === 'restauration' ? '↩️ Restore' : h.type_backup}
              </span>
              <span title={h.chemin_complet || 'N/A'}>{h.nom_fichier || '-'}</span>
              <span>{formatTaille(h.taille_octets)}</span>
              <span className={`bdd-statut-badge bdd-statut-${h.statut}`}>
                {h.statut === 'succes' ? '✅ Succès' : h.statut === 'echec' ? '❌ Échec' : h.statut}
              </span>
              <span>{formatDate(h.created_at)}</span>
            </div>
          ))}
          {historique.length === 0 && (
            <div className="empty-state" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('Aucune sauvegarde', 'Tsy misy', 'No backup')}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ÉTAPE 1 : MODAL SÉLECTION DU FICHIER
          ═══════════════════════════════════════════════════════════ */}
      {showRestoreModal && !showPasswordStep && !showConfirmStep && (
        <div className="modal-overlay" onClick={() => !isRestoring && closeAllModals()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', color: '#1a1a2e' }}>
            <div className="modal-header" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1a1a2e', margin: 0, fontSize: '20px', fontWeight: 700 }}>
                <Upload size={24} color="#4A90D9" />
                <span style={{ color: '#1a1a2e' }}>{t('Restaurer une sauvegarde', 'Hamerenana', 'Restore a backup')}</span>
              </h2>
              <button className="modal-close" onClick={closeAllModals} disabled={isRestoring}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px' }}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ backgroundColor: '#ffffff', color: '#1a1a2e', padding: '20px' }}>
              {/* Info sécurité */}
              <div style={{
                backgroundColor: '#eff6ff', color: '#1e40af', padding: '12px 14px', borderRadius: '8px',
                marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start', border: '1px solid #93c5fd',
              }}>
                <Lock size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#1e40af', display: 'block', marginBottom: '4px' }}>
                    🔐 {t('Sécurité renforcée', 'Fiarovana matanjaka', 'Enhanced security')}
                  </strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                    {t(
                      'Un mot de passe à 4 chiffres sera demandé avant la restauration.',
                      'Hangatahina ny kaody 4 isa alohan\'ny famerenana.',
                      'A 4-digit password will be required before restoration.'
                    )}
                  </p>
                </div>
              </div>

              {/* Avertissement */}
              <div style={{
                backgroundColor: '#fff8e1', color: '#7a5c00', padding: '12px 14px', borderRadius: '8px',
                marginBottom: '18px', display: 'flex', gap: '10px', alignItems: 'flex-start', border: '1px solid #f39c12',
              }}>
                <AlertTriangle size={20} color="#f39c12" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#7a5c00', display: 'block', marginBottom: '4px' }}>
                    ⚠️ {t('Attention', 'Tandremo', 'Warning')}
                  </strong>
                  <p style={{ margin: 0, fontSize: '13px', color: '#7a5c00', lineHeight: 1.5 }}>
                    {t(
                      'Cette opération remplace TOUTES les données actuelles. Action irréversible.',
                      'Manolo ny angona rehetra ity hetsika ity.',
                      'This replaces ALL current data. Irreversible action.'
                    )}
                  </p>
                </div>
              </div>

              <label htmlFor="restore-file-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#1a1a2e', fontSize: '14px', cursor: 'pointer' }}>
                📎 {t('Fichier SQL', 'Rakitra SQL', 'SQL file')} (.sql)
              </label>

              <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', border: '2px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <label htmlFor="restore-file-input"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                    backgroundColor: '#4A90D9', color: '#ffffff', fontWeight: 700, fontSize: '13.5px',
                    cursor: isRestoring ? 'not-allowed' : 'pointer', userSelect: 'none', transition: 'background 0.2s',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (!isRestoring) e.currentTarget.style.backgroundColor = '#357ABD'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4A90D9'; }}
                >
                  <FolderOpen size={16} />
                  {t('Choisir un fichier', 'Misafidiana rakitra', 'Choose a file')}
                </label>

                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', padding: '0 14px',
                  backgroundColor: '#f8fafc', color: fichierRestore ? '#1a1a2e' : '#94a3b8',
                  fontSize: '13.5px', fontWeight: fichierRestore ? 600 : 400,
                  fontStyle: fichierRestore ? 'normal' : 'italic',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {fichierRestore ? fichierRestore.name : t('Aucun fichier choisi', 'Tsy misy rakitra voafidy', 'No file chosen')}
                </div>

                <input id="restore-file-input" type="file" accept=".sql"
                  onChange={(e) => setFichierRestore(e.target.files[0])}
                  disabled={isRestoring} style={{ display: 'none' }} />
              </div>

              {fichierRestore && (
                <div style={{
                  marginTop: '14px', padding: '12px 14px', backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px',
                  color: '#1a1a2e', lineHeight: 1.6,
                }}>
                  <div style={{ color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
                    ✅ {t('Fichier sélectionné', 'Voafidy', 'Selected file')} :
                  </div>
                  <strong style={{ color: '#1a1a2e', wordBreak: 'break-all' }}>{fichierRestore.name}</strong>
                  <div style={{ marginTop: '6px', color: '#475569' }}>
                    📊 {t('Taille', 'Habe', 'Size')} : <strong style={{ color: '#1a1a2e' }}>{(fichierRestore.size / 1024).toFixed(1)} Ko</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-cancel" onClick={closeAllModals} disabled={isRestoring}
                style={{ padding: '10px 22px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: isRestoring ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isRestoring ? 0.6 : 1 }}>
                {t('Annuler', 'Foanana', 'Cancel')}
              </button>

              <button className="btn-confirm" onClick={handleOpenPasswordStep} disabled={isRestoring || !fichierRestore}
                style={{
                  padding: '10px 22px', backgroundColor: (isRestoring || !fichierRestore) ? '#94a3b8' : '#4A90D9',
                  color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                  cursor: (isRestoring || !fichierRestore) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit',
                  opacity: (isRestoring || !fichierRestore) ? 0.7 : 1,
                }}>
                <Lock size={18} />
                {t('Continuer', 'Hanohy', 'Continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ÉTAPE 2 : MODAL MOT DE PASSE (4 chiffres)
          ═══════════════════════════════════════════════════════════ */}
      {showPasswordStep && (
        <div className="modal-overlay" onClick={closePasswordStep}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', color: '#1a1a2e', maxWidth: '460px' }}>
            <div className="modal-header" style={{ backgroundColor: '#eff6ff', borderBottom: '2px solid #3b82f6', padding: '18px 22px', borderRadius: '16px 16px 0 0' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1e40af', margin: 0, fontSize: '19px', fontWeight: 700 }}>
                <Lock size={26} color="#2563eb" />
                <span style={{ color: '#1e40af' }}>{t('Vérification de sécurité', 'Fanamarinana fiarovana', 'Security verification')}</span>
              </h2>
              <button className="modal-close" onClick={closePasswordStep} disabled={isVerifyingPassword}
                style={{ background: 'transparent', border: 'none', cursor: isVerifyingPassword ? 'not-allowed' : 'pointer', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px' }}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body" style={{ backgroundColor: '#ffffff', color: '#1a1a2e', padding: '24px 22px', textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Key size={36} color="#2563eb" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>
                {t('Mot de passe requis', 'Ilaina ny kaody', 'Password required')}
              </h3>

              <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                {t(
                  'Saisissez le mot de passe à 4 chiffres pour continuer la restauration.',
                  'Ampidiro ny kaody 4 isa hanohizana ny famerenana.',
                  'Enter the 4-digit password to continue the restoration.'
                )}
              </p>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  value={securityPassword}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setSecurityPassword(v);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isVerifyingPassword && securityPassword.length === 4) {
                      handleVerifyPassword();
                    }
                  }}
                  placeholder="••••"
                  disabled={isVerifyingPassword}
                  style={{
                    width: '100%', padding: '16px 48px 16px 16px', fontSize: '28px',
                    fontFamily: 'Courier New, monospace', letterSpacing: '12px', textAlign: 'center',
                    border: passwordError ? '2px solid #dc2626' : '2px solid #cbd5e1',
                    borderRadius: '12px', outline: 'none', color: '#1e293b',
                    backgroundColor: '#ffffff', transition: 'all 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    if (!passwordError) {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!passwordError) {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />

                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  disabled={isVerifyingPassword} tabIndex={-1}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', borderRadius: '6px',
                  }}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: i < securityPassword.length ? '#3b82f6' : '#e2e8f0',
                    transition: 'background-color 0.2s',
                  }} />
                ))}
              </div>

              {passwordError && (
                <div style={{
                  padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px',
                }}>
                  <AlertTriangle size={16} />
                  {passwordError}
                </div>
              )}

              <div style={{
                padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px',
                fontSize: '12px', color: '#64748b', lineHeight: 1.5,
              }}>
                💡 {t(
                  'Le mot de passe est défini par le Super Admin dans le panneau d\'administration.',
                  'Ny Super Admin no mamaritra ny kaody.',
                  'The password is set by the Super Admin in the admin panel.'
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button onClick={closePasswordStep} disabled={isVerifyingPassword}
                style={{
                  padding: '11px 22px', backgroundColor: '#ffffff', color: '#475569',
                  border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  cursor: isVerifyingPassword ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  opacity: isVerifyingPassword ? 0.6 : 1,
                }}>
                <ArrowLeft size={16} />
                {t('Retour', 'Hiverina', 'Back')}
              </button>

              <button onClick={handleVerifyPassword} disabled={isVerifyingPassword || securityPassword.length !== 4}
                style={{
                  padding: '11px 24px',
                  backgroundColor: (isVerifyingPassword || securityPassword.length !== 4) ? '#94a3b8' : '#2563eb',
                  color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                  cursor: (isVerifyingPassword || securityPassword.length !== 4) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit',
                  opacity: (isVerifyingPassword || securityPassword.length !== 4) ? 0.7 : 1,
                  boxShadow: (isVerifyingPassword || securityPassword.length !== 4) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}>
                {isVerifyingPassword ? (
                  <><Loader2 size={16} className="spinner" /> {t('Vérification...', 'Manamarina...', 'Verifying...')}</>
                ) : (
                  <><ShieldCheck size={16} /> {t('Vérifier', 'Hamarino', 'Verify')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ÉTAPE 3 : MODAL CONFIRMATION FINALE
          ═══════════════════════════════════════════════════════════ */}
      {showConfirmStep && fichierRestore && (
        <div className="modal-overlay" onClick={() => !isRestoring && setShowConfirmStep(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', color: '#1a1a2e', maxWidth: '540px' }}>
            <div className="modal-header" style={{ backgroundColor: '#fef2f2', borderBottom: '2px solid #dc2626', padding: '18px 22px', borderRadius: '16px 16px 0 0' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', margin: 0, fontSize: '20px', fontWeight: 700 }}>
                <FileWarning size={28} color="#dc2626" />
                <span style={{ color: '#dc2626' }}>{t('Confirmation finale', 'Fanamarinana farany', 'Final confirmation')}</span>
              </h2>
              <button className="modal-close" onClick={() => !isRestoring && setShowConfirmStep(false)} disabled={isRestoring}
                style={{ background: 'transparent', border: 'none', cursor: isRestoring ? 'not-allowed' : 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px' }}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ backgroundColor: '#ffffff', color: '#1a1a2e', padding: '22px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px 16px', backgroundColor: '#dcfce7', border: '1px solid #86efac',
                borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 700, marginBottom: '18px',
              }}>
                <CheckCircle2 size={16} color="#16a34a" />
                {t('Mot de passe vérifié', 'Voamarina ny kaody', 'Password verified')}
              </div>

              <div style={{
                backgroundColor: '#fef2f2', border: '2px solid #dc2626', borderRadius: '12px',
                padding: '18px 20px', marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dc2626',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <AlertTriangle size={26} color="#ffffff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px', color: '#dc2626', fontSize: '17px', fontWeight: 800 }}>
                    ⚠️ {t('ATTENTION : Action irréversible !', '⚠️ TANDREMO : Tsy azo ivalozana !', '⚠️ WARNING: Irreversible action!')}
                  </h3>
                  <p style={{ margin: '0 0 8px', color: '#7f1d1d', fontSize: '14px', lineHeight: 1.6, fontWeight: 500 }}>
                    {t(
                      'Cette opération va TOTALEMENT EFFACER les données actuelles de la base et les remplacer par celles du fichier SQL.',
                      'Hamafa TANTERAKA ny angona rehetra ao amin\'ny tahiry ity hetsika ity ary hasolo ny ao amin\'ny rakitra SQL.',
                      'This operation will COMPLETELY ERASE all current data and replace it with the SQL file data.'
                    )}
                  </p>
                </div>
              </div>

              <div style={{
                backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px',
                padding: '14px 18px', marginBottom: '20px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
                  color: '#9a3412', fontWeight: 700, fontSize: '13.5px',
                }}>
                  <Trash2 size={18} color="#ea580c" />
                  {t('Ce qui va se passer :', 'Izay hitranga :', 'What will happen:')}
                </div>
                <ul style={{ margin: 0, paddingLeft: '24px', color: '#7c2d12', fontSize: '13px', lineHeight: 1.8 }}>
                  <li>
                    🗑️ <strong>{t(
                      'Toutes les tables et données actuelles seront SUPPRIMÉES',
                      'Ho FAFAINA ny tabilao sy angona rehetra',
                      'All current tables and data will be DELETED'
                    )}</strong>
                  </li>
                  <li>
                    📥 {t(
                      'Les données du fichier SQL seront restaurées',
                      'Haverina ny angona avy amin\'ny rakitra SQL',
                      'Data from the SQL file will be restored'
                    )}
                  </li>
                  <li>
                    ⏱️ {t(
                      'L\'opération peut prendre quelques secondes',
                      'Mety haharitra segondra vitsy',
                      'The operation may take a few seconds'
                    )}
                  </li>
                  <li>
                    🔄 {t(
                      'La page se rechargera automatiquement après',
                      'Havaozina ho azy ny pejy aorian\'izay',
                      'The page will auto-reload after'
                    )}
                  </li>
                </ul>
              </div>

              <div style={{
                backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1a1a2e',
              }}>
                <div style={{ color: '#475569', marginBottom: '6px', fontWeight: 600 }}>
                  📎 {t('Fichier à restaurer', 'Rakitra haverina', 'File to restore')} :
                </div>
                <strong style={{ color: '#1a1a2e', wordBreak: 'break-all', fontSize: '14px' }}>{fichierRestore.name}</strong>
                <div style={{ marginTop: '4px', color: '#64748b', fontSize: '12px' }}>
                  📊 {(fichierRestore.size / 1024).toFixed(1)} Ko
                </div>
              </div>

              <div style={{
                textAlign: 'center', padding: '12px', backgroundColor: '#fef2f2',
                borderRadius: '8px', border: '1px dashed #dc2626', color: '#991b1b',
                fontSize: '13.5px', fontWeight: 600,
              }}>
                {t(
                  'Cliquez sur « Confirmer la restauration » ci-dessous pour valider.',
                  'Tsindrio « Hamafiso ny famerenana » eto ambany.',
                  'Click "Confirm restoration" below to proceed.'
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => !isRestoring && setShowConfirmStep(false)} disabled={isRestoring}
                style={{
                  padding: '11px 22px', backgroundColor: '#ffffff', color: '#475569',
                  border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  cursor: isRestoring ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isRestoring ? 0.6 : 1,
                }}>
                <ArrowLeft size={16} />
                {t('Retour', 'Hiverina', 'Back')}
              </button>

              <button className="btn-confirm-danger" onClick={handleRestore} disabled={isRestoring}
                style={{
                  padding: '11px 24px', backgroundColor: isRestoring ? '#94a3b8' : '#dc2626',
                  color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                  cursor: isRestoring ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit',
                  opacity: isRestoring ? 0.7 : 1,
                  boxShadow: isRestoring ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}>
                {isRestoring ? (
                  <><Loader2 size={18} className="spinner" /> {t('Restauration en cours...', 'Famerenana...', 'Restoring...')}</>
                ) : (
                  <><Trash2 size={18} /> {t('Confirmer la restauration', 'Hamafiso ny famerenana', 'Confirm restoration')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseDeDonnees;