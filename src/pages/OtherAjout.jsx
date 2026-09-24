// src/pages/OtherAjout.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, X, Users, User, Phone, Mail,
  MapPin, Calendar, CreditCard, DollarSign, Clock, FileText,
  CheckCircle, Info, Hash, Disc, Music, Globe, Sparkles, Video,
  Package, Repeat, CalendarCheck, Building2, Plus, Trash2,
  PlusCircle, ListOrdered, FileCheck, UserPlus
} from 'lucide-react';
import '../styles/other-ajout.css';
import { useT } from '../hooks/useT';

const TYPES_USAGERS_META = [
  { id: 'cd',         icon: Disc,     color: '#3498db' },
  { id: 'mp3',        icon: Music,    color: '#9b59b6' },
  { id: 'oeuvre-web', icon: Globe,    color: '#2ecc71' },
  { id: 'hologramme', icon: Sparkles, color: '#e67e22' },
  { id: 'video',      icon: Video,    color: '#e74c3c' },
  { id: 'autre',      icon: Package,  color: '#7f8c8d' }
];

const MODES_PAIEMENT_META = [
  { id: 'mensuel', icon: Repeat },
  { id: 'unique',  icon: CalendarCheck }
];

const emptyLigne = () => ({
  description: '',
  uniter: 1,
  pu: ''
});

