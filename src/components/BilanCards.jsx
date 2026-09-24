// ============================================================
// COMPOSANT : BilanCards.jsx (version finale — année en cours)
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  DollarSign, Users, Calendar, TrendingUp, PieChart,
  BarChart, Activity, AlertTriangle, Layers, Plus, Eye,
  Bot, Sparkles, Zap, Brain, Cpu
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';

const BilanCards = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const formatNumber = useCallback((value) => {
    if (value === undefined || value === null) return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString(locale);
  }, [locale]);

  // ✅ Année en cours (2026 par défaut)
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // ============================================================
  // STATE
  // ============================================================
  const [stats, setStats] = useState(null);
  const [paiementsRaw, setPaiementsRaw] = useState([]);
  const [usagersRaw, setUsagersRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const headers = { adminToken: token };

        const [statsRes, paiementsRes, usagersRes] = await Promise.all([
          axios.get(`${API_URL}/paiements/stats`, { headers }).catch(() => ({ data: { success: false } })),
          axios.get(`${API_URL}/paiements/tous`, { headers }).catch(() => ({ data: { success: false, paiements: [] } })),
          axios.get(`${API_URL}/usagers`, { headers }).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        if (statsRes.data?.success) {
          setStats(statsRes.data.stats);
        }

        if (paiementsRes.data?.success) {
          setPaiementsRaw(paiementsRes.data.paiements || []);
        }

        let usagers = [];
        const ud = usagersRes.data;
        if (Array.isArray(ud)) usagers = ud;
        else if (ud?.usagers && Array.isArray(ud.usagers)) usagers = ud.usagers;
        else if (ud?.data && Array.isArray(ud.data)) usagers = ud.data;
        setUsagersRaw(usagers);
      } catch (error) {
        console.error('❌ Erreur chargement bilan:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ============================================================
  // ✅ CALCULS — UNIQUEMENT L'ANNÉE EN COURS
  //    Filtre : statut === 'paye' ET annee === currentYear
  // ============================================================

  // 1) Filtrer : paye + année en cours
  const paiementsPayes = useMemo(() => {
    return paiementsRaw.filter(p =>
      p.statut === 'paye' &&
      Number(p.annee) === currentYear
    );
  }, [paiementsRaw, currentYear]);

  // 2) ✅ Montant total = SUM(montant) UNIQUEMENT, pour l'année en cours
  const totalMontant = useMemo(() => {
    return paiementsPayes.reduce(
      (sum, p) => sum + (parseFloat(p.montant) || 0),
      0
    );
  }, [paiementsPayes]);

  // 3) Usagers payés (distincts) — clé composite type_id
  const usagersPayesSet = useMemo(() => {
    const set = new Set();
    for (const p of paiementsPayes) {
      set.add(`${p.usager_type}_${p.usager_id}`);
    }
    return set;
  }, [paiementsPayes]);

  const totalPayes = usagersPayesSet.size;

  // 4) Total usagers
  const totalUsagers = usagersRaw.length;

  // 5) Non payés (pour l'année en cours)
  const enAttente = Math.max(0, totalUsagers - totalPayes);

  // ============================================================
  // ✅ RÉPARTITION PAR CATÉGORIE (année en cours uniquement)
  // ============================================================
  const typeColors = {
    hotel: '#E53935',
    'grand-surface': '#4CAF50',
    bus: '#9E9E9E',
    nightclub: '#E91E63',
    media: '#9C27B0',
    occ: '#00BCD4',
    other: '#FF9800',
  };

  const typeLabels = useMemo(() => ({
    hotel:           t('Hôtel',          'Trano fandraisam-bahiny',      'Hotel'),
    'grand-surface': t('Grande Surface', 'Trano fivarotana lehibe',      'Supermarket'),
    bus:             t('Bus',            'Fiarakodia',                   'Bus'),
    nightclub:       t('Night Club',     'Kliobina alina',               'Night Club'),
    media:           t('Média',          'Haino aman-jery',              'Media'),
    occ:             t('Occasionnelle',  'Tsindraindray',                'Occasional'),
    other:           t('Autre',          'Hafa',                         'Other'),
  }), [t]);

  const legendOrder = useMemo(
    () => ['bus', 'grand-surface', 'hotel', 'media', 'nightclub', 'occ', 'other'],
    []
  );

  // ✅ Répartition : on somme UNIQUEMENT le champ `montant` (année en cours)
  const montantsParType = useMemo(() => {
    const map = {};
    for (const key of legendOrder) map[key] = 0;

    for (const p of paiementsPayes) {
      let type = (p.usager_type || '').toLowerCase();
      if (type === 'autre') type = 'other';
      if (type === 'grand_surface') type = 'grand-surface';
      if (type === 'télé/radio' || type === 'tele-radio' || type === 'télé-radio') type = 'media';
      if (type === 'night_club' || type === 'night-club') type = 'nightclub';

      if (map[type] === undefined) map[type] = 0;
      map[type] += parseFloat(p.montant) || 0;
    }
    return map;
  }, [paiementsPayes, legendOrder]);

  const chartData = useMemo(() => {
    return legendOrder
      .filter(key => montantsParType[key] > 0)
      .map(key => ({
        name: typeLabels[key] || key,
        value: montantsParType[key] || 0,
        color: typeColors[key] || '#3d99f5',
        formattedValue: formatNumber(montantsParType[key] || 0),
      }));
  }, [montantsParType, legendOrder, typeLabels, formatNumber]);

  const COLORS = chartData.map(item => item.color);

  // ============================================================
  // TOOLTIP
  // ============================================================
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#fff',
          padding: '8px 14px',
          border: '1px solid #ddd',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: 13,
        }}>
          <strong>{data.name}</strong>
          <br />
          <span style={{ color: data.color, fontWeight: 'bold' }}>
            {formatNumber(data.value)} Ar
          </span>
        </div>
      );
    }
    return null;
  };

  // ============================================================
  // LÉGENDE PERSONNALISÉE
  // ============================================================
  const renderCustomLegend = (props) => {
    const { payload } = props;
    const firstRow = payload.slice(0, 4);
    const secondRow = payload.slice(4, 7);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        marginTop: '5px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {firstRow.map((entry, index) => (
            <div key={`row1-${index}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: '#555',
            }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: entry.color,
              }} />
              <span>{entry.value}</span>
            </div>
          ))}
        </div>

        {secondRow.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            {secondRow.map((entry, index) => (
              <div key={`row2-${index}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: '#555',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  backgroundColor: entry.color,
                }} />
                <span>{entry.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="bilan-container">
      {/* En-tête */}
      <div className="bilan-header">
        <h2>
          <PieChart size={24} strokeWidth={2} />
          {t('Bilan & Diagnostic', 'Famerenana sy Diagnostika', 'Assessment & Diagnosis')}
        </h2>
        <p className="bilan-sub">
          {loading
            ? t('Chargement...', 'Mandrindra...', 'Loading...')
            : `${totalUsagers} ${t('usagers', 'mpampiasa', 'users')} · ${totalPayes} ${t('paiements', 'fandoavana', 'payments')} · ${formatNumber(totalMontant)} Ar · ${t('Année', 'Taona', 'Year')} ${currentYear}`}
        </p>
      </div>

      <div className="bilan-grid">
        {/* Partie gauche : indicateurs et actions */}
        <div className="bilan-left">
          <div className="bilan-stats">
            <div className="bilan-stat-item">
              <span className="bilan-stat-icon"><Users size={16} /></span>
              <div>
                <div className="bilan-stat-number">{totalUsagers}</div>
                <div className="bilan-stat-label">{t('Usagers', 'Mpampiasa', 'Users')}</div>
              </div>
            </div>
            <div className="bilan-stat-item">
              <span className="bilan-stat-icon"><DollarSign size={16} /></span>
              <div>
                <div className="bilan-stat-number" style={{ fontSize: '16px' }}>
                  {formatNumber(totalMontant)} Ar
                </div>
                <div className="bilan-stat-label">
                  {t('Total collecté', 'Vola voangona', 'Total collected')}
                  {' · '}
                  {currentYear}
                </div>
              </div>
            </div>
            <div className="bilan-stat-item">
              <span className="bilan-stat-icon"><TrendingUp size={16} /></span>
              <div>
                <div className="bilan-stat-number">{totalPayes}</div>
                <div className="bilan-stat-label">
                  {t('Usagers payés', 'Mpampiasa nandoa', 'Paid users')}
                </div>
              </div>
            </div>
            <div className="bilan-stat-item">
              <span className="bilan-stat-icon"><AlertTriangle size={16} /></span>
              <div>
                <div className="bilan-stat-number">{enAttente}</div>
                <div className="bilan-stat-label">
                  {t('En attente', 'Miandry', 'Pending')}
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="bilan-actions">
            <button className="btn-primary" onClick={() => navigate('/tableau-db')}>
              <BarChart size={16} /> {t('Tableau de bord', 'Tabilao', 'Dashboard')}
            </button>

            <button
              className="btn-ia-diagnostic"
              onClick={() => navigate('/diagnostique')}
            >
              <Brain size={18} className="ia-icon" />
              {t('Analyse IA', 'Famakafakana IA', 'AI Analysis')}
              <Sparkles size={14} className="ia-sparkle" />
              <span className="ia-pulse-dot" />
            </button>
          </div>

          {/* Liens rapides */}
          <div className="bilan-links">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/facture-usager'); }}>
              <Eye size={13} /> {t('Voir les factures', 'Hijery ny faktiora', 'View invoices')}
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/gere-dossier'); }}>
              <Layers size={13} /> {t('Gestion des dossiers', 'Fitandremana ny rakitra', 'Folder management')}
            </a>
          </div>
        </div>

        {/* Partie droite : diagramme circulaire */}
        <div className="bilan-right">
          <h5>
            {t(
              'Répartition des montants par catégorie',
              'Fizarana ny vola araka ny sokajy',
              'Amount distribution by category'
            )}{' '}
            — {currentYear}
          </h5>
          {loading ? (
            <div className="chart-loading">
              {t('Chargement...', 'Mandrindra...', 'Loading...')}
            </div>
          ) : chartData.length > 0 ? (
            <div className="donut-container">
              <ResponsiveContainer width="100%" height={280}>
                <RePieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="42%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    content={renderCustomLegend}
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 5,
                      width: '100%',
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">
              {t('Aucune donnée disponible', 'Tsy misy data', 'No data available')}
              {' · '}
              {currentYear}
            </div>
          )}
        </div>
      </div>

      {/* ===== STYLES CSS INJECTÉS ===== */}
      <style>{`
        .btn-ia-diagnostic {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          background: linear-gradient(135deg, #4ba9f0, #2b7fd4);
          color: white;
          box-shadow: 0 3px 12px rgba(43, 127, 212, 0.25);
          position: relative;
          overflow: hidden;
          text-decoration: none;
        }

        .btn-ia-diagnostic:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(43, 127, 212, 0.35);
        }

        .btn-ia-diagnostic:active {
          transform: scale(0.97);
        }

        .btn-ia-diagnostic .ia-icon {
          stroke-width: 2.5;
        }

        .btn-ia-diagnostic::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 70%
          );
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .btn-ia-diagnostic:hover::before {
          animation-duration: 1.2s;
        }

        .btn-ia-diagnostic .ia-pulse-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 10px;
          height: 10px;
          background: #FFD700;
          border-radius: 50%;
          border: 2px solid white;
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }

        .btn-ia-diagnostic .ia-sparkle {
          animation: sparkle 2s infinite ease-in-out;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .bilan-stat-item {
          background: #f8fcff;
          border-radius: 10px;
          padding: 10px 14px;
          transition: all 0.3s ease;
          border: 1px solid rgba(43, 127, 212, 0.06);
        }

        .bilan-stat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: rgba(43, 127, 212, 0.12);
        }

        .bilan-stat-number {
          font-size: 20px;
          font-weight: 700;
          color: #1a3a5c;
          line-height: 1.2;
        }

        .bilan-stat-label {
          font-size: 12px;
          color: #7a8a9d;
          font-weight: 500;
          margin-top: 1px;
        }

        .bilan-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(43, 127, 212, 0.08);
          color: #2b7fd4;
          flex-shrink: 0;
        }

        .bilan-sub {
          font-size: 14px;
          color: #7a8a9d;
          margin: 0;
          padding-left: 36px;
          font-weight: 500;
        }

        .bilan-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .bilan-actions .btn-primary {
          padding: 7px 16px;
          font-size: 12px;
          border-radius: 25px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          border: none;
          text-decoration: none;
          background: linear-gradient(135deg, #4ba9f0, #2b7fd4);
          color: white;
        }

        .bilan-actions .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(43, 127, 212, 0.3);
        }

        .bilan-links {
          display: flex;
          gap: 16px;
          padding: 6px 2px;
          flex-wrap: wrap;
        }

        .bilan-links a {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #2b7fd4;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .bilan-links a:hover {
          color: #1a6bb0;
          text-decoration: underline;
        }

        .bilan-right h5 {
          font-size: 13px;
          font-weight: 600;
          color: #1a3a5c;
          margin: 0 0 10px 0;
          text-align: center;
        }

        .chart-empty {
          text-align: center;
          padding: 30px;
          color: #8a9aa8;
          font-size: 14px;
        }

        .chart-loading {
          text-align: center;
          padding: 20px;
          color: #6c7a8d;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .bilan-stat-number { font-size: 17px; }
          .bilan-stat-label { font-size: 11px; }
          .bilan-actions .btn-primary { padding: 6px 12px; font-size: 11px; }
          .btn-ia-diagnostic { padding: 6px 14px; font-size: 11px; }
          .btn-ia-diagnostic .ia-icon { width: 16px; height: 16px; }
          .bilan-sub { font-size: 12px; padding-left: 0; }
          .bilan-header h2 { font-size: 18px; }
        }

        @media (max-width: 480px) {
          .bilan-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
          .bilan-stat-item { padding: 8px 10px; }
          .bilan-stat-number { font-size: 15px; }
          .bilan-actions { flex-direction: column; }
          .bilan-actions button { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default BilanCards;