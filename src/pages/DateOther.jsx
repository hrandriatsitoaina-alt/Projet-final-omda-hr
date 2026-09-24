// src/pages/DateOther.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, ArrowLeft, Eye, X, Calendar, MapPin, Phone, Mail,
  FileText, DollarSign, Plus, RefreshCw, AlertCircle,
  Disc, Music, Globe, Sparkles, Video, Users, Repeat,
  CalendarCheck, FileCheck, RotateCcw, TrendingUp,
} from 'lucide-react';
import Header from '../components/Header';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';
import '../styles/date_grandSurface.css';

const API_URL = 'http://localhost:3001/api';

const TYPE_ICONS = {
  cd: Disc,
  mp3: Music,
  'oeuvre-web': Globe,
  hologramme: Sparkles,
  video: Video,
  autre: Package,
};

const DateOther = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  // ✅ Stocker t dans une ref → ne déclenche jamais de re-création de loadData
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const moisLabelsShort = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  const TYPE_LABELS = useMemo(() => ({
    cd: 'CD',
    mp3: 'MP3',
    'oeuvre-web': t('Œuvre Web', 'Asa an-tserasera', 'Web work'),
    hologramme: t('Hologramme', 'Holograma', 'Hologram'),
    video: t('Vidéo', 'Lahatsary', 'Video'),
    autre: t('Autre', 'Hafa', 'Other'),
  }), [t]);

  // ============================================================
  // STATE
  // ============================================================
  const [usagers, setUsagers] = useState([]);
  const [paiementsRaw, setPaiementsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterMode, setFilterMode] = useState('tous');

  const [notification, setNotification] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [montantTotalRecu, setMontantTotalRecu] = useState(0);

  // ✅ Verrou anti-double-appel (StrictMode / re-render)
  const hasLoadedRef = useRef(false);

  // ============================================================
  // HELPERS
  // ============================================================
  const formatPhoneNumber = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  const formatNumber = useCallback((value) => {
    if (!value && value !== 0) return '0';
    return parseFloat(value).toLocaleString(locale);
  }, [locale]);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(locale);
    } catch {
      return dateStr;
    }
  }, [locale]);

  const extraireMoisPayes = useCallback((paiement) => {
    if (!paiement) return [];
    if (paiement.mois_payes) {
      if (Array.isArray(paiement.mois_payes)) {
        return paiement.mois_payes.filter(m => typeof m === 'number' && m >= 1 && m <= 12);
      }
      if (typeof paiement.mois_payes === 'string') {
        try {
          const parsed = JSON.parse(paiement.mois_payes);
          if (Array.isArray(parsed)) {
            return parsed.filter(m => typeof m === 'number' && m >= 1 && m <= 12);
          }
        } catch (e) { /* ignore */ }
      }
    }
    if (paiement.mois) return [paiement.mois];
    return [];
  }, []);

  // ============================================================
  // ✅ CHARGEMENT — STABLE (aucune dépendance) → jamais recréé
  //    → ne peut donc jamais redéclencher l'useEffect qui l'appelle
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [usagersRes, paiementsRes] = await Promise.all([
        axios.get(`${API_URL}/other-usagers`),
        axios.get(`${API_URL}/paiements/tous`).catch(() => ({ data: { success: false, paiements: [] } })),
      ]);

      const paiements = paiementsRes.data?.success ? (paiementsRes.data.paiements || []) : [];

      if (usagersRes.data.success) {
        const usagersData = usagersRes.data.usagers || [];

        const usagersEnrichisBase = usagersData.map((u) => {
          const lignes = u.lignes || [];
          const paiement = u.paiement || {};
          const totalLignes = lignes.reduce(
            (acc, l) => acc + (parseFloat(l.montant) || 0),
            0
          );
          const total = parseFloat(paiement.montant) || totalLignes;

          return {
            ...u,
            lignes: lignes,
            montant_total: total,
            mode_paiement: u.mode_paiement || 'unique',
          };
        });

        setPaiementsRaw(paiements);
        setUsagers(usagersEnrichisBase);

        const totalRecu = usagersEnrichisBase.reduce(
          (sum, u) => sum + (u.montant_total || 0),
          0
        );
        setMontantTotalRecu(totalRecu);
      } else {
        setUsagers([]);
        setPaiementsRaw([]);
        setApiError(tRef.current(
          'Aucun usager événementiel trouvé',
          'Tsy misy mpampiasa hetsika hita',
          'No event user found'
        ));
      }
    } catch (error) {
      console.error('❌ Erreur chargement other-usagers:', error);
      setApiError(error.message || tRef.current('Erreur de chargement', 'Nisy olana tamin\'ny fakana', 'Loading error'));
      setNotification({
        type: 'error',
        message: `❌ ${tRef.current(
          'Erreur de chargement des données événementielles',
          'Nisy olana tamin\'ny fakana ny angona hetsika',
          'Error loading event data'
        )}`,
      });
    } finally {
      setLoading(false);
    }
  }, []); // ✅ AUCUNE dépendance → référence stable pour toujours

  // ✅ Chargement initial UNIQUE
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // ✅ MAP moisPayesMap (dérivé, pas de state → pas de boucle)
  // ============================================================
  const moisPayesMap = useMemo(() => {
    const map = {};
    const paiementsParUsager = {};

    for (const p of paiementsRaw) {
      if (p.statut !== 'paye') continue;
      if (p.usager_type !== 'other' && p.usager_type !== 'autre') continue;
      const key = String(p.usager_id);
      if (!paiementsParUsager[key]) paiementsParUsager[key] = [];
      paiementsParUsager[key].push(p);
    }

    for (const usagerId in paiementsParUsager) {
      const paiements = paiementsParUsager[usagerId];

      const avecMoisPayes = paiements.filter(p => {
        if (!p.mois_payes) return false;
        if (Array.isArray(p.mois_payes)) return p.mois_payes.length > 0;
        if (typeof p.mois_payes === 'string') {
          try {
            const parsed = JSON.parse(p.mois_payes);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch (e) { return false; }
        }
        return false;
      });

      const paiementsAUtiliser = avecMoisPayes.length > 0 ? avecMoisPayes : paiements;

      for (const p of paiementsAUtiliser) {
        const annee = p.annee;
        if (!annee) continue;
        if (!map[usagerId]) map[usagerId] = {};
        if (!map[usagerId][annee]) map[usagerId][annee] = new Set();

        const moisList = extraireMoisPayes(p);
        for (const m of moisList) {
          if (m >= 1 && m <= 12) map[usagerId][annee].add(m);
        }
      }
    }

    const result = {};
    for (const usagerId in map) {
      result[usagerId] = {};
      for (const annee in map[usagerId]) {
        result[usagerId][annee] = Array.from(map[usagerId][annee]).sort((a, b) => a - b);
      }
    }
    return result;
  }, [paiementsRaw, extraireMoisPayes]);

  // ============================================================
  // ✅ ENRICHISSEMENT (dérivé)
  // ============================================================
  const usagersEnrichis = useMemo(() => {
    return usagers.map((u) => {
      const usagerIdStr = String(u.id);
      const moisSet = new Set();
      const anneesUsager = moisPayesMap[usagerIdStr] || {};
      for (const annee in anneesUsager) {
        for (const m of anneesUsager[annee]) {
          moisSet.add(m);
        }
      }
      const moisPayes = Array.from(moisSet).sort((a, b) => a - b);

      return {
        ...u,
        moisPayes: moisPayes,
        totalMoisPayes: moisPayes.length,
      };
    });
  }, [usagers, moisPayesMap]);

  // ============================================================
  // ✅ FILTRAGE (useMemo, pas de state/useEffect → pas de boucle)
  // ============================================================
  const filteredUsagers = useMemo(() => {
    let filtered = [...usagersEnrichis];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.denomination || '').toLowerCase().includes(term) ||
          (u.nom || '').toLowerCase().includes(term) ||
          (u.prenom || '').toLowerCase().includes(term) ||
          (u.telephone || '').includes(term) ||
          (u.email || '').toLowerCase().includes(term) ||
          (u.region || '').toLowerCase().includes(term) ||
          (u.representant_par || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'tous') {
      filtered = filtered.filter((u) => u.type_usager === filterType);
    }

    if (filterMode !== 'tous') {
      filtered = filtered.filter((u) => u.mode_paiement === filterMode);
    }

    return filtered;
  }, [usagersEnrichis, searchTerm, filterType, filterMode]);

  // ============================================================
  // PAGINATION
  // ============================================================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsagers = filteredUsagers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsagers.length / itemsPerPage);

  const goToPage = (page) => setCurrentPage(page);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleModeChange = (value) => {
    setFilterMode(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('tous');
    setFilterMode('tous');
    setCurrentPage(1);
  };

  const refreshData = () => {
    hasLoadedRef.current = false;
    loadData();
  };

  const openModal = (usager) => {
    setSelectedUsager(usager);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUsager(null);
  };

  const handleRetour = () => navigate('/autre-usager');
  const handleAjouter = () => navigate('/other-ajout');

  // ============================================================
  // STATS
  // ============================================================
  const totalUsagers = filteredUsagers.length;
  const mensuels = filteredUsagers.filter((u) => u.mode_paiement === 'mensuel').length;
  const uniques = filteredUsagers.filter((u) => u.mode_paiement === 'unique').length;

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <>
      <Header />
      <MiniSidebar />
      <main className="contenu-grandsurface">
        {notification && (
          <div className={`notif ${notification.type}`}>
            <span>{notification.type === 'success' ? '✓' : notification.type === 'info' ? '✨' : '✗'}</span>
            <span>{notification.message}</span>
            <button className="notif-close" onClick={() => setNotification(null)}>✕</button>
          </div>
        )}

        <div className="grandsurface-container">
          {/* ===== EN-TÊTE ===== */}
          <div className="page-header">
            <div className="header-left">
              <h1>
                <Package className="header-icon" size={28} />
                {t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')} : <span>{t('Suivi des inscriptions', 'Fanaraha-maso ny fisoratana', 'Registration tracking')}</span>
              </h1>
              <div className="header-stats">
                <span className="stat-badge">
                  <strong>{totalUsagers}</strong> {t('Total', 'Totaly', 'Total')}
                </span>
                <span className="stat-badge">
                  <strong>{mensuels}</strong> {t('Mensuel', 'Isam-bolana', 'Monthly')}
                </span>
                <span className="stat-badge">
                  <strong>{uniques}</strong> {t('Unique', 'Indray mandeha', 'One-time')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-back" onClick={handleRetour}>
                <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
              </button>
            </div>
          </div>

          {/* ===== FILTRES ===== */}
          <div className="filters-container">
            <div className="filters-row">
              <div className="filter-item" style={{ flex: '1 1 200px' }}>
                <label htmlFor="search">
                  <Users size={14} className="filter-icon" /> {t('Rechercher', 'Hikaroka', 'Search')}
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t(
                    'Nom, téléphone, email, région...',
                    'Anarana, finday, mailaka, faritra...',
                    'Name, phone, email, region...'
                  )}
                  className="form-select"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="filter-item">
                <label htmlFor="typeFilter">
                  <Package size={14} className="filter-icon" /> {t('Type', 'Karazana', 'Type')}
                </label>
                <select
                  id="typeFilter"
                  value={filterType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="form-select"
                >
                  <option value="tous">{t('Tous les types', 'Ny karazana rehetra', 'All types')}</option>
                  <option value="cd">CD</option>
                  <option value="mp3">MP3</option>
                  <option value="oeuvre-web">{t('Œuvre Web', 'Asa an-tserasera', 'Web work')}</option>
                  <option value="hologramme">{t('Hologramme', 'Holograma', 'Hologram')}</option>
                  <option value="video">{t('Vidéo', 'Lahatsary', 'Video')}</option>
                  <option value="autre">{t('Autre', 'Hafa', 'Other')}</option>
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="modeFilter">
                  <DollarSign size={14} className="filter-icon" /> {t('Mode paiement', 'Fomba fandoavana', 'Payment mode')}
                </label>
                <select
                  id="modeFilter"
                  value={filterMode}
                  onChange={(e) => handleModeChange(e.target.value)}
                  className="form-select"
                >
                  <option value="tous">{t('Tous', 'Rehetra', 'All')}</option>
                  <option value="mensuel">{t('Mensuel', 'Isam-bolana', 'Monthly')}</option>
                  <option value="unique">{t('Unique', 'Indray mandeha', 'One-time')}</option>
                </select>
              </div>

              <div className="filter-item filter-actions">
                <label>&nbsp;</label>
                <div className="filter-buttons">
                  <button className="btn-reset" onClick={resetFilters}>
                    <RotateCcw size={16} /> {t('Réinitialiser', 'Averina', 'Reset')}
                  </button>
                  <button className="btn-refresh" onClick={refreshData}>
                    <RefreshCw size={16} /> {t('Rafraîchir', 'Havaozy', 'Refresh')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== INDICATEUR ===== */}
          <div className="indicator-bar">
            <span className="indicator-item">
              <Users size={14} className="indicator-icon" /> {t('Total', 'Totaly', 'Total')} : <strong>{totalUsagers}</strong>
            </span>
            <span className="indicator-item">
              <Repeat size={14} className="indicator-icon" /> {t('Mensuel', 'Isam-bolana', 'Monthly')} : <strong>{mensuels}</strong>
            </span>
            <span className="indicator-item">
              <CalendarCheck size={14} className="indicator-icon" /> {t('Unique', 'Indray mandeha', 'One-time')} : <strong>{uniques}</strong>
            </span>
            <span className="indicator-item">
              <DollarSign size={14} className="indicator-icon" /> {t('Total reçu', 'Totaly voaray', 'Total received')} :{' '}
              <strong>{montantTotalRecu.toLocaleString(locale)} Ar</strong>
            </span>
            <span className="indicator-item indicator-total">
              <TrendingUp size={14} className="indicator-icon" /> {t('Montant moyen', 'Vola antonony', 'Average amount')} :{' '}
              <strong>
                {totalUsagers > 0
                  ? Math.round(montantTotalRecu / totalUsagers).toLocaleString(locale)
                  : 0}{' '}
                Ar
              </strong>
            </span>
          </div>

          {/* ===== TABLEAU ===== */}
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>{t('Chargement des données…', 'Maka ny angona…', 'Loading data…')}</p>
              </div>
            ) : apiError ? (
              <div className="error-state">
                <AlertCircle size={32} />
                <p>{apiError}</p>
                <button className="btn-retry" onClick={refreshData}>
                  <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
                </button>
              </div>
            ) : currentUsagers.length === 0 ? (
              <div className="empty-state">
                <Package size={48} color="#94a3b8" />
                <p>{t('Aucun usager événementiel trouvé', 'Tsy misy mpampiasa hetsika hita', 'No event user found')}</p>
                <button className="btn-retry" onClick={handleAjouter}>
                  <Plus size={16} /> {t('Ajouter un usager événementiel', 'Hanampy mpampiasa hetsika', 'Add event user')}
                </button>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="sticky-id">ID</th>
                      <th className="sticky-nom">{t('Dénomination', 'Anarana', 'Name')}</th>
                      <th>{t('Type', 'Karazana', 'Type')}</th>
                      <th>{t('Représentant', 'Mpisolo tena', 'Representative')}</th>
                      <th>{t('Téléphone', 'Finday', 'Phone')}</th>
                      <th>{t('Région', 'Faritra', 'Region')}</th>
                      <th>{t('Mode', 'Fomba', 'Mode')}</th>
                      <th>{t('Mois payés', 'Volana voaloa', 'Months paid')}</th>
                      <th>{t('Action', 'Hetsika', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsagers.map((usager) => {
                      const TypeIcon = TYPE_ICONS[usager.type_usager] || Package;
                      const typeLabel = TYPE_LABELS[usager.type_usager] || usager.type_usager;
                      const isUnique = usager.mode_paiement === 'unique';
                      const statusColor = isUnique ? '#28a745' : '#2c7be5';

                      return (
                        <tr
                          key={usager.id}
                          style={{ borderLeft: `4px solid ${statusColor}` }}
                        >
                          <td className="sticky-id">
                            #{String(usager.id).padStart(3, '0')}
                          </td>
                          <td className="sticky-nom">
                            <strong>{usager.denomination || t('Sans nom', 'Tsy misy anarana', 'No name')}</strong>
                            {usager.nom && (
                              <div style={{ fontSize: '0.75em', color: '#666' }}>
                                {usager.nom} {usager.prenom || ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <TypeIcon size={12} /> {typeLabel}
                            </span>
                          </td>
                          <td>{usager.representant_par || '-'}</td>
                          <td>{formatPhoneNumber(usager.telephone)}</td>
                          <td>{usager.region || '-'}</td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                background: isUnique ? '#f0fdf4' : '#eff6ff',
                                color: isUnique ? '#166534' : '#1e40af',
                                border: `1px solid ${isUnique ? '#86efac' : '#bfdbfe'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {isUnique ? (
                                <><CalendarCheck size={12} /> {t('Unique', 'Indray mandeha', 'One-time')}</>
                              ) : (
                                <><Repeat size={12} /> {t('Mensuel', 'Isam-bolana', 'Monthly')}</>
                              )}
                            </span>
                          </td>
                          <td>
                            {usager.moisPayes && usager.moisPayes.length > 0 ? (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#2c7be5' }}>
                                {usager.moisPayes.length}/12
                                <div style={{ fontSize: '10px', color: '#666', fontWeight: 400 }}>
                                  ({usager.moisPayes.map(m => moisLabelsShort[m - 1]).join(', ')})
                                </div>
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>—</span>
                            )}
                          </td>
                          <td className="action-cell">
                            <button className="btn-view" onClick={() => openModal(usager)}>
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ===== PAGINATION ===== */}
          {filteredUsagers.length > 0 && (
            <div className="pagination-container">
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ◀
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => goToPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="page-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ▶
                </button>
              </div>
              <div className="pagination-info">
                {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsagers.length)} {t('sur', 'amin\'ny', 'of')} {filteredUsagers.length}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== MODAL ===== */}
      {showModal && selectedUsager && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Package size={18} /> {selectedUsager.denomination || t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h4>
                  <Users size={16} /> {t('Informations', 'Fampahalalana', 'Information')}
                </h4>
                <div className="modal-row">
                  <span>ID</span>
                  <strong>#{String(selectedUsager.id).padStart(3, '0')}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Dénomination', 'Anarana', 'Name')}</span>
                  <strong>{selectedUsager.denomination || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Nom / Prénom', 'Anarana / Fanampin\'anarana', 'Name / First name')}</span>
                  <strong>
                    {selectedUsager.nom || '-'} {selectedUsager.prenom || ''}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Type', 'Karazana', 'Type')}</span>
                  <strong>
                    {TYPE_LABELS[selectedUsager.type_usager] || selectedUsager.type_usager}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Téléphone', 'Finday', 'Phone')}</span>
                  <strong>{formatPhoneNumber(selectedUsager.telephone)}</strong>
                </div>
                <div className="modal-row">
                  <span>Email</span>
                  <strong>{selectedUsager.email || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Région', 'Faritra', 'Region')}</span>
                  <strong>{selectedUsager.region || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Adresse', 'Adiresy', 'Address')}</span>
                  <strong>{selectedUsager.adresse || '-'}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h4>
                  <Users size={16} /> {t('Représentant', 'Mpisolo tena', 'Representative')}
                </h4>
                <div className="modal-row">
                  <span>{t('Représenté par', 'Solontenan\'ny', 'Represented by')}</span>
                  <strong>{selectedUsager.representant_par || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>CIN</span>
                  <strong>{selectedUsager.representant_cin || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('CIN délivrée le', 'CIN nomena ny', 'ID issued on')}</span>
                  <strong>{formatDate(selectedUsager.representant_cin_delivree)}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')}</span>
                  <strong>{selectedUsager.representant_cin_lieu || '-'}</strong>
                </div>
              </div>

              {selectedUsager.lignes && selectedUsager.lignes.length > 0 && (
                <div className="modal-section">
                  <h4>
                    <FileText size={16} /> {t('Détail de la facture', 'Antsipirian\'ny faktiora', 'Invoice details')}
                  </h4>
                  <table className="data-table" style={{ marginTop: '8px' }}>
                    <thead>
                      <tr>
                        <th>{t('Description', 'Fanazavana', 'Description')}</th>
                        <th style={{ textAlign: 'center' }}>U.</th>
                        <th style={{ textAlign: 'right' }}>P.U.</th>
                        <th style={{ textAlign: 'right' }}>{t('Montant', 'Vola', 'Amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUsager.lignes.map((l, i) => (
                        <tr key={i}>
                          <td>{l.description}</td>
                          <td style={{ textAlign: 'center' }}>{l.uniter}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(l.pu)} Ar</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>
                            {formatNumber(l.montant)} Ar
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-section">
                <h4>
                  <DollarSign size={16} /> {t('Paiement', 'Fandoavana', 'Payment')}
                </h4>
                <div className="modal-row">
                  <span>{t('Mode paiement', 'Fomba fandoavana', 'Payment mode')}</span>
                  <strong>
                    {selectedUsager.mode_paiement === 'unique'
                      ? t('Paiement unique', 'Fandoavana indray mandeha', 'One-time payment')
                      : t('Paiement mensuel', 'Fandoavana isam-bolana', 'Monthly payment')}
                  </strong>
                </div>
                {selectedUsager.paiement && (
                  <>
                    <div className="modal-row">
                      <span>{t('Montant', 'Vola', 'Amount')}</span>
                      <strong style={{ color: '#28a745' }}>
                        {formatNumber(selectedUsager.paiement.montant)} Ar
                      </strong>
                    </div>
                    <div className="modal-row">
                      <span>{t('Date paiement', 'Daty nandoavana', 'Payment date')}</span>
                      <strong>{formatDate(selectedUsager.paiement.date_paiement)}</strong>
                    </div>
                  </>
                )}
                {selectedUsager.moisPayes && selectedUsager.moisPayes.length > 0 && (
                  <div className="modal-row">
                    <span>{t('Mois payés', 'Volana voaloa', 'Months paid')}</span>
                    <strong>
                      {selectedUsager.moisPayes.length}/12 ({selectedUsager.moisPayes.map(m => moisLabelsShort[m - 1]).join(', ')})
                    </strong>
                  </div>
                )}
              </div>

              {selectedUsager.personne_recu && (
                <div className="modal-section">
                  <h4>
                    <CalendarCheck size={16} /> {t('Réception', 'Fandraisana', 'Reception')}
                  </h4>
                  <div className="modal-row">
                    <span>{t('Personne qui reçoit', 'Mpandray', 'Receiver')}</span>
                    <strong>{selectedUsager.personne_recu}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-modal-close" onClick={closeModal}>
                {t('Fermer', 'Hidio', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DateOther;