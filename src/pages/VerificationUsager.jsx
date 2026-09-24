// VerificationUsager.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, Calendar, MapPin, Phone, Mail, Home,
  ChevronLeft, ChevronRight, User, Building, Music,
  Eye, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
  CreditCard, Users, Printer, Download, ArrowLeft,
  PlusCircle, Edit, Info, Tag, Hash, Calendar as CalendarIcon,
  DollarSign, FolderOpen, UserCheck, Briefcase, Map,
  Globe, Smartphone, AtSign, Home as HomeIcon,
  EyeOff, List, Grid, Maximize2
} from 'lucide-react';
import '../styles/VerificationUsager.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const VerificationUsager = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
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

  // Champs de recherche
  const [prefixe, setPrefixe] = useState('');
  const [numero, setNumero] = useState('');
  const [semestre, setSemestre] = useState('');
  const [annee, setAnnee] = useState('');

  // Suggestions
  const [prefixeSuggestions, setPrefixeSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [prefixeDetails, setPrefixeDetails] = useState({});
  const [showPrefixeList, setShowPrefixeList] = useState(false);

  const suggestionRef = useRef(null);

  // Chargement initial
  useEffect(() => {
    fetchAllUsagers();
    fetchAnnees();
    fetchPrefixeDetails();
    // eslint-disable-next-line
  }, []);

  // Gestion du clic en dehors des suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Empêcher le scroll de la page quand la modale est ouverte
  useEffect(() => {
    if (showPrefixeList) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPrefixeList]);

  // Récupérer tous les usagers
  const fetchAllUsagers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/verification/usagers');
      const data = await response.json();

      if (data.success) {
        setUsagers(data.usagers);
        setFilteredUsagers(data.usagers);
        if (data.usagers.length > 0) {
          setSelectedUsager(data.usagers[0]);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement usagers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les années disponibles
  const fetchAnnees = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/verification/annees');
      const data = await response.json();
      if (data.success) {
        setAnneesDisponibles(data.annees);
      }
    } catch (error) {
      console.error('❌ Erreur chargement années:', error);
    }
  };

  // Récupérer les détails des préfixes
  const fetchPrefixeDetails = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/verification/prefixes-details');
      const data = await response.json();
      if (data.success) {
        setPrefixeDetails(data.prefixes);
      }
    } catch (error) {
      console.error('❌ Erreur chargement détails préfixes:', error);
    }
  };

  // Récupérer les suggestions de préfixes
  const fetchPrefixeSuggestions = async (search) => {
    if (!search || search.length < 1) {
      setPrefixeSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/verification/suggestions/prefixes?search=${search}`);
      const data = await response.json();
      if (data.success) {
        setPrefixeSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('❌ Erreur suggestions:', error);
    }
  };

  // Rechercher un usager par dossier
  const rechercherUsager = async () => {
    if (!prefixe || !numero || !semestre || !annee) {
      alert(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'));
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/verification/recherche?prefixe=${prefixe}&numero=${numero}&semestre=${semestre}&annee=${annee}`
      );
      const data = await response.json();

      if (data.success) {
        setFilteredUsagers(data.usagers);
        if (data.usagers.length > 0) {
          setSelectedUsager(data.usagers[0]);
        } else {
          setSelectedUsager(null);
          alert(t(
            'Aucun usager trouvé avec ce numéro de dossier',
            'Tsy misy mpampiasa hita amin\'io laharana rakitra io',
            'No user found with this file number'
          ));
        }
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Réinitialiser la recherche
  const resetSearch = () => {
    setPrefixe('');
    setNumero('');
    setSemestre('');
    setAnnee('');
    setFilteredUsagers(usagers);
    setSelectedUsager(usagers.length > 0 ? usagers[0] : null);
    setPrefixeSuggestions([]);
    setShowSuggestions(false);
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

  const togglePrefixeList = () => {
    setShowPrefixeList(!showPrefixeList);
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsagers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsagers = filteredUsagers.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatMontant = (montant) => {
    if (!montant) return `0 Ar`;
    return `${Number(montant).toLocaleString(locale)} Ar`;
  };

  const getStatusBadge = (status) => {
    const configs = {
      'validee': { label: t('Validé', 'Voamarina', 'Validated'), className: 'status-approved', icon: CheckCircle },
      'en_attente': { label: t('En attente', 'Miandry', 'Pending'), className: 'status-pending', icon: Clock },
      'rejete': { label: t('Rejeté', 'Nolavina', 'Rejected'), className: 'status-rejected', icon: XCircle },
      'pending': { label: t('En attente', 'Miandry', 'Pending'), className: 'status-pending', icon: Clock },
      'approved': { label: t('Approuvé', 'Nekena', 'Approved'), className: 'status-approved', icon: CheckCircle },
      'rejected': { label: t('Rejeté', 'Nolavina', 'Rejected'), className: 'status-rejected', icon: XCircle }
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
      'MGS': { label: t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface'), color: '#FF9800', bg: '#FFF3E0', icon: Map },
      'RDP': { label: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'), color: '#9C27B0', bg: '#F3E5F5', icon: Globe },
      'TRP': { label: t('Bus', 'Bus', 'Bus'), color: '#F44336', bg: '#FFEBEE', icon: Map },
      'NGT': { label: t('Night Club', 'Club alina', 'Night Club'), color: '#E91E63', bg: '#FCE4EC', icon: Music },
      'OCC': { label: t('Occasionnelle', 'Fotoana manokana', 'Occasional'), color: '#4CAF50', bg: '#E8F5E9', icon: Calendar },
      'AUT': { label: t('Autre', 'Hafa', 'Other'), color: '#757575', bg: '#F5F5F5', icon: FileText }
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
  // ✅ MODAL LISTE DES PRÉFIXES
  // ============================================================
  const PrefixeListModal = () => {
    if (!showPrefixeList) return null;

    return (
      <div
        className="prefixe-modal-overlay"
        onClick={togglePrefixeList}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div
          className="prefixe-modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* En-tête de la modale */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '2px solid #e5e7eb',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            color: '#ffffff'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Eye size={22} />
              {t('Liste des préfixes et leurs significations', 'Lisitry ny prefixes sy ny dikany', 'List of prefixes and their meanings')}
            </h3>
            <button
              onClick={togglePrefixeList}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                fontSize: '24px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                lineHeight: 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              title={t('Fermer', 'Hidio', 'Close')}
            >
              ×
            </button>
          </div>

          {/* Corps de la modale */}
          <div style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(prefixeDetails).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.background = '#eef2ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    letterSpacing: '0.5px',
                    minWidth: '55px',
                    textAlign: 'center',
                    flexShrink: 0
                  }}>
                    {key}
                  </div>
                  <div style={{
                    color: '#1f2937',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(prefixeDetails).length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#6b7280',
                gap: '12px'
              }}>
                <AlertCircle size={40} />
                <p style={{ margin: 0, fontSize: '15px' }}>
                  {t('Aucun préfixe disponible', 'Tsy misy prefix hita', 'No prefix available')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Animation CSS intégrée */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

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
              'Recherchez un usager par son numéro de dossier',
              'Hikaroka mpampiasa amin\'ny laharana rakitra',
              'Search for a user by file number'
            )}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-refreshs" onClick={fetchAllUsagers} title={t('Actualiser', 'Havaozy', 'Refresh')}>
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
          <div className="search-field" ref={suggestionRef}>
            <label>
              <Tag size={14} />
              {t('Préfixe', 'Prefix', 'Prefix')}
              <button
                className="btn-prefixe-info"
                onClick={togglePrefixeList}
                title={t('Voir la liste des préfixes', 'Hijery ny lisitry ny prefixes', 'View prefix list')}
              >
                <Info size={14} />
              </button>
            </label>
            <input
              type="text"
              placeholder={t('Ex: AND, FIT, RAT...', 'Ohatra: AND, FIT, RAT...', 'Ex: AND, FIT, RAT...')}
              value={prefixe}
              onChange={handlePrefixeChange}
              onFocus={() => {
                if (prefixeSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="search-input"
              maxLength={10}
            />
            {showSuggestions && prefixeSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {prefixeSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => selectPrefixe(suggestion)}
                  >
                    <span className="suggestion-prefixe">{suggestion}</span>
                    <span className="suggestion-detail">
                      {prefixeDetails[suggestion] || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="search-field">
            <label>
              <Hash size={14} />
              {t('Numéro', 'Laharana', 'Number')}
            </label>
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
            <label>
              <CalendarIcon size={14} />
              {t('Semestre', 'Semestre', 'Semester')}
            </label>
            <select
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
              className="search-select"
            >
              <option value="">{t('Semestre', 'Semestre', 'Semester')}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          <div className="search-field">
            <label>
              <Calendar size={14} />
              {t('Année', 'Taona', 'Year')}
            </label>
            <select
              value={annee}
              onChange={(e) => setAnnee(e.target.value)}
              className="search-select"
            >
              <option value="">{t('Année', 'Taona', 'Year')}</option>
              {anneesDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="search-actions">
            <button
              className="btn-search"
              onClick={rechercherUsager}
              disabled={isSearching}
            >
              <Search size={18} />
              {isSearching
                ? t('Recherche...', 'Mikaroka...', 'Searching...')
                : t('Rechercher', 'Hikaroka', 'Search')}
            </button>
            <button
              className="btn-reset"
              onClick={resetSearch}
            >
              {t('Réinitialiser', 'Averina', 'Reset')}
            </button>
          </div>
        </div>
      </div>

      <PrefixeListModal />

      {/* Cartes d'information */}
      <div className="info-cards-grid">
        <InfoCard
          icon={Users}
          title={t('Total usagers', 'Isan\'ny mpampiasa', 'Total users')}
          value={filteredUsagers.length}
          subtitle={t('Tous types confondus', 'Karazana rehetra', 'All types combined')}
          color="#4f46e5"
        />
        <InfoCard
          icon={UserCheck}
          title={t('Validés', 'Voamarina', 'Validated')}
          value={filteredUsagers.filter(u => u.statut === 'validee' || u.statut === 'approved').length}
          subtitle={t('Dossiers approuvés', 'Rakitra nekena', 'Approved files')}
          color="#059669"
        />
        <InfoCard
          icon={Clock}
          title={t('En attente', 'Miandry', 'Pending')}
          value={filteredUsagers.filter(u => u.statut === 'en_attente' || u.statut === 'pending').length}
          subtitle={t('Dossiers à vérifier', 'Rakitra hojerena', 'Files to verify')}
          color="#d97706"
        />
        <InfoCard
          icon={DollarSign}
          title={t('Montant total', 'Vola total', 'Total amount')}
          value={formatMontant(filteredUsagers.reduce((sum, u) => sum + (u.soit_total || 0), 0))}
          subtitle={t('Cumul des montants', 'Fitambaran\'ny vola', 'Sum of amounts')}
          color="#7c3aed"
        />
      </div>

      {/* Résultats */}
      <div className="results-container">
        <div className="results-header">
          <div className="results-info">
            <h2>
              <FolderOpen size={20} />
              {t('Résultats de la recherche', 'Vokatry ny fikarohana', 'Search results')}
            </h2>
            <span className="results-count">
              {filteredUsagers.length}{' '}
              {filteredUsagers.length > 1
                ? t('usagers trouvés', 'mpampiasa hita', 'users found')
                : t('usager trouvé', 'mpampiasa hita', 'user found')}
            </span>
          </div>
        </div>

        {/* Tableau */}
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
                currentUsagers.map((usager) => (
                  <tr
                    key={usager.id}
                    className={selectedUsager?.id === usager.id ? 'selected' : ''}
                    onClick={() => setSelectedUsager(usager)}
                  >
                    <td className="dossier-cell">
                      <span className="dossier-number">
                        {usager.numero_dossier || 'N/A'}
                      </span>
                      {usager.quittance && (
                        <span className="quittance-number">
                          {t('Quittance', 'Taratasy', 'Receipt')}: {String(usager.quittance).padStart(7, '0')}
                        </span>
                      )}
                      {usager.ref_omda && (
                        <span className="ref-omda">
                          OMDA: {usager.ref_omda}
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
                            <MapPin size={12} />
                            {usager.lieu_evenement}
                          </span>
                        )}
                        {usager.date_evenement && (
                          <span className="date-event">
                            <Calendar size={12} />
                            {formatDate(usager.date_evenement)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {getTypeBadge(usager.ref_client_type)}
                    </td>
                    <td className="demandeur-cell">
                      <div className="demandeur-name">
                        {usager.demandeur || usager.representant_par || 'N/A'}
                      </div>
                      {usager.personne_recu && (
                        <div className="personne-recu">
                          <User size={12} />
                          {usager.personne_recu}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="montant-total">
                        {formatMontant(usager.soit_total)}
                      </div>
                      {usager.montant_mensuel > 0 && (
                        <div className="montant-mensuel">
                          × {usager.uniter || 1} {t('mois', 'volana', 'months')}
                        </div>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(usager.statut)}
                    </td>
                    <td>
                      <div className="date-creation">
                        {formatDate(usager.created_at)}
                      </div>
                      {usager.createur_nom && (
                        <div className="createur">
                          {t('par', 'avy amin\'ny', 'by')} {usager.createur_nom}
                        </div>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-action view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUsager(usager);
                        }}
                        title={t('Voir détails', 'Hijery antsipiriany', 'View details')}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <AlertCircle size={32} />
                    <p>{t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found')}</p>
                    <span>{t('Modifiez vos critères de recherche', 'Ovay ny fepetra fikarohana', 'Change your search criteria')}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-modern">
            <button
              className="page-prev"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
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
            <button
              className="page-next"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Détails de l'usager sélectionné */}
      {selectedUsager && (
        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-header-left">
              <h2>
                <User size={20} />
                {t('Fiche détaillée', 'Taratasy antsipiriany', 'Detailed sheet')}
              </h2>
              <span className="detail-dossier">
                {t('Dossier', 'Rakitra', 'File')}: {selectedUsager.numero_dossier || 'N/A'}
              </span>
              {selectedUsager.quittance && (
                <span className="detail-quittance">
                  {t('Quittance', 'Taratasy', 'Receipt')}: {String(selectedUsager.quittance).padStart(7, '0')}
                </span>
              )}
            </div>
            <div className="detail-header-actions">
              <button className="btn-close-detail" onClick={() => setSelectedUsager(null)}>
                ×
              </button>
            </div>
          </div>

          <div className="detail-content">
            {/* En-tête profil */}
            <div className="profile-header">
              <div
                className="profile-avatar"
                style={{
                  background: selectedUsager.ref_client_type === 'HTL' ? '#2196F3' :
                             selectedUsager.ref_client_type === 'MGS' ? '#FF9800' :
                             selectedUsager.ref_client_type === 'RDP' ? '#9C27B0' :
                             selectedUsager.ref_client_type === 'TRP' ? '#F44336' :
                             selectedUsager.ref_client_type === 'NGT' ? '#E91E63' :
                             selectedUsager.ref_client_type === 'OCC' ? '#4CAF50' : '#757575'
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
                    <span className="tag">
                      <Map size={14} />
                      {selectedUsager.region_usager}
                    </span>
                  )}
                  {selectedUsager.date_evenement && (
                    <span className="tag">
                      <Calendar size={14} />
                      {formatDate(selectedUsager.date_evenement)}
                    </span>
                  )}
                  {selectedUsager.lieu_evenement && (
                    <span className="tag">
                      <MapPin size={14} />
                      {selectedUsager.lieu_evenement}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grille de détails complète */}
            <div className="detail-single-card">
              <div className="detail-single-grid">
                {/* Colonne gauche - Informations générales */}
                <div className="detail-section">
                  <h4>
                    <Building size={16} />
                    {t('Informations générales', 'Fampahalalana ankapobeny', 'General information')}
                  </h4>
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

                {/* Colonne milieu - Coordonnées et Montants */}
                <div className="detail-section">
                  <h4>
                    <MapPin size={16} />
                    {t('Coordonnées', 'Fifandraisana', 'Contact details')}
                  </h4>
                  <div className="detail-row">
                    <span className="label">
                      <Smartphone size={14} /> {t('Téléphone', 'Finday', 'Phone')} :
                    </span>
                    <span className="value">{selectedUsager.telephone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">
                      <AtSign size={14} /> Email :
                    </span>
                    <span className="value">{selectedUsager.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">
                      <HomeIcon size={14} /> {t('Adresse', 'Adiresy', 'Address')} :
                    </span>
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

                  <h4 style={{ marginTop: '16px' }}>
                    <DollarSign size={16} />
                    {t('Montants', 'Vola', 'Amounts')}
                  </h4>
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
                    <span className="value">{formatMontant(selectedUsager.soit_total)}</span>
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

                {/* Colonne droite - Références et Artistes */}
                <div className="detail-section">
                  <h4>
                    <FileText size={16} />
                    {t('Références', 'Fanondroana', 'References')}
                  </h4>
                  <div className="detail-row">
                    <span className="label">{t('N° Dossier', 'N° Rakitra', 'File N°')} :</span>
                    <span className="value">{selectedUsager.numero_dossier || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ref OMDA :</span>
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
                    <span className="value">
                      {selectedUsager.quittance ? String(selectedUsager.quittance).padStart(7, '0') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">{t('Créé par', 'Noforonin\'ny', 'Created by')} :</span>
                    <span className="value">{selectedUsager.createur_nom || t('Système', 'Rafitra', 'System')}</span>
                  </div>

                  {selectedUsager.artistes && typeof selectedUsager.artistes === 'string' && (
                    <>
                      <h4 style={{ marginTop: '16px' }}>
                        <Music size={16} />
                        {t('Artistes participants', 'Mpanakanto mpandray anjara', 'Participating artists')}
                      </h4>
                      <div className="artistes-list">
                        {selectedUsager.artistes.split(',').map((artiste, index) => (
                          <span key={index} className="artiste-tag">
                            {artiste.trim()}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="detail-actions">
              <button
                className="btn-back"
                onClick={() => navigate('/dashboard')}
              >
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