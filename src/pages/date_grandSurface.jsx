// src/pages/date_grandSurface.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  MapPin,
  Building2,
  Users,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  Eye,
  X,
  DollarSign,
  AlertCircle,
  Info,
} from 'lucide-react';
import Header from '../components/Header';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';
import '../styles/date_grandSurface.css';

const API_URL = 'http://localhost:3001/api';

const DateGrandSurface = () => {
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
  const [villeFiltre, setVilleFiltre] = useState('');
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  // ✅ NOUVEAU : IDs pour filtrage exact
  const [regionId, setRegionId] = useState(null);
  const [villeId, setVilleId] = useState(null);

  const [regionsAvecVilles, setRegionsAvecVilles] = useState([]);

  const [statsGraph, setStatsGraph] = useState({
    bonPayeur: 0, payeurMoyen: 0, mauvaisPayeur: 0, nonPayeur: 0, total: 0,
  });

  const [notification, setNotification] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [montantTotalRecu, setMontantTotalRecu] = useState(0);

  // ============================================================
  // Utilitaires
  // ============================================================
  const toNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const normalizeStr = useCallback((str) => {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }, []);

  const extraireMoisPayes = (paiement) => {
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
  };

  const calculerMontantPaye = (paiements) => {
    if (!paiements || paiements.length === 0) return 0;
    let total = 0;
    for (const p of paiements) {
      total += toNumber(p.montant) + toNumber(p.frais_dossier) + toNumber(p.montant_retard);
    }
    return total;
  };

  // ============================================================
  // API : régions AVEC villes
  // ============================================================
  const loadRegionsAvecVilles = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/regions/avec-villes`);
      if (response.data.success && Array.isArray(response.data.regions)) {
        setRegionsAvecVilles(response.data.regions);
        console.log('✅ Régions chargées:', response.data.regions.length);
        response.data.regions.forEach((r) => {
          console.log(`   📍 ${r.nom} (id=${r.id}) → ${(r.villes || []).map(v => `${v.nom}(id=${v.id})`).join(', ')}`);
        });
        return;
      }
      const fallback = await axios.get(`${API_URL}/regions`);
      if (fallback.data.success) {
        setRegionsAvecVilles(
          (fallback.data.regions || []).map((r) => ({ ...r, villes: [] }))
        );
      }
    } catch (error) {
      console.error('❌ Erreur régions:', error);
      setRegionsAvecVilles([]);
    }
  }, []);

  const loadAnnees = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/annees-disponibles/grand-surface`);
      if (response.data.success) {
        setAnneesDisponibles(response.data.annees || []);
        if (response.data.annees.length > 0 && !response.data.annees.includes(new Date().getFullYear())) {
          setAnneeRecherche(response.data.annees[response.data.annees.length - 1]);
        }
      } else {
        const y = new Date().getFullYear();
        setAnneesDisponibles([y - 2, y - 1, y, y + 1]);
      }
    } catch (error) {
      console.error('❌ Erreur années:', error);
      const y = new Date().getFullYear();
      setAnneesDisponibles([y - 2, y - 1, y, y + 1]);
    }
  }, []);

  // ============================================================
  // Liste plate des villes
  // ============================================================
  const toutesLesVilles = useMemo(() => {
    const liste = [];
    regionsAvecVilles.forEach((r) => {
      const villes = Array.isArray(r.villes) ? r.villes : [];
      villes.forEach((v) => {
        const nomVille = String(v.nom || v.ville || '').trim();
        if (nomVille) {
          liste.push({
            ville: nomVille,
            region: r.nom,
            quartier: v.quartier || '',
            telephone: v.telephone || '',
            villeId: v.id,
            regionId: r.id,
          });
        }
      });
    });
    return liste;
  }, [regionsAvecVilles]);

  const villesDisponibles = useMemo(() => {
    let filtered = toutesLesVilles;
    if (regionFiltre) {
      filtered = filtered.filter((v) => v.region === regionFiltre);
    }
    const set = new Set(filtered.map((v) => v.ville));
    return Array.from(set).sort((a, b) => a.localeCompare(b, locale));
  }, [toutesLesVilles, regionFiltre, locale]);

  const regionDeduiteDeVille = useMemo(() => {
    if (!villeFiltre) return '';
    const villeNorm = normalizeStr(villeFiltre);
    const trouvee = toutesLesVilles.find(
      (v) => normalizeStr(v.ville) === villeNorm
    );
    return trouvee ? trouvee.region : '';
  }, [villeFiltre, toutesLesVilles, normalizeStr]);

  const regionEffective = useMemo(() => {
    if (villeFiltre && regionDeduiteDeVille) {
      return regionDeduiteDeVille;
    }
    return regionFiltre || '';
  }, [villeFiltre, regionDeduiteDeVille, regionFiltre]);

  // ============================================================
  // Handlers région / ville — AVEC IDs
  // ============================================================
  const handleRegionChange = (value) => {
    setRegionFiltre(value);

    // ✅ Récupérer l'ID de la région
    const regionTrouvee = regionsAvecVilles.find((r) => r.nom === value);
    setRegionId(regionTrouvee ? regionTrouvee.id : null);

    // Reset ville si elle n'appartient plus
    if (value && villeFiltre) {
      const villeNorm = normalizeStr(villeFiltre);
      const appartient = toutesLesVilles.some(
        (v) => normalizeStr(v.ville) === villeNorm && v.region === value
      );
      if (!appartient) {
        setVilleFiltre('');
        setVilleId(null);
      }
    }

    if (!value) {
      setRegionId(null);
    }

    setCurrentPage(1);
  };

  const handleVilleChange = (value) => {
    setVilleFiltre(value);

    if (value) {
      const villeNorm = normalizeStr(value);
      const trouvee = toutesLesVilles.find(
        (v) => normalizeStr(v.ville) === villeNorm
      );
      if (trouvee) {
        setVilleId(trouvee.villeId);
        if (trouvee.region !== regionFiltre) {
          setRegionFiltre(trouvee.region);
          setRegionId(trouvee.regionId);
        } else if (!regionId) {
          setRegionId(trouvee.regionId);
        }
      }
    } else {
      setVilleId(null);
    }
    setCurrentPage(1);
  };

  // ============================================================
  // Match ville — priorité ID
  // ============================================================
  const matchVille = useCallback((usager, vId, vNom) => {
    // ✅ 1) Match par ID (le plus fiable)
    if (vId) {
      return usager.ville_id === vId;
    }

    // ⚠️ 2) Fallback texte
    if (!vNom || vNom.trim() === '') return true;
    const villeNorm = normalizeStr(vNom);
    if (!villeNorm) return true;

    const champs = [
      usager.ville_nom,
      usager.ville,
      usager.adresse_siege,
      usager.representant_adresse,
    ]
      .filter(Boolean)
      .map((c) => normalizeStr(c));

    return champs.some(
      (c) => c === villeNorm || c.includes(villeNorm) || villeNorm.includes(c)
    );
  }, [normalizeStr]);

  // ============================================================
  // Match région — priorité ID
  // ============================================================
  const matchRegion = useCallback((usager, rId, rNom) => {
    if (rId) {
      return usager.region_id === rId;
    }
    if (!rNom || rNom.trim() === '') return true;
    const regionNorm = normalizeStr(rNom);
    const uRegion = normalizeStr(usager.region_nom || usager.region);
    if (!uRegion) return true;
    return (
      uRegion === regionNorm ||
      uRegion.includes(regionNorm) ||
      regionNorm.includes(uRegion)
    );
  }, [normalizeStr]);

  // ============================================================
  // loadData — LOGIQUE IDENTIQUE À DateOcc
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      // ✅ Envoyer les IDs au serveur
      const params = new URLSearchParams();
      if (regionId) params.append('region_id', regionId);
      if (villeId) params.append('ville_id', villeId);

      const url = `${API_URL}/usagers/paiements/grand-surface${params.toString() ? '?' + params.toString() : ''}`;

      console.log('📡 API Grand Surface :', url);
      console.log('   📍 regionId :', regionId, '| villeId :', villeId);

      const paiementsResponse = await axios.get(`${API_URL}/paiements/tous`);
      const usagersResponse = await axios.get(url);

      let paiements = [];
      let usagersData = [];

      if (paiementsResponse.data.success) {
        paiements = paiementsResponse.data.paiements || [];
      }

      if (usagersResponse.data.success && usagersResponse.data.usagers) {
        usagersData = usagersResponse.data.usagers;
      } else {
        setUsagers([]);
        setFilteredUsagers([]);
        updateStats([]);
        setMontantTotalRecu(0);
        setLoading(false);
        return;
      }

      console.log('🔍 Total usagers :', usagersData.length);
      usagersData.forEach((u) => {
        console.log(`   #${u.id} | "${u.denomination}" | region_id=${u.region_id} ville_id=${u.ville_id} | region="${u.region_nom || u.region}"`);
      });

      const usagersWithYearData = usagersData.map((usager) => {
        const paiementsPourAnnee = paiements
          .filter((p) =>
            p.usager_id === usager.id &&
            p.usager_type === 'grand-surface' &&
            p.annee === anneeRecherche &&
            p.statut === 'paye'
          )
          .sort((a, b) => (a.mois || 0) - (b.mois || 0));

        const moisPayesSet = new Set();
        for (const p of paiementsPourAnnee) {
          const mois = extraireMoisPayes(p);
          for (const m of mois) {
            if (m >= 1 && m <= 12) moisPayesSet.add(m);
          }
        }
        const moisPayes = Array.from(moisPayesSet).sort((a, b) => a - b);

        return {
          ...usager,
          moisPayesAnnee: paiementsPourAnnee,
          moisPayes: moisPayes,
          totalMoisPayesAnnee: moisPayes.length,
          anneeCourante: anneeRecherche,
          montant_total_paye: calculerMontantPaye(paiementsPourAnnee),
        };
      });

      setUsagers(usagersWithYearData);

      // ============================================================
      // ✅ FILTRE FINAL CÔTÉ CLIENT (par IDs)
      // ============================================================
      let filtered = [...usagersWithYearData];

      if (villeId || villeFiltre) {
        const filteredByVille = filtered.filter((u) => matchVille(u, villeId, villeFiltre));

        if (filteredByVille.length > 0) {
          filtered = filteredByVille;
          console.log(`✅ Ville "${villeFiltre}" (id=${villeId}) → ${filtered.length} usager(s)`);
        } else if (regionId || regionEffective) {
          // ✅ Repli région
          filtered = filtered.filter((u) => matchRegion(u, regionId, regionEffective));
          console.log(`⚠️  Ville sans résultat → repli région "${regionEffective}" (id=${regionId}) → ${filtered.length} usager(s)`);
        } else {
          filtered = [];
        }
      } else if (regionId || regionEffective) {
        filtered = filtered.filter((u) => matchRegion(u, regionId, regionEffective));
        console.log(`✅ Région "${regionEffective}" (id=${regionId}) → ${filtered.length} usager(s)`);
      }

      setFilteredUsagers(filtered);
      updateStats(filtered);

      const totalRecu = filtered.reduce((sum, u) => sum + (u.montant_total_paye || 0), 0);
      setMontantTotalRecu(totalRecu);

      if (filtered.length === 0) {
        setApiError(t('Aucun usager trouvé', 'Tsy misy mpampiasa', 'No user found'));
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      setApiError(error.message || t('Erreur', 'Olana', 'Error'));
      setNotification({
        type: 'error',
        message: t('❌ Erreur', '❌ Olana', '❌ Error'),
      });
      setUsagers([]);
      setFilteredUsagers([]);
      updateStats([]);
      setMontantTotalRecu(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche, regionId, villeId, regionEffective, villeFiltre, normalizeStr, matchVille, matchRegion]);

  const updateStats = (data) => {
    setStatsGraph({
      bonPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) >= 9).length,
      payeurMoyen: data.filter((u) => (u.totalMoisPayesAnnee || 0) >= 5 && (u.totalMoisPayesAnnee || 0) <= 8).length,
      mauvaisPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) > 0 && (u.totalMoisPayesAnnee || 0) < 5).length,
      nonPayeur: data.filter((u) => (u.totalMoisPayesAnnee || 0) === 0).length,
      total: data.length,
    });
  };

  useEffect(() => {
    loadRegionsAvecVilles();
    loadAnnees();
  }, [loadRegionsAvecVilles, loadAnnees]);

  useEffect(() => {
    if (anneeRecherche) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche, regionId, villeId]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsagers = filteredUsagers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsagers.length / itemsPerPage);

  const goToPage = (page) => setCurrentPage(page);

  const handleAnneeChange = (value) => {
    setAnneeRecherche(parseInt(value));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setAnneeRecherche(new Date().getFullYear());
    setRegionFiltre('');
    setVilleFiltre('');
    setRegionId(null);
    setVilleId(null);
    setCurrentPage(1);
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

  // ============================================================
  // Message info contextuel
  // ============================================================
  const infoMessage = useMemo(() => {
    if (!villeFiltre) return null;

    const nbResultats = filteredUsagers.length;
    const villeMatche = usagers.some((u) => matchVille(u, villeId, villeFiltre));

    if (villeMatche && regionDeduiteDeVille) {
      return {
        icon: Info,
        text: t(
          `Ville "${villeFiltre}" → Région "${regionDeduiteDeVille}". ${nbResultats} usager(s) trouvé(s).`,
          `Tanàna "${villeFiltre}" → Faritra "${regionDeduiteDeVille}". ${nbResultats} mpampiasa hita.`,
          `City "${villeFiltre}" → Region "${regionDeduiteDeVille}". ${nbResultats} user(s) found.`
        ),
      };
    }

    return {
      icon: AlertCircle,
      text: t(
        `Ville "${villeFiltre}" sélectionnée. Aucun usager ne correspond exactement — affichage de la région "${regionEffective || '—'}".`,
        `Tanàna "${villeFiltre}" voafidy. Tsy misy mpampiasa mifanaraka tsara — aseho ny faritra "${regionEffective || '—'}".`,
        `City "${villeFiltre}" selected. No user matches exactly — showing region "${regionEffective || '—'}".`
      ),
    };
  }, [villeFiltre, villeId, regionDeduiteDeVille, regionEffective, filteredUsagers.length, usagers, matchVille, t]);

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
          {/* EN-TÊTE */}
          <div className="page-header">
            <div className="header-left">
              <h1>
                <Building2 className="header-icon" size={28} />
                {t('Grandes Surfaces', 'Fivarotana lehibe', 'Large Stores')} : {' '}
                <span>{t('Paiements', 'Fandoavana', 'Payments')}</span>
              </h1>
              <div className="header-stats">
                <span className="stat-badge">
                  <strong>{totalUsagers}</strong> {t('Usagers', 'Mpampiasa', 'Users')}
                </span>
                <span className="stat-badge">
                  <strong>{aJour}</strong> {t('À jour', 'Voaloa', 'Up to date')}
                </span>
                <span className="stat-badge">
                  <strong>{partiels}</strong> {t('Retard', 'Tara', 'Late')}
                </span>
                <span className="stat-badge">
                  <strong>{nonPayes}</strong> {t('Non payés', 'Tsy nandoa', 'Unpaid')}
                </span>
                <span className="stat-badge">
                  <strong>{tauxPaiement}%</strong> {t('Taux', 'Taha', 'Rate')}
                </span>
              </div>
            </div>
            <button className="btn-back" onClick={handleRetour}>
              <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
          </div>

          {/* FILTRES */}
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
                  {regionsAvecVilles && regionsAvecVilles.length > 0 ? (
                    regionsAvecVilles.map((region) => (
                      <option key={region.id} value={region.nom}>{region.nom}</option>
                    ))
                  ) : (
                    <option value="" disabled>{t('Aucune', 'Tsy misy', 'None')}</option>
                  )}
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="villeSelect">
                  <Building2 size={14} className="filter-icon" /> {t('Ville', 'Tanàna', 'City')}
                </label>
                <select
                  id="villeSelect"
                  value={villeFiltre}
                  onChange={(e) => handleVilleChange(e.target.value)}
                  className="form-select"
                  disabled={villesDisponibles.length === 0}
                >
                  <option value="">{t('Toutes', 'Rehetra', 'All')}</option>
                  {villesDisponibles.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item filter-actions">
                <label>&nbsp;</label>
                <div className="filter-buttons">
                  <button className="btn-reset" onClick={resetFilters}>
                    <RotateCcw size={16} /> {t('Réinit.', 'Averina', 'Reset')}
                  </button>
                  <button
                    className="btn-refresh"
                    onClick={refreshData}
                    title={t('Rafraîchir', 'Havaozy', 'Refresh')}
                    aria-label={t('Rafraîchir', 'Havaozy', 'Refresh')}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {infoMessage && (
              <div className="gs-info-message">
                <infoMessage.icon size={16} />
                <span>{infoMessage.text}</span>
              </div>
            )}
          </div>

          {/* INDICATEUR */}
          <div className="indicator-bar">
            <span className="indicator-item">
              <Calendar size={14} className="indicator-icon" /> {t('Année', 'Taona', 'Year')} : <strong>{anneeRecherche}</strong>
            </span>
            {regionEffective && (
              <span className="indicator-item">
                <MapPin size={14} className="indicator-icon" /> {t('Région', 'Faritra', 'Region')} : <strong>{regionEffective}</strong>
              </span>
            )}
            {villeFiltre && (
              <span className="indicator-item">
                <Building2 size={14} className="indicator-icon" /> {t('Ville', 'Tanàna', 'City')} : <strong>{villeFiltre}</strong>
              </span>
            )}
            <span className="indicator-item">
              <DollarSign size={14} className="indicator-icon" /> {t('Reçu', 'Voaray', 'Received')} : <strong>{montantTotalRecu.toLocaleString(locale)} Ar</strong>
            </span>
            <span className="indicator-item indicator-total">
              <Users size={14} className="indicator-icon" /> {t('Total', 'Totaly', 'Total')} : <strong>{totalUsagers}</strong>
            </span>
          </div>

          {/* TABLEAU */}
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>{t('Chargement…', 'Maka…', 'Loading…')}</p>
              </div>
            ) : currentUsagers.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={32} />
                <p>
                  {villeFiltre
                    ? t(
                        `Aucun usager trouvé pour la ville "${villeFiltre}"`,
                        `Tsy misy mpampiasa hita ho an'ny tanàna "${villeFiltre}"`,
                        `No user found for city "${villeFiltre}"`
                      )
                    : t('Aucun usager trouvé', 'Tsy misy mpampiasa', 'No user found')}
                </p>
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
                    minWidth: '1400px',
                    width: 'max-content',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    tableLayout: 'auto',
                  }}
                >
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
                      <th className="sticky-id" style={{ minWidth: '60px' }}>ID</th>
                      <th className="sticky-nom" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>
                        {t('Dénomination', 'Anarana', 'Name')}
                      </th>
                      <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {t('Demandeur', 'Mpangataka', 'Applicant')}
                      </th>
                      <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>
                        {t('Téléphone', 'Finday', 'Phone')}
                      </th>
                      <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>
                        {t('Région', 'Faritra', 'Region')}
                      </th>
                      <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>
                        {t('Ville', 'Tanàna', 'City')}
                      </th>
                      <th style={{ minWidth: '70px', whiteSpace: 'nowrap' }}>
                        {t('Nb mag', 'Isan', 'Stores')}
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
                      <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>
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
                            <strong>{usager.denomination || '-'}</strong>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.demandeur || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.telephone || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.region_nom || usager.region || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.ville_nom || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{usager.nombre_magasins || '-'}</td>
                          {[...Array(12)].map((_, i) => {
                            const mois = i + 1;
                            const isPaye = usager.moisPayes?.includes(mois);
                            return (
                              <td key={i} className="month-cell" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span className={`mois-badge ${isPaye ? 'paye' : 'non-paye'}`}>
                                  {isPaye ? '✓' : '○'}
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

          {/* PAGINATION */}
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

      {/* MODAL */}
      {showModal && selectedUsager && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Building2 size={18} /> {selectedUsager.denomination}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h4>
                  <Building2 size={16} /> {t('Infos', 'Fampahalalana', 'Info')}
                </h4>
                <div className="modal-row">
                  <span>ID</span>
                  <strong>#{String(selectedUsager.id).padStart(3, '0')}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Nom', 'Anarana', 'Name')}</span>
                  <strong>{selectedUsager.denomination || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Demandeur', 'Mpangataka', 'Applicant')}</span>
                  <strong>{selectedUsager.demandeur || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Adresse', 'Adiresy', 'Address')}</span>
                  <strong>{selectedUsager.adresse_siege || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Téléphone', 'Finday', 'Phone')}</span>
                  <strong>{selectedUsager.telephone || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Région', 'Faritra', 'Region')}</span>
                  <strong>{selectedUsager.region_nom || selectedUsager.region || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Ville', 'Tanàna', 'City')}</span>
                  <strong>{selectedUsager.ville_nom || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Quartier', 'Fokontany', 'Neighborhood')}</span>
                  <strong>{selectedUsager.quartier_nom || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Magasins', 'Fivarotana', 'Stores')}</span>
                  <strong>{selectedUsager.nombre_magasins || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Montant mois', 'Vola volana', 'Monthly amount')}</span>
                  <strong>{(selectedUsager.montant_mensuel || 0).toLocaleString(locale)} Ar</strong>
                </div>
              </div>
              <div className="modal-section">
                <h4>
                  <DollarSign size={16} /> {t('Paiements', 'Fandoavana', 'Payments')} - {selectedUsager.anneeCourante || anneeRecherche}
                </h4>
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

export default DateGrandSurface;