const OtherAjout = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

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

  const TYPES_USAGERS = useMemo(() => [
    { id: 'cd',         label: t('CD', 'CD', 'CD'),                                              icon: Disc,     color: '#3498db' },
    { id: 'mp3',        label: 'MP3',                                                            icon: Music,    color: '#9b59b6' },
    { id: 'oeuvre-web', label: t('Œuvre Web', 'Asa an-tserasera', 'Web Work'),                   icon: Globe,    color: '#2ecc71' },
    { id: 'hologramme', label: t('Hologramme', 'Holograma', 'Hologram'),                         icon: Sparkles, color: '#e67e22' },
    { id: 'video',      label: t('Vidéo', 'Horonan-tsary', 'Video'),                             icon: Video,    color: '#e74c3c' },
    { id: 'autre',      label: t('Autre', 'Hafa', 'Other'),                                      icon: Package,  color: '#7f8c8d' }
  ], [t]);

  const MODES_PAIEMENT = useMemo(() => [
    { id: 'mensuel', label: t('Paiement mensuel', 'Fandoavana isam-bolana', 'Monthly payment'),  icon: Repeat },
    { id: 'unique',  label: t('Paiement unique', 'Fandoavana indray mandeha', 'One-time payment'), icon: CalendarCheck }
  ], [t]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [regionsList, setRegionsList] = useState([]);
  const [newRegion, setNewRegion] = useState('');
  const [newRegionPhone, setNewRegionPhone] = useState('');
  const [showAddRegion, setShowAddRegion] = useState(false);

  const [typeUsager, setTypeUsager] = useState('');
  const [identification, setIdentification] = useState({
    denomination: '',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    region: ''
  });

  const [representant, setRepresentant] = useState({
    representantPar: '',
    cin: '',
    cinDelivree: '',
    cinLieu: '',
    contact: ''
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

  const [quittanceInfo, setQuittanceInfo] = useState({ last: 0, next: '0000001' });
  const [personneRecu, setPersonneRecu] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savingResult, setSavingResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const getMontantLigne = (ligne) => {
    return parseNumber(ligne.pu) * (parseInt(ligne.uniter) || 1);
  };

  const getTotalLignes = () => {
    return lignes.reduce((acc, l) => acc + getMontantLigne(l), 0);
  };

  const getTotalGeneral = () => {
    const totalLignes = getTotalLignes();
    const frais = fraisDossierActif ? parseNumber(fraisDossierMontant) : 0;
    const retard = isRetard ? parseNumber(montantRetard) : 0;
    return totalLignes + frais + retard;
  };

  const getOnlyNumbers = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  const toggleMois = (mois) => {
    setMoisPaiement(prev =>
      prev.includes(mois)
        ? prev.filter(m => m !== mois)
        : [...prev, mois].sort((a, b) => a - b)
    );
  };

  const toggleTousMois = () => {
    if (moisPaiement.length === 12) {
      setMoisPaiement([]);
    } else {
      setMoisPaiement([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  };

  // ============================================================
  // GESTION DES LIGNES
  // ============================================================
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

  // ============================================================
  // RÉGIONS
  // ============================================================
  const loadRegions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/regions');
      const result = await response.json();
      if (result.success) setRegionsList(result.regions);
    } catch (error) {
      console.error('Erreur chargement régions:', error);
    }
  };

  const loadQuittance = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/other-usagers/quittance/last');
      const data = await res.json();
      if (data.success) {
        setQuittanceInfo({
          last: data.lastQuittance || 0,
          next: data.nextQuittance || '0000001',
          nextNumber: data.nextQuittanceNumber || 1
        });
      }
    } catch (err) {
      console.error('Erreur quittance:', err);
    }
  };

  useEffect(() => {
    loadRegions();
    loadQuittance();
  }, []);

  const handleAddRegion = async () => {
    const trimmed = newRegion.trim();
    if (!trimmed) {
      alert(t('Veuillez saisir un nom de région', 'Ampidiro ny anaran\'ny faritra', 'Please enter a region name'));
      return;
    }
    if (regionsList.some(r => r.nom === trimmed)) {
      alert(t('Cette région existe déjà', 'Efa misy io faritra io', 'This region already exists'));
      return;
    }

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      alert(t('Token administrateur manquant', 'Tsy misy ny token admin', 'Missing admin token'));
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'adminToken': adminToken },
        body: JSON.stringify({ nom: trimmed, telephone: newRegionPhone.trim() || null })
      });
      const result = await response.json();
      if (result.success) {
        setRegionsList([...regionsList, result.region]);
        setNewRegion('');
        setNewRegionPhone('');
        setShowAddRegion(false);
        alert(t(`✅ Région "${trimmed}" ajoutée !`, `✅ Voapetraka ny faritra "${trimmed}" !`, `✅ Region "${trimmed}" added!`));
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'));
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
  };

  const handleIdentificationChange = (field, value) => {
    setIdentification(prev => ({ ...prev, [field]: value }));
  };
  const handleRepresentantChange = (field, value) => {
    setRepresentant(prev => ({ ...prev, [field]: value }));
  };

  // ============================================================
  // NAVIGATION
  // ============================================================
  const handleNext = () => {
    if (currentStep === 1) {
      if (!typeUsager) {
        alert(t("Veuillez sélectionner un type d'usager", 'Misafidiana karazana mpanjifa', 'Please select a user type'));
        return;
      }
      if (!identification.denomination) {
        alert(t('Veuillez saisir la dénomination', 'Ampidiro ny anarana', 'Please enter the name'));
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!representant.representantPar) {
        alert(t('Veuillez saisir le nom du représentant', 'Ampidiro ny anaran\'ny mpisolo tena', 'Please enter the representative name'));
        return;
      }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!modePaiement) {
        alert(t('Veuillez choisir un mode de paiement', 'Misafidiana fomba fandoavana', 'Please choose a payment method'));
        return;
      }
      if (lignes.length === 0) {
        alert(t('Ajoutez au moins une ligne', 'Ampio tsipika iray farafahakeliny', 'Add at least one line'));
        return;
      }
      const allFilled = lignes.every(l => l.description.trim() !== '' && l.pu !== '');
      if (!allFilled) {
        alert(t('Veuillez remplir toutes les lignes (description et P.U.)', 'Fenoy ny tsipika rehetra (fanazavana sy P.U.)', 'Please fill all lines (description and unit price)'));
        return;
      }
      if (modePaiement === 'mensuel' && moisPaiement.length === 0) {
        alert(t(
          '⚠️ Veuillez sélectionner au moins un mois',
          '⚠️ Misafidiana volana iray farafahakeliny',
          '⚠️ Please select at least one month'
        ));
        return;
      }
      if (!personneRecu || personneRecu.trim() === '') {
        alert(t('⚠️ OBLIGATOIRE : Saisissez le nom de la personne qui reçoit', '⚠️ TSY AZO IHODIVIRANA : Ampidiro ny anaran\'ny mpandray', '⚠️ MANDATORY: Enter the receiver name'));
        return;
      }
      setSavingResult(null);
      setShowConfirmModal(true);
      return;
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ============================================================
  // ✅ CONFIRMATION + ENREGISTREMENT (SYNCHRONISÉ avec PaiementMensuel)
  // ============================================================
  const handleConfirmSave = async () => {
    setIsSaving(true);
    const currentUser = (() => {
      try { return JSON.parse(localStorage.getItem('user') || '{}'); }
      catch { return {}; }
    })();

    try {
      // ==========================================================
      // ✅ Préparer les mois (triés) AVANT tout appel
      // ==========================================================
      const moisPayesArray = modePaiement === 'mensuel'
        ? [...moisPaiement].sort((a, b) => a - b)
        : null;

      // ==========================================================
      // ✅ APPEL 1 : Créer l'usager + les lignes de facture
      // ==========================================================
      const payloadUsager = {
        type: typeUsager,
        identification,
        representant,
        paiement: {
          mode: modePaiement,
          frais_dossier_actif: fraisDossierActif,
          frais_dossier: fraisDossierActif ? parseNumber(fraisDossierMontant) : 0,
          is_retard: isRetard,
          montant_retard: isRetard ? parseNumber(montantRetard) : 0,
          lignes: lignes.map(l => ({
            description: l.description,
            uniter: parseInt(l.uniter) || 1,
            pu: parseNumber(l.pu)
          }))
        },
        userId: currentUser.id || null,
        quittance: quittanceInfo.next,
        personneRecu
      };

      console.log('📦 Payload usager envoyé:', JSON.stringify(payloadUsager, null, 2));

      const responseUsager = await fetch('http://localhost:3001/api/other-usagers/creer-complet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadUsager)
      });

      const dataUsager = await responseUsager.json();

      if (!dataUsager.success) {
        setSavingResult({
          success: false,
          message: dataUsager.message || 'Erreur lors de la création de l\'usager'
        });
        setIsSaving(false);
        return;
      }

      const usagerOtherId = dataUsager.usagerOtherId;
      const soitTotal = dataUsager.soitTotal;

      // ==========================================================
      // ✅ APPEL 2 : Enregistrer le paiement (MÊME ROUTE que les autres types)
      // ==========================================================
      const token = localStorage.getItem('adminToken') || '';

      const payloadPaiement = {
        usagerId: usagerOtherId,
        usagerType: 'other',
        type_paiement: modePaiement === 'mensuel' ? 'mensuel' : 'unique',
        montant: soitTotal,
        date_paiement: new Date().toISOString().split('T')[0],
        frais_dossier: dataUsager.fraisDossier || 0,
        montant_retard: dataUsager.montantRetard || 0,
        est_retard: isRetard,
        reference: `OTHER-${usagerOtherId}-${anneePaiement}`,
        statut: 'paye'
      };

      // ✅ Ajouter les champs mois_payes pour mode mensuel (comme PaiementMensuel)
      if (modePaiement === 'mensuel' && moisPayesArray && moisPayesArray.length > 0) {
        payloadPaiement.annee = anneePaiement;
        payloadPaiement.mois = moisPayesArray[0];                 // ← Premier mois
        payloadPaiement.mois_payes = moisPayesArray;              // ← Tableau [1,2,3]
        payloadPaiement.nombre_mois = moisPayesArray.length;      // ← 3
      }

      console.log('📦 Payload paiement envoyé:', JSON.stringify(payloadPaiement, null, 2));

      const responsePaiement = await fetch('http://localhost:3001/api/paiements/enregistrer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: token
        },
        body: JSON.stringify(payloadPaiement)
      });

      const dataPaiement = await responsePaiement.json();

      if (!dataPaiement.success) {
        setSavingResult({
          success: false,
          message: dataPaiement.message || 'Erreur lors de l\'enregistrement du paiement'
        });
        setIsSaving(false);
        return;
      }

      // ==========================================================
      // ✅ SUCCÈS
      // ==========================================================
      await loadQuittance();

      const finalResult = {
        success: true,
        usagerOtherId,
        soitTotal,
        quittance: quittanceInfo.next,
        modePaiement,
        moisPaiement: moisPayesArray,
        numFacture: `OTH-${usagerOtherId}`,
      };

      setSavingResult(finalResult);

      // ✅ Génération PDF
      try {
        const { generateFactureOtherPDF } = await import('./pdf/facture_other');
        await generateFactureOtherPDF({
          ref_omda: usagerOtherId,
          num_facture: finalResult.numFacture,
          ref_client_type: 'OTH',
          ref_usager: usagerOtherId,
          type_facture: 'DAFC',
          denomination: identification.denomination,
          representant_nom: representant.representantPar,
          adresse: identification.adresse,
          telephone: identification.telephone,
          lignes: lignes.map(l => ({
            description: l.description,
            uniter: parseInt(l.uniter) || 1,
            pu: parseNumber(l.pu)
          })),
          frais_dossier: fraisDossierActif ? parseNumber(fraisDossierMontant) : 0,
          montant_retard: isRetard ? parseNumber(montantRetard) : 0,
          is_retard: isRetard,
          soit_total: soitTotal,
          personne_recu: personneRecu,
          quittance: quittanceInfo.next
        });
      } catch (pdfErr) {
        console.warn('⚠️ PDF non généré:', pdfErr);
      }

    } catch (error) {
      console.error('Erreur:', error);
      setSavingResult({
        success: false,
        message: t('Erreur de connexion au serveur', 'Nisy olana tamin\'ny fifandraisana tamin\'ny serveur', 'Server connection error')
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // RENDU ÉTAPE 1
  // ============================================================
  const renderStep1 = () => (
    <div className="oa-step-content">
      <div className="oa-section">
        <h3 className="oa-section-title">
          <Package size={18} /> {t("Type d'usager événementiel", 'Karazana mpanjifa hetsika', 'Event user type')}
        </h3>
        <div className="oa-types-grid">
          {TYPES_USAGERS.map(type => {
            const Icon = type.icon;
            const isActive = typeUsager === type.id;
            return (
              <button
                key={type.id}
                type="button"
                className={`oa-type-card ${isActive ? 'active' : ''}`}
                onClick={() => setTypeUsager(type.id)}
                style={isActive ? { borderColor: type.color, background: `${type.color}10` } : {}}
              >
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
            <input
              type="text"
              value={identification.denomination}
              onChange={(e) => handleIdentificationChange('denomination', e.target.value)}
              placeholder={t("Nom de l'entreprise / structure", "Anaran'ny orinasa / fikambanana", 'Company / organization name')}
            />
          </div>
          <div className="oa-form-group">
            <label><User size={14} /> {t('Nom', 'Anarana', 'Last name')}</label>
            <input
              type="text"
              value={identification.nom}
              onChange={(e) => handleIdentificationChange('nom', e.target.value)}
              placeholder={t('Nom', 'Anarana', 'Last name')}
            />
          </div>
          <div className="oa-form-group">
            <label><User size={14} /> {t('Prénom', 'Fanampin\'anarana', 'First name')}</label>
            <input
              type="text"
              value={identification.prenom}
              onChange={(e) => handleIdentificationChange('prenom', e.target.value)}
              placeholder={t('Prénom', 'Fanampin\'anarana', 'First name')}
            />
          </div>
          <div className="oa-form-group">
            <label><Phone size={14} /> {t('Téléphone', 'Finday', 'Phone')}</label>
            <input
              type="tel"
              value={identification.telephone}
              onChange={(e) => handleIdentificationChange('telephone', e.target.value)}
              placeholder="034 00 000 00"
            />
          </div>
          <div className="oa-form-group">
            <label><Mail size={14} /> Email</label>
            <input
              type="email"
              value={identification.email}
              onChange={(e) => handleIdentificationChange('email', e.target.value)}
              placeholder="email@exemple.com"
            />
          </div>
          <div className="oa-form-group oa-full">
            <label><MapPin size={14} /> {t('Adresse', 'Adiresy', 'Address')}</label>
            <input
              type="text"
              value={identification.adresse}
              onChange={(e) => handleIdentificationChange('adresse', e.target.value)}
              placeholder={t('Adresse complète', 'Adiresy feno', 'Full address')}
            />
          </div>

          <div className="oa-form-group oa-full">
            <label><MapPin size={14} /> {t('Région', 'Faritra', 'Region')}</label>
            <div className="oa-region-row">
              <select
                value={identification.region}
                onChange={(e) => handleIdentificationChange('region', e.target.value)}
                className="oa-region-select"
              >
                <option value="">{t('Sélectionner une région', 'Misafidiana faritra', 'Select a region')}</option>
                {regionsList.map((region) => {
                  const phone = region.telephone && region.telephone.trim() !== ''
                    ? formatPhoneNumber(region.telephone)
                    : null;
                  return (
                    <option key={region.id} value={region.nom}>
                      {region.nom} {phone ? `- ${phone}` : ''}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => setShowAddRegion(!showAddRegion)}
                className="oa-btn-add-region"
                title={t('Ajouter une région', 'Manampy faritra', 'Add a region')}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {showAddRegion && (
            <div className="oa-form-group oa-full">
              <div className="oa-add-region-box">
                <input
                  type="text"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder={t('Nom de la région', 'Anaran\'ny faritra', 'Region name')}
                />
                <input
                  type="text"
                  value={newRegionPhone}
                  onChange={(e) => setNewRegionPhone(e.target.value)}
                  placeholder={t('Téléphone (optionnel)', 'Finday (tsy voatery)', 'Phone (optional)')}
                />
                <button type="button" onClick={handleAddRegion} className="oa-btn-confirm-region">
                  {t('Ajouter', 'Ampio', 'Add')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDU ÉTAPE 2
  // ============================================================
  const renderStep2 = () => (
    <div className="oa-step-content">
      <div className="oa-info-banner">
        <Info size={16} />
        <span>
          {t('Usager', 'Mpanjifa', 'User')} : <strong>{identification.denomination || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="oa-section">
        <h3 className="oa-section-title">
          <User size={18} /> {t('Représentant légal', 'Mpisolo tena ara-dalàna', 'Legal representative')}
        </h3>
        <div className="oa-form-grid">
          <div className="oa-form-group oa-full">
            <label><User size={14} /> {t('Représenté par', 'Mpisolo tena', 'Represented by')} *</label>
            <input
              type="text"
              value={representant.representantPar}
              onChange={(e) => handleRepresentantChange('representantPar', e.target.value)}
              placeholder={t('Nom complet du représentant', 'Anarana feno ny mpisolo tena', 'Full name of representative')}
            />
          </div>
          <div className="oa-form-group">
            <label><CreditCard size={14} /> {t('Numéro CIN', 'Laharana CIN', 'CIN number')}</label>
            <input
              type="text"
              value={representant.cin}
              onChange={(e) => handleRepresentantChange('cin', e.target.value)}
              placeholder={t('Numéro de CIN', 'Laharana CIN', 'CIN number')}
            />
          </div>
          <div className="oa-form-group">
            <label><Calendar size={14} /> {t('Délivrée le', 'Nomena ny', 'Issued on')}</label>
            <input
              type="date"
              value={representant.cinDelivree}
              onChange={(e) => handleRepresentantChange('cinDelivree', e.target.value)}
            />
          </div>
          <div className="oa-form-group">
            <label><MapPin size={14} /> {t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')}</label>
            <input
              type="text"
              value={representant.cinLieu}
              onChange={(e) => handleRepresentantChange('cinLieu', e.target.value)}
              placeholder={t('Lieu', 'Toerana', 'Place')}
            />
          </div>
          <div className="oa-form-group">
            <label><Phone size={14} /> {t('Contact', 'Fifandraisana', 'Contact')}</label>
            <input
              type="tel"
              value={representant.contact}
              onChange={(e) => handleRepresentantChange('contact', e.target.value)}
              placeholder="034 00 000 00"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDU ÉTAPE 3
  // ============================================================
  const renderStep3 = () => {
    const total = getTotalGeneral();
    const moisHaut = [1, 2, 3, 4, 5, 6];
    const moisBas = [7, 8, 9, 10, 11, 12];
    const tousSelectionnes = moisPaiement.length === 12;

    return (
      <div className="oa-step-content">
        <div className="oa-section">
          <h3 className="oa-section-title">
            <DollarSign size={18} /> {t('Mode de paiement', 'Fomba fandoavana', 'Payment method')}
          </h3>
          <div className="oa-modes-grid">
            {MODES_PAIEMENT.map(mode => {
              const Icon = mode.icon;
              const isActive = modePaiement === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`oa-mode-card ${isActive ? 'active' : ''}`}
                  onClick={() => setModePaiement(mode.id)}
                >
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

                <div style={{
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ fontWeight: 600 }}>
                    {t('Année', 'Taona', 'Year')} :
                  </label>
                  <select
                    value={anneePaiement}
                    onChange={(e) => setAnneePaiement(parseInt(e.target.value))}
                    className="oa-region-select"
                    style={{ maxWidth: '150px' }}
                  >
                    {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={toggleTousMois}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #3498db',
                      background: tousSelectionnes ? '#3498db' : '#fff',
                      color: tousSelectionnes ? '#fff' : '#3498db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px'
                    }}
                  >
                    {tousSelectionnes
                      ? t('Tout désélectionner', 'Esory ny safidy rehetra', 'Deselect all')
                      : t('Tout sélectionner', 'Safidio ny rehetra', 'Select all')}
                  </button>
                </div>

                <div className="oa-mois-grid-2-lignes">
                  <div className="oa-mois-grid-ligne">
                    {moisHaut.map(m => {
                      const isSelected = moisPaiement.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`oa-mois-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleMois(m)}
                          style={{
                            padding: '12px',
                            border: isSelected ? '2px solid #3498db' : '1px solid #ddd',
                            background: isSelected ? '#e8f4ff' : '#fff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#2980b9' : '#333',
                            transition: 'all 0.2s',
                          }}
                        >
                          {moisLabels[m - 1]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="oa-mois-grid-ligne">
                    {moisBas.map(m => {
                      const isSelected = moisPaiement.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`oa-mois-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleMois(m)}
                          style={{
                            padding: '12px',
                            border: isSelected ? '2px solid #3498db' : '1px solid #ddd',
                            background: isSelected ? '#e8f4ff' : '#fff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#2980b9' : '#333',
                            transition: 'all 0.2s',
                          }}
                        >
                          {moisLabels[m - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px', color: '#555' }}>
                  <strong>{moisPaiement.length}</strong> {t('mois sélectionné(s)', 'volana voafidy', 'month(s) selected')}
                  {moisPaiement.length > 0 && (
                    <span> ({moisPaiement.map(m => moisLabelsShort[m - 1]).join(', ')})</span>
                  )}
                </div>
              </div>
            )}

            <div className="oa-section">
              <h3 className="oa-section-title">
                <ListOrdered size={18} /> {t('Nombre de lignes de facture', 'Isan\'ny tsipika faktiora', 'Number of invoice lines')}
              </h3>
              <div className="oa-lines-control">
                <label>{t('Nombre de lignes', 'Isan\'ny tsipika', 'Number of lines')} :</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={lignes.length}
                  onChange={(e) => setNombreLignes(e.target.value)}
                  className="oa-input-lines-count"
                />
                <button type="button" className="oa-btn-add-line" onClick={addLigne}>
                  <Plus size={14} /> {t('Ajouter une ligne', 'Manampy tsipika', 'Add a line')}
                </button>
                <span className="oa-lines-hint">
                  {t(
                    '(Ajoutez autant de descriptions que nécessaire : WEB, CD, USB, MANOVA...)',
                    '(Ampio fanazavana araka izay ilaina : WEB, CD, USB, MANOVA...)',
                    '(Add as many descriptions as needed: WEB, CD, USB, MANOVA...)'
                  )}
                </span>
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
                            <input
                              type="text"
                              value={ligne.description}
                              onChange={(e) => handleLigneChange(index, 'description', e.target.value)}
                              placeholder={t('Ex: RAKOTONAIVO, WEB, CD, USB...', 'Ohatra: RAKOTONAIVO, WEB, CD, USB...', 'Ex: RAKOTONAIVO, WEB, CD, USB...')}
                              className="oa-input-cell"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={ligne.uniter}
                              onChange={(e) => handleLigneChange(index, 'uniter', e.target.value)}
                              className="oa-input-cell oa-input-small"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={formatNumber(ligne.pu)}
                              onChange={(e) => handleLigneChange(index, 'pu', e.target.value)}
                              placeholder="0"
                              className="oa-input-cell"
                            />
                          </td>
                          <td className="oa-cell-montant">
                            {formatNumber(montant)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="oa-btn-remove-line"
                              onClick={() => removeLigne(index)}
                              disabled={lignes.length <= 1}
                              title={t('Supprimer cette ligne', 'Esory io tsipika io', 'Delete this line')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="oa-row-frais">
                      <td>
                        <label className="oa-frais-label-inline">
                          <input
                            type="checkbox"
                            checked={fraisDossierActif}
                            onChange={(e) => {
                              setFraisDossierActif(e.target.checked);
                              if (!e.target.checked) setFraisDossierMontant('');
                            }}
                          />
                          <span>{t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</span>
                        </label>
                      </td>
                      <td>
                        <input
                          type="number"
                          value="1"
                          readOnly
                          className="oa-input-cell oa-input-small oa-input-readonly"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={formatNumber(fraisDossierMontant)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\s/g, '');
                            if (raw === '' || /^\d+$/.test(raw)) {
                              setFraisDossierMontant(raw);
                            }
                          }}
                          placeholder="0"
                          disabled={!fraisDossierActif}
                          className="oa-input-cell"
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
                          <input
                            type="text"
                            value={t('Pénalité de retard', 'Sazy noho ny fahatarana', 'Late penalty')}
                            readOnly
                            className="oa-input-cell oa-input-readonly"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value="1"
                            readOnly
                            className="oa-input-cell oa-input-small oa-input-readonly"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={formatNumber(montantRetard)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\s/g, '');
                              if (raw === '' || /^\d+$/.test(raw)) setMontantRetard(raw);
                            }}
                            placeholder="0"
                            className="oa-input-cell"
                          />
                        </td>
                        <td className="oa-cell-montant">
                          {formatNumber(parseNumber(montantRetard))}
                        </td>
                        <td></td>
                      </tr>
                    )}

                    <tr className="oa-row-total">
                      <td colSpan={3}>{t('TOTAL', 'TOTAL', 'TOTAL')}</td>
                      <td className="oa-cell-montant oa-total-value">
                        {formatNumber(total)} Ar
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="oa-retard-box">
                <label className="oa-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isRetard}
                    onChange={(e) => setIsRetard(e.target.checked)}
                  />
                  <Clock size={14} /> {t('Appliquer une pénalité de retard', 'Mampihatra sazy noho ny fahatarana', 'Apply a late penalty')}
                </label>
              </div>
            </div>

            <div className="oa-total-box">
              <div className="oa-total-row">
                <span><Hash size={14} /> {t('Total à payer', 'Vola haloa', 'Total to pay')}</span>
                <strong>{formatNumber(total)} Ar</strong>
              </div>
              <div className="oa-total-detail">
                {lignes.length} {t('ligne', 'tsipika', 'line')}{lignes.length > 1 ? 's' : ''}
                {fraisDossierActif && parseNumber(fraisDossierMontant) > 0 &&
                  ` + ${formatNumber(parseNumber(fraisDossierMontant))} Ar ${t('frais', 'sara', 'fees')}`}
                {isRetard && ` + ${formatNumber(parseNumber(montantRetard))} Ar ${t('retard', 'tara', 'late')}`}
              </div>
            </div>

            <div className="oa-section quittance-section">
              <h3 className="oa-section-title">
                <FileCheck size={18} /> {t('Quittance', 'Taratasy', 'Receipt')} <span style={{ color: 'red' }}>*</span>
              </h3>
              <div className="oa-quittance-box">
                <div className="oa-quittance-display">
                  <span className="oa-quittance-label">{t('N° Quittance', 'Laharana taratasy', 'Receipt N°')} :</span>
                  <span className="oa-quittance-value">{quittanceInfo.next}</span>
                  <span className="oa-quittance-hint">
                    ({t('dernier utilisé', 'farany nampiasaina', 'last used')} : {quittanceInfo.last})
                  </span>
                </div>
              </div>
            </div>

            <div className="oa-section personne-recu-section">
              <h3 className="oa-section-title">
                <UserPlus size={18} /> {t('Personne qui reçoit', 'Mpandray', 'Receiver')} <span style={{ color: 'red' }}>*</span>
              </h3>
              <input
                type="text"
                value={personneRecu}
                onChange={(e) => setPersonneRecu(e.target.value)}
                placeholder={t(
                  'Saisir le nom de la personne qui reçoit (obligatoire)',
                  'Ampidiro ny anaran\'ny mpandray (tsy azo ihodivirana)',
                  'Enter the receiver name (mandatory)'
                )}
                className="oa-personne-recu-input"
                style={{
                  borderColor: personneRecu.trim() ? '#27ae60' : '#ddd',
                  borderWidth: personneRecu.trim() ? '2px' : '1px'
                }}
              />
              {personneRecu.trim() && (
                <div className="oa-personne-recu-ok">
                  <CheckCircle size={14} /> <strong>{personneRecu}</strong> - {t('Enregistré', 'Voatahiry', 'Recorded')}
                </div>
              )}
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
    1: t('Étape 1 — Identification', 'Dingana 1 — Famantarana', 'Step 1 — Identification'),
    2: t('Étape 2 — Représentant', 'Dingana 2 — Mpisolo tena', 'Step 2 — Representative'),
    3: t('Étape 3 — Paiement & Facture', 'Dingana 3 — Fandoavana & Faktiora', 'Step 3 — Payment & Invoice')
  }[currentStep] || `${t('Étape', 'Dingana', 'Step')} ${currentStep}`);

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
              <h1>{t("Ajout d'usager événementiel", 'Fanampiana mpanjifa hetsika', 'Add event user')}</h1>
              <p>{t(
                'CD, MP3, œuvres web, hologrammes et autres supports',
                'CD, MP3, asa an-tserasera, holograma sy hafa',
                'CD, MP3, web works, holograms and other media'
              )}</p>
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
            <button type="button" className="oa-btn-primary" onClick={handleNext} disabled={isSubmitting}>
              {currentStep === 3 ? (
                <><Save size={16} /> {t('Valider', 'Manamarina', 'Validate')}</>
              ) : (
                <>{t('Suivant', 'Manaraka', 'Next')} <ArrowRight size={16} /></>
              )}
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
                  <p className="oa-confirm-text">
                    {t('Confirmez-vous les actions suivantes ?', 'Manamarina ireto hetsika manaraka ireto ve ianao ?', 'Do you confirm the following actions?')}
                  </p>
                  <ul className="oa-confirm-list">
                    <li>
                      <CheckCircle size={16} color="#27ae60" />{' '}
                      <strong>{t("Ajout d'un usager événementiel", 'Fanampiana mpanjifa hetsika', 'Add an event user')}</strong>{' '}
                      ({TYPES_USAGERS.find(tp => tp.id === typeUsager)?.label})
                    </li>
                    <li>
                      <CheckCircle size={16} color="#27ae60" />{' '}
                      <strong>{t("Ajout d'un paiement", 'Fanampiana fandoavana', 'Add a payment')}</strong>{' '}
                      ({modePaiement === 'mensuel' ? t('Mensuel', 'Isam-bolana', 'Monthly') : t('Unique', 'Indray mandeha', 'One-time')})
                      {modePaiement === 'mensuel' && moisPaiement.length > 0 && (
                        <span> — {moisPaiement.length} {t('mois', 'volana', 'month(s)')}</span>
                      )}
                    </li>
                    <li>
                      <CheckCircle size={16} color="#27ae60" />{' '}
                      <strong>{t("Génération d'une facture", 'Famokarana faktiora', 'Generate an invoice')}</strong>{' '}
                      ({t('quittance n°', 'taratasy n°', 'receipt n°')} {quittanceInfo.next})
                    </li>
                  </ul>
                  <div className="oa-confirm-summary">
                    <div><span>{t('Usager', 'Mpanjifa', 'User')} :</span> <strong>{identification.denomination}</strong></div>
                    <div><span>{t('Type', 'Karazana', 'Type')} :</span> <strong>{TYPES_USAGERS.find(tp => tp.id === typeUsager)?.label}</strong></div>
                    <div><span>{t('Mode', 'Fomba', 'Mode')} :</span> <strong>{modePaiement === 'mensuel' ? t('Mensuel', 'Isam-bolana', 'Monthly') : t('Unique', 'Indray mandeha', 'One-time')}</strong></div>
                    {modePaiement === 'mensuel' && (
                      <div>
                        <span>{t('Mois', 'Volana', 'Months')} ({moisPaiement.length}) :</span>{' '}
                        <strong>{moisPaiement.map(m => moisLabelsShort[m - 1]).join(', ')}</strong>
                      </div>
                    )}
                    <div><span>{t('Lignes', 'Tsipika', 'Lines')} :</span> <strong>{lignes.length}</strong></div>
                    <div><span>{t('Total', 'Total', 'Total')} :</span> <strong className="oa-total-strong">{formatNumber(getTotalGeneral())} Ar</strong></div>
                  </div>
                </>
              )}

              {isSaving && (
                <div className="oa-saving">
                  <Clock size={48} className="oa-spin" />
                  <p>{t('Enregistrement en cours...', 'Mitahiry...', 'Saving...')}</p>
                </div>
              )}

              {savingResult && savingResult.success && (
                <div className="oa-success">
                  <CheckCircle size={56} color="#27ae60" />
                  <h3>{t('Enregistrement réussi !', 'Vita ny fitahirizana !', 'Save successful!')}</h3>
                  <ul className="oa-result-list">
                    <li>✅ {t('Usager événementiel créé', 'Mpanjifa hetsika noforonina', 'Event user created')} (ID: {savingResult.usagerOtherId})</li>
                    <li>✅ {t('Paiement enregistré', 'Voatahiry ny fandoavana', 'Payment recorded')} ({savingResult.modePaiement})</li>
                    {savingResult.moisPaiement && savingResult.moisPaiement.length > 0 && (
                      <li>✅ {t('Mois payés', 'Volana voaloa', 'Months paid')} : {savingResult.moisPaiement.map(m => moisLabelsShort[m - 1]).join(', ')}</li>
                    )}
                    <li>✅ {t('Facture générée', 'Faktiora noforonina', 'Invoice generated')} n° {savingResult.numFacture}</li>
                    <li>✅ {t('Quittance', 'Taratasy', 'Receipt')} n° {savingResult.quittance}</li>
                  </ul>
                  <p className="oa-result-total">
                    {t('Total', 'Total', 'Total')} : <strong>{formatNumber(savingResult.soitTotal)} Ar</strong>
                  </p>
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
              {savingResult && savingResult.success && (
                <button className="oa-btn-primary" onClick={() => navigate('/gere-payer')}>
                  <CheckCircle size={16} /> {t('Terminer', 'Vita', 'Finish')}
                </button>
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
    </div>
  );
};

export default OtherAjout;