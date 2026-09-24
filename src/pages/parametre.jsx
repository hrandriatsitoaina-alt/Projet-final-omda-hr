// src/pages/Parametre.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  Settings, Globe, Type, Palette, Database,
  RefreshCw, Check, Loader2,
  Edit, Save, ArrowLeft, ExternalLink, X,
} from 'lucide-react';
import { useParametres } from '../context/ParametreContext';
import '../styles/parametre.css';

const API_BASE = 'http://localhost:3001/api';

// ============================================================
// 🌍 TRADUCTIONS
// ============================================================
const TRAD = {
  fr: {
    retour: 'Retour', parametres: 'Paramètres', modifier: 'Modifier',
    annuler: 'Annuler', sauvegarder: 'Sauvegarder',
    chargement: 'Chargement des paramètres...',
    ongletGeneral: 'Général', ongletApparence: 'Apparence', ongletDatabase: 'Base de données',
    titreGeneral: 'Paramètres Généraux',
    descGeneral: "Personnalisez la langue et l'affichage du texte dans toute l'application",
    langueApp: "Langue de l'application",
    langueHint: "Modifie la langue de toute l'interface",
    tailleTexte: 'Taille du texte',
    tailleHint: "Modifie la taille du texte dans toute l'application",
    policeEcriture: "Police d'écriture",
    policeHint: "Modifie la police dans toute l'application",
    policeDefaut: 'Par défaut (Inter)',
    optionPetite: 'Petite', optionMoyenne: 'Moyenne',
    optionGrande: 'Grande', optionTresGrande: 'Très grande',
    apercuDirect: 'Aperçu en direct',
    bienvenueApp: "Bienvenue dans l'application OMDA",
    titreApparence: 'Apparence',
    descApparence: "Personnalisez les couleurs de l'application",
    couleurPrincipale: 'Couleur principale',
    couleurHint: 'Couleur utilisée pour les éléments interactifs',
    apercuCouleurs: 'Aperçu des couleurs',
    couleurClaire: 'Couleur claire', couleurMedium: 'Couleur medium',
    noteApparence: "✨ Les changements s'appliquent immédiatement à toute l'application et sont sauvegardés pour votre compte.",
    titreDatabase: 'Base de données',
    descDatabase: 'Informations sur votre base de données',
    tailleDB: 'Taille de la base de données',
    tailleDBHint: 'Espace occupé par la base de données',
    gestionSauvegardes: 'Gestion des sauvegardes',
    descSauvegardes: 'Sauvegarde automatique (vendredi 9h), sauvegarde manuelle et restauration',
    gererBD: 'Gérer la base de données',
    toastSaveSuccess: '✅ Paramètres sauvegardés avec succès',
    toastSaveError: '❌ Erreur lors de la sauvegarde',
    toastNoUser: "Impossible d'identifier l'utilisateur connecté",
    toastConnError: '❌ Erreur de connexion au serveur',
  },
  mg: {
    retour: 'Hiverina', parametres: 'Kirakira', modifier: 'Ovaina',
    annuler: 'Foanana', sauvegarder: 'Tehirizo',
    chargement: 'Maka ny kirakira...',
    ongletGeneral: 'Ankapobeny', ongletApparence: 'Bika', ongletDatabase: 'Tahiry angona',
    titreGeneral: 'Kirakira ankapobeny',
    descGeneral: "Ovay ny fiteny sy ny fampisehoana lahatsoratra amin'ny rindranasa",
    langueApp: "Fitenin'ny rindranasa",
    langueHint: "Manova ny fitenin'ny interface rehetra",
    tailleTexte: "Haben'ny lahatsoratra",
    tailleHint: "Manova ny haben'ny lahatsoratra amin'ny rindranasa",
    policeEcriture: 'Tarehintsoratra',
    policeHint: 'Manova ny tarehintsoratra amin\'ny rindranasa',
    policeDefaut: 'Mahazatra (Inter)',
    optionPetite: 'Kely', optionMoyenne: 'Antonony',
    optionGrande: 'Lehibe', optionTresGrande: 'Lehibe be',
    apercuDirect: 'Topi-maso mivantana',
    bienvenueApp: "Tongasoa eto amin'ny rindranasa OMDA",
    titreApparence: 'Bika',
    descApparence: "Ovay ny lokon'ny rindranasa",
    couleurPrincipale: 'Loko fototra',
    couleurHint: "Loko ampiasaina amin'ny singa ifandraisana",
    apercuCouleurs: "Topi-mason'ny loko",
    couleurClaire: 'Loko mazava', couleurMedium: 'Loko antonony',
    noteApparence: "✨ Mihatra avy hatrany amin'ny rindranasa ny fanovana ary voatahiry amin'ny kaontinao.",
    titreDatabase: 'Tahiry angona',
    descDatabase: 'Fampahalalana momba ny tahiry angonao',
    tailleDB: "Haben'ny tahiry angona",
    tailleDBHint: "Toerana entin'ny tahiry angona",
    gestionSauvegardes: 'Fitantanana ny tahiry',
    descSauvegardes: 'Fitehirizana ho azy (Zoma 9 ora), fitehirizana manualy sy famerenana',
    gererBD: 'Tantano ny tahiry angona',
    toastSaveSuccess: '✅ Voatahiry soa aman-tsara ny kirakira',
    toastSaveError: "❌ Nisy olana tamin'ny fitehirizana",
    toastNoUser: 'Tsy fantatra ny mpampiasa',
    toastConnError: "❌ Nisy olana tamin'ny fifandraisana",
  },
  en: {
    retour: 'Back', parametres: 'Settings', modifier: 'Edit',
    annuler: 'Cancel', sauvegarder: 'Save',
    chargement: 'Loading settings...',
    ongletGeneral: 'General', ongletApparence: 'Appearance', ongletDatabase: 'Database',
    titreGeneral: 'General Settings',
    descGeneral: 'Customize the language and text display throughout the application',
    langueApp: 'Application language',
    langueHint: 'Changes the language of the entire interface',
    tailleTexte: 'Text size',
    tailleHint: 'Changes the text size throughout the application',
    policeEcriture: 'Font',
    policeHint: 'Changes the font throughout the application',
    policeDefaut: 'Default (Inter)',
    optionPetite: 'Small', optionMoyenne: 'Medium',
    optionGrande: 'Large', optionTresGrande: 'Very large',
    apercuDirect: 'Live preview',
    bienvenueApp: 'Welcome to the OMDA application',
    titreApparence: 'Appearance',
    descApparence: 'Customize the colors of the application',
    couleurPrincipale: 'Main color',
    couleurHint: 'Color used for interactive elements',
    apercuCouleurs: 'Color preview',
    couleurClaire: 'Light color', couleurMedium: 'Medium color',
    noteApparence: '✨ Changes apply immediately to the whole application and are saved to your account.',
    titreDatabase: 'Database',
    descDatabase: 'Information about your database',
    tailleDB: 'Database size',
    tailleDBHint: 'Space used by the database',
    gestionSauvegardes: 'Backup management',
    descSauvegardes: 'Automatic backup (Friday 9am), manual backup and restore',
    gererBD: 'Manage the database',
    toastSaveSuccess: '✅ Settings saved successfully',
    toastSaveError: '❌ Error while saving',
    toastNoUser: 'Unable to identify the connected user',
    toastConnError: '❌ Server connection error',
  },
};

