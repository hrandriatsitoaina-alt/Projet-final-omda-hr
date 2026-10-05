// src/pages/PaiementChoix.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Lock, ArrowLeft, MapPin, Building2, Users,
  Coins, TrendingUp, DollarSign, Calendar, CalendarDays,
  Hotel, Store, Tv, Bus, Music, Package, RefreshCw,
  Eye, EyeOff, Mail, ShieldCheck, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import '../styles/gestionPaiement.css';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';

/* ============================================================
   HELPERS — alignés sur la structure réelle de la table paiements
   ============================================================ */

// /api/usagers renvoie des libellés ("Hôtel", "Télé/Radio", "Autre"...)
// alors que la table paiements utilise des ids ("hotel", "media", "other"...).
const TYPE_LABEL_TO_ID = {
  'hôtel': 'hotel', 'hotel': 'hotel',
  'grand surface': 'grand-surface', 'grand-surface': 'grand-surface', 'magasin': 'grand-surface',
  'télé/radio': 'media', 'tele/radio': 'media', 'media': 'media', 'média': 'media',
  'occ': 'occ', 'occasionnel': 'occ',
  'bus': 'bus',
  'night club': 'nightclub', 'nightclub': 'nightclub',
  'autre': 'other', 'other': 'other',
};

const normalizeTypeId = (raw) =>
  TYPE_LABEL_TO_ID[String(raw ?? '').trim().toLowerCase()] || null;

const cleanRegion = (r) => {
  const v = r === null || r === undefined ? '' : String(r).trim();
  return v.toUpperCase() === 'N/A' ? '' : v;
};
const regionKey = (r) => cleanRegion(r).toLowerCase();

const getMontantReel = (p) => parseFloat(p.montant) || 0;

const getAnnee = (p) => {
  if (p.annee !== null && p.annee !== undefined && p.annee !== '') return parseInt(p.annee, 10);
  const d = p.date_paiement ? new Date(p.date_paiement) : null;
  return d && !isNaN(d.getTime()) ? d.getFullYear() : null;
};

const getMois = (p) => {
  if (p.mois !== null && p.mois !== undefined && p.mois !== '') return parseInt(p.mois, 10);
  const d = p.date_paiement ? new Date(p.date_paiement) : null;
  return d && !isNaN(d.getTime()) ? d.getMonth() + 1 : null;
};

// Un paiement mensuel = UNE ligne pour plusieurs mois (mois_payes = [1,2,3]).
const getMoisPayes = (p) => {
  let raw = p.mois_payes;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((m) => parseInt(m, 10)).filter((m) => m >= 1 && m <= 12))];
};

/**
 * Part du paiement qui tombe dans la période choisie.
 * - Aucun filtre mois : montant complet (= ce qui est en base)
 * - Filtre mois sur un paiement multi-mois : montant / nombre de mois payés,
 *   uniquement si le mois demandé fait partie de mois_payes
 * - Paiement unique (OCC, Autre) : rattaché à son propre mois / année
 */
const getPartPaiement = (p, anneeCible, moisCible) => {
  const montant = getMontantReel(p);

  if (anneeCible !== 'tous') {
    const a = getAnnee(p);
    if (a !== null && a !== parseInt(anneeCible, 10)) return 0;
  }

  if (moisCible === 'tous') return montant;
  const m = parseInt(moisCible, 10);

  if (p.type_paiement === 'unique') {
    const pm = getMois(p);
    return pm === null || pm === m ? montant : 0;
  }

  const liste = getMoisPayes(p);
  if (liste.length === 0) {
    const pm = getMois(p);
    return pm === null || pm === m ? montant : 0;
  }
  return liste.includes(m) ? montant / liste.length : 0;
};

const calcTaux = (payes, total) =>
  total > 0 ? Math.min(100, Math.round((payes / total) * 100)) : 0;

const calcPart = (valeur, base) =>
  base > 0 ? Math.round((valeur / base) * 1000) / 10 : 0; // 1 décimale

/* ============================================================
   COMPOSANT
   ============================================================ */
