// src/pages/OtherAjout.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import {
  ArrowLeft, ArrowRight, Save, X, User, Phone, Mail,
  MapPin, Calendar, CreditCard, DollarSign, Clock, FileText,
  CheckCircle, Info, Hash, Disc, Music, Globe, Sparkles, Video,
  Package, Repeat, CalendarCheck, Building2, Plus, Trash2,
  ListOrdered, FileCheck, UserPlus, Lock, QrCode, Receipt,
  Download, FileSignature, AlertCircle, MoreVertical, RefreshCw,
  Eye, Home,
} from 'lucide-react';
import '../styles/other-ajout.css';
import { useT } from '../hooks/useT';
import { generateFactureOtherPDF } from './pdf/facture_other';

const API_URL = 'http://localhost:3001/api';

const emptyLigne = () => ({ description: '', uniter: 1, pu: '' });

const getAnneesDisponibles = () => {
  const currentYear = new Date().getFullYear();
  const annees = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    annees.push(y);
  }
  return annees;
};

const OtherAjout = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();
  const qrRef = useRef(null);
  const menuRef = useRef(null);

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const moisLabels = useMemo(() => {
    if (langue === 'en') {
      return ['January','February','March','April','May','June','July','August','September','October','November','December'];
    }
    if (langue === 'mg') {
      return ['Janoary','Febroary','Martsa','Aprily','Mey','Jona','Jolay','Aogositra','Septambra','Oktobra','Novambra','Desambra'];
    }
    return ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  }, [langue]);

  const moisLabelsShort = useMemo(() => {
    if (langue === 'en') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (langue === 'mg') return ['Jan','Feb','Mar','Apr','Mey','Jon','Jol','Aog','Sep','Okt','Nov','Des'];
    return ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  }, [langue]);

  const TYPES_USAGERS = useMemo(() => [
    { id: 'cd',         label: t('CD', 'CD', 'CD'),                              icon: Disc,     color: '#3498db' },
    { id: 'mp3',        label: 'MP3',                                            icon: Music,    color: '#9b59b6' },
    { id: 'oeuvre-web', label: t('Œuvre Web', 'Asa an-tserasera', 'Web Work'),   icon: Globe,    color: '#2ecc71' },
    { id: 'hologramme', label: t('Hologramme', 'Holograma', 'Hologram'),         icon: Sparkles, color: '#e67e22' },
    { id: 'video',      label: t('Vidéo', 'Horonan-tsary', 'Video'),             icon: Video,    color: '#e74c3c' },
    { id: 'autre',      label: t('Autre', 'Hafa', 'Other'),                      icon: Package,  color: '#7f8c8d' }
  ], [t]);

  const MODES_PAIEMENT = useMemo(() => [
    { id: 'mensuel', label: t('Paiement mensuel', 'Fandoavana isam-bolana', 'Monthly payment'),   icon: Repeat },
    { id: 'unique',  label: t('Paiement unique', 'Fandoavana indray mandeha', 'One-time payment'), icon: CalendarCheck }
  ], [t]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [regionsUniques, setRegionsUniques] = useState([]);
  const [villesDisponibles, setVillesDisponibles] = useState([]);
  const [quartiersDisponibles, setQuartiersDisponibles] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedVille, setSelectedVille] = useState('');
  const [selectedQuartier, setSelectedQuartier] = useState('');

  const [typeUsager, setTypeUsager] = useState('');
  const [identification, setIdentification] = useState({
    denomination: '', nom: '', prenom: '', telephone: '', email: '', adresse: '', region: ''
  });

  const [representant, setRepresentant] = useState({
    representantPar: '', cin: '', cinDelivree: '', cinLieu: '', contact: ''
  });

  const [modePaiement, setModePaiement] = useState('');
  const [fraisDossierActif, setFraisDossierActif] = useState(false);
  const [fraisDossierMontant, setFraisDossierMontant] = useState('');
  const [isRetard, setIsRetard] = useState(false);
  const [montantRetard, setMontantRetard] = useState('');

  const [moisPaiement, setMoisPaiement] = useState([]);
  const [anneePaiement, setAnneePaiement] = useState(new Date().getFullYear());

  const [lignes, setLignes] = useState([
    { description: 'Hologramme', uniter: 3, pu: '5000' },
    { description: 'WEB', uniter: 2, pu: '5000' },
    { description: 'CD', uniter: 1, pu: '5000' }
  ]);

  const [quittance, setQuittance] = useState('');
  const [quittanceValidee, setQuittanceValidee] = useState(false);

  const [showQuittanceMenu, setShowQuittanceMenu] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState(null);
  const [isSavingQuittance, setIsSavingQuittance] = useState(false);

  const [personneRecu, setPersonneRecu] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savingResult, setSavingResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showFinalPage, setShowFinalPage] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [factureGeneree, setFactureGeneree] = useState(false);
  const [qrGenere, setQrGenere] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isGeneratingFacture, setIsGeneratingFacture] = useState(false);

  const [qrDownloaded, setQrDownloaded] = useState(false);

  const [typeFactureDAFC, setTypeFactureDAFC] = useState('DAFC');

  const [regionsCache, setRegionsCache] = useState([]);

  const anneesDisponibles = useMemo(() => getAnneesDisponibles(), []);

  // ============================================================
  // HELPERS
  // ============================================================
  const formatNumber = (value) => {
    if (!value && value !== 0) return '';
    const num = value.toString().replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (!num) return '';
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const parseNumber = (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/\s/g, '')) || 0;
  };

  const getMontantLigne = (ligne) => parseNumber(ligne.pu) * (parseInt(ligne.uniter) || 1);
  const getTotalLignes = () => lignes.reduce((acc, l) => acc + getMontantLigne(l), 0);

  const getTotalGeneral = () => {
    const totalLignes = getTotalLignes();
    const frais = fraisDossierActif ? parseNumber(fraisDossierMontant) : 0;
    const retard = isRetard ? parseNumber(montantRetard) : 0;
    return totalLignes + frais + retard;
  };

  const toggleMois = (mois) => {
    setMoisPaiement(prev =>
      prev.includes(mois) ? prev.filter(m => m !== mois) : [...prev, mois].sort((a, b) => a - b)
    );
  };

  const toggleTousMois = () => {
    if (moisPaiement.length === 12) setMoisPaiement([]);
    else setMoisPaiement([1,2,3,4,5,6,7,8,9,10,11,12]);
  };

  const handleLigneChange = (index, field, value) => {
    setLignes(prev => {
      const copy = [...prev];
      if (field === 'pu') {
        const raw = value.replace(/\s/g, '');
        if (raw !== '' && !/^\d+$/.test(raw)) return prev;
        copy[index] = { ...copy[index], pu: raw };
      } else if (field === 'uniter') {
        const n = parseInt(value) || 1;
        copy[index] = { ...copy[index], uniter: Math.max(1, n) };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const addLigne = () => setLignes(prev => [...prev, emptyLigne()]);
  const removeLigne = (index) => {
    if (lignes.length <= 1) return;
    setLignes(prev => prev.filter((_, i) => i !== index));
  };
  const setNombreLignes = (n) => {
    const count = Math.max(1, Math.min(20, parseInt(n) || 1));
    setLignes(prev => {
      if (count > prev.length) {
        const added = Array.from({ length: count - prev.length }, () => emptyLigne());
        return [...prev, ...added];
      }
      return prev.slice(0, count);
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowQuittanceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNomVille = (v) => !v ? '' : (v.nom || v.ville || v.nom_ville || '');
  const getQuartierVille = (v) => !v ? '' : (v.quartier || '');
  const getTelephoneVille = (v) => !v ? '' : (v.telephone || '');

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0,3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0,3)} ${cleaned.slice(3,5)} ${cleaned.slice(5)}`;
    return `${cleaned.slice(0,3)} ${cleaned.slice(3,5)} ${cleaned.slice(5,8)} ${cleaned.slice(8,10)}`;
  };

  const loadRegionsUniques = async () => {
    try {
      const response = await fetch(`${API_URL}/regions`);
      const result = await response.json();
      if (result.success && result.regions) {
        setRegionsCache(result.regions);
        const nomsUniques = [...new Set(result.regions.map(r => r.nom))].sort();
        setRegionsUniques(nomsUniques);
      }
    } catch (error) {
      console.error('Erreur chargement régions:', error);
    }
  };

  const loadVilles = async (regionNom) => {
    if (!regionNom) {
      setVillesDisponibles([]);
      return [];
    }
    try {
      const url = `${API_URL}/regions/villes/${encodeURIComponent(regionNom)}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        const villes = (result.villes || []).map((v) => ({
          id: v.id,
          nom: getNomVille(v),
          quartier: getQuartierVille(v),
          telephone: getTelephoneVille(v),
        })).filter((v) => v.nom);
        setVillesDisponibles(villes);
        return villes;
      }
      setVillesDisponibles([]);
      return [];
    } catch (error) {
      console.error('Erreur chargement villes:', error);
      setVillesDisponibles([]);
      return [];
    }
  };

  const handleRegionChange = async (e) => {
    const regionNom = e.target.value;
    setSelectedRegion(regionNom);
    setSelectedVille('');
    setSelectedQuartier('');
    setQuartiersDisponibles([]);
    setIdentification(prev => ({ ...prev, region: regionNom }));

    if (regionNom) {
      const villes = await loadVilles(regionNom);

      if (villes.length === 1) {
        const seuleVille = villes[0];
        setSelectedVille(seuleVille.nom);
        setQuartiersDisponibles([seuleVille]);
        if (seuleVille.quartier) {
          setSelectedQuartier(seuleVille.quartier);
        }
      }
    } else {
      setVillesDisponibles([]);
    }
  };

  const handleVilleChange = (e) => {
    const villeNom = e.target.value;
    setSelectedVille(villeNom);
    setSelectedQuartier('');

    const quartiersDeVille = villesDisponibles.filter(v => v.nom === villeNom);
    setQuartiersDisponibles(quartiersDeVille);

    if (quartiersDeVille.length === 1 && quartiersDeVille[0].quartier) {
      setSelectedQuartier(quartiersDeVille[0].quartier);
    }
  };

  const loadQuittance = async () => {
    try {
      const res = await fetch(`${API_URL}/quittance/reference`);
      const data = await res.json();
      if (data.success) {
        const nextFormat = data.prochainNumero || '0000001';
        setQuittance(nextFormat);
        console.log('✅ Quittance prochaine chargée:', nextFormat);
      }
    } catch (err) {
      console.error('Erreur quittance:', err);
      setQuittance('0000001');
    }
  };

  useEffect(() => {
    loadRegionsUniques();
    loadQuittance();
  }, []);

  const handleIdentificationChange = (field, value) => setIdentification(prev => ({ ...prev, [field]: value }));
  const handleRepresentantChange = (field, value) => setRepresentant(prev => ({ ...prev, [field]: value }));

  const handleEnregistrerQuittance = async () => {
    setShowQuittanceMenu(false);

    if (!quittance || quittance.trim() === '') {
      showToast(t('⚠️ Saisissez un numéro de quittance', '⚠️ Ampidiro ny laharana', '⚠️ Enter a receipt number'), 'warning');
      return;
    }

    const numeroSaisi = String(quittance).replace(/\D/g, '');
    if (!numeroSaisi) {
      showToast(t('⚠️ Numéro invalide', '⚠️ Diso ny laharana', '⚠️ Invalid number'), 'warning');
      return;
    }

    setIsSavingQuittance(true);

    try {
      const numeroInt = parseInt(numeroSaisi, 10);
      const longueurSaisie = Math.max(numeroSaisi.length, 7);
      const numFormate = String(numeroInt).padStart(longueurSaisie, '0');

      setQuittance(numFormate);
      setQuittanceValidee(true);

      showToast(
        t(
          `✅ Quittance ${numFormate} prête`,
          `✅ Taratasy ${numFormate} vonona`,
          `✅ Receipt ${numFormate} ready`
        ),
        'success'
      );
    } catch (error) {
      console.error('❌ Erreur:', error);
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'), 'error');
    } finally {
      setIsSavingQuittance(false);
    }
  };

  const handleVoirReference = async () => {
    setShowQuittanceMenu(false);
    try {
      const response = await fetch(`${API_URL}/quittance/reference`);
      const data = await response.json();
      if (data.success) {
        setReferenceInfo(data);
        setShowReferenceModal(true);
      } else {
        showToast(t('❌ Impossible de récupérer la référence', '❌ Tsy afaka', '❌ Cannot fetch'), 'error');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'), 'error');
    }
  };

  const fraisDossierOk = fraisDossierActif && fraisDossierMontant && parseNumber(fraisDossierMontant) > 0;

  const handleNext = () => {
    if (currentStep === 1) {
      if (!typeUsager) { showToast(t("Veuillez sélectionner un type d'usager", 'Misafidiana karazana', 'Select a type'), 'warning'); return; }
      if (!identification.denomination) { showToast(t('Veuillez saisir la dénomination', 'Ampidiro ny anarana', 'Enter name'), 'warning'); return; }
      if (!selectedRegion || selectedRegion.trim() === '') {
        showToast(t('Veuillez sélectionner une région', 'Misafidiana faritra azafady', 'Please select a region'), 'warning');
        return;
      }
      if (villesDisponibles.length > 1 && (!selectedVille || selectedVille.trim() === '')) {
        showToast(t('Cette région a plusieurs villes, veuillez sélectionner une ville', 'Manana tanàna maro ity faritra ity', 'This region has multiple cities'), 'warning');
        return;
      }
      setCurrentStep(2); return;
    }
    if (currentStep === 2) {
      if (!representant.representantPar) { showToast(t('Veuillez saisir le nom du représentant', 'Ampidiro ny mpisolo tena', 'Enter representative'), 'warning'); return; }
      setCurrentStep(3); return;
    }
    if (currentStep === 3) {
      if (!modePaiement) { showToast(t('Veuillez choisir un mode de paiement', 'Misafidiana fomba', 'Choose payment'), 'warning'); return; }
      if (lignes.length === 0) { showToast(t('Ajoutez au moins une ligne', 'Ampio tsipika', 'Add a line'), 'warning'); return; }
      const allFilled = lignes.every(l => l.description.trim() !== '' && l.pu !== '');
      if (!allFilled) { showToast(t('Veuillez remplir toutes les lignes', 'Fenoy ny tsipika', 'Fill all lines'), 'warning'); return; }
      if (modePaiement === 'mensuel' && moisPaiement.length === 0) { showToast(t('⚠️ Sélectionnez au moins un mois', '⚠️ Misafidiana volana', '⚠️ Select a month'), 'warning'); return; }
      if (!personneRecu || personneRecu.trim() === '') { showToast(t('⚠️ Saisissez le nom du receveur', '⚠️ Ampidiro ny mpandray', '⚠️ Enter receiver'), 'warning'); return; }
      if (!quittanceValidee) { showToast(t('⚠️ Validez la quittance', '⚠️ Hamarino ny taratasy', '⚠️ Validate the receipt'), 'warning'); return; }
      
      if (!fraisDossierOk) {
        showToast(
          t(
            'Les frais de dossier sont obligatoires. Cochez la case et saisissez un montant.',
            'Tsy azo ihodivirana ny saran\'ny rakitra.',
            'File fees are mandatory. Check the box and enter an amount.'
          ),
          'warning'
        );
        return;
      }
      
      setSavingResult(null);
      setShowConfirmModal(true);
      return;
    }
  };

  const handlePrev = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  // ============================================================
  // ✅ handleConfirmSave — AVEC APPEL À /paiements/enregistrer
  // ============================================================
  const handleConfirmSave = async () => {
    setIsSaving(true);
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();

    try {
      const moisPayesArray = modePaiement === 'mensuel'
        ? [...moisPaiement].sort((a, b) => a - b)
        : [];

      const soitTotal = getTotalGeneral();
      const fraisDossier = fraisDossierActif ? parseNumber(fraisDossierMontant) : 0;
      const montantRetardVal = isRetard ? parseNumber(montantRetard) : 0;

      const payloadUsager = {
        type: typeUsager,
        identification: {
          ...identification,
          region: selectedRegion,
          ville: selectedVille,
          quartier: selectedQuartier,
        },
        representant,
        paiement: {
          mode: modePaiement,
          frais_dossier_actif: fraisDossierActif,
          frais_dossier: fraisDossier,
          is_retard: isRetard,
          montant_retard: montantRetardVal,
          annee: modePaiement === 'mensuel' ? anneePaiement : new Date().getFullYear(),
          mois: moisPayesArray.length > 0 ? moisPayesArray[0] : (new Date().getMonth() + 1),
          mois_payes: moisPayesArray,
          nombre_mois: moisPayesArray.length || 1,
          lignes: lignes.map(l => ({
            description: l.description,
            uniter: parseInt(l.uniter) || 1,
            pu: parseNumber(l.pu)
          }))
        },
        userId: currentUser.id || null,
        quittance: quittance,
        personneRecu,
      };

      console.log('📦 Payload complet:', JSON.stringify(payloadUsager, null, 2));
      console.log('📅 Mois à enregistrer:', moisPayesArray);
      console.log('📆 Année:', anneePaiement);
      console.log('🔢 Nombre de mois:', moisPayesArray.length);

      // ═══════════════════════════════════════════════════════════
      // 1️⃣ CRÉATION USAGER + FACTURE + QUITTANCE
      // ═══════════════════════════════════════════════════════════
      const response = await fetch(`${API_URL}/other-usagers/creer-complet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadUsager)
      });
      const data = await response.json();

      if (!data.success) {
        setSavingResult({ success: false, message: data.message || 'Erreur création' });
        setIsSaving(false);
        return;
      }

      const usagerOtherId = data.usagerOtherId;
      const factureId = data.factureId;
      const numFactureFinal = data.numFacture;
      const quittanceFinale = data.quittance;

      console.log('✅ Usager + Facture + Quittance créés:', { usagerOtherId, factureId, numFactureFinal, quittanceFinale });

      // ═══════════════════════════════════════════════════════════
      // 2️⃣ ⭐⭐⭐ APPEL À /paiements/enregistrer ⭐⭐⭐
      //    COMME PaiementMensuel.jsx
      //    → C'EST CE QUI ENREGISTRE CORRECTEMENT mois_payes
      // ═══════════════════════════════════════════════════════════
      if (modePaiement === 'mensuel' && moisPayesArray.length > 0) {
        const paiementPayload = {
          usagerId: usagerOtherId,
          usagerType: 'other',
          type_paiement: 'mensuel',
          montant: soitTotal,
          date_paiement: new Date().toISOString().split('T')[0],
          frais_dossier: fraisDossier,
          montant_retard: montantRetardVal,
          est_retard: isRetard,
          annee: anneePaiement,
          mois: moisPayesArray[0],
          mois_payes: moisPayesArray,             // ✅ [1,2,3,4,5]
          nombre_mois: moisPayesArray.length,      // ✅ 5
          statut: 'paye',
          reference: numFactureFinal || `OTH-${usagerOtherId}`,
        };

        console.log('📤 [1/2] Appel /paiements/enregistrer avec:', paiementPayload);

        const paiementRes = await fetch(`${API_URL}/paiements/enregistrer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'adminToken': localStorage.getItem('adminToken') || '',
          },
          body: JSON.stringify(paiementPayload),
        });

        const paiementResult = await paiementRes.json();

        if (!paiementResult.success) {
          console.error('❌ Erreur paiement:', paiementResult);
          // On continue quand même — l'usager est créé
        } else {
          console.log('✅ Paiement OTHER enregistré:', paiementResult);
          console.log('   → nombre_mois:', paiementResult.nombre_mois);
          console.log('   → mois_payes:', paiementResult.mois_payes);
        }
      }

      await loadQuittance();

      const usagerFinal = {
        id: usagerOtherId,
        denomination: identification.denomination || 'Sans nom',
        demandeur: [identification.nom, identification.prenom].filter(Boolean).join(' ') || representant.representantPar || '',
        telephone: identification.telephone || '',
        region: selectedRegion || '',
        ville: selectedVille || '',
        quartier: selectedQuartier || '',
        adresse: identification.adresse || '',
        email: identification.email || '',
        representant_nom: representant.representantPar || '',
        representant_cin: representant.cin || '',
        representant_cin_delivree: representant.cinDelivree || '',
        representant_cin_lieu: representant.cinLieu || '',
        representant_contact: representant.contact || '',
        numero_dossier_utilisateur: `OTH-${usagerOtherId}`,
        type_other: typeUsager,
        montant_mensuel: soitTotal,
        frais_dossier: fraisDossier,
        montant_retard: montantRetardVal,
        is_retard: isRetard,
        uniter: 1,
        created_at: new Date().toISOString(),
      };

      const resultFinal = {
        success: true,
        usagerOtherId,
        factureId,
        numFacture: numFactureFinal || `OTH-${usagerOtherId}`,
        soitTotal,
        quittance: quittanceFinale || quittance,
        modePaiement,
        moisPaiement: moisPayesArray,
        anneePaiement: modePaiement === 'mensuel' ? anneePaiement : new Date().getFullYear(),
        usager: usagerFinal,
        lignes: lignes.map(l => ({
          description: l.description,
          uniter: parseInt(l.uniter) || 1,
          pu: parseNumber(l.pu)
        })),
        fraisDossier,
        montantRetard: montantRetardVal,
        isRetard,
        personneRecu,
      };

      setSavingResult(resultFinal);
      setFinalData(resultFinal);

      setTimeout(() => {
        setShowConfirmModal(false);
        setShowFinalPage(true);
        setIsSaving(false);
      }, 1200);

    } catch (error) {
      console.error('Erreur:', error);
      setSavingResult({
        success: false,
        message: t('Erreur de connexion au serveur', 'Nisy olana', 'Server error')
      });
      setIsSaving(false);
    }
  };

  const handleGenerateFacture = async () => {
    if (!finalData || factureGeneree) return;
    setIsGeneratingFacture(true);
    try {
      await generateFactureOtherPDF({
        ref_omda: finalData.usagerOtherId,
        num_facture: finalData.numFacture,
        ref_client_type: 'OTH',
        ref_usager: finalData.usagerOtherId,
        type_facture: typeFactureDAFC,
        denomination: finalData.usager.denomination,
        representant_nom: finalData.usager.representant_nom,
        adresse: finalData.usager.adresse,
        telephone: finalData.usager.telephone,
        region_usager: finalData.usager.region,
        ville: finalData.usager.ville,
        quartier: finalData.usager.quartier,
        lignes: finalData.lignes,
        frais_dossier: finalData.fraisDossier,
        montant_retard: finalData.montantRetard,
        is_retard: finalData.isRetard,
        soit_total: finalData.soitTotal,
        personne_recu: finalData.personneRecu,
        quittance: finalData.quittance,
      });
      setFactureGeneree(true);
    } catch (err) {
      console.error('❌ Erreur facture:', err);
      showToast(t('Erreur génération facture', 'Nisy olana tamin\'ny faktiora', 'Invoice error') + ' : ' + err.message, 'error');
    } finally {
      setIsGeneratingFacture(false);
    }
  };

  const generateQRTextContent = () => {
    if (!finalData) return '';
    const u = finalData.usager;
    const notSpecified = t('Non spécifié', 'Tsy voafaritra', 'Not specified');
    const regionInfo = regionsCache.find(r => (r.nom || '').toLowerCase() === (u.region || '').toLowerCase());
    const ville = u.ville || regionInfo?.ville || '';
    const quartier = u.quartier || regionInfo?.quartier || '';
    const telephoneRegion = regionInfo?.telephone || '034 05 533 88';

    const parts = [`© OMDA`];
    if (ville) parts.push(ville);
    if (quartier) parts.push(quartier);
    parts.push(`Tel : ${formatPhoneNumber(telephoneRegion) || '034 05 533 88'}`);
    const footerLine = parts.join(' - ');

    const nom = u.denomination || notSpecified;
    const demandeur = u.demandeur || notSpecified;
    const region = u.region || notSpecified;
    const lignes = finalData.lignes.map(l => l.description).join(', ');

    return [
      `OMDA certifie un usager evenementiel`,
      `${t('Denomination', 'Anarana', 'Name')} : ${nom}`,
      `${t('Demandeur', 'Mpangataka', 'Applicant')} : ${demandeur}`,
      `${t('Prestations', 'Tolotra', 'Services')} : ${lignes}`,
      `${t('Region', 'Faritra', 'Region')} : ${region}`,
      `Ref : ${u.numero_dossier_utilisateur}`,
      footerLine,
    ].join('\n');
  };

  const handleGenerateQR = async () => {
    if (!finalData) return;
    if (qrGenere) { 
      setQrDownloaded(false);
      setShowQrModal(true); 
      return; 
    }
    setIsGeneratingQr(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      setQrGenere(true);
      setQrDownloaded(false);
      setShowQrModal(true);
    } catch (err) {
      console.error('❌ Erreur QR:', err);
      showToast(t('Erreur génération QR', 'Nisy olana tamin\'ny QR', 'QR error'), 'error');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) {
      showToast(t('QR code non disponible', 'QR code tsy misy', 'QR code not available'), 'error');
      return;
    }
    setIsDownloadingQr(true);
    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `qr-code-omda-other-${finalData.usagerOtherId}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setQrDownloaded(true);

      showToast(
        t('✅ QR Code téléchargé — vous pouvez maintenant fermer', 
          '✅ Vita ny fakana QR Code — afaka mihidy izao', 
          '✅ QR Code downloaded — you can now close'),
        'success'
      );
    } catch (err) {
      console.error('❌ Erreur téléchargement QR:', err);
      showToast(t('❌ Erreur téléchargement', '❌ Nisy olana', '❌ Download error'), 'error');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleCloseQrModal = () => {
    if (!qrDownloaded) {
      showToast(
        t('⚠️ Veuillez d\'abord télécharger le QR Code avant de fermer',
          '⚠️ Alao aloha ny QR Code vao hidio',
          '⚠️ Please download the QR Code before closing'),
        'warning'
      );
      return;
    }
    setShowQrModal(false);
  };

  const allDocsGenerated = factureGeneree && qrGenere;

  const handleTerminer = () => {
    if (!allDocsGenerated) {
      showToast(t(
        '⚠️ Veuillez générer la facture ET le QR Code avant de terminer',
        '⚠️ Hamorona ny faktiora sy QR Code aloha',
        '⚠️ Please generate the invoice AND QR Code first'
      ), 'warning');
      return;
    }
    navigate('/gere-payer');
  };

  // ============================================================
  // RENDER STEP 1
  // ============================================================
  const renderStep1 = () => {
    const nbVilles = villesDisponibles.length;
    const villeObligatoire = nbVilles > 1;
    const quartierInfo = quartiersDisponibles.find(q => q.quartier === selectedQuartier);

    return (
      <div className="oa-step-content">
        <div className="oa-section">
          <h3 className="oa-section-title">
            <Package size={18} /> {t("Type d'usager événementiel", 'Karazana mpanjifa', 'Event user type')}
          </h3>
          <div className="oa-types-grid">
            {TYPES_USAGERS.map(type => {
              const Icon = type.icon;
              const isActive = typeUsager === type.id;
              return (
                <button key={type.id} type="button"
                  className={`oa-type-card ${isActive ? 'active' : ''}`}
                  onClick={() => setTypeUsager(type.id)}
                  style={isActive ? { borderColor: type.color, background: `${type.color}10` } : {}}>
                  <div className="oa-type-icon" style={{ background: `${type.color}20`, color: type.color }}>
                    <Icon size={22} />
                  </div>
                  <strong>{type.label}</strong>
                  {isActive && <CheckCircle size={16} className="oa-type-check" style={{ color: type.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="oa-section">
          <h3 className="oa-section-title">
            <Building2 size={18} /> {t('Identification', 'Famantarana', 'Identification')}
          </h3>
          <div className="oa-form-grid">
            <div className="oa-form-group oa-full">
              <label><FileText size={14} /> {t('Dénomination', 'Anarana', 'Name')} *</label>
              <input type="text" value={identification.denomination}
                onChange={(e) => handleIdentificationChange('denomination', e.target.value)}
                placeholder={t("Nom de l'entreprise", "Anaran'ny orinasa", 'Company name')} />
            </div>
            <div className="oa-form-group">
              <label><User size={14} /> {t('Nom', 'Anarana', 'Last name')}</label>
              <input type="text" value={identification.nom}
                onChange={(e) => handleIdentificationChange('nom', e.target.value)} />
            </div>
            <div className="oa-form-group">
              <label><User size={14} /> {t('Prénom', 'Fanampin\'anarana', 'First name')}</label>
              <input type="text" value={identification.prenom}
                onChange={(e) => handleIdentificationChange('prenom', e.target.value)} />
            </div>
            <div className="oa-form-group">
              <label><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}</label>
              <input type="tel" value={identification.telephone}
                onChange={(e) => handleIdentificationChange('telephone', e.target.value)}
                placeholder="03* ** *** **" />
            </div>
            <div className="oa-form-group">
              <label><Mail size={14} /> Email</label>
              <input type="email" value={identification.email}
                onChange={(e) => handleIdentificationChange('email', e.target.value)} />
            </div>
            <div className="oa-form-group oa-full">
              <label><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}</label>
              <input type="text" value={identification.adresse}
                onChange={(e) => handleIdentificationChange('adresse', e.target.value)} />
            </div>

            <div className="oa-form-group oa-full">
              <label><MapPin size={14} /> {t('Région', 'Faritra', 'Region')} *</label>
              <select value={selectedRegion} onChange={handleRegionChange} className="oa-region-select" required>
                <option value="">{t('Sélectionner une région', 'Misafidiana faritra', 'Select a region')}</option>
                {regionsUniques.map((regionNom) => (
                  <option key={regionNom} value={regionNom}>{regionNom}</option>
                ))}
              </select>
            </div>

            {selectedRegion && villeObligatoire && (
              <div className="oa-form-group oa-full">
                <label><Home size={14} /> {t('Ville', 'Tanàna', 'City')} *</label>
                <select value={selectedVille} onChange={handleVilleChange} className="oa-region-select" required>
                  <option value="">{t('Sélectionner une ville', 'Misafidiana tanàna', 'Select a city')}</option>
                  {villesDisponibles.map((v) => (
                    <option key={v.id} value={v.nom}>{v.nom}</option>
                  ))}
                </select>
                <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
                  ({nbVilles} {t('villes disponibles', 'tanàna misy', 'available cities')})
                </span>
              </div>
            )}

            {selectedRegion && nbVilles === 1 && (
              <div className="oa-form-group oa-full">
                <label><Home size={14} /> {t('Ville', 'Tanàna', 'City')}</label>
                <div style={{
                  padding: '8px 14px', background: '#e8f5e9', border: '1px solid #a5d6a7',
                  borderRadius: '8px', color: '#2e7d32', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <Home size={14} />
                  {villesDisponibles[0]?.nom}
                  <span style={{ fontSize: '12px', opacity: 0.7, fontWeight: 400 }}>
                    ({t('auto-sélectionnée', 'voafidy ho azy', 'auto-selected')})
                  </span>
                </div>
              </div>
            )}

            {selectedVille && quartiersDisponibles.length > 0 && (
              <div className="oa-form-group oa-full">
                <label>
                  <Building2 size={14} /> {t('Quartier', 'Fokontany', 'Neighborhood')}
                  <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: 6, fontWeight: 400 }}>
                    ({t('optionnel', 'tsy voatery', 'optional')})
                  </span>
                </label>
                <select value={selectedQuartier}
                  onChange={(e) => setSelectedQuartier(e.target.value)}
                  className="oa-region-select">
                  <option value="">{t('Sélectionner un quartier', 'Misafidiana fokontany', 'Select a neighborhood')}</option>
                  {quartiersDisponibles.map((q, index) => (
                    <option key={q.id || index} value={q.quartier || ''}>
                      {q.quartier || t('(Sans quartier)', '(Tsy misy fokontany)', '(No neighborhood)')}
                      {q.telephone ? ` • ${q.telephone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedRegion || selectedVille || selectedQuartier) && (
              <div className="oa-form-group oa-full">
                <div style={{
                  padding: '12px 16px',
                  background: selectedRegion && selectedVille ? '#f0fdf4' : '#fff8e1',
                  border: `1px solid ${selectedRegion && selectedVille ? '#86efac' : '#f39c12'}`,
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                  fontSize: '13px', color: '#000000',
                }}>
                  <CheckCircle size={18} color={selectedRegion && selectedVille ? '#27ae60' : '#f39c12'} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#000000' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#000000' }}>
                      <MapPin size={12} color="#000000" />
                      <span style={{ color: '#000000' }}>{t('Région', 'Faritra', 'Region')} :</span>
                      <strong style={{ color: '#000000' }}>{selectedRegion || '-'}</strong>
                    </span>
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#000000' }}>
                      <Home size={12} color="#000000" />
                      <span style={{ color: '#000000' }}>{t('Ville', 'Tanàna', 'City')} :</span>
                      <strong style={{ color: '#000000' }}>{selectedVille || '-'}</strong>
                    </span>
                    {selectedQuartier && (
                      <>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#000000' }}>
                          <Building2 size={12} color="#000000" />
                          <span style={{ color: '#000000' }}>{t('Quartier', 'Fokontany', 'Neighborhood')} :</span>
                          <strong style={{ color: '#000000' }}>{selectedQuartier}</strong>
                        </span>
                      </>
                    )}
                    {quartierInfo && quartierInfo.telephone && (
                      <>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#000000' }}>
                          <Phone size={12} color="#000000" />
                          <strong style={{ color: '#000000' }}>{formatPhoneNumber(quartierInfo.telephone)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="oa-step-content">
      <div className="oa-info-banner">
        <Info size={16} />
        <span>{t('Usager', 'Mpanjifa', 'User')} : <strong>{identification.denomination || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong></span>
      </div>
      <div className="oa-section">
        <h3 className="oa-section-title">
          <User size={18} /> {t('Représentant légal', 'Mpisolo tena', 'Legal representative')}
        </h3>
        <div className="oa-form-grid">
          <div className="oa-form-group oa-full">
            <label><User size={14} /> {t('Représenté par', 'Mpisolo tena', 'Represented by')} *</label>
            <input type="text" value={representant.representantPar}
              onChange={(e) => handleRepresentantChange('representantPar', e.target.value)} />
          </div>
          <div className="oa-form-group">
            <label><CreditCard size={14} /> {t('Numéro CIN', 'Laharana CIN', 'CIN')}</label>
            <input type="text" value={representant.cin}
              onChange={(e) => handleRepresentantChange('cin', e.target.value)} />
          </div>
          <div className="oa-form-group">
            <label><Calendar size={14} /> {t('Délivrée le', 'Nomena ny', 'Issued on')}</label>
            <input type="date" value={representant.cinDelivree}
              onChange={(e) => handleRepresentantChange('cinDelivree', e.target.value)} />
          </div>
          <div className="oa-form-group">
            <label><MapPin size={14} /> {t('Lieu de délivrance', 'Toerana', 'Place of issue')}</label>
            <input type="text" value={representant.cinLieu}
              onChange={(e) => handleRepresentantChange('cinLieu', e.target.value)} />
          </div>
          <div className="oa-form-group">
            <label><Phone size={14} /> {t('Contact', 'Fifandraisana', 'Contact')}</label>
            <input type="tel" value={representant.contact}
              onChange={(e) => handleRepresentantChange('contact', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const total = getTotalGeneral();
    const moisHaut = [1, 2, 3, 4, 5, 6];
    const moisBas = [7, 8, 9, 10, 11, 12];
    const tousSelectionnes = moisPaiement.length === 12;

    const fraisDossierManquant = !fraisDossierActif || !fraisDossierMontant || parseNumber(fraisDossierMontant) <= 0;

    return (
      <div className="oa-step-content">
        <div className="oa-section">
          <h3 className="oa-section-title">
            <Hash size={18} /> {t('Type de facture', 'Karazana faktiora', 'Invoice type')}
          </h3>
          <div className="oa-type-facture-options">
            <label className={`oa-type-facture-option ${typeFactureDAFC === 'DAFC' ? 'active' : ''}`}>
              <input type="radio" name="typeFactureDAFC" value="DAFC"
                checked={typeFactureDAFC === 'DAFC'} onChange={() => setTypeFactureDAFC('DAFC')} />
              <div className="oa-type-facture-content">
                <span className="oa-type-facture-title">DAFC</span>
                <span className="oa-type-facture-desc">
                  {t('Droit d\'auteur et frais connexes', 'Zon\'ny mpanoratra sy sara', 'Copyright and related fees')}
                </span>
              </div>
            </label>
            <label className={`oa-type-facture-option ${typeFactureDAFC === 'SFL' ? 'active' : ''}`}>
              <input type="radio" name="typeFactureDAFC" value="SFL"
                checked={typeFactureDAFC === 'SFL'} onChange={() => setTypeFactureDAFC('SFL')} />
              <div className="oa-type-facture-content">
                <span className="oa-type-facture-title">SFL</span>
                <span className="oa-type-facture-desc">
                  {t('Sans frais de licence', 'Tsy misy saran\'ny fahazoan-dalana', 'Without license fees')}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="oa-section">
          <h3 className="oa-section-title">
            <DollarSign size={18} /> {t('Mode de paiement', 'Fomba fandoavana', 'Payment method')}
          </h3>
          <div className="oa-modes-grid">
            {MODES_PAIEMENT.map(mode => {
              const Icon = mode.icon;
              const isActive = modePaiement === mode.id;
              return (
                <button key={mode.id} type="button"
                  className={`oa-mode-card ${isActive ? 'active' : ''}`}
                  onClick={() => setModePaiement(mode.id)}>
                  <Icon size={24} />
                  <strong>{mode.label}</strong>
                  {isActive && <CheckCircle size={16} className="oa-mode-check" />}
                </button>
              );
            })}
          </div>
        </div>

        {modePaiement && (
          <>
            {modePaiement === 'mensuel' && (
              <div className="oa-section">
                <h3 className="oa-section-title">
                  <Calendar size={18} /> {t('Mois à payer', 'Volana haloa', 'Months to pay')}
                </h3>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <select value={anneePaiement}
                    onChange={(e) => setAnneePaiement(parseInt(e.target.value))}
                    className="oa-region-select" style={{ maxWidth: '150px' }}>
                    {anneesDisponibles.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button type="button" onClick={toggleTousMois}
                    style={{
                      padding: '8px 16px', border: '1px solid #3498db',
                      background: tousSelectionnes ? '#3498db' : '#fff',
                      color: tousSelectionnes ? '#fff' : '#3498db',
                      borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                    }}>
                    {tousSelectionnes
                      ? t('Tout désélectionner', 'Esory ny safidy', 'Deselect all')
                      : t('Tout sélectionner', 'Safidio ny rehetra', 'Select all')}
                  </button>
                </div>

                <div className="oa-mois-grid-2-lignes">
                  <div className="oa-mois-grid-ligne">
                    {moisHaut.map(m => {
                      const isSelected = moisPaiement.includes(m);
                      return (
                        <button key={m} type="button"
                          className={`oa-mois-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleMois(m)}
                          style={{
                            padding: '12px',
                            border: isSelected ? '2px solid #3498db' : '1px solid #ddd',
                            background: isSelected ? '#e8f4ff' : '#fff',
                            borderRadius: '8px', cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#2980b9' : '#333',
                          }}>
                          {moisLabels[m - 1]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="oa-mois-grid-ligne">
                    {moisBas.map(m => {
                      const isSelected = moisPaiement.includes(m);
                      return (
                        <button key={m} type="button"
                          className={`oa-mois-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleMois(m)}
                          style={{
                            padding: '12px',
                            border: isSelected ? '2px solid #3498db' : '1px solid #ddd',
                            background: isSelected ? '#e8f4ff' : '#fff',
                            borderRadius: '8px', cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#2980b9' : '#333',
                          }}>
                          {moisLabels[m - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#555' }}>
                  <strong>{moisPaiement.length}</strong> {t('mois sélectionné(s)', 'volana voafidy', 'month(s)')}
                  {moisPaiement.length > 0 && (
                    <span> ({moisPaiement.map(m => moisLabelsShort[m - 1]).join(', ')})</span>
                  )}
                </div>
              </div>
            )}

            <div className="oa-section">
              <h3 className="oa-section-title">
                <ListOrdered size={18} /> {t('Nombre de lignes', 'Isan\'ny tsipika', 'Number of lines')}
              </h3>
              <div className="oa-lines-control">
                <label>{t('Nombre de lignes', 'Isan\'ny tsipika', 'Lines')} :</label>
                <input type="number" min="1" max="20" value={lignes.length}
                  onChange={(e) => setNombreLignes(e.target.value)}
                  className="oa-input-lines-count" />
                <button type="button" className="oa-btn-add-line" onClick={addLigne}>
                  <Plus size={14} /> {t('Ajouter', 'Manampy', 'Add')}
                </button>
              </div>
            </div>

            <div className="oa-section">
              <h3 className="oa-section-title">
                <FileText size={18} /> {t('Détail de la facture', 'Antsipirian\'ny faktiora', 'Invoice details')}
              </h3>

              <div className="oa-facture-table-wrapper">
                <table className="oa-facture-table">
                  <thead>
                    <tr>
                      <th>{t('DESCRIPTIONS', 'FANAZAVANA', 'DESCRIPTIONS')}</th>
                      <th>U.</th>
                      <th>P.U. (Ar)</th>
                      <th>{t('MONTANT (Ar)', 'VOLA (Ar)', 'AMOUNT (Ar)')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((ligne, index) => {
                      const montant = getMontantLigne(ligne);
                      return (
                        <tr key={index}>
                          <td>
                            <input type="text" value={ligne.description}
                              onChange={(e) => handleLigneChange(index, 'description', e.target.value)}
                              className="oa-input-cell" />
                          </td>
                          <td>
                            <input type="number" min="1" value={ligne.uniter}
                              onChange={(e) => handleLigneChange(index, 'uniter', e.target.value)}
                              className="oa-input-cell oa-input-small" />
                          </td>
                          <td>
                            <input type="text" value={formatNumber(ligne.pu)}
                              onChange={(e) => handleLigneChange(index, 'pu', e.target.value)}
                              placeholder="0" className="oa-input-cell" />
                          </td>
                          <td className="oa-cell-montant">{formatNumber(montant)}</td>
                          <td>
                            <button type="button" className="oa-btn-remove-line"
                              onClick={() => removeLigne(index)}
                              disabled={lignes.length <= 1}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="oa-row-frais">
                      <td>
                        <label className="oa-frais-label-inline"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={fraisDossierActif}
                            onChange={(e) => {
                              setFraisDossierActif(e.target.checked);
                              if (!e.target.checked) setFraisDossierMontant('');
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{
                            fontWeight: 600,
                            color: fraisDossierManquant ? '#dc3545' : '#333'
                          }}>
                            {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}
                          </span>
                          <span style={{ color: 'red', fontSize: '14px' }}>*</span>
                        </label>
                      </td>
                      <td>
                        <input type="number" value="1" readOnly
                          className="oa-input-cell oa-input-small oa-input-readonly" />
                      </td>
                      <td>
                        <input type="text" value={formatNumber(fraisDossierMontant)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\s/g, '');
                            if (raw === '' || /^\d+$/.test(raw)) setFraisDossierMontant(raw);
                          }}
                          placeholder="0"
                          disabled={!fraisDossierActif}
                          className="oa-input-cell"
                          style={{
                            borderColor: fraisDossierManquant && fraisDossierActif ? '#dc3545' : undefined,
                            borderWidth: fraisDossierManquant && fraisDossierActif ? '2px' : undefined,
                          }}
                        />
                      </td>
                      <td className="oa-cell-montant">
                        {formatNumber(fraisDossierActif ? parseNumber(fraisDossierMontant) : 0)}
                      </td>
                      <td></td>
                    </tr>

                    {isRetard && (
                      <tr className="oa-row-retard">
                        <td>
                          <input type="text" value={t('Pénalité de retard', 'Sazy', 'Late penalty')}
                            readOnly className="oa-input-cell oa-input-readonly" />
                        </td>
                        <td>
                          <input type="number" value="1" readOnly
                            className="oa-input-cell oa-input-small oa-input-readonly" />
                        </td>
                        <td>
                          <input type="text" value={formatNumber(montantRetard)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\s/g, '');
                              if (raw === '' || /^\d+$/.test(raw)) setMontantRetard(raw);
                            }}
                            placeholder="0" className="oa-input-cell" />
                        </td>
                        <td className="oa-cell-montant">{formatNumber(parseNumber(montantRetard))}</td>
                        <td></td>
                      </tr>
                    )}

                    <tr className="oa-row-total">
                      <td colSpan={3}>{t('TOTAL', 'TOTAL', 'TOTAL')}</td>
                      <td className="oa-cell-montant oa-total-value">{formatNumber(total)} Ar</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="oa-retard-box">
                <label className="oa-checkbox-label">
                  <input type="checkbox" checked={isRetard}
                    onChange={(e) => setIsRetard(e.target.checked)} />
                  <Clock size={14} /> {t('Appliquer une pénalité de retard', 'Mampihatra sazy', 'Apply late penalty')}
                </label>
              </div>
            </div>

            <div className="oa-total-box">
              <div className="oa-total-row">
                <span><Hash size={14} /> {t('Total à payer', 'Vola haloa', 'Total')}</span>
                <strong>{formatNumber(total)} Ar</strong>
              </div>
            </div>

            <div className="oa-section quittance-section">
              <h3 className="oa-section-title">
                <FileCheck size={18} /> {t('Quittance', 'Taratasy', 'Receipt')}{' '}
                <span style={{ color: 'red', fontSize: '14px' }}>*</span>
              </h3>
              <div className="quittance-container">
                <div className="quittance-input-group">
                  <div className="quittance-input-wrapper" ref={menuRef}
                    style={{ display: 'flex', gap: '4px', alignItems: 'stretch', position: 'relative', width: '100%' }}>
                    <input type="text" value={quittance}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setQuittance(value);
                        if (quittanceValidee) setQuittanceValidee(false);
                      }}
                      placeholder="0000001"
                      className="quittance-input"
                      inputMode="numeric"
                      style={{
                        flex: 1,
                        borderColor: quittance && quittance !== '' ? '#27ae60' : '#ddd',
                        borderWidth: quittance && quittance !== '' ? '2px' : '1px',
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        fontSize: '16px',
                        textAlign: 'center',
                      }}
                    />
                    <button type="button" className="btn-quittance-menu"
                      onClick={() => setShowQuittanceMenu(!showQuittanceMenu)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '42px', height: '42px',
                        backgroundColor: showQuittanceMenu ? '#2c7be5' : '#f1f5f9',
                        color: showQuittanceMenu ? '#ffffff' : '#475569',
                        border: '1px solid #e2e8f0', borderRadius: '6px',
                        cursor: 'pointer', flexShrink: 0,
                      }}>
                      {isSavingQuittance ? <Clock size={18} className="oa-spin" /> : <MoreVertical size={18} />}
                    </button>

                    {showQuittanceMenu && (
                      <div style={{
                        position: 'absolute', top: '46px', right: 0,
                        background: '#ffffff', border: '1px solid #e2e8f0',
                        borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        zIndex: 1000, minWidth: '240px', overflow: 'hidden',
                      }}>
                        <button type="button" onClick={handleEnregistrerQuittance}
                          disabled={isSavingQuittance || !quittance || quittance.trim() === ''}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%', padding: '12px 16px',
                            background: 'transparent', border: 'none',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: (!quittance || quittance.trim() === '') ? 'not-allowed' : 'pointer',
                            color: '#1e40af', fontSize: '14px', fontWeight: '500',
                            textAlign: 'left', opacity: (!quittance || quittance.trim() === '') ? 0.5 : 1,
                          }}>
                          <RefreshCw size={16} />
                          <span>{t('Enregistrer la quittance', 'Tehirizo ny taratasy', 'Save receipt')}</span>
                        </button>
                        <button type="button" onClick={handleVoirReference}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%', padding: '12px 16px',
                            background: 'transparent', border: 'none',
                            cursor: 'pointer', color: '#334155',
                            fontSize: '14px', fontWeight: '500', textAlign: 'left',
                          }}>
                          <Eye size={16} />
                          <span>{t('Voir la référence actuelle', 'Hijery ny références', 'View current reference')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="quittance-validation">
                  <label className="quittance-checkbox-label">
                    <input type="checkbox" checked={quittanceValidee}
                      onChange={(e) => {
                        if (!quittance || quittance === '') {
                          showToast(t('⚠️ Saisissez d\'abord un numéro', '⚠️ Ampidiro aloha', '⚠️ Enter a number first'), 'warning');
                          return;
                        }
                        setQuittanceValidee(e.target.checked);
                      }}
                      className="quittance-checkbox"
                      disabled={!quittance || quittance === ''}
                    />
                    <span>
                      {t('Je confirme le numéro de quittance', 'Hamarino ny laharana', 'I confirm the receipt number')}{' '}
                      : <strong>{quittance || '...'}</strong>
                    </span>
                  </label>

                  {quittanceValidee && quittance && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#2e7d32', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                      <CheckCircle size={16} color="#27ae60" />
                      <span>✅ {t('Quittance validée', 'Voamarina', 'Receipt validated')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="oa-section personne-recu-section">
              <h3 className="oa-section-title">
                <UserPlus size={18} /> {t('Personne qui reçoit', 'Mpandray', 'Receiver')} <span style={{ color: 'red' }}>*</span>
              </h3>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={personneRecu}
                  onChange={(e) => setPersonneRecu(e.target.value)}
                  placeholder={t('Nom complet de la personne qui reçoit le paiement', 'Anaran\'ny mpandray ny vola', 'Full name of the person receiving the payment')}
                  className="oa-personne-recu-input"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    fontSize: '15px',
                    borderColor: personneRecu.trim() ? '#27ae60' : '#ddd',
                    borderWidth: personneRecu.trim() ? '2px' : '1px',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fff',
                  }}
                />
                {personneRecu.trim() && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#2e7d32',
                    fontWeight: 500,
                  }}>
                    <CheckCircle size={14} color="#27ae60" />
                    <span>{t('Bénéficiaire', 'Mpandray', 'Beneficiary')} : <strong>{personneRecu}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  const getStepTitle = () => ({
    1: t('Étape 1 — Identification', 'Dingana 1', 'Step 1 — Identification'),
    2: t('Étape 2 — Représentant', 'Dingana 2', 'Step 2 — Representative'),
    3: t('Étape 3 — Paiement & Facture', 'Dingana 3', 'Step 3 — Payment & Invoice')
  }[currentStep] || `${t('Étape', 'Dingana', 'Step')} ${currentStep}`);

  // ============================================================
  // PAGE FINALE
  // ============================================================
  if (showFinalPage && finalData) {
    return (
      <div className="oa-container">
        <div className="oa-wrapper">
          <header className="oa-header" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' }}>
            <button className="oa-btn-back" onClick={handleTerminer}>
              <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
            </button>
            <div className="oa-header-title">
              <CheckCircle size={26} />
              <div>
                <h1>{t('Dossier finalisé', 'Vita ny rakitra', 'File finalized')}</h1>
                <p>{t('Générez les documents obligatoires ci-dessous', 'Hamorona ny rakitra ilaina', 'Generate the required documents below')}</p>
              </div>
            </div>
            <div className="oa-header-steps">
              <div className="oa-step-dot done"><CheckCircle size={14} /></div>
            </div>
          </header>

          <div className="oa-progress-bar">
            <div className="oa-progress-fill" style={{ width: '100%', background: '#27ae60' }} />
          </div>

          <div className="oa-step-header">
            <h2 style={{ color: '#1e8449' }}>
              <Sparkles size={20} style={{ marginRight: '8px' }} />
              {t('Documents obligatoires', 'Rakitra tsy maintsy atao', 'Required documents')}
            </h2>
          </div>

          <div className="oa-body">
            <div className="oa-section" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    {t('Usager', 'Mpanjifa', 'User')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                    {finalData.usager.denomination}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    {t('N° Dossier', 'Laharana rakitra', 'File N°')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                    {finalData.usager.numero_dossier_utilisateur}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    {t('Total payé', 'Total voaloa', 'Total paid')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                    {finalData.soitTotal.toLocaleString(locale)} Ar
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    {t('Type facture', 'Karazana faktiora', 'Invoice type')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                    {typeFactureDAFC}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                    {t('Quittance', 'Taratasy', 'Receipt')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                    N° {finalData.quittance}
                  </div>
                </div>
                {finalData.numFacture && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                      {t('N° Facture', 'Laharana faktiora', 'Invoice N°')}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#14532d' }}>
                      {finalData.numFacture}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div className={`oa-section ${factureGeneree ? 'oa-doc-done' : ''}`}
                onClick={factureGeneree ? undefined : handleGenerateFacture}
                style={{
                  cursor: factureGeneree ? 'not-allowed' : 'pointer',
                  textAlign: 'center', padding: '28px 20px',
                  background: factureGeneree ? '#e8f5e9' : '#fff',
                  border: factureGeneree ? '2px solid #27ae60' : '2px dashed #cbd5e1',
                  borderRadius: '14px', transition: 'all 0.2s ease',
                  opacity: isGeneratingFacture ? 0.6 : 1,
                }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: factureGeneree ? '#27ae60' : '#e8f0fe',
                  color: factureGeneree ? '#fff' : '#4A90D9',
                  marginBottom: '14px',
                }}>
                  {factureGeneree ? <Lock size={30} /> : <Receipt size={30} />}
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#1a1a2e' }}>
                  {t('Facture officielle', 'Faktiora ofisialy', 'Official invoice')}
                </h3>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {t('Type', 'Karazana', 'Type')} : {typeFactureDAFC}
                </p>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                  {factureGeneree
                    ? t('✅ Facture générée', '✅ Vita ny faktiora', '✅ Invoice generated')
                    : t('Cliquer pour générer la facture PDF', 'Tsindrio hamorona faktiora PDF', 'Click to generate PDF invoice')}
                </p>
                <button type="button" disabled={factureGeneree || isGeneratingFacture}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 22px', borderRadius: '8px', border: 'none',
                    fontWeight: 700, fontSize: '14px',
                    cursor: factureGeneree ? 'not-allowed' : 'pointer',
                    background: factureGeneree ? '#27ae60' : '#4A90D9',
                    color: '#fff', fontFamily: 'inherit',
                  }}>
                  {factureGeneree ? (
                    <><CheckCircle size={16} /> {t('Générée', 'Vita', 'Generated')}</>
                  ) : isGeneratingFacture ? (
                    <><Clock size={16} className="oa-spin" /> {t('Génération...', 'Famokarana...', 'Generating...')}</>
                  ) : (
                    <><FileSignature size={16} /> {t('Générer la facture', 'Hamorona faktiora', 'Generate invoice')}</>
                  )}
                </button>
              </div>

              <div className={`oa-section ${qrGenere ? 'oa-doc-done' : ''}`}
                onClick={handleGenerateQR}
                style={{
                  cursor: 'pointer', textAlign: 'center', padding: '28px 20px',
                  background: qrGenere ? '#e8f5e9' : '#fff',
                  border: qrGenere ? '2px solid #27ae60' : '2px dashed #cbd5e1',
                  borderRadius: '14px', transition: 'all 0.2s ease',
                  opacity: isGeneratingQr ? 0.6 : 1,
                }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: qrGenere ? '#27ae60' : '#e8f0fe',
                  color: qrGenere ? '#fff' : '#4A90D9',
                  marginBottom: '14px',
                }}>
                  {qrGenere ? <Lock size={30} /> : <QrCode size={30} />}
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#1a1a2e' }}>
                  {t('QR Code sécurisé', 'QR Code azo antoka', 'Secure QR Code')}
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                  {qrGenere
                    ? t('✅ QR Code généré — cliquez pour revoir', '✅ Vita ny QR Code', '✅ QR Code generated — click to view')
                    : t('Cliquer pour générer le QR Code', 'Tsindrio hamorona QR Code', 'Click to generate QR Code')}
                </p>
                <button type="button" disabled={isGeneratingQr}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 22px', borderRadius: '8px', border: 'none',
                    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    background: qrGenere ? '#27ae60' : '#4A90D9',
                    color: '#fff', fontFamily: 'inherit',
                  }}>
                  {qrGenere ? (
                    <><QrCode size={16} /> {t('Voir le QR', 'Hijery QR', 'View QR')}</>
                  ) : isGeneratingQr ? (
                    <><Clock size={16} className="oa-spin" /> {t('Génération...', 'Famokarana...', 'Generating...')}</>
                  ) : (
                    <><QrCode size={16} /> {t('Générer le QR Code', 'Hamorona QR Code', 'Generate QR Code')}</>
                  )}
                </button>
              </div>
            </div>

            {!allDocsGenerated && (
              <div style={{
                marginTop: '12px', padding: '12px 16px',
                background: '#fff8e1', border: '1px solid #f39c12',
                borderRadius: '8px', display: 'flex',
                alignItems: 'center', gap: '10px',
                fontSize: '13px', color: '#7a5c00'
              }}>
                <AlertCircle size={18} color="#f39c12" />
                <span>
                  {t('Veuillez générer tous les documents obligatoires. Restant :',
                     'Hamorona ny rakitra ilaina. Sisa :',
                     'Please generate all required documents. Remaining:')}
                  {!factureGeneree && ` ${t('Facture', 'Faktiora', 'Invoice')},`}
                  {!qrGenere && ` QR Code,`}
                </span>
              </div>
            )}
          </div>

          <div className="oa-footer">
            <button type="button" className="oa-btn-secondary" onClick={handleTerminer}>
              <X size={16} /> {t('Annuler', 'Foanana', 'Cancel')}
            </button>
            <div className="oa-footer-right">
              <button type="button" className="oa-btn-primary"
                onClick={handleTerminer}
                disabled={!allDocsGenerated}
                style={{
                  background: allDocsGenerated ? '#27ae60' : '#94a3b8',
                  cursor: allDocsGenerated ? 'pointer' : 'not-allowed',
                  opacity: allDocsGenerated ? 1 : 0.7,
                }}>
                <CheckCircle size={16} /> {t('Terminer', 'Vita', 'Finish')}
              </button>
            </div>
          </div>
        </div>

        {showQrModal && qrGenere && (
          <div
            className="modal-overlay qr-modal-overlay"
            onClick={handleCloseQrModal}
          >
            <div className="modal-content qr-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header qr-modal-header">
                <h3><QrCode size={20} /> QR Code OMDA</h3>
                <button
                  type="button"
                  className={`modal-close ${!qrDownloaded ? 'qr-close-disabled' : ''}`}
                  onClick={handleCloseQrModal}
                  disabled={!qrDownloaded}
                  title={!qrDownloaded ? t('Téléchargez d\'abord le QR Code', 'Alao aloha ny QR Code', 'Download QR Code first') : ''}
                >
                  ×
                </button>
              </div>

              <div className="qr-body">
                <div className="qr-preview-container" ref={qrRef}>
                  <div className="qr-code-wrapper-only">
                    <div className="qr-red-border">
                      <div className="qr-code-container">
                        <QRCodeCanvas 
                          value={generateQRTextContent()} 
                          size={240} 
                          bgColor="#ffffff" 
                          fgColor="#dc2626" 
                          level="L" 
                          includeMargin={true} 
                        />
                        <div className="qr-logo-styled">
                          <div className="qr-logo-circle">
                            <img src="/logoqr.ico" alt="OMDA" className="qr-logo-img" />
                          </div>
                        </div>
                      </div>
                      <div className="qr-omda-footer">
                        OFFICE MALAGASY DU <br /> DROIT D'AUTEUR
                      </div>
                    </div>
                  </div>
                </div>

                <div className="qr-data-preview">
                  <p className="qr-data-title">📋 {t('Contenu', 'Votoatiny', 'Content')} :</p>
                  <div className="qr-data-content">
                    {generateQRTextContent().split('\n').map((line, index) => {
                      if (!line.trim()) return null;
                      if (line.toLowerCase().includes('artistes') || line.toLowerCase().includes('mpihira')) {
                        return <div key={index} className="qr-artist-line"><strong>{line}</strong></div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                </div>

                {!qrDownloaded && (
                  <div className="qr-download-required-hint">
                    <AlertCircle size={16} color="#f39c12" />
                    <span>
                      {t(
                        'Le téléchargement du QR Code est obligatoire avant de fermer.',
                        'Tsy maintsy alaina aloha ny QR Code vao hidio.',
                        'Downloading the QR Code is mandatory before closing.'
                      )}
                    </span>
                  </div>
                )}

                <div className="qr-actions-only">
                  <button
                    type="button"
                    className={`btn-cancel ${!qrDownloaded ? 'qr-close-disabled' : ''}`}
                    onClick={handleCloseQrModal}
                    disabled={!qrDownloaded}
                    title={!qrDownloaded ? t('Téléchargez d\'abord le QR Code', 'Alao aloha ny QR Code', 'Download QR Code first') : ''}
                  >
                    {t('Fermer', 'Hidio', 'Close')}
                  </button>
                  <button type="button" className="btn-download-qr-only" onClick={handleDownloadQR} disabled={isDownloadingQr}>
                    {isDownloadingQr
                      ? <>{t('Téléchargement...', 'Maka...', 'Downloading...')}</>
                      : <><Download size={18} /> {t('Télécharger', 'Alaina', 'Download')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="oa-container">
      <div className="oa-wrapper">
        <header className="oa-header">
          <button className="oa-btn-back" onClick={() => navigate('/gere-payer')}>
            <ArrowLeft size={18} /> {t('Retour', 'Hiverina', 'Back')}
          </button>
          <div className="oa-header-title">
            <Package size={24} />
            <div>
              <h1>{t("Ajout d'usager événementiel", 'Fanampiana mpanjifa', 'Add event user')}</h1>
              <p>{t('CD, MP3, œuvres web, hologrammes...', 'CD, MP3, asa an-tserasera...', 'CD, MP3, web works...')}</p>
            </div>
          </div>
          <div className="oa-header-steps">
            {[1, 2, 3].map(s => (
              <div key={s} className={`oa-step-dot ${currentStep === s ? 'active' : ''} ${currentStep > s ? 'done' : ''}`}>
                {currentStep > s ? <CheckCircle size={14} /> : s}
              </div>
            ))}
          </div>
        </header>

        <div className="oa-progress-bar">
          <div className="oa-progress-fill" style={{ width: `${(currentStep / 3) * 100}%` }} />
        </div>

        <div className="oa-step-header">
          <h2>{getStepTitle()}</h2>
        </div>

        <div className="oa-body">
          {renderCurrentStep()}
        </div>

        <div className="oa-footer">
          <button type="button" className="oa-btn-secondary" onClick={() => navigate('/gere-payer')}>
            <X size={16} /> {t('Annuler', 'Foanana', 'Cancel')}
          </button>
          <div className="oa-footer-right">
            {currentStep > 1 && (
              <button type="button" className="oa-btn-secondary" onClick={handlePrev}>
                <ArrowLeft size={16} /> {t('Précédent', 'Teo aloha', 'Previous')}
              </button>
            )}
            <button type="button" className="oa-btn-primary" onClick={handleNext}
              disabled={isSubmitting}>
              {currentStep === 3
                ? <><Save size={16} /> {t('Valider', 'Manamarina', 'Validate')}</>
                : <>{t('Suivant', 'Manaraka', 'Next')} <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="oa-modal-overlay" onClick={() => !isSaving && setShowConfirmModal(false)}>
          <div className="oa-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="oa-modal-header">
              <h2>
                {savingResult ? (
                  savingResult.success
                    ? <><CheckCircle size={22} /> {t('Succès', 'Fahombiazana', 'Success')}</>
                    : <><X size={22} /> {t('Erreur', 'Olana', 'Error')}</>
                ) : (
                  <><Info size={22} /> {t('Confirmation', 'Fanamarinana', 'Confirmation')}</>
                )}
              </h2>
              {!isSaving && (
                <button className="oa-modal-close" onClick={() => setShowConfirmModal(false)}>
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="oa-modal-body">
              {!savingResult && !isSaving && (
                <>
                  <p className="oa-confirm-text">{t('Confirmez-vous ?', 'Manamarina ve ianao ?', 'Do you confirm?')}</p>
                  <ul className="oa-confirm-list">
                    <li><CheckCircle size={16} color="#27ae60" /> <strong>{t("Création de l'usager + paiement + facture + quittance", 'Famoronana + fandoavana + faktiora + taratasy', 'Create user + payment + invoice + receipt')}</strong></li>
                  </ul>
                  <div className="oa-confirm-summary">
                    <div><span>{t('Usager', 'Mpanjifa', 'User')} :</span> <strong>{identification.denomination}</strong></div>
                    <div><span>{t('Région', 'Faritra', 'Region')} :</span> <strong>{selectedRegion || '-'}</strong></div>
                    <div><span>{t('Ville', 'Tanàna', 'City')} :</span> <strong>{selectedVille || '-'}</strong></div>
                    {selectedQuartier && <div><span>{t('Quartier', 'Fokontany', 'Neighborhood')} :</span> <strong>{selectedQuartier}</strong></div>}
                    <div><span>{t('Type facture', 'Karazana faktiora', 'Invoice type')} :</span> <strong>{typeFactureDAFC}</strong></div>
                    <div><span>{t('Mode', 'Fomba', 'Mode')} :</span> <strong>{modePaiement === 'mensuel' ? t('Mensuel', 'Isam-bolana', 'Monthly') : t('Unique', 'Indray mandeha', 'One-time')}</strong></div>
                    {modePaiement === 'mensuel' && (
                      <div>
                        <span>{t('Mois', 'Volana', 'Months')} ({moisPaiement.length}) :</span>{' '}
                        <strong>{moisPaiement.map(m => moisLabelsShort[m - 1]).join(', ')}</strong>
                      </div>
                    )}
                    <div><span>{t('Quittance', 'Taratasy', 'Receipt')} :</span> <strong>{quittance}</strong></div>
                    <div><span>{t('Total', 'Total', 'Total')} :</span> <strong className="oa-total-strong">{formatNumber(getTotalGeneral())} Ar</strong></div>
                  </div>
                </>
              )}

              {isSaving && (
                <div className="oa-saving">
                  <Clock size={48} className="oa-spin" />
                  <p>{t('Enregistrement...', 'Mitahiry...', 'Saving...')}</p>
                </div>
              )}

              {savingResult && savingResult.success && (
                <div className="oa-success">
                  <CheckCircle size={56} color="#27ae60" />
                  <h3>{t('Enregistrement réussi !', 'Vita !', 'Success!')}</h3>
                  <p>{t('Redirection vers la page des documents...', 'Mankany amin\'ny rakitra...', 'Redirecting to documents...')}</p>
                </div>
              )}

              {savingResult && !savingResult.success && (
                <div className="oa-error">
                  <X size={56} color="#e74c3c" />
                  <h3>{t('Erreur', 'Olana', 'Error')}</h3>
                  <p>{savingResult.message}</p>
                </div>
              )}
            </div>

            <div className="oa-modal-footer">
              {!savingResult && !isSaving && (
                <>
                  <button className="oa-btn-secondary" onClick={() => setShowConfirmModal(false)}>
                    {t('Annuler', 'Foanana', 'Cancel')}
                  </button>
                  <button className="oa-btn-primary" onClick={handleConfirmSave}>
                    <Save size={16} /> {t('Confirmer', 'Manamarina', 'Confirm')}
                  </button>
                </>
              )}
              {savingResult && !savingResult.success && (
                <button className="oa-btn-secondary" onClick={() => setSavingResult(null)}>
                  {t('Réessayer', 'Andramo indray', 'Retry')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showReferenceModal && referenceInfo && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px',
        }} onClick={() => setShowReferenceModal(false)}>
          <div style={{
            background: '#FFFFFF', color: '#000000', borderRadius: '12px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '18px 22px', borderBottom: '1px solid #BAE6FD',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FFFFFF',
            }}>
              <h3 style={{
                margin: 0, fontSize: '17px',
                display: 'flex', alignItems: 'center', gap: '8px',
                color: '#000000', fontWeight: '700',
              }}>
                <FileCheck size={18} color="#000000" />
                <span>{t('Référence Quittance', 'Référence taratasy', 'Receipt reference')}</span>
              </h3>
              <button onClick={() => setShowReferenceModal(false)}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '4px', color: '#000000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <X size={20} color="#000000" />
              </button>
            </div>

            <div style={{ padding: '22px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '18px', background: '#FFFFFF',
                  borderRadius: '10px', border: '2px solid #BAE6FD',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '12px', color: '#000000',
                    marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px',
                  }}>
                    {t('PROCHAIN NUMÉRO', 'LAHARANA MANARAKA', 'NEXT NUMBER')}
                  </div>
                  <div style={{
                    fontSize: '32px', fontWeight: 'bold',
                    color: '#000000', fontFamily: 'monospace', letterSpacing: '3px',
                  }}>
                    {referenceInfo.prochainNumero}
                  </div>
                </div>

                <div style={{
                  padding: '12px', background: '#FFFFFF',
                  borderRadius: '8px', border: '1px solid #BAE6FD',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '11px', color: '#000000',
                    marginBottom: '2px', fontWeight: '700',
                  }}>
                    {t('DERNIER NUMÉRO', 'LAHARANA FARANY', 'LAST NUMBER')}
                  </div>
                  <div style={{
                    fontSize: '20px', fontWeight: 'bold',
                    color: '#000000', fontFamily: 'monospace',
                  }}>
                    {referenceInfo.dernierNumeroFormate}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '14px 22px', background: '#FFFFFF',
              borderTop: '1px solid #BAE6FD',
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <button onClick={() => setShowReferenceModal(false)}
                style={{
                  padding: '10px 20px', background: '#FFFFFF',
                  color: '#000000', border: '2px solid #BAE6FD',
                  borderRadius: '8px', fontSize: '14px',
                  fontWeight: '600', cursor: 'pointer',
                }}>
                {t('Fermer', 'Hidio', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            minWidth: '320px',
            maxWidth: '480px',
            padding: '14px 18px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'inherit',
            backgroundColor:
              toast.type === 'success' ? '#e8f5e9' :
              toast.type === 'error' ? '#ffebee' :
              toast.type === 'warning' ? '#fff8e1' :
              '#e3f2fd',
            color:
              toast.type === 'success' ? '#1b5e20' :
              toast.type === 'error' ? '#b71c1c' :
              toast.type === 'warning' ? '#e65100' :
              '#0d47a1',
            border: `2px solid ${
              toast.type === 'success' ? '#4caf50' :
              toast.type === 'error' ? '#f44336' :
              toast.type === 'warning' ? '#ff9800' :
              '#2196f3'
            }`,
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          {toast.type === 'success' && <CheckCircle size={20} color="#4caf50" />}
          {toast.type === 'error' && <X size={20} color="#f44336" />}
          {toast.type === 'warning' && <AlertCircle size={20} color="#ff9800" />}
          {toast.type === 'info' && <Info size={20} color="#2196f3" />}
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default OtherAjout;