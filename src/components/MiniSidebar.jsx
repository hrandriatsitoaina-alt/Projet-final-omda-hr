import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, BookOpen, Phone, Keyboard, Bell, Settings,
  Plus, Search, CalendarPlus, CreditCard, LayoutDashboard,
  FileText, Store, Bus, Moon, Music, Users, Receipt,
  ChevronLeft, ChevronRight, X, Check, Mail, Palette,
  Globe, Type,
} from 'lucide-react';
import '../styles/aide.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';
// ✅ Context pour changer la langue proprement
import { useParametres } from '../context/ParametreContext';

const MiniSidebar = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();
  const { setLangue, parametres, setParametres } = useParametres();

  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [showDocPopup, setShowDocPopup] = useState(false);
  const [showSupportPopup, setShowSupportPopup] = useState(false);
  const [showRaccourcisPopup, setShowRaccourcisPopup] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [showParamsPopup, setShowParamsPopup] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Préférences d'apparence (synchronisées avec le Context)
  //    Ne duplique PAS la langue — elle vient de `langue` du hook
  const prefs = useMemo(() => ({
    langue,
    tailleTexte: parametres?.tailleTexte || 'medium',
    police: parametres?.police || 'default',
    couleurPrincipale: parametres?.couleurPrincipale || '#D4AF37',
  }), [langue, parametres]);

  // ============================================================
  // ✅ SAUVEGARDE DES PRÉFÉRENCES
  //   - Langue → passe par setLangue() du Context (source unique)
  //   - Apparence → passe par setParametres() du Context
  // ============================================================
  const savePref = useCallback((key, value) => {
    if (key === 'langue') {
      setLangue(value); // ✅ Context gère : localStorage + state + event + BD
      return;
    }
    // Apparence : passe par le Context aussi
    if (key === 'tailleTexte' || key === 'police' || key === 'couleurPrincipale') {
      setParametres({ [key]: value });
    }
  }, [setLangue, setParametres]);

  // ============================================================
  // ✅ PAGES TRADUITES (mémoïsées)
  // ============================================================
  const pages = useMemo(() => [
    { name: t('Ajout d\'usager',                'Manampy mpampiasa',                'Add user'),               path: '/ajout-usager',        desc: t('Enregistrer un nouvel usager',      'Misoratra mpampiasa vaovao',           'Register a new user'),           icon: Plus,            keywords: 'ajout usager nouveau client' },
    { name: t('Vérification usager',            'Fanamarinana mpampiasa',           'User check'),             path: '/verification-usager', desc: t('Rechercher un usager existant',     'Hikaroka mpampiasa efa misy',          'Search for an existing user'),   icon: Search,          keywords: 'verification recherche usager' },
    { name: t('Ajout d\'événement',             'Manampy hetsika',                  'Add event'),              path: '/ajout-evenement',     desc: t('Créer un événement culturel',       'Mamorona hetsika ara-kolontsaina',     'Create a cultural event'),       icon: CalendarPlus,    keywords: 'evenement ajout creation' },
    { name: t('Paiement mensuel',               'Fandoavana isam-bolana',           'Monthly payment'),        path: '/paiement-mensuel',    desc: t('Gérer les paiements mensuels',      'Mitantana ny fandoavana isam-bolana',  'Manage monthly payments'),       icon: CreditCard,      keywords: 'paiement mensuel' },
    { name: t('Tableau de bord global',         'Tabilao fitantanana',              'Global dashboard'),       path: '/tableau-db',          desc: t('Visualisation des données',         'Fijerena ny angona',                   'Data visualization'),            icon: LayoutDashboard, keywords: 'tableau bord dashboard' },
    { name: t('Facturation occasionnelle',      'Faktiora tsindraindray',           'Occasional invoicing'),   path: '/date_occ',            desc: t('Factures usagers occasionnels',     'Faktiora mpampiasa tsindraindray',     'Occasional user invoices'),      icon: FileText,        keywords: 'facturation occasionnel' },
    { name: t('Facturation grande surface',     'Faktiora trano fivarotana lehibe', 'Supermarket invoicing'),  path: '/date-grandsurface',   desc: t('Factures grandes surfaces',         'Faktiora trano fivarotana lehibe',     'Supermarket invoices'),          icon: Store,           keywords: 'facturation grande surface' },
    { name: t('Facturation transport',          'Faktiora fitaterana',              'Transport invoicing'),    path: '/date-bus',            desc: t('Factures sociétés transport',       'Faktiora orinasa fitaterana',          'Transport company invoices'),    icon: Bus,             keywords: 'facturation transport bus' },
    { name: t('Facturation night club',         'Faktiora night club',              'Night club invoicing'),   path: '/night-club',          desc: t('Factures night clubs',              'Faktiora night club',                  'Night club invoices'),           icon: Moon,            keywords: 'facturation night club' },
    { name: t('Facturation télé/radio',         'Faktiora tele/radio',              'TV/Radio invoicing'),     path: '/tele-radio',          desc: t('Factures télé et radio',            'Faktiora tele sy radio',               'TV and radio invoices'),         icon: Music,           keywords: 'facturation tele radio' },
    { name: t('Facturation hôtel',              'Faktiora hotely',                  'Hotel invoicing'),        path: '/Hotel_occ',           desc: t('Factures hôtels',                   'Faktiora hotely',                      'Hotel invoices'),                icon: Store,           keywords: 'facturation hotel' },
    { name: t('Autre usager',                   'Mpampiasa hafa',                   'Other user'),             path: '/autre-usager',        desc: t('Factures autres catégories',        'Faktiora sokajy hafa',                 'Other category invoices'),       icon: Users,           keywords: 'autre usager' },
    { name: t('Facture usager',                 'Faktiora mpampiasa',               'User invoice'),           path: '/facture-usager',      desc: t('Liste complète des factures',       'Lisitra feno faktiora',                'Complete invoice list'),         icon: Receipt,         keywords: 'facture usager liste' },
    { name: t('Base de données',                'Tahiry angona',                    'Database'),               path: '/base-de-donnees',     desc: t('Gestion de la base',                'Fitantanana tahiry',                   'Database management'),           icon: Settings,        keywords: 'base donnees database' },
  ], [t]);

  // ==============================
  // TUTORIEL
  // ==============================
  const openTutorial = () => { setShowTutorial(true); setCurrentStep(0); };
  const closeTutorial = () => setShowTutorial(false);
  const nextStep = () => currentStep < pages.length - 1 && setCurrentStep(currentStep + 1);
  const prevStep = () => currentStep > 0 && setCurrentStep(currentStep - 1);
  const goToPage = () => {
    navigate(pages[currentStep].path);
    closeTutorial();
  };

  // ==============================
  // POPUPS
  // ==============================
  const closeAllPopups = useCallback(() => {
    setShowDocPopup(false);
    setShowSupportPopup(false);
    setShowRaccourcisPopup(false);
    setShowNotifPopup(false);
    setShowParamsPopup(false);
    setShowSearchPopup(false);
    setShowTutorial(false);
  }, []);

  const handleIconClick = (action) => {
    closeAllPopups();
    switch (action) {
      case 'aide': openTutorial(); break;
      case 'doc': setShowDocPopup(true); break;
      case 'support': setShowSupportPopup(true); break;
      case 'raccourcis': setShowRaccourcisPopup(true); break;
      case 'notif': setShowNotifPopup(true); break;
      case 'params': setShowParamsPopup(true); break;
      default: break;
    }
  };

  // ============================================================
  // RACCOURCIS CLAVIER
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { closeAllPopups(); return; }
      if (e.key === 'F1') { e.preventDefault(); openTutorial(); return; }
      if (ctrl && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        closeAllPopups();
        setShowSearchPopup(true);
        setTimeout(() => {
          const input = document.getElementById('msb-search-input');
          if (input) input.focus();
        }, 100);
        return;
      }
      if (ctrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app-save'));
        const btn = document.activeElement;
        if (btn) {
          btn.style.transition = 'all 0.3s';
          btn.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.4)';
          setTimeout(() => { btn.style.boxShadow = ''; }, 500);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllPopups]);

  // ============================================================
  // RECHERCHE DANS LES PAGES
  // ============================================================
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      (p.keywords || '').toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  return (
    <>
      <nav className="msb-nav">
        <div className="msb-minimal">
          <div className="msb-dot"></div>
          <div className="msb-dot"></div>
          <div className="msb-dot"></div>
        </div>

        <div className="msb-expanded">
          <div className="msb-content">
            <div className="msb-group">
              <button
                className="msb-icon"
                title={`${t('Aide', 'Fanampiana', 'Help')} (F1)`}
                onClick={() => handleIconClick('aide')}
              >
                <HelpCircle size={16} />
              </button>
              <button
                className="msb-icon"
                title={t('Documentation', 'Antontan-taratasy', 'Documentation')}
                onClick={() => handleIconClick('doc')}
              >
                <BookOpen size={16} />
              </button>
              <button
                className="msb-icon"
                title={t('Support', 'Fanohanana', 'Support')}
                onClick={() => handleIconClick('support')}
              >
                <Phone size={16} />
              </button>
            </div>

            <div className="msb-divider"></div>

            <div className="msb-logo">
              <span>O</span><span>M</span><span>D</span><span>A</span>
            </div>

            <div className="msb-divider"></div>

            <div className="msb-group">
              <button
                className="msb-icon"
                title={`${t('Raccourcis', 'Fanalahidy', 'Shortcuts')} (Ctrl+F, Ctrl+S)`}
                onClick={() => handleIconClick('raccourcis')}
              >
                <Keyboard size={16} />
              </button>
              <button
                className="msb-icon msb-icon-badge"
                title={t('Notifications', 'Fampandrenesana', 'Notifications')}
                onClick={() => handleIconClick('notif')}
              >
                <Bell size={16} />
                <span className="msb-badge">3</span>
              </button>
              <button
                className="msb-icon"
                title={t('Paramètres', 'Kirakira', 'Settings')}
                onClick={() => handleIconClick('params')}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* POPUP DOCUMENTATION */}
      {showDocPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <BookOpen size={22} />{' '}
                {t('Documentation', 'Antontan-taratasy', 'Documentation')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-modal-body">
              <h3>{t('Guide d\'utilisation', 'Torolalana', 'User guide')}</h3>
              <p>
                {t(
                  'Consultez la documentation complète de l\'application OMDA.',
                  'Jereo ny antontan-taratasy feno momba ny rindranasa OMDA.',
                  'Browse the complete documentation of the OMDA application.'
                )}
              </p>
              <ul className="msb-list">
                <li><Check size={14} /> {t('Manuel utilisateur', 'Boky fampiasana', 'User manual')}</li>
                <li><Check size={14} /> {t('Guide des fonctionnalités', 'Torolalana momba ny endri-javatra', 'Features guide')}</li>
                <li><Check size={14} /> {t('FAQ', 'Fanontaniana matetika', 'FAQ')}</li>
                <li><Check size={14} /> {t('Vidéos tutorielles', 'Horonantsary fampianarana', 'Tutorial videos')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUPPORT */}
      {showSupportPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <Phone size={22} />{' '}
                {t('Support technique', 'Fanohanana ara-teknika', 'Technical support')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-modal-body">
              <h3>{t('Contacter le support', 'Mifandraisa amin\'ny fanohanana', 'Contact support')}</h3>
              <p><strong>{t('Email', 'Mailaka', 'Email')} :</strong> support@omda.com</p>
              <p><strong>{t('Téléphone', 'Telefaona', 'Phone')} :</strong> +261 34 00 00 00</p>
              <p><strong>{t('Horaires', 'Ora', 'Hours')} :</strong> {t('Lun-Ven, 9h-18h', 'Alatsinainy-Zoma, 9h-18h', 'Mon-Fri, 9am-6pm')}</p>
              <button className="msb-btn-primary" onClick={closeAllPopups}>
                <Mail size={16} /> {t('Envoyer un message', 'Mandarà hafatra', 'Send a message')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP RACCOURCIS */}
      {showRaccourcisPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <Keyboard size={22} />{' '}
                {t('Raccourcis', 'Fanalahidy', 'Shortcuts')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-modal-body">
              <h3>{t('Raccourcis clavier disponibles', 'Fanalahidy misy', 'Available shortcuts')}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                {t(
                  'Ces raccourcis sont actifs partout dans l\'application.',
                  'Mandeha any amin\'ny rindranasa rehetra ireto fanalahidy ireto.',
                  'These shortcuts are active everywhere in the application.'
                )}
              </p>
              <table className="msb-table">
                <tbody>
                  <tr><td><kbd>Ctrl</kbd> + <kbd>F</kbd></td><td>{t('Rechercher', 'Hikaroka', 'Search')}</td></tr>
                  <tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>{t('Sauvegarder', 'Hitahiry', 'Save')}</td></tr>
                  <tr><td><kbd>F1</kbd></td><td>{t('Aide', 'Fanampiana', 'Help')}</td></tr>
                  <tr><td><kbd>Esc</kbd></td><td>{t('Fermer', 'Hanidy', 'Close')}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* POPUP NOTIFICATIONS */}
      {showNotifPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <Bell size={22} />{' '}
                {t('Notifications', 'Fampandrenesana', 'Notifications')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-modal-body">
              <h3>{t('Dernières notifications', 'Fampandrenesana farany', 'Latest notifications')}</h3>
              <div className="msb-notif-list">
                <div className="msb-notif-item"><Check size={14} /> {t('3 factures en attente de paiement', 'Faktiora 3 miandry fandoavana', '3 invoices awaiting payment')}</div>
                <div className="msb-notif-item"><Check size={14} /> {t('Nouvel événement ajouté ce jour', 'Hetsika vaovao nampiana anio', 'New event added today')}</div>
                <div className="msb-notif-item"><Check size={14} /> {t('Mise à jour système disponible', 'Fanavaozana rafitra misy', 'System update available')}</div>
                <div className="msb-notif-item"><Check size={14} /> {t('Rappel : réunion demain 10h', 'Fampahatsiahivana : fivoriana rahampitso 10 ora', 'Reminder: meeting tomorrow 10am')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PARAMÈTRES */}
      {showParamsPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <Settings size={22} />{' '}
                {t('Préférences', 'Safidy', 'Preferences')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-modal-body">
              <div className="msb-pref-row">
                <label><Globe size={16} /> {t('Langue', 'Fiteny', 'Language')}</label>
                <select value={prefs.langue} onChange={(e) => savePref('langue', e.target.value)}>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="mg">🇲🇬 Malagasy</option>
                  <option value="en">🇬🇧 English</option>
                </select>
              </div>

              <div className="msb-pref-row">
                <label><Type size={16} /> {t('Taille du texte', 'Haben\'ny lahatsoratra', 'Text size')}</label>
                <select value={prefs.tailleTexte} onChange={(e) => savePref('tailleTexte', e.target.value)}>
                  <option value="small">{t('Petite', 'Kely', 'Small')}</option>
                  <option value="medium">{t('Moyenne', 'Antonony', 'Medium')}</option>
                  <option value="large">{t('Grande', 'Lehibe', 'Large')}</option>
                  <option value="xlarge">{t('Très grande', 'Lehibe dia lehibe', 'Extra large')}</option>
                </select>
              </div>

              <div className="msb-pref-row">
                <label><Type size={16} /> {t('Police', 'Endri-tsoratra', 'Font')}</label>
                <select value={prefs.police} onChange={(e) => savePref('police', e.target.value)}>
                  <option value="default">{t('Par défaut (Inter)', 'Mahazatra (Inter)', 'Default (Inter)')}</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
              </div>

              <div className="msb-pref-row">
                <label><Palette size={16} /> {t('Couleur principale', 'Loko fototra', 'Primary color')}</label>
                <div className="msb-color-options">
                  {['#D4AF37', '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'].map(c => (
                    <button
                      key={c}
                      className={`msb-color-btn ${prefs.couleurPrincipale === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => savePref('couleurPrincipale', c)}
                    >
                      {prefs.couleurPrincipale === c && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="msb-btn-primary"
                onClick={() => {
                  closeAllPopups();
                  navigate('/Parametre_global');
                }}
              >
                <Settings size={16} /> {t('Ouvrir les paramètres complets', 'Sokafy ny kirakira feno', 'Open full settings')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP RECHERCHE */}
      {showSearchPopup && (
        <div className="msb-overlay" onClick={closeAllPopups}>
          <div className="msb-modal msb-modal-search" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <Search size={22} />{' '}
                {t('Recherche', 'Fikarohana', 'Search')}
              </h2>
              <button className="msb-modal-close" onClick={closeAllPopups}><X size={20} /></button>
            </div>
            <div className="msb-search-box">
              <Search size={18} className="msb-search-icon" />
              <input
                id="msb-search-input"
                type="text"
                placeholder={t('Rechercher une page...', 'Hikaroka pejy...', 'Search a page...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button className="msb-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="msb-search-results">
              {filteredPages.length === 0 ? (
                <div className="msb-search-empty">
                  {t('Aucun résultat pour', 'Tsy misy valiny ho an\'ny', 'No result for')} "{searchQuery}"
                </div>
              ) : (
                filteredPages.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={i}
                      className="msb-search-item"
                      onClick={() => {
                        navigate(p.path);
                        closeAllPopups();
                        setSearchQuery('');
                      }}
                    >
                      <div className="msb-search-item-icon"><Icon size={18} /></div>
                      <div className="msb-search-item-text">
                        <strong>{p.name}</strong>
                        <span>{p.desc}</span>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TUTORIEL */}
      {showTutorial && (
        <div className="msb-overlay" onClick={closeTutorial}>
          <div className="msb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msb-modal-header">
              <h2>
                <BookOpen size={22} />{' '}
                {t('Guide d\'utilisation', 'Torolalana', 'User guide')}
              </h2>
              <button className="msb-modal-close" onClick={closeTutorial}><X size={20} /></button>
            </div>
            <div className="msb-progress">
              {t('Étape', 'Dingana', 'Step')} {currentStep + 1} / {pages.length}
            </div>
            <div className="msb-tuto-body">
              <div className="msb-tuto-icon">
                {React.createElement(pages[currentStep].icon, { size: 48 })}
              </div>
              <h3>{pages[currentStep].name}</h3>
              <p className="msb-tuto-desc">{pages[currentStep].desc}</p>
              <button className="msb-btn-primary" onClick={goToPage}>
                <ChevronRight size={16} /> {t('Accéder à cette page', 'Hankany amin\'ity pejy ity', 'Go to this page')}
              </button>
            </div>
            <div className="msb-modal-footer">
              <button className="msb-btn-secondary" onClick={closeTutorial}>
                {t('Annuler', 'Hanafoana', 'Cancel')}
              </button>
              <div className="msb-nav-btns">
                {currentStep > 0 && (
                  <button className="msb-btn-secondary" onClick={prevStep}>
                    <ChevronLeft size={16} /> {t('Précédent', 'Teo aloha', 'Previous')}
                  </button>
                )}
                <button className="msb-btn-primary" onClick={nextStep}>
                  {currentStep === pages.length - 1
                    ? t('Terminer', 'Vita', 'Finish')
                    : t('Suivant', 'Manaraka', 'Next')}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiniSidebar;