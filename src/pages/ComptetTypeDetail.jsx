// src/pages/ComptetTypeDetail.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Download, Users, DollarSign, TrendingUp,
  BarChart3, AlertCircle, Loader2,
  Hotel, Store, Tv2, Ticket, Bus, PartyPopper, Package,
} from 'lucide-react';
import '../styles/comptet.css';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';
import { generateComptePDFType } from './pdf/comptet_pdf';

const API_BASE = 'http://localhost:3001/api';

const TYPE_ICONS = {
  hotel: Hotel,
  'grand-surface': Store,
  media: Tv2,
  occ: Ticket,
  bus: Bus,
  nightclub: PartyPopper,
  autre: Package,
};

const ComptetTypeDetail = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const regionParam = searchParams.get('region') || '';
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedRegion] = useState(regionParam);

  const Icon = TYPE_ICONS[type] || Package;

  const toNumber = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = parseFloat(String(v).replace(/\s/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const formatMontant = useCallback((value) => {
    const n = Math.round(toNumber(value));
    return n.toLocaleString(locale) + ' Ar';
  }, [locale]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedRegion
        ? `${API_BASE}/compte/type/${type}?region=${encodeURIComponent(selectedRegion)}`
        : `${API_BASE}/compte/type/${type}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Erreur');
      }
    } catch (err) {
      console.error('❌ Erreur chargement détail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, selectedRegion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalFrais = (data?.usagers || []).reduce((s, u) => s + u.frais_dossier, 0);
  const totalSansFrais = (data?.usagers || []).reduce((s, u) => s + u.montant_sans_frais, 0);
  const totalAvecFrais = (data?.usagers || []).reduce((s, u) => s + u.montant_avec_frais, 0);

  const handleExportPDF = useCallback(() => {
    try {
      if (!data) return;
      generateComptePDFType(
        {
          ...data,
          usagers: data.usagers,
          nombre: data.usagers.length,
          total_frais_dossier: totalFrais,
          total_montant_sans_frais: totalSansFrais,
          total_montant_avec_frais: totalAvecFrais,
        },
        { langue, region: selectedRegion }
      );
    } catch (err) {
      console.error('❌ Erreur export PDF:', err);
      alert(t('Erreur génération PDF : ', 'Nisy olana : ', 'PDF error: ') + err.message);
    }
  }, [data, langue, selectedRegion, totalFrais, totalSansFrais, totalAvecFrais, t]);

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="compte-loading">
          <Loader2 size={42} className="spinning" />
          <p>{t('Chargement...', 'Maka...', 'Loading...')}</p>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <MiniSidebar />
        <div className="compte-container">
          <div className="compte-error">
            <AlertCircle size={18} />
            <span>{error || 'Erreur'}</span>
            <button onClick={() => navigate('/comptet')}>
              <ArrowLeft size={14} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MiniSidebar />
      <main className="compte-container">
        <div className="compte-header">
          <div className="compte-header-left">
            <h1>
              <Icon size={28} strokeWidth={2} />
              {data.label.toUpperCase()}
            </h1>
            <p className="compte-subtitle">
              {data.nombre} {t('usager(s)', 'mpampiasa', 'user(s)')}
              {selectedRegion ? ` • ${t('Région', 'Faritra', 'Region')} : ${selectedRegion}` : ''}
            </p>
          </div>
          <div className="compte-header-right">
            <button className="btn-back" onClick={() => navigate('/comptet')}>
              <ArrowLeft size={16} /> {t('Retour', 'Hiverina', 'Back')}
            </button>

            <button
              className="btn-refresh-icon"
              onClick={loadData}
              title={t('Actualiser', 'Havaozy', 'Refresh')}
            >
              <RefreshCw size={16} />
            </button>

            <button className="btn-pdf-export" onClick={handleExportPDF}>
              <Download size={16} /> {t('Exporter PDF', 'Alefa PDF', 'Export PDF')}
            </button>
          </div>
        </div>

        <div className="compte-stats-grid">
          <div className="compte-stat-card">
            <div className="stat-card-icon"><Users size={22} /></div>
            <div className="stat-card-content">
              <span className="stat-card-label">
                {t('Nombre d\'usagers', 'Isan\'ny mpampiasa', 'Users')}
              </span>
              <span className="stat-card-value">{data.nombre}</span>
            </div>
          </div>

          <div className="compte-stat-card">
            <div className="stat-card-icon"><DollarSign size={22} /></div>
            <div className="stat-card-content">
              <span className="stat-card-label">
                {t('Frais de dossier', 'Sara', 'File fees')}
              </span>
              <span className="stat-card-value">{formatMontant(totalFrais)}</span>
            </div>
          </div>

          <div className="compte-stat-card">
            <div className="stat-card-icon"><TrendingUp size={22} /></div>
            <div className="stat-card-content">
              <span className="stat-card-label">
                {t('Sans frais dossier', 'Tsy misy sara', 'Without fees')}
              </span>
              <span className="stat-card-value">{formatMontant(totalSansFrais)}</span>
            </div>
          </div>

          <div className="compte-stat-card">
            <div className="stat-card-icon"><BarChart3 size={22} /></div>
            <div className="stat-card-content">
              <span className="stat-card-label">
                {t('Montant total', 'Vola totaly', 'Total amount')}
              </span>
              <span className="stat-card-value">{formatMontant(totalAvecFrais)}</span>
            </div>
          </div>
        </div>

        <div className="compte-section-type">
          <div className="type-section-body">
            {data.usagers.length === 0 ? (
              <div className="compte-empty-small">
                <AlertCircle size={28} />
                <p>{t('Aucun usager', 'Tsy misy mpampiasa', 'No user')}</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="compte-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('Nom', 'Anarana', 'Name')}</th>
                      <th>{t('Demandeur', 'Mpangataka', 'Applicant')}</th>
                      <th>{t('Téléphone', 'Finday', 'Phone')}</th>
                      <th>{t('Région', 'Faritra', 'Region')}</th>
                      <th className="num-col">{t('Montant total', 'Vola totaly', 'Total')}</th>
                      <th className="num-col">{t('Sans frais', 'Tsy sara', 'Without fees')}</th>
                      <th className="num-col">{t('Frais dossier', 'Sara', 'File fees')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usagers.map((u, i) => (
                      <tr key={u.id}>
                        <td className="center">{i + 1}</td>
                        <td><strong>{u.nom || '-'}</strong></td>
                        <td>{u.demandeur || '-'}</td>
                        <td>{u.telephone || '-'}</td>
                        <td><span className="region-badge">{u.region || '-'}</span></td>
                        <td className="num-col strong">{formatMontant(u.montant_avec_frais)}</td>
                        <td className="num-col">{formatMontant(u.montant_sans_frais)}</td>
                        <td className="num-col green">{formatMontant(u.frais_dossier)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="total-label">
                        {t('TOTAL', 'TOTALY', 'TOTAL')}
                      </td>
                      <td className="num-col strong">{formatMontant(totalAvecFrais)}</td>
                      <td className="num-col">{formatMontant(totalSansFrais)}</td>
                      <td className="num-col green">{formatMontant(totalFrais)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ComptetTypeDetail;