function getUtilisateurActuel() {
  try {
    const raw =
      localStorage.getItem('utilisateur') || localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { id: parsed.id, role: parsed.role, nom: parsed.nom };
    }
  } catch (e) {
    /* ignore */
  }
  const id =
    localStorage.getItem('userId') || localStorage.getItem('utilisateurId');
  return { id: id || null, role: localStorage.getItem('role') || 'user', nom: '' };
}

const Parametre = () => {
  const navigate = useNavigate();
  const showToast = useToast();
  const utilisateurActuel = getUtilisateurActuel();
  const mountedRef = useRef(true);

  // ✅ SOURCE UNIQUE
  const {
    parametres,
    setParametres: setParametresCtx,
    setLangue,
  } = useParametres();

  const appLangue = parametres.langue;
  const t = (key) =>
    (TRAD[appLangue] && TRAD[appLangue][key]) || TRAD.fr[key] || key;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState({});
  const [dbSize, setDbSize] = useState('0 MB');

  // ✅ Settings locaux au composant, synchronisés avec le Context
  const [settings, setSettings] = useState(() => ({
    appName: parametres.appName || 'OMDA App',
    appVersion: '1.0.0',
    langue: parametres.langue,
    dateFormat: parametres.dateFormat || 'DD/MM/YYYY',
    timeFormat: parametres.timeFormat || '24h',
    couleurPrincipale: parametres.couleurPrincipale || '#D4AF37',
    police: parametres.police || 'default',
    tailleTexte: parametres.tailleTexte || 'medium',
  }));

  // ✅ Synchronise settings quand le Context change (ex: autre page)
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      langue: parametres.langue,
      couleurPrincipale: parametres.couleurPrincipale,
      police: parametres.police,
      tailleTexte: parametres.tailleTexte,
      appName: parametres.appName || prev.appName,
    }));
  }, [
    parametres.langue,
    parametres.couleurPrincipale,
    parametres.police,
    parametres.tailleTexte,
    parametres.appName,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current && loading) setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // ✅ Charger taille DB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/parametres/db-size`);
        const data = await res.json();
        if (data?.success && mountedRef.current) {
          setDbSize(data.size || '0 MB');
        }
      } catch (err) {
        console.warn('⚠️ Taille DB indisponible:', err.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, []);

  // ============================================================
  // CHANGEMENT DE PARAMÈTRE
  // ============================================================
  const handleSettingChange = (key, value) => {
    // ✅ LANGUE : passer par setLangue du Context (source unique)
    if (key === 'langue') {
      setLangue(value); // met à jour Context + localStorage + event + BD
      setSettings((prev) => ({ ...prev, langue: value }));
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (['couleurPrincipale', 'police', 'tailleTexte'].includes(key)) {
      setParametresCtx({ [key]: value });
    }

    if (isEditing) {
      setEditedSettings((prev) => ({ ...prev, [key]: value }));
    }
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================
  const handleSaveSettings = async () => {
    if (!utilisateurActuel.id) {
      showToast(t('toastNoUser'), 'error');
      return;
    }

    try {
      const { tailleTexte, ...settingsForBD } = {
        ...settings,
        ...editedSettings,
      };

      const response = await fetch(
        `${API_BASE}/parametres/${utilisateurActuel.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsForBD),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast(t('toastSaveSuccess'), 'success');
        setEditedSettings({});
        setIsEditing(false);
        // Synchronise le Context
        setParametresCtx({
          langue: settings.langue,
          couleurPrincipale: settings.couleurPrincipale,
          police: settings.police,
          tailleTexte: settings.tailleTexte,
          appName: settings.appName,
        });
      } else {
        showToast(t('toastSaveError') + ' ' + (data.message || ''), 'error');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showToast(t('toastConnError'), 'error');
    }
  };

  // ============================================================
  // ONGLETS
  // ============================================================
  const renderGeneralTab = () => (
    <div className="param-tab-content">
      <div className="param-settings-section">
        <div className="param-section-header">
          <h3>
            <Settings size={22} /> {t('titreGeneral')}
          </h3>
          <p className="param-section-desc">{t('descGeneral')}</p>
        </div>

        <div className="param-settings-grid">
          <div className="param-setting-card">
            <div
              className="param-setting-card-icon"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Globe size={24} color="var(--primary-color)" />
            </div>
            <div className="param-setting-card-content">
              <label>{t('langueApp')}</label>
              <select
                value={settings.langue}
                onChange={(e) => handleSettingChange('langue', e.target.value)}
                className="param-setting-select"
              >
                <option value="fr">🇫🇷 Français</option>
                <option value="mg">🇲🇬 Malagasy</option>
                <option value="en">🇬🇧 English</option>
              </select>
              <span className="param-setting-hint">{t('langueHint')}</span>
            </div>
          </div>

          <div className="param-setting-card">
            <div
              className="param-setting-card-icon"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Type size={24} color="var(--primary-color)" />
            </div>
            <div className="param-setting-card-content">
              <label>{t('tailleTexte')}</label>
              <select
                value={settings.tailleTexte}
                disabled={!isEditing}
                onChange={(e) => handleSettingChange('tailleTexte', e.target.value)}
                className="param-setting-select"
              >
                <option value="small">🔤 {t('optionPetite')}</option>
                <option value="medium">🔤 {t('optionMoyenne')}</option>
                <option value="large">🔤 {t('optionGrande')}</option>
                <option value="xlarge">🔤 {t('optionTresGrande')}</option>
              </select>
              <span className="param-setting-hint">{t('tailleHint')}</span>
            </div>
          </div>

          <div className="param-setting-card">
            <div
              className="param-setting-card-icon"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Type size={24} color="var(--primary-color)" />
            </div>
            <div className="param-setting-card-content">
              <label>{t('policeEcriture')}</label>
              <select
                value={settings.police}
                disabled={!isEditing}
                onChange={(e) => handleSettingChange('police', e.target.value)}
                className="param-setting-select"
                style={{
                  fontFamily:
                    settings.police !== 'default' ? settings.police : 'inherit',
                }}
              >
                <option value="default">{t('policeDefaut')}</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
              <span className="param-setting-hint">{t('policeHint')}</span>
            </div>
          </div>
        </div>

        <div className="param-preview-live">
          <h4>📱 {t('apercuDirect')}</h4>
          <div
            className="param-preview-content"
            style={{
              fontFamily:
                settings.police !== 'default' ? settings.police : 'inherit',
              fontSize:
                settings.tailleTexte === 'small'
                  ? '13px'
                  : settings.tailleTexte === 'medium'
                  ? '15px'
                  : settings.tailleTexte === 'large'
                  ? '18px'
                  : '21px',
            }}
          >
            <p style={{ color: 'var(--primary-color)' }}>
              <strong>OMDA</strong> - Office Malagasy du Droit d'Auteur
            </p>
            <p>{t('bienvenueApp')}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
              {new Date().toLocaleDateString(
                settings.langue === 'fr'
                  ? 'fr-FR'
                  : settings.langue === 'mg'
                  ? 'mg-MG'
                  : 'en-US'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="param-tab-content">
      <div className="param-settings-section">
        <div className="param-section-header">
          <h3>
            <Palette size={22} /> {t('titreApparence')}
          </h3>
          <p className="param-section-desc">{t('descApparence')}</p>
        </div>

        <div className="param-settings-grid">
          <div className="param-setting-card param-full-width">
            <div
              className="param-setting-card-icon"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Palette size={24} color="var(--primary-color)" />
            </div>
            <div className="param-setting-card-content">
              <label>{t('couleurPrincipale')}</label>
              <div className="param-color-options">
                {['#D4AF37', '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'].map(
                  (color) => (
                    <button
                      key={color}
                      className={`param-color-option ${
                        settings.couleurPrincipale === color ? 'active' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        handleSettingChange('couleurPrincipale', color)
                      }
                    >
                      {settings.couleurPrincipale === color && (
                        <Check size={14} className="param-color-check" />
                      )}
                    </button>
                  )
                )}
              </div>
              <span className="param-setting-hint">{t('couleurHint')}</span>
            </div>
          </div>
        </div>

        <div className="param-preview-colors">
          <h4>🎨 {t('apercuCouleurs')}</h4>
          <div className="param-color-preview-grid">
            <div
              className="param-color-sample"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <span style={{ color: '#fff' }}>{t('couleurPrincipale')}</span>
            </div>
            <div
              className="param-color-sample"
              style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--text-primary)',
              }}
            >
              <span>{t('couleurClaire')}</span>
            </div>
            <div
              className="param-color-sample"
              style={{
                backgroundColor: 'var(--primary-medium)',
                color: '#fff',
              }}
            >
              <span>{t('couleurMedium')}</span>
            </div>
          </div>
        </div>

        <div className="param-appearance-note">{t('noteApparence')}</div>
      </div>
    </div>
  );

  const renderDatabaseTab = () => (
    <div className="param-tab-content">
      <div className="param-settings-section">
        <div className="param-section-header">
          <h3>
            <Database size={22} /> {t('titreDatabase')}
          </h3>
          <p className="param-section-desc">{t('descDatabase')}</p>
        </div>

        <div className="param-settings-grid">
          <div className="param-setting-card">
            <div
              className="param-setting-card-icon"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Database size={24} color="var(--primary-color)" />
            </div>
            <div className="param-setting-card-content">
              <label>{t('tailleDB')}</label>
              <div className="param-db-size-display">
                <span className="param-db-size-value">{dbSize}</span>
              </div>
              <span className="param-setting-hint">{t('tailleDBHint')}</span>
            </div>
          </div>
        </div>

        <div className="param-db-action-box">
          <div className="param-db-action-info">
            <Database size={32} className="param-db-icon" />
            <div>
              <h4>{t('gestionSauvegardes')}</h4>
              <p>{t('descSauvegardes')}</p>
            </div>
          </div>
          <button
            className="param-btn-db-action"
            onClick={() => navigate('/base-de-donnees')}
          >
            <ExternalLink size={18} /> {t('gererBD')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'database':
        return renderDatabaseTab();
      default:
        return renderGeneralTab();
    }
  };

  if (loading) {
    return (
      <div className="param-loading">
        <Loader2 size={48} className="param-spinner" />
        <p>{t('chargement')}</p>
      </div>
    );
  }

  return (
    <div className="param-container">
      <div className="param-header">
        <div className="param-header-left">
          <button
            className="param-btn-back"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={18} /> {t('retour')}
          </button>
          <h1>
            <Settings size={28} /> {t('parametres')}
          </h1>
        </div>
        <div className="param-header-actions">
          <button
            className="param-btn-edit"
            onClick={() => {
              if (isEditing) {
                setEditedSettings({});
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? <X size={18} /> : <Edit size={18} />}
            {isEditing ? t('annuler') : t('modifier')}
          </button>
          {isEditing && (
            <button className="param-btn-save" onClick={handleSaveSettings}>
              <Save size={18} /> {t('sauvegarder')}
            </button>
          )}
          <button
            className="param-btn-refresh"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="param-nav">
        {[
          { key: 'general', label: t('ongletGeneral'), icon: <Settings size={18} /> },
          { key: 'appearance', label: t('ongletApparence'), icon: <Palette size={18} /> },
          { key: 'database', label: t('ongletDatabase'), icon: <Database size={18} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`param-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.key && <span className="param-nav-indicator" />}
          </button>
        ))}
      </div>

      <div className="param-content">{renderTabContent()}</div>
    </div>
  );
};

export default Parametre;