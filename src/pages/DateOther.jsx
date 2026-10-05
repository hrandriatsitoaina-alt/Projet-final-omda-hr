// src/pages/DateOther.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, ArrowLeft, Eye, X, Calendar, MapPin, Phone, Mail,
  FileText, DollarSign, Plus, RefreshCw, AlertCircle,
  Disc, Music, Globe, Sparkles, Video, Users, Repeat,
  CalendarCheck, FileCheck, RotateCcw, TrendingUp, Building2, Info,
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
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [paiementsRaw, setPaiementsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterMode, setFilterMode] = useState('tous');

  const [anneeRecherche, setAnneeRecherche] = useState(new Date().getFullYear());
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  const [regionFiltre, setRegionFiltre] = useState('');
  const [villeFiltre, setVilleFiltre] = useState('');
  const [regionId, setRegionId] = useState(null);
  const [villeId, setVilleId] = useState(null);
  const [regionsAvecVilles, setRegionsAvecVilles] = useState([]);

  const [notification, setNotification] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [montantTotalRecu, setMontantTotalRecu] = useState(0);

  // ============================================================
  // HELPERS
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

  // ✅ Extraire les mois d'un paiement
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

  // ✅ Calcul du montant payé
  const calculerMontantPaye = useCallback((paiements) => {
    if (!paiements || paiements.length === 0) return 0;
    let total = 0;
    for (const p of paiements) {
      total += toNumber(p.montant) + toNumber(p.frais_dossier) + toNumber(p.montant_retard);
    }
    return total;
  }, []);

  // ============================================================
  // API : régions AVEC villes
  // ============================================================
  const loadRegionsAvecVilles = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/regions/avec-villes`);
      if (response.data.success && Array.isArray(response.data.regions)) {
        setRegionsAvecVilles(response.data.regions);
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

  // ✅ Charger les années disponibles
  const loadAnnees = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/annees-disponibles/other`);
      if (response.data.success) {
        const annees = response.data.annees || [];
        setAnneesDisponibles(annees.length > 0 ? annees : [new Date().getFullYear()]);
        if (annees.length > 0 && !annees.includes(new Date().getFullYear())) {
          setAnneeRecherche(annees[annees.length - 1]);
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
  // Handlers région / ville
  // ============================================================
  const handleRegionChange = (value) => {
    setRegionFiltre(value);
    const regionTrouvee = regionsAvecVilles.find((r) => r.nom === value);
    setRegionId(regionTrouvee ? regionTrouvee.id : null);

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
    if (!value) setRegionId(null);
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

  const matchVille = useCallback((usager, vId, vNom) => {
    if (vId) return usager.ville_id === vId;
    if (!vNom || vNom.trim() === '') return true;
    const villeNorm = normalizeStr(vNom);
    if (!villeNorm) return true;
    const champs = [usager.ville_nom, usager.ville, usager.adresse]
      .filter(Boolean)
      .map((c) => normalizeStr(c));
    return champs.some(
      (c) => c === villeNorm || c.includes(villeNorm) || villeNorm.includes(c)
    );
  }, [normalizeStr]);

  const matchRegion = useCallback((usager, rId, rNom) => {
    if (rId) return usager.region_id === rId;
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
  // ✅ loadData — Charge usagers + paiements + calcule moisPayes PAR ANNÉE
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

      if (!usagersRes.data.success) {
        setUsagers([]);
        setFilteredUsagers([]);
        setPaiementsRaw([]);
        setMontantTotalRecu(0);
        setApiError(tRef.current(
          'Aucun usager événementiel trouvé',
          'Tsy misy mpampiasa hetsika hita',
          'No event user found'
        ));
        return;
      }

      const usagersData = usagersRes.data.usagers || [];
      setPaiementsRaw(paiements);

      const usagersWithYearData = usagersData.map((usager) => {
        const lignes = usager.lignes || [];
        const totalLignes = lignes.reduce(
          (acc, l) => acc + (parseFloat(l.montant) || 0),
          0
        );
        const paiement = usager.paiement || {};
        const total = parseFloat(paiement.montant) || totalLignes;

        // ⭐ Filtrer les paiements par année
        const paiementsPourAnnee = paiements
          .filter((p) =>
            p.usager_id === usager.id &&
            (p.usager_type === 'other' || p.usager_type === 'autre') &&
            p.annee === anneeRecherche &&
            p.statut === 'paye'
          )
          .sort((a, b) => (a.mois || 0) - (b.mois || 0));

        // ⭐ Extraire les mois payés
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
          lignes: lignes,
          montant_total: total,
          mode_paiement: usager.mode_paiement || 'unique',
          moisPayesAnnee: paiementsPourAnnee,
          moisPayes: moisPayes,
          totalMoisPayesAnnee: moisPayes.length,
          anneeCourante: anneeRecherche,
          montant_total_paye: calculerMontantPaye(paiementsPourAnnee),
        };
      });

      setUsagers(usagersWithYearData);

      // Filtrage région/ville
      let filtered = [...usagersWithYearData];

      if (villeId || villeFiltre) {
        const filteredByVille = filtered.filter((u) => matchVille(u, villeId, villeFiltre));
        if (filteredByVille.length > 0) {
          filtered = filteredByVille;
        } else if (regionId || regionEffective) {
          filtered = filtered.filter((u) => matchRegion(u, regionId, regionEffective));
        } else {
          filtered = [];
        }
      } else if (regionId || regionEffective) {
        filtered = filtered.filter((u) => matchRegion(u, regionId, regionEffective));
      }

      setFilteredUsagers(filtered);

      const totalRecu = filtered.reduce((sum, u) => sum + (u.montant_total_paye || 0), 0);
      setMontantTotalRecu(totalRecu);

    } catch (error) {
      console.error('❌ Erreur chargement other-usagers:', error);
      setApiError(error.message || tRef.current('Erreur de chargement', 'Nisy olana', 'Loading error'));
      setNotification({
        type: 'error',
        message: `❌ ${tRef.current('Erreur de chargement', 'Nisy olana', 'Error')}`,
      });
      setUsagers([]);
      setFilteredUsagers([]);
      setMontantTotalRecu(0);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche, regionId, villeId, regionEffective, villeFiltre, matchVille, matchRegion, extraireMoisPayes, calculerMontantPaye]);

  useEffect(() => {
    loadRegionsAvecVilles();
    loadAnnees();
  }, [loadRegionsAvecVilles, loadAnnees]);

  useEffect(() => {
    if (anneeRecherche) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche, regionId, villeId]);

  useEffect(() => {
    const handleFocus = () => {
      if (anneeRecherche) loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeRecherche]);

  // ============================================================
  // PAGINATION
  // ============================================================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const goToPage = (page) => setCurrentPage(page);

  // ============================================================
  // HANDLERS FILTRES
  // ============================================================
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

  const handleAnneeChange = (value) => {
    setAnneeRecherche(parseInt(value));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('tous');
    setFilterMode('tous');
    setRegionFiltre('');
    setVilleFiltre('');
    setRegionId(null);
    setVilleId(null);
    setAnneeRecherche(new Date().getFullYear());
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

  const handleRetour = () => navigate('/autre-usager');
  const handleAjouter = () => navigate('/other-ajout');

  // ============================================================
  // FILTRAGE FINAL (search, type, mode)
  // ============================================================
  const usagersFiltresFinal = useMemo(() => {
    let filtered = [...filteredUsagers];

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
  }, [filteredUsagers, searchTerm, filterType, filterMode]);

  const currentUsagersFinal = usagersFiltresFinal.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesFinal = Math.ceil(usagersFiltresFinal.length / itemsPerPage);

  // ============================================================
  // STATS
  // ============================================================
  const totalUsagers = usagersFiltresFinal.length;
  const mensuels = usagersFiltresFinal.filter((u) => u.mode_paiement === 'mensuel').length;
  const uniques = usagersFiltresFinal.filter((u) => u.mode_paiement === 'unique').length;
  const nonPayes = usagersFiltresFinal.filter((u) => (u.totalMoisPayesAnnee || 0) === 0).length;
  const partiels = usagersFiltresFinal.filter((u) => (u.totalMoisPayesAnnee || 0) > 0 && (u.totalMoisPayesAnnee || 0) < 12).length;
  const aJour = usagersFiltresFinal.filter((u) => (u.totalMoisPayesAnnee || 0) === 12).length;
  const tauxPaiement = totalUsagers > 0 ? Math.round(((totalUsagers - nonPayes) / totalUsagers) * 100) : 0;

  // ============================================================
  // MESSAGE INFO
  // ============================================================
  const infoMessage = useMemo(() => {
    if (!villeFiltre) return null;
    const nbResultats = usagersFiltresFinal.length;
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
        `Tanàna "${villeFiltre}" voafidy. Tsy misy mpampiasa mifanaraka — aseho ny faritra "${regionEffective || '—'}".`,
        `City "${villeFiltre}" selected. No user matches exactly — showing region "${regionEffective || '—'}".`
      ),
    };
  }, [villeFiltre, villeId, regionDeduiteDeVille, regionEffective, usagersFiltresFinal.length, usagers, matchVille, t]);

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
                {t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')} : <span>{t('Suivi des paiements', 'Fanaraha-maso ny fandoavana', 'Payment tracking')}</span>
              </h1>
              <div className="header-stats">
                <span className="stat-badge">
                  <strong>{totalUsagers}</strong> {t('Total', 'Totaly', 'Total')}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-back" onClick={handleAjouter}>
                <Plus size={18} /> {t('Ajouter', 'Hanampy', 'Add')}
              </button>
              <button className="btn-back" onClick={handleRetour}>
                <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
              </button>
            </div>
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

              <div className="filter-item" style={{ flex: '1 1 200px' }}>
                <label htmlFor="search">
                  <Users size={14} className="filter-icon" /> {t('Rechercher', 'Hikaroka', 'Search')}
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t('Nom, téléphone, email...', 'Anarana, finday, mailaka...', 'Name, phone, email...')}
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
                  <option value="tous">{t('Tous', 'Rehetra', 'All')}</option>
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
                  <DollarSign size={14} className="filter-icon" /> {t('Mode', 'Fomba', 'Mode')}
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

              <div className="filter-item">
                <label htmlFor="regionFilter">
                  <MapPin size={14} className="filter-icon" /> {t('Région', 'Faritra', 'Region')}
                </label>
                <select
                  id="regionFilter"
                  value={regionFiltre}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">{t('Toutes', 'Rehetra', 'All')}</option>
                  {regionsAvecVilles.map((region) => (
                    <option key={region.id} value={region.nom}>{region.nom}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="villeFilter">
                  <Building2 size={14} className="filter-icon" /> {t('Ville', 'Tanàna', 'City')}
                </label>
                <select
                  id="villeFilter"
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

          {/* ===== INDICATEUR ===== */}
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
              <Users size={14} className="indicator-icon" /> {t('Total', 'Totaly', 'Total')} : <strong>{totalUsagers}</strong>
            </span>
            <span className="indicator-item">
              <Repeat size={14} className="indicator-icon" /> {t('Mensuel', 'Isam-bolana', 'Monthly')} : <strong>{mensuels}</strong>
            </span>
            <span className="indicator-item">
              <CalendarCheck size={14} className="indicator-icon" /> {t('Unique', 'Indray mandeha', 'One-time')} : <strong>{uniques}</strong>
            </span>
            <span className="indicator-item">
              <DollarSign size={14} className="indicator-icon" /> {t('Total reçu', 'Totaly voaray', 'Total received')} : <strong>{montantTotalRecu.toLocaleString(locale)} Ar</strong>
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
            ) : currentUsagersFinal.length === 0 ? (
              <div className="empty-state">
                <Package size={48} color="#94a3b8" />
                <p>
                  {villeFiltre
                    ? t(`Aucun usager trouvé pour "${villeFiltre}"`, `Tsy misy mpampiasa hita ho "${villeFiltre}"`, `No user found for "${villeFiltre}"`)
                    : t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found')}
                </p>
                <button className="btn-retry" onClick={handleAjouter}>
                  <Plus size={16} /> {t('Ajouter un usager', 'Hanampy mpampiasa', 'Add user')}
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
                      <th className="sticky-id" style={{ minWidth: '60px' }}>ID</th>
                      <th className="sticky-nom" style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>
                        {t('Dénomination', 'Anarana', 'Name')}
                      </th>
                      <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {t('Type', 'Karazana', 'Type')}
                      </th>
                      <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        {t('Représentant', 'Mpisolo tena', 'Rep')}
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
                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>
                        {t('Mode', 'Fomba', 'Mode')}
                      </th>

                      {/* ⭐ 12 COLONNES MOIS — UNIQUEMENT POUR MENSUEL */}
                      {/* Pour UNIQUE, on affiche 1 seule colonne "Paiement" */}
                      {(() => {
                        const hasUnique = currentUsagersFinal.some(u => u.mode_paiement === 'unique');
                        const hasMensuel = currentUsagersFinal.some(u => u.mode_paiement === 'mensuel');

                        // Si mélange → afficher les 12 mois + UNE colonne "Unique"
                        if (hasUnique && hasMensuel) {
                          return (
                            <>
                              {/* Colonne "Paiement unique" */}
                              <th
                                style={{
                                  minWidth: '100px',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  background: '#f0fdf4',
                                  color: '#166534',
                                }}
                              >
                                {t('Unique', 'Indray', 'One-time')}
                              </th>
                              {/* 12 colonnes mois (pour les mensuels) */}
                              {[...Array(12)].map((_, i) => (
                                <th
                                  key={i}
                                  className="month-col"
                                  style={{ minWidth: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}
                                >
                                  {String(i + 1).padStart(2, '0')}
                                </th>
                              ))}
                            </>
                          );
                        }

                        // Si QUE des mensuels → afficher 12 colonnes mois
                        if (hasMensuel && !hasUnique) {
                          return [...Array(12)].map((_, i) => (
                            <th
                              key={i}
                              className="month-col"
                              style={{ minWidth: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </th>
                          ));
                        }

                        // Si QUE des uniques → 1 seule colonne "Paiement"
                        if (hasUnique && !hasMensuel) {
                          return (
                            <th
                              style={{
                                minWidth: '120px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                background: '#f0fdf4',
                                color: '#166534',
                              }}
                            >
                              {t('Paiement', 'Fandoavana', 'Payment')}
                            </th>
                          );
                        }

                        // Aucun → 12 colonnes par défaut
                        return [...Array(12)].map((_, i) => (
                          <th
                            key={i}
                            className="month-col"
                            style={{ minWidth: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </th>
                        ));
                      })()}

                      <th style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>
                        {t('Total mois', 'Totaly volana', 'Total months')}
                      </th>
                      <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>
                        {t('Payé (Ar)', 'Voaloa (Ar)', 'Paid (Ar)')}
                      </th>
                      <th style={{ minWidth: '70px', whiteSpace: 'nowrap' }}>
                        {t('Action', 'Hetsika', 'Action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsagersFinal.map((usager) => {
                      const TypeIcon = TYPE_ICONS[usager.type_usager] || Package;
                      const typeLabel = TYPE_LABELS[usager.type_usager] || usager.type_usager;
                      const isUnique = usager.mode_paiement === 'unique';
                      const totalPayes = usager.totalMoisPayesAnnee || 0;
                      const totalPayeAr = usager.montant_total_paye || 0;
                      const hasUnique = currentUsagersFinal.some(u => u.mode_paiement === 'unique');
                      const hasMensuel = currentUsagersFinal.some(u => u.mode_paiement === 'mensuel');

                      return (
                        <tr key={usager.id}>
                          <td className="sticky-id" style={{ whiteSpace: 'nowrap' }}>
                            #{String(usager.id).padStart(3, '0')}
                          </td>
                          <td className="sticky-nom" style={{ whiteSpace: 'nowrap' }}>
                            <strong>{usager.denomination || t('Sans nom', 'Tsy misy', 'No name')}</strong>
                            {usager.nom && (
                              <div style={{ fontSize: '0.75em', color: '#666' }}>
                                {usager.nom} {usager.prenom || ''}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
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
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.representant_par || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatPhoneNumber(usager.telephone)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.region_nom || usager.region || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{usager.ville_nom || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
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
                                <><CalendarCheck size={12} /> {t('Unique', 'Indray', 'One-time')}</>
                              ) : (
                                <><Repeat size={12} /> {t('Mensuel', 'Isam-bolana', 'Monthly')}</>
                              )}
                            </span>
                          </td>

                          {/* ⭐ LOGIQUE D'AFFICHAGE PAR MODE */}
                          {/* CAS MÉLANGE : colonne Unique + 12 mois */}
                          {hasUnique && hasMensuel && (
                            <>
                              {/* Colonne Unique (uniquement pour les usagers uniques) */}
                              <td
                                style={{
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  background: isUnique ? '#f0fdf4' : 'transparent',
                                }}
                              >
                                {isUnique ? (
                                  <span className="paiement-unique-badge">
                                    ✓ {t('Payé', 'Voaloa', 'Paid')}
                                  </span>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                              {/* 12 cellules mois (uniquement pour les mensuels) */}
                              {[...Array(12)].map((_, i) => {
                                const mois = i + 1;
                                const isPaye = !isUnique && usager.moisPayes?.includes(mois);
                                return (
                                  <td
                                    key={i}
                                    className="month-cell"
                                    style={{ textAlign: 'center', whiteSpace: 'nowrap' }}
                                  >
                                    {isUnique ? (
                                      <span style={{ color: '#cbd5e1' }}>—</span>
                                    ) : (
                                      <span className={`mois-badge ${isPaye ? 'paye' : 'non-paye'}`}>
                                        {isPaye ? '✓' : '○'}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </>
                          )}

                          {/* CAS QUE MENSUEL : 12 mois */}
                          {hasMensuel && !hasUnique && (
                            [...Array(12)].map((_, i) => {
                              const mois = i + 1;
                              const isPaye = usager.moisPayes?.includes(mois);
                              return (
                                <td
                                  key={i}
                                  className="month-cell"
                                  style={{ textAlign: 'center', whiteSpace: 'nowrap' }}
                                >
                                  <span className={`mois-badge ${isPaye ? 'paye' : 'non-paye'}`}>
                                    {isPaye ? '✓' : '○'}
                                  </span>
                                </td>
                              );
                            })
                          )}

                          {/* CAS QUE UNIQUE : 1 seule colonne */}
                          {hasUnique && !hasMensuel && (
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', background: '#f0fdf4' }}>
                              {isUnique ? (
                                <span className="paiement-unique-badge">
                                  ✓ {t('Payé', 'Voaloa', 'Paid')}
                                </span>
                              ) : (
                                <span className={`mois-badge ${usager.moisPayes?.length > 0 ? 'paye' : 'non-paye'}`}>
                                  {usager.moisPayes?.length > 0 ? '✓' : '○'}
                                </span>
                              )}
                            </td>
                          )}

                          {/* CAS AUCUN : fallback 12 mois */}
                          {!hasUnique && !hasMensuel && (
                            [...Array(12)].map((_, i) => {
                              const mois = i + 1;
                              const isPaye = usager.moisPayes?.includes(mois);
                              return (
                                <td
                                  key={i}
                                  className="month-cell"
                                  style={{ textAlign: 'center', whiteSpace: 'nowrap' }}
                                >
                                  <span className={`mois-badge ${isPaye ? 'paye' : 'non-paye'}`}>
                                    {isPaye ? '✓' : '○'}
                                  </span>
                                </td>
                              );
                            })
                          )}

                          <td className="total-cell" style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {isUnique ? (
                              <span style={{ color: '#166534', fontWeight: 700 }}>
                                {t('Unique', 'Indray', 'One-time')}
                              </span>
                            ) : (
                              <strong>{totalPayes}/12</strong>
                            )}
                          </td>
                          <td className="paye-cell" style={{ whiteSpace: 'nowrap' }}>
                            {totalPayeAr.toLocaleString(locale)} Ar
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
          {usagersFiltresFinal.length > 0 && (
            <div className="pagination-container">
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ◀
                </button>
                {[...Array(totalPagesFinal)].map((_, i) => (
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
                  disabled={currentPage === totalPagesFinal}
                >
                  ▶
                </button>
              </div>
              <div className="pagination-info">
                {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, usagersFiltresFinal.length)} {t('sur', 'amin\'ny', 'of')} {usagersFiltresFinal.length}
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
                <h4><Users size={16} /> {t('Informations', 'Fampahalalana', 'Information')}</h4>
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
                  <strong>{selectedUsager.nom || '-'} {selectedUsager.prenom || ''}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Type', 'Karazana', 'Type')}</span>
                  <strong>{TYPE_LABELS[selectedUsager.type_usager] || selectedUsager.type_usager}</strong>
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
                  <strong>{selectedUsager.region_nom || selectedUsager.region || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Ville', 'Tanàna', 'City')}</span>
                  <strong>{selectedUsager.ville_nom || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Adresse', 'Adiresy', 'Address')}</span>
                  <strong>{selectedUsager.adresse || '-'}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h4><Users size={16} /> {t('Représentant', 'Mpisolo tena', 'Representative')}</h4>
                <div className="modal-row">
                  <span>{t('Représenté par', 'Solontenan\'ny', 'Represented by')}</span>
                  <strong>{selectedUsager.representant_par || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>CIN</span>
                  <strong>{selectedUsager.representant_cin || '-'}</strong>
                </div>
                <div className="modal-row">
                  <span>{t('Lieu de délivrance', 'Toerana', 'Place of issue')}</span>
                  <strong>{selectedUsager.representant_cin_lieu || '-'}</strong>
                </div>
              </div>

              {selectedUsager.lignes && selectedUsager.lignes.length > 0 && (
                <div className="modal-section">
                  <h4><FileText size={16} /> {t('Détail de la facture', 'Antsipirian\'ny faktiora', 'Invoice details')}</h4>
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
                  <DollarSign size={16} /> {t('Paiements', 'Fandoavana', 'Payments')} — {selectedUsager.anneeCourante || anneeRecherche}
                </h4>
                <div className="modal-row">
                  <span>{t('Mode paiement', 'Fomba fandoavana', 'Payment mode')}</span>
                  <strong>
                    {selectedUsager.mode_paiement === 'unique'
                      ? t('Paiement unique', 'Fandoavana indray mandeha', 'One-time payment')
                      : t('Paiement mensuel', 'Fandoavana isam-bolana', 'Monthly payment')}
                  </strong>
                </div>
                {selectedUsager.mode_paiement === 'mensuel' && (
                  <div className="modal-row">
                    <span>{t('Mois payés', 'Volana voaloa', 'Months paid')}</span>
                    <strong>{selectedUsager.totalMoisPayesAnnee || 0}/12</strong>
                  </div>
                )}
                <div className="modal-row">
                  <span>{t('Détails', 'Antsipiriany', 'Details')}</span>
                  <strong>
                    {selectedUsager.moisPayes && selectedUsager.moisPayes.length > 0
                      ? selectedUsager.moisPayes.map((m) => moisLabelsShort[m - 1]).join(', ')
                      : (selectedUsager.mode_paiement === 'unique' ? t('Paiement unique', 'Indray mandeha', 'One-time') : t('Aucun', 'Tsy misy', 'None'))}
                  </strong>
                </div>
                <div className="modal-row">
                  <span>{t('Total payé', 'Vola voaloa', 'Total paid')}</span>
                  <strong style={{ color: '#28a745' }}>
                    {(selectedUsager.montant_total_paye || 0).toLocaleString(locale)} Ar
                  </strong>
                </div>
              </div>

              {selectedUsager.personne_recu && (
                <div className="modal-section">
                  <h4><CalendarCheck size={16} /> {t('Réception', 'Fandraisana', 'Reception')}</h4>
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