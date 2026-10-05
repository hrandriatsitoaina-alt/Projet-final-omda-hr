// VerificationUsager.jsx
import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, Calendar, MapPin, User, Building, Music,
  Eye, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  Users, ArrowLeft, PlusCircle, Info, Tag, Hash,
  Calendar as CalendarIcon, DollarSign, FolderOpen, UserCheck,
  Map as MapIcon, Globe, Smartphone, AtSign, Home as HomeIcon,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import '../styles/VerificationUsager.css';
import { useT } from '../hooks/useT';

// ✅ Constante centralisée
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SEARCH_DEBOUNCE_MS = 400;

const VerificationUsager = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [paiementsBruts, setPaiementsBruts] = useState([]);

  const [prefixe, setPrefixe] = useState('');
  const [numero, setNumero] = useState('');
  const [semestre, setSemestre] = useState('');
  const [annee, setAnnee] = useState('');

  const [prefixeSuggestions, setPrefixeSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ✅ Dictionnaire des préfixes → nom utilisateur
  const [prefixeDetails, setPrefixeDetails] = useState({});

  // ✅ Dropdown de la LISTE DES UTILISATEURS (bouton ℹ️)
  const [showUsersList, setShowUsersList] = useState(false);

  const [searchMessage, setSearchMessage] = useState({ type: '', text: '' });
  const [hasSearched, setHasSearched] = useState(false);

  const suggestionRef = useRef(null);
  const usersListRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    fetchAllUsagers();
    fetchAnnees();
    fetchPrefixeDetails();
    fetchPaiements();
    // eslint-disable-next-line
  }, []);

  // ✅ Click outside → ferme les dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (usersListRef.current && !usersListRef.current.contains(event.target)) {
        setShowUsersList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Body lock quand un overlay est ouvert
  useEffect(() => {
    document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // ============================================================
  // RECHERCHE FLUIDE (DEBOUNCED)
  // ============================================================
  const effectuerRecherche = useCallback(async (
    p = prefixe, n = numero, s = semestre, a = annee
  ) => {
    setIsSearching(true);
    setSearchMessage({ type: '', text: '' });

    try {
      const params = new URLSearchParams();
      if (p && String(p).trim()) params.set('prefixe', String(p).trim().toUpperCase());
      if (n && String(n).trim()) params.set('numero', String(n).trim());
      if (s && String(s).trim()) params.set('semestre', String(s).trim());
      if (a && String(a).trim()) params.set('annee', String(a).trim());

      const qs = params.toString();
      const url = `${API_URL}/api/verification/recherche${qs ? `?${qs}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setSearchMessage({
          type: 'error',
          text: data.message || t('Erreur de recherche', 'Nisy olana', 'Search error'),
        });
        return;
      }

      if (data.success) {
        setFilteredUsagers(data.usagers);
        setSelectedUsager(data.usagers.length > 0 ? data.usagers[0] : null);
        setCurrentPage(1);
        setHasSearched(true);

        if (data.usagers.length === 0) {
          setSearchMessage({
            type: 'warning',
            text: data.message || t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found'),
          });
        } else if (data.dossierRecherche) {
          setSearchMessage({
            type: 'success',
            text: t(
              `${data.usagers.length} usager(s) trouvé(s) pour : ${data.dossierRecherche}`,
              `${data.usagers.length} mpampiasa hita ho : ${data.dossierRecherche}`,
              `${data.usagers.length} user(s) found for: ${data.dossierRecherche}`
            ),
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      setSearchMessage({
        type: 'error',
        text: t(
          `Erreur réseau : ${error.message}`,
          `Nisy olana : ${error.message}`,
          `Network error: ${error.message}`
        ),
      });
    } finally {
      setIsSearching(false);
    }
  }, [prefixe, numero, semestre, annee, t]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const tousVides = !prefixe.trim() && !numero && !semestre && !annee;
    if (tousVides && !hasSearched) return;

    debounceTimerRef.current = setTimeout(() => {
      effectuerRecherche(prefixe, numero, semestre, annee);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line
  }, [prefixe, numero, semestre, annee]);

  // ============================================================
  // FETCH HELPERS
  // ============================================================
  const fetchAllUsagers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/verification/usagers`);
      const data = await response.json();
      if (data.success) {
        setUsagers(data.usagers);
        setFilteredUsagers(data.usagers);
        if (data.usagers.length > 0) setSelectedUsager(data.usagers[0]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement usagers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaiements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/paiements/tous`);
      const data = await response.json();
      if (data.success) setPaiementsBruts(data.paiements || []);
    } catch (error) {
      console.error('❌ Erreur paiements:', error);
      setPaiementsBruts([]);
    }
  };

  const fetchAnnees = async () => {
    try {
      const response = await fetch(`${API_URL}/api/verification/annees`);
      const data = await response.json();
      if (data.success) setAnneesDisponibles(data.annees);
    } catch (error) {
      console.error('❌ Erreur années:', error);
    }
  };

  const fetchPrefixeDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/verification/prefixes-details`);
      const data = await response.json();
      if (data.success) setPrefixeDetails(data.prefixes);
    } catch (error) {
      console.error('❌ Erreur détails préfixes:', error);
    }
  };

  const fetchPrefixeSuggestions = async (search) => {
    if (!search || search.length < 1) {
      setPrefixeSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/verification/suggestions/prefixes?search=${search}`);
      const data = await response.json();
      if (data.success) {
        setPrefixeSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('❌ Erreur suggestions:', error);
    }
  };

  // ============================================================
  // RESET & INPUT HANDLERS
  // ============================================================
  const resetSearch = () => {
    setPrefixe('');
    setNumero('');
    setSemestre('');
    setAnnee('');
    setSearchMessage({ type: '', text: '' });
    setHasSearched(false);
    setFilteredUsagers(usagers);
    setSelectedUsager(usagers.length > 0 ? usagers[0] : null);
    setCurrentPage(1);
  };

  const handlePrefixeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setPrefixe(value);
    fetchPrefixeSuggestions(value);
  };

  const selectPrefixe = (value) => {
    setPrefixe(value);
    setShowSuggestions(false);
    setPrefixeSuggestions([]);
  };

  const toggleUsersList = () => setShowUsersList(!showUsersList);

  // ============================================================
  // PAGINATION
  // ============================================================
  const totalPages = Math.ceil(filteredUsagers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsagers = filteredUsagers.slice(indexOfFirstItem, indexOfLastItem);
  const goToPage = (page) => setCurrentPage(page);

  // ============================================================
  // FORMATTERS
  // ============================================================
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch { return dateString; }
  };

  const formatMontant = (montant) => {
    const n = parseFloat(montant);
    if (isNaN(n) || n === 0) return `0 Ar`;
    return `${n.toLocaleString(locale)} Ar`;
  };

  // ============================================================
  // ✅ HELPER : obtenir la bonne référence (OMDA / DAF) selon le type
  // ============================================================
  const getReferenceLabel = (usager) => {
    if (!usager) return { label: 'OMDA', value: 'N/A' };
    // ✅ Pour les usagers "Autre" (OTH) → DAF
    if (usager.ref_client_type === 'OTH') {
      return { label: 'DAF', value: usager.ref_omda || 'N/A' };
    }
    // Autres types → OMDA
    return { label: 'OMDA', value: usager.ref_omda || 'N/A' };
  };

  // ============================================================
  // MONTANTS
  // ============================================================
  const paiementsParUsager = useMemo(() => {
    const map = {};
    for (const p of paiementsBruts) {
      if (p.statut !== 'paye') continue;
      const typeKey = p.usager_type === 'autre' ? 'other' : p.usager_type;
      const key = `${typeKey}_${p.usager_id}`;
      if (!map[key]) map[key] = { total: 0, nbPaiements: 0, paiements: [] };
      map[key].total += parseFloat(p.montant) || 0;
      map[key].nbPaiements += 1;
      map[key].paiements.push(p);
    }
    return map;
  }, [paiementsBruts]);

  const getMontantReelUsager = useCallback((usager) => {
    if (!usager) return 0;
    const typeRaw = usager.ref_client_type?.toLowerCase() || '';
    const typeMap = {
      'htl': 'hotel', 'mgs': 'grand-surface', 'rdp': 'media',
      'trp': 'bus', 'ngt': 'nightclub', 'occ': 'occ',
      'oth': 'other', 'aut': 'other',
    };
    const type = typeMap[typeRaw] || typeRaw;
    const id = usager.ref_usager || usager.id;
    const key = `${type}_${id}`;
    const paiementInfo = paiementsParUsager[key];
    if (paiementInfo && paiementInfo.total > 0) return paiementInfo.total;
    return parseFloat(usager.soit_total) || 0;
  }, [paiementsParUsager]);

  const montantTotalReel = useMemo(() => {
    let total = 0;
    for (const u of filteredUsagers) total += getMontantReelUsager(u);
    return total;
  }, [filteredUsagers, getMontantReelUsager]);

  // ============================================================
  // BADGES
  // ============================================================
  const getStatusBadge = (status) => {
    const configs = {
      'validee':   { label: t('Validé', 'Voamarina', 'Validated'), className: 'status-approved', icon: CheckCircle },
      'en_attente':{ label: t('En attente', 'Miandry', 'Pending'), className: 'status-pending', icon: Clock },
      'rejete':    { label: t('Rejeté', 'Nolavina', 'Rejected'), className: 'status-rejected', icon: XCircle },
      'pending':   { label: t('En attente', 'Miandry', 'Pending'), className: 'status-pending', icon: Clock },
      'approved':  { label: t('Approuvé', 'Nekena', 'Approved'), className: 'status-approved', icon: CheckCircle },
      'rejected':  { label: t('Rejeté', 'Nolavina', 'Rejected'), className: 'status-rejected', icon: XCircle },
    };
    const config = configs[status?.toLowerCase()] || configs['pending'];
    const Icon = config.icon;
    return (
      <span className={`status-badge ${config.className}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const types = {
      'HTL': { label: t('Hôtel', 'Hotely', 'Hotel'), color: '#2196F3', bg: '#E3F2FD', icon: Building },
      'MGS': { label: t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface'), color: '#FF9800', bg: '#FFF3E0', icon: MapIcon },
      'RDP': { label: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'), color: '#9C27B0', bg: '#F3E5F5', icon: Globe },
      'TRP': { label: t('Bus', 'Bus', 'Bus'), color: '#F44336', bg: '#FFEBEE', icon: MapIcon },
      'NGT': { label: t('Night Club', 'Club alina', 'Night Club'), color: '#E91E63', bg: '#FCE4EC', icon: Music },
      'OCC': { label: t('Occasionnelle', 'Fotoana manokana', 'Occasional'), color: '#4CAF50', bg: '#E8F5E9', icon: Calendar },
      'AUT': { label: t('Autre', 'Hafa', 'Other'), color: '#757575', bg: '#F5F5F5', icon: FileText },
      'OTH': { label: t('Autre', 'Hafa', 'Other'), color: '#757575', bg: '#F5F5F5', icon: FileText },
    };
    const config = types[type] || types['AUT'];
    const Icon = config.icon;
    return (
      <span className="type-badge" style={{ backgroundColor: config.bg, color: config.color }}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const InfoCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="info-card" style={{ borderLeftColor: color || '#4f46e5' }}>
      <div className="info-card-icon" style={{ background: color ? `${color}15` : '#eef2ff', color: color || '#4f46e5' }}>
        <Icon size={20} />
      </div>
      <div className="info-card-content">
        <div className="info-card-title">{title}</div>
        <div className="info-card-value">{value}</div>
        {subtitle && <div className="info-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  // ============================================================
  // ✅ DROPDOWN UTILISATEURS (déclenché par le bouton ℹ️)
  //    Liste indépendante avec : nom complet + préfixe
  // ============================================================
  const UsersListDropdown = () => {
    if (!showUsersList) return null;

    const utilisateurs = Object.entries(prefixeDetails).map(([prefixeKey, nomComplet]) => ({
      prefixe: prefixeKey,
      nom: nomComplet,
    }));

    return (
      <div
        className="users-list-dropdown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="users-list-header">
          <Users size={16} />
          <span>{t('Liste des utilisateurs', 'Lisitry ny mpampiasa', 'Users list')}</span>
          <span className="users-list-count">({utilisateurs.length})</span>
          <button
            className="users-list-close"
            onClick={toggleUsersList}
            title={t('Fermer', 'Hidio', 'Close')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="users-list-body">
          {utilisateurs.length > 0 ? (
            utilisateurs.map((u, index) => (
              <div
                key={index}
                className="users-list-item"
                onClick={() => {
                  setPrefixe(u.prefixe);
                  setShowUsersList(false);
                }}
              >
                <div className="users-list-prefixe">{u.prefixe}</div>
                <div className="users-list-nom">{u.nom}</div>
              </div>
            ))
          ) : (
            <div className="users-list-empty">
              <AlertCircle size={20} />
              <span>{t('Aucun utilisateur', 'Tsy misy mpampiasa', 'No user')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (loading) {
    return (
      <div className="verification-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('Chargement des usagers...', 'Maka ny mpampiasa...', 'Loading users...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-container">
      {/* En-tête */}
      <div className="verification-header">
        <div className="header-left">
          <h1>
            <FileText size={28} />
            {t('Vérification des usagers', 'Fanamarinana ny mpampiasa', 'User verification')}
          </h1>
          <p className="header-subtitle">
            {t(
              'Recherche progressive — chaque champ est optionnel',
              'Fikarohana miandalana — tsy voatery ny saha rehetra',
              'Progressive search — each field is optional'
            )}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-refreshs" onClick={() => { fetchAllUsagers(); fetchPaiements(); }} title={t('Actualiser', 'Havaozy', 'Refresh')}>
            <RefreshCw size={18} />
          </button>
          <button className="btn-new" onClick={() => navigate('/dashboard')}>
            <PlusCircle size={18} />
            {t('Accueil', 'Fandraisana', 'Home')}
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="search-bar">
        <div className="search-fields">
          {/* Préfixe + bouton ℹ️ + dropdown utilisateurs */}
          <div className="search-field search-field-prefixe" ref={usersListRef}>
            <label>
              <Tag size={14} />
              {t('Préfixe', 'Prefix', 'Prefix')}
              <button
                type="button"
                className="btn-prefixe-info"
                onClick={toggleUsersList}
                title={t('Voir la liste des utilisateurs', 'Hijery ny lisitry ny mpampiasa', 'View users list')}
              >
                <Info size={14} />
              </button>
            </label>

            <div className="search-input-wrapper" ref={suggestionRef}>
              <input
                type="text"
                placeholder={t('Ex: AND, FIT, RAT...', 'Ohatra: AND, FIT, RAT...', 'Ex: AND, FIT, RAT...')}
                value={prefixe}
                onChange={handlePrefixeChange}
                onFocus={() => { if (prefixeSuggestions.length > 0) setShowSuggestions(true); }}
                className="search-input"
                maxLength={10}
              />
              {showSuggestions && prefixeSuggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {prefixeSuggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-item" onClick={() => selectPrefixe(suggestion)}>
                      <span className="suggestion-prefixe">{suggestion}</span>
                      <span className="suggestion-detail">{prefixeDetails[suggestion] || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ Liste indépendante des utilisateurs */}
            <UsersListDropdown />
          </div>

          <div className="search-field">
            <label><Hash size={14} />{t('Numéro', 'Laharana', 'Number')}</label>
            <input
              type="number"
              placeholder={t('Ex: 49', 'Ohatra: 49', 'Ex: 49')}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="search-input"
              min="1"
            />
          </div>

          <div className="search-field">
            <label><CalendarIcon size={14} />{t('Trimestre', 'Trimestre', 'Quarter')}</label>
            <select value={semestre} onChange={(e) => setSemestre(e.target.value)} className="search-select">
              <option value="">{t('Trimestre', 'Trimestre', 'Quarter')}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>

          <div className="search-field">
            <label><Calendar size={14} />{t('Année', 'Taona', 'Year')}</label>
            <select value={annee} onChange={(e) => setAnnee(e.target.value)} className="search-select">
              <option value="">{t('Année', 'Taona', 'Year')}</option>
              {anneesDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="search-actions">
            <button className="btn-search" onClick={() => effectuerRecherche()} disabled={isSearching}>
              <Search size={18} />
              {isSearching ? t('Recherche...', 'Mikaroka...', 'Searching...') : t('Rechercher', 'Hikaroka', 'Search')}
            </button>
            <button className="btn-reset" onClick={resetSearch}>
              {t('Réinitialiser', 'Averina', 'Reset')}
            </button>
          </div>
        </div>

        {/* Critères actifs */}
        {(prefixe || numero || semestre || annee) && (
          <div className="search-criteria-bar">
            <span className="search-criteria-label">
              {t('Critères actifs :', 'Fepetra mavitrika :', 'Active criteria:')}
            </span>
            {prefixe && (
              <span className="search-criteria-chip">
                <Tag size={12} /> {prefixe}
                <button onClick={() => setPrefixe('')}><X size={10} /></button>
              </span>
            )}
            {numero && (
              <span className="search-criteria-chip">
                <Hash size={12} /> {numero}
                <button onClick={() => setNumero('')}><X size={10} /></button>
              </span>
            )}
            {semestre && (
              <span className="search-criteria-chip">
                <CalendarIcon size={12} /> T{semestre}
                <button onClick={() => setSemestre('')}><X size={10} /></button>
              </span>
            )}
            {annee && (
              <span className="search-criteria-chip">
                <Calendar size={12} /> {annee}
                <button onClick={() => setAnnee('')}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* Message inline */}
        {searchMessage.text && (
          <div className={`search-message search-message-${searchMessage.type}`}>
            {searchMessage.type === 'error' && <AlertCircle size={16} />}
            {searchMessage.type === 'success' && <CheckCircle size={16} />}
            {searchMessage.type === 'warning' && <AlertCircle size={16} />}
            <span>{searchMessage.text}</span>
            <button className="search-message-close" onClick={() => setSearchMessage({ type: '', text: '' })}>×</button>
          </div>
        )}
      </div>

      {/* Cartes d'information */}
      <div className="info-cards-grid">
        <InfoCard icon={Users} title={t('Total usagers', 'Isan\'ny mpampiasa', 'Total users')} value={filteredUsagers.length} subtitle={t('Tous types confondus', 'Karazana rehetra', 'All types combined')} color="#4f46e5" />
        <InfoCard icon={UserCheck} title={t('Validés', 'Voamarina', 'Validated')} value={filteredUsagers.filter(u => u.statut === 'validee' || u.statut === 'approved').length} subtitle={t('Dossiers approuvés', 'Rakitra nekena', 'Approved files')} color="#059669" />
        <InfoCard icon={Clock} title={t('En attente', 'Miandry', 'Pending')} value={filteredUsagers.filter(u => u.statut === 'en_attente' || u.statut === 'pending').length} subtitle={t('Dossiers à vérifier', 'Rakitra hojerena', 'Files to verify')} color="#d97706" />
        <InfoCard icon={DollarSign} title={t('Montant total', 'Vola total', 'Total amount')} value={formatMontant(montantTotalReel)} subtitle={t('Cumul des montants', 'Fitambaran\'ny vola', 'Sum of amounts')} color="#7c3aed" />
      </div>

      {/* Résultats */}
      <div className="results-container">
        <div className="results-header">
          <div className="results-info">
            <h2><FolderOpen size={20} />{t('Résultats de la recherche', 'Vokatry ny fikarohana', 'Search results')}</h2>
            <span className="results-count">
              {filteredUsagers.length}{' '}
              {filteredUsagers.length > 1
                ? t('usagers trouvés', 'mpampiasa hita', 'users found')
                : t('usager trouvé', 'mpampiasa hita', 'user found')}
            </span>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="usagers-table">
            <thead>
              <tr>
                <th>{t('N° Dossier', 'N° Rakitra', 'File N°')}</th>
                <th>{t('Dénomination / Événement', 'Anarana / Hetsika', 'Name / Event')}</th>
                <th>{t('Type', 'Karazana', 'Type')}</th>
                <th>{t('Demandeur / Représentant', 'Mpangataka / Mpisolo tena', 'Applicant / Representative')}</th>
                <th>{t('Montant Total', 'Vola total', 'Total amount')}</th>
                <th>{t('Statut', 'Toe-javatra', 'Status')}</th>
                <th>{t('Date création', 'Daty famoronana', 'Creation date')}</th>
                <th>{t('Actions', 'Hetsika', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {currentUsagers.length > 0 ? (
                currentUsagers.map((usager) => {
                  const montantReel = getMontantReelUsager(usager);
                  const ref = getReferenceLabel(usager);
                  return (
                    <tr
                      key={usager.id}
                      className={selectedUsager?.id === usager.id ? 'selected' : ''}
                      onClick={() => setSelectedUsager(usager)}
                    >
                      <td className="dossier-cell">
                        <span className="dossier-number">{usager.numero_dossier || 'N/A'}</span>
                        {usager.quittance_formate && (
                          <span className="quittance-number">
                            {t('Quittance', 'Taratasy', 'Receipt')}: {usager.quittance_formate}
                          </span>
                        )}
                        {/* ✅ OMDA pour les types normaux, DAF pour Other */}
                        {usager.ref_omda && (
                          <span className={`ref-omda ${usager.ref_client_type === 'OTH' ? 'ref-daf' : ''}`}>
                            {ref.label}: {ref.value}
                          </span>
                        )}
                      </td>
                      <td className="denomination-cell">
                        <div className="denomination-name">
                          {usager.denomination || usager.genre_manifestation || t('Sans nom', 'Tsy misy anarana', 'No name')}
                        </div>
                        <div className="denomination-details">
                          {usager.artistes && typeof usager.artistes === 'string' && (
                            <span className="artistes-count">
                              <Music size={12} />
                              {usager.artistes.split(',').length} {t('artistes', 'mpanakanto', 'artists')}
                            </span>
                          )}
                          {usager.lieu_evenement && (
                            <span className="lieu-event">
                              <MapPin size={12} />{usager.lieu_evenement}
                            </span>
                          )}
                          {usager.date_evenement && (
                            <span className="date-event">
                              <Calendar size={12} />{formatDate(usager.date_evenement)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{getTypeBadge(usager.ref_client_type)}</td>
                      <td className="demandeur-cell">
                        <div className="demandeur-name">
                          {usager.demandeur || usager.representant_par || 'N/A'}
                        </div>
                        {usager.personne_recu && (
                          <div className="personne-recu">
                            <User size={12} />{usager.personne_recu}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="montant-total">{formatMontant(montantReel)}</div>
                        {usager.montant_mensuel > 0 && (
                          <div className="montant-mensuel">
                            × {usager.uniter || 1} {t('mois', 'volana', 'months')}
                          </div>
                        )}
                      </td>
                      <td>{getStatusBadge(usager.statut)}</td>
                      <td>
                        <div className="date-creation">{formatDate(usager.created_at)}</div>
                        {usager.createur_nom && (
                          <div className="createur">
                            {t('par', 'avy amin\'ny', 'by')} {usager.createur_nom}
                          </div>
                        )}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-action view"
                          onClick={(e) => { e.stopPropagation(); setSelectedUsager(usager); }}
                          title={t('Voir détails', 'Hijery antsipiriany', 'View details')}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <AlertCircle size={32} />
                    <p>{t('Aucun usager trouvé', 'Tsy misy mpampiasa hitа', 'No user found')}</p>
                    <span>{t('Modifiez vos critères de recherche', 'Ovay ny fepetra fikarohana', 'Change your search criteria')}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-modern">
            <button className="page-prev" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`page-number ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => goToPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button className="page-next" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedUsager && (
        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-header-left">
              <h2><User size={20} />{t('Fiche détaillée', 'Taratasy antsipiriany', 'Detailed sheet')}</h2>
              <span className="detail-dossier">
                {t('Dossier', 'Rakitra', 'File')}: {selectedUsager.numero_dossier || 'N/A'}
              </span>
              {selectedUsager.quittance_formate && (
                <span className="detail-quittance">
                  {t('Quittance', 'Taratasy', 'Receipt')}: {selectedUsager.quittance_formate}
                </span>
              )}
            </div>
            <div className="detail-header-actions">
              <button className="btn-close-detail" onClick={() => setSelectedUsager(null)}>×</button>
            </div>
          </div>

          <div className="detail-content">
            <div className="profile-header">
              <div
                className="profile-avatar"
                style={{
                  background:
                    selectedUsager.ref_client_type === 'HTL' ? '#2196F3' :
                    selectedUsager.ref_client_type === 'MGS' ? '#FF9800' :
                    selectedUsager.ref_client_type === 'RDP' ? '#9C27B0' :
                    selectedUsager.ref_client_type === 'TRP' ? '#F44336' :
                    selectedUsager.ref_client_type === 'NGT' ? '#E91E63' :
                    selectedUsager.ref_client_type === 'OCC' ? '#4CAF50' : '#757575',
                }}
              >
                {(selectedUsager.denomination || selectedUsager.genre_manifestation || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="profile-info">
                <h3 className="profile-name">
                  {selectedUsager.denomination || selectedUsager.genre_manifestation || t('Sans nom', 'Tsy misy anarana', 'No name')}
                </h3>
                <div className="profile-meta">
                  {getTypeBadge(selectedUsager.ref_client_type)}
                  {getStatusBadge(selectedUsager.statut)}
                </div>
                <div className="profile-tags">
                  {selectedUsager.region_usager && (
                    <span className="tag"><MapIcon size={14} />{selectedUsager.region_usager}</span>
                  )}
                  {selectedUsager.date_evenement && (
                    <span className="tag"><Calendar size={14} />{formatDate(selectedUsager.date_evenement)}</span>
                  )}
                  {selectedUsager.lieu_evenement && (
                    <span className="tag"><MapPin size={14} />{selectedUsager.lieu_evenement}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-single-card">
              <div className="detail-single-grid">
                <div className="detail-section">
                  <h4><Building size={16} />{t('Informations générales', 'Fampahalalana ankapobeny', 'General information')}</h4>
                  <div className="detail-row">
                    <span className="label">{t('Dénomination', 'Anarana', 'Name')} :</span>
                    <span className="value">{selectedUsager.denomination || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Demandeur', 'Mpangataka', 'Applicant')} :</span>
                    <span className="value">{selectedUsager.demandeur || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Organisateurs', 'Mpikarakara', 'Organizers')} :</span>
                    <span className="value">{selectedUsager.organisateurs || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Représentant', 'Mpisolo tena', 'Representative')} :</span>
                    <span className="value">{selectedUsager.representant_par || selectedUsager.representant_nom || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Personne reçue', 'Mpandray', 'Person received')} :</span>
                    <span className="value">{selectedUsager.personne_recu || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Genre manifestation', 'Karazana hetsika', 'Event type')} :</span>
                    <span className="value">{selectedUsager.genre_manifestation || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Lieu événement', 'Toerana hetsika', 'Event location')} :</span>
                    <span className="value">{selectedUsager.lieu_evenement || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Date événement', 'Daty hetsika', 'Event date')} :</span>
                    <span className="value">{formatDate(selectedUsager.date_evenement)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Région', 'Faritra', 'Region')} :</span>
                    <span className="value">{selectedUsager.region_usager || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Date d\'ajout', 'Daty nanampiana', 'Date added')} :</span>
                    <span className="value">{formatDate(selectedUsager.date_ajout)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Lieu d\'ajout', 'Toerana nanampiana', 'Place added')} :</span>
                    <span className="value">{selectedUsager.lieu_ajout || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Date signature', 'Daty sonia', 'Signature date')} :</span>
                    <span className="value">{formatDate(selectedUsager.date_signature)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Confirmation nom', 'Fanamarinana anarana', 'Name confirmation')} :</span>
                    <span className="value">{selectedUsager.confirmation_nom || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4><MapPin size={16} />{t('Coordonnées', 'Fifandraisana', 'Contact details')}</h4>
                  <div className="detail-row">
                    <span className="label"><Smartphone size={14} /> {t('Téléphone', 'Finday', 'Phone')} :</span>
                    <span className="value">{selectedUsager.telephone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><AtSign size={14} /> Email :</span>
                    <span className="value">{selectedUsager.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label"><HomeIcon size={14} /> {t('Adresse', 'Adiresy', 'Address')} :</span>
                    <span className="value">{selectedUsager.adresse || 'N/A'}</span>
                  </div>
                  {selectedUsager.domicile && (
                    <div className="detail-row">
                      <span className="label">{t('Domicile', 'Trano', 'Home')} :</span>
                      <span className="value">{selectedUsager.domicile}</span>
                    </div>
                  )}
                  {selectedUsager.representant_adresse && (
                    <div className="detail-row">
                      <span className="label">{t('Adresse représentant', 'Adiresin\'ny mpisolo tena', 'Representative address')} :</span>
                      <span className="value">{selectedUsager.representant_adresse}</span>
                    </div>
                  )}
                  {selectedUsager.representant_tel && (
                    <div className="detail-row">
                      <span className="label">{t('Tél représentant', 'Finday mpisolo tena', 'Representative phone')} :</span>
                      <span className="value">{selectedUsager.representant_tel}</span>
                    </div>
                  )}
                  {selectedUsager.representant_cin && (
                    <div className="detail-row">
                      <span className="label">{t('CIN représentant', 'CIN mpisolo tena', 'Representative CIN')} :</span>
                      <span className="value">{selectedUsager.representant_cin}</span>
                    </div>
                  )}
                  {selectedUsager.representant_cin_delivree && (
                    <div className="detail-row">
                      <span className="label">{t('CIN délivrée le', 'CIN nomena ny', 'CIN issued on')} :</span>
                      <span className="value">{formatDate(selectedUsager.representant_cin_delivree)}</span>
                    </div>
                  )}
                  {selectedUsager.representant_cin_lieu && (
                    <div className="detail-row">
                      <span className="label">{t('CIN délivrée à', 'CIN nomena tao', 'CIN issued at')} :</span>
                      <span className="value">{selectedUsager.representant_cin_lieu}</span>
                    </div>
                  )}
                  {selectedUsager.representant_fonction && (
                    <div className="detail-row">
                      <span className="label">{t('Fonction représentant', 'Asan\'ny mpisolo tena', 'Representative position')} :</span>
                      <span className="value">{selectedUsager.representant_fonction}</span>
                    </div>
                  )}

                  <h4 style={{ marginTop: '16px' }}><DollarSign size={16} />{t('Montants', 'Vola', 'Amounts')}</h4>
                  <div className="detail-row">
                    <span className="label">{t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')} :</span>
                    <span className="value">{formatMontant(selectedUsager.montant_mensuel)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Frais dossier', 'Saram-pandraharahana', 'File fees')} :</span>
                    <span className="value">{formatMontant(selectedUsager.frais_dossier)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Montant retard', 'Vola tara', 'Late amount')} :</span>
                    <span className="value">{formatMontant(selectedUsager.montant_retard)}</span>
                  </div>
                  <div className="detail-row total-row">
                    <span className="label">{t('Total', 'Totaly', 'Total')} :</span>
                    <span className="value">{formatMontant(getMontantReelUsager(selectedUsager))}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Unité', 'Isan\'ny', 'Unit')} :</span>
                    <span className="value">{selectedUsager.uniter || 1}</span>
                  </div>
                  {selectedUsager.mois_facture && selectedUsager.annee_facture && (
                    <div className="detail-row">
                      <span className="label">{t('Période', 'Fe-potoana', 'Period')} :</span>
                      <span className="value">{selectedUsager.mois_facture}/{selectedUsager.annee_facture}</span>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4><FileText size={16} />{t('Références', 'Fanondroana', 'References')}</h4>
                  <div className="detail-row">
                    <span className="label">{t('N° Dossier', 'N° Rakitra', 'File N°')} :</span>
                    <span className="value">{selectedUsager.numero_dossier || 'N/A'}</span>
                  </div>
                  {/* ✅ DAF pour OTH, OMDA sinon */}
                  <div className="detail-row">
                    <span className="label">
                      {selectedUsager.ref_client_type === 'OTH' ? 'DAF' : 'Ref OMDA'} :
                    </span>
                    <span className="value">{selectedUsager.ref_omda || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('N° Facture', 'N° Faktiora', 'Invoice N°')} :</span>
                    <span className="value">{selectedUsager.num_facture || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Type facture', 'Karazana faktiora', 'Invoice type')} :</span>
                    <span className="value">{selectedUsager.num_facture_type || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Quittance', 'Taratasy', 'Receipt')} :</span>
                    <span className="value">{selectedUsager.quittance_formate || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Créé par', 'Noforonin\'ny', 'Created by')} :</span>
                    <span className="value">{selectedUsager.createur_nom || t('Système', 'Rafitra', 'System')}</span>
                  </div>

                  {selectedUsager.artistes && typeof selectedUsager.artistes === 'string' && (
                    <>
                      <h4 style={{ marginTop: '16px' }}><Music size={16} />{t('Artistes participants', 'Mpanakanto mpandray anjara', 'Participating artists')}</h4>
                      <div className="artistes-list">
                        {selectedUsager.artistes.split(',').map((artiste, index) => (
                          <span key={index} className="artiste-tag">{artiste.trim()}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <button className="btn-back" onClick={() => navigate('/dashboard')}>
                <ArrowLeft size={18} />
                {t('Retour au tableau de bord', 'Hiverina amin\'ny tabilao', 'Back to dashboard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationUsager;