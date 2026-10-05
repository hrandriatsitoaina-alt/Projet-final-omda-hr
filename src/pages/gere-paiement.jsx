// src/pages/GerePaiement.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, MapPin, Phone, Mail, CreditCard, Calendar,
  DollarSign, Hash, FileText, CheckCircle, AlertCircle, X, Search,
  RefreshCw, Loader, BadgeCheck, AlertTriangle, Info, Hotel, Store,
  Bus, Music, Tv, Eye, EyeOff, Star, Award, Wallet, ReceiptText,
  Package, Plus, Disc, Globe, Sparkles, Video, Repeat,
  CalendarCheck, FileCheck,
} from 'lucide-react';
import '../styles/gere-paiement.css';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';

// ✅ Icônes par type d'usager événementiel (statiques)
const OTHER_TYPE_ICONS = {
  cd: Disc,
  mp3: Music,
  'oeuvre-web': Globe,
  hologramme: Sparkles,
  video: Video,
  autre: Package,
};

const GerePaiement = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [stats, setStats] = useState(null);
  const [selectedType, setSelectedType] = useState('hotel');
  const [selectedRegion, setSelectedRegion] = useState('tous');
  const [regions, setRegions] = useState([]);
  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [nouveauxIds, setNouveauxIds] = useState({});
  const [showOnlyNouveaux, setShowOnlyNouveaux] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [otherUsagers, setOtherUsagers] = useState([]);
  const [loadingOther, setLoadingOther] = useState(false);

  // ✅ MODALE DÉTAIL USAGER
  const [detailUsager, setDetailUsager] = useState(null);

  // ✅ Paiements bruts (contient mois_payes)
  const [paiementsRaw, setPaiementsRaw] = useState([]);

  const currentYear = new Date().getFullYear();

  const [filtreAnnee, setFiltreAnnee] = useState(currentYear);
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [nombreMois, setNombreMois] = useState(1);
  const [montantPayer, setMontantPayer] = useState('');
  const [montantTotal, setMontantTotal] = useState(0);
  const [montantMensuelOriginal, setMontantMensuelOriginal] = useState(0);

  const notificationsAffichees = useRef(new Set());

  // ✅ Labels des types événementiels
  const otherTypeLabels = useMemo(() => ({
    cd: 'CD',
    mp3: 'MP3',
    'oeuvre-web': t('Œuvre Web', 'Asa an-tserasera', 'Web work'),
    hologramme: t('Hologramme', 'Holograma', 'Hologram'),
    video: t('Vidéo', 'Lahatsary', 'Video'),
    autre: t('Autre', 'Hafa', 'Other'),
  }), [t]);

  const typeConfig = useMemo(() => ({
    hotel: { label: t('Hôtels', 'Hotely', 'Hotels'), icon: Hotel },
    'grand-surface': { label: t('Grandes Surfaces', 'Fivarotana lehibe', 'Large Stores'), icon: Store },
    bus: { label: t('Bus', 'Bus', 'Bus'), icon: Bus },
    nightclub: { label: t('Night Clubs', 'Club alina', 'Night Clubs'), icon: Music },
    media: { label: t('Médias', 'Haino aman-jery', 'Media'), icon: Tv },
    other: { label: t('Usager événementiel', 'Mpampiasa hetsika', 'Event user'), icon: Package },
  }), [t]);

  const moisLabels = useMemo(() => {
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

  const moisLabelsShort = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  // ============================================================
  // MAP : mois payés par usager/type/année
  // ============================================================
  const moisPayesMap = useMemo(() => {
    const groups = {};
    for (const p of paiementsRaw) {
      if (p.statut !== 'paye') continue;
      const annee = p.annee;
      if (!annee) continue;
      const groupKey = `${p.usager_id}_${p.usager_type}_${annee}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(p);
    }

    const map = {};
    for (const groupKey in groups) {
      const paiements = groups[groupKey];
      const [usagerId, usagerType, annee] = groupKey.split('_');
      const key = `${usagerId}_${usagerType}`;

      const paiementsAvecMoisPayes = paiements.filter(p => {
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

      const paiementsAUtiliser = paiementsAvecMoisPayes.length > 0
        ? paiementsAvecMoisPayes
        : paiements;

      if (!map[key]) map[key] = {};
      if (!map[key][annee]) map[key][annee] = new Set();

      for (const p of paiementsAUtiliser) {
        let moisList = [];

        if (p.mois_payes) {
          if (Array.isArray(p.mois_payes)) {
            moisList = p.mois_payes;
          } else if (typeof p.mois_payes === 'string') {
            try {
              const parsed = JSON.parse(p.mois_payes);
              if (Array.isArray(parsed)) moisList = parsed;
            } catch (e) { /* ignore */ }
          }
        }

        if (moisList.length === 0 && p.mois) {
          moisList = [p.mois];
        }

        for (const m of moisList) {
          if (typeof m === 'number' && m >= 1 && m <= 12) {
            map[key][annee].add(m);
          }
        }
      }
    }

    const result = {};
    for (const key in map) {
      result[key] = {};
      for (const annee in map[key]) {
        result[key][annee] = Array.from(map[key][annee]).sort((a, b) => a - b);
      }
    }
    return result;
  }, [paiementsRaw]);

  // ========== CHARGEMENT ==========
  const loadRegions = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/regions');
      const data = await res.json();
      if (data.success) setRegions(data.regions);
    } catch (err) { console.error(err); }
  }, []);

  const checkNouveauxUsagers = useCallback(async () => {
    try {
      const countRes = await fetch('http://localhost:3001/api/usagers/nouveaux-compteur');
      const countData = await countRes.json();
      if (countData.success && countData.nouveaux) {
        const idsTemp = {};
        const typesFiltres = Object.keys(countData.nouveaux).filter(t2 => t2 !== 'occ');
        for (const type of typesFiltres) {
          if (countData.nouveaux[type] > 0) {
            const idsRes = await fetch(`http://localhost:3001/api/usagers/nouveaux-ids/${type}`);
            const idsData = await idsRes.json();
            idsTemp[type] = idsData.success ? idsData.ids : [];
          } else {
            idsTemp[type] = [];
          }
        }
        setNouveauxIds(idsTemp);
      }
    } catch (err) { console.error(err); }
  }, []);

  const loadOtherUsagers = useCallback(async () => {
    setLoadingOther(true);
    try {
      const res = await fetch('http://localhost:3001/api/other-usagers');
      const data = await res.json();
      if (data.success) {
        setOtherUsagers(data.usagers || []);
      } else {
        setOtherUsagers([]);
      }
    } catch (err) {
      console.error('Erreur chargement usagers_other:', err);
      setOtherUsagers([]);
    } finally {
      setLoadingOther(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const statsRes = await fetch('http://localhost:3001/api/paiements/stats');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);

      try {
        const paiementsRes = await fetch('http://localhost:3001/api/paiements/tous');
        const paiementsData = await paiementsRes.json();
        if (paiementsData.success) {
          setPaiementsRaw(paiementsData.paiements || []);
        }
      } catch (err) {
        console.warn('⚠️ Erreur chargement paiements bruts:', err);
        setPaiementsRaw([]);
      }

      loadOtherUsagers();

      if (selectedType === 'other') {
        setLoading(false);
        return;
      }

      const url = `http://localhost:3001/api/usagers/paiements/${selectedType}`;
      const usagersRes = await fetch(url);
      const usagersData = await usagersRes.json();

      if (!usagersRes.ok) {
        setApiError(`${t('Erreur', 'Olana', 'Error')} ${usagersRes.status} : ${usagersRes.statusText}`);
        setUsagers([]);
        setFilteredUsagers([]);
        setLoading(false);
        return;
      }

      if (usagersData.success && usagersData.usagers?.length) {
        let sorted = [...usagersData.usagers];
        if (selectedRegion !== 'tous') {
          sorted = sorted.filter(u => u.region === selectedRegion);
        }
        sorted.sort((a, b) => {
          const nomA = (a.denomination || a.nom_evenement || a.organisateurs || '').toLowerCase();
          const nomB = (b.denomination || b.nom_evenement || b.organisateurs || '').toLowerCase();
          return nomA.localeCompare(nomB);
        });
        setUsagers(sorted);
        setFilteredUsagers(sorted);
      } else {
        setUsagers([]);
        setFilteredUsagers([]);
        setApiError(t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found'));
      }

      try {
        const anRes = await fetch(`http://localhost:3001/api/paiements/annees-disponibles/${selectedType}`);
        const anData = await anRes.json();
        if (anData.success && anData.annees.length) {
          setAnneesDisponibles(anData.annees);
          if (anData.annees.includes(currentYear)) setFiltreAnnee(currentYear);
          else setFiltreAnnee(anData.annees[anData.annees.length - 1]);
        } else {
          setAnneesDisponibles([currentYear, currentYear + 1]);
          setFiltreAnnee(currentYear);
        }
      } catch {
        setAnneesDisponibles([currentYear, currentYear + 1]);
        setFiltreAnnee(currentYear);
      }

      await checkNouveauxUsagers();
    } catch (err) {
      console.error(err);
      setApiError(err.message);
      setUsagers([]);
      setFilteredUsagers([]);
      setAnneesDisponibles([currentYear, currentYear + 1]);
      setNotification({
        type: 'error',
        message: t('Erreur de chargement des données', 'Nisy olana', 'Error loading data'),
      });
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedRegion, currentYear, checkNouveauxUsagers, loadOtherUsagers, t]);

  useEffect(() => {
    loadRegions();
    loadAllData();
  }, [loadRegions, loadAllData]);

  const filterUsagers = useCallback(() => {
    if (selectedType === 'other') return;

    let filtered = [...usagers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => {
        const nom = (u.denomination || u.nom_evenement || u.organisateurs || '').toLowerCase();
        const demandeur = (u.demandeur || u.representant_par || '').toLowerCase();
        const telephone = u.telephone || '';
        const email = (u.email || '').toLowerCase();
        const region = (u.region || '').toLowerCase();
        const adresse = (u.adresse || u.adresse_siege || '').toLowerCase();
        return nom.includes(term) || demandeur.includes(term) || telephone.includes(term) ||
               email.includes(term) || region.includes(term) || adresse.includes(term);
      });
    }
    if (showOnlyNouveaux) {
      if (nouveauxIds[selectedType]?.length) {
        filtered = filtered.filter(u => nouveauxIds[selectedType].includes(u.id));
      }
    }
    setFilteredUsagers(filtered);
  }, [searchTerm, usagers, showOnlyNouveaux, nouveauxIds, selectedType]);

  useEffect(() => {
    filterUsagers();
  }, [filterUsagers]);

  // ============================================================
  // FONCTIONS PAIEMENT
  // ============================================================
  const getMoisPayesComplet = useCallback((usager, annee, typeOverride = null) => {
    if (!usager) return [];
    const typeKey = typeOverride || (selectedType === 'other' ? 'other' : selectedType);
    const key = `${usager.id}_${typeKey}`;
    return moisPayesMap[key]?.[annee] || [];
  }, [moisPayesMap, selectedType]);

  const getMoisDebut = (usager, annee) => {
    const anneeData = usager.resumeAnnees?.find(a => a.annee === annee);
    if (anneeData && anneeData.moisDebut) return anneeData.moisDebut;
    return usager.moisCreation || 1;
  };

  const isEnRetard = (usager) => {
    const moisPayes = getMoisPayesComplet(usager, filtreAnnee);
    const nbMoisPayes = moisPayes.length;
    if (nbMoisPayes >= 12) return false;
    const moisDebut = getMoisDebut(usager, filtreAnnee);
    const moisActuel = new Date().getMonth() + 1;
    const anneeActuelle = new Date().getFullYear();
    if (filtreAnnee === anneeActuelle) {
      const moisEcoules = Math.min(moisActuel, 12) - moisDebut + 1;
      return nbMoisPayes < moisEcoules && nbMoisPayes < 12;
    }
    if (filtreAnnee < anneeActuelle) return nbMoisPayes < 12;
    return false;
  };

  const getStatusBadge = (usager, anneeOverride = null, typeOverride = null) => {
    const annee = anneeOverride || filtreAnnee;
    const moisPayes = getMoisPayesComplet(usager, annee, typeOverride);
    const nbMoisPayes = moisPayes.length;
    const moisTries = [...moisPayes].sort((a, b) => a - b);
    const affichageMois = moisTries.map(m => moisLabelsShort[m - 1]).join(', ');

    if (nbMoisPayes >= 12) {
      return <span className="badge badge-success"><CheckCircle size={14} /> 12/12 ✅</span>;
    }
    if (nbMoisPayes > 0) {
      const moisRestants = 12 - nbMoisPayes;
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={14} /> {nbMoisPayes}/12
          <span className="badge-sub"> ({affichageMois})</span>
          <span className="badge-sub" style={{ display: 'block', marginTop: '2px' }}>
            {moisRestants} {t('mois restants', 'volana sisa', 'months remaining')}
          </span>
        </span>
      );
    }
    return <span className="badge badge-danger"><X size={14} /> 0/12</span>;
  };

  // ✅ Récupère les infos détaillées (utilisées dans la modale)
  const getFullInfo = (usager, type) => {
    const infos = [];
    if (usager.adresse || usager.adresse_siege) infos.push({ icon: MapPin, label: t('Adresse', 'Adiresy', 'Address'), text: usager.adresse || usager.adresse_siege });
    if (usager.region && usager.region !== 'N/A') infos.push({ icon: MapPin, label: t('Région', 'Faritra', 'Region'), text: usager.region });
    if (usager.email) infos.push({ icon: Mail, label: 'Email', text: usager.email });
    if (usager.telephone) infos.push({ icon: Phone, label: t('Téléphone', 'Finday', 'Phone'), text: usager.telephone });
    if (usager.nif_stat) infos.push({ icon: FileText, label: 'NIF/STAT', text: usager.nif_stat });
    switch (type) {
      case 'hotel':
        if (usager.etoiles) infos.push({ icon: Star, label: t('Étoiles', 'Kintana', 'Stars'), text: `${usager.etoiles} ${t('étoiles', 'kintana', 'stars')}` });
        if (usager.ravinala) infos.push({ icon: Award, label: 'Label', text: t('Label Ravinala', 'Tombokaso Ravinala', 'Ravinala Label') });
        if (usager.activite) infos.push({ icon: FileText, label: t('Activité', 'Asa', 'Activity'), text: usager.activite });
        break;
      case 'grand-surface':
        if (usager.nombre_magasins) infos.push({ icon: Store, label: t('Magasins', 'Fivarotana', 'Stores'), text: `${usager.nombre_magasins}` });
        if (usager.activite) infos.push({ icon: FileText, label: t('Activité', 'Asa', 'Activity'), text: usager.activite });
        break;
      case 'bus':
        if (usager.nombre_vehicules) infos.push({ icon: Bus, label: t('Véhicules', 'Fiara', 'Vehicles'), text: `${usager.nombre_vehicules}` });
        if (usager.lignes) infos.push({ icon: MapPin, label: t('Ligne', 'Lalana', 'Line'), text: usager.lignes });
        if (usager.trajet) infos.push({ icon: MapPin, label: t('Trajet', 'Lalana', 'Route'), text: usager.trajet });
        if (usager.type_bus) infos.push({ icon: Bus, label: t('Type', 'Karazana', 'Type'), text: usager.type_bus });
        break;
      case 'nightclub':
        if (usager.jauge_max) infos.push({ icon: Users, label: t('Jauge max', 'Fahaiza-mandray', 'Max capacity'), text: `${usager.jauge_max}` });
        break;
      case 'media':
        if (usager.frequence) infos.push({ icon: Tv, label: t('Fréquence', 'Fahita', 'Frequency'), text: usager.frequence });
        if (usager.canal) infos.push({ icon: Tv, label: t('Canal', 'Fantsona', 'Channel'), text: usager.canal });
        break;
      default:
        break;
    }
    if (usager.representant_nom) infos.push({ icon: Users, label: t('Représentant', 'Mpisolo tena', 'Representative'), text: usager.representant_nom });
    if (usager.representant_cin) infos.push({ icon: CreditCard, label: 'CIN', text: usager.representant_cin });
    if (usager.representant_tel) infos.push({ icon: Phone, label: t('Tél. représentant', 'Finday mpisolo', 'Rep. phone'), text: usager.representant_tel });
    return infos;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateString; }
  };

  const openPaymentModal = (usager) => {
    if (!usager || !usager.id) {
      setNotification({
        type: 'error',
        message: t('Usager invalide', 'Mpampiasa diso', 'Invalid user'),
      });
      return;
    }
    navigate('/paiement-mensuel', {
      state: {
        usagerId: usager.id,
        usagerType: selectedType,
        usagerData: usager,
      },
    });
  };

  const handleTypeChange = (typeName) => {
    setSelectedType(typeName);
    setShowOnlyNouveaux(false);
    setNotification(null);
    setApiError(null);
  };

  const handleRetour = () => navigate('/billan');

  const notificationIcon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  // ✅ Rendu du tableau événementiel
  const renderOtherTable = () => {
    let filtered = [...otherUsagers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        (u.denomination || '').toLowerCase().includes(term) ||
        (u.nom || '').toLowerCase().includes(term) ||
        (u.prenom || '').toLowerCase().includes(term) ||
        (u.telephone || '').includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.region || '').toLowerCase().includes(term) ||
        (u.representant_par || '').toLowerCase().includes(term)
      );
    }
    if (selectedRegion !== 'tous') {
      filtered = filtered.filter(u => u.region === selectedRegion);
    }

    if (loadingOther) {
      return (
        <div className="state-block">
          <Loader size={32} className="spinner" />
          <p>{t('Chargement des usagers événementiels...', 'Maka ny mpampiasa hetsika...', 'Loading event users...')}</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="state-block">
          <Package size={28} />
          <p>{t('Aucun usager événementiel trouvé', 'Tsy misy mpampiasa hetsika hita', 'No event user found')}</p>
          <button type="button" className="btn-other-add" onClick={() => navigate('/other-ajout')}>
            <Plus size={16} /> {t('Ajouter un usager événementiel', 'Hanampy mpampiasa hetsika', 'Add event user')}
          </button>
        </div>
      );
    }

    return (
      <table className="paiement-table other-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{t('Dénomination', 'Anarana', 'Name')}</th>
            <th>{t('Type', 'Karazana', 'Type')}</th>
            <th>{t('Représentant', 'Mpisolotena', 'Representative')}</th>
            <th>{t('Contact', 'Fifandraisana', 'Contact')}</th>
            <th>{t('Mode paiement', 'Fomba fandoavana', 'Payment mode')}</th>
            <th>{t('Statut', 'Toe-javatra', 'Status')}</th>
            <th>{t('Détails', 'Antsipiriany', 'Details')}</th>
            <th>{t('Action', 'Hetsika', 'Action')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => {
            const TypeIcon = OTHER_TYPE_ICONS[u.type_usager] || Package;
            const typeLabel = otherTypeLabels[u.type_usager] || u.type_usager;
            const lignes = u.lignes || [];
            const isUnique = u.mode_paiement === 'unique';

            const moisPayes = getMoisPayesComplet(u, filtreAnnee, 'other');
            const nbMoisPayes = moisPayes.length;
            const moisTries = [...moisPayes].sort((a, b) => a - b);
            const affichageMois = moisTries.map(m => moisLabelsShort[m - 1]).join(', ');

            return (
              <tr key={u.id}>
                <td data-label="ID">
                  <span className="id-cell">
                    #{String(u.id).padStart(3, '0')}
                    <span className="tag tag-other">
                      <Package size={10} /> {t('Événementiel', 'Hetsika', 'Event')}
                    </span>
                  </span>
                </td>

                <td data-label="Dénomination" className="name">
                  <strong>{u.denomination || t('Sans nom', 'Tsy misy anarana', 'No name')}</strong>
                  {u.region && u.region !== 'N/A' && (
                    <div className="usager-sub"><MapPin size={12} /> {u.region}</div>
                  )}
                </td>

                <td data-label="Type">
                  <span className="other-type-badge">
                    <TypeIcon size={14} /> {typeLabel}
                  </span>
                </td>

                <td data-label="Représentant">
                  <div className="demandeur-info">
                    <strong>{u.representant_par || '-'}</strong>
                    {u.representant_cin && (
                      <div className="usager-sub">CIN : {u.representant_cin}</div>
                    )}
                  </div>
                </td>

                <td data-label="Contact">
                  <div className="contact-info">
                    {u.telephone && <div className="usager-sub"><Phone size={12} /> {u.telephone}</div>}
                    {u.email && <div className="usager-sub"><Mail size={12} /> {u.email}</div>}
                  </div>
                </td>

                <td data-label="Mode paiement">
                  <span className={`mode-badge mode-${u.mode_paiement || 'unique'}`}>
                    {u.mode_paiement === 'mensuel'
                      ? <><Repeat size={12} /> {t('Mensuel', 'Isam-bolana', 'Monthly')}</>
                      : <><CalendarCheck size={12} /> {t('Unique', 'Indray mandeha', 'One-time')}</>}
                  </span>
                  {lignes.length > 0 && (
                    <div className="usager-sub" style={{ marginTop: '4px' }}>
                      {lignes.length} {t('ligne', 'andalana', 'line')}{lignes.length > 1 ? 's' : ''}
                    </div>
                  )}
                </td>

                <td data-label="Statut">
                  {isUnique ? (
                    <span className="paid-badge">
                      <CheckCircle size={14} /> {t('Payé', 'Voaloa', 'Paid')}
                    </span>
                  ) : nbMoisPayes >= 12 ? (
                    <span className="badge badge-success">
                      <CheckCircle size={14} /> 12/12 ✅
                    </span>
                  ) : nbMoisPayes > 0 ? (
                    <span className="badge badge-warning">
                      <AlertTriangle size={14} /> {nbMoisPayes}/12
                      <span className="badge-sub"> ({affichageMois})</span>
                    </span>
                  ) : (
                    <span className="badge badge-danger">
                      <X size={14} /> 0/12
                    </span>
                  )}
                </td>

                {/* ✅ BOUTON ŒIL DÉTAILS */}
                <td data-label="Détails">
                  <button
                    type="button"
                    className="btn-eye"
                    onClick={() => setDetailUsager({ usager: u, type: 'other' })}
                    title={t('Voir les détails', 'Jereo ny antsipiriany', 'View details')}
                  >
                    <Eye size={16} />
                  </button>
                </td>

                <td data-label="Action">
                  {!isUnique && (
                    <button
                      type="button"
                      className="btn-pay btn-pay-other"
                      onClick={() => {
                        navigate('/paiement-mensuel', {
                          state: {
                            usagerId: u.id,
                            usagerType: 'other',
                            usagerData: u,
                          },
                        });
                      }}
                    >
                      <CreditCard size={14} /> {t('Payer', 'Mandoa', 'Pay')}
                    </button>
                  )}
                  {isUnique && (
                    <span className="paid-badge">
                      <CheckCircle size={14} /> {t('Payé', 'Voaloa', 'Paid')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // ========== RENDU ==========
  return (
    <>
      <style>{`
        .btn-other-ajout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #6db5ff, #4a9eff);
          color: #fff;
          border: none;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
        }
        .btn-other-ajout:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(74, 158, 255, 0.45);
        }
        .btn-other-ajout:active {
          transform: translateY(0);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-other-add {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #6db5ff, #4a9eff);
          color: #fff;
          border: none;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
          margin-top: 12px;
        }
        .btn-other-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(74, 158, 255, 0.45);
        }
        .btn-pay-other {
          background: linear-gradient(135deg, #6db5ff, #4a9eff) !important;
        }
        .btn-pay-other:hover {
          background: #357ABD !important;
        }
        .other-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(74, 158, 255, 0.1);
          color: #357ABD;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(74, 158, 255, 0.3);
        }
        .mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .mode-mensuel {
          background: rgba(74, 144, 217, 0.1);
          color: #357ABD;
          border: 1px solid rgba(74, 144, 217, 0.3);
        }
        .mode-unique {
          background: rgba(39, 174, 96, 0.1);
          color: #1e8449;
          border: 1px solid rgba(39, 174, 96, 0.3);
        }
        .tag-other {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          margin-left: 4px;
          background: #6db5ff;
          color: #fff;
        }
        .other-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eef2f7;
          margin-bottom: 12px;
        }
        .other-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 14px;
        }
        .other-header-count {
          font-weight: 700;
          color: #357ABD;
          font-size: 16px;
        }
        .paid-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #d4edda;
          color: #155724;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #86efac;
        }
        .badge-warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffc107;
        }
        .badge-danger {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .badge-sub {
          font-size: 10px;
          font-weight: 500;
          opacity: 0.85;
        }
        /* ✅ Bouton œil */
        .btn-eye {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(74, 144, 217, 0.1);
          color: #357ABD;
          border: 1px solid rgba(74, 144, 217, 0.25);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-eye:hover {
          background: #4A90D9;
          color: #fff;
          border-color: #4A90D9;
          transform: scale(1.05);
        }
        /* ✅ Modale détail */
        .detail-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .detail-modal {
          background: #fff;
          border-radius: 14px;
          max-width: 620px;
          width: 100%;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.25s ease;
        }
        .detail-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          background: linear-gradient(135deg, #4A90D9, #357ABD);
          color: #fff;
          border-radius: 14px 14px 0 0;
        }
        .detail-modal-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 700;
        }
        .detail-modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: #fff;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .detail-modal-close:hover {
          background: rgba(255, 255, 255, 0.35);
        }
        .detail-modal-body {
          padding: 20px 22px;
        }
        .detail-section {
          margin-bottom: 18px;
        }
        .detail-section-title {
          font-size: 12px;
          font-weight: 700;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 2px solid #eef2f7;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
        }
        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #eef2f7;
        }
        .detail-item-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 144, 217, 0.12);
          color: #357ABD;
          border-radius: 6px;
        }
        .detail-item-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          flex: 1;
        }
        .detail-item-label {
          font-size: 10.5px;
          color: #7f8c8d;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .detail-item-value {
          font-size: 13.5px;
          color: #1a1a2e;
          font-weight: 600;
          word-break: break-word;
        }
        .detail-modal-footer {
          padding: 14px 22px;
          border-top: 1px solid #eef2f7;
          display: flex;
          justify-content: flex-end;
        }
        .detail-modal-footer button {
          padding: 9px 22px;
          background: #4A90D9;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .detail-modal-footer button:hover {
          background: #357ABD;
        }
        @media (max-width: 600px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <MiniSidebar />
      <main className="contenu-paiement">
        {notification && (() => {
          const NotifIcon = notificationIcon[notification.type] || Info;
          return (
            <div
              className={`notif notif-${notification.type}`}
              onClick={notification.onClick}
              role={notification.onClick ? 'button' : undefined}
              tabIndex={notification.onClick ? 0 : undefined}
            >
              <NotifIcon size={18} className="notif-icon" />
              <span className="notif-message">{notification.message}</span>
              <button
                type="button"
                className="notif-close"
                onClick={(e) => { e.stopPropagation(); setNotification(null); }}
                aria-label={t('Fermer la notification', 'Hidio', 'Close')}
              >
                <X size={16} />
              </button>
            </div>
          );
        })()}

        <div className="paiement-container">
          <header className="paiement-header">
            <div className="header-left">
              <button type="button" className="btn-retour" onClick={handleRetour}>
                <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
              </button>
              <div className="header-title-group">
                <span className="header-icon-badge"><Wallet size={20} /></span>
                <div className="header-title">
                  <h1>{t('Gestion des paiements', 'Fitantanana ny fandoavana', 'Payment Management')}</h1>
                  <p className="header-subtitle">
                    {t(
                      'Suivez et gérez les paiements mensuels de vos usagers',
                      'Araho sy tantano ny fandoavana isam-bolana',
                      'Track and manage your users monthly payments'
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="header-right">
              <button
                type="button"
                className="btn-other-ajout"
                onClick={() => navigate('/other-ajout')}
                title={t(
                  'Ajouter un usager événementiel (CD, MP3, œuvres web...)',
                  'Hanampy mpampiasa hetsika',
                  'Add event user'
                )}
              >
                <Package size={16} /> {t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')}
              </button>
              <span className="header-badge">
                <Calendar size={14} /> {t('Année', 'Taona', 'Year')} {currentYear}
              </span>
            </div>
          </header>

          <div className="types-stats types-stats-6">
            {Object.keys(typeConfig).map((type) => {
              const Icon = typeConfig[type].icon;
              const isActive = selectedType === type;
              const count = type === 'other'
                ? otherUsagers.length
                : (stats?.[type]?.total || 0);
              const hasNew = type !== 'other' && nouveauxIds[type]?.length > 0;
              return (
                <button
                  type="button"
                  key={type}
                  className={`type-stat ${isActive ? 'active' : ''} ${type === 'other' ? 'type-stat-other' : ''}`}
                  onClick={() => handleTypeChange(type)}
                >
                  <span className="type-stat-icon"><Icon size={20} /></span>
                  <span className="type-stat-info">
                    <span className="type-stat-name">{typeConfig[type].label}</span>
                    <span className="type-stat-count">{count}</span>
                  </span>
                  {hasNew && <span className="type-stat-alert">{nouveauxIds[type].length}</span>}
                </button>
              );
            })}
          </div>

          <div className="filters">
            <div className="filters-left">
              <div className="filter-group">
                <MapPin size={16} className="filter-icon" />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="filter-select"
                >
                  <option value="tous">{t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}</option>
                  {regions.map(r => <option key={r.id} value={r.nom}>{r.nom}</option>)}
                </select>
              </div>

              {selectedType !== 'other' && anneesDisponibles.length > 0 && (
                <div className="filter-group">
                  <Calendar size={16} className="filter-icon" />
                  <select
                    value={filtreAnnee}
                    onChange={(e) => setFiltreAnnee(parseInt(e.target.value, 10))}
                    className="filter-select"
                  >
                    {anneesDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              <div className="filter-group search-group">
                <Search size={16} className="filter-icon" />
                <input
                  type="text"
                  placeholder={selectedType === 'other'
                    ? t('Rechercher un usager événementiel...', 'Hikaroka...', 'Search...')
                    : t('Rechercher (nom, demandeur, téléphone...)', 'Hikaroka...', 'Search...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="filters-right">
              {selectedType !== 'other' && (
                <>
                  {showOnlyNouveaux ? (
                    <button type="button" className="btn-secondary" onClick={() => setShowOnlyNouveaux(false)}>
                      <EyeOff size={16} /> {t('Tous les usagers', 'Rehetra', 'All users')}
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary" onClick={() => setShowOnlyNouveaux(true)}>
                      <Eye size={16} /> {t('Nouveaux uniquement', 'Vaovao', 'New only')}
                    </button>
                  )}
                </>
              )}
              <button type="button" className="btn-refresh" onClick={loadAllData}>
                <RefreshCw size={16} /> {t('Rafraîchir', 'Havaozy', 'Refresh')}
              </button>
            </div>
          </div>

          {selectedType === 'other' && !loadingOther && otherUsagers.length > 0 && (
            <div className="other-header-bar">
              <div className="other-header-info">
                <Package size={18} color="#357ABD" />
                <span>
                  <strong className="other-header-count">{otherUsagers.length}</strong>{' '}
                  {t('usager(s) événementiel(s)', 'mpampiasa hetsika', 'event user(s)')}
                  {' '}— {t('CD, MP3, Œuvres Web, Hologrammes, Vidéos...', 'CD, MP3...', 'CD, MP3...')}
                </span>
              </div>
              <button
                type="button"
                className="btn-other-add"
                onClick={() => navigate('/other-ajout')}
              >
                <Plus size={16} /> {t('Ajouter', 'Hanampy', 'Add')}
              </button>
            </div>
          )}

          <div className="table-wrapper">
            {loading ? (
              <div className="state-block">
                <Loader size={32} className="spinner" />
                <p>{t('Chargement des données...', 'Maka ny angona...', 'Loading data...')}</p>
              </div>
            ) : apiError && selectedType !== 'other' ? (
              <div className="state-block state-error">
                <AlertCircle size={28} />
                <p>{apiError}</p>
                <button type="button" className="btn-refresh" onClick={loadAllData}>
                  <RefreshCw size={16} /> {t('Rafraîchir', 'Havaozy', 'Refresh')}
                </button>
              </div>
            ) : selectedType === 'other' ? (
              renderOtherTable()
            ) : filteredUsagers.length === 0 ? (
              <div className="state-block">
                <FileText size={28} />
                <p>
                  {showOnlyNouveaux
                    ? t('Aucun nouvel usager en attente', 'Tsy misy vaovao', 'No new user pending')
                    : t('Aucun résultat trouvé', 'Tsy misy valiny', 'No result found')}
                </p>
                <button type="button" className="btn-refresh" onClick={loadAllData}>
                  <RefreshCw size={16} /> {t('Rafraîchir', 'Havaozy', 'Refresh')}
                </button>
              </div>
            ) : (
              <table className="paiement-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('Nom / Dénomination', 'Anarana', 'Name')}</th>
                    <th>{t('Demandeur', 'Mpangataka', 'Applicant')}</th>
                    <th>{t('Contact', 'Fifandraisana', 'Contact')}</th>
                    <th>{t('Détails', 'Antsipiriany', 'Details')}</th>
                    <th>{t('Pmt', 'Pmt', 'Pmt')} {filtreAnnee}</th>
                    <th>{t('Statut', 'Toe-javatra', 'Status')}</th>
                    <th>{t('Action', 'Hetsika', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsagers.map((u) => {
                    const isNew = nouveauxIds[selectedType]?.includes(u.id) || u.estNouveau;
                    const isLate = isEnRetard(u);

                    const moisPayes = getMoisPayesComplet(u, filtreAnnee);
                    const moisTries = [...moisPayes].sort((a, b) => a - b);
                    const affichageMoisPayes = moisTries.map(m => moisLabelsShort[m - 1]).join(', ');
                    const nbMoisPayes = moisTries.length;

                    return (
                      <tr key={u.id} className={`${isLate ? 'row-late' : ''} ${isNew ? 'row-new' : ''}`}>
                        <td data-label="ID">
                          <span className="id-cell">
                            #{String(u.id).padStart(3, '0')}
                            {isNew && <span className="tag tag-new">{t('Nouveau', 'Vaovao', 'New')}</span>}
                            {isLate && <span className="tag tag-late"><AlertTriangle size={12} /></span>}
                          </span>
                        </td>
                        <td data-label="Nom" className="name">
                          <strong>
                            {u.denomination || u.nom_evenement || u.organisateurs || t('Sans nom', 'Tsy misy anarana', 'No name')}
                          </strong>
                          {u.region && u.region !== 'N/A' && (
                            <div className="usager-sub"><MapPin size={12} /> {u.region}</div>
                          )}
                          {u.adresse || u.adresse_siege ? (
                            <div className="usager-sub">{u.adresse || u.adresse_siege}</div>
                          ) : null}
                        </td>
                        <td data-label="Demandeur">
                          <div className="demandeur-info">
                            <strong>{u.demandeur || u.representant_par || '-'}</strong>
                            {u.representant_nom && (
                              <div className="usager-sub">{t('Rep.', 'Mpisolo', 'Rep.')} {u.representant_nom}</div>
                            )}
                          </div>
                        </td>
                        <td data-label="Contact">
                          <div className="contact-info">
                            {u.telephone && <div className="usager-sub"><Phone size={12} /> {u.telephone}</div>}
                            {u.email && <div className="usager-sub"><Mail size={12} /> {u.email}</div>}
                          </div>
                        </td>

                        {/* ✅ BOUTON ŒIL DÉTAILS */}
                        <td data-label="Détails">
                          <button
                            type="button"
                            className="btn-eye"
                            onClick={() => setDetailUsager({ usager: u, type: selectedType })}
                            title={t('Voir les détails', 'Jereo ny antsipiriany', 'View details')}
                          >
                            <Eye size={16} />
                          </button>
                        </td>

                        <td data-label="Pmt">
                          <div className="pmt-info">
                            {nbMoisPayes >= 12 ? (
                              <>
                                <span style={{ fontWeight: 'bold', color: '#198754' }}>12/12 ✅</span>
                              </>
                            ) : nbMoisPayes > 0 ? (
                              <>
                                <span style={{ fontWeight: '600' }}>{nbMoisPayes}/12</span>
                                <span style={{ fontSize: '12px', color: '#0d6efd' }}> ({affichageMoisPayes})</span>
                              </>
                            ) : (
                              <span style={{ color: '#dc3545' }}>0/12</span>
                            )}
                            {u.montant_mensuel > 0 && (
                              <div className="pmt-montant">
                                {u.montant_mensuel.toLocaleString(locale)} Ar / {t('mois', 'volana', 'month')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Statut">{getStatusBadge(u)}</td>
                        <td data-label="Action">
                          <button
                            type="button"
                            className="btn-pay"
                            onClick={() => openPaymentModal(u)}
                          >
                            <CreditCard size={14} /> {t('Payer', 'Mandoa', 'Pay')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ✅ MODALE DÉTAIL USAGER */}
      {detailUsager && (() => {
        const { usager, type } = detailUsager;
        const infos = getFullInfo(usager, type);
        const TypeIcon = type === 'other'
          ? (OTHER_TYPE_ICONS[usager.type_usager] || Package)
          : (typeConfig[type]?.icon || Package);

        const typeLabel = type === 'other'
          ? (otherTypeLabels[usager.type_usager] || usager.type_usager)
          : (typeConfig[type]?.label || type);

        return (
          <div
            className="detail-modal-overlay"
            onClick={() => setDetailUsager(null)}
          >
            <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-header">
                <h3>
                  <TypeIcon size={20} />
                  {usager.denomination || usager.nom_evenement || t('Sans nom', 'Tsy misy anarana', 'No name')}
                </h3>
                <button
                  type="button"
                  className="detail-modal-close"
                  onClick={() => setDetailUsager(null)}
                  aria-label={t('Fermer', 'Hidio', 'Close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="detail-modal-body">
                {/* Section : Identification */}
                <div className="detail-section">
                  <div className="detail-section-title">
                    {t('Identification', 'Famantarana', 'Identification')}
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-item-icon"><Hash size={14} /></div>
                      <div className="detail-item-content">
                        <span className="detail-item-label">ID</span>
                        <span className="detail-item-value">#{String(usager.id).padStart(3, '0')}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-item-icon"><TypeIcon size={14} /></div>
                      <div className="detail-item-content">
                        <span className="detail-item-label">{t('Type', 'Karazana', 'Type')}</span>
                        <span className="detail-item-value">{typeLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section : Détails */}
                {infos.length > 0 ? (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      {t('Informations détaillées', 'Fampahalalana amin\'ny antsipiriany', 'Detailed information')}
                    </div>
                    <div className="detail-grid">
                      {infos.map((info, i) => {
                        const Icon = info.icon || Info;
                        return (
                          <div key={i} className="detail-item">
                            <div className="detail-item-icon"><Icon size={14} /></div>
                            <div className="detail-item-content">
                              <span className="detail-item-label">{info.label}</span>
                              <span className="detail-item-value">{info.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      {t('Informations détaillées', 'Fampahalalana', 'Information')}
                    </div>
                    <p style={{ color: '#7f8c8d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                      {t('Aucune information supplémentaire', 'Tsy misy fampahalalana fanampiny', 'No additional information')}
                    </p>
                  </div>
                )}

                {/* Section : Paiements */}
                <div className="detail-section">
                  <div className="detail-section-title">
                    {t('Paiements', 'Fandoavana', 'Payments')}
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-item-icon"><CalendarCheck size={14} /></div>
                      <div className="detail-item-content">
                        <span className="detail-item-label">{t('Mode', 'Fomba', 'Mode')}</span>
                        <span className="detail-item-value">
                          {usager.mode_paiement === 'mensuel'
                            ? t('Mensuel', 'Isam-bolana', 'Monthly')
                            : t('Unique', 'Indray mandeha', 'One-time')}
                        </span>
                      </div>
                    </div>
                    {usager.montant_mensuel > 0 && (
                      <div className="detail-item">
                        <div className="detail-item-icon"><DollarSign size={14} /></div>
                        <div className="detail-item-content">
                          <span className="detail-item-label">{t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}</span>
                          <span className="detail-item-value">{usager.montant_mensuel.toLocaleString(locale)} Ar</span>
                        </div>
                      </div>
                    )}
                    {usager.frais_dossier > 0 && (
                      <div className="detail-item">
                        <div className="detail-item-icon"><FileText size={14} /></div>
                        <div className="detail-item-content">
                          <span className="detail-item-label">{t('Frais dossier', 'Saram-pandraharahana', 'File fees')}</span>
                          <span className="detail-item-value">{usager.frais_dossier.toLocaleString(locale)} Ar</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-modal-footer">
                <button type="button" onClick={() => setDetailUsager(null)}>
                  {t('Fermer', 'Hidio', 'Close')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default GerePaiement;