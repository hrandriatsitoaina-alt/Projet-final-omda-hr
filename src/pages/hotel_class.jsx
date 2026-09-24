// src/pages/hotel_class.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  MapPin,
  Users,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  Eye,
  X,
  DollarSign,
  AlertCircle,
  Hotel,
  Trophy,
  Check,
  Circle,
} from 'lucide-react';
import Header from '../components/Header';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';
import '../styles/date_grandSurface.css';

const API_URL = 'http://localhost:3001/api';

const HotelComponent = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

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

  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [anneeRecherche, setAnneeRecherche] = useState(new Date().getFullYear());
  const [regionFiltre, setRegionFiltre] = useState('');
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);
  const [regionsDisponibles, setRegionsDisponibles] = useState([]);

  const [statsGraph, setStatsGraph] = useState({
    bonPayeur: 0, payeurMoyen: 0, mauvaisPayeur: 0, nonPayeur: 0, total: 0,
  });

  const [notification, setNotification] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [montantTotalRecu, setMontantTotalRecu] = useState(0);

  // ============================================================
  // ✅ Utilitaires
  // ============================================================
  const toNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // ✅ Extraire les mois payés d'un paiement (gère les 2 formats)
  //    - Nouveau format : { mois: 1, mois_payes: [1,2,3,...], nombre_mois: 3 }
  //    - Ancien format  : { mois: 1, mois_payes: null, nombre_mois: 1 }
  const extraireMoisPayes = (paiement) => {
    if (!paiement) return [];

    // Priorité 1 : mois_payes (JSONB array ou string JSON)
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

    // Priorité 2 : mois unique
    if (paiement.mois) {
      return [paiement.mois];
    }

    return [];
  };

  // ✅ Calcul du montant payé : gère le nouveau format (1 ligne = N mois)
  const calculerMontantPaye = (paiements) => {
    if (!paiements || paiements.length === 0) return 0;
    let total = 0;
    for (const p of paiements) {
      const montant = toNumber(p.montant);
      const fraisDossier = toNumber(p.frais_dossier);
      const montantRetard = toNumber(p.montant_retard);
      // Si c'est un paiement groupé (nouveau format), montant est déjà le total
      const estGroupe = toNumber(p.nombre_mois) > 1 || (p.mois_payes && extraireMoisPayes(p).length > 1);
      if (estGroupe) {
        total += montant + fraisDossier + montantRetard;
      } else {
        // Ancien format : montant par mois + frais
        total += montant + fraisDossier + montantRetard;
      }
    }
    return total;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  // ============================================================
  // Chargement régions
  // ============================================================
  const loadRegions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/regions`);
      if (response.data.success) setRegionsDisponibles(response.data.regions || []);
      else setRegionsDisponibles([]);
    } catch (error) {
      console.error('❌ Erreur chargement régions:', error);
      setRegionsDisponibles([]);
    }
  }, []);

  // ============================================================
  // Chargement années
  // ============================================================
  const loadAnnees = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/annees-disponibles/hotel`);
      if (response.data.success) {
        setAnneesDisponibles(response.data.annees || []);
        if (response.data.annees.length > 0 && !response.data.annees.includes(new Date().getFullYear())) {
          setAnneeRecherche(response.data.annees[response.data.annees.length - 1]);
        }
      } else {
        const currentYear = new Date().getFullYear();
        setAnneesDisponibles([currentYear - 2, currentYear - 1, currentYear, currentYear + 1]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement années:', error);
      const currentYear = new Date().getFullYear();
      setAnneesDisponibles([currentYear - 2, currentYear - 1, currentYear, currentYear + 1]);
    }
  }, []);

  // ============================================================
  // ✅ Chargement des données (CORRIGÉ pour mois_payes)
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const usagersResponse = await axios.get(`${API_URL}/usagers/paiements/hotel`);
      let usagersData = [];
      let paiements = [];

      if (usagersResponse.data.success && usagersResponse.data.usagers) {
        usagersData = usagersResponse.data.usagers;
      } else {
        try {
          const allUsagersResponse = await axios.get(`${API_URL}/usagers`);
          if (allUsagersResponse.data.success && allUsagersResponse.data.usagers) {
            usagersData = allUsagersResponse.data.usagers.filter(
              (u) => u.type_usager === 'hotel' || u.type === 'hotel'
            );
          }
        } catch (err) {
          console.error('❌ Erreur chargement usagers généraux:', err);
        }
      }

      if (usagersData.length === 0) {
        setUsagers([]);
        setFilteredUsagers([]);
        setLoading(false);
        setApiError(t(
          'Aucun hôtel trouvé',
          'Tsy misy hotely hita',
          'No hotel found'
        ));
        return;
      }

      try {
        const paiementsResponse = await axios.get(`${API_URL}/paiements/tous`);
        if (paiementsResponse.data.success) {
          paiements = paiementsResponse.data.paiements || [];
        }
      } catch (err) {
        console.warn('⚠️ Erreur chargement paiements:', err);
      }

      // ✅ Fusion usager + paiements en prenant en compte mois_payes
      const usagersWithYearData = usagersData.map((usager) => {
        // Tous les paiements de cet usager pour l'année sélectionnée
        const paiementsPourAnnee = paiements
          .filter(
            (p) =>
              p.usager_id === usager.id &&
              (p.usager_type === 'hotel' || p.usager_type === usager.type_usager) &&
              p.annee === anneeRecherche &&
              p.statut === 'paye'
          )
          .sort((a, b) => (a.mois || 0) - (b.mois || 0));

        // ✅ Fusionner tous les mois_payes de toutes les lignes
        const moisPayesSet = new Set();
        for (const p of paiementsPourAnnee) {
          const mois = extraireMoisPayes(p);
          for (const m of mois) {
            if (m >= 1 && m <= 12) moisPayesSet.add(m);
          }
        }
        const moisPayes = Array.from(moisPayesSet).sort((a, b) => a - b);

        // ✅ Montant total payé (somme des montants + frais - attention doublons)
        //    On additionne chaque ligne de paiement (chaque ligne = un paiement groupé)
        let montantTotalPaye = 0;
        for (const p of paiementsPourAnnee) {
          const montant = toNumber(p.montant);
          const fraisDossier = toNumber(p.frais_dossier);
          const montantRetard = toNumber(p.montant_retard);
          montantTotalPaye += montant + fraisDossier + montantRetard;
        }

        return {
          ...usager,
          moisPayes: moisPayes,
          moisPayesAnnee: paiementsPourAnnee,
          totalMoisPayesAnnee: moisPayes.length,
          anneeCourante: anneeRecherche,
          montant_total_paye: montantTotalPaye,
        };
      });

      let filtered = [...usagersWithYearData];
      if (regionFiltre) filtered = filtered.filter((u) => u.region === regionFiltre);

      setUsagers(usagersWithYearData);
      setFilteredUsagers(filtered);
      updateStats(filtered);

      const totalRecu = filtered.reduce((sum, u) => sum + (u.montant_total_paye || 0), 0);
      setMontantTotalRecu(totalRecu);
    } catch (error) {
      console.error('❌ Erreur chargement données hôtels:', error);
      setApiError(error.message || t('Erreur', 'Olana', 'Error'));
      setNotification({
        type: 'error',
        message: t('❌ Erreur', '❌ Olana', '❌ Error'),
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche, regionFiltre]);

  const updateStats = (data) => {
    setStatsGraph({
      bonPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) >= 9).length,
      payeurMoyen: data.filter((u) => (u.totalMoisPayesAnnee || 0) >= 5 && (u.totalMoisPayesAnnee || 0) <= 8).length,
      mauvaisPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) > 0 && (u.totalMoisPayesAnnee || 0) < 5).length,
      nonPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) === 0).length,
      total: data.length,
    });
  };

  const filterByRegion = useCallback(() => {
    let filtered = [...usagers];
    if (regionFiltre) filtered = filtered.filter((u) => u.region === regionFiltre);
    setFilteredUsagers(filtered);
    updateStats(filtered);
    setCurrentPage(1);
  }, [usagers, regionFiltre]);

  useEffect(() => {
    loadRegions();
    loadAnnees();
  }, [loadRegions, loadAnnees]);

  useEffect(() => {
    if (anneeRecherche) loadData();
  }, [anneeRecherche, loadData]);

  useEffect(() => {
    if (usagers.length > 0) filterByRegion();
  }, [regionFiltre, usagers, filterByRegion]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsagers = filteredUsagers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsagers.length / itemsPerPage);

  const goToPage = (page) => setCurrentPage(page);

  const handleRegionChange = (value) => setRegionFiltre(value);
  const handleAnneeChange = (value) => {
    setAnneeRecherche(parseInt(value));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setAnneeRecherche(new Date().getFullYear());
    setRegionFiltre('');
    setCurrentPage(1);
    loadData();
  };

  const refreshData = () => loadData();

  const openModal = (usager) => {
    setSelectedUsager(usager);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUsager(null);
  };

  const getStatusColor = (usager) => {
    const total = usager.totalMoisPayesAnnee || 0;
    if (total === 0) return '#6c757d';
    if (total >= 9) return '#28a745';
    if (total >= 5) return '#ffc107';
    return '#dc3545';
  };

  const getStatusText = (usager) => {
    const total = usager.totalMoisPayesAnnee || 0;
    if (total === 0) return t('Aucun', 'Tsy misy', 'None');
    if (total >= 9) return t('Bon', 'Tsara', 'Good');
    if (total >= 5) return t('Moyen', 'Antonony', 'Medium');
    return t('Critique', 'Kritika', 'Critical');
  };

  const totalUsagers = filteredUsagers.length;
  const nonPayes = filteredUsagers.filter((u) => (u.totalMoisPayesAnnee || 0) === 0).length;
  const partiels = filteredUsagers.filter((u) => (u.totalMoisPayesAnnee || 0) > 0 && (u.totalMoisPayesAnnee || 0) < 12).length;
  const aJour = filteredUsagers.filter((u) => (u.totalMoisPayesAnnee || 0) === 12).length;
  const tauxPaiement = totalUsagers > 0 ? Math.round(((totalUsagers - nonPayes) / totalUsagers) * 100) : 0;

  const handleRetour = () => navigate('/autre-usager');

  return (
    <>
      <Header />
      <MiniSidebar />
      <main className="contenu-grandsurface">
        {notification && (
          <div className={`notif ${notification.type}`}>
            <span>
              {notification.type === 'success' ? <Check size={16} /> : notification.type === 'info' ? <Hotel size={16} /> : <X size={16} />}
            </span>
            <span>{notification.message}</span>
            <button className="notif-close" onClick={() => setNotification(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grandsurface-container">
          {/* ===== EN-TÊTE ===== */}
          <div className="page-header">
            <div className="header-left">
              <h1>
                <Hotel className="header-icon" size={28} />
                {t('Hôtels', 'Hotely', 'Hotels')} : {' '}
                <span>{t('Paiements', 'Fandoavana', 'Payments')}</span>
              </h1>
              <div className="header-stats">
                <span className="stat-badge"><strong>{totalUsagers}</strong> {t('Usagers', 'Mpampiasa', 'Users')}</span>
                <span className="stat-badge"><strong>{aJour}</strong> {t('À jour', 'Voaloa', 'Up to date')}</span>
                <span className="stat-badge"><strong>{partiels}</strong> {t('Retard', 'Tara', 'Late')}</span>
                <span className="stat-badge"><strong>{nonPayes}</strong> {t('Non payés', 'Tsy nandoa', 'Unpaid')}</span>
                <span className="stat-badge"><strong>{tauxPaiement}%</strong> {t('Taux', 'Taha', 'Rate')}</span>
              </div>
            </div>
            <button className="btn-back" onClick={handleRetour}>
              <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
          </div>

          {/* ===== FILTRES ===== */}
          <div className="filters-container">
            <div className="filters-row">
              <div className="filter-item">
                <label htmlFor="anneeSelect">
                  <Calendar size={14} className="filter-icon" /> {t('Année', 'Taona', 'Year')}
                </label>
                <select
                  id="anneeSelect"
                  value={anneeRecherche}
                  onChange={(e) => handleAnneeChange(e.target.value)}
                  className="form-select"
                >
                  {anneesDisponibles.length > 0 ? (
                    anneesDisponibles.map((an) => (<option key={an} value={an}>{an}</option>))
                  ) : (
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  )}
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="regionSelect">
                  <MapPin size={14} className="filter-icon" /> {t('Région', 'Faritra', 'Region')}
                </label>
                <select
                  id="regionSelect"
                  value={regionFiltre}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">{t('Toutes', 'Rehetra', 'All')}</option>
                  {regionsDisponibles && regionsDisponibles.length > 0 ? (
                    regionsDisponibles.map((region, index) => (
                      <option key={index} value={region.nom || region}>{region.nom || region}</option>
                    ))
                  ) : (
                    <option value="" disabled>{t('Aucune', 'Tsy misy', 'None')}</option>
                  )}
                </select>
              </div>

              <div className="filter-item filter-actions">
                <label>&nbsp;</label>
                <div className="filter-buttons">
                  <button className="btn-reset" onClick={resetFilters}>
                    <RotateCcw size={16} /> {t('Réinit.', 'Averina', 'Reset')}
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
              <Calendar size={14} className="indicator-icon" /> {t('Année', 'Taona', 'Year')} : <strong>{anneeRecherche}</strong>
            </span>
            {regionFiltre && (
              <span className="indicator-item">
                <MapPin size={14} className="indicator-icon" /> {t('Région', 'Faritra', 'Region')} : <strong>{regionFiltre}</strong>
              </span>
            )}
            <span className="indicator-item">
              <DollarSign size={14} className="indicator-icon" /> {t('Reçu', 'Voaray', 'Received')} : <strong>{montantTotalRecu.toLocaleString(locale)} Ar</strong>
            </span>
            <span className="indicator-item indicator-total">
              <Users size={14} className="indicator-icon" /> {t('Total', 'Totaly', 'Total')} : <strong>{totalUsagers}</strong>
            </span>
          </div>

          {/* ===== TABLEAU ===== */}
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>{t('Chargement…', 'Maka…', 'Loading…')}</p>
              </div>
            ) : apiError ? (
              <div className="error-state">
                <AlertCircle size={32} />
                <p>{apiError}</p>
                <button className="btn-retry" onClick={refreshData}>
                  <RefreshCw size={16} /> {t('Réessayer', 'Andramo', 'Retry')}
                </button>
              </div>
            ) : currentUsagers.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={32} />
                <p>{t('Aucun hôtel trouvé', 'Tsy misy hotely hita', 'No hotel found')}</p>
                <button className="btn-retry" onClick={refreshData}>
                  <RefreshCw size={16} /> {t('Réessayer', 'Andramo', 'Retry')}
                </button>
              </div>
            ) : (
              <div
                className="table-scroll-container"
                style={{
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: '70vh',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <table
                  className="data-table"
                  style={{
                    minWidth: '1600px',
                    width: 'max-content',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    tableLayout: 'auto',
                  }}
                >
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
                      <th className="sticky-id" style={{ minWidth: '60px', whiteSpace: 'nowrap' }}>ID</th>
                      <th className="sticky-nom" style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>
                        {t('Dénomination', 'Anarana', 'Name')}
                      </th>
                      <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>
                        {t('Demandeur', 'Mpangataka', 'Applicant')}
                      </th>
                      <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {t('Téléphone', 'Finday', 'Phone')}
                      </th>
                      <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>
                        {t('Adresse', 'Adiresy', 'Address')}
                      </th>
                      <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>
                        {t('Région', 'Faritra', 'Region')}
                      </th>
                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {t('Étoiles', 'Kintana', 'Stars')}
                      </th>
                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {t('Ravinala', 'Ravinala', 'Ravinala')}
                      </th>
                      {[...Array(12)].map((_, i) => (
                        <th
                          key={i}
                          className="month-col"
                          style={{ minWidth: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </th>
                      ))}
                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>
                        {t('Total mois', 'Totaly volana', 'Total months')}
                      </th>
                      <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {t('Payé (Ar)', 'Voaloa (Ar)', 'Paid (Ar)')}
                      </th>
                      <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                        {t('Statut', 'Toe-javatra', 'Status')}
                      </th>
                      <th style={{ minWidth: '70px', whiteSpace: 'nowrap' }}>
                        {t('Action', 'Hetsika', 'Action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsagers.map((usager) => {
                      const statusColor = getStatusColor(usager);
                      const statusText = getStatusText(usager);
                      const totalPayes = usager.totalMoisPayesAnnee || 0;
                      const totalPayeAr = usager.montant_total_paye || 0;

                      return (
                        <tr key={usager.id} style={{ borderLeft: `4px solid ${statusColor}` }}>
                          <td className="sticky-id" style={{ whiteSpace: 'nowrap' }}>
                            #{String(usager.id).padStart(3, '0')}
                          </td>
                          <td className="sticky-nom" style={{ whiteSpace: 'nowrap' }}>
                            <strong>{usager.denomination || usager.nom || '-'}</strong>
                            {usager.region && (
                              <div style={{ fontSize: '0.65em', color: '#666' }}>
                                <MapPin size={12} style={{ display: 'inline', marginRight: '2px' }} />
                                {usager.region}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {usager.demandeur || usager.representant_par || '-'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatPhoneNumber(usager.telephone)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.adresse_siege || usager.adresse || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.region || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {usager.etoiles ? (
                              <span style={{ color: '#f59e0b' }}>{'⭐'.repeat(usager.etoiles)}</span>
                            ) : '-'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {usager.ravinala ? (
                              <span style={{ color: '#28a745' }}>
                                <Trophy size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                {t('Oui', 'Eny', 'Yes')}
                              </span>
                            ) : '-'}
                          </td>
                          {[...Array(12)].map((_, i) => {
                            const mois = i + 1;
                            const isPaye = usager.moisPayes?.includes(mois);
                            return (
                              <td
                                key={i}
                                className="month-cell"
                                style={{ textAlign: 'center', whiteSpace: 'nowrap' }}
                              >
                                <span className={`mois-badge ${isPaye ? 'paye' : 'non-paye'}`}>
                                  {isPaye ? <Check size={14} /> : <Circle size={14} />}
                                </span>
                              </td>
                            );
                          })}
                          <td className="total-cell" style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <strong>{totalPayes}/12</strong>
                          </td>
                          <td className="paye-cell" style={{ whiteSpace: 'nowrap' }}>
                            {totalPayeAr.toLocaleString(locale)} Ar
                          </td>
                          <td className="status-cell" style={{ whiteSpace: 'nowrap' }}>
                            <span className="status-badge" style={{ background: `${statusColor}20`, color: statusColor }}>
                              {statusText}
                            </span>
                          </td>
                          <td className="action-cell" style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
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
                {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsagers.length)} / {filteredUsagers.length}
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
                <Hotel size={18} /> {selectedUsager.denomination || selectedUsager.nom || t('Hôtel', 'Hotely', 'Hotel')}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h4>
                  <Hotel size={16} /> {t('Infos', 'Fampahalalana', 'Info')}
                </h4>
                <div className="modal-row">
                  <span>ID</span>
                  <strong>#{String(selectedUsager.id).padStart(3, '0')}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Nom', 'Anarana', 'Name')}</span>
                  <strong>{selectedUsager.denomination || selectedUsager.nom || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Demandeur', 'Mpangataka', 'Applicant')}</span>
                  <strong>{selectedUsager.demandeur || selectedUsager.representant_par || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Adresse', 'Adiresy', 'Address')}</span>
                  <strong>{selectedUsager.adresse_siege || selectedUsager.adresse || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Téléphone', 'Finday', 'Phone')}</span>
                  <strong>{formatPhoneNumber(selectedUsager.telephone)}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Région', 'Faritra', 'Region')}</span>
                  <strong>{selectedUsager.region || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Étoiles', 'Kintana', 'Stars')}</span>
                  <strong>
                    {selectedUsager.etoiles ? (
                      <span style={{ color: '#f59e0b' }}>{'⭐'.repeat(selectedUsager.etoiles)}</span>
                    ) : '-'}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>Ravinala</span>
                  <strong>
                    {selectedUsager.ravinala ? (
                      <span style={{ color: '#28a745' }}>
                        <Trophy size={16} style={{ display: 'inline', marginRight: '4px' }} />
                        {t('Oui', 'Eny', 'Yes')}
                      </span>
                    ) : t('Non', 'Tsia', 'No')}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Chambres', 'Efitra', 'Rooms')}</span>
                  <strong>{selectedUsager.nombre_chambres || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Catégorie', 'Sokajy', 'Category')}</span>
                  <strong>{selectedUsager.categorie || selectedUsager.type_hotel || '-'}</strong>
                </div>
              </div>
              <div className="modal-section">
                <h4>
                  <DollarSign size={16} /> {t('Paiements', 'Fandoavana', 'Payments')} - {selectedUsager.anneeCourante || anneeRecherche}
                </h4>
                <div className="modal-row">
                  <span>{t('Montant mois', 'Vola volana', 'Monthly amount')}</span>
                  <strong>{(selectedUsager.montant_mensuel || 0).toLocaleString(locale)} Ar</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Mois payés', 'Volana voaloa', 'Months paid')}</span>
                  <strong>{selectedUsager.totalMoisPayesAnnee || 0}/12</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Détails', 'Antsipiriany', 'Details')}</span>
                  <strong>
                    {selectedUsager.moisPayes && selectedUsager.moisPayes.length > 0
                      ? selectedUsager.moisPayes.map((m) => moisLabelsShort[m - 1]).join(', ')
                      : t('Aucun', 'Tsy misy', 'None')}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Total payé', 'Vola voaloa', 'Total paid')}</span>
                  <strong style={{ color: '#28a745' }}>
                    {(selectedUsager.montant_total_paye || 0).toLocaleString(locale)} Ar
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Statut', 'Toe-javatra', 'Status')}</span>
                  <strong>
                    <span
                      className="status-badge"
                      style={{
                        background: `${getStatusColor(selectedUsager)}20`,
                        color: getStatusColor(selectedUsager),
                      }}
                    >
                      {getStatusText(selectedUsager)}
                    </span>
                  </strong>
                </div>
              </div>
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

export default HotelComponent;