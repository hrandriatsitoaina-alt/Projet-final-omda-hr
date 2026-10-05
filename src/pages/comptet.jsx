// src/pages/comptet.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, TrendingUp, Users, DollarSign, MapPin,
  Hotel, Store, Tv2, Ticket, Bus, PartyPopper, Package,
  RefreshCw, ChevronDown, ChevronUp, ArrowLeft,
  Eye, Download, BarChart3, AlertCircle, Loader2, Filter, X,
  AlertTriangle, Clock,
} from 'lucide-react';
import '../styles/comptet.css';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';
import { generateComptePDFGlobal } from './pdf/comptet_pdf';

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

const Comptet = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recap, setRecap] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [expandedType, setExpandedType] = useState(null);

  // ✅ Modale détail usager
  const [detailUsager, setDetailUsager] = useState(null);
  const [detailPaiements, setDetailPaiements] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const toNumber = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = parseFloat(String(v).replace(/\s/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const formatMontant = useCallback((value) => {
    const n = Math.round(toNumber(value));
    return n.toLocaleString(locale) + ' Ar';
  }, [locale]);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recapRes, regionsRes] = await Promise.all([
        fetch(`${API_BASE}/compte/recap`).then(r => r.json()),
        fetch(`${API_BASE}/compte/regions`).then(r => r.json()),
      ]);

      if (recapRes.success) {
        setRecap(recapRes.recap || []);
        setGlobalData(recapRes.global);
      } else {
        setError(recapRes.message || 'Erreur');
      }

      if (regionsRes.success) {
        setRegions(regionsRes.regions || []);
      }
    } catch (err) {
      console.error('❌ Erreur chargement compte:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // FILTRAGE
  // ============================================================
  const filteredRecap = useMemo(() => {
    let list = recap;
    if (selectedType) list = list.filter(tp => tp.key === selectedType);

    return list.map(type => {
      let usagers = type.usagers;
      if (selectedRegion) {
        usagers = usagers.filter(u => (u.region || 'Non spécifié') === selectedRegion);
      }
      const totalFrais = usagers.reduce((s, u) => s + u.frais_dossier, 0);
      const totalSansFrais = usagers.reduce((s, u) => s + u.montant_sans_frais, 0);
      const totalAvecFrais = usagers.reduce((s, u) => s + u.montant_avec_frais, 0);

      // ✅ NOUVEAU : Total des retards
      const totalRetard = usagers.reduce(
        (s, u) => s + (toNumber(u.montant_retard) || 0),
        0
      );

      return {
        ...type,
        usagers,
        nombre: usagers.length,
        total_frais_dossier: totalFrais,
        total_montant_sans_frais: totalSansFrais,
        total_montant_avec_frais: totalAvecFrais,
        total_montant_retard: totalRetard, // ✅ AJOUT
      };
    }).filter(type => type.usagers.length > 0 || (!selectedRegion && !selectedType));
  }, [recap, selectedRegion, selectedType]);

  const filteredTotals = useMemo(() => {
    return filteredRecap.reduce((acc, tp) => ({
      nombre: acc.nombre + tp.nombre,
      total_frais_dossier: acc.total_frais_dossier + tp.total_frais_dossier,
      total_montant_sans_frais: acc.total_montant_sans_frais + tp.total_montant_sans_frais,
      total_montant_avec_frais: acc.total_montant_avec_frais + tp.total_montant_avec_frais,
      total_montant_retard: acc.total_montant_retard + (tp.total_montant_retard || 0), // ✅ AJOUT
    }), {
      nombre: 0, total_frais_dossier: 0,
      total_montant_sans_frais: 0, total_montant_avec_frais: 0,
      total_montant_retard: 0, // ✅ AJOUT
    });
  }, [filteredRecap]);

  // ============================================================
  // ✅ OUVRIR LE DÉTAIL D'UN USAGER
  // ============================================================
  const openDetail = useCallback(async (usager, typeKey, typeLabel) => {
    setDetailUsager({ ...usager, typeKey, typeLabel });
    setDetailPaiements([]);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/paiements/usager/${usager.id}/${typeKey}`);
      const json = await res.json();
      if (json.success) {
        setDetailPaiements(json.paiements || []);
      }
    } catch (err) {
      console.error('❌ Erreur chargement paiements usager:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = () => {
    setDetailUsager(null);
    setDetailPaiements([]);
  };

  // ============================================================
  // ✅ CALCUL DU MONTANT RETARD DEPUIS LES PAIEMENTS
  //    (somme des montant_retard de tous les paiements)
  // ============================================================
  const detailMontantRetardTotal = useMemo(() => {
    if (!detailPaiements || detailPaiements.length === 0) return 0;
    return detailPaiements.reduce((sum, p) => {
      return sum + (toNumber(p.montant_retard) || 0);
    }, 0);
  }, [detailPaiements]);

  // ✅ Y a-t-il au moins un paiement avec retard ?
  const detailHasRetard = useMemo(() => {
    if (!detailPaiements || detailPaiements.length === 0) return false;
    return detailPaiements.some(p =>
      (toNumber(p.montant_retard) > 0) || p.est_retard === true
    );
  }, [detailPaiements]);

  // ============================================================
  // EXPORT PDF
  // ============================================================
  const handleExportPDF = useCallback(() => {
    try {
      if (filteredRecap.length === 0) return;

      const selectedTypeLabel = selectedType
        ? (recap.find(r => r.key === selectedType)?.label || '')
        : '';

      generateComptePDFGlobal(filteredRecap, {
        langue,
        region: selectedRegion,
        typeLabel: selectedTypeLabel,
      });
    } catch (err) {
      console.error('❌ Erreur export PDF global:', err);
      alert(t('Erreur génération PDF : ', 'Nisy olana tamin\'ny PDF : ', 'PDF error: ') + err.message);
    }
  }, [filteredRecap, langue, selectedRegion, selectedType, recap, t]);

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <>
      <MiniSidebar />
      <main className="compte-container">
        {/* EN-TÊTE */}
        <div className="compte-header">
          <div className="compte-header-left">
            <h1>
              <Wallet size={28} strokeWidth={2} />
              {t('Compte global', 'Kaonty ankapobeny', 'Global account')}
            </h1>
            <p className="compte-subtitle">
              {t(
                'Regroupement des frais de dossier et recettes par type d\'usager',
                'Fanangonana ny sara sy ny vola isaky ny karazana mpampiasa',
                'Grouping of file fees and revenues by user type'
              )}
            </p>
          </div>

          <div className="compte-header-right">
            <button className="btn-backs" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} /> {t('Retour', 'Hiverina', 'Back')}
            </button>

            <button
              className="btn-refresh-icon"
              onClick={loadData}
              disabled={loading}
              title={t('Actualiser', 'Havaozy', 'Refresh')}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>

            <button
              className="btn-pdf-export"
              onClick={handleExportPDF}
              disabled={loading || filteredRecap.length === 0}
              title={t('Exporter en PDF', 'Alefa PDF', 'Export PDF')}
            >
              <Download size={16} /> {t('Exporter PDF', 'Alefa PDF', 'Export PDF')}
            </button>
          </div>
        </div>

        {/* ERREUR */}
        {error && (
          <div className="compte-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={loadData}>
              <RefreshCw size={14} /> {t('Réessayer', 'Andramo', 'Retry')}
            </button>
          </div>
        )}

        {/* CHARGEMENT */}
        {loading && !recap.length ? (
          <div className="compte-loading">
            <Loader2 size={42} className="spinning" />
            <p>{t('Chargement...', 'Maka ny angona...', 'Loading...')}</p>
          </div>
        ) : (
          <>
            {/* STATS GLOBALES */}
            {globalData && (
              <div className="compte-stats-grid">
                <div className="compte-stat-card">
                  <div className="stat-card-icon"><Users size={22} /></div>
                  <div className="stat-card-content">
                    <span className="stat-card-label">
                      {t('Total usagers', 'Totalin\'ny mpampiasa', 'Total users')}
                    </span>
                    <span className="stat-card-value">
                      {globalData.nombre.toLocaleString(locale)}
                    </span>
                  </div>
                </div>

                <div className="compte-stat-card">
                  <div className="stat-card-icon"><DollarSign size={22} /></div>
                  <div className="stat-card-content">
                    <span className="stat-card-label">
                      {t('Frais de dossier', 'Sara', 'File fees')}
                    </span>
                    <span className="stat-card-value">
                      {formatMontant(globalData.total_frais_dossier)}
                    </span>
                  </div>
                </div>

                <div className="compte-stat-card">
                  <div className="stat-card-icon"><TrendingUp size={22} /></div>
                  <div className="stat-card-content">
                    <span className="stat-card-label">
                      {t('Sans frais dossier', 'Tsy misy sara', 'Without fees')}
                    </span>
                    <span className="stat-card-value">
                      {formatMontant(globalData.total_montant_sans_frais)}
                    </span>
                  </div>
                </div>

                <div className="compte-stat-card">
                  <div className="stat-card-icon"><BarChart3 size={22} /></div>
                  <div className="stat-card-content">
                    <span className="stat-card-label">
                      {t('Montant total', 'Vola totaly', 'Total amount')}
                    </span>
                    <span className="stat-card-value">
                      {formatMontant(globalData.total_montant_avec_frais)}
                    </span>
                  </div>
                </div>

                {/* ✅ NOUVEAU : Carte "Total retards" */}
                {filteredTotals.total_montant_retard > 0 && (
                  <div className="compte-stat-card stat-card-danger">
                    <div className="stat-card-icon"><AlertTriangle size={22} /></div>
                    <div className="stat-card-content">
                      <span className="stat-card-label">
                        {t('Total retards', 'Totaly tara', 'Total late fees')}
                      </span>
                      <span className="stat-card-value">
                        {formatMontant(filteredTotals.total_montant_retard)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FILTRES */}
            <div className="compte-filters">
              <div className="filter-select">
                <Filter size={16} />
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  <option value="">
                    {t('Tous les types d\'usager', 'Ny karazana rehetra', 'All user types')}
                  </option>
                  {recap.map(tp => (
                    <option key={tp.key} value={tp.key}>
                      {tp.label} ({tp.nombre})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-select">
                <MapPin size={16} />
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                  <option value="">
                    {t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}
                  </option>
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTIONS */}
            <div className="compte-sections">
              {filteredRecap.length === 0 ? (
                <div className="compte-empty">
                  <AlertCircle size={42} />
                  <p>{t('Aucun résultat pour ces filtres', 'Tsy misy valiny', 'No result')}</p>
                </div>
              ) : (
                filteredRecap.map((type) => {
                  const Icon = TYPE_ICONS[type.key] || Package;
                  const isExpanded = expandedType === type.key;

                  return (
                    <div key={type.key} className="compte-section-type">
                      <div className="type-section-header">
                        <div className="type-section-title">
                          <div className="type-section-icon">
                            <Icon size={22} />
                          </div>
                          <div>
                            <h2>{type.label.toUpperCase()}</h2>
                            <span className="type-section-count">
                              {type.nombre} {t('usager(s)', 'mpampiasa', 'user(s)')}
                            </span>
                          </div>
                        </div>

                        <div className="type-section-actions">
                          <button
                            className="btn-detail"
                            onClick={() => navigate(`/comptet/type/${type.key}${selectedRegion ? `?region=${selectedRegion}` : ''}`)}
                            title={t('Voir le détail', 'Jereo ny antsipiriany', 'View detail')}
                          >
                            <Eye size={14} /> {t('Détail', 'Antsipiriany', 'Detail')}
                          </button>
                          <button
                            className="btn-toggle"
                            onClick={() => setExpandedType(isExpanded ? null : type.key)}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="type-section-totals">
                        <div className="total-box">
                          <span className="total-box-label">
                            {t('Montant total', 'Vola totaly', 'Total amount')}
                          </span>
                          <span className="total-box-value">
                            {formatMontant(type.total_montant_avec_frais)}
                          </span>
                        </div>
                        <div className="total-box">
                          <span className="total-box-label">
                            {t('Sans frais dossier', 'Tsy misy sara', 'Without fees')}
                          </span>
                          <span className="total-box-value">
                            {formatMontant(type.total_montant_sans_frais)}
                          </span>
                        </div>
                        <div className="total-box">
                          <span className="total-box-label">
                            {t('Frais de dossier', 'Sara', 'File fees')}
                          </span>
                          <span className="total-box-value green">
                            {formatMontant(type.total_frais_dossier)}
                          </span>
                        </div>

                        {/* ✅ NOUVEAU : Boîte Retard si > 0 */}
                        {(type.total_montant_retard || 0) > 0 && (
                          <div className="total-box total-box-danger">
                            <span className="total-box-label">
                              <AlertTriangle size={12} /> {t('Retards', 'Tara', 'Late fees')}
                            </span>
                            <span className="total-box-value red">
                              {formatMontant(type.total_montant_retard)}
                            </span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="type-section-body">
                          {type.usagers.length === 0 ? (
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
                                    {/* ✅ NOUVELLE COLONNE RETARD */}
                                    <th className="num-col">{t('Retard', 'Tara', 'Late')}</th>
                                    <th style={{ textAlign: 'center', width: 60 }}>
                                      {t('Action', 'Hetsika', 'Action')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {type.usagers.map((u, i) => {
                                    const retard = toNumber(u.montant_retard) || 0;
                                    return (
                                      <tr key={u.id}>
                                        <td className="center">{i + 1}</td>
                                        <td><strong>{u.nom || '-'}</strong></td>
                                        <td>{u.demandeur || '-'}</td>
                                        <td>{u.telephone || '-'}</td>
                                        <td>
                                          <span className="region-badge">{u.region || '-'}</span>
                                        </td>
                                        <td className="num-col strong">{formatMontant(u.montant_avec_frais)}</td>
                                        <td className="num-col">{formatMontant(u.montant_sans_frais)}</td>
                                        <td className="num-col green">{formatMontant(u.frais_dossier)}</td>
                                        {/* ✅ CELLULE RETARD */}
                                        <td className="num-col">
                                          {retard > 0 ? (
                                            <span className="retard-badge">
                                              <AlertTriangle size={12} />
                                              {formatMontant(retard)}
                                            </span>
                                          ) : (
                                            <span className="no-retard">—</span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <button
                                            className="btn-eye-detail"
                                            onClick={() => openDetail(u, type.key, type.label)}
                                            title={t('Voir le détail', 'Jereo ny antsipiriany', 'View detail')}
                                          >
                                            <Eye size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan="5" className="total-label">
                                      {t('TOTAL', 'TOTALY', 'TOTAL')}
                                    </td>
                                    <td className="num-col strong">{formatMontant(type.total_montant_avec_frais)}</td>
                                    <td className="num-col">{formatMontant(type.total_montant_sans_frais)}</td>
                                    <td className="num-col green">{formatMontant(type.total_frais_dossier)}</td>
                                    {/* ✅ TOTAL RETARD */}
                                    <td className="num-col">
                                      {(type.total_montant_retard || 0) > 0 ? (
                                        <span className="retard-badge">
                                          <AlertTriangle size={12} />
                                          {formatMontant(type.total_montant_retard)}
                                        </span>
                                      ) : (
                                        <span className="no-retard">—</span>
                                      )}
                                    </td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* RÉCAPITULATION GÉNÉRALE */}
            {filteredRecap.length > 0 && (
              <div className="compte-recap-final">
                <h2>
                  {t('RÉCAPITULATION GÉNÉRALE', 'FAMINTINANA ANKAPOBENY', 'GENERAL SUMMARY')}
                </h2>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Type d\'usager', 'Karazana', 'User type')}</th>
                      <th className="num">{t('Nombre', 'Isany', 'Count')}</th>
                      <th className="num">{t('Montant total', 'Vola totaly', 'Total amount')}</th>
                      <th className="num">{t('Sans frais', 'Tsy sara', 'Without fees')}</th>
                      <th className="num">{t('Frais dossier', 'Sara', 'File fees')}</th>
                      <th className="num">{t('Retard', 'Tara', 'Late')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecap.map(tp => (
                      <tr key={tp.key}>
                        <td className="label-col">{tp.label.toUpperCase()}</td>
                        <td className="num">{tp.nombre}</td>
                        <td className="num">{formatMontant(tp.total_montant_avec_frais)}</td>
                        <td className="num">{formatMontant(tp.total_montant_sans_frais)}</td>
                        <td className="num">{formatMontant(tp.total_frais_dossier)}</td>
                        <td className="num">
                          {(tp.total_montant_retard || 0) > 0 ? (
                            <span className="retard-badge">
                              <AlertTriangle size={12} />
                              {formatMontant(tp.total_montant_retard)}
                            </span>
                          ) : (
                            <span className="no-retard">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="label-col">
                        {t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL')}
                      </td>
                      <td className="num">{filteredTotals.nombre}</td>
                      <td className="num">{formatMontant(filteredTotals.total_montant_avec_frais)}</td>
                      <td className="num">{formatMontant(filteredTotals.total_montant_sans_frais)}</td>
                      <td className="num">{formatMontant(filteredTotals.total_frais_dossier)}</td>
                      <td className="num">
                        {filteredTotals.total_montant_retard > 0 ? (
                          <span className="retard-badge">
                            <AlertTriangle size={12} />
                            {formatMontant(filteredTotals.total_montant_retard)}
                          </span>
                        ) : (
                          <span className="no-retard">—</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* ✅ MODALE DÉTAIL USAGER */}
      {detailUsager && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="usager-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="usager-detail-header">
              <div>
                <h3>{detailUsager.nom || '-'}</h3>
                <span className="usager-detail-badge">{detailUsager.typeLabel}</span>
              </div>
              <button className="usager-detail-close" onClick={closeDetail} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <div className="usager-detail-body">
              {/* Infos principales */}
              <div className="usager-info-grid">
                <div className="usager-info-item">
                  <span className="usager-info-label">
                    {t('Nom / Dénomination', 'Anarana', 'Name')}
                  </span>
                  <span className="usager-info-value">{detailUsager.nom || '-'}</span>
                </div>
                <div className="usager-info-item">
                  <span className="usager-info-label">
                    {t('Demandeur', 'Mpangataka', 'Applicant')}
                  </span>
                  <span className="usager-info-value">{detailUsager.demandeur || '-'}</span>
                </div>
                <div className="usager-info-item">
                  <span className="usager-info-label">
                    {t('Téléphone', 'Finday', 'Phone')}
                  </span>
                  <span className="usager-info-value">{detailUsager.telephone || '-'}</span>
                </div>
                <div className="usager-info-item">
                  <span className="usager-info-label">
                    {t('Région', 'Faritra', 'Region')}
                  </span>
                  <span className="usager-info-value">{detailUsager.region || '-'}</span>
                </div>
              </div>

              {/* Totaux */}
              <div className="usager-totaux-grid">
                <div className="usager-total-box primary">
                  <span className="usager-total-label">
                    {t('Montant total', 'Vola totaly', 'Total')}
                  </span>
                  <span className="usager-total-value">
                    {formatMontant(detailUsager.montant_avec_frais)}
                  </span>
                </div>
                <div className="usager-total-box">
                  <span className="usager-total-label">
                    {t('Sans frais', 'Tsy sara', 'Without fees')}
                  </span>
                  <span className="usager-total-value">
                    {formatMontant(detailUsager.montant_sans_frais)}
                  </span>
                </div>
                <div className="usager-total-box">
                  <span className="usager-total-label">
                    {t('Frais dossier', 'Sara', 'File fees')}
                  </span>
                  <span className="usager-total-value">
                    {formatMontant(detailUsager.frais_dossier)}
                  </span>
                </div>

                {/* ✅ NOUVEAU : Boîte Retard si > 0 */}
                {(toNumber(detailUsager.montant_retard) > 0 || detailMontantRetardTotal > 0) && (
                  <div className="usager-total-box danger">
                    <span className="usager-total-label">
                      <AlertTriangle size={12} /> {t('Retard', 'Tara', 'Late')}
                    </span>
                    <span className="usager-total-value">
                      {formatMontant(
                        toNumber(detailUsager.montant_retard) > 0
                          ? detailUsager.montant_retard
                          : detailMontantRetardTotal
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* ✅ ALERTE RETARD */}
              {detailHasRetard && (
                <div className="usager-retard-alert">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>
                      {t('Cet usager a des paiements en retard', 'Misy fandoavana tara ity mpampiasa ity', 'This user has late payments')}
                    </strong>
                    <p>
                      {t('Montant total des retards', 'Totalin\'ny vola tara', 'Total late amount')} : {' '}
                      <strong>{formatMontant(detailMontantRetardTotal)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Historique des paiements */}
              <div className="usager-paiements-section">
                <h4>
                  {t('Historique des paiements', 'Tantaran\'ny fandoavana', 'Payment history')}
                </h4>

                {detailLoading ? (
                  <div className="usager-paiements-loading">
                    <Loader2 size={24} className="spinning" />
                    <span>{t('Chargement...', 'Maka...', 'Loading...')}</span>
                  </div>
                ) : detailPaiements.length === 0 ? (
                  <div className="usager-paiements-empty">
                    <AlertCircle size={20} />
                    <span>{t('Aucun paiement enregistré', 'Tsy misy fandoavana', 'No payment')}</span>
                  </div>
                ) : (
                  <div className="usager-paiements-table-wrap">
                    <table className="usager-paiements-table">
                      <thead>
                        <tr>
                          <th>{t('Date', 'Daty', 'Date')}</th>
                          <th>{t('Type', 'Karazana', 'Type')}</th>
                          <th>{t('Année', 'Taona', 'Year')}</th>
                          <th>{t('Mois', 'Volana', 'Month')}</th>
                          <th className="num">{t('Montant', 'Vola', 'Amount')}</th>
                          <th className="num">{t('Frais', 'Sara', 'Fees')}</th>
                          {/* ✅ NOUVELLE COLONNE RETARD */}
                          <th className="num">{t('Retard', 'Tara', 'Late')}</th>
                          <th>{t('Référence', 'Reference', 'Reference')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailPaiements.map(p => {
                          const retardP = toNumber(p.montant_retard) || 0;
                          return (
                            <tr key={p.id}>
                              <td>{p.date_paiement ? new Date(p.date_paiement).toLocaleDateString(locale) : '-'}</td>
                              <td>
                                <span className={`paiement-type-badge ${p.type_paiement}`}>
                                  {p.type_paiement === 'unique'
                                    ? t('Unique', 'Tokana', 'Unique')
                                    : t('Mensuel', 'Isam-bolana', 'Monthly')}
                                </span>
                              </td>
                              <td>{p.annee || '-'}</td>
                              <td>{p.mois || '-'}</td>
                              <td className="num">{formatMontant(p.montant)}</td>
                              <td className="num">{formatMontant(p.frais_dossier)}</td>
                              {/* ✅ CELLULE RETARD PAR PAIEMENT */}
                              <td className="num">
                                {retardP > 0 ? (
                                  <span className="retard-badge">
                                    <AlertTriangle size={12} />
                                    {formatMontant(retardP)}
                                  </span>
                                ) : p.est_retard ? (
                                  <span className="retard-badge-warning">
                                    <Clock size={12} /> {t('En retard', 'Tara', 'Late')}
                                  </span>
                                ) : (
                                  <span className="no-retard">—</span>
                                )}
                              </td>
                              <td className="small">{p.reference || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* ✅ LIGNE DE TOTAL EN PIED */}
                      {detailMontantRetardTotal > 0 && (
                        <tfoot>
                          <tr className="usager-paiements-total-retard">
                            <td colSpan="6" className="total-label">
                              {t('TOTAL RETARDS', 'TOTALY TARA', 'TOTAL LATE FEES')}
                            </td>
                            <td className="num">
                              <span className="retard-badge">
                                <AlertTriangle size={12} />
                                {formatMontant(detailMontantRetardTotal)}
                              </span>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Comptet;