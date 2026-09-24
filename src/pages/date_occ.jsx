// src/pages/DateOcc.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  MapPin,
  Building2,
  Search,
  Eye,
  RotateCcw,
  ArrowLeft,
  Music,
  User,
  Mail,
  Phone,
  DollarSign,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Hash,
  MapPinned,
  CreditCard,
  CalendarClock,
  Ban,
  Users,
  TrendingUp,
  Activity,
  Layers,
  RefreshCw,
} from 'lucide-react';

import MiniSidebar from '../components/MiniSidebar';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';
import '../styles/date_occ.css';

const DateOcc = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour les dates (mg → fr-MG, pas mg-MG)
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  // Données
  const [regionsDisponibles, setRegionsDisponibles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);

  // ============================================================
  // ✅ MOIS traduits selon la langue (via useMemo)
  // ============================================================
  const MONTHS = useMemo(() => [
    { value: 'janvier',   label: t('Janvier',   'Janoary',   'January') },
    { value: 'février',   label: t('Février',   'Febroary',  'February') },
    { value: 'mars',      label: t('Mars',      'Martsa',    'March') },
    { value: 'avril',     label: t('Avril',     'Aprily',    'April') },
    { value: 'mai',       label: t('Mai',       'Mey',       'May') },
    { value: 'juin',      label: t('Juin',      'Jona',      'June') },
    { value: 'juillet',   label: t('Juillet',   'Jolay',     'July') },
    { value: 'août',      label: t('Août',      'Aogositra', 'August') },
    { value: 'septembre', label: t('Septembre', 'Septambra', 'September') },
    { value: 'octobre',   label: t('Octobre',   'Oktobra',   'October') },
    { value: 'novembre',  label: t('Novembre',  'Novambra',  'November') },
    { value: 'décembre',  label: t('Décembre',  'Desambra',  'December') },
  ], [t]);

  // ============================================================
  // HELPERS DE FORMATAGE
  // ============================================================
  const formatDateComplete = useCallback((dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [locale]);

  const formatDateShort = useCallback((dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString(locale);
  }, [locale]);

  const formatMoney = useCallback((value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString(locale) + ' Ar';
  }, [locale]);

  const firstNonEmpty = (...values) => {
    for (const v of values) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return v;
      }
    }
    return null;
  };

  const extractAvailableYears = (eventsList) => {
    const years = new Set();
    eventsList.forEach((ev) => {
      if (ev.date_evenement) {
        const d = new Date(ev.date_evenement);
        if (!isNaN(d)) years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // ============================================================
  // APPELS API
  // ============================================================
  const loadRegions = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/regions');
      const data = await res.json();
      if (data.success) setRegionsDisponibles(data.regions || []);
    } catch (err) {
      console.error('Erreur chargement régions:', err);
    }
  }, []);

  const fetchOccasionnels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/usagers/occasionnels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        setAvailableYears(extractAvailableYears(data.events));
      } else {
        setEvents([]);
        setAvailableYears([]);
      }
    } catch (err) {
      console.error(err);
      setError(t(
        'Impossible de charger les données.',
        'Tsy afaka maka ny angona.',
        'Unable to load data.'
      ));
      setEvents([]);
      setAvailableYears([]);
    } finally {
      setLoading(false);
    }
  // ✅ PAS de dépendance [appLangue] — les données ne doivent PAS être rechargées
  //    quand la langue change. On met [t] mais fetch ne dépend pas de la langue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRegions();
    fetchOccasionnels();
  }, [loadRegions, fetchOccasionnels]);

  // ============================================================
  // FILTRAGE
  // ============================================================
  const normalizeId = (input) => {
    if (!input) return null;
    const num = parseInt(input.trim(), 10);
    return isNaN(num) ? null : num;
  };

  const findEventById = (id) => {
    const normalized = normalizeId(id);
    if (normalized === null) return null;
    return events.find((ev) => ev.id === normalized);
  };

  const getFilteredEvents = useMemo(() => {
    if (!events.length) return [];

    let filtered = [...events];

    if (referenceId.trim()) {
      const found = findEventById(referenceId);
      return found ? [found] : [];
    }

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((ev) => {
        const artistesMatch = (ev.artistesList || []).some(
          (a) =>
            (a.nom && a.nom.toLowerCase().includes(lower)) ||
            (a.prenom && a.prenom.toLowerCase().includes(lower))
        );
        return (
          (ev.denomination && ev.denomination.toLowerCase().includes(lower)) ||
          (ev.demandeur && ev.demandeur.toLowerCase().includes(lower)) ||
          (ev.organisateurs && ev.organisateurs.toLowerCase().includes(lower)) ||
          (ev.nom_evenement && ev.nom_evenement.toLowerCase().includes(lower)) ||
          (ev.lieu_evenement && ev.lieu_evenement.toLowerCase().includes(lower)) ||
          (ev.genre_manifestation && ev.genre_manifestation.toLowerCase().includes(lower)) ||
          (ev.email && ev.email.toLowerCase().includes(lower)) ||
          artistesMatch
        );
      });
    }

    if (selectedDay) {
      const day = parseInt(selectedDay, 10);
      filtered = filtered.filter(
        (ev) => ev.date_evenement && new Date(ev.date_evenement).getDate() === day
      );
    }
    if (selectedMonth) {
      const moisMap = {
        janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
      };
      const moisNum = moisMap[selectedMonth.toLowerCase()];
      filtered = filtered.filter(
        (ev) => ev.date_evenement && new Date(ev.date_evenement).getMonth() === moisNum
      );
    }
    if (selectedYear) {
      const year = parseInt(selectedYear, 10);
      filtered = filtered.filter(
        (ev) => ev.date_evenement && new Date(ev.date_evenement).getFullYear() === year
      );
    }
    if (selectedRegion) {
      filtered = filtered.filter((ev) => ev.region === selectedRegion);
    }

    filtered.sort((a, b) => new Date(b.date_evenement) - new Date(a.date_evenement));
    return filtered;
  }, [
    events, searchTerm, referenceId,
    selectedDay, selectedMonth, selectedYear, selectedRegion,
  ]);

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const totalEvents = getFilteredEvents.length;

  const totalArtistesUniques = useMemo(() => {
    const s = new Set();
    getFilteredEvents.forEach((ev) => {
      (ev.artistesList || []).forEach((a) => {
        if (a.nom) s.add(a.nom.toLowerCase());
      });
    });
    return s.size;
  }, [getFilteredEvents]);

  const totalRegionsCouvertes = useMemo(() => {
    const s = new Set();
    getFilteredEvents.forEach((ev) => {
      if (ev.region) s.add(ev.region);
    });
    return s.size;
  }, [getFilteredEvents]);

  const chiffreAffaireTotal = useMemo(() => {
    return getFilteredEvents.reduce(
      (sum, ev) => sum + (parseFloat(ev.montant_total) || 0),
      0
    );
  }, [getFilteredEvents]);

  const uniqueOrgs = useMemo(() => {
    const s = new Set();
    getFilteredEvents.forEach((ev) => {
      const org = ev.organisateurs || ev.denomination;
      if (org) s.add(org);
    });
    return s.size;
  }, [getFilteredEvents]);

  // ============================================================
  // STATUT
  // ============================================================
  const getEventStatus = (dateOriginal) => {
    if (!dateOriginal) return 'unknown';
    const eventDate = new Date(dateOriginal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'passed';
    if (diffDays === 0) return 'today';
    if (diffDays <= 5) return 'near';
    return 'upcoming';
  };

  // ✅ statusConfig dans useMemo — recalculé quand la langue change
  const statusConfig = useMemo(() => ({
    passed: {
      label: t('Passé', 'Lasana', 'Passed'),
      icon: AlertCircle,
      className: 'occ-status-passed'
    },
    today: {
      label: t("Aujourd'hui", 'Androany', 'Today'),
      icon: CheckCircle,
      className: 'occ-status-today'
    },
    near: {
      label: t('Proche', 'Akaiky', 'Near'),
      icon: Clock,
      className: 'occ-status-near'
    },
    upcoming: {
      label: t('Futur', 'Ho avy', 'Upcoming'),
      icon: Calendar,
      className: 'occ-status-upcoming'
    },
    unknown: {
      label: t('Inconnu', 'Tsy fantatra', 'Unknown'),
      icon: AlertCircle,
      className: 'occ-status-unknown'
    },
  }), [t]);

  // ============================================================
  // MODAL
  // ============================================================
  const openModal = (event) => {
    setSelectedEvent(event);
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    setSelectedEvent(null);
    document.body.style.overflow = 'auto';
  };

  const resetFilters = () => {
    setSearchTerm('');
    setReferenceId('');
    setSelectedDay('');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedRegion('');
  };

  return (
    <>
      <MiniSidebar />

      <main className="occ-page">
        {/* ============ HEADER ============ */}
        <header className="occ-header">
          <div className="occ-header-bg" />
          <div className="occ-header-content">
            <div className="occ-header-left">
              <div className="occ-header-icon-wrapper">
                <CalendarDays size={32} strokeWidth={2} />
              </div>
              <div>
                <h1 className="occ-header-title">
                  OMDA <span>{t('Occasionnelles', 'Fotoana manokana', 'Occasionals')}</span>
                </h1>
                <p className="occ-header-subtitle">
                  {t(
                    'Gestion et suivi des événements occasionnels',
                    "Fitantanana sy fanaraha-maso ny hetsika fotoana manokana",
                    'Management and tracking of occasional events'
                  )}
                </p>
              </div>
            </div>

            <div className="occ-header-right">
              <button
                className="occ-btn-refresh"
                onClick={fetchOccasionnels}
                title={t('Rafraîchir', 'Havaozy', 'Refresh')}
              >
                <RefreshCw size={16} />
                {t('Rafraîchir', 'Havaozy', 'Refresh')}
              </button>
              <button
                className="occ-btn-back"
                onClick={() => navigate('/autre-usager')}
              >
                <ArrowLeft size={16} />
                {t('Retour', 'Hiverina', 'Back')}
              </button>
            </div>
          </div>

          {/* ===== KPI CARDS ===== */}
          <div className="occ-kpi-grid">
            <div className="occ-kpi-card occ-kpi-blue">
              <div className="occ-kpi-icon">
                <Layers size={22} />
              </div>
              <div className="occ-kpi-data">
                <span className="occ-kpi-value">{totalEvents}</span>
                <span className="occ-kpi-label">
                  {t('Événements', 'Hetsika', 'Events')}
                </span>
              </div>
            </div>

            <div className="occ-kpi-card occ-kpi-purple">
              <div className="occ-kpi-icon">
                <Users size={22} />
              </div>
              <div className="occ-kpi-data">
                <span className="occ-kpi-value">{uniqueOrgs}</span>
                <span className="occ-kpi-label">
                  {t('Organisateurs', 'Mpikarakara', 'Organizers')}
                </span>
              </div>
            </div>

            <div className="occ-kpi-card occ-kpi-green">
              <div className="occ-kpi-icon">
                <Music size={22} />
              </div>
              <div className="occ-kpi-data">
                <span className="occ-kpi-value">{totalArtistesUniques}</span>
                <span className="occ-kpi-label">
                  {t('Artistes uniques', 'Mpihira tsy manam-paharoa', 'Unique artists')}
                </span>
              </div>
            </div>

            <div className="occ-kpi-card occ-kpi-orange">
              <div className="occ-kpi-icon">
                <MapPin size={22} />
              </div>
              <div className="occ-kpi-data">
                <span className="occ-kpi-value">{totalRegionsCouvertes}</span>
                <span className="occ-kpi-label">
                  {t('Régions couvertes', 'Faritra voarakotra', 'Covered regions')}
                </span>
              </div>
            </div>

            <div className="occ-kpi-card occ-kpi-teal">
              <div className="occ-kpi-icon">
                <TrendingUp size={22} />
              </div>
              <div className="occ-kpi-data">
                <span className="occ-kpi-value">
                  {chiffreAffaireTotal.toLocaleString(locale)}
                </span>
                <span className="occ-kpi-label">
                  {t('Chiffre total (Ar)', 'Totaly (Ar)', 'Total amount (Ar)')}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ============ FILTRES ============ */}
        <section className="occ-filters-section">
          <div className="occ-filters-header">
            <h3>
              <Activity size={16} />
              {t('Filtres de recherche', 'Sivana fikarohana', 'Search filters')}
            </h3>
          </div>

          <div className="occ-filters-row">
            <div className="occ-filter-item">
              <label htmlFor="occ-day">
                <Calendar size={13} /> {t('Jour', 'Andro', 'Day')}
              </label>
              <select
                id="occ-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="occ-form-select"
              >
                <option value="">{t('Tous', 'Rehetra', 'All')}</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="occ-filter-item">
              <label htmlFor="occ-month">
                <Calendar size={13} /> {t('Mois', 'Volana', 'Month')}
              </label>
              <select
                id="occ-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="occ-form-select"
              >
                <option value="">{t('Tous', 'Rehetra', 'All')}</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="occ-filter-item">
              <label htmlFor="occ-year">
                <Calendar size={13} /> {t('Année', 'Taona', 'Year')}
              </label>
              <select
                id="occ-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="occ-form-select"
              >
                <option value="">{t('Tous', 'Rehetra', 'All')}</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="occ-filter-item">
              <label htmlFor="occ-region">
                <MapPin size={13} /> {t('Région', 'Faritra', 'Region')}
              </label>
              <select
                id="occ-region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="occ-form-select"
              >
                <option value="">{t('Toutes', 'Rehetra', 'All')}</option>
                {regionsDisponibles.map((r) => (
                  <option key={r.id} value={r.nom}>{r.nom}</option>
                ))}
              </select>
            </div>

            <div className="occ-filter-item occ-filter-actions">
              <label>&nbsp;</label>
              <button className="occ-btn-reset" onClick={resetFilters}>
                <RotateCcw size={14} /> {t('Réinitialiser', 'Averina', 'Reset')}
              </button>
            </div>
          </div>

          <div className="occ-search-bar">
            <div className="occ-search-wrapper">
              <Search size={16} className="occ-search-icon" />
              <input
                type="text"
                placeholder={t(
                  'Rechercher par nom, lieu, artiste, organisateur…',
                  'Hikaroka amin\'ny anarana, toerana, mpihira, mpikarakara…',
                  'Search by name, place, artist, organizer…'
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="occ-search-input"
              />
            </div>
            <div className="occ-ref-wrapper">
              <Tag size={16} className="occ-ref-icon" />
              <input
                type="text"
                placeholder={t('ID événement', 'ID hetsika', 'Event ID')}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="occ-ref-input"
              />
            </div>
          </div>
        </section>

        {/* ============ TABLEAU ============ */}
        <section className="occ-table-section">
          <div className="occ-table-header">
            <h3>
              <FileText size={16} />
              {t('Liste des événements', 'Lisitry ny hetsika', 'Event list')}
              <span className="occ-table-count">
                {getFilteredEvents.length} {t('résultat', 'valiny', 'result')}
                {getFilteredEvents.length > 1 ? 's' : ''}
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="occ-state occ-state-loading">
              <div className="occ-spinner" />
              <p>{t('Chargement des événements…', 'Maka ny hetsika…', 'Loading events…')}</p>
            </div>
          ) : error ? (
            <div className="occ-state occ-state-error">
              <AlertCircle size={36} />
              <p>{error}</p>
              <button className="occ-btn-retry" onClick={fetchOccasionnels}>
                <RefreshCw size={14} /> {t('Réessayer', 'Andramo indray', 'Retry')}
              </button>
            </div>
          ) : getFilteredEvents.length === 0 ? (
            <div className="occ-state occ-state-empty">
              <Search size={40} />
              <p>
                {referenceId
                  ? t(
                      `Aucun événement avec la référence ${referenceId}`,
                      `Tsy misy hetsika misy ny referansa ${referenceId}`,
                      `No event with reference ${referenceId}`
                    )
                  : t(
                      'Aucun événement ne correspond à vos critères',
                      'Tsy misy hetsika mifanaraka amin\'ny fepetrao',
                      'No event matches your criteria'
                    )}
              </p>
            </div>
          ) : (
            <div className="occ-table-scroll">
              <table className="occ-table">
                <thead>
                  <tr>
                    <th>{t('Réf.', 'Ref.', 'Ref.')}</th>
                    <th>{t('Date', 'Daty', 'Date')}</th>
                    <th>{t('Organisateur', 'Mpikarakara', 'Organizer')}</th>
                    <th>{t('Événement', 'Hetsika', 'Event')}</th>
                    <th>{t('Lieu', 'Toerana', 'Location')}</th>
                    <th>{t('Artistes', 'Mpihira', 'Artists')}</th>
                    <th>{t('Montant', 'Vola', 'Amount')}</th>
                    <th>{t('Statut', 'Toe-javatra', 'Status')}</th>
                    <th className="occ-th-action">{t('Détail', 'Antsipiriany', 'Detail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredEvents.map((event) => {
                    const status = getEventStatus(event.date_evenement);
                    const cfg = statusConfig[status] || statusConfig.unknown;
                    const StatusIcon = cfg.icon;
                    const artistNames =
                      (event.artistesList || [])
                        .map((a) => a.nom)
                        .filter(Boolean)
                        .join(', ') || '—';

                    const eventName = firstNonEmpty(
                      event.nom_evenement,
                      event.genre_manifestation,
                      event.denomination
                    ) || '—';

                    return (
                      <tr key={event.id} className="occ-row">
                        <td className="occ-col-id">#{event.id}</td>
                        <td className="occ-col-date" title={formatDateComplete(event.date_evenement)}>
                          {formatDateShort(event.date_evenement)}
                        </td>
                        <td className="occ-col-org">
                          <Building2 size={13} className="occ-inline-icon" />
                          <span>{event.organisateurs || event.denomination || '—'}</span>
                        </td>
                        <td className="occ-col-event">{eventName}</td>
                        <td className="occ-col-lieu">
                          <MapPin size={13} className="occ-inline-icon" />
                          <span>{event.lieu_evenement || '—'}</span>
                        </td>
                        <td className="occ-col-artists" title={artistNames}>
                          <Music size={13} className="occ-inline-icon" />
                          <span>{artistNames}</span>
                        </td>
                        <td className="occ-col-montant">
                          {formatMoney(event.montant_total || event.montant || 0)}
                        </td>
                        <td className="occ-col-status">
                          <span className={`occ-status-badge ${cfg.className}`}>
                            <StatusIcon size={13} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="occ-col-action">
                          <button
                            className="occ-btn-view"
                            onClick={() => openModal(event)}
                            aria-label={t('Voir les détails', 'Hijery ny antsipiriany', 'View details')}
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="occ-footer">
          <div className="occ-footer-content">
            <div className="occ-footer-brand">
              <CalendarDays size={18} />
              <span>OMDA · {t('Occasionnelles', 'Fotoana manokana', 'Occasionals')}</span>
            </div>
            <div className="occ-footer-info">
              <span>
                <Layers size={13} /> {totalEvents} {t('événement', 'hetsika', 'event')}
                {totalEvents > 1 ? 's' : ''}
              </span>
              <span className="occ-footer-sep">•</span>
              <span>
                <Users size={13} /> {uniqueOrgs} {t('organisateur', 'mpikarakara', 'organizer')}
                {uniqueOrgs > 1 ? 's' : ''}
              </span>
              <span className="occ-footer-sep">•</span>
              <span>
                <Music size={13} /> {totalArtistesUniques} {t('artiste', 'mpihira', 'artist')}
                {totalArtistesUniques > 1 ? 's' : ''}
              </span>
              <span className="occ-footer-sep">•</span>
              <span>
                <TrendingUp size={13} /> {chiffreAffaireTotal.toLocaleString(locale)} Ar
              </span>
            </div>
            <div className="occ-footer-date">
              <Calendar size={13} />
              {new Date().toLocaleDateString(locale, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </footer>
      </main>

      {/* ============ MODAL ============ */}
      {selectedEvent && (
        <div className="occ-modal-overlay" onClick={closeModal}>
          <div className="occ-modal" onClick={(e) => e.stopPropagation()}>
            <div className="occ-modal-header">
              <div className="occ-modal-title-group">
                <div className="occ-modal-icon-badge">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="occ-modal-title">
                    {t("Détails de l'événement", "Antsipirian'ny hetsika", 'Event details')}
                  </h3>
                  <span className="occ-modal-ref">
                    {t('Réf.', 'Ref.', 'Ref.')} #{selectedEvent.id}
                  </span>
                </div>
              </div>
              <button className="occ-modal-close" onClick={closeModal} aria-label={t('Fermer', 'Hidio', 'Close')}>
                ✕
              </button>
            </div>

            <div className="occ-modal-body">
              {/* ===== Événement ===== */}
              <div className="occ-modal-section">
                <h4>
                  <Calendar size={15} /> {t('Événement', 'Hetsika', 'Event')}
                </h4>
                <div className="occ-modal-grid">
                  <div className="occ-modal-row">
                    <span><CalendarClock size={13} /> {t('Date', 'Daty', 'Date')}</span>
                    <strong>{formatDateComplete(selectedEvent.date_evenement)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Tag size={13} /> {t('Genre', 'Karazana', 'Genre')}</span>
                    <strong>{selectedEvent.genre_manifestation || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPin size={13} /> {t('Lieu', 'Toerana', 'Location')}</span>
                    <strong>{selectedEvent.lieu_evenement || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPinned size={13} /> {t('Région', 'Faritra', 'Region')}</span>
                    <strong>{selectedEvent.region || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Music size={13} /> {t('Artistes (texte)', 'Mpihira (lahatsoratra)', 'Artists (text)')}</span>
                    <strong>{selectedEvent.artistes || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* ===== Organisateur ===== */}
              <div className="occ-modal-section">
                <h4>
                  <Building2 size={15} /> {t('Organisateur', 'Mpikarakara', 'Organizer')}
                </h4>
                <div className="occ-modal-grid">
                  <div className="occ-modal-row">
                    <span><Users size={13} /> {t('Organisateurs', 'Mpikarakara', 'Organizers')}</span>
                    <strong className="occ-highlight">
                      {selectedEvent.organisateurs || '—'}
                    </strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Building2 size={13} /> {t('Dénomination', 'Anarana', 'Name')}</span>
                    <strong>{selectedEvent.denomination || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><User size={13} /> {t('Demandeur', 'Mpanao fangatahana', 'Applicant')}</span>
                    <strong>{selectedEvent.demandeur || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><User size={13} /> {t('Représenté par', 'Solontenan\'ny', 'Represented by')}</span>
                    <strong>{selectedEvent.representant_par || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><CreditCard size={13} /> {t('CIN représentant', 'CIN mpisolo tena', 'Representative ID')}</span>
                    <strong>{selectedEvent.representant_cin || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Calendar size={13} /> {t('CIN délivrée le', 'CIN nomena ny', 'ID issued on')}</span>
                    <strong>{formatDateShort(selectedEvent.representant_cin_delivree)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPin size={13} /> {t('CIN lieu', 'Toerana CIN', 'ID place')}</span>
                    <strong>{selectedEvent.representant_cin_lieu || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Phone size={13} /> {t('Téléphone', 'Finday', 'Phone')}</span>
                    <strong>{selectedEvent.telephone || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPin size={13} /> {t('Adresse', 'Adiresy', 'Address')}</span>
                    <strong>{selectedEvent.adresse || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPin size={13} /> {t('Domicile', 'Fonenana', 'Residence')}</span>
                    <strong>{selectedEvent.domicile || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* ===== Dossier ===== */}
              <div className="occ-modal-section">
                <h4>
                  <FileText size={15} /> {t('Dossier', 'Rakitra', 'File')}
                </h4>
                <div className="occ-modal-grid">
                  <div className="occ-modal-row">
                    <span><Hash size={13} /> {t('N° global', 'Laharana ankapobeny', 'Global N°')}</span>
                    <strong>{selectedEvent.numero_dossier_global || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Hash size={13} /> {t('N° utilisateur', 'Laharana mpampiasa', 'User N°')}</span>
                    <strong>{selectedEvent.numero_dossier_utilisateur || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Calendar size={13} /> {t("Date d'ajout", 'Daty nampiana', 'Date added')}</span>
                    <strong>{formatDateShort(selectedEvent.date_ajout)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><MapPin size={13} /> {t("Lieu d'ajout", 'Toerana nampiana', 'Place added')}</span>
                    <strong>{selectedEvent.lieu_ajout || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><User size={13} /> {t('Confirmation', 'Fanamarinana', 'Confirmation')}</span>
                    <strong>{selectedEvent.confirmation_nom || '—'}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Calendar size={13} /> {t('Date signature', 'Daty sonia', 'Signature date')}</span>
                    <strong>{formatDateShort(selectedEvent.date_signature)}</strong>
                  </div>
                </div>
              </div>

              {/* ===== Finances ===== */}
              <div className="occ-modal-section">
                <h4>
                  <DollarSign size={15} /> {t('Finances', 'Vola', 'Finances')}
                </h4>
                <div className="occ-modal-grid">
                  <div className="occ-modal-row">
                    <span>{t('Frais dossier', 'Saram-pandraharahana', 'File fees')}</span>
                    <strong>{formatMoney(selectedEvent.frais_dossier)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span>{t('Montant', 'Vola', 'Amount')}</span>
                    <strong>{formatMoney(selectedEvent.montant)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span><Ban size={13} /> {t('Montant retard', 'Vola tara', 'Late amount')}</span>
                    <strong>{formatMoney(selectedEvent.montant_retard)}</strong>
                  </div>
                  <div className="occ-modal-row">
                    <span>{t('En retard ?', 'Lasa tara?', 'Late?')}</span>
                    <strong
                      style={{
                        color: selectedEvent.is_retard ? '#dc3545' : '#28a745',
                      }}
                    >
                      {selectedEvent.is_retard
                        ? t('Oui', 'Eny', 'Yes')
                        : t('Non', 'Tsia', 'No')}
                    </strong>
                  </div>
                  <div className="occ-modal-row">
                    <span>{t('Soit total', 'Totaly', 'Total')}</span>
                    <strong>{formatMoney(selectedEvent.soit_total)}</strong>
                  </div>
                </div>

                <div className="occ-modal-total">
                  <span>
                    <DollarSign size={16} /> {t('MONTANT TOTAL', 'VOLA TOTAL', 'TOTAL AMOUNT')}
                  </span>
                  <strong>{formatMoney(selectedEvent.montant_total)}</strong>
                </div>
              </div>

              {/* ===== Artistes ===== */}
              {selectedEvent.artistesList && selectedEvent.artistesList.length > 0 && (
                <div className="occ-modal-section">
                  <h4>
                    <Music size={15} /> {t('Artistes', 'Mpihira', 'Artists')} ({selectedEvent.artistesList.length})
                  </h4>
                  <ul className="occ-artist-list">
                    {selectedEvent.artistesList.map((artist, idx) => (
                      <li key={idx}>
                        <span className="occ-artist-name">
                          {artist.nom} {artist.prenom || ''}
                        </span>
                        {artist.role && (
                          <span className="occ-artist-role">🎭 {artist.role}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="occ-modal-footer">
              <button className="occ-btn-close-modal" onClick={closeModal}>
                {t('Fermer', 'Hidio', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DateOcc;