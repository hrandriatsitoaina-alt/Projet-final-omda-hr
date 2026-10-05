import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Eye, Users, Activity, TrendingUp, Calendar,
  Hotel, ShoppingBag, Bus, Music, Tv, CalendarDays,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const MainCards = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage (mg → fr-MG)
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Types mémoïsés (labels traduits)
  const statTypes = useMemo(() => [
    { key: 'hotel',        label: t('Hôtel',          'Trano fandraisam-bahiny',   'Hotel'),       color: '#4CAF50' },
    { key: 'grandSurface', label: t('Grande Surface', 'Trano fivarotana lehibe',   'Supermarket'), color: '#2196F3' },
    { key: 'bus',          label: t('Transport',      'Fitanterana',               'Transport'),   color: '#FF9800' },
    { key: 'nightclub',    label: t('Night Club',     'Kliobina alina',            'Night Club'),  color: '#9C27B0' },
    { key: 'media',        label: t('Média',          'Haino aman-jery',           'Media'),       color: '#E91E63' },
    { key: 'occ',          label: t('Occasionnelle',  'Tsindraindray',             'Occasional'),  color: '#00BCD4' },
  ], [t]);

  // Mapping pour l'API – clé utilisée dans l'URL
  const getApiKey = useCallback((key) => {
    return key === 'grandSurface' ? 'grand-surface' : key;
  }, []);

  // ✅ useEffect SANS dépendance à la langue → PAS de re-fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';

        const totalPromises = statTypes.map(async (type) => {
          const apiKey = getApiKey(type.key);
          try {
            const res = await fetch(`http://localhost:3001/api/usagers/type/${apiKey}`, {
              headers: { 'adminToken': token },
            });
            const data = await res.json();
            console.log(`📊 ${type.label} (${apiKey}) :`, data);
            return { key: type.key, count: data.success ? data.usagers.length : 0 };
          } catch (err) {
            console.error(`❌ Erreur pour ${type.label} :`, err);
            return { key: type.key, count: 0 };
          }
        });

        const results = await Promise.all(totalPromises);
        const totalsData = {};
        results.forEach(r => { totalsData[r.key] = r.count; });
        console.log('✅ Totaux finaux :', totalsData);
        setTotals(totalsData);
      } catch (err) {
        console.error('❌ Erreur générale :', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // ✅ Pas de appLangue dans les dépendances — les données ne doivent PAS être rechargées
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculs
  const totalGeneral = useMemo(
    () => Object.values(totals).reduce((a, b) => a + b, 0),
    [totals]
  );

  const activeCategories = useMemo(
    () => Object.values(totals).filter(count => count > 0).length,
    [totals]
  );

  // ✅ Données pour le graphique (triées par valeur décroissante)
  const chartData = useMemo(() => {
    return statTypes
      .map(type => ({
        name: type.label,
        value: totals[type.key] || 0,
        color: type.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [statTypes, totals]);

  // ✅ Tooltip formatter (dépend de la langue)
  const tooltipFormatter = useCallback(
    (value) => `${value} ${t('usager(s)', 'mpampiasa', 'user(s)')}`,
    [t]
  );

  return (
    <div className="main-card-full">
      {/* En-tête */}
      <div className="main-card-header">
        <h2>
          <Users size={28} strokeWidth={2} />
          {t('Gestion des usagers', 'Fitandremana ny mpampiasa', 'User management')}
        </h2>
        <p className="main-card-sub">
          {loading
            ? t('Chargement...', 'Mandrindra...', 'Loading...')
            : `${totalGeneral} ${t('usagers enregistrés', 'mpampiasa voasoratra', 'registered users')}`}
        </p>
      </div>

      {/* Ligne de statistiques simplifiée */}
      <div className="stats-simple">
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><Users size={18} /></span>
          <div>
            <div className="stat-simple-number">{totalGeneral}</div>
            <div className="stat-simple-label">
              {t('Total usagers', 'Mpampiasa rehetra', 'Total users')}
            </div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><Activity size={18} /></span>
          <div>
            <div className="stat-simple-number">{activeCategories}</div>
            <div className="stat-simple-label">
              {t('Catégories actives', 'Sokajy mavitrika', 'Active categories')}
            </div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><TrendingUp size={18} /></span>
          <div>
            <div className="stat-simple-number">{statTypes.length}</div>
            <div className="stat-simple-label">
              {t('Types disponibles', 'Karazana misy', 'Available types')}
            </div>
          </div>
        </div>
        <div className="stat-simple-item">
          <span className="stat-simple-icon"><Calendar size={18} /></span>
          <div>
            <div className="stat-simple-number">{new Date().getFullYear()}</div>
            <div className="stat-simple-label">
              {t('Année en cours', 'Taona ity', 'Current year')}
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="main-card-actions">
        <button className="btn-primary" onClick={() => navigate('/ajout-usager')}>
          <UserPlus size={18} strokeWidth={2} />
          {t('Ajouter un usager', 'Ampidiro mpampiasa', 'Add user')}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/verification-usager')}>
          <Eye size={18} strokeWidth={2} />
          {t('Consulter les usagers', 'Hijery ny mpampiasa', 'View users')}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/repartition-artistes')}>
          <Music size={18} strokeWidth={2} />
          {t('Artiste', 'Mpanao mozika', 'Artist')}
        </button>
      </div>

      {/* ===== GRAPHIQUE ===== */}
      <div className="dynamic-chart-container">
        <div className="dynamic-chart-header">
          <h5>
            <Activity size={18} strokeWidth={2} />
            {t(
              'Répartition des usagers par type',
              'Fizarana ny mpampiasa araka ny karazany',
              'User distribution by type'
            )}
          </h5>
          <span className="chart-total">
            <Users size={14} strokeWidth={2} />
            {totalGeneral}
          </span>
        </div>

        {loading ? (
          <div className="chart-loading">
            {t('Chargement...', 'Mandrindra...', 'Loading...')}
          </div>
        ) : error ? (
          <div className="chart-error">
            {t('Erreur :', 'Hadisoana :', 'Error :')} {error}
          </div>
        ) : chartData.every(d => d.value === 0) ? (
          <div className="chart-empty">
            {t('Aucun usager enregistré', 'Tsy misy mpampiasa voasoratra', 'No registered users')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip
                formatter={tooltipFormatter}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pied */}
      <div className="main-card-footer">
        <span className="footer-info">
          <TrendingUp size={14} strokeWidth={2} />
          {t('Données en temps réel', "Data amin'ny fotoana tena izy", 'Real-time data')}
        </span>
        <span className="footer-date">
          <Calendar size={14} strokeWidth={2} />
          {new Date().toLocaleDateString(locale)}
        </span>
      </div>
    </div>
  );
};

export default MainCards;