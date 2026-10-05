// src/pages/TableauDB.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, DollarSign, MapPin, TrendingUp, TrendingDown,
  AlertCircle, RefreshCw, Activity, Target, Award,
  AlertTriangle, CheckCircle, Bell, PieChart,
  BarChart3, Clock, Home,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend,
} from 'recharts';
import '../styles/TableauDB.css';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';

// ============================================================
// ✅ RÈGLE UNIQUE DE CALCUL (identique à PayementChoix / BilanCards)
//    1. Un paiement compte s'il est "paye"
//    2. ET si :
//       - son annee === currentYear  OU
//       - son type_paiement === 'unique'  (OCC → toujours inclus, annee peut être NULL)
//    3. On somme UNIQUEMENT p.montant (déjà total réel en BD)
// ============================================================
const matchPaiementCourant = (paiement, currentYear) => {
  if (!paiement) return false;
  if (paiement.statut !== 'paye') return false;
  if (paiement.type_paiement === 'unique') return true;       // OCC
  return Number(paiement.annee) === currentYear;
};

// ============================================================
// 🎯 COMPOSANT
// ============================================================
const TableauDB = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================================
  // ✅ DONNÉES BRUTES (source unique de vérité)
  // ============================================================
  const [paiementsRaw, setPaiementsRaw] = useState([]);
  const [usagersRaw, setUsagersRaw] = useState([]);
  const [regionsRaw, setRegionsRaw] = useState([]);
  const [artistesCount, setArtistesCount] = useState(0);

  // Année en cours
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Couleurs graphiques
  const COLORS = useMemo(
    () => [
      '#00B4D8', '#0077B6', '#48CAE4', '#90E0EF',
      '#023E8A', '#03045E', '#4CC9F0', '#72EFDD',
    ],
    []
  );

  // ============================================================
  // 🌍 FORMATAGE SELON LA LANGUE
  // ============================================================
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const formatMontant = useCallback((val) => {
    if (val === null || val === undefined) return '0 Ar';
    return Math.round(val).toLocaleString(locale) + ' Ar';
  }, [locale]);

  const formatNumber = useCallback((n) => {
    if (n === null || n === undefined) return '0';
    return Math.round(n).toLocaleString(locale);
  }, [locale]);

  // ============================================================
  // 📅 MOIS SELON LA LANGUE
  // ============================================================
  const moisLabels = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Fev', 'Mar', 'Apr', 'Mai', 'Jon',
              'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
            'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  // ============================================================
  // 📥 CHARGEMENT DES DONNÉES
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken') || '';
      const headers = { adminToken: token };

      const [paiementsRes, usagersRes, regionsRes] = await Promise.all([
        axios.get(`${API_URL}/paiements/tous`, { headers })
          .catch(() => ({ data: { success: false, paiements: [] } })),
        axios.get(`${API_URL}/usagers`, { headers })
          .catch(() => ({ data: [] })),
        axios.get(`${API_URL}/regions`, { headers })
          .catch(() => ({ data: { success: false, regions: [] } })),
      ]);

      // Paiements
      if (paiementsRes.data?.success) {
        setPaiementsRaw(paiementsRes.data.paiements || []);
      }

      // Usagers
      let usagers = [];
      const ud = usagersRes.data;
      if (Array.isArray(ud)) usagers = ud;
      else if (ud?.usagers && Array.isArray(ud.usagers)) usagers = ud.usagers;
      else if (ud?.data && Array.isArray(ud.data)) usagers = ud.data;
      setUsagersRaw(usagers);

      // Régions
      if (regionsRes.data?.success) {
        setRegionsRaw(regionsRes.data.regions || []);
      }

      // Artistes (OCC) — best effort
      try {
        const artistesRes = await axios.get(`${API_URL}/artistes`, { headers });
        if (Array.isArray(artistesRes.data)) setArtistesCount(artistesRes.data.length);
        else if (artistesRes.data?.artistes) setArtistesCount(artistesRes.data.artistes.length);
      } catch (e) { /* ignore */ }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || t('Erreur de chargement', 'Olana amin\'ny fakana', 'Loading error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // 📊 DONNÉES CALCULÉES — RÈGLE 390 000 Ar
  // ============================================================

  // 1) Paiements retenus : paye + (annee === currentYear OU unique)
  const paiementsCourants = useMemo(() => {
    return paiementsRaw.filter(p => matchPaiementCourant(p, currentYear));
  }, [paiementsRaw, currentYear]);

  // 2) Montant total (SOMME SIMPLE du champ `montant`)
  const montantGlobal = useMemo(() => {
    return paiementsCourants.reduce(
      (sum, p) => sum + (parseFloat(p.montant) || 0),
      0
    );
  }, [paiementsCourants]);

  // 3) Usagers payés (distincts)
  const usagersPayesSet = useMemo(() => {
    const set = new Set();
    for (const p of paiementsCourants) {
      set.add(`${p.usager_type}_${p.usager_id}`);
    }
    return set;
  }, [paiementsCourants]);

  const totalUsagersPayes = usagersPayesSet.size;
  const totalUsagers = usagersRaw.length;
  const tauxGlobal = totalUsagers > 0
    ? Math.round((totalUsagersPayes / totalUsagers) * 100)
    : 0;

  // 4) Nombre de quittances (lignes payées)
  const totalQuittances = paiementsCourants.length;

  // 5) Évolution mensuelle — recettes par mois
  const monthlyData = useMemo(() => {
    const moisData = {};
    for (let i = 1; i <= 12; i++) moisData[i] = 0;

    for (const p of paiementsCourants) {
      // OCC : on le met dans le mois de sa date_paiement (sinon 1)
      const mois = p.mois || (p.date_paiement ? new Date(p.date_paiement).getMonth() + 1 : 1);
      if (moisData[mois] !== undefined) {
        moisData[mois] += parseFloat(p.montant) || 0;
      }
    }

    return moisLabels.map((m, i) => ({
      mois: m,
      montant: moisData[i + 1] || 0,
    }));
  }, [paiementsCourants, moisLabels]);

  // 6) Répartition par type (montants)
  const typeMontants = useMemo(() => {
    const map = {
      hotel: 0,
      'grand-surface': 0,
      bus: 0,
      nightclub: 0,
      media: 0,
      occ: 0,
      other: 0,
    };

    for (const p of paiementsCourants) {
      let type = (p.usager_type || '').toLowerCase();
      if (type === 'autre') type = 'other';
      if (type === 'grand_surface') type = 'grand-surface';
      if (type === 'night_club' || type === 'night-club') type = 'nightclub';
      if (map[type] === undefined) map[type] = 0;
      map[type] += parseFloat(p.montant) || 0;
    }

    return map;
  }, [paiementsCourants]);

  // 7) Données pour le camembert (répartition usagers par type)
  const typeData = useMemo(() => {
    const labels = {
      hotel: t('Hôtel', 'Hotely', 'Hotel'),
      'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
      occ: t('OCC', 'OCC', 'OCC'),
      bus: t('Bus', 'Bus', 'Bus'),
      media: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'),
      nightclub: t('Night Club', 'Club alina', 'Night Club'),
      other: t('Autre', 'Hafa', 'Other'),
    };

    const counts = {
      hotel: 0, 'grand-surface': 0, occ: 0,
      bus: 0, media: 0, nightclub: 0, other: 0,
    };

    for (const p of paiementsCourants) {
      let type = (p.usager_type || '').toLowerCase();
      if (type === 'autre') type = 'other';
      if (type === 'grand_surface') type = 'grand-surface';
      if (type === 'night_club' || type === 'night-club') type = 'nightclub';
      if (counts[type] !== undefined) counts[type]++;
    }

    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([key, value]) => ({
        name: labels[key] || key,
        value,
        key,
      }));
  }, [paiementsCourants, t]);

  // 8) Régions
  const regionData = useMemo(() => {
    const map = new Map();

    for (const p of paiementsCourants) {
      const region = p.region || t('Non spécifiée', 'Tsy voafaritra', 'Not specified');
      if (!map.has(region)) map.set(region, { montant: 0, nbQuittances: 0 });
      const r = map.get(region);
      r.montant += parseFloat(p.montant) || 0;
      r.nbQuittances++;
    }

    return Array.from(map.entries())
      .map(([region, data]) => ({
        name: region,
        montant: data.montant,
        nbQuittances: data.nbQuittances,
      }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 8);
  }, [paiementsCourants, t]);

  // 9) Tendance simple (comparaison mois courant vs précédent)
  const tendance = useMemo(() => {
    const now = new Date();
    const moisActuel = now.getMonth() + 1;
    const moisPrec = moisActuel === 1 ? 12 : moisActuel - 1;

    const getMois = (m) => paiementsCourants
      .filter(p => {
        const mois = p.mois || (p.date_paiement ? new Date(p.date_paiement).getMonth() + 1 : 1);
        return mois === m;
      })
      .reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);

    const mActuel = getMois(moisActuel);
    const mPrec = getMois(moisPrec);

    if (mPrec === 0 && mActuel === 0) return { direction: 'stable', pourcentage: 0 };
    if (mPrec === 0) return { direction: 'croissance', pourcentage: 100 };

    const variation = ((mActuel - mPrec) / mPrec) * 100;
    return {
      direction: variation > 1 ? 'croissance' : variation < -1 ? 'décroissance' : 'stable',
      pourcentage: Math.round(Math.abs(variation)),
    };
  }, [paiementsCourants]);

  // 10) Alertes
  const alertes = useMemo(() => {
    const list = [];
    if (tauxGlobal < 50) {
      list.push({
        type: 'critique',
        titre: t('Taux de paiement faible', 'Taha ambany', 'Low payment rate'),
        message: `${tauxGlobal}% — ${t('objectif', 'tanjona', 'target')} : 70%`,
        priorite: 1,
        plan: [
          { etape: t('Relancer les usagers en retard', 'Manentana ny mpampiasa', 'Remind late users'), delai: '7j' },
        ],
      });
    }
    if (totalUsagers - totalUsagersPayes > 0) {
      list.push({
        type: 'warning',
        titre: t('Usagers sans paiement', 'Mpampiasa tsy nandoa', 'Users without payment'),
        message: `${totalUsagers - totalUsagersPayes} ${t('usagers en attente', 'mpampiasa miandry', 'pending users')}`,
        priorite: 2,
      });
    }
    return list;
  }, [tauxGlobal, totalUsagers, totalUsagersPayes, t]);

  // ============================================================
  // ⏳ ÉTATS
  // ============================================================
  if (loading) {
    return (
      <div className="tdb-loading">
        <div className="tdb-spinner"></div>
        <p>{t('Chargement du tableau de bord...', 'Maka ny tabilao...', 'Loading dashboard...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tdb-error">
        <AlertCircle size={48} />
        <h3>{t('Erreur de chargement', 'Olana amin\'ny fakana', 'Loading error')}</h3>
        <p>{error}</p>
        <button onClick={loadData} className="tdb-btn-primary">
          <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
        </button>
      </div>
    );
  }

  const showOverview = activeTab === 'overview';
  const showRegions = activeTab === 'regions';
  const showCategories = activeTab === 'categories';
  const showAlertes = activeTab === 'alertes';

  // Objectif
  const objectifTaux = 70;
  const totalRetard = Math.max(0, totalUsagers - totalUsagersPayes);

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <div className="tdb-container">
      {/* ========== HEADER ========== */}
      <header className="tdb-header">
        <div className="tdb-header-left">
          <div className="tdb-logo">
            <BarChart3 size={28} />
            <span>{t('OMDA Analytics', 'OMDA Analytics', 'OMDA Analytics')}</span>
          </div>
          <h1>
            {t('Tableau de Bord', 'Tabilao', 'Dashboard')}
            <span style={{ fontSize: 14, color: '#6c7a8d', marginLeft: 12, fontWeight: 400 }}>
              — {currentYear}
            </span>
          </h1>
        </div>

        <div className="tdb-header-right">
          <span className="tdb-update-time">
            <Clock size={14} />
            {lastUpdate.toLocaleString(locale)}
          </span>
          <button
            className="tdb-btn-icon"
            onClick={loadData}
            title={t('Actualiser', 'Havaozy', 'Refresh')}
          >
            <RefreshCw size={18} />
          </button>
          <button
          type="button"
          className="tdb-btn-icon"
          title={t('Notifications', 'Fampandrenesana', 'Notifications')}
          onClick={() => navigate('/notification_admin')}
          aria-label={t('Voir les notifications', 'Jereo ny fampandrenesana', 'View notifications')}
        >
          <Bell size={18} />
        </button>
          <button className="tdb-btn-icon" onClick={() => navigate('/profil')}>
            <Users size={18} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="tdb-btn-icon"
            title={t('Accueil', 'Fandraisana', 'Home')}
          >
            <Home size={16} />
          </button>
        </div>
      </header>

      {/* ========== ONGLETS ========== */}
      <div className="tdb-tabs">
        <button
          className={`tdb-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} />{' '}
          {t("Vue d'ensemble", 'Topi-maso ankapobeny', 'Overview')}
        </button>
        <button
          className={`tdb-tab ${activeTab === 'regions' ? 'active' : ''}`}
          onClick={() => setActiveTab('regions')}
        >
          <MapPin size={16} /> {t('Régions', 'Faritra', 'Regions')}
        </button>
        <button
          className={`tdb-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <PieChart size={16} /> {t('Catégories', 'Sokajy', 'Categories')}
        </button>
        <button
          className={`tdb-tab ${activeTab === 'alertes' ? 'active' : ''}`}
          onClick={() => setActiveTab('alertes')}
        >
          <AlertCircle size={16} /> {t('Alertes', 'Fampandrenesana', 'Alerts')}{' '}
          {alertes.length > 0 && `(${alertes.length})`}
        </button>
      </div>

      {/* ========== CONTENU ========== */}
      <main className="tdb-content">
        {/* === KPI CARDS === */}
        <section className="tdb-kpi-grid">
          <div className="tdb-kpi-card">
            <div className="tdb-kpi-icon blue">
              <Users size={20} />
            </div>
            <div className="tdb-kpi-info">
              <span className="tdb-kpi-label">
                {t('Usagers', 'Mpampiasa', 'Users')}
              </span>
              <span className="tdb-kpi-value">{formatNumber(totalUsagers)}</span>
              <span className="tdb-kpi-hint">
                {formatNumber(totalUsagersPayes)}{' '}
                {t('à jour', 'voaloa', 'up to date')}
              </span>
            </div>
          </div>

          <div className="tdb-kpi-card">
            <div className="tdb-kpi-icon green">
              <DollarSign size={20} />
            </div>
            <div className="tdb-kpi-info">
              <span className="tdb-kpi-label">
                {t('Collecte', 'Vola voaangona', 'Collection')}
              </span>
              <span className="tdb-kpi-value">
                {formatMontant(montantGlobal)}
              </span>
              <span className="tdb-kpi-hint">
                {t('Taux', 'Taham', 'Rate')} : {tauxGlobal}%
              </span>
            </div>
          </div>

          <div className="tdb-kpi-card">
            <div className="tdb-kpi-icon orange">
              <AlertTriangle size={20} />
            </div>
            <div className="tdb-kpi-info">
              <span className="tdb-kpi-label">
                {t('En retard', 'Tara', 'Late')}
              </span>
              <span className="tdb-kpi-value">{formatNumber(totalRetard)}</span>
              <span className="tdb-kpi-hint">
                {t('usagers', 'mpampiasa', 'users')}
              </span>
            </div>
          </div>

          <div className="tdb-kpi-card">
            <div className="tdb-kpi-icon purple">
              <Target size={20} />
            </div>
            <div className="tdb-kpi-info">
              <span className="tdb-kpi-label">
                {t('Objectif', 'Tanjona', 'Target')}
              </span>
              <span className="tdb-kpi-value">{objectifTaux}%</span>
              <div className="tdb-progress">
                <div
                  className="tdb-progress-fill"
                  style={{
                    width: `${Math.min((tauxGlobal / objectifTaux) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* === STATS TEXTE === */}
        <section className="tdb-stats-text">
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('Paiements', 'Fandoavana', 'Payments')}
            </span>
            <span className="tdb-stat-value">{formatNumber(totalQuittances)}</span>
          </div>
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('Quittances', 'Taratasy', 'Receipts')}
            </span>
            <span className="tdb-stat-value">{formatNumber(totalQuittances)}</span>
          </div>
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('En attente validation', 'Miandry fanamarinana', 'Pending validation')}
            </span>
            <span className="tdb-stat-value warning">0</span>
          </div>
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('Régions', 'Faritra', 'Regions')}
            </span>
            <span className="tdb-stat-value">{formatNumber(regionsRaw.length)}</span>
          </div>
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('Artistes', 'Mpihira', 'Artists')}
            </span>
            <span className="tdb-stat-value">{formatNumber(artistesCount)}</span>
          </div>
          <div className="tdb-stat-item">
            <span className="tdb-stat-label">
              {t('Utilisateurs actifs', 'Mpampiasa mavitrika', 'Active users')}
            </span>
            <span className="tdb-stat-value">{formatNumber(totalUsagers)}</span>
          </div>
        </section>

        {/* === TENDANCE === */}
        {tendance && showOverview && (
          <section className="tdb-tendance">
            <div
              className={`tdb-tendance-card ${
                tendance.direction === 'croissance'
                  ? 'positive'
                  : tendance.direction === 'décroissance'
                  ? 'negative'
                  : 'stable'
              }`}
            >
              <div className="tdb-tendance-icon">
                {tendance.direction === 'croissance' ? (
                  <TrendingUp size={24} />
                ) : tendance.direction === 'décroissance' ? (
                  <TrendingDown size={24} />
                ) : (
                  <Activity size={24} />
                )}
              </div>
              <div className="tdb-tendance-info">
                <span className="tdb-tendance-label">
                  {t('Tendance', 'Fironana', 'Trend')}
                </span>
                <span className="tdb-tendance-value">
                  {tendance.direction === 'croissance'
                    ? t('📈 En croissance', '📈 Mitombo', '📈 Growing')
                    : tendance.direction === 'décroissance'
                    ? t('📉 En baisse', '📉 Mihena', '📉 Decreasing')
                    : t('➡️ Stable', '➡️ Milamina', '➡️ Stable')}
                </span>
                <span className="tdb-tendance-detail">
                  {t('Variation', 'Fiovana', 'Variation')} :{' '}
                  {tendance.pourcentage || 0}%
                </span>
              </div>
            </div>
          </section>
        )}

        {/* === GRAPHIQUES === */}
        {showOverview && (
          <section className="tdb-charts">
            {/* Évolution mensuelle */}
            <div className="tdb-chart-card wide">
              <div className="tdb-chart-header">
                <h3>
                  <TrendingUp size={18} />{' '}
                  {t(
                    'Évolution mensuelle des recettes',
                    "Fivoaran'ny vola isam-bolana",
                    'Monthly revenue evolution'
                  )}
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F4FD" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => (v / 1000000).toFixed(1) + 'M'}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => formatMontant(value)} />
                  <Area
                    type="monotone"
                    dataKey="montant"
                    stroke="#00B4D8"
                    strokeWidth={2.5}
                    fill="url(#colorRecettes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition usagers par type */}
            <div className="tdb-chart-card">
              <div className="tdb-chart-header">
                <h3>
                  <PieChart size={18} />{' '}
                  {t('Répartition usagers', 'Fizarana mpampiasa', 'User distribution')}
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `${value} ${t('usagers', 'mpampiasa', 'users')}`
                    }
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    formatter={(value) => (
                      <span style={{ fontSize: '11px' }}>{value}</span>
                    )}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>

            {/* Top régions */}
            <div className="tdb-chart-card">
              <div className="tdb-chart-header">
                <h3>
                  <MapPin size={18} />{' '}
                  {t('Top régions', 'Faritra ambony', 'Top regions')}
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={regionData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8F4FD" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => formatMontant(value)} />
                  <Bar dataKey="montant" fill="#00B4D8" radius={[6, 6, 0, 0]} barSize={30}>
                    {regionData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* === SECTION RÉGIONS === */}
        {showRegions && (
          <section className="tdb-section">
            <h2 className="tdb-section-title">
              <MapPin size={20} />{' '}
              {t('Analyse par région', 'Fanadihadiana isaky ny faritra', 'Analysis by region')}
            </h2>
            <div className="tdb-regions-grid">
              {regionData.map((r, i) => (
                <div key={i} className="tdb-region-card">
                  <div className="tdb-region-header">
                    <span className="tdb-region-name">{r.name}</span>
                    <span className="tdb-region-badge">
                      {r.nbQuittances || 0}{' '}
                      {t('quittances', 'taratasy', 'receipts')}
                    </span>
                  </div>
                  <div className="tdb-region-montant">
                    {formatMontant(r.montant)}
                  </div>
                  <div className="tdb-region-bar">
                    <div
                      className="tdb-region-bar-fill"
                      style={{
                        width: `${Math.min(
                          (r.montant /
                            Math.max(...regionData.map((r2) => r2.montant))) *
                            100,
                          100
                        )}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === SECTION CATÉGORIES === */}
        {showCategories && (
          <section className="tdb-section">
            <h2 className="tdb-section-title">
              <PieChart size={20} />{' '}
              {t('Analyse par catégorie', 'Fanadihadiana isaky ny sokajy', 'Analysis by category')}
            </h2>
            <div className="tdb-categories-grid">
              {Object.entries(typeMontants).filter(([_, v]) => v > 0).map(([key, montant], i) => {
                const labels = {
                  hotel: t('Hôtel', 'Hotely', 'Hotel'),
                  'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
                  occ: t('OCC', 'OCC', 'OCC'),
                  bus: t('Bus', 'Bus', 'Bus'),
                  media: t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'),
                  nightclub: t('Night Club', 'Club alina', 'Night Club'),
                  other: t('Autre', 'Hafa', 'Other'),
                };
                const pct = montantGlobal > 0
                  ? Math.round((montant / montantGlobal) * 100)
                  : 0;

                return (
                  <div key={key} className="tdb-category-card">
                    <div className="tdb-category-header">
                      <span
                        className="tdb-category-dot"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="tdb-category-name">{labels[key] || key}</span>
                    </div>
                    <div className="tdb-category-stats">
                      <div>
                        <span className="tdb-category-label">
                          {t('Montant', 'Vola', 'Amount')}
                        </span>
                        <span className="tdb-category-value">{formatMontant(montant)}</span>
                      </div>
                      <div>
                        <span className="tdb-category-label">
                          {t('Part', 'Anjara', 'Share')}
                        </span>
                        <span className="tdb-category-value">{pct}%</span>
                      </div>
                    </div>
                    <div className="tdb-category-progress">
                      <div
                        className="tdb-category-progress-fill"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* === SECTION ALERTES === */}
        {showAlertes && (
          <section className="tdb-section">
            <h2 className="tdb-section-title">
              <AlertCircle size={20} />{' '}
              {t('Alertes et actions', 'Fampandrenesana sy hetsika', 'Alerts & actions')}
            </h2>
            {alertes.length > 0 ? (
              <div className="tdb-alertes-full">
                {alertes.map((a, i) => (
                  <div key={i} className={`tdb-alerte-full ${a.type}`}>
                    <div className="tdb-alerte-full-header">
                      <span className="tdb-alerte-full-badge">
                        {a.type === 'critique' ? '🔴' : a.type === 'warning' ? '🟡' : '🔵'}
                      </span>
                      <span className="tdb-alerte-full-titre">{a.titre}</span>
                      <span className="tdb-alerte-full-prio">
                        {t('Priorité', 'Laharam-pahamehana', 'Priority')} {a.priorite}
                      </span>
                    </div>
                    <p className="tdb-alerte-full-message">{a.message}</p>
                    {a.plan && a.plan.length > 0 && (
                      <div className="tdb-alerte-full-plan">
                        <span className="tdb-alerte-full-plan-label">
                          {t("Plan d'action", 'Tetikasa', 'Action plan')} :
                        </span>
                        <ul>
                          {a.plan.map((p, j) => (
                            <li key={j}>
                              <span className="tdb-plan-step">{j + 1}.</span>
                              {p.etape}
                              <span className="tdb-plan-delai">— {p.delai}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tdb-no-alertes">
                <CheckCircle size={48} />
                <h3>{t('Aucune alerte', 'Tsy misy fampandrenesana', 'No alerts')}</h3>
                <p>
                  {t(
                    'Tous les indicateurs sont dans les limites acceptables.',
                    'Milamina ny tarehimarika rehetra.',
                    'All indicators are within acceptable limits.'
                  )}
                </p>
              </div>
            )}
          </section>
        )}

        {/* === FOOTER === */}
        <footer className="tdb-footer">
          <span>
            © {new Date().getFullYear()} OMDA —{' '}
            {t(
              'Tableau de bord analytique',
              'Tabilao fanadihadiana',
              'Analytics dashboard'
            )}{' '}
            · {currentYear}
          </span>
          <span>
            {t('Données mises à jour', 'Nohavaozina', 'Data updated')} :{' '}
            {lastUpdate.toLocaleString(locale)}
          </span>
        </footer>
      </main>
    </div>
  );
};

export default TableauDB;