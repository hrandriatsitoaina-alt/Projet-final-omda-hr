// src/pages/fact.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, CheckSquare, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, CheckCircle, Clock, User,
  Calendar, DollarSign, Hash, Tag, Info, List, AlertCircle,
  RefreshCw, Building, MapPin, Phone, Mail, CreditCard,
  Briefcase, Key, Percent, FileCheck, ArrowLeft, Home,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useT } from '../hooks/useT';
import '../styles/facture_conf.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Fact = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [factures, setFactures] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vue, setVue] = useState('historique');
  const [pageCourante, setPageCourante] = useState(1);
  const [itemsParPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [dafName, setDafName] = useState('Directeur Financier');
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);

  const [filtreRegion, setFiltreRegion] = useState('');
  const [filtreAnnee, setFiltreAnnee] = useState('');
  const [filtreMois, setFiltreMois] = useState('');
  const [regionsDisponibles, setRegionsDisponibles] = useState([]);
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  const API_BASE = `${API_URL}/api/recfacture`;

  // ============================================================
  // HELPER : Type client → clé usager_type
  // ============================================================
  const refClientTypeToUsagerType = (refClientType) => {
    const map = {
      'HTL': 'hotel',
      'MGS': 'grand-surface',
      'RDP': 'media',
      'TRP': 'bus',
      'NGT': 'nightclub',
      'OCC': 'occ',
      'OTH': 'other',
      'AUT': 'other',
    };
    return map[refClientType] || null;
  };

  // ============================================================
  // ✅ HELPER : Calcul du taux d'un usager
  //    = paiements payés / (12 - mois de création + 1) × 100
  //    - Ne dépasse JAMAIS 100 %
  //    - Retourne 0 si aucun paiement
  // ============================================================
  const calcTauxUsager = useCallback((facture) => {
    if (!facture) return 0;

    const usagerType = refClientTypeToUsagerType(facture.ref_client_type);
    if (!usagerType) return 0;

    const usagerId = facture.ref_usager;
    if (!usagerId) return 0;

    const paiementsUsager = paiements.filter(
      (p) =>
        p.usager_id === usagerId &&
        p.usager_type === usagerType &&
        p.statut === 'paye'
    );

    if (paiementsUsager.length === 0) return 0;

    const anneeRef = parseInt(facture.annee_facture) || new Date().getFullYear();
    const anneeCreation =
      facture.created_at ? new Date(facture.created_at).getFullYear() : anneeRef;
    const moisCreation =
      facture.created_at ? new Date(facture.created_at).getMonth() + 1 : 1;

    let moisDebut = 1;
    if (anneeRef === anneeCreation) moisDebut = moisCreation;
    const moisAttendus = 12 - moisDebut + 1;

    const moisPayesSet = new Set();
    for (const p of paiementsUsager) {
      if (p.annee === anneeRef && p.mois && p.mois >= moisDebut) {
        moisPayesSet.add(p.mois);
      }
    }

    let moisPayes = moisPayesSet.size;
    if (moisPayes === 0) {
      const fallbackSet = new Set();
      for (const p of paiementsUsager) {
        if (p.mois) fallbackSet.add(`${p.annee || anneeRef}_${p.mois}`);
      }
      moisPayes = fallbackSet.size;
    }

    if (moisAttendus <= 0) return 0;

    const taux = (moisPayes / moisAttendus) * 100;
    return Math.min(100, Math.round(taux * 100) / 100);
  }, [paiements]);

  // ============================================================
  // ✅ HELPER : Format du taux → "XX.XX %"
  // ============================================================
  const formatTaux = useCallback((taux) => {
    const n = parseFloat(taux);
    if (isNaN(n)) return '0.00 %';
    return `${n.toFixed(2)} %`;
  }, []);

  // ============================================================
  // FETCH DAF
  // ============================================================
  useEffect(() => {
    const fetchDafName = async () => {
      try {
        const response = await axios.get(`${API_BASE}/daf-name`);
        if (response.data.success) setDafName(response.data.dafName);
      } catch (err) {
        console.error('❌ Erreur récupération DAF:', err.message);
      }
    };
    fetchDafName();
  }, []);

  // ============================================================
  // FETCH FACTURES + PAIEMENTS
  // ============================================================
  useEffect(() => {
    fetchFactures();
    fetchPaiements();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (factures.length > 0) extraireFiltresDisponibles();
    // eslint-disable-next-line
  }, [factures]);

  const extraireFiltresDisponibles = () => {
    const regions = new Set();
    const annees = new Set();
    factures.forEach(f => {
      if (f.region_usager && f.region_usager.trim() !== '') regions.add(f.region_usager.trim());
      if (f.annee_facture) annees.add(f.annee_facture);
    });
    setRegionsDisponibles(Array.from(regions).sort());
    setAnneesDisponibles(Array.from(annees).sort((a, b) => b - a));
  };

  const fetchFactures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/factures`);
      if (response.data.success) {
        const facturesData = response.data.factures || [];
        const sortedFactures = [...facturesData].sort((a, b) => {
          const numA = a.num_facture || a.ref_omda || '';
          const numB = b.num_facture || b.ref_omda || '';
          const parseNumFacture = (str) => {
            const s = String(str || '');
            const match = s.match(/^(\d+)(?:-([A-Za-z]))?$/);
            if (match) return { num: parseInt(match[1]), suffix: match[2] || '' };
            return { num: parseInt(s) || 0, suffix: '' };
          };
          const parsedA = parseNumFacture(numA);
          const parsedB = parseNumFacture(numB);
          if (parsedA.num !== parsedB.num) return parsedA.num - parsedB.num;
          return parsedA.suffix.localeCompare(parsedB.suffix);
        });
        setFactures(sortedFactures);
        if (sortedFactures.length > 0) {
          setFactureSelectionnee(sortedFactures[0]);
          setPageCourante(1);
        }
        if (response.data.dafName) setDafName(response.data.dafName);
      } else {
        setError(response.data.message || t(
          'Erreur lors du chargement des factures',
          'Nisy olana tamin\'ny fakana ny faktiora',
          'Error loading invoices'
        ));
      }
    } catch (err) {
      console.error('❌ Erreur récupération factures:', err.message);
      if (err.response) {
        if (err.response.status === 404) setError(t('Route API non trouvée (404).', 'Tsy hita ny lalana API (404).', 'API route not found (404).'));
        else if (err.response.status === 500) setError(`${t('Erreur serveur', 'Olana amin\'ny serveur', 'Server error')} (500): ${err.response.data?.message || t('Erreur interne', 'Olana anatiny', 'Internal error')}`);
        else setError(`Erreur ${err.response.status}: ${err.response.data?.message || err.message}`);
      } else if (err.request) {
        setError(t('Impossible de contacter le serveur.', 'Tsy afaka mifandray amin\'ny serveur.', 'Cannot contact server.'));
      } else {
        setError(`Erreur: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPaiements = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/paiements/tous`);
      if (response.data.success) {
        setPaiements(response.data.paiements || []);
        console.log(`✅ ${response.data.paiements?.length || 0} paiements chargés`);
      }
    } catch (err) {
      console.error('❌ Erreur chargement paiements:', err.message);
      setPaiements([]);
    }
  };

  const handleBackToDashboard = () => navigate('/dashboard');

  // ============================================================
  // FORMATTERS
  // ============================================================
  const formatQuittance = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const str = String(num);
    if (/^\d{7,}$/.test(str)) return str;
    const clean = str.replace(/\D/g, '');
    if (!clean) return '';
    return clean.padStart(7, '0');
  };

  const formatMontant = useCallback((m) => {
    if (!m && m !== 0) return '0';
    return new Intl.NumberFormat(locale).format(m);
  }, [locale]);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  }, [locale]);

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

  const getMonthName = (month) => moisLabels[month - 1] || '';

  const getMoisOptions = () => [
    { value: '', label: t('Tous les mois', 'Ny volana rehetra', 'All months') },
    ...moisLabels.map((label, idx) => ({ value: String(idx + 1), label })),
  ];

  const resetFilters = () => {
    setFiltreRegion('');
    setFiltreAnnee('');
    setFiltreMois('');
    setPageCourante(1);
  };

  const filteredFactures = factures.filter(f => {
    const search = searchTerm.toLowerCase();
    const matchSearch = (
      (f.num_facture && String(f.num_facture).toLowerCase().includes(search)) ||
      (f.denomination && String(f.denomination).toLowerCase().includes(search)) ||
      (f.demandeur && String(f.demandeur).toLowerCase().includes(search)) ||
      (f.quittance && String(f.quittance).includes(search)) ||
      (f.ref_omda && String(f.ref_omda).includes(search)) ||
      (f.ref_client_type && String(f.ref_client_type).toLowerCase().includes(search)) ||
      (f.nif && String(f.nif).toLowerCase().includes(search)) ||
      (f.stat && String(f.stat).toLowerCase().includes(search))
    );
    if (!matchSearch) return false;
    if (filtreRegion && (!f.region_usager || f.region_usager !== filtreRegion)) return false;
    if (filtreAnnee && f.annee_facture !== parseInt(filtreAnnee)) return false;
    if (filtreMois && f.mois_facture !== parseInt(filtreMois)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredFactures.length / itemsParPage);
  const paginatedFactures = filteredFactures.slice(
    (pageCourante - 1) * itemsParPage,
    pageCourante * itemsParPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPageCourante(newPage);
  };

  const handleSelectFacture = (facture) => setFactureSelectionnee(facture);

  const renderPageNumbers = () => {
    const numbers = [];
    const total = Math.min(filteredFactures.length, 200);
    const start = Math.max(1, pageCourante - 5);
    const end = Math.min(total, pageCourante + 5);
    for (let i = start; i <= end; i++) numbers.push(i);
    return numbers;
  };

  // ============================================================
  // HEADER
  // ============================================================
  const renderHeader = () => (
    <div className="fact-header">
      <div className="fact-header-top">
        <div className="fact-header-logo">
          <FileText size={28} className="fact-logo-icon" />
          <div>
            <h1>OMDA</h1>
            <span>
              {t(
                "Office Malagasy du Droit d'Auteur",
                "Birao Malagasy momba ny Zon'ny Mpanoratra",
                'Malagasy Copyright Office'
              )}
            </span>
          </div>
        </div>
        <div className="fact-header-actions">
          <button
            className={`fact-btn-action ${vue === 'historique' ? 'active' : ''}`}
            onClick={() => { setVue('historique'); setPageCourante(1); }}
          >
            <List size={16} /> {t('Historique de facture', 'Tantaran\'ny faktiora', 'Invoice history')}
          </button>
          <button
            className={`fact-btn-action ${vue === 'checklist' ? 'active' : ''}`}
            onClick={() => { setVue('checklist'); setPageCourante(1); }}
          >
            <CheckSquare size={16} /> {t('Check list', 'Check list', 'Check list')}
          </button>
        </div>
      </div>

      <div className="fact-header-search">
        <div className="fact-search-wrapper">
          <Search size={16} className="fact-search-icon" />
          <input
            type="text"
            className="fact-search-input"
            placeholder={t(
              'Rechercher une facture (N°, client, quittance...)',
              'Hikaroka faktiora (N°, mpanjifa, taratasy...)',
              'Search invoice (N°, client, receipt...)'
            )}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPageCourante(1); }}
          />
        </div>

        <div className="fact-filter-wrapper">
          <select className="fact-filter-select" value={filtreRegion}
            onChange={(e) => { setFiltreRegion(e.target.value); setPageCourante(1); }}>
            <option value="">{t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}</option>
            {regionsDisponibles.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          <select className="fact-filter-select" value={filtreAnnee}
            onChange={(e) => { setFiltreAnnee(e.target.value); setPageCourante(1); }}>
            <option value="">{t('Toutes les années', 'Ny taona rehetra', 'All years')}</option>
            {anneesDisponibles.map(annee => (
              <option key={annee} value={annee}>{annee}</option>
            ))}
          </select>

          <select className="fact-filter-select" value={filtreMois}
            onChange={(e) => { setFiltreMois(e.target.value); setPageCourante(1); }}>
            {getMoisOptions().map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          {(filtreRegion || filtreAnnee || filtreMois || searchTerm) && (
            <button className="fact-btn-filter-reset" onClick={resetFilters} title={t('Réinitialiser', 'Averina', 'Reset')}>
              <X size={14} />
            </button>
          )}
        </div>

        <span className="fact-total-badge">
          <FileText size={14} />
          {filteredFactures.length} {t('facture(s)', 'faktiora', 'invoice(s)')}
        </span>
        <button className="fact-btn-refresh" onClick={fetchFactures} title={t('Rafraîchir', 'Havaozy', 'Refresh')}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );

  // ============================================================
  // HISTORIQUE
  // ============================================================
  const renderHistorique = () => (
    <div className="fact-historique">
      <div className="fact-table-wrapper">
        <table className="fact-table">
          <thead>
            <tr>
              <th className="fact-col-num"><Hash size={14} /> #</th>
              <th><FileText size={14} /> {t('N° FACTURE', 'N° FAKTIORA', 'INVOICE N°')}</th>
              <th className="fact-col-client"><User size={14} /> {t('CLIENT', 'MPANJIFA', 'CLIENT')}</th>
              <th className="fact-col-description"><FileText size={14} /> {t('DÉNOMINATION', 'ANARANA', 'NAME')}</th>
              <th className="fact-col-total"><DollarSign size={14} /> {t('TOTAL', 'TOTALY', 'TOTAL')}</th>
              <th className="fact-col-date"><Calendar size={14} /> {t('DATE', 'DATY', 'DATE')}</th>
              <th className="fact-col-paiement"><CheckCircle size={14} /> {t('PAIEMENT', 'FANDOAVANA', 'PAYMENT')}</th>
              <th className="fact-col-quittance"><Tag size={14} /> {t('QUITTANCE', 'TARATASY', 'RECEIPT')}</th>
              <th className="fact-col-taux"><Percent size={14} /> {t('TAUX', 'TAUX', 'RATE')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="fact-loading-cell">
                  <div className="fact-spinner"></div>
                  {t('Chargement des factures...', 'Maka ny faktiora...', 'Loading invoices...')}
                </td>
              </tr>
            ) : paginatedFactures.length === 0 ? (
              <tr>
                <td colSpan="9" className="fact-empty-cell">
                  <FileText size={32} />
                  <p>{t('Aucune facture trouvée', 'Tsy misy faktiora hita', 'No invoice found')}</p>
                  <button className="fact-btn-retry" onClick={fetchFactures}>
                    <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
                  </button>
                </td>
              </tr>
            ) : (
              paginatedFactures.map((facture, index) => {
                const num = (pageCourante - 1) * itemsParPage + index + 1;
                const refClient = facture.ref_client_type || '';
                const refUsager = facture.ref_usager || '';
                const clientRef = refClient && refUsager ? `${refClient}/${String(refUsager).padStart(3, '0')}` : '-';

                const taux = calcTauxUsager(facture);

                return (
                  <tr
                    key={facture.id}
                    className={factureSelectionnee?.id === facture.id ? 'selected' : ''}
                    onClick={() => handleSelectFacture(facture)}
                  >
                    <td className="fact-col-num">{String(num).padStart(3, '0')}</td>
                    <td>{facture.num_facture || facture.ref_omda || '-'}</td>
                    <td className="fact-col-client">{clientRef}</td>
                    <td className="fact-col-description">{facture.denomination || facture.demandeur || '-'}</td>
                    <td className="fact-col-total">{formatMontant(facture.soit_total)}</td>
                    <td className="fact-col-date">{formatDate(facture.date_ajout)}</td>
                    <td className="fact-col-paiement">
                      {facture.statut === 'validee' ? (
                        <CheckCircle size={16} className="fact-icon-valid" />
                      ) : (
                        <Clock size={16} className="fact-icon-pending" />
                      )}
                    </td>
                    <td className="fact-col-quittance">{formatQuittance(facture.quittance)}</td>
                    {/* ✅ PAS d'icône <Percent /> à l'intérieur — le formatTaux inclut déjà "%" */}
                    <td className="fact-col-taux">
                      <span className={`fact-taux-badge ${taux >= 100 ? 'taux-full' : taux > 0 ? 'taux-partial' : 'taux-zero'}`}>
                        {formatTaux(taux)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="fact-pagination">
          <button className="fact-page-btn" onClick={() => handlePageChange(1)} disabled={pageCourante === 1}>
            <ChevronsLeft size={14} />
          </button>
          <button className="fact-page-btn" onClick={() => handlePageChange(pageCourante - 1)} disabled={pageCourante === 1}>
            <ChevronLeft size={14} />
          </button>
          {renderPageNumbers().map(num => (
            <button key={num} className={`fact-page-btn ${num === pageCourante ? 'active' : ''}`} onClick={() => handlePageChange(num)}>
              {num}
            </button>
          ))}
          <button className="fact-page-btn" onClick={() => handlePageChange(pageCourante + 1)} disabled={pageCourante === totalPages}>
            <ChevronRight size={14} />
          </button>
          <button className="fact-page-btn" onClick={() => handlePageChange(totalPages)} disabled={pageCourante === totalPages}>
            <ChevronsRight size={14} />
          </button>
          <span className="fact-page-info">{pageCourante} / {totalPages}</span>
        </div>
      )}

      <div className="fact-footer-back">
        <button className="fact-btn-back" onClick={handleBackToDashboard}>
          <ArrowLeft size={18} />
          <Home size={18} />
          <span>{t('Accueil', 'Hiverina amin\'ny Tabilao', 'Back to Dashboard')}</span>
        </button>
      </div>
    </div>
  );

  // ============================================================
  // CHECKLIST
  // ============================================================
  const renderChecklist = () => (
    <div className="fact-checklist">
      <div className="fact-checklist-header">
        <h2><CheckSquare size={20} /> {t('CHECK LIST DES FACTURES', 'CHECK LIST NY FAKTIORA', 'INVOICE CHECKLIST')}</h2>
        <div className="fact-checklist-stats">
          <span><FileText size={14} /> {t('Total', 'Totaly', 'Total')}: {filteredFactures.length}</span>
          <span><CheckCircle size={14} /> {t('Validées', 'Voamarina', 'Validated')}: {filteredFactures.filter(f => f.statut === 'validee').length}</span>
          <span><Clock size={14} /> {t('En attente', 'Miandry', 'Pending')}: {filteredFactures.filter(f => f.statut !== 'validee').length}</span>
        </div>
      </div>
      <div className="fact-checklist-grid">
        {loading ? (
          <div className="fact-loading-text">
            <div className="fact-spinner"></div>
            {t('Chargement de la checklist...', 'Maka ny checklist...', 'Loading checklist...')}
          </div>
        ) : filteredFactures.length === 0 ? (
          <div className="fact-empty-text">
            <FileText size={32} />
            <p>{t('Aucune facture dans la checklist', 'Tsy misy faktiora ao amin\'ny checklist', 'No invoice in checklist')}</p>
            <button className="fact-btn-retry" onClick={fetchFactures}>
              <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
            </button>
          </div>
        ) : (
          filteredFactures.slice(0, 100).map((facture, index) => {
            const taux = calcTauxUsager(facture);
            return (
              <div
                key={facture.id}
                className={`fact-checklist-item ${factureSelectionnee?.id === facture.id ? 'selected' : ''}`}
                onClick={() => handleSelectFacture(facture)}
              >
                <div className="fact-checklist-num">{String(index + 1).padStart(3, '0')}</div>
                <div className="fact-checklist-content">
                  <div>
                    <span className="label"><FileText size={12} /> {t('N° Facture', 'N° Faktiora', 'Invoice N°')}:</span>
                    <span className="value">{facture.num_facture || facture.ref_omda || '-'}</span>
                  </div>
                  <div>
                    <span className="label"><User size={12} /> {t('Client', 'Mpanjifa', 'Client')}:</span>
                    <span className="value">{facture.denomination || facture.demandeur || '-'}</span>
                  </div>
                  <div>
                    <span className="label"><DollarSign size={12} /> {t('Montant', 'Vola', 'Amount')}:</span>
                    <span className="value">{formatMontant(facture.soit_total)} Ar</span>
                  </div>
                  <div>
                    <span className="label"><Tag size={12} /> {t('Quittance', 'Taratasy', 'Receipt')}:</span>
                    <span className="value">{formatQuittance(facture.quittance)}</span>
                  </div>
                  <div>
                    <span className="label"><Calendar size={12} /> {t('Date', 'Daty', 'Date')}:</span>
                    <span className="value">{formatDate(facture.date_ajout)}</span>
                  </div>
                  {/* ✅ PAS d'icône <Percent /> dans le badge */}
                  <div>
                    <span className="label"><Percent size={12} /> {t('Taux', 'Taux', 'Rate')}:</span>
                    <span className={`fact-taux-badge ${taux >= 100 ? 'taux-full' : taux > 0 ? 'taux-partial' : 'taux-zero'}`}>
                      {formatTaux(taux)}
                    </span>
                  </div>
                  <div className="fact-checklist-statut">
                    <span className={`fact-statut-badge ${facture.statut}`}>
                      {facture.statut === 'validee' ? (
                        <><CheckCircle size={12} /> {t('Validée', 'Voamarina', 'Validated')}</>
                      ) : (
                        <><Clock size={12} /> {t('En attente', 'Miandry', 'Pending')}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {filteredFactures.length > 100 && (
        <div className="fact-checklist-more">
          + {filteredFactures.length - 100} {t('autres factures...', 'faktiora hafa...', 'other invoices...')}
        </div>
      )}

      <div className="fact-checklist-footer">
        <button className="fact-btn-back" onClick={handleBackToDashboard}>
          <ArrowLeft size={18} />
          <Home size={18} />
          <span>{t('Retour au Dashboard', 'Hiverina amin\'ny Tabilao', 'Back to Dashboard')}</span>
        </button>
      </div>
    </div>
  );

  // ============================================================
  // FACTURE DETAIL
  // ============================================================
  const renderFactureDetail = () => {
    if (!factureSelectionnee) return null;
    const f = factureSelectionnee;
    const taux = calcTauxUsager(f);

    return (
      <div className="fact-detail">
        <div className="fact-detail-header">
          <h3><FileText size={16} /> {t('FACTURE N°', 'FAKTIORA N°', 'INVOICE N°')} {f.num_facture || f.ref_omda}</h3>
          <button className="fact-btn-close-detail" onClick={() => setFactureSelectionnee(null)}>
            <X size={18} />
          </button>
        </div>

        <div className="fact-detail-body">
          <div className="fact-detail-section">
            <div className="fact-detail-section-title">
              <User size={14} /> {t('INFORMATIONS CLIENT', 'FAMPAHALALANA MPANJIFA', 'CLIENT INFORMATION')}
            </div>
            <div className="fact-detail-row">
              <span className="fact-detail-label"><User size={14} /> {t('Dénomination', 'Anarana', 'Name')}:</span>
              <span className="fact-detail-value">{f.denomination || f.demandeur || '-'}</span>
            </div>
            {f.siege && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Building size={14} /> {t('Siège', 'Foibe', 'Head office')}:</span>
                <span className="fact-detail-value">{f.siege}</span>
              </div>
            )}
            {f.adresse && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}:</span>
                <span className="fact-detail-value">{f.adresse}</span>
              </div>
            )}
            {f.telephone && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}:</span>
                <span className="fact-detail-value">{f.telephone}</span>
              </div>
            )}
            {f.email && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Mail size={14} /> Email:</span>
                <span className="fact-detail-value">{f.email}</span>
              </div>
            )}
            {f.nif && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Key size={14} /> NIF:</span>
                <span className="fact-detail-value">{f.nif}</span>
              </div>
            )}
            {f.stat && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><FileCheck size={14} /> STAT:</span>
                <span className="fact-detail-value">{f.stat}</span>
              </div>
            )}
          </div>

          <div className="fact-detail-section">
            <div className="fact-detail-section-title">
              <FileText size={14} /> {t('INFORMATIONS FACTURE', 'FAMPAHALALANA FAKTIORA', 'INVOICE INFORMATION')}
            </div>
            <div className="fact-detail-row">
              <span className="fact-detail-label"><Tag size={14} /> {t('Quittance', 'Taratasy', 'Receipt')}:</span>
              <span className="fact-detail-value">{formatQuittance(f.quittance)}</span>
            </div>
            <div className="fact-detail-row">
              <span className="fact-detail-label"><DollarSign size={14} /> {t('Montant total', 'Vola total', 'Total amount')}:</span>
              <span className="fact-detail-value montant">{formatMontant(f.soit_total)} Ar</span>
            </div>
            {f.montant_mensuel && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><DollarSign size={14} /> {t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}:</span>
                <span className="fact-detail-value">{formatMontant(f.montant_mensuel)} Ar</span>
              </div>
            )}
            {f.frais_dossier && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><DollarSign size={14} /> {t('Frais dossier', 'Saram-pandraharahana', 'File fees')}:</span>
                <span className="fact-detail-value">{formatMontant(f.frais_dossier)} Ar</span>
              </div>
            )}
            {f.montant_retard && f.is_retard && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Clock size={14} /> {t('Montant retard', 'Vola tara', 'Late amount')}:</span>
                <span className="fact-detail-value">{formatMontant(f.montant_retard)} Ar</span>
              </div>
            )}

            {/* ✅ TAUX — Pas d'icône <Percent /> dans le badge */}
            <div className="fact-detail-row">
              <span className="fact-detail-label"><Percent size={14} /> {t('Taux de paiement', 'Taha fandoavana', 'Payment rate')}:</span>
              <span className="fact-detail-value">
                <span className={`fact-taux-badge ${taux >= 100 ? 'taux-full' : taux > 0 ? 'taux-partial' : 'taux-zero'}`}>
                  {formatTaux(taux)}
                </span>
              </span>
            </div>

            <div className="fact-detail-row">
              <span className="fact-detail-label"><Calendar size={14} /> {t('Date création', 'Daty namoronana', 'Creation date')}:</span>
              <span className="fact-detail-value">{formatDate(f.date_ajout)}</span>
            </div>
            <div className="fact-detail-row">
              <span className="fact-detail-label"><Info size={14} /> {t('Statut', 'Toe-javatra', 'Status')}:</span>
              <span className={`fact-statut-badge ${f.statut}`}>
                {f.statut === 'validee' ? (
                  <><CheckCircle size={12} /> {t('Validée', 'Voamarina', 'Validated')}</>
                ) : (
                  <><Clock size={12} /> {t('En attente', 'Miandry', 'Pending')}</>
                )}
              </span>
            </div>
            <div className="fact-detail-row">
              <span className="fact-detail-label"><FileText size={14} /> {t('Type', 'Karazana', 'Type')}:</span>
              <span className="fact-detail-value">{f.type_facture || 'DAFC'}</span>
            </div>
            {f.num_facture_type && (
              <div className="fact-detail-row">
                <span className="fact-detail-label"><Hash size={14} /> {t('Type facture', 'Karazana faktiora', 'Invoice type')}:</span>
                <span className="fact-detail-value">{f.num_facture_type}</span>
              </div>
            )}
          </div>

          {(f.mois_facture || f.annee_facture || f.mois_groupes) && (
            <div className="fact-detail-section">
              <div className="fact-detail-section-title">
                <Calendar size={14} /> {t('PÉRIODE', 'FE-POTOANA', 'PERIOD')}
              </div>
              {f.mois_facture && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Calendar size={14} /> {t('Mois', 'Volana', 'Month')}:</span>
                  <span className="fact-detail-value">{getMonthName(f.mois_facture)} {f.annee_facture || ''}</span>
                </div>
              )}
              {f.mois_groupes && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Calendar size={14} /> {t('Mois groupés', 'Volana mitambatra', 'Grouped months')}:</span>
                  <span className="fact-detail-value">
                    {String(f.mois_groupes).split(',').map(m => getMonthName(parseInt(m))).join(', ')}
                  </span>
                </div>
              )}
              {f.type_groupe && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Info size={14} /> {t('Type groupe', 'Karazana vondrona', 'Group type')}:</span>
                  <span className="fact-detail-value">{f.type_groupe}</span>
                </div>
              )}
            </div>
          )}

          {(f.representant_nom || f.representant_adresse || f.representant_tel || f.representant_cin || f.representant_fonction) && (
            <div className="fact-detail-section">
              <div className="fact-detail-section-title">
                <Briefcase size={14} /> {t('REPRÉSENTANT', 'MPISOLO TENA', 'REPRESENTATIVE')}
              </div>
              {f.representant_nom && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><User size={14} /> {t('Nom', 'Anarana', 'Name')}:</span>
                  <span className="fact-detail-value">{f.representant_nom}</span>
                </div>
              )}
              {f.representant_fonction && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Briefcase size={14} /> {t('Fonction', 'Asa', 'Position')}:</span>
                  <span className="fact-detail-value">{f.representant_fonction}</span>
                </div>
              )}
              {f.representant_adresse && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}:</span>
                  <span className="fact-detail-value">{f.representant_adresse}</span>
                </div>
              )}
              {f.representant_tel && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}:</span>
                  <span className="fact-detail-value">{f.representant_tel}</span>
                </div>
              )}
              {f.representant_cin && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Key size={14} /> CIN:</span>
                  <span className="fact-detail-value">{f.representant_cin}</span>
                </div>
              )}
            </div>
          )}

          {(f.description_personnalisee || f.personne_recu || f.activite || f.uniter || f.suffixe) && (
            <div className="fact-detail-section">
              <div className="fact-detail-section-title">
                <Info size={14} /> {t('INFORMATIONS COMPLÉMENTAIRES', 'FAMPAHALALANA FANAMPINY', 'ADDITIONAL INFORMATION')}
              </div>
              {f.activite && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Briefcase size={14} /> {t('Activité', 'Asa', 'Activity')}:</span>
                  <span className="fact-detail-value">{f.activite}</span>
                </div>
              )}
              {f.description_personnalisee && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><FileText size={14} /> {t('Description', 'Fanazavana', 'Description')}:</span>
                  <span className="fact-detail-value">{f.description_personnalisee}</span>
                </div>
              )}
              {f.personne_recu && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><User size={14} /> {t('Reçu par', 'Noraisin\'i', 'Received by')}:</span>
                  <span className="fact-detail-value">{f.personne_recu}</span>
                </div>
              )}
              {f.uniter && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><FileText size={14} /> {t('Unité', 'Isan\'ny', 'Unit')}:</span>
                  <span className="fact-detail-value">{f.uniter}</span>
                </div>
              )}
              {f.suffixe && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><Hash size={14} /> {t('Suffixe', 'Suffixe', 'Suffix')}:</span>
                  <span className="fact-detail-value">{f.suffixe}</span>
                </div>
              )}
              {f.quittance_validee !== undefined && f.quittance_validee !== null && (
                <div className="fact-detail-row">
                  <span className="fact-detail-label"><CheckCircle size={14} /> {t('Quittance validée', 'Taratasy voamarina', 'Receipt validated')}:</span>
                  <span className="fact-detail-value">
                    {f.quittance_validee ? t('Oui', 'Eny', 'Yes') : t('Non', 'Tsia', 'No')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fact-page">
      {error && (
        <div className="fact-error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {renderHeader()}

      <div className="fact-content">
        <div className={`fact-main ${factureSelectionnee ? 'with-detail' : ''}`}>
          {vue === 'historique' ? renderHistorique() : renderChecklist()}
        </div>

        {factureSelectionnee && (
          <div className="fact-sidebar">
            {renderFactureDetail()}
          </div>
        )}
      </div>

      <div className="fact-footer">
        <div className="fact-footer-left">
          <User size={14} />
          <span>DAF: {dafName}</span>
        </div>
        <div className="fact-footer-center">
          <span>© {new Date().getFullYear()} - OMDA</span>
        </div>
        <div className="fact-footer-right">
          <span>Version 1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Fact;