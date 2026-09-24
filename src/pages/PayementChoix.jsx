// src/pages/PayementChoix.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Lock, ArrowLeft, MapPin, Building2, Users,
  Coins, CreditCard, TrendingUp, DollarSign, X, Calendar, CalendarDays,
  Hotel, Store, Tv, Bus, Music, User, Clipboard, Target,
} from 'lucide-react';
import '../styles/gestionPaiement.css';
import MiniSidebar from '../components/MiniSidebar';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';

const PaiementChoix = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [regions, setRegions] = useState([]);
  const [usagersList, setUsagersList] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  // ❌ SUPPRIMÉ : const [loadingFinance, setLoadingFinance] = useState(false);
  const [montantTotalRecu, setMontantTotalRecu] = useState(0);
  const [filterContext, setFilterContext] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // États pour les cartes
  const [totalUsagersFiltres, setTotalUsagersFiltres] = useState(0);
  const [totalPayes, setTotalPayes] = useState(0);
  const [totalNonPayes, setTotalNonPayes] = useState(0);
  const [tauxPaiement, setTauxPaiement] = useState(0);

  // États pour le diagramme
  const [chartData, setChartData] = useState([]);
  const [chartMax, setChartMax] = useState(0);

  // États pour les filtres
  const [selectedRegion, setSelectedRegion] = useState('tous');
  const [selectedUsagerType, setSelectedUsagerType] = useState('tous');
  const [selectedMonth, setSelectedMonth] = useState('tous');
  const [selectedYear, setSelectedYear] = useState('tous');

  // ✅ Types d'usagers avec traductions inline
  const usagerTypes = useMemo(() => [
    { id: 'hotel',         labelKey: 'hotel',         icon: '🏨', label: t('Hôtel', 'Hotely', 'Hotel') },
    { id: 'grand-surface', labelKey: 'grandSurface',  icon: '🏪', label: t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface') },
    { id: 'media',         labelKey: 'media',         icon: '📻', label: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio') },
    { id: 'occ',           labelKey: 'occ',           icon: '📅', label: t('OCC', 'OCC', 'OCC') },
    { id: 'bus',           labelKey: 'bus',           icon: '🚌', label: t('Bus', 'Fiara fitateram-bahoaka', 'Bus') },
    { id: 'nightclub',     labelKey: 'nightclub',     icon: '🎵', label: t('Night club', 'Club alina', 'Night club') },
  ], [t]);

  // ✅ Mois traduits selon la langue
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

  const monthLabels = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  // ============================================================
  // ✅ CHARGEMENT INITIAL — un seul appel au premier montage
  // ============================================================
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // ✅ CHANGEMENT DE FILTRES — mise à jour silencieuse
  // Ne se déclenche qu'une fois que les usagers sont chargés
  // ============================================================
  useEffect(() => {
    if (usagersList.length > 0) {
      fetchFinanceData();
      fetchChartData();
      fetchPaymentHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedUsagerType, selectedMonth, selectedYear, usagersList.length]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchRegions(),
        fetchUsagers(),
        fetchAvailableYears(),
      ]);
      // ✅ fetchFinanceData / fetchChartData / fetchPaymentHistory
      //    sont déclenchés automatiquement par le 2e useEffect
      //    dès que usagersList est rempli
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
        console.log('📊 Stats reçues:', response.data.stats);
      }
      setError(null);
    } catch (err) {
      console.error('❌ Erreur fetchStats:', err);
      setError(t(
        'Erreur lors du chargement des statistiques',
        'Nisy olana tamin\'ny fakana statistika',
        'Error loading statistics'
      ));
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await axios.get(`${API_URL}/regions`);
      if (response.data.success) {
        setRegions(response.data.regions);
        console.log('📍 Régions chargées:', response.data.regions);
      }
    } catch (err) {
      console.error('❌ Erreur chargement régions:', err);
    }
  };

  const fetchUsagers = async () => {
    try {
      const response = await axios.get(`${API_URL}/usagers`);
      console.log('📥 Réponse brute /usagers:', response.data);

      let usagers = [];
      if (Array.isArray(response.data)) usagers = response.data;
      else if (response.data.usagers && Array.isArray(response.data.usagers)) usagers = response.data.usagers;
      else if (response.data.data && Array.isArray(response.data.data)) usagers = response.data.data;

      if (usagers.length > 0) {
        const normalizedUsagers = usagers.map(u => ({
          id: u.id,
          type_usager: u.type_usager || u.type || 'hotel',
          region: u.region || 'N/A',
          denomination: u.denomination || u.nom || t('Sans nom', 'Tsy misy anarana', 'No name'),
          telephone: u.telephone || '',
          email: u.email || '',
          created_at: u.created_at || new Date().toISOString(),
        }));
        setUsagersList(normalizedUsagers);
        console.log(`👥 ${normalizedUsagers.length} usagers chargés et normalisés`);
      } else {
        console.warn('⚠️ Aucun usager trouvé dans la réponse');
        setUsagersList([]);
      }
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
        const currentYear = new Date().getFullYear();
        if (response.data.annees.includes(currentYear)) {
          setSelectedYear(currentYear.toString());
        } else {
          setSelectedYear(response.data.annees[0].toString());
        }
      } else {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
        setAvailableYears(years);
        setSelectedYear(currentYear.toString());
      }
    } catch (err) {
      console.error('❌ Erreur chargement années:', err);
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
      setAvailableYears(years);
      setSelectedYear(currentYear.toString());
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/historique-complet`);
      if (response.data.success) {
        let history = response.data.historique || [];

        if (selectedRegion !== 'tous') history = history.filter(p => p.region === selectedRegion);
        if (selectedUsagerType !== 'tous') history = history.filter(p => p.usager_type === selectedUsagerType);

        if (selectedMonth !== 'tous' && selectedYear !== 'tous') {
          history = history.filter(p =>
            p.mois === parseInt(selectedMonth) && p.annee === parseInt(selectedYear)
          );
        } else if (selectedMonth !== 'tous') {
          history = history.filter(p => p.mois === parseInt(selectedMonth));
        } else if (selectedYear !== 'tous') {
          history = history.filter(p => p.annee === parseInt(selectedYear));
        }

        history.sort((a, b) => {
          const dateA = new Date(a.date_paiement || a.created_at);
          const dateB = new Date(b.date_paiement || b.created_at);
          return dateB - dateA;
        });

        setPaymentHistory(history);
      } else {
        setPaymentHistory([]);
      }
    } catch (err) {
      console.error('❌ Erreur chargement historique:', err);
      setPaymentHistory([]);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await axios.get(`${API_URL}/paiements/tous`);
      if (response.data.success) {
        const paiements = response.data.paiements || [];
        let paiementsFiltres = paiements.filter(p => p.statut === 'paye');

        if (selectedRegion !== 'tous') paiementsFiltres = paiementsFiltres.filter(p => p.region === selectedRegion);
        if (selectedUsagerType !== 'tous') paiementsFiltres = paiementsFiltres.filter(p => p.usager_type === selectedUsagerType);

        const yearToUse = selectedYear !== 'tous' ? parseInt(selectedYear) : new Date().getFullYear();
        const moisData = {};
        for (let i = 1; i <= 12; i++) moisData[i] = 0;

        for (const p of paiementsFiltres) {
          if (p.annee === yearToUse) {
            const mois = p.mois || 1;
            if (moisData[mois] !== undefined) moisData[mois] += parseFloat(p.montant) || 0;
          }
        }

        if (selectedMonth !== 'tous') {
          const moisSelectionne = parseInt(selectedMonth);
          for (let i = 1; i <= 12; i++) if (i !== moisSelectionne) moisData[i] = 0;
        }

        const chartDataArray = [];
        let maxValue = 0;

        for (let i = 1; i <= 12; i++) {
          const value = moisData[i] || 0;
          chartDataArray.push({
            mois: i,
            label: monthLabels[i - 1],
            value,
            isSelected: selectedMonth !== 'tous' ? i === parseInt(selectedMonth) : false,
          });
          if (value > maxValue) maxValue = value;
        }

        setChartData(chartDataArray);
        setChartMax(maxValue > 0 ? maxValue : 1);
      }
    } catch (err) {
      console.error('❌ Erreur chargement données diagramme:', err);
      const defaultData = [];
      for (let i = 1; i <= 12; i++) {
        defaultData.push({
          mois: i,
          label: monthLabels[i - 1],
          value: 0,
          isSelected: false,
        });
      }
      setChartData(defaultData);
      setChartMax(1);
    }
  };

  // ============================================================
  // ✅ fetchFinanceData — SILENCIEUX (plus de loadingFinance)
  // ============================================================
  const fetchFinanceData = async () => {
    try {
      let data = [];
      let context = `${t('Toutes les régions', 'Ny faritra rehetra', 'All regions')} / ${t('Tous les types', 'Ny karazana rehetra', 'All types')}`;

      const response = await axios.get(`${API_URL}/paiements/tous`);
      if (response.data.success) {
        const paiements = response.data.paiements || [];
        let paiementsFiltres = paiements.filter(p => p.statut === 'paye');

        if (selectedMonth !== 'tous' && selectedYear !== 'tous') {
          paiementsFiltres = paiementsFiltres.filter(p =>
            p.mois === parseInt(selectedMonth) && p.annee === parseInt(selectedYear)
          );
        } else if (selectedMonth !== 'tous') {
          paiementsFiltres = paiementsFiltres.filter(p => p.mois === parseInt(selectedMonth));
        } else if (selectedYear !== 'tous') {
          paiementsFiltres = paiementsFiltres.filter(p => p.annee === parseInt(selectedYear));
        }

        if (selectedRegion !== 'tous') {
          paiementsFiltres = paiementsFiltres.filter(p => p.region === selectedRegion);
        }

        const usagersPayesMap = new Map();
        for (const p of paiementsFiltres) {
          const key = `${p.usager_id}-${p.usager_type}`;
          if (!usagersPayesMap.has(key)) {
            usagersPayesMap.set(key, {
              usager_id: p.usager_id,
              usager_type: p.usager_type,
              montant_total: 0,
              region: p.region || t('Non spécifiée', 'Tsy voafaritra', 'Not specified'),
            });
          }
          const usager = usagersPayesMap.get(key);
          usager.montant_total += parseFloat(p.montant) || 0;
        }

        const payesCount = usagersPayesMap.size;

        let usagersFiltres = [...usagersList];
        if (selectedRegion !== 'tous') usagersFiltres = usagersFiltres.filter(u => u.region === selectedRegion);
        if (selectedUsagerType !== 'tous') usagersFiltres = usagersFiltres.filter(u => u.type_usager === selectedUsagerType);

        const totalUsagersFiltresLocal = usagersFiltres.length;
        const nonPayesCount = Math.max(0, totalUsagersFiltresLocal - payesCount);
        const taux = totalUsagersFiltresLocal > 0 ? Math.round((payesCount / totalUsagersFiltresLocal) * 100) : 0;

        setTotalUsagersFiltres(totalUsagersFiltresLocal);
        setTotalPayes(payesCount);
        setTotalNonPayes(nonPayesCount);
        setTauxPaiement(taux);

        let montantTotal = 0;
        for (const [, usager] of usagersPayesMap) montantTotal += usager.montant_total;
        setMontantTotalRecu(montantTotal);

        context = `${selectedRegion !== 'tous' ? `${t('Région', 'Faritra', 'Region')}: ${selectedRegion}, ` : t('Toutes les régions', 'Ny faritra rehetra', 'All regions') + ', '}${selectedMonth !== 'tous' ? monthNames[parseInt(selectedMonth) - 1] : t('Tous les mois', 'Ny volana rehetra', 'All months')} ${selectedYear !== 'tous' ? selectedYear : t('Toutes les années', 'Ny taona rehetra', 'All years')}`;
        setFilterContext(context);

        data = usagerTypes.map(type => {
          const typeUsagers = usagersFiltres.filter(u => u.type_usager === type.id);
          const typeTotal = typeUsagers.length;
          let typePayes = 0;
          let typeMontant = 0;

          for (const [, usager] of usagersPayesMap) {
            if (usager.usager_type === type.id) {
              typePayes++;
              typeMontant += usager.montant_total;
            }
          }

          return {
            type: type.id,
            label: type.label,
            totalUsagers: typeTotal,
            usagersAvecPaiement: typePayes,
            usagersSansPaiement: Math.max(0, typeTotal - typePayes),
            montantTotalPaye: typeMontant,
            details: [],
          };
        });

        for (const typeData of data) {
          const typePayesMap = new Map();
          for (const [, usager] of usagersPayesMap) {
            if (usager.usager_type === typeData.type) {
              const regionKey = usager.region || t('Non spécifiée', 'Tsy voafaritra', 'Not specified');
              if (!typePayesMap.has(regionKey)) typePayesMap.set(regionKey, { montant: 0, count: 0 });
              const regionData = typePayesMap.get(regionKey);
              regionData.montant += usager.montant_total;
              regionData.count++;
            }
          }

          for (const [region, regionData] of typePayesMap) {
            typeData.details.push({
              region,
              montant_total: regionData.montant,
              nombre_usagers: regionData.count,
            });
          }
        }
      }

      setFinanceData(data);
    } catch (err) {
      console.error('❌ Erreur chargement données financières:', err);
      if (stats) {
        let totalUsagers = 0;
        let totalPayesLocal = 0;
        let totalRecuLocal = 0;

        const dataTemp = usagerTypes.map(type => {
          const typeStats = stats[type.id] || { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 };
          totalUsagers += typeStats.total || 0;
          totalPayesLocal += typeStats.totalPayes || 0;
          totalRecuLocal += typeStats.montantTotal || 0;

          return {
            type: type.id,
            label: type.label,
            totalUsagers: typeStats.total || 0,
            usagersAvecPaiement: typeStats.totalPayes || 0,
            usagersSansPaiement: typeStats.nonPayes || 0,
            montantTotalPaye: typeStats.montantTotal || 0,
            details: [],
          };
        });

        setFinanceData(dataTemp);
        setMontantTotalRecu(totalRecuLocal);
        setTotalUsagersFiltres(totalUsagers);
        setTotalPayes(totalPayesLocal);
        setTotalNonPayes(Math.max(0, totalUsagers - totalPayesLocal));
        setTauxPaiement(totalUsagers > 0 ? Math.round((totalPayesLocal / totalUsagers) * 100) : 0);
      }
    }
    // ✅ Pas de finally — pas de setLoadingFinance
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    try {
      const response = await axios.post(`${API_URL}/admin/verify`, { password: adminPassword });
      if (response.data.success) {
        setShowAdminModal(false);
        setAdminPassword('');
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminRole', response.data.role || 'daf');
        navigate('/gere-payer');
      } else {
        setAdminError(t('Mot de passe incorrect', 'Diso ny kaody', 'Incorrect password'));
      }
    } catch (err) {
      setAdminError(t('Erreur de vérification', 'Nisy olana tamin\'ny fanamarinana', 'Verification error'));
      console.error(err);
    }
  };

  const handlePrintPDF = () => window.print();

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale);
  }, [locale]);

  const getTypeLabel = (typeId) => {
    const type = usagerTypes.find(x => x.id === typeId);
    return type ? type.label : typeId;
  };

  const getCorrectedStats = (typeId) => {
    const typeStats = stats?.[typeId] || { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 };
    if (typeStats.nonPayes < 0) typeStats.nonPayes = 0;
    return typeStats;
  };

  const handleRetour = () => navigate('/dashboard');

  const getPeriodLabel = () => {
    if (selectedMonth === 'tous' && selectedYear === 'tous') {
      return t('Toutes périodes', 'Ny vanim-potoana rehetra', 'All periods');
    } else if (selectedMonth === 'tous') {
      return `${t('Année', 'Taona', 'Year')} ${selectedYear}`;
    } else if (selectedYear === 'tous') {
      return `${t('Mois de', 'Volan\'ny', 'Month of')} ${monthNames[parseInt(selectedMonth) - 1]}`;
    }
    return `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;
  };

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="payment-loading">
          <div className="spinner"></div>
          <p>{t('Chargement des données financières...', 'Maka ny angona ara-bola...', 'Loading financial data...')}</p>
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
            {t('Réessayer', 'Andramo indray', 'Retry')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <MiniSidebar />
      <div className="payment-container">
        {/* En-tête */}
        <div className="payment-header">
          <div className="header-left">
            <h1>
              <BarChart3 className="header-icon" size={28} style={{ marginRight: '8px' }} />
              {t('Tableau de Bord Financier', 'Tabilaom-bola', 'Financial Dashboard')}
            </h1>
            <p className="header-subtitle">
              {t('Suivi des paiements des usagers', 'Fanaraha-maso ny fandoavana', 'User payment tracking')}
            </p>
          </div>
          <div className="header-actions">
            <button onClick={handlePrintPDF} className="btn-pdf">
              <FileText size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Aperçu PDF', 'Topi-drakitra PDF', 'PDF Preview')}
            </button>
            <button onClick={() => setShowAdminModal(true)} className="btn-gestion">
              <Lock size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Gestion des paiements', 'Fitantanana ny fandoavana', 'Payment Management')}
            </button>
            <button className="btn-retour" onClick={handleRetour}>
              <ArrowLeft size={18} style={{ marginRight: '6px' }} />{' '}
              {t('Retour', 'Hiverina', 'Back')}
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="filters-section">
          <div className="filters-left">
            <div className="filter-group">
              <label>
                <MapPin size={16} style={{ marginRight: '4px' }} />{' '}
                {t('Région', 'Faritra', 'Region')}
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="filter-select"
              >
                <option value="tous">{t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}</option>
                {regions.map(region => (
                  <option key={region.id} value={region.nom}>{region.nom}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>
                <Building2 size={16} style={{ marginRight: '4px' }} />{' '}
                {t("Type d'usager", 'Karazana mpampiasa', 'User type')}
              </label>
              <select
                value={selectedUsagerType}
                onChange={(e) => setSelectedUsagerType(e.target.value)}
                className="filter-select"
              >
                <option value="tous">{t('Tous les types', 'Ny karazana rehetra', 'All types')}</option>
                {usagerTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.icon} {type.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="filters-right">
            <div className="filter-group">
              <label>
                <Calendar size={16} style={{ marginRight: '4px' }} />{' '}
                {t('Mois', 'Volana', 'Month')}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-select"
              >
                <option value="tous">{t('Tous les mois', 'Ny volana rehetra', 'All months')}</option>
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>
                <CalendarDays size={16} style={{ marginRight: '4px' }} />{' '}
                {t('Année', 'Taona', 'Year')}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="filter-select"
              >
                <option value="tous">{t('Toutes les années', 'Ny taona rehetra', 'All years')}</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          {/* ❌ SUPPRIMÉ : {loadingFinance && <span className="loading-spinner"><Clock size={20} /></span>} */}
        </div>

        {/* Cartes de synthèse */}
        <div className="summary-cards">
          <div className="summary-card total-usagers">
            <div className="card-icon"><Users size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Total Usagers', 'Isan\'ny mpampiasa', 'Total Users')}</span>
              <span className="card-value">{totalUsagersFiltres}</span>
              <span className="card-sub-label">
                {selectedRegion !== 'tous'
                  ? `${t('Région', 'Faritra', 'Region')}: ${selectedRegion}`
                  : t('Toutes régions', 'Ny faritra rehetra', 'All regions')}
                {selectedUsagerType !== 'tous' &&
                  ` • ${usagerTypes.find(t2 => t2.id === selectedUsagerType)?.label || ''}`}
              </span>
            </div>
          </div>

          <div className="summary-card total-payes">
            <div className="card-icon"><Coins size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Total Payés', 'Efa nandoa', 'Total Paid')}</span>
              <span className="card-value">{totalPayes}</span>
              <span className="card-sub-label">
                {t('Usagers avec paiement', 'Mpampiasa nandoa', 'Users with payment')}
              </span>
            </div>
          </div>

          <div className="summary-card total-non-payes">
            <div className="card-icon"><CreditCard size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Non Payés', 'Tsy nandoa', 'Unpaid')}</span>
              <span className="card-value">{totalNonPayes}</span>
              <span className="card-sub-label">
                {selectedMonth !== 'tous' ? monthNames[parseInt(selectedMonth) - 1] : t('Tous les mois', 'Ny volana rehetra', 'All months')}
                {selectedYear !== 'tous' && ` ${selectedYear}`}
              </span>
            </div>
          </div>

          <div className="summary-card taux-paiement">
            <div className="card-icon"><TrendingUp size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Taux de Paiement', 'Tahan\'ny fandoavana', 'Payment Rate')}</span>
              <span className="card-value">{tauxPaiement}%</span>
              <span className="card-sub-label">
                {totalUsagersFiltres > 0
                  ? `${totalPayes}/${totalUsagersFiltres} ${t('payés', 'nandoa', 'paid')}`
                  : t('Aucun usager', 'Tsy misy mpampiasa', 'No user')}
              </span>
            </div>
          </div>

          <div className="summary-card montant-recu">
            <div className="card-icon"><DollarSign size={24} /></div>
            <div className="card-content">
              <span className="card-label">{t('Montant Reçu', 'Vola voaray', 'Amount Received')}</span>
              <span className="card-value montant-recu-value">
                {montantTotalRecu.toLocaleString(locale)} Ar
              </span>
              <span className="card-sub-label">{filterContext}</span>
            </div>
          </div>
        </div>

        {/* 6 usagers sur une ligne */}
        <div className="usagers-stats-row">
          {usagerTypes.map(type => {
            if (selectedUsagerType !== 'tous' && selectedUsagerType !== type.id) return null;

            const typeStats = getCorrectedStats(type.id);
            const financeType = financeData?.find(f => f.type === type.id) || {
              totalUsagers: 0,
              usagersAvecPaiement: 0,
              usagersSansPaiement: 0,
              montantTotalPaye: 0,
              details: [],
            };

            const total = financeType.totalUsagers || typeStats.total || 0;
            const payes = financeType.usagersAvecPaiement || typeStats.totalPayes || 0;
            const nonPayes = Math.max(0, financeType.usagersSansPaiement || typeStats.nonPayes || 0);
            const montant = financeType.montantTotalPaye || typeStats.montantTotal || 0;
            const taux = total > 0 ? Math.round((payes / total) * 100) : 0;

            let TypeIcon = Hotel;
            if (type.id === 'grand-surface') TypeIcon = Store;
            else if (type.id === 'media') TypeIcon = Tv;
            else if (type.id === 'occ') TypeIcon = Calendar;
            else if (type.id === 'bus') TypeIcon = Bus;
            else if (type.id === 'nightclub') TypeIcon = Music;

            return (
              <div key={type.id} className="usager-stat-card">
                <div className="usager-stat-header">
                  <span className="usager-icon"><TypeIcon size={20} /></span>
                  <span className="usager-label">{type.label}</span>
                </div>
                <div className="usager-stat-body">
                  <div className="usager-stat-item">
                    <span className="usager-stat-label">{t('Total', 'Totaly', 'Total')}</span>
                    <span className="usager-stat-value">{total}</span>
                  </div>
                  <div className="usager-stat-item">
                    <span className="usager-stat-label">{t('Payés', 'Nandoa', 'Paid')}</span>
                    <span className="usager-stat-value success">{payes}</span>
                  </div>
                  <div className="usager-stat-item">
                    <span className="usager-stat-label">{t('Non Payés', 'Tsy nandoa', 'Unpaid')}</span>
                    <span className="usager-stat-value danger">{nonPayes}</span>
                  </div>
                  <div className="usager-stat-item montant-item">
                    <span className="usager-stat-label">{t('Montant', 'Vola', 'Amount')}</span>
                    <span className="usager-stat-value montant-value">
                      {montant.toLocaleString(locale)} Ar
                    </span>
                  </div>
                  <div className="usager-progress">
                    <div className="usager-progress-bar">
                      <div className="usager-progress-fill" style={{ width: `${taux}%` }} />
                    </div>
                    <span className="usager-progress-label">
                      {taux}% {t('payé', 'voaloa', 'paid')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Régions */}
        <div className="regions-section">
          <h2 className="section-title">
            <TrendingUp size={20} className="section-icon" style={{ marginRight: '8px' }} />
            {t('Aperçu par Région', 'Topi-tsipika isaky ny faritra', 'Overview by Region')}
            {selectedRegion !== 'tous' && (
              <span className="filter-badge">
                {t('Filtré', 'Voasivana', 'Filtered')}: {selectedRegion}
              </span>
            )}
            {selectedUsagerType !== 'tous' && (
              <span className="filter-badge">
                {t('Type', 'Karazana', 'Type')}: {usagerTypes.find(t2 => t2.id === selectedUsagerType)?.label || ''}
              </span>
            )}
            <span className="filter-badge" style={{ backgroundColor: '#2980b9', color: '#fff' }}>
              {getPeriodLabel()}
            </span>
          </h2>
          <div className="regions-grid">
            <div className="region-card region-total">
              <div className="region-header">
                <span className="region-name">
                  {t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}
                </span>
                <span className="region-total-amount">
                  {montantTotalRecu.toLocaleString(locale)} Ar
                </span>
              </div>
              <div className="region-stats">
                <span>{t('Usagers', 'Mpampiasa', 'Users')}: {totalUsagersFiltres}</span>
                <span>{t('Taux', 'Taha', 'Rate')}: {tauxPaiement}%</span>
                <span>{t('Reçu', 'Voaray', 'Received')}: {montantTotalRecu.toLocaleString(locale)} Ar</span>
              </div>
            </div>
            {regions.map(region => {
              if (selectedRegion !== 'tous' && selectedRegion !== region.nom) return null;

              let regionMontant = 0;
              let regionUsagers = 0;

              if (financeData) {
                for (const type of financeData) {
                  if (type.details) {
                    for (const detail of type.details) {
                      if (detail.region === region.nom) {
                        regionMontant += detail.montant_total || 0;
                        regionUsagers += detail.nombre_usagers || 0;
                      }
                    }
                  }
                }
              }

              return (
                <div key={region.id} className="region-card">
                  <div className="region-header">
                    <span className="region-name">{region.nom}</span>
                    <span className="region-amount">
                      {regionMontant.toLocaleString(locale)} Ar
                    </span>
                  </div>
                  <div className="region-stats">
                    <span>{t('Usagers', 'Mpampiasa', 'Users')}: {regionUsagers}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="payment-footer">
          <p>© 2026 OMDA - {t('Gestion Financière', 'Fitantanana ara-bola', 'Financial Management')}</p>
          <p>
            {t('Dernière mise à jour', 'Fanavaozana farany', 'Last update')}:{' '}
            {new Date().toLocaleDateString(locale)}
          </p>
        </div>
      </div>

      {/* Modal Admin */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal">
            <button
              className="modal-close"
              onClick={() => {
                setShowAdminModal(false);
                setAdminPassword('');
                setAdminError('');
              }}
            >
              <X size={20} />
            </button>
            <div className="modal-header">
              <span className="modal-icon"><Lock size={24} /></span>
              <h2>{t('Accès Gestion des Paiements', 'Fidirana amin\'ny fitantanana', 'Payment Management Access')}</h2>
              <p>
                {t(
                  "Veuillez entrer votre code d'authentification (DAF)",
                  "Ampidiro ny kaody fanamarinana (DAF)",
                  'Please enter your authentication code (DAF)'
                )}
              </p>
            </div>
            <form onSubmit={handleAdminLogin} className="admin-form">
              <input
                type="password"
                placeholder={t('Code à 4 chiffres', 'Kaody 4 isa', '4-digit code')}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                maxLength={4}
                pattern="[0-9]{4}"
                className="admin-input"
                autoFocus
              />
              {adminError && <p className="error-message">{adminError}</p>}
              <button type="submit" className="btn-admin-login">
                <Lock size={18} style={{ marginRight: '6px' }} />{' '}
                {t("Vérifier l'accès", 'Hamarino ny fidirana', 'Verify access')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementChoix;