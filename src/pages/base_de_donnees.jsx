// src/pages/base_de_donnees.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  Database, Download, Upload, RefreshCw, HardDrive, Clock,
  FolderOpen, Check, Loader2, ArrowLeft, CalendarClock,
  ShieldCheck, History, X, Folder,
  Table, HardDrive as HardDriveIcon,
} from 'lucide-react';
import '../styles/base_de_donnees.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';
// ✅ Context pour police/taille
import { useParametres } from '../context/ParametreContext';

const API_BASE = 'http://localhost:3001/api';

function getUtilisateurId() {
  try {
    const raw = localStorage.getItem('utilisateur') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw).id;
  } catch (e) { /* ignore */ }
  return localStorage.getItem('userId') || null;
}

const BaseDeDonnees = () => {
  const navigate = useNavigate();
  const showToast = useToast();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();
  const { parametres } = useParametres();

  // ✅ Locale pour formatage
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

  // Styles dynamiques
  const styles = useMemo(() => ({
    fontFamily: parametres.police !== 'default' ? parametres.police : 'inherit',
    fontSize:
      parametres.tailleTexte === 'small' ? '13px' :
      parametres.tailleTexte === 'medium' ? '15px' :
      parametres.tailleTexte === 'large' ? '18px' : '21px',
  }), [parametres.police, parametres.tailleTexte]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const dbRes = await fetch(`${API_BASE}/database/size`);
      const dbData = await dbRes.json();
      if (dbData && dbData.success) {
        setDbSize(dbData.size || '0 MB');
      }

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
      if (histoData && histoData.success) {
        setHistorique(histoData.historique || []);
      }

      try {
        const tablesRes = await fetch(`${API_BASE}/parametres/db-tables-count`);
        const tablesData = await tablesRes.json();
        if (tablesData && tablesData.success) {
          setDbTables(tablesData.count || 0);
        }
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Erreur chargement:', error);
      showToast(t(
        'Erreur de chargement des informations',
        'Nisy olana tamin\'ny fakana ny angona',
        'Error loading information'
      ), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ============================================================
  // Sauvegarde manuelle
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
        data.message || (data.success
          ? t('✅ Sauvegarde manuelle effectuée', '✅ Vita ny fitehirizana manualy', '✅ Manual backup done')
          : t('❌ Échec', '❌ Tsy nahomby', '❌ Failed')),
        data.success ? 'success' : 'error'
      );

      if (data.success) {
        await fetchAll();
      }
    } catch (error) {
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'), 'error');
    } finally {
      setIsBackingUpManuel(false);
    }
  };

  // ============================================================
  // Sauvegarde automatique (test manuel)
  // ============================================================
  const handleBackupAuto = async () => {
    setIsBackingUpAuto(true);
    try {
      const res = await fetch(`${API_BASE}/backup/auto`, { method: 'POST' });
      const data = await res.json();

      showToast(
        data.message || (data.success
          ? t('✅ Sauvegarde automatique effectuée', '✅ Vita ny fitehirizana ho azy', '✅ Auto backup done')
          : t('❌ Échec', '❌ Tsy nahomby', '❌ Failed')),
        data.success ? 'success' : 'error'
      );

      if (data.success) {
        await fetchAll();
      }
    } catch (error) {
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'), 'error');
    } finally {
      setIsBackingUpAuto(false);
    }
  };

  // ============================================================
  // Restauration
  // ============================================================
  const handleRestore = async () => {
    if (!fichierRestore) {
      showToast(t(
        'Veuillez sélectionner un fichier .sql',
        'Misafidiana rakitra .sql',
        'Please select a .sql file'
      ), 'error');
      return;
    }
    setIsRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup', fichierRestore);
      formData.append('userId', userId || '');
      const res = await fetch(`${API_BASE}/backup/restore`, { method: 'POST', body: formData });
      const data = await res.json();
      showToast(
        data.message || (data.success
          ? t('✅ Restauration effectuée', '✅ Vita ny famerenana', '✅ Restore done')
          : t('❌ Échec', '❌ Tsy nahomby', '❌ Failed')),
        data.success ? 'success' : 'error'
      );
      if (data.success) {
        setShowRestoreModal(false);
        setFichierRestore(null);
        await fetchAll();
      }
    } catch (error) {
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleTelecharger = (type) => {
    window.open(`${API_BASE}/backup/telecharger/${type}`, '_blank');
  };

  // ============================================================
  // Formater la date (avec locale)
  // ============================================================
  const formatDate = useCallback((date) => {
    try {
      return new Date(date).toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return date;
    }
  }, [locale]);

  // ============================================================
  // Formater la taille
  // ============================================================
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
        <p>{t('Chargement des informations...', 'Maka ny angona...', 'Loading information...')}</p>
      </div>
    );
  }

  return (
    <div className="bdd-container" style={styles}>
      {/* En-tête */}
      <div className="bdd-header">
        <button className="btn-back" onClick={() => navigate('/Parametre_global')}>
          <ArrowLeft size={20} /> {t('Retour', 'Hiverina', 'Back')}
        </button>
        <h1 style={{ color: 'var(--primary-color)' }}>
          <Database size={28} /> {t('Gestion de la base de données', 'Fitantanana ny tahiry angona', 'Database management')}
        </h1>
        <button className="btn-refresh" onClick={fetchAll}><RefreshCw size={18} /></button>
      </div>

      {/* Statistiques */}
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
            <span className="bdd-card-value">{dbTables}</span>
          </div>
        </div>
        <div className="bdd-card" style={{ borderLeftColor: '#2ecc71' }}>
          <div className="bdd-card-icon" style={{ backgroundColor: '#2ecc7120', color: '#2ecc71' }}>
            <CalendarClock size={22} />
          </div>
          <div>
            <span className="bdd-card-title">{t('Sauvegarde auto', 'Fitehirizana ho azy', 'Auto backup')}</span>
            <span className="bdd-card-value-small">
              {t('Tous les vendredis à 9h', 'Isaky ny zoma amin\'ny 9 ora', 'Every Friday at 9am')}
            </span>
          </div>
        </div>
        <div className="bdd-card" style={{ borderLeftColor: '#f39c12' }}>
          <div className="bdd-card-icon" style={{ backgroundColor: '#f39c1220', color: '#f39c12' }}>
            <Folder size={22} />
          </div>
          <div>
            <span className="bdd-card-title">{t('Fichiers sauvegardés', 'Rakitra voatahiry', 'Saved files')}</span>
            <span className="bdd-card-value">{infoDossier.nombreFichiers}</span>
            <span className="bdd-card-value-small" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {infoDossier.tailleTotale}
            </span>
          </div>
        </div>
      </div>

      {/* Dossier de sauvegarde */}
      <div className="bdd-section" style={{ borderColor: 'var(--border-color)' }}>
        <h3 style={{ color: 'var(--text-primary)' }}>
          <FolderOpen size={20} /> {t('Dossier de sauvegarde', 'Rakitra fitehirizana', 'Backup folder')}
        </h3>

        <div className="bdd-info-banner success" style={{ backgroundColor: '#27ae6020', color: '#27ae60' }}>
          <ShieldCheck size={18} />
          <span>
            📁 {t('Sauvegardes stockées dans', 'Voatahiry ao amin\'ny', 'Backups stored in')} : <strong>{dossierBackup || t('Chargement...', 'Maka...', 'Loading...')}</strong>
          </span>
        </div>

        <div
          className="bdd-backup-info"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              📄 {t('Fichier manuel', 'Rakitra manualy', 'Manual file')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              omda_backup_manuel.sql
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {t('Écrase à chaque sauvegarde', 'Nosoloina isaky ny fitehirizana', 'Overwritten on each backup')}
            </div>
          </div>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              🔄 {t('Fichier automatique', 'Rakitra ho azy', 'Automatic file')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              omda_backup_auto.sql
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {t('Écrase à chaque sauvegarde', 'Nosoloina isaky ny fitehirizana', 'Overwritten on each backup')}
            </div>
          </div>
        </div>
      </div>

      {/* Actions de sauvegarde */}
      <div className="bdd-section" style={{ borderColor: 'var(--border-color)' }}>
        <h3 style={{ color: 'var(--text-primary)' }}>
          <Download size={20} /> {t('Sauvegardes', 'Fitehirizana', 'Backups')}
        </h3>
        <div className="bdd-actions-grid">
          <div className="bdd-action-card" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-primary)' }}>📥 {t('Sauvegarde manuelle', 'Fitehirizana manualy', 'Manual backup')}</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t(
                'Génère un export SQL complet de la base. Écrase le fichier précédent.',
                'Mamorona export SQL feno. Manolo ny rakitra teo aloha.',
                'Generates a complete SQL export. Overwrites the previous file.'
              )}
            </p>
            <div className="bdd-action-buttons">
              <button className="btn-primary" onClick={handleBackupManuel} disabled={isBackingUpManuel}>
                {isBackingUpManuel
                  ? <><Loader2 size={18} className="spinner" /> {t('En cours...', 'Mandalo...', 'In progress...')}</>
                  : <><Download size={18} /> {t('Sauvegarder', 'Tehirizo', 'Backup')}</>}
              </button>
              <button className="btn-secondary" onClick={() => handleTelecharger('manuel')}>
                <Download size={16} /> {t('Télécharger', 'Alaina', 'Download')}
              </button>
            </div>
          </div>

          <div className="bdd-action-card" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-primary)' }}>
              🔄 {t('Sauvegarde auto (vendredi)', 'Fitehirizana ho azy (Zoma)', 'Auto backup (Friday)')}
            </h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t(
                "S'exécute automatiquement chaque vendredi à 9h. Écrase le fichier précédent.",
                'Mandeha ho azy isaky ny zoma amin\'ny 9 ora. Manolo ny rakitra teo aloha.',
                'Runs automatically every Friday at 9am. Overwrites the previous file.'
              )}
            </p>
            <div className="bdd-action-buttons">
              <button className="btn-secondary" onClick={handleBackupAuto} disabled={isBackingUpAuto}>
                {isBackingUpAuto
                  ? <><Loader2 size={18} className="spinner" /> {t('En cours...', 'Mandalo...', 'In progress...')}</>
                  : <><RefreshCw size={18} /> {t('Tester', 'Andramo', 'Test')}</>}
              </button>
              <button className="btn-secondary" onClick={() => handleTelecharger('auto')}>
                <Download size={16} /> {t('Télécharger', 'Alaina', 'Download')}
              </button>
            </div>
          </div>

          <div className="bdd-action-card" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-primary)' }}>↩️ {t('Restauration', 'Famerenana', 'Restore')}</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t(
                'Importe un fichier .sql pour restaurer la base de données.',
                'Mampiditra rakitra .sql hamerenana ny tahiry.',
                'Imports a .sql file to restore the database.'
              )}
            </p>
            <div className="bdd-action-buttons">
              <button className="btn-danger" onClick={() => setShowRestoreModal(true)}>
                <Upload size={18} /> {t('Restaurer', 'Avereno', 'Restore')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="bdd-section" style={{ borderColor: 'var(--border-color)' }}>
        <h3 style={{ color: 'var(--text-primary)' }}>
          <History size={20} /> {t('Historique des sauvegardes', 'Tantaran\'ny fitehirizana', 'Backup history')}
          <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '10px' }}>
            ({historique.length} {t('entrée', 'rakitra', 'entry')}{historique.length > 1 ? 's' : ''})
          </span>
        </h3>
        <div className="bdd-historique-list" style={{ borderColor: 'var(--border-color)' }}>
          <div className="bdd-historique-header" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>{t('Type', 'Karazana', 'Type')}</span>
            <span>{t('Fichier', 'Rakitra', 'File')}</span>
            <span>{t('Taille', 'Habe', 'Size')}</span>
            <span>{t('Statut', 'Toe-javatra', 'Status')}</span>
            <span>{t('Date', 'Daty', 'Date')}</span>
          </div>
          {historique.map((h, index) => (
            <div
              className="bdd-historique-row"
              key={h.id}
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: index === 0 ? 'var(--primary-light)' : 'transparent',
                fontWeight: index === 0 ? '500' : 'normal',
              }}
            >
              <span className={`bdd-type-badge bdd-type-${h.type_backup}`}>
                {h.type_backup === 'manuel' ? `📥 ${t('Manuel', 'Manualy', 'Manual')}` :
                 h.type_backup === 'auto' ? `🔄 ${t('Auto', 'Ho azy', 'Auto')}` :
                 h.type_backup === 'restauration' ? `↩️ ${t('Restauration', 'Famerenana', 'Restore')}` : h.type_backup}
              </span>
              <span title={h.chemin_complet || 'N/A'}>{h.nom_fichier || '-'}</span>
              <span>{formatTaille(h.taille_octets)}</span>
              <span className={`bdd-statut-badge bdd-statut-${h.statut}`}>
                {h.statut === 'succes'
                  ? `✅ ${t('Succès', 'Nahomby', 'Success')}`
                  : h.statut === 'echec'
                  ? `❌ ${t('Échec', 'Tsy nahomby', 'Failed')}`
                  : h.statut}
              </span>
              <span>{formatDate(h.created_at)}</span>
            </div>
          ))}
          {historique.length === 0 && (
            <div className="empty-state" style={{ color: 'var(--text-muted)', padding: '30px', textAlign: 'center' }}>
              {t('Aucune sauvegarde effectuée', 'Tsy misy fitehirizana vita', 'No backup performed')}
            </div>
          )}
        </div>
      </div>

      {/* Modal restauration */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="modal-header" style={{ borderColor: 'var(--border-color)' }}>
              <h2 style={{ color: 'var(--text-primary)' }}>
                <Upload size={24} /> {t('Restaurer une sauvegarde', 'Hamerenana ny fitehirizana', 'Restore a backup')}
              </h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p
                className="bdd-warning-text"
                style={{ backgroundColor: '#f39c1220', color: '#d68910', padding: '12px', borderRadius: '8px' }}
              >
                ⚠️ {t(
                  'Cette opération remplace les données actuelles. Action irréversible.',
                  'Manolo ny angona ankehitriny ity hetsika ity. Tsy azo ivalozana.',
                  'This operation replaces current data. Irreversible action.'
                )}
              </p>
              <input
                type="file"
                accept=".sql"
                onChange={(e) => setFichierRestore(e.target.files[0])}
                className="form-input"
                style={{
                  padding: '12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  width: '100%',
                  marginTop: '12px',
                }}
              />
              {fichierRestore && (
                <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  📎 {t('Fichier sélectionné', 'Rakitra voafidy', 'Selected file')} : <strong>{fichierRestore.name}</strong> ({(fichierRestore.size / 1024).toFixed(1)} Ko)
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderColor: 'var(--border-color)' }}>
              <button className="btn-cancel" onClick={() => setShowRestoreModal(false)}>
                {t('Annuler', 'Foanana', 'Cancel')}
              </button>
              <button className="btn-confirm" onClick={handleRestore} disabled={isRestoring}>
                {isRestoring
                  ? <><Loader2 size={18} className="spinner" /> {t('Restauration...', 'Famerenana...', 'Restoring...')}</>
                  : <><Upload size={18} /> {t('Restaurer', 'Avereno', 'Restore')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseDeDonnees;