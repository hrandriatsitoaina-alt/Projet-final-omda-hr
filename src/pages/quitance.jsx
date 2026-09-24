// src/pages/quitance.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  X, CheckCircle, Clock, User, Calendar, DollarSign, Hash, Tag,
  AlertCircle, RefreshCw, MapPin, BookOpen, Building, Phone, Mail,
  Key, FileCheck, Briefcase, Percent, Home, ArrowLeft, Download,
  Loader2, UserPlus, Info
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/quitance.css';
import { generateQuitancePDF } from './pdf/quitance_pdf';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const Quitance = () => {
  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  // États principaux
  const [quittances, setQuittances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageCourante, setPageCourante] = useState(1);
  const [itemsParPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('toutes');
  const [regions, setRegions] = useState([]);
  const [stats, setStats] = useState(null);
  const [quittanceSelectionnee, setQuittanceSelectionnee] = useState(null);
  const [numeroCarnetDebut, setNumeroCarnetDebut] = useState('');
  const [numeroCarnetFin, setNumeroCarnetFin] = useState('');

  // États pour le PDF
  const [responsable, setResponsable] = useState('');
  const [lieuAgence, setLieuAgence] = useState('Antananarivo');
  const [dateDelivre, setDateDelivre] = useState(new Date().toLocaleDateString('fr-FR'));
  const [dateRetour, setDateRetour] = useState('');
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');

  const navigate = useNavigate();
  const pdfOptionsRef = useRef(null);

  const API_BASE = 'http://localhost:3001/api';

  // ✅ Mois traduits selon la langue
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

  // ✅ Labels de type client traduits
  const getTypeLabel = useCallback((type) => {
    const labels = {
      'HTL': t('Hôtel', 'Hotely', 'Hotel'),
      'MGS': t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface'),
      'RDP': t('Radio/Télé', 'Radio/Tele', 'Radio/TV'),
      'TRP': t('Transport', 'Fitaterana', 'Transport'),
      'NGT': t('Night Club', 'Club alina', 'Night Club'),
      'OCC': t('Occasionnel', 'Fotoana manokana', 'Occasional'),
      'OTH': t('Usager événementiel', 'Mpampiasa hetsika', 'Event user'),
    };
    return labels[type] || type || '-';
  }, [t]);

  // Récupérer les régions
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await axios.get(`${API_BASE}/regions`);
        if (response.data.success) {
          setRegions(response.data.regions || []);
        }
      } catch (err) {
        console.error('❌ Erreur récupération régions:', err);
      }
    };
    fetchRegions();
  }, []);

  // Récupérer les quittances
  useEffect(() => {
    fetchQuittances();
    // eslint-disable-next-line
  }, [regionFilter]);

  // Fermer le menu PDF au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pdfOptionsRef.current && !pdfOptionsRef.current.contains(event.target)) {
        setShowPDFOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchQuittances = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/quitance/liste`;
      if (regionFilter !== 'toutes') {
        url = `${API_BASE}/quitance/region/${encodeURIComponent(regionFilter)}`;
      }

      const response = await axios.get(url);

      if (response.data.success) {
        const quittancesData = response.data.quittances || [];
        setQuittances(quittancesData);

        if (quittancesData.length > 0) {
          setQuittanceSelectionnee(quittancesData[0]);
          const premier = quittancesData[0]?.quittance || 0;
          const dernier = quittancesData[quittancesData.length - 1]?.quittance || 0;
          setNumeroCarnetDebut(String(premier).padStart(7, '0'));
          setNumeroCarnetFin(String(dernier).padStart(7, '0'));
        }

        await fetchStats();
      } else {
        setError(response.data.message || t('Erreur lors du chargement des quittances', 'Nisy olana tamin\'ny fakana ny taratasy', 'Error loading receipts'));
      }
    } catch (err) {
      console.error('❌ Erreur détaillée récupération quittances:', err);

      if (err.response) {
        if (err.response.status === 404) {
          setError(t(
            `Route API non trouvée (404). Vérifiez que ${API_BASE}/quitance/liste existe.`,
            `Tsy hita ny route API (404). Hamarino raha misy ${API_BASE}/quitance/liste.`,
            `API route not found (404). Check that ${API_BASE}/quitance/liste exists.`
          ));
        } else if (err.response.status === 500) {
          setError(`${t('Erreur serveur (500)', 'Olana amin\'ny serveur (500)', 'Server error (500)')}: ${err.response.data?.message || t('Erreur interne', 'Olana anatiny', 'Internal error')}`);
        } else {
          setError(`${t('Erreur', 'Olana', 'Error')} ${err.response.status}: ${err.response.data?.message || err.message}`);
        }
      } else if (err.request) {
        setError(t(
          'Impossible de contacter le serveur. Vérifiez que le serveur est en cours d\'exécution.',
          'Tsy afaka mifandray amin\'ny serveur. Hamarino raha mandeha ny serveur.',
          'Cannot reach server. Check that the server is running.'
        ));
      } else {
        setError(`${t('Erreur', 'Olana', 'Error')}: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/quitance/stats`);
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('❌ Erreur récupération stats:', err);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const formatQuittance = (num) => {
    if (!num && num !== 0) return '';
    return String(num).padStart(7, '0');
  };

  const formatMontant = (montant) => {
    if (!montant && montant !== 0) return '0';
    return new Intl.NumberFormat(locale, {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const jour = String(date.getDate()).padStart(2, '0');
      const mois = String(date.getMonth() + 1).padStart(2, '0');
      const annee = date.getFullYear();
      return `${jour}/${mois}/${annee}`;
    } catch {
      return '';
    }
  };

  const getMonthName = useCallback((month) => {
    return moisLabels[month - 1] || '';
  }, [moisLabels]);

  // Filtrer les quittances
  const filteredQuittances = quittances.filter(q => {
    const search = searchTerm.toLowerCase();
    return (
      (q.quittance && String(q.quittance).includes(search)) ||
      (q.num_facture && q.num_facture.toLowerCase().includes(search)) ||
      (q.denomination && q.denomination.toLowerCase().includes(search)) ||
      (q.demandeur && q.demandeur.toLowerCase().includes(search)) ||
      (q.region_usager && q.region_usager && q.region_usager.toLowerCase().includes(search)) ||
      (q.ref_client_type && q.ref_client_type.toLowerCase().includes(search)) ||
      (q.ref_usager && String(q.ref_usager).includes(search))
    );
  });

  const totalPages = Math.ceil(filteredQuittances.length / itemsParPage);
  const paginatedQuittances = filteredQuittances.slice(
    (pageCourante - 1) * itemsParPage,
    pageCourante * itemsParPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPageCourante(newPage);
    }
  };

  const handleSelectQuittance = (quittance) => {
    setQuittanceSelectionnee(quittance);
  };

  const renderPageNumbers = () => {
    const numbers = [];
    const total = Math.min(filteredQuittances.length, 200);
    const start = Math.max(1, pageCourante - 5);
    const end = Math.min(total, pageCourante + 5);

    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
    return numbers;
  };

  // Génération du PDF
  const handleGeneratePDF = () => {
    if (filteredQuittances.length === 0) {
      setGenerationMessage(`⚠️ ${t('Aucune quittance à générer', 'Tsy misy taratasy hamoronana', 'No receipt to generate')}`);
      setTimeout(() => setGenerationMessage(''), 3000);
      return;
    }

    if (!responsable || responsable.trim() === '') {
      setGenerationMessage(`⚠️ ${t('Veuillez saisir le nom du responsable', 'Ampidiro ny anaran\'ny tompon\'andraikitra', 'Please enter the manager name')}`);
      setTimeout(() => setGenerationMessage(''), 3000);
      return;
    }

    setIsGeneratingPDF(true);
    setShowPDFOptions(false);
    setGenerationMessage(`🔄 ${t('Génération du PDF en cours...', 'Mamorona PDF...', 'Generating PDF...')}`);

    try {
      const currentPageItems = paginatedQuittances;

      const regionLabel = regionFilter === 'toutes'
        ? t('Toutes les régions', 'Ny faritra rehetra', 'All regions')
        : regionFilter;

      const pdfOptions = {
        carnetDebut: numeroCarnetDebut || '0000000',
        carnetFin: numeroCarnetFin || '0000000',
        responsable: responsable.trim(),
        lieu: lieuAgence || 'Antananarivo',
        region: regionLabel,
        dateDelivre: dateDelivre || new Date().toLocaleDateString(locale),
        dateRetour: dateRetour || '',
        pageCourante: pageCourante,
        langue: langue,
      };

      const result = generateQuitancePDF(currentPageItems, pdfOptions);

      if (result) {
        setGenerationMessage(`✅ ${t('PDF généré avec succès !', 'Vita ny PDF !', 'PDF generated successfully!')}`);
        setTimeout(() => setGenerationMessage(''), 4000);
      } else {
        setGenerationMessage(`❌ ${t('Erreur lors de la génération du PDF', 'Nisy olana tamin\'ny famokarana PDF', 'PDF generation error')}`);
        setTimeout(() => setGenerationMessage(''), 4000);
      }
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      setGenerationMessage(`❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`);
      setTimeout(() => setGenerationMessage(''), 4000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Rendu du header
  const renderHeader = () => (
    <div className="quittance-header-professionnel">
      <div className="header-top">
        <div className="header-logo">
          <BookOpen size={28} className="logo-icon" />
          <div>
            <h1>OMDA</h1>
            <span>{t("Office Malagasy du Droit d'Auteur", "Birao Malagasy misahana ny Zon'ny Mpanoratra", "Malagasy Copyright Office")}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-back-dashboard" onClick={handleBackToDashboard}>
            <ArrowLeft size={16} />
            <Home size={16} />
            <span>{t('Retour Dashboard', 'Hiverina amin\'ny fandraisana', 'Back to Dashboard')}</span>
          </button>
          <button
            className="btn-generate-pdf-header"
            onClick={() => setShowPDFOptions(!showPDFOptions)}
            disabled={filteredQuittances.length === 0 || isGeneratingPDF}
            style={{
              opacity: filteredQuittances.length === 0 || isGeneratingPDF ? 0.5 : 1,
              cursor: filteredQuittances.length === 0 || isGeneratingPDF ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingPDF ? (
              <><Loader2 size={16} className="spinner-small" /> {t('Génération...', 'Mamorona...', 'Generating...')}</>
            ) : (
              <><FileText size={16} /> PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Options PDF */}
      {showPDFOptions && (
        <div className="pdf-options-dropdown" ref={pdfOptionsRef}>
          <div className="pdf-options-content">
            <h4><FileText size={16} /> {t('Options de génération PDF', 'Safidy famokarana PDF', 'PDF generation options')}</h4>
            <div className="pdf-options-grid">
              <div className="pdf-option-group">
                <label>{t('Responsable', 'Tompon\'andraikitra', 'Manager')} *</label>
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder={t('Nom du responsable', 'Anaran\'ny tompon\'andraikitra', 'Manager name')}
                  className="pdf-input"
                />
              </div>
              <div className="pdf-option-group">
                <label>{t("Lieu de l'agence", 'Toeran\'ny birao', 'Agency location')}</label>
                <input
                  type="text"
                  value={lieuAgence}
                  onChange={(e) => setLieuAgence(e.target.value)}
                  placeholder={t('Lieu', 'Toerana', 'Location')}
                  className="pdf-input"
                />
              </div>
              <div className="pdf-option-group">
                <label>{t('Date de délivrance', 'Daty nanomezana', 'Issue date')}</label>
                <input
                  type="text"
                  value={dateDelivre}
                  onChange={(e) => setDateDelivre(e.target.value)}
                  placeholder={t('jj/mm/aaaa', 'dd/mm/yyyy', 'dd/mm/yyyy')}
                  className="pdf-input"
                />
              </div>
              <div className="pdf-option-group">
                <label>{t('Date de retour', 'Daty famerenana', 'Return date')}</label>
                <input
                  type="text"
                  value={dateRetour}
                  onChange={(e) => setDateRetour(e.target.value)}
                  placeholder={t('jj/mm/aaaa', 'dd/mm/yyyy', 'dd/mm/yyyy')}
                  className="pdf-input"
                />
              </div>
            </div>
            <div className="pdf-options-actions">
              <button
                className="btn-pdf-generate"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || !responsable.trim()}
              >
                {isGeneratingPDF ? (
                  <><Loader2 size={16} className="spinner-small" /> {t('Génération...', 'Mamorona...', 'Generating...')}</>
                ) : (
                  <><Download size={16} /> {t('Générer le PDF', 'Hamorona PDF', 'Generate PDF')}</>
                )}
              </button>
              <button className="btn-pdf-cancel" onClick={() => setShowPDFOptions(false)}>
                {t('Annuler', 'Foanana', 'Cancel')}
              </button>
            </div>
            {generationMessage && (
              <div className={`pdf-generation-message ${generationMessage.includes('✅') ? 'success' : generationMessage.includes('⚠️') ? 'warning' : 'info'}`}>
                {generationMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informations du carnet */}
      <div className="carnet-info">
        <div className="carnet-info-item">
          <BookOpen size={16} />
          <span className="carnet-label">{t('Numéro de carnet', 'Laharana carnet', 'Booklet number')} :</span>
          <span className="carnet-value">{numeroCarnetDebut || '---'} {t('à', 'ka hatramin\'ny', 'to')} {numeroCarnetFin || '---'}</span>
        </div>
        <div className="carnet-info-item">
          <MapPin size={16} />
          <span className="carnet-label">{t('Agence / Région', 'Birao / Faritra', 'Agency / Region')} :</span>
          <select
            className="region-select"
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setPageCourante(1);
            }}
          >
            <option value="toutes">{t('Toutes les régions', 'Ny faritra rehetra', 'All regions')}</option>
            {regions.map((region) => (
              <option key={region.id || region.nom} value={region.nom || region}>
                {region.nom || region}
              </option>
            ))}
          </select>
        </div>
        <div className="carnet-info-item">
          <Calendar size={16} />
          <span className="carnet-label">{t('Date', 'Daty', 'Date')} :</span>
          <span className="carnet-value">{new Date().toLocaleDateString(locale)}</span>
        </div>
        {stats && (
          <div className="carnet-info-item stats-item">
            <span className="carnet-label">{t('Total', 'Totaly', 'Total')} :</span>
            <span className="carnet-value total">{stats.totalGlobal || 0}</span>
            <span className="carnet-label">{t('Montant', 'Vola', 'Amount')} :</span>
            <span className="carnet-value montant">{formatMontant(stats.montantGlobal)} Ar</span>
          </div>
        )}
      </div>

      <div className="header-search">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('Rechercher par numéro, client, région...', 'Hikaroka amin\'ny laharana, mpanjifa, faritra...', 'Search by number, client, region...')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPageCourante(1);
            }}
          />
        </div>
        <span className="total-badge">
          <FileText size={14} />
          {filteredQuittances.length} {t('quittance(s)', 'taratasy', 'receipt(s)')}
        </span>
        <button className="btn-refresh" onClick={fetchQuittances} title={t('Rafraîchir', 'Havaozy', 'Refresh')}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );

  // Rendu de la vue historique
  const renderHistorique = () => (
    <div className="quittance-historique">
      <div className="historique-table-wrapper">
        <table className="historique-table">
          <thead>
            <tr>
              <th className="col-num"><Hash size={14} /> #</th>
              <th className="col-quittance"><Tag size={14} /> {t('N° QUITTANCE', 'N° TARATASY', 'N° RECEIPT')}</th>
              <th className="col-facture-num"><FileText size={14} /> {t('N° FACTURE', 'N° FAKTIORA', 'N° INVOICE')}</th>
              <th className="col-type-client"><User size={14} /> {t('TYPE', 'KARAZANA', 'TYPE')}</th>
              <th className="col-client"><User size={14} /> {t('CLIENT', 'MPANJIFA', 'CLIENT')}</th>
              <th className="col-region"><MapPin size={14} /> {t('RÉGION', 'FARITRA', 'REGION')}</th>
              <th className="col-montant"><DollarSign size={14} /> {t('MONTANT', 'VOLA', 'AMOUNT')}</th>
              <th className="col-date"><Calendar size={14} /> {t('DATE', 'DATY', 'DATE')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="loading-cell">
                  <div className="spinner"></div>
                  {t('Chargement des quittances...', 'Maka ny taratasy...', 'Loading receipts...')}
                </td>
              </tr>
            ) : paginatedQuittances.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  <FileText size={32} />
                  <p>{t('Aucune quittance trouvée', 'Tsy misy taratasy hita', 'No receipt found')}</p>
                  <button className="btn-retry" onClick={fetchQuittances}>
                    <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
                  </button>
                </td>
              </tr>
            ) : (
              paginatedQuittances.map((quittance, index) => {
                const num = (pageCourante - 1) * itemsParPage + index + 1;
                const denomination = quittance.denomination || quittance.demandeur || '-';
                const typeLabel = getTypeLabel(quittance.ref_client_type);
                const region = quittance.region_usager || '-';

                return (
                  <tr
                    key={quittance.id}
                    className={`quittance-row ${quittanceSelectionnee?.id === quittance.id ? 'selected' : ''}`}
                    onClick={() => handleSelectQuittance(quittance)}
                  >
                    <td className="col-num">{String(num).padStart(3, '0')}</td>
                    <td className="col-quittance">{formatQuittance(quittance.quittance)}</td>
                    <td className="col-facture-num">{quittance.num_facture || '-'}</td>
                    <td className="col-type-client">{typeLabel}</td>
                    <td className="col-client">{denomination}</td>
                    <td className="col-region">{region}</td>
                    <td className="col-montant">{formatMontant(quittance.soit_total)}</td>
                    <td className="col-date">{formatDate(quittance.date_ajout)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="excel-pagination">
          <button className="page-btn" onClick={() => handlePageChange(1)} disabled={pageCourante === 1}>
            <ChevronsLeft size={14} />
          </button>
          <button className="page-btn" onClick={() => handlePageChange(pageCourante - 1)} disabled={pageCourante === 1}>
            <ChevronLeft size={14} />
          </button>
          {renderPageNumbers().map(num => (
            <button
              key={num}
              className={`page-btn ${num === pageCourante ? 'active' : ''}`}
              onClick={() => handlePageChange(num)}
            >
              {num}
            </button>
          ))}
          <button className="page-btn" onClick={() => handlePageChange(pageCourante + 1)} disabled={pageCourante === totalPages}>
            <ChevronRight size={14} />
          </button>
          <button className="page-btn" onClick={() => handlePageChange(totalPages)} disabled={pageCourante === totalPages}>
            <ChevronsRight size={14} />
          </button>
          <span className="page-info">
            {pageCourante} / {totalPages}
          </span>
        </div>
      )}

      {/* Bouton Retour Dashboard en bas */}
      <div className="historique-footer">
        <button className="btn-back-dashboard-bottom" onClick={handleBackToDashboard}>
          <ArrowLeft size={18} />
          <Home size={18} />
          <span>{t('Retour au Dashboard', 'Hiverina amin\'ny fandraisana', 'Back to Dashboard')}</span>
        </button>
      </div>
    </div>
  );

  // Rendu du détail de la quittance sélectionnée
  const renderQuittanceDetail = () => {
    if (!quittanceSelectionnee) return null;

    const q = quittanceSelectionnee;
    const typeLabel = getTypeLabel(q.ref_client_type);

    return (
      <div className="quittance-detail-excel">
        <div className="detail-header">
          <h3><Tag size={16} /> {t('QUITTANCE N°', 'TARATASY N°', 'RECEIPT N°')} {formatQuittance(q.quittance)}</h3>
          <button className="btn-close-detail" onClick={() => setQuittanceSelectionnee(null)}>
            <X size={18} />
          </button>
        </div>

        <div className="detail-body">
          {/* Informations de la quittance */}
          <div className="detail-section">
            <div className="detail-section-title">
              <Tag size={14} /> {t('INFORMATIONS QUITTANCE', 'FAMPAHALALANA TARATASY', 'RECEIPT INFORMATION')}
            </div>

            <div className="detail-row">
              <span className="detail-label"><Tag size={14} /> {t('Numéro quittance', 'Laharana taratasy', 'Receipt number')}:</span>
              <span className="detail-value">{formatQuittance(q.quittance)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><FileText size={14} /> {t('Numéro facture', 'Laharana faktiora', 'Invoice number')}:</span>
              <span className="detail-value">{q.num_facture || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><User size={14} /> {t('Type client', 'Karazana mpanjifa', 'Client type')}:</span>
              <span className="detail-value">{typeLabel}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><Hash size={14} /> {t('Réf client', 'Réf mpanjifa', 'Client ref')}:</span>
              <span className="detail-value">{q.ref_client_type || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><Hash size={14} /> {t('Réf usager', 'Réf mpampiasa', 'User ref')}:</span>
              <span className="detail-value">{q.ref_usager ? String(q.ref_usager).padStart(3, '0') : '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><DollarSign size={14} /> {t('Montant', 'Vola', 'Amount')}:</span>
              <span className="detail-value montant">{formatMontant(q.soit_total)} Ar</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><MapPin size={14} /> {t('Région', 'Faritra', 'Region')}:</span>
              <span className="detail-value">{q.region_usager || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label"><Calendar size={14} /> {t('Date création', 'Daty famoronana', 'Creation date')}:</span>
              <span className="detail-value">{formatDate(q.date_ajout)}</span>
            </div>
            {q.type_facture && (
              <div className="detail-row">
                <span className="detail-label"><FileText size={14} /> {t('Type facture', 'Karazana faktiora', 'Invoice type')}:</span>
                <span className="detail-value">{q.type_facture}</span>
              </div>
            )}
            {q.num_facture_type && (
              <div className="detail-row">
                <span className="detail-label"><Hash size={14} /> {t('Type facture n°', 'Karazana faktiora n°', 'Invoice type n°')}:</span>
                <span className="detail-value">{q.num_facture_type}</span>
              </div>
            )}
          </div>

          {/* Informations du client */}
          <div className="detail-section">
            <div className="detail-section-title">
              <User size={14} /> {t('INFORMATIONS CLIENT', 'FAMPAHALALANA MPANJIFA', 'CLIENT INFORMATION')}
            </div>

            <div className="detail-row">
              <span className="detail-label"><User size={14} /> {t('Dénomination', 'Anarana', 'Name')}:</span>
              <span className="detail-value">{q.denomination || q.demandeur || '-'}</span>
            </div>

            {q.siege && (
              <div className="detail-row">
                <span className="detail-label"><Building size={14} /> {t('Siège', 'Foibe', 'Head office')}:</span>
                <span className="detail-value">{q.siege}</span>
              </div>
            )}

            {q.adresse && (
              <div className="detail-row">
                <span className="detail-label"><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}:</span>
                <span className="detail-value">{q.adresse}</span>
              </div>
            )}

            {q.telephone && (
              <div className="detail-row">
                <span className="detail-label"><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}:</span>
                <span className="detail-value">{q.telephone}</span>
              </div>
            )}

            {q.email && (
              <div className="detail-row">
                <span className="detail-label"><Mail size={14} /> Email:</span>
                <span className="detail-value">{q.email}</span>
              </div>
            )}

            {q.nif && (
              <div className="detail-row">
                <span className="detail-label"><Key size={14} /> NIF:</span>
                <span className="detail-value">{q.nif}</span>
              </div>
            )}

            {q.stat && (
              <div className="detail-row">
                <span className="detail-label"><FileCheck size={14} /> STAT:</span>
                <span className="detail-value">{q.stat}</span>
              </div>
            )}

            {q.activite && (
              <div className="detail-row">
                <span className="detail-label"><Briefcase size={14} /> {t('Activité', 'Asa', 'Activity')}:</span>
                <span className="detail-value">{q.activite}</span>
              </div>
            )}
          </div>

          {/* Informations de la facture */}
          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={14} /> {t('INFORMATIONS FACTURE', 'FAMPAHALALANA FAKTIORA', 'INVOICE INFORMATION')}
            </div>

            {q.montant_mensuel && (
              <div className="detail-row">
                <span className="detail-label"><DollarSign size={14} /> {t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}:</span>
                <span className="detail-value">{formatMontant(q.montant_mensuel)} Ar</span>
              </div>
            )}

            {q.frais_dossier && (
              <div className="detail-row">
                <span className="detail-label"><DollarSign size={14} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}:</span>
                <span className="detail-value">{formatMontant(q.frais_dossier)} Ar</span>
              </div>
            )}

            {q.montant_retard && q.is_retard && (
              <div className="detail-row">
                <span className="detail-label"><Clock size={14} /> {t('Montant retard', 'Vola tara', 'Late amount')}:</span>
                <span className="detail-value">{formatMontant(q.montant_retard)} Ar</span>
              </div>
            )}

            {q.taux && (
              <div className="detail-row">
                <span className="detail-label"><Percent size={14} /> {t('Taux', 'Taha', 'Rate')}:</span>
                <span className="detail-value">{q.taux}%</span>
              </div>
            )}

            {q.uniter && (
              <div className="detail-row">
                <span className="detail-label"><Hash size={14} /> Uniter:</span>
                <span className="detail-value">{q.uniter}</span>
              </div>
            )}
          </div>

          {/* Informations de période */}
          {(q.mois_facture || q.annee_facture || q.mois_groupes) && (
            <div className="detail-section">
              <div className="detail-section-title">
                <Calendar size={14} /> {t('PÉRIODE', 'FE-POTOANA', 'PERIOD')}
              </div>

              {q.mois_facture && (
                <div className="detail-row">
                  <span className="detail-label"><Calendar size={14} /> {t('Mois', 'Volana', 'Month')}:</span>
                  <span className="detail-value">{getMonthName(q.mois_facture)} {q.annee_facture || ''}</span>
                </div>
              )}

              {q.mois_groupes && (
                <div className="detail-row">
                  <span className="detail-label"><Calendar size={14} /> {t('Mois groupés', 'Volana mitambatra', 'Grouped months')}:</span>
                  <span className="detail-value">
                    {q.mois_groupes.split(',').map(m => getMonthName(parseInt(m))).join(', ')}
                  </span>
                </div>
              )}

              {q.type_groupe && (
                <div className="detail-row">
                  <span className="detail-label"><Info size={14} /> {t('Type groupe', 'Karazana vondrona', 'Group type')}:</span>
                  <span className="detail-value">{q.type_groupe}</span>
                </div>
              )}
            </div>
          )}

          {/* Informations du représentant */}
          {(q.representant_nom || q.representant_adresse || q.representant_tel || q.representant_cin || q.representant_fonction) && (
            <div className="detail-section">
              <div className="detail-section-title">
                <Briefcase size={14} /> {t('REPRÉSENTANT', 'MPISOLO TENA', 'REPRESENTATIVE')}
              </div>

              {q.representant_nom && (
                <div className="detail-row">
                  <span className="detail-label"><User size={14} /> {t('Nom', 'Anarana', 'Name')}:</span>
                  <span className="detail-value">{q.representant_nom}</span>
                </div>
              )}

              {q.representant_fonction && (
                <div className="detail-row">
                  <span className="detail-label"><Briefcase size={14} /> {t('Fonction', 'Asa', 'Position')}:</span>
                  <span className="detail-value">{q.representant_fonction}</span>
                </div>
              )}

              {q.representant_adresse && (
                <div className="detail-row">
                  <span className="detail-label"><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}:</span>
                  <span className="detail-value">{q.representant_adresse}</span>
                </div>
              )}

              {q.representant_tel && (
                <div className="detail-row">
                  <span className="detail-label"><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}:</span>
                  <span className="detail-value">{q.representant_tel}</span>
                </div>
              )}

              {q.representant_cin && (
                <div className="detail-row">
                  <span className="detail-label"><Key size={14} /> CIN:</span>
                  <span className="detail-value">{q.representant_cin}</span>
                </div>
              )}
            </div>
          )}

          {/* Informations complémentaires */}
          {(q.description_personnalisee || q.personne_recu || q.uniter || q.suffixe || q.quittance_validee !== undefined) && (
            <div className="detail-section">
              <div className="detail-section-title">
                <Info size={14} /> {t('INFORMATIONS COMPLÉMENTAIRES', 'FAMPAHALALANA FANAMPINY', 'ADDITIONAL INFORMATION')}
              </div>

              {q.description_personnalisee && (
                <div className="detail-row">
                  <span className="detail-label"><FileText size={14} /> {t('Description', 'Fanazavana', 'Description')}:</span>
                  <span className="detail-value">{q.description_personnalisee}</span>
                </div>
              )}

              {q.personne_recu && (
                <div className="detail-row">
                  <span className="detail-label"><UserPlus size={14} /> {t('Reçu par', 'Voaray avy amin\'ny', 'Received by')}:</span>
                  <span className="detail-value">{q.personne_recu}</span>
                </div>
              )}

              {q.suffixe && (
                <div className="detail-row">
                  <span className="detail-label"><Hash size={14} /> {t('Suffixe', 'Tohiny', 'Suffix')}:</span>
                  <span className="detail-value">{q.suffixe}</span>
                </div>
              )}

              {q.quittance_validee !== undefined && (
                <div className="detail-row">
                  <span className="detail-label"><CheckCircle size={14} /> {t('Quittance validée', 'Taratasy voamarina', 'Receipt validated')}:</span>
                  <span className="detail-value">{q.quittance_validee
                    ? `✅ ${t('Oui', 'Eny', 'Yes')}`
                    : `❌ ${t('Non', 'Tsia', 'No')}`}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="quittance-page">
      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {renderHeader()}

      <div className="quittance-content">
        <div className={`quittance-main ${quittanceSelectionnee ? 'with-detail' : ''}`}>
          {renderHistorique()}
        </div>

        {quittanceSelectionnee && (
          <div className="quittance-sidebar">
            {renderQuittanceDetail()}
          </div>
        )}
      </div>

      <div className="quittance-footer-excel">
        <div className="footer-left">
          <BookOpen size={14} />
          <span>{t('Suivi des quittances', 'Fanaraha-maso ny taratasy', 'Receipt tracking')} - {filteredQuittances.length} {t('quittance(s)', 'taratasy', 'receipt(s)')}</span>
        </div>
        <div className="footer-center">
          <span>© {new Date().getFullYear()} - OMDA</span>
        </div>
        <div className="footer-right">
          <span>{t('Version', 'Dikan-teny', 'Version')} 1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Quitance;