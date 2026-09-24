// src/pages/PaiementMensuel.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Calendar, DollarSign, Hash, FileText, CheckCircle,
  AlertCircle, Loader2, User, Building2, Phone, Mail, MapPin, Clock, Save,
  Printer, FileCheck, ReceiptText, ChevronDown, ChevronUp, AlertTriangle,
  Hotel, Store, Bus, Music, Tv, Tent, Check, X, ShieldCheck, Layers,
  Edit3, CheckSquare, Download, FileArchive, RefreshCw, UserCog, Package,
} from 'lucide-react';
import '../styles/paiement-mensuel.css';
import MiniSidebar from '../components/MiniSidebar';
import { useToast } from '../components/Toast';
import { generateFacturePDF } from './pdf/facture_pdf';
import JSZip from 'jszip';
import { useT } from '../hooks/useT';

const PaiementMensuel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();

  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [usager, setUsager] = useState(null);
  const [usagerType, setUsagerType] = useState('');
  const [selectedUsagerId, setSelectedUsagerId] = useState(null);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [montantMensuel, setMontantMensuel] = useState('');
  const [montantRetard, setMontantRetard] = useState(0);
  const [isRetard, setIsRetard] = useState(false);
  const [uniter, setUniter] = useState(1);

  const [fraisRenouvellement, setFraisRenouvellement] = useState('');

  const [montantsParMois, setMontantsParMois] = useState({});

  const [descriptionPersonnalisee, setDescriptionPersonnalisee] = useState('');
  const [descriptionConfirmee, setDescriptionConfirmee] = useState('');

  const [factureType, setFactureType] = useState('A');
  const [nombreMois, setNombreMois] = useState(1);
  const [moisSelectionnes, setMoisSelectionnes] = useState([]);
  const [tousMois, setTousMois] = useState(false);
  const [moisPayes, setMoisPayes] = useState([]);

  const [facturesGenerees, setFacturesGenerees] = useState([]);
  const [showFactures, setShowFactures] = useState(false);

  const [quittance, setQuittance] = useState('');
  const [quittanceValidee, setQuittanceValidee] = useState(false);
  const [personneRecu, setPersonneRecu] = useState('');

  const [anneesDisponibles, setAnneesDisponibles] = useState([]);

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

  const [userId, setUserId] = useState(null);
  const [dataSource, setDataSource] = useState('api');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editedUsager, setEditedUsager] = useState({});
  const [isSavingUsager, setIsSavingUsager] = useState(false);
  const [usagerModifieRenouvellement, setUsagerModifieRenouvellement] = useState(false);

  const getBackendType = (type) => {
    const backendTypes = {
      'hotel': 'Hôtel',
      'grand-surface': 'Grand Surface',
      'bus': 'Bus',
      'nightclub': 'Night club',
      'media': 'Télé/Radio',
      'occ': 'OCC',
      'other': 'Hôtel',
    };
    return backendTypes[type] || 'Hôtel';
  };

  const getTypeLabel = (type) => {
    const labels = {
      'hotel': t('Hôtel', 'Hotely', 'Hotel'),
      'grand-surface': t('Grand Surface', 'Fivarotana lehibe', 'Grand Surface'),
      'bus': t('Bus', 'Bus', 'Bus'),
      'nightclub': t('Night club', 'Club alina', 'Night club'),
      'media': t('Télé/Radio', 'Fahitalavitra/Radio', 'TV/Radio'),
      'occ': t('OCC', 'OCC', 'OCC'),
      'other': t('Usager événementiel', 'Mpampiasa hetsika', 'Event user'),
    };
    return labels[type] || type;
  };

  const getTypeLabelAffichage = (type) => {
    const labels = {
      'hotel': t('Hôtel', 'Hotely', 'Hotel'),
      'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface'),
      'bus': t('Transport', 'Fitaterana', 'Transport'),
      'nightclub': t('Night Club', 'Club alina', 'Night Club'),
      'media': t('Média', 'Haino aman-jery', 'Media'),
      'occ': t('Occasionnel', 'Fotoana manokana', 'Occasional'),
      'other': t('Usager événementiel', 'Mpampiasa hetsika', 'Event user'),
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'hotel': Hotel,
      'grand-surface': Store,
      'bus': Bus,
      'nightclub': Music,
      'media': Tv,
      'occ': Tent,
      'other': Package,
    };
    return icons[type] || Building2;
  };

  const getOnlyNumbers = (value) => {
    if (!value) return '';
    return value.replace(/\D/g, '');
  };

  // ✅ Vérifie si un mois est payé (moisPayes contient les données explosées)
  const estMoisPaye = (mois, annee) => {
    return moisPayes.some(p => Number(p.annee) === Number(annee) && Number(p.mois) === Number(mois));
  };

  const getMoisDisponiblesRestants = useCallback(() => {
    const moisPayesAnnee = moisPayes.filter(p => Number(p.annee) === Number(selectedYear)).map(p => Number(p.mois));
    let disponibles = [];
    for (let i = 1; i <= 12; i++) {
      if (!moisPayesAnnee.includes(i)) {
        disponibles.push(i);
      }
    }
    return disponibles;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moisPayes, selectedYear]);

  const distribuerMontantTotalSurMois = (montantTotal, mois) => {
    if (!mois || mois.length === 0) return {};
    const montantParMois = montantTotal / mois.length;
    const result = {};
    mois.forEach(m => {
      result[m] = Math.round(montantParMois * 100) / 100;
    });
    return result;
  };

  // ✅ CALCUL À LA VOLÉE
  const totalGeneral = useMemo(() => {
    const uniterActuel = parseInt(uniter) || 1;
    const montantActuel = parseFloat(montantMensuel) || 0;

    if (moisSelectionnes.length === 0) return 0;

    let total = montantActuel * uniterActuel;
    if (isRetard) total += montantRetard;
    if (factureType === 'C' && parseFloat(fraisRenouvellement) > 0) {
      total += parseFloat(fraisRenouvellement);
    }
    return total;
  }, [montantMensuel, uniter, isRetard, montantRetard, fraisRenouvellement, factureType, moisSelectionnes.length]);

  // ✅ Distribution à la volée pour Type B
  const montantsParMoisMemo = useMemo(() => {
    if (factureType !== 'B' || moisSelectionnes.length === 0) return montantsParMois;
    const montantTotal = (parseFloat(montantMensuel) || 0) * (parseInt(uniter) || 1);
    const reparti = distribuerMontantTotalSurMois(montantTotal, moisSelectionnes);
    return { ...montantsParMois, ...reparti };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factureType, moisSelectionnes.length, montantMensuel, uniter]);

  // ✅ Sync montantsParMois pour Type B
  useEffect(() => {
    if (factureType === 'B' && moisSelectionnes.length > 0) {
      const montantTotal = (parseFloat(montantMensuel) || 0) * (parseInt(uniter) || 1);
      const nouveaux = distribuerMontantTotalSurMois(montantTotal, moisSelectionnes);
      setMontantsParMois(prev => {
        let changed = false;
        const result = { ...prev };
        moisSelectionnes.forEach(m => {
          if (result[m] !== nouveaux[m]) {
            result[m] = nouveaux[m];
            changed = true;
          }
        });
        return changed ? result : prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factureType, moisSelectionnes.length, montantMensuel, uniter]);

  // ✅ Initialisation des montants depuis usager
  useEffect(() => {
    if (usager && usagerType) {
      let montantBase = 0;
      if (usagerType === 'occ') {
        montantBase = parseFloat(usager.montant) || parseFloat(usager.montant_total) || 0;
      } else if (usagerType === 'media') {
        montantBase = parseFloat(usager.taux) || parseFloat(usager.montant_mensuel) || 0;
      } else if (usagerType === 'other') {
        montantBase = parseFloat(usager.soit_total) ||
                      parseFloat(usager.montant_total) ||
                      parseFloat(usager.montant) || 0;
      } else {
        montantBase = parseFloat(usager.montant_mensuel) || 0;
      }

      if (montantBase > 0) {
        setMontantMensuel(montantBase.toString());
      } else {
        setMontantMensuel('');
      }

      const nouveauxMontants = {};
      for (let i = 1; i <= 12; i++) {
        nouveauxMontants[i] = montantBase;
      }
      setMontantsParMois(nouveauxMontants);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usager?.id, usagerType]);

  const appliquerMontants = (usagerSource, type) => {
    let montant = 0;
    let retardVal = 0;
    let retardActif = false;
    let unit = 1;

    if (type === 'other') {
      montant = parseFloat(usagerSource.soit_total) ||
                parseFloat(usagerSource.montant_total) ||
                parseFloat(usagerSource.montant) || 0;
      retardVal = parseFloat(usagerSource.montant_retard) || 0;
      retardActif = usagerSource.is_retard || false;
      unit = 1;
    } else if (type === 'occ') {
      montant = parseFloat(usagerSource.montant) || parseFloat(usagerSource.montant_total) || 0;
      retardVal = parseFloat(usagerSource.montant_retard) || 0;
      retardActif = usagerSource.is_retard || false;
      unit = parseInt(usagerSource.uniter) || 1;
    } else if (type === 'media') {
      montant = parseFloat(usagerSource.taux) || parseFloat(usagerSource.montant_mensuel) || 0;
      unit = parseInt(usagerSource.uniter) || 1;
    } else {
      montant = parseFloat(usagerSource.montant_mensuel) || 0;
      unit = parseInt(usagerSource.uniter) || 1;
    }

    if (montant > 0) {
      setMontantMensuel(montant.toString());
    } else {
      setMontantMensuel('');
    }
    setMontantRetard(retardVal);
    setIsRetard(retardActif);
    setUniter(unit || 1);

    const nouveauxMontants = {};
    for (let i = 1; i <= 12; i++) {
      nouveauxMontants[i] = montant;
    }
    setMontantsParMois(nouveauxMontants);
  };

  const handleConfirmerDescription = () => {
    if (descriptionPersonnalisee.trim()) {
      setDescriptionConfirmee(descriptionPersonnalisee.trim());
      showToast(
        `✅ ${t('Description confirmée', 'Voamarina ny fanazavana', 'Description confirmed')} : ${descriptionPersonnalisee.trim()}`,
        'success'
      );
    } else {
      setDescriptionConfirmee('');
      showToast(`✅ ${t('Description effacée', 'Voafafa ny fanazavana', 'Description cleared')}`, 'info');
    }
  };

  const handleEffacerDescription = () => {
    setDescriptionPersonnalisee('');
    setDescriptionConfirmee('');
    showToast(`✅ ${t('Description effacée', 'Voafafa ny fanazavana', 'Description cleared')}`, 'info');
  };

  const openEditModal = (isObligatoire = false) => {
    setEditedUsager({ ...usager });
    setShowEditModal(true);
    if (isObligatoire) {
      showToast(
        t(
          "⚠️ Renouvellement de contrat : veuillez confirmer les informations de l'usager",
          "⚠️ Fanavaozana fifanarahana : hamarino ny mombamomba ny mpampiasa",
          '⚠️ Contract renewal: please confirm user information'
        ),
        'warning'
      );
    }
  };

  const handleSaveUsager = async () => {
    const denominationValue =
      editedUsager.denomination ||
      editedUsager.nom_evenement ||
      editedUsager.genre_manifestation ||
      editedUsager.organisateurs ||
      usager.denomination ||
      usager.nom_evenement ||
      t('Sans nom', 'Tsy misy anarana', 'No name');

    if (!denominationValue || denominationValue.trim() === '') {
      showToast(t('La dénomination est obligatoire', 'Ilaina ny anarana', 'Name is required'), 'error');
      return;
    }

    if (usagerType === 'other') {
      setUsager(prev => ({ ...prev, ...editedUsager, denomination: denominationValue }));
      setUsagerModifieRenouvellement(true);
      showToast(
        t(
          '✅ Informations confirmées (usager événementiel)',
          '✅ Voamarina ny mombamomba (mpampiasa hetsika)',
          '✅ Information confirmed (event user)'
        ),
        'success'
      );
      setShowEditModal(false);
      return;
    }

    setIsSavingUsager(true);
    try {
      const token = localStorage.getItem('adminToken');

      const payload = {
        denomination: denominationValue,
        type_usager: getBackendType(usagerType),
        demandeur: editedUsager.demandeur || editedUsager.organisateurs || '',
        telephone: editedUsager.telephone || '',
        email: editedUsager.email || '',
        region: editedUsager.region || '',
        adresse: editedUsager.adresse || editedUsager.adresse_siege || '',
        representant_nom: editedUsager.representant_nom || editedUsager.representant_par || '',
        representant_adresse: editedUsager.representant_adresse || '',
        representant_tel: editedUsager.representant_tel || '',
        representant_cin: editedUsager.representant_cin || '',
        representant_cin_delivree: editedUsager.representant_cin_delivree || null,
        representant_cin_lieu: editedUsager.representant_cin_lieu || '',
        representant_fonction: editedUsager.representant_fonction || '',
        confirmation_nom: editedUsager.confirmation_nom || denominationValue,
        date_signature: editedUsager.date_signature || null,
        lieu_signature: editedUsager.lieu_signature || '',

        ...(usagerType === 'occ' && {
          organisateurs: editedUsager.organisateurs || denominationValue,
          representant_par_occ: editedUsager.representant_par || editedUsager.demandeur || '',
          genre_manifestation: editedUsager.genre_manifestation || denominationValue,
          artistes: editedUsager.artistes || '',
          date_evenement: editedUsager.date_evenement || null,
          lieu_evenement: editedUsager.lieu_evenement || '',
          lieu_ajout: editedUsager.lieu_ajout || 'Antananarivo',
          domicile: editedUsager.domicile || '',
        }),

        ...(usagerType === 'media' && {
          frequence: editedUsager.frequence || '',
          canal: editedUsager.canal || '',
          siege: editedUsager.siege || '',
          nif: editedUsager.nif || '',
          stat: editedUsager.stat || '',
          taux: editedUsager.taux || editedUsager.montant_mensuel || 0,
        }),

        ...(usagerType === 'hotel' && {
          activite: editedUsager.activite || '',
          etoiles: editedUsager.etoiles || '',
          ravinala: editedUsager.ravinala || false,
        }),

        ...(usagerType === 'nightclub' && {
          activite: editedUsager.activite || '',
          jauge_max: editedUsager.jauge_max || 0,
          horaires: editedUsager.horaires || '',
        }),

        ...(usagerType === 'grand-surface' && {
          activite: editedUsager.activite || '',
          nombre_magasins: editedUsager.nombre_magasins || 0,
        }),

        ...(usagerType === 'bus' && {
          lignes: editedUsager.lignes || '',
          nombre_vehicules: editedUsager.nombre_vehicules || 0,
          type_bus: editedUsager.type_bus || '',
          trajet: editedUsager.trajet || '',
          zones_desservies: editedUsager.zones_desservies || '',
        }),
      };

      const response = await fetch(`http://localhost:3001/api/usagers/${usager.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'adminToken': token || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setUsager(prev => ({ ...prev, ...editedUsager, denomination: denominationValue }));
        setUsagerModifieRenouvellement(true);
        showToast(`✅ ${t('Usager modifié avec succès', 'Vita ny fanovana', 'User updated successfully')}`, 'success');
        setShowEditModal(false);
      } else {
        showToast(`❌ ${data.message || t('Erreur lors de la modification', 'Nisy olana tamin\'ny fanovana', 'Error while updating')}`, 'error');
      }
    } catch (error) {
      console.error('Erreur modification usager:', error);
      showToast(`❌ ${t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error')}`, 'error');
    } finally {
      setIsSavingUsager(false);
    }
  };

  const fetchLastQuittance = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/recfacture/quittance/last');
      const data = await response.json();
      if (data.success && data.nextQuittance) {
        const nextNumbers = getOnlyNumbers(data.nextQuittance);
        setQuittance(nextNumbers);
        return data.lastQuittance;
      }
      return 0;
    } catch (error) {
      console.error('❌ Erreur récupération quittance:', error);
      return 0;
    }
  };

  // ✅ Chargement initial
  useEffect(() => {
    const state = location.state;
    if (state && state.usagerId && state.usagerType) {
      setSelectedUsagerId(state.usagerId);
      setUsagerType(state.usagerType);
      const user = localStorage.getItem('userId');
      if (user) setUserId(parseInt(user));
      fetchUsagerData(state.usagerId, state.usagerType, state.usagerData || null);
      fetchAnneesDisponibles(state.usagerType);
      fetchLastQuittance();
    } else {
      showToast(t('Aucun usager sélectionné', 'Tsy misy mpampiasa voafidy', 'No user selected'), 'error');
      navigate('/gere-payer');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, navigate]);

  const fetchUsagerData = async (id, type, usagerFallback) => {
    try {
      setLoading(true);
      let usagerFinal = null;

      if (type === 'other') {
        if (usagerFallback) {
          usagerFinal = usagerFallback;
        } else {
          try {
            const res = await fetch('http://localhost:3001/api/other-usagers');
            const data = await res.json();
            if (data.success && data.usagers) {
              const found = data.usagers.find(u => Number(u.id) === Number(id));
              if (found) {
                usagerFinal = found;
              }
            }
          } catch (e) {
            console.warn('⚠️ Erreur récupération other-usagers:', e);
          }
        }
      } else {
        try {
          const response = await fetch(`http://localhost:3001/api/usagers/${type}/${id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.usager) {
              usagerFinal = data.usager;
            }
          }
        } catch (fetchError) {
          console.warn('⚠️ Erreur réseau/API:', fetchError);
        }

        if (!usagerFinal && usagerFallback) {
          usagerFinal = usagerFallback;
        }
      }

      if (!usagerFinal) {
        showToast(t('Impossible de charger cet usager', 'Tsy afaka maka an\'ity mpampiasa ity', 'Unable to load this user'), 'error');
        navigate('/gere-payer');
        return;
      }

      setUsager(usagerFinal);
      setDataSource('api');
      appliquerMontants(usagerFinal, type);

      try {
        await fetchPaiementsExistants(id, type, selectedYear);
      } catch (err) {
        console.warn('⚠️ Erreur récupération paiements:', err);
        setMoisPayes([]);
      }
    } catch (error) {
      console.error('❌ Erreur fetch usager:', error);
      if (usagerFallback) {
        setUsager(usagerFallback);
        setDataSource('api');
        appliquerMontants(usagerFallback, type);
      } else {
        showToast(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'), 'error');
        navigate('/gere-payer');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnneesDisponibles = async (type) => {
    try {
      const response = await fetch(`http://localhost:3001/api/paiements/annees-disponibles/${type}`);
      const data = await response.json();

      const currentYear = new Date().getFullYear();
      let annees = [];

      const minAnnee = currentYear - 5;
      const maxAnnee = currentYear + 5;

      if (data.success && data.annees.length) {
        const anneesExistantes = data.annees;
        for (let i = minAnnee; i <= maxAnnee; i++) {
          annees.push(i);
        }
        for (const annee of anneesExistantes) {
          if (!annees.includes(annee)) {
            annees.push(annee);
          }
        }
        annees = [...new Set(annees)].sort((a, b) => a - b);
      } else {
        for (let i = minAnnee; i <= maxAnnee; i++) {
          annees.push(i);
        }
      }

      setAnneesDisponibles(annees);

      if (annees.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else {
        setSelectedYear(annees[annees.length - 1]);
      }
    } catch (error) {
      console.error('❌ Erreur années:', error);
      const currentYear = new Date().getFullYear();
      const minAnnee = currentYear - 5;
      const maxAnnee = currentYear + 5;
      const annees = [];
      for (let i = minAnnee; i <= maxAnnee; i++) {
        annees.push(i);
      }
      setAnneesDisponibles(annees);
      setSelectedYear(new Date().getFullYear());
    }
  };

  // ============================================================
  // ✅ CORRECTION : Exploser mois_payes pour construire moisPayes
  // ============================================================
  const fetchPaiementsExistants = async (usagerId, type, anneeCible = null) => {
    try {
      const annee = anneeCible !== null ? anneeCible : selectedYear;
      const response = await fetch(`http://localhost:3001/api/paiements/usager/${usagerId}/${type}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.paiements)) {
        // ✅ Filtrer les paiements de l'année cible
        const paiementsAnnee = data.paiements.filter(p => Number(p.annee) === Number(annee));

        // ✅ Exploser mois_payes en pseudo-paiements (1 par mois)
        const paiementsExploses = [];
        for (const p of paiementsAnnee) {
          let moisList = [];

          // Gérer les 2 formats : mois_payes (nouveau) et mois (ancien)
          if (p.mois_payes) {
            if (Array.isArray(p.mois_payes)) {
              moisList = p.mois_payes;
            } else if (typeof p.mois_payes === 'string') {
              try {
                const parsed = JSON.parse(p.mois_payes);
                if (Array.isArray(parsed)) moisList = parsed;
              } catch (e) { /* ignore */ }
            }
          }

          if (moisList.length === 0 && p.mois) {
            moisList = [p.mois];
          }

          // Créer une entrée par mois
          for (const m of moisList) {
            if (typeof m === 'number' && m >= 1 && m <= 12) {
              paiementsExploses.push({
                ...p,
                mois: m,
                _parentId: p.id,
              });
            }
          }
        }

        setMoisPayes(paiementsExploses);
      } else {
        setMoisPayes([]);
      }
    } catch (error) {
      console.error('❌ Erreur fetch paiements:', error);
      setMoisPayes([]);
    }
  };

  useEffect(() => {
    if (selectedUsagerId && usagerType) {
      fetchPaiementsExistants(selectedUsagerId, usagerType, selectedYear);
      setMoisSelectionnes([]);
      setTousMois(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const handleNombreMoisChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const maxMois = Math.min(12, getMoisDisponiblesRestants().length);
    const finalValue = Math.min(Math.max(value, 1), maxMois);
    setNombreMois(finalValue);
    const moisDisponibles = getMoisDisponiblesRestants();
    const moisSelectionnesAuto = moisDisponibles.slice(0, finalValue);
    setMoisSelectionnes(moisSelectionnesAuto);
    setTousMois(finalValue === moisDisponibles.length && moisDisponibles.length > 0);
  };

  const toggleMois = (mois) => {
    if (estMoisPaye(mois, selectedYear)) {
      showToast(
        `${t('Le mois', 'Ny volana', 'The month')} ${moisLabels[mois - 1]} ${t('est déjà payé', 'efa voaloa', 'is already paid')}`,
        'warning'
      );
      return;
    }
    setMoisSelectionnes(prev => {
      let nouveau = prev.includes(mois) ? prev.filter(m => m !== mois) : [...prev, mois].sort((a, b) => a - b);
      setNombreMois(nouveau.length);
      const disponible = getMoisDisponiblesRestants();
      setTousMois(nouveau.length === disponible.length && disponible.length > 0);
      return nouveau;
    });
  };

  const toggleTousMois = () => {
    const moisDisponibles = getMoisDisponiblesRestants();
    if (tousMois) {
      setMoisSelectionnes([]);
      setTousMois(false);
      setNombreMois(0);
    } else {
      setMoisSelectionnes([...moisDisponibles]);
      setTousMois(true);
      setNombreMois(moisDisponibles.length);
    }
  };

  const enregistrerPaiement = async (usagerId, usagerTypeParam, montant, datePaiement, mois, annee, montantRetardParam, isRetardParam) => {
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        usagerId: usagerId,
        usagerType: usagerTypeParam,
        type_paiement: 'mensuel',
        annee: annee,
        mois: mois,
        montant: montant,
        date_paiement: datePaiement,
        frais_dossier: 0,
        montant_retard: montantRetardParam || 0,
        est_retard: isRetardParam || false,
        statut: 'paye',
      };

      const response = await fetch('http://localhost:3001/api/paiements/enregistrer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'adminToken': token || '',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) return true;
      console.error(`❌ Erreur enregistrement paiement:`, result.message);
      return false;
    } catch (error) {
      console.error(`❌ Erreur enregistrement paiement:`, error);
      return false;
    }
  };

  const handleDownloadPDF = async (facture) => {
    try {
      setIsGenerating(true);
      showToast(t('🔄 Génération du PDF en cours...', '🔄 Mamorona PDF...', '🔄 Generating PDF...'), 'info');
      await generateFacturePDF(facture, false);
      showToast(t('✅ PDF téléchargé avec succès !', '✅ Vita ny PDF !', '✅ PDF downloaded successfully!'), 'success');
    } catch (error) {
      console.error('Erreur PDF:', error);
      showToast(t('❌ Erreur de génération PDF', '❌ Nisy olana tamin\'ny famokarana PDF', '❌ PDF generation error'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (facturesGenerees.length === 0) {
      showToast(t('Aucune facture à générer', 'Tsy misy faktiora hamoronana', 'No invoice to generate'), 'error');
      return;
    }

    try {
      setIsGenerating(true);
      showToast(
        `🔄 ${t('Génération du ZIP avec', 'Mamorona ZIP misy', 'Generating ZIP with')} ${facturesGenerees.length} ${t('fichiers...', 'rakitra...', 'files...')}`,
        'info'
      );

      const zip = new JSZip();
      let count = 0;

      for (const facture of facturesGenerees) {
        try {
          const pdfBlob = await generateFacturePDF(facture, true);
          if (pdfBlob && pdfBlob instanceof Blob) {
            const filename = `Facture_${facture.num_facture || '0000'}_${facture.ref_client_type || 'AUT'}.pdf`;
            zip.file(filename, pdfBlob);
            count++;
          }
        } catch (err) {
          console.error('Erreur génération PDF:', err);
        }
      }

      if (count === 0) {
        showToast(t('❌ Aucun PDF généré', '❌ Tsy misy PDF vita', '❌ No PDF generated'), 'error');
        setIsGenerating(false);
        return;
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `Factures_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);
      showToast(`✅ ${count} ${t('PDFs téléchargés dans le ZIP !', 'PDFs alaina tao amin\'ny ZIP !', 'PDFs downloaded in ZIP!')}`, 'success');
    } catch (error) {
      console.error('Erreur ZIP:', error);
      showToast(`❌ ${t('Erreur de génération du ZIP', 'Nisy olana tamin\'ny famokarana ZIP', 'ZIP generation error')}: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const genererFactures = async () => {
    if (!usager) {
      showToast(t('Aucun usager sélectionné', 'Tsy misy mpampiasa voafidy', 'No user selected'), 'error');
      return;
    }

    if (factureType === 'C' && !usagerModifieRenouvellement) {
      openEditModal(true);
      return;
    }

    if (!personneRecu.trim()) {
      showToast(t('Veuillez saisir le nom de la personne qui reçoit', 'Ampidiro ny anaran\'ny mpandray', 'Please enter the receiver name'), 'error');
      return;
    }

    if (moisSelectionnes.length === 0) {
      showToast(t('Veuillez sélectionner au moins un mois', 'Misafidiana volana iray farafahakeliny', 'Please select at least one month'), 'error');
      return;
    }

    if (factureType === 'C') {
      const fraisRenouvVal = parseFloat(fraisRenouvellement) || 0;
      if (!fraisRenouvVal || fraisRenouvVal <= 0) {
        showToast(
          t(
            '⚠️ Type C : Veuillez saisir les frais de renouvellement de contrat (obligatoire)',
            '⚠️ Karazana C : Ampidiro ny saran\'ny fanavaozana fifanarahana (tsy azo ihodivirana)',
            '⚠️ Type C: Please enter contract renewal fees (mandatory)'
          ),
          'error'
        );
        return;
      }
    }

    setIsSubmitting(true);
    let erreurs = [];
    let facturesGenereesList = [];
    let paiementsOk = 0;

    const uniterCapture = parseInt(uniter) || 1;
    const montantMensuelCapture = parseFloat(montantMensuel) || 0;
    const montantTotalCapture = montantMensuelCapture * uniterCapture;
    const montantsParMoisCapture = { ...montantsParMoisMemo };
    const montantRetardCapture = isRetard ? montantRetard : 0;
    const isRetardCapture = isRetard;
    const descriptionCapture = descriptionConfirmee || null;
    const fraisRenouvellementCapture = (factureType === 'C') ? (parseFloat(fraisRenouvellement) || 0) : 0;
    const anneeCapture = selectedYear;
    const datePaiementCapture = paymentDate;
    const factureTypeCapture = factureType;
    const moisAPayer = [...moisSelectionnes].sort((a, b) => a - b);

    try {
      const lastQuittanceNumber = await fetchLastQuittance();
      let currentQuittance = parseInt(quittance) || (lastQuittanceNumber + 1);

      if (!quittanceValidee) {
        setQuittance(String(currentQuittance).padStart(7, '0'));
        setQuittanceValidee(true);
      }

      // ✅ NOUVEAU : Enregistrer TOUS les mois en UNE SEULE FOIS (1 ligne avec mois_payes)
      const montantTotalMois = moisAPayer.reduce((sum, mois) => {
        if (factureTypeCapture === 'B') {
          return sum + (parseFloat(montantsParMoisCapture[mois]) || 0);
        } else {
          return sum + (montantTotalCapture / moisAPayer.length);
        }
      }, 0);

      const token = localStorage.getItem('adminToken');

      const paiementPayload = {
        usagerId: usager.id,
        usagerType: usagerType,
        type_paiement: 'mensuel',
        montant: montantTotalMois + (isRetardCapture ? montantRetardCapture : 0),
        date_paiement: datePaiementCapture,
        frais_dossier: 0,
        montant_retard: montantRetardCapture,
        est_retard: isRetardCapture,
        annee: anneeCapture,
        mois: moisAPayer[0], // mois de référence
        mois_payes: moisAPayer, // ✅ TOUS les mois dans UNE ligne
        nombre_mois: moisAPayer.length,
        statut: 'paye',
      };

      const paiementRes = await fetch('http://localhost:3001/api/paiements/enregistrer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'adminToken': token || '',
        },
        body: JSON.stringify(paiementPayload),
      });

      const paiementResult = await paiementRes.json();
      if (paiementResult.success) {
        paiementsOk = moisAPayer.length;
      } else {
        erreurs.push(paiementResult.message || t('Erreur enregistrement paiement', 'Olana tamin\'ny fitehirizana', 'Payment save error'));
      }

      // ✅ Génération des factures (logique existante)
      if (factureTypeCapture === 'A') {
        let totalFacture = montantTotalCapture;
        if (isRetardCapture) totalFacture += montantRetardCapture;

        const quittanceFacture = currentQuittance;

        const response = await fetch('http://localhost:3001/api/factures/creer-avec-paiement-groupe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usagerId: usager.id,
            usagerType: usagerType,
            userId: userId,
            typeFacture: 'DAFC',
            regionUsager: usager.region || '',
            personneRecu: personneRecu,
            montantMensuel: montantMensuelCapture,
            fraisDossier: 0,
            montantRetard: montantRetardCapture,
            isRetard: isRetardCapture,
            uniter: uniterCapture,
            soitTotal: totalFacture,
            mois: moisAPayer,
            annee: anneeCapture,
            datePaiement: datePaiementCapture,
            numFactureType: 'A',
            typeGroupe: 'A',
            descriptionPersonnalisee: descriptionCapture,
            montantsParMois: montantsParMoisCapture,
            quittance: quittanceFacture,
            quittanceValidee: true,
            isRenouvellement: false,
            fraisRenouvellement: 0,
          }),
        });

        const result = await response.json();
        if (result.success) {
          const factureResponse = await fetch(`http://localhost:3001/api/factures/${result.factureId}`);
          const factureData = await factureResponse.json();
          if (factureData.success) {
            const factureComplete = {
              ...factureData.facture,
              uniter: uniterCapture,
              uniter_affiche: uniterCapture,
              montant_mensuel: montantMensuelCapture,
              montant_mensuel_affiche: montantMensuelCapture,
              montants_par_mois: montantsParMoisCapture,
              montant_retard: montantRetardCapture,
              is_retard: isRetardCapture,
              mois_list: moisAPayer,
              soit_total: totalFacture,
              description_personnalisee: descriptionCapture,
              is_renouvellement: false,
              frais_renouvellement: 0,
              frais_dossier: 0,
            };
            facturesGenereesList.push(factureComplete);
            currentQuittance++;
          }
        } else {
          erreurs.push(result.message || t('Erreur génération facture A', 'Olana tamin\'ny famokarana faktiora A', 'Invoice A generation error'));
        }
      } else if (factureTypeCapture === 'B') {
        const quittancePartage = currentQuittance;

        for (let i = 0; i < moisAPayer.length; i++) {
          const mois = moisAPayer[i];
          const moisLabel = moisLabels[mois - 1];
          const suffixe = String.fromCharCode(64 + i + 1);

          const montantMoisReparti = parseFloat(montantsParMoisCapture[mois]) || 0;
          const montantMensuelPourFacture = montantMoisReparti / uniterCapture;

          let totalAvecRetard = montantMoisReparti + montantRetardCapture;

          try {
            const response = await fetch('http://localhost:3001/api/factures/creer-avec-paiement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                usagerId: usager.id,
                usagerType: usagerType,
                userId: userId,
                typeFacture: 'DAFC',
                regionUsager: usager.region || '',
                personneRecu: personneRecu,
                montantMensuel: montantMensuelPourFacture,
                fraisDossier: 0,
                montantRetard: montantRetardCapture,
                isRetard: isRetardCapture,
                uniter: uniterCapture,
                soitTotal: totalAvecRetard,
                mois: mois,
                annee: anneeCapture,
                datePaiement: datePaiementCapture,
                numFactureType: 'B',
                suffixe: suffixe,
                descriptionPersonnalisee: descriptionCapture,
                quittance: quittancePartage,
                quittanceValidee: true,
                isRenouvellement: false,
                fraisRenouvellement: 0,
              }),
            });

            const result = await response.json();
            if (result.success) {
              const factureResponse = await fetch(`http://localhost:3001/api/factures/${result.factureId}`);
              const factureData = await factureResponse.json();
              if (factureData.success) {
                const factureComplete = {
                  ...factureData.facture,
                  uniter: uniterCapture,
                  uniter_affiche: uniterCapture,
                  montant_mensuel: montantMensuelPourFacture,
                  montant_mensuel_affiche: montantMensuelPourFacture,
                  montants_par_mois: { [mois]: montantMoisReparti },
                  montant_retard: montantRetardCapture,
                  is_retard: isRetardCapture,
                  mois_list: [mois],
                  mois_facture: mois,
                  soit_total: totalAvecRetard,
                  description_personnalisee: descriptionCapture,
                  is_renouvellement: false,
                  frais_renouvellement: 0,
                  frais_dossier: 0,
                };
                facturesGenereesList.push(factureComplete);
              }
            } else {
              erreurs.push(`${moisLabel} (${result.message || t('erreur', 'olana', 'error')})`);
            }
          } catch (err) {
            erreurs.push(`${moisLabel} (${err.message || t('erreur technique', 'olana ara-teknika', 'technical error')})`);
          }
        }

        currentQuittance++;
      } else if (factureTypeCapture === 'C') {
        let totalFacture = montantTotalCapture;
        if (isRetardCapture) totalFacture += montantRetardCapture;
        if (fraisRenouvellementCapture > 0) {
          totalFacture += fraisRenouvellementCapture;
        }

        const quittanceFacture = currentQuittance;

        const response = await fetch('http://localhost:3001/api/factures/creer-avec-paiement-groupe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usagerId: usager.id,
            usagerType: usagerType,
            userId: userId,
            typeFacture: 'DAFC',
            regionUsager: usager.region || '',
            personneRecu: personneRecu,
            montantMensuel: montantMensuelCapture,
            fraisDossier: fraisRenouvellementCapture,
            montantRetard: montantRetardCapture,
            isRetard: isRetardCapture,
            uniter: uniterCapture,
            soitTotal: totalFacture,
            mois: moisAPayer,
            annee: anneeCapture,
            datePaiement: datePaiementCapture,
            numFactureType: 'C',
            typeGroupe: 'C',
            descriptionPersonnalisee: descriptionCapture,
            montantsParMois: montantsParMoisCapture,
            quittance: quittanceFacture,
            quittanceValidee: true,
            isRenouvellement: fraisRenouvellementCapture > 0,
            fraisRenouvellement: fraisRenouvellementCapture,
            suffixe: null,
          }),
        });

        const result = await response.json();
        if (result.success) {
          const factureResponse = await fetch(`http://localhost:3001/api/factures/${result.factureId}`);
          const factureData = await factureResponse.json();
          if (factureData.success) {
            const factureComplete = {
              ...factureData.facture,
              uniter: uniterCapture,
              uniter_affiche: uniterCapture,
              montant_mensuel: montantMensuelCapture,
              montant_mensuel_affiche: montantMensuelCapture,
              montants_par_mois: montantsParMoisCapture,
              montant_retard: montantRetardCapture,
              is_retard: isRetardCapture,
              mois_list: moisAPayer,
              soit_total: totalFacture,
              description_personnalisee: descriptionCapture,
              is_renouvellement: fraisRenouvellementCapture > 0,
              frais_renouvellement: fraisRenouvellementCapture,
              frais_dossier: fraisRenouvellementCapture,
            };
            facturesGenereesList.push(factureComplete);
            currentQuittance++;
          }
        } else {
          erreurs.push(result.message || t('Erreur génération facture C', 'Olana tamin\'ny famokarana faktiora C', 'Invoice C generation error'));
        }
      }

      const nextQuittance = String(currentQuittance).padStart(7, '0');
      setQuittance(nextQuittance);

      // ✅ Recharger les paiements après enregistrement
      if (paiementsOk > 0) {
        await fetchPaiementsExistants(usager.id, usagerType, anneeCapture);
      }

      if (facturesGenereesList.length > 0) {
        setFacturesGenerees(facturesGenereesList);
        setShowFactures(true);
        setMoisSelectionnes([]);
        setTousMois(false);
        setNombreMois(1);

        let message = `✅ ${facturesGenereesList.length} ${t('facture(s) générée(s) avec succès', 'faktiora vita soa aman-tsara', 'invoice(s) generated successfully')}`;
        if (paiementsOk > 0) {
          message += ` (${paiementsOk} ${t('paiement(s) enregistré(s)', 'fandoavana voarakitra', 'payment(s) recorded')})`;
        }
        message += ` - ${t('Prochain quittance', 'Taratasy manaraka', 'Next receipt')}: ${nextQuittance}`;

        if (erreurs.length > 0) {
          message += `, ${t('mais', 'fa', 'but')} ${erreurs.length} ${t('mois en erreur', 'volana diso', 'months in error')}: ${erreurs.join(', ')}`;
        }
        showToast(message, 'success');
      } else if (erreurs.length > 0) {
        showToast(`❌ ${t('Aucune facture générée', 'Tsy misy faktiora vita', 'No invoice generated')}. ${t('Erreurs', 'Olana', 'Errors')}: ${erreurs.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('❌ Erreur génération factures:', error);
      showToast(t('Erreur lors de la génération des factures', 'Nisy olana tamin\'ny famokarana faktiora', 'Error while generating invoices'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="pm-loading">
          <Loader2 size={48} className="spinner" />
          <p>{t('Chargement des données...', 'Maka ny angona...', 'Loading data...')}</p>
        </div>
      </>
    );
  }

  if (!usager) {
    return (
      <>
        <MiniSidebar />
        <div className="pm-error">
          <AlertCircle size={48} />
          <p>{t('Usager non trouvé', 'Tsy hita ny mpampiasa', 'User not found')}</p>
          <button onClick={() => navigate('/gere-payer')} className="pm-btn-back">
            {t('Retour', 'Hiverina', 'Back')}
          </button>
        </div>
      </>
    );
  }

  const IconComponent = getTypeIcon(usagerType);
  const typeLabel = getTypeLabelAffichage(usagerType);
  const moisDisponibles = getMoisDisponiblesRestants();
  const maxMoisDisponibles = moisDisponibles.length;
  const fraisRenouvValide = factureType === 'C' ? (parseFloat(fraisRenouvellement) > 0) : true;

  const moisHaut = [1, 2, 3, 4, 5, 6];
  const moisBas = [7, 8, 9, 10, 11, 12];

  const renderMoisItem = (mois) => {
    const label = moisLabels[mois - 1];
    const estPaye = estMoisPaye(mois, selectedYear);
    const estDisponible = moisDisponibles.includes(mois);
    const estSelectionne = moisSelectionnes.includes(mois);
    const montantMois = parseFloat(montantsParMoisMemo[mois]) || 0;

    let statut = 'indisponible';
    if (estPaye) statut = 'paye';
    else if (estSelectionne) statut = 'disponible selected';
    else if (estDisponible) statut = 'disponible';

    const estCliquable = estDisponible && !estPaye;
    const afficherInputMontant = estCliquable && factureType === 'B';

    return (
      <div
        key={mois}
        className={`pm-mois-item ${statut}`}
        onClick={() => estCliquable && toggleMois(mois)}
        style={{ cursor: estCliquable ? 'pointer' : 'default' }}
      >
        <div className="pm-mois-header">
          <span className="pm-mois-label">{label}</span>
          <span className="pm-mois-num">{mois}</span>
        </div>

        {afficherInputMontant && (
          <div className="pm-mois-montant" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={Math.round(montantMois * 100) / 100 || ''}
              onChange={(e) => {
                const numValue = parseFloat(e.target.value) || 0;
                setMontantsParMois(prev => ({ ...prev, [mois]: numValue }));
              }}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.target.select()}
              placeholder={t('Montant', 'Vola', 'Amount')}
              className="pm-mois-input"
              step="1"
              min="0"
              autoComplete="off"
            />
          </div>
        )}

        <div className="pm-mois-badges">
          {estPaye && (
            <span className="pm-mois-badge paye">
              <CheckCircle size={12} /> {t('Payé', 'Voaloa', 'Paid')}
            </span>
          )}
          {estSelectionne && !estPaye && (
            <span className="pm-mois-badge selected"><Check size={12} /> ✓</span>
          )}
          {!estPaye && estDisponible && !estSelectionne && (
            <span className="pm-mois-badge disponible">
              {t('Sélectionner', 'Safidio', 'Select')}
            </span>
          )}
          {!estPaye && !estDisponible && (
            <span className="pm-mois-badge indisponible"><X size={12} /></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .pm-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(15, 20, 35, 0.75) !important;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999 !important;
          padding: 20px;
          overflow-y: auto;
        }
        .pm-modal-content {
          background: #ffffff !important;
          color: #1a1a2e !important;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4) !important;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 0;
        }
        .pm-modal-header {
          background: #f8f9fa !important;
          color: #1a1a2e !important;
          padding: 18px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 16px 16px 0 0;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .pm-modal-header h2 {
          color: #1a1a2e !important;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
        }
        .pm-modal-close-btn {
          background: transparent;
          border: none;
          color: #6b7280 !important;
          font-size: 22px;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .pm-modal-close-btn:hover {
          background: #e5e7eb !important;
          color: #1a1a2e !important;
        }
        .pm-modal-body {
          padding: 24px;
          background: #ffffff !important;
          color: #1a1a2e !important;
        }
        .pm-modal-info-renouvellement {
          background: #fff3cd !important;
          color: #856404 !important;
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 20px;
          border-left: 4px solid #ffc107;
          font-size: 13px;
          line-height: 1.5;
        }
        .pm-modal-info-renouvellement svg {
          flex-shrink: 0;
          margin-top: 2px;
          color: #856404 !important;
        }
        .pm-modal-obligatoire {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #dc3545 !important;
          color: #ffffff !important;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          margin-left: 8px;
        }
        .pm-modal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .pm-modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pm-modal-field label {
          font-size: 12px;
          font-weight: 600;
          color: #374151 !important;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .pm-modal-field input,
        .pm-modal-field select {
          padding: 10px 12px;
          border: 1px solid #d1d5db !important;
          border-radius: 8px;
          font-size: 14px;
          color: #1a1a2e !important;
          background: #ffffff !important;
          transition: all 0.2s;
        }
        .pm-modal-field input::placeholder {
          color: #9ca3af !important;
        }
        .pm-modal-field input:focus,
        .pm-modal-field select:focus {
          outline: none;
          border-color: #3498db !important;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
        }
        .pm-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          background: #f8f9fa !important;
          border-top: 1px solid #e5e7eb;
          border-radius: 0 0 16px 16px;
          position: sticky;
          bottom: 0;
        }
        .pm-modal-btn-cancel,
        .pm-modal-btn-save {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          transition: all 0.2s;
        }
        .pm-modal-btn-cancel {
          background: #e5e7eb !important;
          color: #374151 !important;
        }
        .pm-modal-btn-cancel:hover {
          background: #d1d5db !important;
        }
        .pm-modal-btn-save {
          background: #3498db !important;
          color: #ffffff !important;
        }
        .pm-modal-btn-save:hover {
          background: #2980b9 !important;
        }
        .pm-modal-btn-save:disabled {
          background: #93c5fd !important;
          cursor: not-allowed;
        }
      `}</style>

      <MiniSidebar />
      <div className="paiement-mensuel-container">
        <div className="pm-header">
          <div className="pm-header-left">
            <button className="pm-btn-back" onClick={() => navigate('/gere-payer')}>
              <ArrowLeft size={20} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
            <div className="pm-header-info">
              <h1>{t('Paiement Mensuel', 'Fandoavana isam-bolana', 'Monthly Payment')}</h1>
              <div className="pm-header-type">
                <IconComponent size={18} />
                <span>{typeLabel}</span>
                <span className="pm-header-id">#{String(usager.id).padStart(3, '0')}</span>
              </div>
            </div>
          </div>
          <div className="pm-header-right">
            <span className="pm-header-badge">
              <Clock size={14} /> {t('Paiement Multiple', 'Fandoavana maro', 'Multiple Payment')}
            </span>
            <button
              className="pm-header-edit-btn"
              onClick={() => openEditModal(false)}
              title={t("Modifier l'usager", 'Ovay ny mpampiasa', 'Edit user')}
            >
              <UserCog size={16} /> {t('Modifier', 'Ovay', 'Edit')}
            </button>
          </div>
        </div>

        <div className="pm-body">
          <div className="pm-section pm-usager-info">
            <h3><User size={18} /> {t("Informations de l'usager", 'Mombamomba ny mpampiasa', 'User information')}</h3>
            <div className="pm-usager-grid">
              <div className="pm-usager-item">
                <span className="pm-label">{t('Dénomination', 'Anarana', 'Name')}</span>
                <span className="pm-value">
                  {usager.denomination || usager.nom_evenement || usager.organisateurs || '-'}
                </span>
              </div>
              <div className="pm-usager-item">
                <span className="pm-label">{t('Demandeur', 'Mpangataka', 'Applicant')}</span>
                <span className="pm-value">{usager.demandeur || usager.representant_par || '-'}</span>
              </div>
              <div className="pm-usager-item">
                <span className="pm-label"><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}</span>
                <span className="pm-value">{usager.telephone || '-'}</span>
              </div>
              <div className="pm-usager-item">
                <span className="pm-label"><Mail size={14} /> {t('Email', 'Mailaka', 'Email')}</span>
                <span className="pm-value">{usager.email || '-'}</span>
              </div>
              <div className="pm-usager-item">
                <span className="pm-label"><MapPin size={14} /> {t('Région', 'Faritra', 'Region')}</span>
                <span className="pm-value">{usager.region || '-'}</span>
              </div>
              <div className="pm-usager-item">
                <span className="pm-label"><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}</span>
                <span className="pm-value">{usager.adresse || usager.adresse_siege || '-'}</span>
              </div>
            </div>
          </div>

          <div className="pm-section pm-type-facture-section">
            <h3><Layers size={18} /> {t('Type de facture', 'Karazana faktiora', 'Invoice type')}</h3>
            <div className="pm-type-facture-container">
              <div className="pm-type-options">
                <label className={`pm-type-option ${factureType === 'A' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="A"
                    checked={factureType === 'A'}
                    onChange={() => {
                      setFactureType('A');
                      setFraisRenouvellement('');
                      setUsagerModifieRenouvellement(false);
                      const moisDispo = getMoisDisponiblesRestants();
                      const nb = Math.min(nombreMois, moisDispo.length);
                      setMoisSelectionnes(moisDispo.slice(0, nb));
                    }}
                  />
                  <div className="pm-type-option-content">
                    <span className="pm-type-option-title">{t('Type A', 'Karazana A', 'Type A')}</span>
                    <span className="pm-type-option-desc">
                      {t('Une seule facture groupée', 'Faktiora tokana mitambatra', 'Single grouped invoice')}
                    </span>
                    <span className="pm-type-option-badge">
                      {t('Tous les mois sur une facture', 'Volana rehetra amin\'ny faktiora iray', 'All months on one invoice')}
                    </span>
                  </div>
                </label>

                <label className={`pm-type-option ${factureType === 'B' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="B"
                    checked={factureType === 'B'}
                    onChange={() => {
                      setFactureType('B');
                      setFraisRenouvellement('');
                      setUsagerModifieRenouvellement(false);
                      const moisDispo = getMoisDisponiblesRestants();
                      const nb = Math.min(nombreMois, moisDispo.length);
                      setMoisSelectionnes(moisDispo.slice(0, nb));
                    }}
                  />
                  <div className="pm-type-option-content">
                    <span className="pm-type-option-title">{t('Type B', 'Karazana B', 'Type B')}</span>
                    <span className="pm-type-option-desc">
                      {t('Factures séparées', 'Faktiora misaraka', 'Separate invoices')}
                    </span>
                    <span className="pm-type-option-badge">
                      {t('Une facture par mois - Même quittance', 'Faktiora isam-bolana - Taratasy iray', 'One invoice per month - Same receipt')}
                    </span>
                  </div>
                </label>

                <label className={`pm-type-option ${factureType === 'C' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="C"
                    checked={factureType === 'C'}
                    onChange={() => {
                      setFactureType('C');
                      setUsagerModifieRenouvellement(false);
                      const moisDispo = getMoisDisponiblesRestants();
                      const nb = Math.min(nombreMois, moisDispo.length);
                      setMoisSelectionnes(moisDispo.slice(0, nb));
                      setTimeout(() => {
                        setEditedUsager({ ...usager });
                        setShowEditModal(true);
                        showToast(
                          t(
                            "⚠️ Type C : Veuillez confirmer les informations de l'usager pour continuer",
                            "⚠️ Karazana C : Hamarino ny mombamomba ny mpampiasa hanohizana",
                            '⚠️ Type C: Please confirm user information to continue'
                          ),
                          'warning'
                        );
                      }, 300);
                    }}
                  />
                  <div className="pm-type-option-content">
                    <span className="pm-type-option-title">{t('Type C', 'Karazana C', 'Type C')}</span>
                    <span className="pm-type-option-desc">
                      {t('Renouvellement de facture', 'Fanavaozana faktiora', 'Invoice renewal')}
                    </span>
                    <span className="pm-type-option-badge">
                      {t('Une seule facture + Renouvellement', 'Faktiora iray + Fanavaozana', 'Single invoice + Renewal')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="pm-section pm-paiement-section">
            <h3><CreditCard size={18} /> {t('Paramètres du paiement', 'Fikirana ny fandoavana', 'Payment settings')}</h3>

            <div className="pm-paiement-grid">
              <div className="pm-form-group">
                <label><Calendar size={15} /> {t('Date de paiement', 'Daty nandoavana', 'Payment date')}</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="pm-form-group">
                <label><Calendar size={15} /> {t('Année de paiement', 'Taom-pandoavana', 'Payment year')}</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="pm-year-select"
                >
                  {anneesDisponibles.map(y => (
                    <option key={y} value={y}>
                      {y} {y === new Date().getFullYear()
                        ? t('(En cours)', '(Ankehitriny)', '(Current)')
                        : y < new Date().getFullYear()
                        ? t('(Passée)', '(Lasana)', '(Past)')
                        : t('(Future)', '(Ho avy)', '(Future)')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pm-form-group">
                <label><DollarSign size={15} /> {t('Montant mensuel (Ar)', 'Vola isam-bolana (Ar)', 'Monthly amount (Ar)')}</label>
                <input
                  type="number"
                  value={montantMensuel}
                  onChange={(e) => setMontantMensuel(e.target.value)}
                  placeholder={t('Saisir le montant mensuel', 'Ampidiro ny vola isam-bolana', 'Enter monthly amount')}
                  step="1"
                  min="0"
                  className="pm-montant-input"
                />
              </div>

              <div className="pm-form-group">
                <label><Hash size={15} /> {t('Uniter', 'Isan\'ny', 'Unit')}</label>
                <input
                  type="number"
                  value={uniter}
                  onChange={(e) => setUniter(parseInt(e.target.value) || 1)}
                  min="1"
                  step="1"
                  className="pm-uniter-input"
                />
                <small className="pm-field-hint">
                  {t('Multiplicateur du montant mensuel', 'Fampitomboana ny vola isam-bolana', 'Monthly amount multiplier')}
                </small>
              </div>

              {factureType === 'C' && (
                <div className="pm-form-group pm-renouvellement-group">
                  <label className="pm-renouvellement-direct-label">
                    <RefreshCw size={15} />
                    <span>
                      {t('Frais de renouvellement Contrat (Ar)', 'Saran\'ny fanavaozana fifanarahana (Ar)', 'Contract renewal fees (Ar)')}{' '}
                      <span style={{ color: 'red' }}>*</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    value={fraisRenouvellement}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFraisRenouvellement(val === '' ? '' : (parseFloat(val) || 0));
                    }}
                    placeholder={t(
                      'Saisir les frais de renouvellement (obligatoire)',
                      'Ampidiro ny saran\'ny fanavaozana (tsy azo ihodivirana)',
                      'Enter renewal fees (mandatory)'
                    )}
                    className={`pm-frais-renouvellement-input ${
                      (!fraisRenouvellement || parseFloat(fraisRenouvellement) <= 0) ? 'pm-input-error' : 'pm-input-valid'
                    }`}
                    step="1"
                    min="0"
                    required
                  />
                  {(!fraisRenouvellement || parseFloat(fraisRenouvellement) <= 0) ? (
                    <small className="pm-field-hint pm-renouvellement-hint pm-hint-error">
                      <AlertCircle size={12} /> <strong>{t('⚠️ OBLIGATOIRE', '⚠️ TSY AZO IHODIVIRANA', '⚠️ MANDATORY')}</strong> - {t('Saisissez les frais de renouvellement de contrat', 'Ampidiro ny saran\'ny fanavaozana fifanarahana', 'Enter contract renewal fees')}
                    </small>
                  ) : (
                    <small className="pm-field-hint pm-renouvellement-hint pm-hint-valid">
                      <CheckCircle size={12} /> {t('Frais de renouvellement de contrat', 'Saran\'ny fanavaozana fifanarahana', 'Contract renewal fees')} : {parseFloat(fraisRenouvellement).toLocaleString(locale)} Ar
                    </small>
                  )}
                </div>
              )}

              <div className="pm-form-group pm-retard-group">
                <label><AlertTriangle size={15} /> {t('Retard', 'Tara', 'Late')}</label>
                <div className="pm-retard-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={isRetard}
                      onChange={(e) => setIsRetard(e.target.checked)}
                    />
                    {t('Activer le retard', 'Alefaso ny tara', 'Enable late')}
                  </label>
                </div>
                {isRetard && (
                  <input
                    type="number"
                    value={montantRetard}
                    onChange={(e) => setMontantRetard(parseFloat(e.target.value) || 0)}
                    placeholder={t('Montant du retard', 'Vola tara', 'Late amount')}
                    className="pm-retard-input"
                    step="1"
                    min="0"
                  />
                )}
              </div>

              <div className="pm-form-group pm-total-group">
                <label><ReceiptText size={15} /> {t('Total général (Ar)', 'Vola total (Ar)', 'Grand total (Ar)')}</label>
                <div className="pm-total-display">
                  <span className="pm-total-amount">
                    {totalGeneral.toLocaleString(locale)} Ar
                  </span>
                  <span className="pm-total-detail">
                    {montantMensuel} × {uniter}
                    {isRetard ? ` + ${montantRetard.toLocaleString(locale)} Ar (${t('retard', 'tara', 'late')})` : ''}
                    {factureType === 'C' && parseFloat(fraisRenouvellement) > 0
                      ? ` + ${parseFloat(fraisRenouvellement).toLocaleString(locale)} Ar (${t('renouv.', 'fanavaozana', 'renewal')})`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pm-section pm-description-section">
            <h3><Edit3 size={18} /> {t('Description personnalisée', 'Fanazavana manokana', 'Custom description')}</h3>
            <div className="pm-description-container">
              <div className="pm-description-input-group">
                <input
                  type="text"
                  value={descriptionPersonnalisee}
                  onChange={(e) => setDescriptionPersonnalisee(e.target.value)}
                  placeholder={t(
                    'Ex: Authentification de facture, Paiement anticipé, ...',
                    'Ohatra: Fanamarinana faktiora, Fandoavana mialoha, ...',
                    'Ex: Invoice authentication, Early payment, ...'
                  )}
                  className="pm-description-input"
                />
                <button className="pm-description-btn-confirm" onClick={handleConfirmerDescription}>
                  <CheckSquare size={18} /> {t('Confirmer', 'Hamarino', 'Confirm')}
                </button>
                <button className="pm-description-btn-clear" onClick={handleEffacerDescription}>
                  ✕
                </button>
              </div>
              {descriptionConfirmee && (
                <div className="pm-description-confirmee">
                  <CheckCircle size={16} color="#27ae60" />
                  <span>
                    {t('Description confirmée', 'Voamarina ny fanazavana', 'Description confirmed')} : <strong>"{descriptionConfirmee}"</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pm-section pm-mois-section">
            <h3><Calendar size={18} /> {t('Sélection des mois à payer', 'Fisafidiana volana haloa', 'Select months to pay')}</h3>

            <div className="pm-mois-info">
              <span className="pm-mois-count">
                {maxMoisDisponibles} {t('mois disponibles pour', 'volana misy ho an\'ny', 'months available for')} {selectedYear}
              </span>
              {moisPayes.length > 0 && (
                <span className="pm-mois-payes">
                  <ShieldCheck size={14} color="#27ae60" />
                  {moisPayes.length} {t('mois déjà payés', 'volana efa voaloa', 'months already paid')}
                </span>
              )}
            </div>

            {factureType !== 'C' && (
              <div className="pm-mois-selecteur">
                <div className="pm-mois-selecteur-label">
                  <span>{t('Nombre de mois à payer', 'Isan\'ny volana haloa', 'Number of months to pay')} :</span>
                  <span className="pm-mois-selecteur-info">
                    (1 - {maxMoisDisponibles} {t('disponible', 'misy', 'available')}{maxMoisDisponibles > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="pm-mois-selecteur-input">
                  <button
                    className="pm-mois-selecteur-btn"
                    onClick={() => {
                      const newVal = Math.max(1, nombreMois - 1);
                      setNombreMois(newVal);
                      const moisDispo = getMoisDisponiblesRestants();
                      setMoisSelectionnes(moisDispo.slice(0, newVal));
                    }}
                    disabled={nombreMois <= 1 || maxMoisDisponibles === 0}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={nombreMois}
                    onChange={handleNombreMoisChange}
                    min="1"
                    max={maxMoisDisponibles || 1}
                    className="pm-mois-selecteur-input-number"
                  />
                  <button
                    className="pm-mois-selecteur-btn"
                    onClick={() => {
                      const newVal = Math.min(maxMoisDisponibles, nombreMois + 1);
                      setNombreMois(newVal);
                      const moisDispo = getMoisDisponiblesRestants();
                      setMoisSelectionnes(moisDispo.slice(0, newVal));
                    }}
                    disabled={nombreMois >= maxMoisDisponibles || maxMoisDisponibles === 0}
                  >
                    +
                  </button>
                  <button
                    className="pm-mois-selecteur-all"
                    onClick={toggleTousMois}
                    disabled={maxMoisDisponibles === 0}
                  >
                    {tousMois
                      ? t('Tout désélectionner', 'Esory ny safidy rehetra', 'Deselect all')
                      : t('Tout sélectionner', 'Safidio ny rehetra', 'Select all')}
                  </button>
                </div>
                <div className="pm-mois-selected-info">
                  {moisSelectionnes.length} {t('mois sélectionné(s)', 'volana voafidy', 'month(s) selected')}
                  {moisSelectionnes.length > 0 && (
                    <span className="pm-mois-selected-list">
                      ({moisSelectionnes.map(m => moisLabelsShort[m - 1]).join(', ')})
                    </span>
                  )}
                  {moisSelectionnes.length > 0 && (
                    <span className="pm-mois-selected-total">
                      {t('Total', 'Totaly', 'Total')} : {totalGeneral.toLocaleString(locale)} Ar
                    </span>
                  )}
                </div>
              </div>
            )}

            {factureType === 'C' && (
              <div className="pm-mois-selecteur pm-mois-selecteur-typeC">
                <div className="pm-mois-selecteur-label">
                  <span>{t('Mois couverts par le renouvellement (cliquez pour sélectionner)', 'Volana voarakotry ny fanavaozana (tsindrio hisafidiana)', 'Months covered by renewal (click to select)')} :</span>
                  <span className="pm-mois-selecteur-info">
                    ({moisSelectionnes.length} {t('mois sélectionné', 'volana voafidy', 'month(s) selected')}{moisSelectionnes.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="pm-mois-selected-info">
                  {moisSelectionnes.length > 0 ? (
                    <span className="pm-mois-selected-list">
                      {t('Mois', 'Volana', 'Months')} : {moisSelectionnes.map(m => moisLabels[m - 1]).join(', ')}
                    </span>
                  ) : (
                    <span style={{ color: '#dc3545' }}>
                      {t('Aucun mois sélectionné', 'Tsy misy volana voafidy', 'No month selected')}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pm-mois-grid-2-lignes">
              <div className="pm-mois-grid-ligne">
                {moisHaut.map(mois => renderMoisItem(mois))}
              </div>
              <div className="pm-mois-grid-ligne">
                {moisBas.map(mois => renderMoisItem(mois))}
              </div>
            </div>
          </div>

          <div className="pm-section pm-personne-section">
            <h3><User size={18} /> {t('Personne qui reçoit', 'Mpandray', 'Receiver')}</h3>
            <div className="pm-personne-container">
              <input
                type="text"
                value={personneRecu}
                onChange={(e) => setPersonneRecu(e.target.value)}
                placeholder={t('Saisir le nom de la personne qui reçoit', 'Ampidiro ny anaran\'ny mpandray', 'Enter the receiver name')}
                className="pm-personne-input"
              />
            </div>
          </div>

          <div className="pm-section pm-quittance-section">
            <h3><FileCheck size={18} /> {t('Quittance', 'Taratasy', 'Receipt')}</h3>
            <div className="pm-quittance-container">
              <div className="pm-quittance-input-group">
                <input
                  type="text"
                  value={quittance}
                  onChange={(e) => setQuittance(getOnlyNumbers(e.target.value))}
                  placeholder={t('Numéro de quittance', 'Laharana taratasy', 'Receipt number')}
                  className="pm-quittance-input"
                />
                <label className="pm-quittance-checkbox">
                  <input
                    type="checkbox"
                    checked={quittanceValidee}
                    onChange={(e) => {
                      if (!quittance) {
                        showToast(t('Veuillez saisir un numéro de quittance', 'Ampidiro ny laharana taratasy', 'Please enter a receipt number'), 'error');
                        return;
                      }
                      setQuittanceValidee(e.target.checked);
                    }}
                  />
                  {t('Valider la quittance', 'Hamarino ny taratasy', 'Validate receipt')}
                </label>
              </div>
              {quittance && quittanceValidee && (
                <div className="pm-quittance-validee">
                  <CheckCircle size={16} color="#27ae60" />
                  <span>
                    {t('Quittance validée', 'Voamarina ny taratasy', 'Receipt validated')} : <strong>{quittance}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            className="pm-btn-generate"
            onClick={genererFactures}
            disabled={
              isSubmitting ||
              !personneRecu.trim() ||
              !quittance ||
              !quittanceValidee ||
              moisSelectionnes.length === 0 ||
              (factureType === 'C' && !fraisRenouvValide)
            }
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="spinner" /> {t('Génération en cours...', 'Mamorona...', 'Generating...')}</>
            ) : (
              <><Save size={18} /> {t('Générer la facture', 'Hamorona faktiora', 'Generate invoice')} ({factureType})</>
            )}
          </button>

          {factureType === 'C' && !fraisRenouvValide && (
            <div className="pm-generate-warning">
              <AlertCircle size={16} />
              <span>
                ⚠️ {t('Frais de renouvellement de contrat obligatoire pour générer la facture', 'Tsy azo ihodivirana ny saran\'ny fanavaozana fifanarahana hamoronana faktiora', 'Contract renewal fees required to generate invoice')}
              </span>
            </div>
          )}
        </div>

        {showFactures && facturesGenerees.length > 0 && (
          <div className="pm-factures-generees">
            <div className="pm-factures-header">
              <h3>
                <FileText size={18} /> {t('Factures générées', 'Faktiora vita', 'Generated invoices')} ({facturesGenerees.length})
              </h3>
              <div className="pm-factures-actions">
                {facturesGenerees.length > 1 && (
                  <button
                    className="pm-btn-pdf-zip"
                    onClick={handleDownloadZip}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 size={16} className="spinner" /> {t('Génération...', 'Mamorona...', 'Generating...')}</>
                    ) : (
                      <><FileArchive size={16} /> {t('Télécharger ZIP', 'Alaina ZIP', 'Download ZIP')}</>
                    )}
                  </button>
                )}
                <button className="pm-btn-toggle" onClick={() => setShowFactures(!showFactures)}>
                  {showFactures ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>

            {showFactures && (
              <div className="pm-factures-list">
                {facturesGenerees.map((facture, index) => {
                  const dateFacture = new Date(facture.a_compter_du);
                  const moisIndex = dateFacture.getMonth();
                  const isTypeB = facture.num_facture_type === 'B';
                  const isTypeC = facture.num_facture_type === 'C';
                  return (
                    <div key={index} className="pm-facture-item">
                      <div className="pm-facture-info">
                        <span className="pm-facture-num">{facture.num_facture}</span>
                        <span className="pm-facture-date">
                          {moisLabels[moisIndex]} {dateFacture.getFullYear()}
                        </span>
                        <span className="pm-facture-montant">
                          {facture.soit_total.toLocaleString(locale)} Ar
                        </span>
                        <span className={`pm-facture-quittance ${isTypeB || isTypeC ? 'shared' : ''}`}>
                          {t('Quittance', 'Taratasy', 'Receipt')}: {String(facture.quittance || '').padStart(7, '0')}
                        </span>
                        <span className="pm-facture-uniter">U: {facture.uniter}</span>
                        {facture.is_renouvellement && (
                          <span className="pm-facture-renouvellement">
                            <RefreshCw size={12} /> {t('Renouv.', 'Fanavaozana', 'Renewal')}
                          </span>
                        )}
                      </div>
                      <button
                        className="pm-btn-pdf"
                        onClick={() => handleDownloadPDF(facture)}
                        disabled={isGenerating}
                      >
                        <Download size={16} /> PDF
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="pm-footer">
          <button className="pm-btn-print" onClick={() => window.print()}>
            <Printer size={18} /> {t('Imprimer', 'Atonta', 'Print')}
          </button>
        </div>
      </div>

      {showEditModal && (
        <div className="pm-modal-overlay">
          <div className="pm-modal-content">
            <div className="pm-modal-header">
              <h2>
                <UserCog size={22} color="#3498db" /> {t("Modifier l'usager", 'Ovay ny mpampiasa', 'Edit user')}
                {factureType === 'C' && (
                  <span className="pm-modal-obligatoire">
                    <AlertTriangle size={14} /> {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}
                  </span>
                )}
              </h2>
              {factureType !== 'C' && (
                <button className="pm-modal-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
              )}
            </div>

            <div className="pm-modal-body">
              {factureType === 'C' && (
                <div className="pm-modal-info-renouvellement">
                  <AlertTriangle size={16} />
                  <span>
                    {t(
                      "Renouvellement de contrat : vous devez confirmer les informations de l'usager pour continuer.",
                      "Fanavaozana fifanarahana : tsy maintsy manamarina ny mombamomba ny mpampiasa ianao hanohizana.",
                      'Contract renewal: you must confirm user information to continue.'
                    )}
                  </span>
                </div>
              )}

              <div className="pm-modal-grid">
                <div className="pm-modal-field">
                  <label>{t('Dénomination', 'Anarana', 'Name')} <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    value={editedUsager.denomination || editedUsager.nom_evenement || editedUsager.genre_manifestation || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, denomination: e.target.value }))}
                  />
                </div>
                <div className="pm-modal-field">
                  <label>{t('Demandeur', 'Mpangataka', 'Applicant')}</label>
                  <input
                    type="text"
                    value={editedUsager.demandeur || editedUsager.organisateurs || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, demandeur: e.target.value }))}
                  />
                </div>
                <div className="pm-modal-field">
                  <label>{t('Téléphone', 'Finday', 'Phone')}</label>
                  <input
                    type="text"
                    value={editedUsager.telephone || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, telephone: e.target.value }))}
                  />
                </div>
                <div className="pm-modal-field">
                  <label>{t('Email', 'Mailaka', 'Email')}</label>
                  <input
                    type="email"
                    value={editedUsager.email || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="pm-modal-field">
                  <label>{t('Région', 'Faritra', 'Region')}</label>
                  <input
                    type="text"
                    value={editedUsager.region || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, region: e.target.value }))}
                  />
                </div>
                <div className="pm-modal-field">
                  <label>{t('Adresse', 'Adiresy', 'Address')}</label>
                  <input
                    type="text"
                    value={editedUsager.adresse || editedUsager.adresse_siege || ''}
                    onChange={(e) => setEditedUsager(prev => ({ ...prev, adresse: e.target.value, adresse_siege: e.target.value }))}
                  />
                </div>

                {usagerType === 'occ' && (
                  <>
                    <div className="pm-modal-field">
                      <label>{t('Genre manifestation', 'Karazana hetsika', 'Event type')}</label>
                      <input
                        type="text"
                        value={editedUsager.genre_manifestation || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, genre_manifestation: e.target.value }))}
                      />
                    </div>
                    <div className="pm-modal-field">
                      <label>{t('Lieu événement', 'Toerana hetsika', 'Event location')}</label>
                      <input
                        type="text"
                        value={editedUsager.lieu_evenement || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, lieu_evenement: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {usagerType === 'media' && (
                  <>
                    <div className="pm-modal-field">
                      <label>{t('Fréquence', 'Fahita', 'Frequency')}</label>
                      <input
                        type="text"
                        value={editedUsager.frequence || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, frequence: e.target.value }))}
                      />
                    </div>
                    <div className="pm-modal-field">
                      <label>{t('Canal', 'Fantsona', 'Channel')}</label>
                      <input
                        type="text"
                        value={editedUsager.canal || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, canal: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {usagerType === 'other' && (
                  <>
                    <div className="pm-modal-field">
                      <label>{t('Nom', 'Anarana', 'Name')}</label>
                      <input
                        type="text"
                        value={editedUsager.nom || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, nom: e.target.value }))}
                      />
                    </div>
                    <div className="pm-modal-field">
                      <label>{t('Prénom', 'Fanampin\'anarana', 'First name')}</label>
                      <input
                        type="text"
                        value={editedUsager.prenom || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, prenom: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {(usagerType === 'hotel' || usagerType === 'nightclub' || usagerType === 'grand-surface') && (
                  <>
                    <div className="pm-modal-field">
                      <label>{t('Activité', 'Asa', 'Activity')}</label>
                      <input
                        type="text"
                        value={editedUsager.activite || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, activite: e.target.value }))}
                      />
                    </div>
                    {usagerType === 'hotel' && (
                      <div className="pm-modal-field">
                        <label>{t('Étoiles', 'Kintana', 'Stars')}</label>
                        <select
                          value={editedUsager.etoiles || ''}
                          onChange={(e) => setEditedUsager(prev => ({ ...prev, etoiles: e.target.value }))}
                        >
                          <option value="">{t('Sélectionner', 'Safidio', 'Select')}</option>
                          <option value="1 étoile">1 {t('étoile', 'kintana', 'star')}</option>
                          <option value="2 étoiles">2 {t('étoiles', 'kintana', 'stars')}</option>
                          <option value="3 étoiles">3 {t('étoiles', 'kintana', 'stars')}</option>
                          <option value="4 étoiles">4 {t('étoiles', 'kintana', 'stars')}</option>
                          <option value="5 étoiles">5 {t('étoiles', 'kintana', 'stars')}</option>
                        </select>
                      </div>
                    )}
                    {usagerType === 'nightclub' && (
                      <div className="pm-modal-field">
                        <label>{t('Jauge max', 'Fahaiza-mandray', 'Max capacity')}</label>
                        <input
                          type="number"
                          value={editedUsager.jauge_max || 0}
                          onChange={(e) => setEditedUsager(prev => ({ ...prev, jauge_max: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    )}
                    {usagerType === 'grand-surface' && (
                      <div className="pm-modal-field">
                        <label>{t('Nombre de magasins', 'Isan\'ny fivarotana', 'Number of stores')}</label>
                        <input
                          type="number"
                          value={editedUsager.nombre_magasins || 0}
                          onChange={(e) => setEditedUsager(prev => ({ ...prev, nombre_magasins: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    )}
                  </>
                )}

                {usagerType === 'bus' && (
                  <>
                    <div className="pm-modal-field">
                      <label>{t('Lignes', 'Lalana', 'Lines')}</label>
                      <input
                        type="text"
                        value={editedUsager.lignes || ''}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, lignes: e.target.value }))}
                      />
                    </div>
                    <div className="pm-modal-field">
                      <label>{t('Nombre de véhicules', 'Isan\'ny fiara', 'Number of vehicles')}</label>
                      <input
                        type="number"
                        value={editedUsager.nombre_vehicules || 0}
                        onChange={(e) => setEditedUsager(prev => ({ ...prev, nombre_vehicules: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pm-modal-footer">
              {factureType !== 'C' && (
                <button className="pm-modal-btn-cancel" onClick={() => setShowEditModal(false)}>
                  {t('Annuler', 'Foanana', 'Cancel')}
                </button>
              )}
              <button className="pm-modal-btn-save" onClick={handleSaveUsager} disabled={isSavingUsager}>
                {isSavingUsager ? (
                  <><Loader2 size={16} className="spinner" /> {t('Sauvegarde...', 'Mitahiry...', 'Saving...')}</>
                ) : (
                  <><Save size={16} /> {t('Enregistrer', 'Tehirizo', 'Save')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementMensuel;