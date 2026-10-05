// ============================================================
// COMPOSANT : PaymentSection.jsx (Recharts - 6 courbes + montant)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, PieChart, CreditCard, TrendingUp, Calendar,
  FileText, Printer, Layers, BarChart3, BookOpen, UserCircle,
} from 'lucide-react';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { useT } from '../hooks/useT';

const PaymentSection = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [statsSummary, setStatsSummary] = useState({
    totalUsagers: 0,
    totalPayes: 0,
    totalMontant: 0,
    categoriesActives: 0,
    usagersAyantPaye: 0,
  });

  const months = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  const TYPES = useMemo(() => [
    { key: 'hotel',        label: t('Hôtel',          'Trano fandraisam-bahiny', 'Hotel'),        color: '#4CAF50' },
    { key: 'grandSurface', label: t('Grande Surface', 'Trano fivarotana lehibe', 'Supermarket'),  color: '#2196F3' },
    { key: 'bus',          label: t('Transport',      'Fitanterana',             'Transport'),    color: '#FF9800' },
    { key: 'nightclub',    label: t('Night Club',     'Kliobina alina',          'Night Club'),   color: '#9C27B0' },
    { key: 'media',        label: t('Média',          'Haino aman-jery',         'Media'),        color: '#E91E63' },
    { key: 'occ',          label: t('Occasionnelle',  'Tsindraindray',           'Occasional'),   color: '#00BCD4' },
  ], [t]);

  const formatMontant = useCallback((value) => {
    if (value === 0) return '0 Ar';
    return Math.round(value).toLocaleString(locale) + ' Ar';
  }, [locale]);

  const formatYAxis = useCallback((value) => {
    if (value === 0) return '0';
    return Math.round(value).toLocaleString(locale);
  }, [locale]);

  const montantLabel = useMemo(
    () => t('Montant (Ar)', 'Vola (Ar)', 'Amount (Ar)'),
    [t]
  );

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const currentYear = new Date().getFullYear();

        const monthsKeys = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

        const usagersRes = await fetch('http://localhost:3001/api/usagers', {
          headers: { adminToken: token },
        });
        let usagersData = await usagersRes.json();
        if (!Array.isArray(usagersData)) usagersData = usagersData.usagers || [];

        const paiementsRes = await fetch('http://localhost:3001/api/paiements/tous', {
          headers: { adminToken: token },
        });
        const paiementsData = await paiementsRes.json();
        const paiements = paiementsData.success ? paiementsData.paiements : [];

        const monthlyMap = {};
        monthsKeys.forEach(m => {
          monthlyMap[m] = {
            moisIndex: monthsKeys.indexOf(m),
            hotel: 0,
            grandSurface: 0,
            bus: 0,
            nightclub: 0,
            media: 0,
            occ: 0,
            montant: 0,
          };
        });

        usagersData.forEach(u => {
          const date = new Date(u.created_at);
          if (date.getFullYear() === currentYear) {
            const monthIndex = date.getMonth();
            const monthKey = monthsKeys[monthIndex];
            if (monthlyMap[monthKey]) {
              const type = u.type_usager;
              let key = '';
              if (type === 'Hôtel') key = 'hotel';
              else if (type === 'Grand Surface') key = 'grandSurface';
              else if (type === 'Bus') key = 'bus';
              else if (type === 'Night club') key = 'nightclub';
              else if (type === 'Télé/Radio') key = 'media';
              else if (type === 'OCC') key = 'occ';
              if (key && monthlyMap[monthKey][key] !== undefined) {
                monthlyMap[monthKey][key] += 1;
              }
            }
          }
        });

        paiements.forEach(p => {
          if (p.statut === 'paye' && p.annee === currentYear) {
            const monthIndex = p.mois ? p.mois - 1 : new Date(p.date_paiement).getMonth();
            const monthKey = monthsKeys[monthIndex];
            if (monthlyMap[monthKey]) {
              monthlyMap[monthKey].montant += parseFloat(p.montant) || 0;
            }
          }
        });

        const data = monthsKeys.map((m, i) => ({
          moisIndex: i,
          ...monthlyMap[m],
        }));
        setMonthlyData(data);

        const totalUsagers = usagersData.length;
        const paiementsPayes = paiements.filter(p => p.statut === 'paye');
        const totalPayes = paiementsPayes.length;
        const totalMontant = paiementsPayes.reduce(
          (sum, p) => sum + parseFloat(p.montant || 0), 0
        );

        const usagersAyantPaye = new Set(
          paiementsPayes
            .map(p => p.usager_id || p.id_usager || p.numero_usager)
            .filter(id => id !== undefined && id !== null)
        ).size;

        const categoriesActives = TYPES.filter(tp => usagersData.some(u => {
          const type = u.type_usager;
          if (tp.key === 'hotel') return type === 'Hôtel';
          if (tp.key === 'grandSurface') return type === 'Grand Surface';
          if (tp.key === 'bus') return type === 'Bus';
          if (tp.key === 'nightclub') return type === 'Night club';
          if (tp.key === 'media') return type === 'Télé/Radio';
          if (tp.key === 'occ') return type === 'OCC';
          return false;
        })).length;

        setStatsSummary({
          totalUsagers,
          totalPayes,
          totalMontant,
          categoriesActives,
          usagersAyantPaye,
        });
      } catch (err) {
        console.error('❌ Erreur chargement données mensuelles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    return monthlyData.map(d => ({
      mois: months[d.moisIndex] || '',
      [TYPES[0].label]: d.hotel,
      [TYPES[1].label]: d.grandSurface,
      [TYPES[2].label]: d.bus,
      [TYPES[3].label]: d.nightclub,
      [TYPES[4].label]: d.media,
      [TYPES[5].label]: d.occ,
      [montantLabel]: d.montant,
    }));
  }, [monthlyData, months, TYPES, montantLabel]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}>
          <p style={{ fontWeight: 'bold', margin: 0 }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
              {entry.name}: {entry.name === montantLabel
                ? formatMontant(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const {
    totalUsagers,
    totalPayes,
    totalMontant,
    categoriesActives,
    usagersAyantPaye,
  } = statsSummary;

  const tauxPaiement = totalUsagers > 0
    ? Math.min((usagersAyantPaye / totalUsagers) * 100, 100)
    : 0;

  return (
    <div className="payment-section">
      {/* En-tête */}
      <div className="payment-header">
        <h2>
          <DollarSign size={28} strokeWidth={2} />
          {t('Gestion des paiements', 'Fitandremana ny fandoavana', 'Payment management')}
        </h2>
        <p className="payment-sub">
          {loading
            ? t('Chargement...', 'Mandrindra...', 'Loading...')
            : `${t('Total collecté', 'Vola voangona', 'Total collected')} : ${formatMontant(totalMontant)} · ${totalPayes} ${t('paiements', 'fandoavana', 'payments')}`}
        </p>
      </div>

      {/* Statistiques clés */}
      <div className="payment-stats-simple">
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><PieChart size={18} /></span>
          <div>
            <div className="stat-simple-number">{totalUsagers}</div>
            <div className="stat-simple-label">{t('Usagers', 'Mpampiasa', 'Users')}</div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><CreditCard size={18} /></span>
          <div>
            <div className="stat-simple-number">{totalPayes}</div>
            <div className="stat-simple-label">{t('Paiements', 'Fandoavana', 'Payments')}</div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><TrendingUp size={18} /></span>
          <div>
            <div className="stat-simple-number">
              {tauxPaiement.toFixed(1)}%
            </div>
            <div className="stat-simple-label">
              {t('Taux de paiement', "Tahan'ny fandoavana", 'Payment rate')}
            </div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><BarChart3 size={18} /></span>
          <div>
            <div className="stat-simple-number">{categoriesActives}</div>
            <div className="stat-simple-label">
              {t('Catégories actives', 'Sokajy mavitrika', 'Active categories')}
            </div>
          </div>
        </div>
      </div>

      {/* Graphique en courbes */}
      <div className="payment-chart-container" style={{ marginTop: 20 }}>
        <h5>
          {t(
            'Évolution mensuelle des usagers par type et des montants collectés',
            "Fivoaran'ny mpampiasa isam-bolana araka ny karazany sy ny vola voangona",
            'Monthly evolution of users by type and collected amounts'
          )}
        </h5>
        {loading ? (
          <div className="chart-loading">
            {t('Chargement des données...', 'Mandrindra ny data...', 'Loading data...')}
          </div>
        ) : error ? (
          <div className="chart-error">
            {t('Erreur :', 'Hadisoana :', 'Error :')} {error}
          </div>
        ) : chartData.every(d =>
          d[TYPES[0].label] === 0 && d[TYPES[1].label] === 0 && d[TYPES[2].label] === 0 &&
          d[TYPES[3].label] === 0 && d[TYPES[4].label] === 0 && d[TYPES[5].label] === 0 &&
          d[montantLabel] === 0
        ) ? (
          <div className="chart-empty">
            {t('Aucune donnée pour cette année', "Tsy misy data ho an'ity taona ity", 'No data for this year')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {TYPES.map(type => (
                <Line
                  key={type.key}
                  yAxisId="left"
                  type="monotone"
                  dataKey={type.label}
                  stroke={type.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}

              <Line
                yAxisId="right"
                type="monotone"
                dataKey={montantLabel}
                stroke="#FF5722"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="chart-legend">
          <span style={{ fontSize: 12, color: '#666' }}>
            * {t('Les montants sont en Ariary (Ar)', 'Ny vola dia Ariary (Ar)', 'Amounts are in Ariary (Ar)')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="payment-actions">
        <button className="btn-primary" onClick={() => navigate('/gere-dossier')}>
          <FileText size={18} /> {t('Dossiers', 'rakitra', 'Folder management')}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/billan')}>
          <DollarSign size={18} /> {t('Bilan financier', 'Famerenam-bola', 'Financial balance')}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/facture-usager')}>
          <Printer size={18} /> {t('Factures', 'Faktiora', 'Invoices')}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/quitance')}>
          <BookOpen size={18} /> {t('Suivi Quittances', 'Fanaraha-maso', 'Receipt tracking')}
        </button>

        {/* ✅ NOUVEAU BOUTON — Compte */}
        <button className="btn-secondary" onClick={() => navigate('/comptet')}>
          <UserCircle size={18} /> {t('Compte', 'Kaonty', 'Account')}
        </button>
      </div>

      {/* Pied */}
      <div className="payment-footer">
        <span className="footer-info">
          <Calendar size={14} />{' '}
          {t('Dernière mise à jour :', 'Fanavaozana farany :', 'Last update :')}{' '}
          {new Date().toLocaleDateString(locale)}
        </span>
        <span className="footer-total">
          {t('Total collecté :', 'Vola voangoa :', 'Total collected :')}{' '}
          {formatMontant(totalMontant)}
        </span>
      </div>
    </div>
  );
};

export default PaymentSection;