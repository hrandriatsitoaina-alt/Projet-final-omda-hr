// src/pages/ConfirmePaiement.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, User, Phone, MapPin, Calendar, DollarSign, CreditCard,
  CalendarDays, CheckCircle, XCircle, Clock, AlertCircle,
  Hotel, Store, Bus, PartyPopper, Tv2, Ticket, FileText, Info,
  Lock, Hash, ArrowLeft, Trash2,
} from 'lucide-react';
import '../styles/confirme-paiement.css';
import MiniSidebar from '../components/MiniSidebar';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const ConfirmePaiement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ LANGUE UNIQUE
  const { t, langue } = useT();

  // ✅ Locale
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [usager, setUsager] = useState(null);
  const [usagerType, setUsagerType] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

  const [montantFixe, setMontantFixe] = useState(0);
  const [moisSelectionnes, setMoisSelectionnes] = useState([]);

  const typeLabels = useMemo(() => ({
    hotel: t('Hôtel', 'Hotely', 'Hotel'),
    'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
    bus: t('Bus', 'Bus', 'Bus'),
    nightclub: t('Night Club', 'Club alina', 'Night Club'),
    media: t('Média', 'Haino aman-jery', 'Media'),
    occ: t('Occasionnel', 'Fotoana manokana', 'Occasional'),
  }), [t]);

  const typeIcons = {
    hotel: Hotel, 'grand-surface': Store, bus: Bus,
    nightclub: PartyPopper, media: Tv2, occ: Ticket,
  };
  const typeColors = {
    hotel: '#4A90D9', 'grand-surface': '#27ae60', bus: '#f39c12',
    nightclub: '#8e44ad', media: '#e74c3c', occ: '#1abc9c',
  };
  const typeBgColors = {
    hotel: '#E8F0FE', 'grand-surface': '#E8F8ED', bus: '#FFF8E1',
    nightclub: '#F3E5F5', media: '#FDE8E8', occ: '#E0F7F4',
  };

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

  const moisLabelsShort = useMemo(() => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  }, [langue]);

  const toNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  };

  const getMontantFixe = (usagerData) => {
    const candidats = [
      usagerData.soit_total,
      usagerData.montant_total,
      usagerData.montant_mensuel,
      usagerData.montant,
    ];
    for (const c of candidats) {
      const n = toNumber(c);
      if (n !== null) return n;
    }
    return 0;
  };

  const getDetail = (usagerData, type) => {
    const fraisDossier = toNumber(usagerData.frais_dossier) ?? 0;
    const uniter = parseInt(usagerData.uniter) || 1;
    const montantRetard = toNumber(usagerData.montant_retard) ?? 0;
    const isRetard = !!usagerData.is_retard;

    let montantUnitaire;
    if (type === 'occ') {
      montantUnitaire = toNumber(usagerData.montant_total) ?? toNumber(usagerData.montant) ?? 0;
    } else if (type === 'media') {
      montantUnitaire = toNumber(usagerData.montant_mensuel) ?? toNumber(usagerData.taux) ?? toNumber(usagerData.montant_total) ?? 0;
    } else {
      montantUnitaire = toNumber(usagerData.montant_mensuel) ?? toNumber(usagerData.montant_total) ?? toNumber(usagerData.montant) ?? 0;
    }

    return { fraisDossier, uniter, montantRetard, isRetard, montantUnitaire };
  };

  useEffect(() => {
    const state = location.state;
    if (state && state.usager) {
      setUsager(state.usager);
      setUsagerType(state.type || 'hotel');
      initializePayment(state.usager, state.type || 'hotel');
    } else {
      navigate('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const initializePayment = (usagerData, type) => {
    setLoading(true);
    fetchAnneesDisponibles(type);

    const montant = getMontantFixe(usagerData);
    setMontantFixe(montant);

    const moisActuel = new Date().getMonth() + 1;
    setMoisSelectionnes(type === 'occ' ? [] : [moisActuel]);

    setLoading(false);
  };

  const fetchAnneesDisponibles = async (type) => {
    try {
      const response = await fetch(`http://localhost:3001/api/paiements/annees-disponibles/${type}`);
      const data = await response.json();
      if (data.success && data.annees.length > 0) {
        setAnneesDisponibles(data.annees);
        setSelectedYear(data.annees.includes(new Date().getFullYear()) ? new Date().getFullYear() : data.annees[data.annees.length - 1]);
      } else {
        setAnneesDisponibles([new Date().getFullYear()]);
        setSelectedYear(new Date().getFullYear());
      }
    } catch {
      setAnneesDisponibles([new Date().getFullYear()]);
      setSelectedYear(new Date().getFullYear());
    }
  };

  const toggleMois = (mois) => {
    setMoisSelectionnes(prev =>
      prev.includes(mois) ? prev.filter(m => m !== mois) : [...prev, mois].sort((a, b) => a - b)
    );
  };

  const selectAllMois = () => setMoisSelectionnes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const deselectAllMois = () => setMoisSelectionnes([]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  }, [locale]);

  const handleCancelAndDelete = async () => {
    if (!usager) return;

    setShowCancelModal(false);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken') || '';

      const typeMap = {
        hotel: 'hotel',
        'grand-surface': 'grand-surface',
        media: 'media',
        occ: 'occ',
        bus: 'bus',
        nightclub: 'nightclub',
      };

      const typeParam = typeMap[usagerType] || usagerType;

      const response = await fetch(
        `http://localhost:3001/api/usagers/${typeParam}/${usager.id}`,
        {
          method: 'DELETE',
          headers: {
            adminToken: token,
            'Content-Type': 'application/json',
          },
        }
      );

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        const text = await response.text();
        throw new Error(`${t('Réponse serveur', 'Valiny avy amin\'ny serveur', 'Server response')}: ${text || `HTTP ${response.status}`}`);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        setNotification({
          type: 'success',
          message: `✅ ${t('Usager supprimé avec succès - Retour au tableau de bord', 'Vita ny famafana - Hiverina amin\'ny tabilao', 'User deleted successfully - Back to dashboard')}`,
        });

        setTimeout(() => {
          navigate('/dashboard', {
            state: {
              toast: {
                type: 'success',
                message: `🗑️ ${t('Usager', 'Mpampiasa', 'User')} "${usager.denomination || usager.nom_evenement || t('Inconnu', 'Tsy fantatra', 'Unknown')}" ${t('a été supprimé', 'voafafa', 'has been deleted')}`,
              },
            },
          });
        }, 1500);
      } else {
        setNotification({ type: 'error', message: `❌ ${data.message || t('Erreur lors de la suppression', 'Nisy olana tamin\'ny famafana', 'Deletion error')}` });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      setNotification({ type: 'error', message: `❌ ${error.message || t('Erreur lors de la suppression', 'Nisy olana tamin\'ny famafana', 'Deletion error')}` });
      setIsSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (isSubmitting || !usager) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken') || '';
      const { fraisDossier, montantRetard, isRetard, uniter } = getDetail(usager, usagerType);

      const payload = {
        usagerId: usager.id,
        usagerType,
        montant: montantFixe,
        date_paiement: paymentDate,
        type_paiement: usagerType === 'occ' ? 'unique' : 'mensuel',
        frais_dossier: fraisDossier,
        montant_retard: montantRetard,
        est_retard: isRetard,
        reference: usager.numero_dossier_utilisateur || null,
        uniter,
        montantMensuel: montantFixe,
        soitTotal: montantFixe,
        nombre_mois: usagerType === 'occ' ? 1 : moisSelectionnes.length,
      };

      if (usagerType === 'occ') {
        payload.annee = null;
        payload.mois = null;
      } else {
        payload.annee = selectedYear;
        payload.mois = moisSelectionnes.length > 0
          ? moisSelectionnes[0]
          : new Date().getMonth() + 1;
        payload.mois_payes = moisSelectionnes;
      }

      console.log('📤 Payload envoyé:', payload);

      const response = await fetch('http://localhost:3001/api/paiements/enregistrer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: token,
        },
        body: JSON.stringify(payload),
      });

      // ⚠️ Lire le texte brut d'abord pour ne pas perdre l'info si le JSON est invalide
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('❌ Réponse non-JSON du serveur:', rawText);
        throw new Error(`Réponse serveur invalide (HTTP ${response.status}): ${rawText.slice(0, 200)}`);
      }

      console.log('📥 Réponse serveur:', data);

      if (!response.ok) {
        throw new Error(data.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        setNotification({
          type: 'success',
          message: `✅ ${t('Paiement enregistré avec succès', 'Vita ny fandoavana', 'Payment recorded successfully')}`
        });

        // ⚠️ On NE remet PAS isSubmitting à false : on va naviguer
        setTimeout(() => {
          navigate('/confirmation-dossier', {
            state: {
              usager,
              type: usagerType,
              payment: {
                montant: montantFixe,
                date: paymentDate,
                nombreMois: moisSelectionnes.length,
                annee: selectedYear,
                mois_payes: moisSelectionnes,
                fraisDossier,
                uniter,
                montantMensuel: montantFixe,
                soitTotal: montantFixe,
                montantRetard,
                isRetard,
              },
            },
          });
        }, 1500);
      } else {
        setNotification({
          type: 'error',
          message: `❌ ${data.message || t('Erreur inconnue', 'Olana tsy fantatra', 'Unknown error')}`
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('❌ Erreur submitPayment:', error);
      setNotification({
        type: 'error',
        message: `❌ ${error.message || t('Erreur lors de l\'enregistrement', 'Nisy olana tamin\'ny fitehirizana', 'Save error')}`
      });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="cp-new-loading">
          <div className="cp-new-spinner"></div>
          <p>{t('Chargement du paiement...', 'Maka ny fandoavana...', 'Loading payment...')}</p>
        </div>
      </>
    );
  }

  if (!usager) {
    return (
      <>
        <MiniSidebar />
        <div className="cp-new-error">
          <AlertCircle size={48} strokeWidth={1.5} />
          <p>{t('Aucun usager à payer', 'Tsy misy mpampiasa haloa', 'No user to pay')}</p>
          <button onClick={() => navigate('/dashboard')} className="cp-new-btn-retour">
            {t('Retour', 'Hiverina', 'Back')}
          </button>
        </div>
      </>
    );
  }

  const IconComponent = typeIcons[usagerType] || Building2;
  const color = typeColors[usagerType] || '#4A90D9';
  const bgColor = typeBgColors[usagerType] || '#f0f0f0';
  const isOcc = usagerType === 'occ';

  const { fraisDossier, uniter, montantRetard, isRetard, montantUnitaire } = getDetail(usager, usagerType);
  const totalAPayer = montantFixe;

  return (
    <>
      <MiniSidebar />
      <main className="cp-new-container">
        {notification && (
          <div className={`cp-new-notif ${notification.type}`}>
            <span>{notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}</span>
            <span>{notification.message}</span>
          </div>
        )}

        <div className="cp-new-card">
          <div className="cp-new-header">
            <div className="cp-new-header-left">
              <div className="cp-new-header-icon-wrapper" style={{ background: color }}>
                <IconComponent size={28} color="#fff" strokeWidth={1.5} />
              </div>
              <div>
                <h1>{t('Confirmation de paiement', 'Fanamarinana ny fandoavana', 'Payment confirmation')}</h1>
                <p className="cp-new-header-subtitle">
                  {typeLabels[usagerType] || t('Usager', 'Mpampiasa', 'User')} – {usager.denomination || usager.nom_evenement || t('Sans nom', 'Tsy misy anarana', 'No name')}
                </p>
              </div>
            </div>
            <div className="cp-new-header-badge" style={{ background: bgColor, color }}>
              <span>{typeLabels[usagerType] || t('Usager', 'Mpampiasa', 'User')}</span>
            </div>
          </div>

          <div className="cp-new-usager-card" style={{ borderColor: color, background: bgColor }}>
            <div className="cp-new-usager-grid">
              <div className="cp-new-info-item">
                <span className="cp-new-info-label"><FileText size={16} strokeWidth={1.5} /> ID</span>
                <span className="cp-new-info-value">#{String(usager.id).padStart(3, '0')}</span>
              </div>
              <div className="cp-new-info-item">
                <span className="cp-new-info-label"><Building2 size={16} strokeWidth={1.5} /> {t('Dénomination', 'Anarana', 'Name')}</span>
                <span className="cp-new-info-value">{usager.denomination || usager.nom_evenement || '-'}</span>
              </div>
              <div className="cp-new-info-item">
                <span className="cp-new-info-label"><User size={16} strokeWidth={1.5} /> {t('Demandeur', 'Mpangataka', 'Applicant')}</span>
                <span className="cp-new-info-value">{usager.demandeur || usager.organisateurs || '-'}</span>
              </div>
              <div className="cp-new-info-item">
                <span className="cp-new-info-label"><Phone size={16} strokeWidth={1.5} /> {t('Téléphone', 'Finday', 'Phone')}</span>
                <span className="cp-new-info-value">{usager.telephone || '-'}</span>
              </div>
              <div className="cp-new-info-item">
                <span className="cp-new-info-label"><MapPin size={16} strokeWidth={1.5} /> {t('Région', 'Faritra', 'Region')}</span>
                <span className="cp-new-info-value">{usager.region || '-'}</span>
              </div>

              {isOcc && (
                <>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><Ticket size={16} strokeWidth={1.5} /> {t('Genre', 'Karazana', 'Genre')}</span>
                    <span className="cp-new-info-value">{usager.genre_manifestation || '-'}</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><Calendar size={16} strokeWidth={1.5} /> {t('Date événement', 'Daty hetsika', 'Event date')}</span>
                    <span className="cp-new-info-value">{formatDate(usager.date_evenement) || '-'}</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><MapPin size={16} strokeWidth={1.5} /> {t('Lieu', 'Toerana', 'Location')}</span>
                    <span className="cp-new-info-value">{usager.lieu_evenement || '-'}</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><DollarSign size={16} strokeWidth={1.5} /> {t('Montant', 'Vola', 'Amount')}</span>
                    <span className="cp-new-info-value">{montantUnitaire.toLocaleString(locale)} Ar</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><FileText size={16} strokeWidth={1.5} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</span>
                    <span className="cp-new-info-value">+ {fraisDossier.toLocaleString(locale)} Ar</span>
                  </div>
                  {isRetard && (
                    <div className="cp-new-info-item">
                      <span className="cp-new-info-label"><Clock size={16} strokeWidth={1.5} /> {t('Pénalité retard', 'Sazy tara', 'Late penalty')}</span>
                      <span className="cp-new-info-value">+ {montantRetard.toLocaleString(locale)} Ar</span>
                    </div>
                  )}
                </>
              )}

              {!isOcc && (
                <>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><DollarSign size={16} strokeWidth={1.5} /> {t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}</span>
                    <span className="cp-new-info-value">{montantUnitaire.toLocaleString(locale)} Ar</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><Hash size={16} strokeWidth={1.5} /> {t('Uniter', 'Isan\'ny', 'Unit')}</span>
                    <span className="cp-new-info-value">× {uniter}</span>
                  </div>
                  <div className="cp-new-info-item">
                    <span className="cp-new-info-label"><FileText size={16} strokeWidth={1.5} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</span>
                    <span className="cp-new-info-value">+ {fraisDossier.toLocaleString(locale)} Ar</span>
                  </div>
                </>
              )}

              <div className="cp-new-info-item highlight">
                <span className="cp-new-info-label"><Lock size={16} strokeWidth={1.5} /> {t('Total à payer', 'Vola haloa', 'Total to pay')}</span>
                <span className="cp-new-info-value montant">{montantFixe.toLocaleString(locale)} Ar</span>
              </div>
            </div>
          </div>

          <div className="cp-new-payment-card">
            <h3><CreditCard size={20} strokeWidth={1.5} /> {t('Enregistrer le paiement', 'Tehirizo ny fandoavana', 'Record payment')}</h3>

            <div className="cp-new-info-message" style={{ background: '#FFF8E1', borderLeft: `4px solid ${color}` }}>
              <div className="cp-new-info-message-inner">
                <Info size={18} color={color} />
                <span className="cp-new-info-message-text">
                  <strong>{t('Montant total', 'Vola total', 'Total amount')} :</strong> {montantFixe.toLocaleString(locale)} Ar
                  {isOcc
                    ? ` (${montantUnitaire.toLocaleString(locale)} Ar + ${fraisDossier.toLocaleString(locale)} Ar ${t('de frais', 'saram-pandraharahana', 'fees')}${isRetard ? ` + ${montantRetard.toLocaleString(locale)} Ar ${t('de pénalité', 'sazy', 'penalty')}` : ''})`
                    : ` (${montantUnitaire.toLocaleString(locale)} Ar × ${uniter} + ${fraisDossier.toLocaleString(locale)} Ar ${t('de frais de dossier', 'saram-pandraharahana', 'file fees')})`}
                </span>
              </div>
            </div>

            {!isOcc && (
              <>
                <div className="cp-new-mois-section">
                  <div className="cp-new-mois-header">
                    <label><CalendarDays size={16} strokeWidth={1.5} /> {t('Sélection des mois à payer', 'Fisafidiana volana haloa', 'Select months to pay')}</label>
                    <div className="cp-new-mois-actions">
                      <button type="button" className="cp-new-btn-select-all" onClick={selectAllMois}>
                        {t('Tout sélectionner', 'Safidio ny rehetra', 'Select all')}
                      </button>
                      <button type="button" className="cp-new-btn-deselect-all" onClick={deselectAllMois}>
                        {t('Tout désélectionner', 'Esory ny safidy rehetra', 'Deselect all')}
                      </button>
                    </div>
                  </div>

                  <div className="cp-new-mois-grid">
                    {moisLabels.map((label, index) => {
                      const mois = index + 1;
                      const estSelectionne = moisSelectionnes.includes(mois);
                      return (
                        <div
                          key={mois}
                          className={`cp-new-mois-item ${estSelectionne ? 'selected' : ''}`}
                          onClick={() => toggleMois(mois)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="cp-new-mois-label">{label}</span>
                          <span className="cp-new-mois-num">{mois}</span>
                          {estSelectionne && <span className="cp-new-mois-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="cp-new-mois-info">
                    <span>
                      {moisSelectionnes.length} {t('mois sélectionné(s)', 'volana voafidy', 'month(s) selected')}
                    </span>
                    {moisSelectionnes.length > 0 && (
                      <span className="cp-new-mois-selected-list">
                        ({moisSelectionnes.map(m => moisLabelsShort[m - 1]).join(', ')})
                      </span>
                    )}
                  </div>
                </div>

                <div className="cp-new-form-group full-width">
                  <label><CalendarDays size={16} strokeWidth={1.5} /> {t('Année', 'Taona', 'Year')}</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="cp-new-input">
                    {anneesDisponibles.map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </>
            )}

            <div className="cp-new-payment-form">
              <div className="cp-new-form-group full-width">
                <label><Calendar size={16} strokeWidth={1.5} /> {t('Date de paiement', 'Daty nandoavana', 'Payment date')}</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="cp-new-input" />
              </div>

              <div className="cp-new-form-group full-width">
                <label><DollarSign size={16} strokeWidth={1.5} /> {t('Montant total (Ar)', 'Vola total (Ar)', 'Total amount (Ar)')}</label>
                <div className="cp-new-relative">
                  <input type="number" value={montantFixe} disabled className="cp-new-input cp-new-input-disabled" />
                  <Lock size={16} className="cp-new-lock-icon" />
                </div>
                <small className="cp-new-field-hint" style={{ color, fontWeight: 'bold' }}>
                  🔒 {t('Montant fixe', 'Vola raikitra', 'Fixed amount')} : {montantFixe.toLocaleString(locale)} Ar
                  {isOcc
                    ? ` (${montantUnitaire.toLocaleString(locale)} Ar + ${fraisDossier.toLocaleString(locale)} Ar${isRetard ? ` + ${montantRetard.toLocaleString(locale)} Ar` : ''})`
                    : ` (${montantUnitaire.toLocaleString(locale)} Ar × ${uniter} + ${fraisDossier.toLocaleString(locale)} Ar)`}
                </small>
              </div>

              <div className="cp-new-total-payment full-width">
                <span>{t('Total à payer', 'Vola haloa', 'Total to pay')} :</span>
                <strong>{totalAPayer.toLocaleString(locale)} Ar</strong>
              </div>
            </div>

            <div className="cp-new-button-group">
              <button className="cp-new-btn-cancel" onClick={() => setShowCancelModal(true)} disabled={isSubmitting}>
                <ArrowLeft size={18} strokeWidth={2} />
                <span>{t('Annuler et supprimer', 'Foanana sy famafana', 'Cancel and delete')}</span>
              </button>

              <button
                className="cp-new-btn-validate"
                onClick={submitPayment}
                disabled={isSubmitting || montantFixe <= 0 || (!isOcc && moisSelectionnes.length === 0)}
                style={{ background: color }}
              >
                {isSubmitting ? (
                  <><Clock size={18} strokeWidth={2} /> <span>{t('Traitement...', 'Fanodinana...', 'Processing...')}</span></>
                ) : (
                  <><CheckCircle size={18} strokeWidth={2} /> <span>{t('Valider le paiement', 'Hamarino ny fandoavana', 'Validate payment')}</span></>
                )}
              </button>
            </div>

            {showCancelModal && (
              <div className="cp-new-modal-overlay" onClick={() => setShowCancelModal(false)}>
                <div className="cp-new-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="cp-new-modal-header" style={{ borderBottom: '2px solid #e74c3c' }}>
                    <h3 style={{ color: '#e74c3c' }}>
                      <Trash2 size={24} /> ⚠️ {t('Confirmation de suppression', 'Fanamarinana ny famafana', 'Deletion confirmation')}
                    </h3>
                    <button className="cp-new-modal-close" onClick={() => setShowCancelModal(false)}>✕</button>
                  </div>
                  <div className="cp-new-modal-body">
                    <div className="cp-new-delete-warning">
                      <p className="cp-new-delete-warning-title">
                        <strong>⚠️ {t('Attention !', 'Tandremo !', 'Warning!')}</strong> {t('Vous êtes sur le point de supprimer définitivement cet usager.', 'Efa hofafanao tanteraka ity mpampiasa ity.', 'You are about to permanently delete this user.')}
                      </p>
                      <p className="cp-new-delete-warning-text">
                        <strong>{t('Usager', 'Mpampiasa', 'User')} :</strong> {usager.denomination || usager.nom_evenement || t('Inconnu', 'Tsy fantatra', 'Unknown')}
                      </p>
                      <p className="cp-new-delete-warning-text">
                        <strong>{t('Type', 'Karazana', 'Type')} :</strong> {typeLabels[usagerType] || usagerType}
                      </p>
                      <p className="cp-new-delete-warning-text">
                        <strong>{t('Demandeur', 'Mpangataka', 'Applicant')} :</strong> {usager.demandeur || usager.organisateurs || '-'}
                      </p>
                    </div>

                    <div className="cp-new-delete-info">
                      <p className="cp-new-delete-info-text">
                        <strong>📌 {t('Pourquoi supprimer ?', 'Nahoana no mamafa ?', 'Why delete?')}</strong><br />
                        {t(
                          'Cette action est irréversible. Si cet usager a été ajouté par erreur, ou si vous rencontrez un problème, contactez immédiatement le Super Admin pour toute assistance avant de confirmer.',
                          'Tsy azo ivalozana ity hetsika ity. Raha diso ny fampidirana azy na misy olana ianao, mifandraisa avy hatrany amin\'ny Super Admin alohan\'ny hanamafisana.',
                          'This action is irreversible. If this user was added by mistake, or if you encounter a problem, contact the Super Admin immediately for assistance before confirming.'
                        )}
                      </p>
                    </div>

                    <div className="cp-new-delete-advice">
                      <p className="cp-new-delete-advice-text">
                        <AlertCircle size={18} color="#1a237e" />
                        <span>
                          <strong>{t('Conseil', 'Torohevitra', 'Advice')} :</strong>{' '}
                          {t(
                            'Avant de supprimer, vérifiez que cet usager n\'a pas déjà des paiements enregistrés.',
                            'Alohan\'ny hamafana, hamarino fa tsy mbola misy fandoavana voarakitra ity mpampiasa ity.',
                            'Before deleting, check that this user does not already have recorded payments.'
                          )}
                        </span>
                      </p>
                    </div>

                    <div className="cp-new-delete-actions">
                      <button className="cp-new-btn-cancel-modal" onClick={() => setShowCancelModal(false)}>
                        ❌ {t('Annuler', 'Foanana', 'Cancel')}
                      </button>
                      <button className="cp-new-btn-confirm-delete" onClick={handleCancelAndDelete} disabled={isSubmitting}>
                        <Trash2 size={18} /> {t('Supprimer définitivement', 'Hamafa tanteraka', 'Delete permanently')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ConfirmePaiement;