const PaiementChoix = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const fmt = useCallback((n) => Math.round(n || 0).toLocaleString(locale), [locale]);

  const [statsGlobal, setStatsGlobal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [paymentSession, setPaymentSession] = useState(null);
  const [checkingPaymentSession, setCheckingPaymentSession] = useState(true);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminStep, setAdminStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminVerifiedUser, setAdminVerifiedUser] = useState(null);
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [verifyProgress, setVerifyProgress] = useState(0);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const [regions, setRegions] = useState([]);
  const [usagersList, setUsagersList] = useState([]);
  const [paiementsBruts, setPaiementsBruts] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState('tous');
  const [selectedUsagerType, setSelectedUsagerType] = useState('tous');
  const [selectedMonth, setSelectedMonth] = useState('tous');
  // 'tous' par défaut => le total affiché correspond au total réel en base
  const [selectedYear, setSelectedYear] = useState('tous');

  const usagerTypes = useMemo(() => [
    { id: 'hotel',         label: t('Hôtel', 'Hotely', 'Hotel') },
    { id: 'grand-surface', label: t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface') },
    { id: 'media',         label: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio') },
    { id: 'occ',           label: t('OCC', 'OCC', 'OCC') },
    { id: 'bus',           label: t('Bus', 'Fiara fitateram-bahoaka', 'Bus') },
    { id: 'nightclub',     label: t('Night club', 'Club alina', 'Night club') },
    { id: 'other',         label: t('Autre usager', 'Mpampiasa hafa', 'Other user') },
  ], [t]);

  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 'hotel': return Hotel;
      case 'grand-surface': return Store;
      case 'media': return Tv;
      case 'occ': return Calendar;
      case 'bus': return Bus;
      case 'nightclub': return Music;
      default: return Package;
    }
  };

  const monthNames = useMemo(() => {
    if (langue === 'en') {
      return ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];
    }
    if (langue === 'mg') {
      return ['Janoary', 'Febroary', 'Martsa', 'Aprily', 'Mey', 'Jona',
              'Jolay', 'Aogositra', 'Septambra', 'Oktobra', 'Novambra', 'Desambra'];
    }
    return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  }, [langue]);

  const getRoleLabelForButton = useCallback((role) => {
    if (role === 'super_admin') return t('Super Admin', 'Super Admin', 'Super Admin');
    if (role === 'daf') return 'DAF';
    if (role === 'admin') return t('Admin', 'Admin', 'Admin');
    return t('Utilisateur', 'Mpampiasa', 'User');
  }, [t]);

  /* ---------------- Session admin ---------------- */
  useEffect(() => {
    let cancelled = false;

    const clearAdminStorage = () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminName');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('adminAccessRole');
    };

    const checkExistingSession = async () => {
      const existingToken = localStorage.getItem('adminToken');
      if (!existingToken) {
        if (!cancelled) setCheckingPaymentSession(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/admin/session`, {
          headers: { admintoken: existingToken },
          params: { scope: 'payment' },
        });
        if (cancelled) return;

        if (res.data.success && res.data.user && res.data.user.id) {
          const freshUser = {
            id: res.data.user.id,
            nom: res.data.user.nom,
            email: res.data.user.email,
            role: res.data.user.role,
          };
          setPaymentSession({ token: existingToken, user: freshUser });
          localStorage.setItem('adminUser', JSON.stringify(freshUser));
          localStorage.setItem('adminName', freshUser.nom);
          localStorage.setItem('adminEmail', freshUser.email);
          localStorage.setItem('adminRole', freshUser.role);
          localStorage.setItem('adminAccessRole', freshUser.role);
        } else {
          clearAdminStorage();
          setPaymentSession(null);
        }
      } catch (e) {
        if (cancelled) return;
        clearAdminStorage();
        setPaymentSession(null);
      } finally {
        if (!cancelled) setCheckingPaymentSession(false);
      }
    };
    checkExistingSession();

    return () => { cancelled = true; };
  }, []);

  /* ---------------- Chargement des données ---------------- */
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showAdminModal && adminStep === 1) {
      const id = setTimeout(() => emailInputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
    if (showAdminModal && adminStep === 2) {
      const id = setTimeout(() => passwordInputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [showAdminModal, adminStep]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchStats(),
        fetchRegions(),
        fetchUsagers(),
        fetchAvailableYears(),
        fetchPaiements(),
      ]);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  // Non bloquant : sert uniquement à contrôler l'écart avec la base
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/stats`);
      if (response.data.success) setStatsGlobal(response.data.global || null);
    } catch (err) {
      console.error('❌ Erreur fetchStats:', err);
      setStatsGlobal(null);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await axios.get(`${API_URL}/regions`);
      if (response.data.success) setRegions(response.data.regions || []);
    } catch (err) {
      console.error('❌ Erreur chargement régions:', err);
    }
  };

  const fetchUsagers = async () => {
    try {
      const response = await axios.get(`${API_URL}/usagers`);
      let usagers = [];
      if (Array.isArray(response.data)) usagers = response.data;
      else if (Array.isArray(response.data?.usagers)) usagers = response.data.usagers;
      else if (Array.isArray(response.data?.data)) usagers = response.data.data;

      // ✅ FIX : "Hôtel" -> "hotel", "Télé/Radio" -> "media", "Autre" -> "other"...
      const normalized = usagers
        .map((u) => ({
          id: u.id,
          type_usager: normalizeTypeId(u.type_usager || u.type),
          region: cleanRegion(u.region),
          denomination: u.denomination || u.nom || '',
        }))
        .filter((u) => u.type_usager !== null);

      setUsagersList(normalized);
    } catch (err) {
      console.error('❌ Erreur chargement usagers:', err);
      setUsagersList([]);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/annees-disponibles/tous`);
      if (response.data.success && response.data.annees.length > 0) {
        setAvailableYears(response.data.annees);
        return;
      }
    } catch (err) {
      console.error('❌ Erreur années disponibles:', err);
    }
    const y = new Date().getFullYear();
    setAvailableYears([y - 2, y - 1, y, y + 1]);
  };

  const fetchPaiements = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/tous`);
      if (response.data.success) {
        setPaiementsBruts(response.data.paiements || []);
      } else {
        throw new Error('Réponse invalide');
      }
    } catch (err) {
      console.error('❌ Erreur chargement paiements:', err);
      setPaiementsBruts([]);
      setError(t(
        'Erreur lors du chargement des paiements',
        'Nisy olana tamin\'ny fakana ny fandoavana',
        'Error loading payments'
      ));
    }
  };

  /* ============================================================
     ANALYSE — tout est dérivé de (paiements, usagers, filtres)
     Type + Région + Mois + Année pilotent cartes, tableau, graphe
     ============================================================ */
  const analyse = useMemo(() => {
    const idsConnus = new Set(usagerTypes.map((x) => x.id));
    const rKey = regionKey(selectedRegion);

    // 1) Paiements "payé" dans la période et la région (SANS filtre de type)
    const payesBase = [];
    for (const p of paiementsBruts) {
      if (p.statut !== 'paye') continue;
      if (!idsConnus.has(p.usager_type)) continue;
      if (selectedRegion !== 'tous' && regionKey(p.region) !== rKey) continue;
      const part = getPartPaiement(p, selectedYear, selectedMonth);
      if (part <= 0) continue;
      payesBase.push({ ...p, part });
    }

    // 2) Usagers de la région (SANS filtre de type)
    const usagersBase = usagersList.filter(
      (u) => selectedRegion === 'tous' || regionKey(u.region) === rKey
    );

    // 3) Détail par type (sert au tableau et au graphe)
    const parType = usagerTypes.map((type) => {
      const pt = payesBase.filter((p) => p.usager_type === type.id);
      const montant = pt.reduce((s, p) => s + p.part, 0);
      const payes = new Set(pt.map((p) => p.usager_id)).size;
      const total = usagersBase.filter((u) => u.type_usager === type.id).length;
      return {
        id: type.id,
        label: type.label,
        total,
        payes,
        taux: calcTaux(payes, total),
        montant,
      };
    });

    // Dénominateur du graphe : total de la région/période, tous types confondus
    const montantBase = parType.reduce((s, x) => s + x.montant, 0);

    // 4) Lignes visibles selon le filtre de type
    const visibles = selectedUsagerType === 'tous'
      ? parType
      : parType.filter((x) => x.id === selectedUsagerType);

    const totaux = visibles.reduce(
      (acc, x) => ({
        total: acc.total + x.total,
        payes: acc.payes + x.payes,
        montant: acc.montant + x.montant,
      }),
      { total: 0, payes: 0, montant: 0 }
    );
    totaux.taux = calcTaux(totaux.payes, totaux.total);

    // 5) Cartes région (type + période appliqués)
    const paiementsVisibles = payesBase.filter(
      (p) => selectedUsagerType === 'tous' || p.usager_type === selectedUsagerType
    );
    const usagersVisibles = usagersBase.filter(
      (u) => selectedUsagerType === 'tous' || u.type_usager === selectedUsagerType
    );

    const regionsMap = new Map();
    const ensure = (nom) => {
      const key = regionKey(nom);
      if (!regionsMap.has(key)) {
        regionsMap.set(key, {
          key,
          nom: cleanRegion(nom) || t('Non spécifiée', 'Tsy voafaritra', 'Not specified'),
          listed: false,
          montant: 0,
          payesSet: new Set(),
          usagers: 0,
        });
      }
      return regionsMap.get(key);
    };

    for (const r of regions) ensure(r.nom).listed = true;
    for (const p of paiementsVisibles) {
      const r = ensure(p.region);
      r.montant += p.part;
      r.payesSet.add(`${p.usager_type}-${p.usager_id}`);
    }
    for (const u of usagersVisibles) ensure(u.region).usagers += 1;

    let regionCards = [...regionsMap.values()]
      .filter((r) => r.listed || r.montant > 0 || r.usagers > 0)
      .filter((r) => selectedRegion === 'tous' || r.key === rKey)
      .map((r) => ({
        key: r.key,
        nom: r.nom,
        montant: r.montant,
        usagers: r.usagers,
        payes: r.payesSet.size,
        taux: calcTaux(r.payesSet.size, r.usagers),
        part: calcPart(r.montant, totaux.montant),
      }))
      .sort((a, b) => b.montant - a.montant);

    return { parType, visibles, montantBase, totaux, regionCards };
  }, [
    paiementsBruts, usagersList, regions, usagerTypes,
    selectedRegion, selectedUsagerType, selectedMonth, selectedYear, t,
  ]);

  const { visibles, montantBase, totaux, regionCards } = analyse;

  const filterContext = useMemo(() => {
    const reg = selectedRegion !== 'tous'
      ? `${t('Région', 'Faritra', 'Region')}: ${selectedRegion}`
      : t('Toutes les régions', 'Ny faritra rehetra', 'All regions');
    const mois = selectedMonth !== 'tous'
      ? monthNames[parseInt(selectedMonth, 10) - 1]
      : t('Tous les mois', 'Ny volana rehetra', 'All months');
    const annee = selectedYear !== 'tous'
      ? selectedYear
      : t('Toutes les années', 'Ny taona rehetra', 'All years');
    return `${reg}, ${mois} ${annee}`;
  }, [selectedRegion, selectedMonth, selectedYear, monthNames, t]);

  // Contrôle : sans aucun filtre, le total doit égaler la somme en base
  const ecartBase = useMemo(() => {
    const aucunFiltre = selectedRegion === 'tous' && selectedUsagerType === 'tous'
      && selectedMonth === 'tous' && selectedYear === 'tous';
    if (!aucunFiltre || !statsGlobal) return 0;
    return Math.round((statsGlobal.montantTotal || 0) - totaux.montant);
  }, [selectedRegion, selectedUsagerType, selectedMonth, selectedYear, statsGlobal, totaux.montant]);

  /* ---------------- Modal admin ---------------- */
  const handleOpenPaymentManagement = () => {
    if (paymentSession && paymentSession.token && paymentSession.user?.id) {
      navigate('/gere-payer');
      return;
    }
    openAdminModal();
  };

  const resetAdminModal = () => {
    setAdminStep(1);
    setAdminEmail('');
    setAdminPassword('');
    setAdminVerifiedUser(null);
    setAdminError('');
    setVerifyProgress(0);
    setIsAdminVerifying(false);
    setShowAdminPassword(false);
  };

  const openAdminModal = () => { setShowAdminModal(true); resetAdminModal(); };
  const closeAdminModal = () => { setShowAdminModal(false); resetAdminModal(); };

  const runVerifyAnimation = () => new Promise((resolve) => {
    setVerifyProgress(0);
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      const pct = Math.min(100, Math.round((current / steps) * 100));
      setVerifyProgress(pct);
      if (current >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });

  const verifyAdminEmail = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) { setAdminError(t('Veuillez saisir un email', 'Ampidiro mailaka', 'Please enter an email')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAdminError(t('Format d\'email invalide', 'Diso', 'Invalid email')); return; }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      const [serverRes] = await Promise.all([
        axios.post(`${API_URL}/admin/verify-email`, { email, scope: 'payment' })
          .then(r => r.data).catch(err => err.response?.data || { success: false }),
        runVerifyAnimation(),
      ]);

      if (serverRes && serverRes.success && serverRes.user) {
        setAdminVerifiedUser(serverRes.user);
        setIsAdminVerifying(false);
        setTimeout(() => { setAdminStep(2); setVerifyProgress(0); }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(serverRes?.message || t('Accès refusé.', 'Tsy nahazo alalana.', 'Access denied.'));
      }
    } catch (err) {
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword || adminPassword.length !== 4) {
      setAdminError(t('Code à 4 caractères', 'Kaody 4 litera', '4-character code'));
      return;
    }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      const [serverRes] = await Promise.all([
        axios.post(`${API_URL}/admin/verify`, {
          password: adminPassword, email: adminVerifiedUser?.email, scope: 'payment',
        }).then(r => r.data).catch(err => err.response?.data || { success: false }),
        runVerifyAnimation(),
      ]);

      if (serverRes && serverRes.success) {
        const freshUser = serverRes.user ? {
          id: serverRes.user.id, nom: serverRes.user.nom,
          email: serverRes.user.email, role: serverRes.user.role,
        } : null;

        if (!freshUser) { setIsAdminVerifying(false); setAdminError(t('Utilisateur introuvable', 'Tsy hita', 'User not found')); return; }

        localStorage.setItem('adminToken', serverRes.token);
        localStorage.setItem('adminRole', freshUser.role);
        localStorage.setItem('adminAccessRole', freshUser.role);
        localStorage.setItem('adminUser', JSON.stringify(freshUser));
        localStorage.setItem('adminName', freshUser.nom);
        localStorage.setItem('adminEmail', freshUser.email);

        setPaymentSession({ token: serverRes.token, user: freshUser });
        setIsAdminVerifying(false);
        setTimeout(() => { closeAdminModal(); navigate('/gere-payer'); }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(serverRes?.message || t('Code incorrect ❌', 'Diso ❌', 'Incorrect ❌'));
        setAdminPassword('');
      }
    } catch (err) {
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const handlePrintPDF = () => window.print();
  const handleRetour = () => navigate('/dashboard');

  const getPeriodLabel = () => {
    if (selectedMonth === 'tous' && selectedYear === 'tous') return t('Toutes périodes', 'Ny vanim-potoana rehetra', 'All periods');
    if (selectedMonth === 'tous') return `${t('Année', 'Taona', 'Year')} ${selectedYear}`;
    if (selectedYear === 'tous') return `${t('Mois de', 'Volan\'ny', 'Month of')} ${monthNames[parseInt(selectedMonth, 10) - 1]}`;
    return `${monthNames[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`;
  };

  const selectedTypeLabel = usagerTypes.find((x) => x.id === selectedUsagerType)?.label || '';

  /* ---------------- États de chargement / erreur ---------------- */
  if (checkingPaymentSession) {
    return (
      <>
        <MiniSidebar />
        <div className="payment-loading">
          <div className="spinner"></div>
          <p>{t('Vérification de la session...', 'Manamarina ny sesion...', 'Checking session...')}</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="payment-loading">
          <div className="spinner"></div>
          <p>{t('Chargement des données financières...', 'Maka ny angona...', 'Loading financial data...')}</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MiniSidebar />
        <div className="payment-error">
          <p>{error}</p>
          <button onClick={fetchAllData} className="btn-retry">
            <RefreshCw size={16} style={{ marginRight: '6px' }} />
            {t('Réessayer', 'Andramo indray', 'Retry')}
          </button>
        </div>
      </>
    );
  }

  /* ---------------- Rendu ---------------- */
  return (
    <>
      <MiniSidebar />
      <div className="payment-container">
        <div className="payment-header">
          <div className="header-left">
            <h1>
              <BarChart3 className="header-icon" size={28} style={{ marginRight: '8px' }} />
              {t('Tableau de Bord Financier', 'Tabilaom-bola', 'Financial Dashboard')}
            </h1>
            <p className="header-subtitle">
              {t('Suivi de paiement', 'Fanaraha-maso', 'User payment tracking')}
            </p>
          </div>
          <div className="header-actions">
            <button onClick={fetchAllData} className="btn-refresh">
              <RefreshCw size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Actualiser', 'Havaozina', 'Refresh')}
            </button>

            <button onClick={handlePrintPDF} className="btn-pdf">
              <FileText size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Aperçu PDF', 'Topi-drakitra PDF', 'PDF Preview')}
            </button>

            <button onClick={handleOpenPaymentManagement} className="btn-gestion">
              <Lock size={18} style={{ marginRight: '6px' }} />{' '}
              {paymentSession && paymentSession.user
                ? `${t('Gestion des paiements', 'Fitantanana', 'Payment')} (${getRoleLabelForButton(paymentSession.user.role)})`
                : t('Gestion des paiements', 'Fitantanana ny fandoavana', 'Payment Management')}
            </button>

            <button className="btn-retour" onClick={handleRetour}>
              <ArrowLeft size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Retour', 'Hiverina', 'Back')}
            </button>
          </div>
        </div>

        {/* ───────── FILTRES ───────── */}
        <div className="filters-section">
          <div className="filters-left">
            <div className="filter-group">
              <label><MapPin size={16} style={{ marginRight: '4px' }} /> {t('Région', 'Faritra', 'Region')}</label>
              <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="filter-select">
                <option value="tous">{t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}</option>
                {regions.map(region => (<option key={region.id} value={region.nom}>{region.nom}</option>))}
              </select>
            </div>
            <div className="filter-group">
              <label><Building2 size={16} style={{ marginRight: '4px' }} /> {t("Type d'usager", 'Karazana', 'User type')}</label>
              <select value={selectedUsagerType} onChange={(e) => setSelectedUsagerType(e.target.value)} className="filter-select">
                <option value="tous">{t('Tous les types', 'Ny karazana rehetra', 'All types')}</option>
                {usagerTypes.map(type => (<option key={type.id} value={type.id}>{type.label}</option>))}
              </select>
            </div>
          </div>
          <div className="filters-right">
            <div className="filter-group">
              <label><Calendar size={16} style={{ marginRight: '4px' }} /> {t('Mois', 'Volana', 'Month')}</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="filter-select">
                <option value="tous">{t('Tous les mois', 'Ny volana rehetra', 'All months')}</option>
                {monthNames.map((month, index) => (<option key={index + 1} value={index + 1}>{month}</option>))}
              </select>
            </div>
            <div className="filter-group">
              <label><CalendarDays size={16} style={{ marginRight: '4px' }} /> {t('Année', 'Taona', 'Year')}</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="filter-select">
                <option value="tous">{t('Toutes les années', 'Ny taona rehetra', 'All years')}</option>
                {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* ───────── CARTES RÉSUMÉ ───────── */}
        <div className="summary-cards four-cards">
          <div className="summary-card total-usagers">
            <div className="card-icon"><Users size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Total Usagers', 'Isan\'ny mpampiasa', 'Total Users')}</span>
              <span className="card-value">{totaux.total}</span>
              <span className="card-sub-label">
                {selectedRegion !== 'tous' ? `${t('Région', 'Faritra', 'Region')}: ${selectedRegion}` : t('Toutes régions', 'Ny faritra rehetra', 'All regions')}
                {selectedUsagerType !== 'tous' && ` • ${selectedTypeLabel}`}
              </span>
            </div>
          </div>
          <div className="summary-card total-payes">
            <div className="card-icon"><Coins size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Total Payés', 'Efa nandoa', 'Total Paid')}</span>
              <span className="card-value">{totaux.payes}</span>
              <span className="card-sub-label">{t('Usagers avec paiement', 'Mpampiasa nandoa', 'Users with payment')}</span>
            </div>
          </div>
          <div className="summary-card taux-paiement">
            <div className="card-icon"><TrendingUp size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Taux de Paiement', 'Tahan\'ny fandoavana', 'Payment Rate')}</span>
              <span className="card-value">{totaux.taux}%</span>
              <span className="card-sub-label">
                {totaux.total > 0
                  ? `${totaux.payes}/${totaux.total} ${t('payés', 'nandoa', 'paid')}`
                  : t('Aucun usager', 'Tsy misy', 'No user')}
              </span>
            </div>
          </div>
          <div className="summary-card montant-recu">
            <div className="card-icon"><DollarSign size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Montant Reçu', 'Vola voaray', 'Amount Received')}</span>
              <span className="card-value montant-recu-value">{fmt(totaux.montant)} Ar</span>
              <span className="card-sub-label">{filterContext}</span>
            </div>
          </div>
        </div>

        {ecartBase !== 0 && (
          <div className="data-warning">
            <AlertTriangle size={16} />
            <span>
              {t(
                `Écart avec la base : ${fmt(Math.abs(ecartBase))} Ar (${ecartBase > 0 ? 'manquant à l\'écran' : 'en trop à l\'écran'}). Vérifiez les paiements dont le type ou le statut est inattendu.`,
                `Tsy mitovy amin'ny base : ${fmt(Math.abs(ecartBase))} Ar.`,
                `Difference with database: ${fmt(Math.abs(ecartBase))} Ar (${ecartBase > 0 ? 'missing on screen' : 'extra on screen'}). Check payments with an unexpected type or status.`
              )}
            </span>
          </div>
        )}

        {/* ───────── TABLEAU + GRAPHE PAR TYPE ───────── */}
        <div className="usagers-table-wrapper">
          <table className="usagers-table">
            <thead>
              <tr>
                <th className="col-type">{t("Type d'usager", 'Karazana', 'User type')}</th>
                <th className="col-num">{t('Total', 'Totaly', 'Total')}</th>
                <th className="col-num">{t('Payés', 'Nandoa', 'Paid')}</th>
                <th className="col-num col-taux">{t('Taux', 'Taha', 'Rate')}</th>
                <th className="col-num">{t('Montant', 'Vola', 'Amount')}</th>
                <th className="col-graph">
                  {selectedRegion !== 'tous'
                    ? `${t('Part', 'Anjara', 'Share')} — ${selectedRegion}`
                    : t('Répartition', 'Fizarana', 'Distribution')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((row) => {
                const TypeIcon = getTypeIcon(row.id);
                const pourcent = calcPart(row.montant, montantBase);
                return (
                  <tr key={row.id}>
                    <td className="col-type">
                      <span className="usager-row-label">
                        <TypeIcon size={16} className="usager-row-icon" />
                        {row.label}
                      </span>
                    </td>
                    <td className="col-num">{row.total}</td>
                    <td className="col-num success">{row.payes}</td>
                    <td className="col-num col-taux">{row.taux}%</td>
                    <td className="col-num montant">{fmt(row.montant)} Ar</td>
                    <td className="col-graph">
                      <div className="graph-bar-wrapper">
                        <div
                          className="graph-bar-fill"
                          style={{ width: `${Math.min(100, pourcent)}%`, minWidth: pourcent > 0 ? '3px' : 0 }}
                        />
                        <span className="graph-percent">{pourcent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="col-type"><strong>{t('TOTAL', 'TOTALY', 'TOTAL')}</strong></td>
                <td className="col-num"><strong>{totaux.total}</strong></td>
                <td className="col-num success"><strong>{totaux.payes}</strong></td>
                <td className="col-num col-taux"><strong>{totaux.taux}%</strong></td>
                <td className="col-num montant"><strong>{fmt(totaux.montant)} Ar</strong></td>
                <td className="col-graph">
                  <strong>{calcPart(totaux.montant, montantBase)}%</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ───────── APERÇU PAR RÉGION ───────── */}
        <div className="regions-section">
          <h2 className="section-title">
            <TrendingUp size={20} className="section-icon" style={{ marginRight: '8px' }} />
            {t('Aperçu par Région', 'Topi-tsipika isaky ny faritra', 'Overview by Region')}
            {selectedRegion !== 'tous' && (<span className="filter-badge">{t('Filtré', 'Voasivana', 'Filtered')}: {selectedRegion}</span>)}
            {selectedUsagerType !== 'tous' && (<span className="filter-badge">{t('Type', 'Karazana', 'Type')}: {selectedTypeLabel}</span>)}
            <span className="filter-badge filter-badge-period">{getPeriodLabel()}</span>
          </h2>
          <div className="regions-grid">
            <div className="region-card region-total">
              <div className="region-header">
                <span className="region-name">
                  {selectedRegion !== 'tous' ? selectedRegion : t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}
                </span>
                <span className="region-total-amount">{fmt(totaux.montant)} Ar</span>
              </div>
              <div className="region-stats">
                <span>{t('Usagers', 'Mpampiasa', 'Users')}: {totaux.total}</span>
                <span>{t('Payés', 'Nandoa', 'Paid')}: {totaux.payes}</span>
                <span>{t('Taux', 'Taha', 'Rate')}: {totaux.taux}%</span>
              </div>
            </div>

            {regionCards.map((r) => (
              <div key={r.key || 'none'} className="region-card">
                <div className="region-header">
                  <span className="region-name">{r.nom}</span>
                  <span className="region-amount">{fmt(r.montant)} Ar</span>
                </div>
                <div className="region-stats">
                  <span>{t('Usagers', 'Mpampiasa', 'Users')}: {r.usagers}</span>
                  <span>{t('Payés', 'Nandoa', 'Paid')}: {r.payes}</span>
                  <span>{t('Taux', 'Taha', 'Rate')}: {r.taux}%</span>
                </div>
                <div className="region-bar" title={`${r.part}%`}>
                  <div
                    className="region-bar-fill"
                    style={{ width: `${Math.min(100, r.part)}%`, minWidth: r.part > 0 ? '3px' : 0 }}
                  />
                </div>
                <span className="region-share">{r.part}% {t('du total affiché', 'amin\'ny fitambarany', 'of displayed total')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-footer">
          <p>© 2026 OMDA - {t('Gestion Financière', 'Fitantanana ara-bola', 'Financial Management')}</p>
          <p>{t('Dernière mise à jour', 'Fanavaozana farany', 'Last update')}: {new Date().toLocaleDateString(locale)}</p>
        </div>
      </div>

      {/* ───────── MODAL ADMIN ───────── */}
      {showAdminModal && (
        <div
          className="modal-overlay admin-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !isAdminVerifying) closeAdminModal(); }}
        >
          <div className="admin-pro-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-pro-header">
              <div className="admin-pro-badge">
                <Lock size={18} />
              </div>
              <div className="admin-pro-header-text">
                <h3>{t('Accès Gestion des Paiements', 'Fidirana', 'Payment Access')}</h3>
                <p>{t('Super Admin / DAF / Admin uniquement', 'Super Admin / DAF / Admin ihany', 'Super Admin / DAF / Admin only')}</p>
              </div>
              <button
                type="button"
                className="admin-pro-close"
                onClick={closeAdminModal}
                disabled={isAdminVerifying}
                aria-label="Fermer"
              >✕</button>
            </div>

            <div className="admin-steps">
              <div className={`admin-step ${adminStep === 1 ? 'active' : ''} ${adminStep > 1 ? 'done' : ''}`}>
                <div className="admin-step-circle">
                  {adminStep > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span>{t('Email', 'Mailaka', 'Email')}</span>
              </div>
              <div className={`admin-step-line ${adminStep > 1 ? 'done' : ''}`}></div>
              <div className={`admin-step ${adminStep === 2 ? 'active' : ''}`}>
                <div className="admin-step-circle">2</div>
                <span>{t('Code', 'Kaody', 'Code')}</span>
              </div>
            </div>

            <div className="admin-pro-body">
              {adminStep === 1 && (
                <>
                  <div className="admin-pro-field">
                    <label><Mail size={14} /> {t('Adresse email', 'Adiresy mailaka', 'Email address')}</label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      className="admin-pro-input"
                      placeholder={t('ex: votre@omda.mg', 'oh: votre@omda.mg', 'e.g. your@omda.mg')}
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminEmail(); }}
                      disabled={isAdminVerifying}
                      autoComplete="email"
                    />
                  </div>

                  {isAdminVerifying && (
                    <div className="admin-verify-anim">
                      <div className="admin-verify-spinner">
                        <Loader2 size={18} className="spin" />
                        <span>{t('Vérification en cours…', 'Manamarina…', 'Verifying…')}</span>
                      </div>
                      <div className="admin-verify-bar">
                        <div className="admin-verify-bar-fill" style={{ width: `${verifyProgress}%` }}></div>
                      </div>
                      <div className="admin-verify-pct">{verifyProgress}%</div>
                    </div>
                  )}

                  {adminError && !isAdminVerifying && (
                    <div className="admin-error">⚠️ {adminError}</div>
                  )}

                  <div className="admin-pro-actions">
                    <button
                      type="button"
                      className="admin-btn-validate"
                      onClick={verifyAdminEmail}
                      disabled={isAdminVerifying || !adminEmail.trim()}
                    >
                      {isAdminVerifying
                        ? <><Loader2 size={16} className="spin" /> {t('Vérification…', 'Manamarina…', 'Verifying…')}</>
                        : <><ShieldCheck size={16} /> {t('Vérifier', 'Hamarino', 'Verify')}</>}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-cancel"
                      onClick={closeAdminModal}
                      disabled={isAdminVerifying}
                    >
                      {t('Annuler', 'Foanana', 'Cancel')}
                    </button>
                  </div>
                </>
              )}

              {adminStep === 2 && (
                <>
                  <div className="admin-verified-user">
                    <CheckCircle2 size={16} className="ok" />
                    <div>
                      <strong>{adminVerifiedUser?.nom}</strong>
                      <span>{adminVerifiedUser?.email}</span>
                      <em className={`admin-role-tag role-${adminVerifiedUser?.role}`}>
                        {adminVerifiedUser?.role === 'super_admin' ? '⭐ Super Admin'
                          : adminVerifiedUser?.role === 'daf' ? '📊 DAF'
                          : '👑 Admin'}
                      </em>
                    </div>
                  </div>

                  <div className="admin-pro-field">
                    <label><Lock size={14} /> {t('Code (4 caractères)', 'Kaody (4 litera)', 'Code (4 characters)')}</label>
                    <div className="admin-password-wrapper">
                      <input
                        ref={passwordInputRef}
                        type={showAdminPassword ? 'text' : 'password'}
                        maxLength="4"
                        autoComplete="off"
                        className="admin-pro-input"
                        placeholder="• • • •"
                        value={adminPassword}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminPassword(); }}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 4);
                          setAdminPassword(v);
                          setAdminError('');
                        }}
                        disabled={isAdminVerifying}
                      />
                      <button
                        type="button"
                        className="toggle-admin-password"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        tabIndex={-1}
                        aria-label={showAdminPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {isAdminVerifying && (
                    <div className="admin-verify-anim">
                      <div className="admin-verify-spinner">
                        <Loader2 size={18} className="spin" />
                        <span>{t('Vérification en cours…', 'Manamarina…', 'Verifying…')}</span>
                      </div>
                      <div className="admin-verify-bar">
                        <div className="admin-verify-bar-fill" style={{ width: `${verifyProgress}%` }}></div>
                      </div>
                      <div className="admin-verify-pct">{verifyProgress}%</div>
                    </div>
                  )}

                  {adminError && !isAdminVerifying && (
                    <div className="admin-error">⚠️ {adminError}</div>
                  )}

                  <div className="admin-pro-actions">
                    <button
                      type="button"
                      className="admin-btn-validate"
                      onClick={verifyAdminPassword}
                      disabled={isAdminVerifying || adminPassword.length !== 4}
                    >
                      {isAdminVerifying
                        ? <><Loader2 size={16} className="spin" /> {t('Vérification…', 'Manamarina…', 'Verifying…')}</>
                        : <><ShieldCheck size={16} /> {t('Accéder', 'Hiditra', 'Access')}</>}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-back"
                      onClick={() => {
                        setAdminStep(1);
                        setAdminPassword('');
                        setAdminError('');
                        setVerifyProgress(0);
                      }}
                      disabled={isAdminVerifying}
                    >
                      ← {t('Retour', 'Hiverina', 'Back')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="admin-pro-footer">
              <ShieldCheck size={14} />
              <span>{t('Connexion sécurisée — OMDA', 'Fifandraisana voafetra — OMDA', 'Secure connection — OMDA')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementChoix;