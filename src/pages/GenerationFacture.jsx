// src/pages/GenerationFacture.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  ArrowLeft, FileText, Building2, User,
  Phone, Mail, MapPin, Calendar, DollarSign,
  Hash, Edit, CheckCircle, AlertCircle, Loader2,
  Bus, Hotel, Store, Tv2, PartyPopper, Ticket,
  UserPlus, FileCheck, Radio, MoreVertical, RefreshCw,
  Eye, X,
} from 'lucide-react';
import '../styles/generation-facture.css';
import MiniSidebar from '../components/MiniSidebar';
import { generateFacturePDF } from './pdf/facture_pdf_g';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';

const GenerationFacture = () => {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [facture, setFacture] = useState(null);
  const [factureId, setFactureId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFacture, setEditedFacture] = useState({});
  const [pdfGenere, setPdfGenere] = useState(false);

  // ✅ Personne qui reçoit — TOUJOURS VIDE par défaut
  const [personneRecu, setPersonneRecu] = useState('');

  const [quittance, setQuittance] = useState('');
  const [quittanceValidee, setQuittanceValidee] = useState(false);

  // ✅ États menu 3 points
  const [showQuittanceMenu, setShowQuittanceMenu] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState(null);
  const [isSavingQuittance, setIsSavingQuittance] = useState(false);
  const menuRef = useRef(null);

  const [montant, setMontant] = useState(0);
  const [fraisDossier, setFraisDossier] = useState(0);
  const [montantRetard, setMontantRetard] = useState(0);
  const [isRetard, setIsRetard] = useState(false);
  const [uniter, setUniter] = useState(1);
  const [refClientType, setRefClientType] = useState('');

  const [regionUsager, setRegionUsager] = useState('');
  const [villeUsager, setVilleUsager] = useState('');
  const [quartierUsager, setQuartierUsager] = useState('');

  const [moyensCommunication, setMoyensCommunication] = useState({
    radio: { actif: false, taux: 0 },
    lecteur: { actif: false, taux: 0 },
    tv: { actif: false, taux: 0 },
    autres: { actif: false, taux: 0 },
  });

  // ============================================================
  // HELPERS
  // ============================================================
  const getOnlyNumbers = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  const hasMoyensCommunication = (type) => ['HTL', 'MGS', 'NGT'].includes(type);
  const hasRetard = (type) => type === 'OCC';

  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('adminUser') || localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return u.id || null;
      }
    } catch (e) { /* ignore */ }
    return null;
  };

  // ============================================================
  // FERMER LE MENU AU CLIC EXTÉRIEUR
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowQuittanceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================
  // CHARGEMENT FACTURE
  // ============================================================
  const factureIdFromState = location.state?.factureId || null;

  useEffect(() => {
    if (!factureIdFromState) {
      showToast(
        t('Aucune facture à générer', 'Tsy misy faktiora hamoronana', 'No invoice to generate'),
        'error'
      );
      navigate('/confirmation-dossier');
      return;
    }

    setFactureId((prevId) => {
      if (prevId === factureIdFromState) return prevId;
      fetchFacture(factureIdFromState);
      return factureIdFromState;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factureIdFromState]);

  const fetchFacture = async (id) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/factures/${id}`);
      const data = await response.json();

      if (data.success) {
        const factureData = data.facture;

        let montantVal = parseFloat(factureData.montant_mensuel) || 0;
        let fraisDossierVal = parseFloat(factureData.frais_dossier) || 0;
        let montantRetardVal = parseFloat(factureData.montant_retard) || 0;
        let isRetardVal = factureData.is_retard || false;
        let uniterVal = parseInt(factureData.uniter) || 1;
        let soitTotalVal = parseFloat(factureData.soit_total) || 0;
        const type = factureData.ref_client_type || '';
        setRefClientType(type);

        setRegionUsager(factureData.region_usager || '');
        setVilleUsager(factureData.ville || '');
        setQuartierUsager(factureData.quartier || '');

        let moyensComm = {
          radio: { actif: false, taux: 0 },
          lecteur: { actif: false, taux: 0 },
          tv: { actif: false, taux: 0 },
          autres: { actif: false, taux: 0 },
        };

        if (factureData.moyens_communication) {
          try {
            if (typeof factureData.moyens_communication === 'string') {
              moyensComm = JSON.parse(factureData.moyens_communication);
            } else {
              moyensComm = factureData.moyens_communication;
            }
          } catch (e) {
            console.warn('⚠️ Erreur parsing moyens_communication:', e);
          }
        }

        if (montantVal === 0 && factureData.ref_usager) {
          try {
            const usagerResponse = await fetch(
              `${API_URL}/usagers/${factureData.ref_usager}`
            );
            const usagerData = await usagerResponse.json();

            if (type === 'OCC') {
              montantVal = parseFloat(usagerData.montant) || parseFloat(usagerData.montant_total) || 0;
              montantRetardVal = parseFloat(usagerData.montant_retard) || 0;
              isRetardVal = usagerData.is_retard || false;
            } else if (type === 'RDP') {
              montantVal = parseFloat(usagerData.taux) || parseFloat(usagerData.montant_mensuel) || 0;
            } else {
              montantVal = parseFloat(usagerData.montant_mensuel) || parseFloat(usagerData.montant_total) || 0;
            }

            if (fraisDossierVal === 0) {
              fraisDossierVal = parseFloat(usagerData.frais_dossier) || 0;
            }
            if (uniterVal === 1 && usagerData.uniter) {
              uniterVal = parseInt(usagerData.uniter) || 1;
            }

            if (!factureData.region_usager && usagerData.region) {
              setRegionUsager(usagerData.region);
            }
            if (!factureData.ville && usagerData.ville) {
              setVilleUsager(usagerData.ville);
            }
            if (!factureData.quartier && usagerData.quartier) {
              setQuartierUsager(usagerData.quartier);
            }
          } catch (usagerError) {
            console.warn('⚠️ Impossible de récupérer l\'usager:', usagerError);
          }
        }

        if (soitTotalVal === 0 && montantVal > 0) {
          const retard = isRetardVal ? montantRetardVal : 0;
          if (type === 'HTL' || type === 'MGS' || type === 'NGT') {
            let totalMoyens = 0;
            if (moyensComm.radio?.actif) totalMoyens += parseFloat(moyensComm.radio?.taux) || 0;
            if (moyensComm.lecteur?.actif) totalMoyens += parseFloat(moyensComm.lecteur?.taux) || 0;
            if (moyensComm.tv?.actif) totalMoyens += parseFloat(moyensComm.tv?.taux) || 0;
            if (moyensComm.autres?.actif) totalMoyens += parseFloat(moyensComm.autres?.taux) || 0;
            soitTotalVal = (montantVal + totalMoyens) * uniterVal + fraisDossierVal + retard;
          } else {
            soitTotalVal = montantVal * uniterVal + fraisDossierVal + retard;
          }
        }

        setFacture(factureData);
        setEditedFacture(factureData);

        // ⚠️ IMPORTANT : NE PAS pré-remplir personneRecu avec facture.personne_recu
        // → Toujours laisser vide pour obliger la saisie
        setPersonneRecu('');

        // ✅ QUITTANCE — Charger la QUITTANCE ACTUELLE depuis quitance_usager
        try {
          const qRes = await fetch(`${API_URL}/quittance/facture/${id}`);
          const qData = await qRes.json();

          if (qData.success && qData.quittance) {
            setQuittance(qData.quittance.num_quitance_formate);
            setQuittanceValidee(qData.quittance.quittance_validee || false);
            console.log('✅ Quittance actuelle chargée:', qData.quittance.num_quitance_formate);
          } else {
            setQuittance('0000001');
            setQuittanceValidee(false);
          }
        } catch (err) {
          console.warn('⚠️ Erreur chargement quittance:', err);
          setQuittance('0000001');
          setQuittanceValidee(false);
        }

        setMontant(montantVal);
        setFraisDossier(fraisDossierVal);
        setMontantRetard(montantRetardVal);
        setIsRetard(isRetardVal);
        setUniter(uniterVal);
        setMoyensCommunication(moyensComm);
      } else {
        showToast(
          t('Erreur lors du chargement de la facture', 'Nisy olana', 'Error loading invoice'),
          'error'
        );
        navigate('/confirmation-dossier');
      }
    } catch (error) {
      console.error('❌ Erreur fetch:', error);
      showToast(
        t('Erreur de connexion', 'Nisy olana', 'Connection error'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ✅ ENREGISTRER / MODIFIER LA QUITTANCE
  // ============================================================
  const handleEnregistrerQuittance = async () => {
    setShowQuittanceMenu(false);

    if (!quittance || quittance.trim() === '') {
      showToast(
        t('⚠️ Saisissez un numéro de quittance', '⚠️ Ampidiro ny laharana', '⚠️ Enter a receipt number'),
        'error'
      );
      return;
    }

    const numeroSaisi = String(quittance).replace(/\D/g, '');

    if (!numeroSaisi) {
      showToast(
        t('⚠️ Numéro invalide', '⚠️ Diso ny laharana', '⚠️ Invalid number'),
        'error'
      );
      return;
    }

    setIsSavingQuittance(true);

    try {
      const userId = getCurrentUserId();

      const response = await fetch(`${API_URL}/quittance/enregistrer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: numeroSaisi,
          factureId: factureId,
          userId,
          personneRecu: personneRecu || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const nouveauFormat = data.numQuitanceFormate || numeroSaisi;
        setQuittance(nouveauFormat);
        setQuittanceValidee(true);

        showToast(
          t(
            `✅ Quittance ${nouveauFormat} enregistrée`,
            `✅ Taratasy ${nouveauFormat} voatahiry`,
            `✅ Receipt ${nouveauFormat} saved`
          ),
          'success'
        );
      } else {
        showToast(`❌ ${data.message || 'Erreur'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      showToast(
        t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'),
        'error'
      );
    } finally {
      setIsSavingQuittance(false);
    }
  };

  // ============================================================
  // ✅ VOIR LA RÉFÉRENCE
  // ============================================================
  const handleVoirReference = async () => {
    setShowQuittanceMenu(false);

    try {
      const response = await fetch(`${API_URL}/quittance/reference`);
      const data = await response.json();

      if (data.success) {
        setReferenceInfo(data);
        setShowReferenceModal(true);
      } else {
        showToast(
          t('❌ Impossible de récupérer la référence', '❌ Tsy afaka', '❌ Cannot fetch'),
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      showToast(
        t('❌ Erreur de connexion', '❌ Nisy olana', '❌ Connection error'),
        'error'
      );
    }
  };

  // ============================================================
  // CALCULS
  // ============================================================
  const totalMoyensMemo = useMemo(() => {
    let total = 0;
    if (moyensCommunication.radio?.actif) total += parseFloat(moyensCommunication.radio?.taux) || 0;
    if (moyensCommunication.lecteur?.actif) total += parseFloat(moyensCommunication.lecteur?.taux) || 0;
    if (moyensCommunication.tv?.actif) total += parseFloat(moyensCommunication.tv?.taux) || 0;
    if (moyensCommunication.autres?.actif) total += parseFloat(moyensCommunication.autres?.taux) || 0;
    return total;
  }, [moyensCommunication]);

  const soitTotalCalcule = useMemo(() => {
    const retard = isRetard ? montantRetard : 0;
    if (refClientType === 'HTL' || refClientType === 'MGS' || refClientType === 'NGT') {
      return (montant + totalMoyensMemo) * uniter + fraisDossier + retard;
    }
    return montant * uniter + fraisDossier + retard;
  }, [montant, fraisDossier, montantRetard, isRetard, uniter, totalMoyensMemo, refClientType]);

  // ============================================================
  // ÉDITION
  // ============================================================
  const handleEdit = (field, value) => {
    setEditedFacture((prev) => ({ ...prev, [field]: value }));
    setFacture((prev) => (prev ? { ...prev, [field]: value } : prev));

    if (field === 'region_usager') setRegionUsager(value);
    if (field === 'ville') setVilleUsager(value);
    if (field === 'quartier') setQuartierUsager(value);
  };

  // ============================================================
  // PDF
  // ============================================================
  const handleGeneratePDF = async () => {
    // ✅ VALIDATION OBLIGATOIRE : Personne qui reçoit
    if (!personneRecu || personneRecu.trim() === '') {
      showToast(
        t(
          '⚠️ Saisissez la personne qui reçoit (OBLIGATOIRE)',
          '⚠️ Ampidiro ny anaran\'ny mpandray (TSY AZO IHODIVIRANA)',
          '⚠️ Enter receiver name (MANDATORY)'
        ),
        'error'
      );
      return;
    }

    if (!quittanceValidee) {
      showToast(
        t('⚠️ Validez la quittance', '⚠️ Hamarino ny taratasy', '⚠️ Validate the receipt'),
        'error'
      );
      return;
    }

    if (!quittance || quittance === '') {
      showToast(
        t('⚠️ Saisissez un numéro de quittance', '⚠️ Ampidiro ny laharana', '⚠️ Enter a receipt number'),
        'error'
      );
      return;
    }

    if (!facture) return;

    try {
      setIsGenerating(true);
      showToast(
        t('🔄 Génération...', '🔄 Mamorona...', '🔄 Generating...'),
        'info'
      );

      const factureData = {
        ...facture,
        montant_mensuel: montant,
        frais_dossier: fraisDossier,
        montant_retard: isRetard ? montantRetard : 0,
        is_retard: isRetard,
        uniter: uniter,
        soit_total: soitTotalCalcule,
        quittance: quittance,
        quittance_validee: quittanceValidee,
        moyens_communication: moyensCommunication,
        personne_recu: personneRecu,
        region_usager: regionUsager,
        ville: villeUsager,
        quartier: quartierUsager,
      };

      const result = generateFacturePDF(factureData, false);

      if (result) {
        setPdfGenere(true);
        showToast(
          t('✅ PDF généré !', '✅ Vita ny PDF !', '✅ PDF generated!'),
          'success'
        );
      } else {
        showToast(
          t('❌ Erreur PDF', '❌ Nisy olana', '❌ PDF error'),
          'error'
        );
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast(
        t('❌ Erreur PDF', '❌ Nisy olana', '❌ PDF error'),
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetour = () => {
    if (!pdfGenere) {
      showToast(
        t('⚠️ Générez d\'abord le PDF', '⚠️ Mamorona PDF aloha', '⚠️ Generate the PDF first'),
        'warning'
      );
      return;
    }
    navigate('/confirmation-dossier');
  };

  // ============================================================
  // ICÔNES / LABELS
  // ============================================================
  const getTypeIcon = (type) => {
    const icons = { HTL: Hotel, MGS: Store, RDP: Tv2, TRP: Bus, NGT: PartyPopper, OCC: Ticket };
    return icons[type] || Building2;
  };

  const getTypeLabel = (type) => {
    const labels = {
      HTL: t('Hôtel', 'Hotely', 'Hotel'),
      MGS: t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
      RDP: t('Radio/Télé', 'Radio/Tele', 'Radio/TV'),
      TRP: t('Transport', 'Fitaterana', 'Transport'),
      NGT: t('Night Club', 'Club alina', 'Night Club'),
      OCC: t('Occasionnel', 'Fotoana manompo', 'Occasional'),
    };
    return labels[type] || type;
  };

  // ============================================================
  // RENDER FIELD
  // ============================================================
  const renderField = (label, value, field, type = 'text') => {
    const currentValue = isEditing ? editedFacture[field] : value;
    const displayValue = currentValue !== undefined && currentValue !== null ? currentValue : '';

    const isProtected = ['ref_omda', 'num_facture', 'num_facture_type', 'ref_client_type', 'soit_total', 'montant_total'].includes(field);
    const isMontantField = ['montant_mensuel', 'frais_dossier', 'montant_retard', 'is_retard', 'uniter', 'soit_total'].includes(field);
    const canEdit = isEditing && !isProtected && !isMontantField;

    return (
      <div className="facture-field" key={field}>
        <span className="field-label">{label}</span>
        {canEdit ? (
          type === 'textarea' ? (
            <textarea value={displayValue} onChange={(e) => handleEdit(field, e.target.value)} className="field-input textarea" rows={2} />
          ) : type === 'select' ? (
            <select value={displayValue} onChange={(e) => handleEdit(field, e.target.value)} className="field-input">
              <option value="DAFC">DAFC</option>
              <option value="Redevances">{t('Redevances', 'Taham-bola', 'Royalties')}</option>
              <option value="Droit d'auteur">{t('Droit d\'auteur', 'Zon\'ny mpanoratra', 'Copyright')}</option>
              <option value="Location">{t('Location', 'Fanofana', 'Rental')}</option>
              <option value="Autres">{t('Autres', 'Hafa', 'Others')}</option>
            </select>
          ) : type === 'date' ? (
            <input type="date" value={displayValue || ''} onChange={(e) => handleEdit(field, e.target.value)} className="field-input" />
          ) : type === 'number' ? (
            <input type="number" value={displayValue} onChange={(e) => handleEdit(field, parseFloat(e.target.value) || 0)} className="field-input" />
          ) : (
            <input type="text" value={displayValue} onChange={(e) => handleEdit(field, e.target.value)} className="field-input" />
          )
        ) : (
          <span className={`field-value ${isProtected || isMontantField ? 'protected' : ''}`}>
            {type === 'date' && displayValue
              ? new Date(displayValue).toLocaleDateString(locale)
              : displayValue || '-'}
          </span>
        )}
      </div>
    );
  };

  const renderLocalisationFields = () => {
    const data = isEditing ? editedFacture : facture;
    return (
      <>
        {renderField(t('Région', 'Faritra', 'Region'), data.region_usager || regionUsager, 'region_usager')}
        {renderField(t('Ville', 'Tanàna', 'City'), data.ville || villeUsager, 'ville')}
        {renderField(t('Quartier', 'Fokontany', 'Neighborhood'), data.quartier || quartierUsager, 'quartier')}
      </>
    );
  };

  const renderFieldsByType = () => {
    const type = facture?.ref_client_type;
    const data = isEditing ? editedFacture : facture;
    if (!data) return { commonFields: null, specificFields: null };

    const commonFields = (
      <>
        {renderField(t('Dénomination', 'Anarana', 'Name'), data.denomination, 'denomination')}
        {renderField(t('Demandeur', 'Mpangataka', 'Applicant'), data.demandeur, 'demandeur')}
        {renderField(t('Téléphone', 'Finday', 'Phone'), data.telephone, 'telephone')}
        {renderField('Email', data.email, 'email')}
        {renderField(t('Adresse', 'Adiresy', 'Address'), data.adresse, 'adresse', 'textarea')}
        {renderLocalisationFields()}
      </>
    );

    let specificFields = null;

    switch (type) {
      case 'HTL':
        specificFields = (
          <>
            {renderField(t('Activité', 'Asa', 'Activity'), data.activite, 'activite')}
            {renderField(t('Étoiles', 'Kintana', 'Stars'), data.etoiles, 'etoiles')}
            {renderField('Ravinala', data.ravinala ? t('Oui', 'Eny', 'Yes') : t('Non', 'Tsia', 'No'), 'ravinala')}
          </>
        );
        break;
      case 'MGS':
        specificFields = (
          <>
            {renderField(t('Activité', 'Asa', 'Activity'), data.activite, 'activite')}
            {renderField(t('Nombre de magasins', 'Isan\'ny fivarotana', 'Number of stores'), data.nombre_magasins, 'nombre_magasins', 'number')}
          </>
        );
        break;
      case 'TRP':
        specificFields = (
          <>
            {renderField(t('Nombre de véhicules', 'Isan\'ny fiara', 'Number of vehicles'), data.nombre_vehicules, 'nombre_vehicules', 'number')}
            {renderField(t('Lignes', 'Lalana', 'Lines'), data.lignes, 'lignes')}
            {renderField(t('Type de transport', 'Karazana fitaterana', 'Transport type'), data.type_bus, 'type_bus')}
            {renderField(t('Trajet', 'Lalana', 'Route'), data.trajet, 'trajet')}
            {renderField(t('Zones desservies', 'Faritra voakasika', 'Covered areas'), data.zones_desservies, 'zones_desservies')}
          </>
        );
        break;
      case 'NGT':
        specificFields = (
          <>
            {renderField(t('Jauge maximale', 'Fahaiza-mandray ambony', 'Max capacity'), data.jauge_max, 'jauge_max', 'number')}
            {renderField(t('Horaires', 'Ora', 'Schedules'), data.horaires, 'horaires')}
          </>
        );
        break;
      case 'RDP':
        specificFields = (
          <>
            {renderField(t('Fréquence', 'Fahita', 'Frequency'), data.frequence, 'frequence')}
            {renderField(t('Canal', 'Fantsona', 'Channel'), data.canal, 'canal')}
            {renderField(t('Siège', 'Foibe', 'Head office'), data.siege, 'siege')}
            {renderField('NIF', data.nif, 'nif')}
            {renderField('STAT', data.stat, 'stat')}
          </>
        );
        break;
      case 'OCC':
        specificFields = (
          <>
            {renderField(t('Organisateurs', 'Mpikarakara', 'Organizers'), data.organisateurs, 'organisateurs')}
            {renderField(t('Représentant par', 'Mpisolo tena', 'Represented by'), data.representant_par, 'representant_par')}
            {renderField(t('Genre manifestation', 'Karazana hetsika', 'Event type'), data.genre_manifestation, 'genre_manifestation')}
            {renderField(t('Artistes', 'Mpihira', 'Artists'), data.artistes, 'artistes')}
            {renderField(t('Date événement', 'Daty hetsika', 'Event date'), data.date_evenement, 'date_evenement', 'date')}
            {renderField(t('Lieu événement', 'Toerana hetsika', 'Event location'), data.lieu_evenement, 'lieu_evenement')}
          </>
        );
        break;
      default:
        specificFields = null;
    }

    return { commonFields, specificFields };
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="facture-loading">
          <Loader2 size={48} className="spinner" />
          <p>{t('Chargement de la facture...', 'Maka ny faktiora...', 'Loading invoice...')}</p>
        </div>
      </>
    );
  }

  if (!facture) {
    return (
      <>
        <MiniSidebar />
        <div className="facture-error">
          <AlertCircle size={48} />
          <p>{t('Facture non trouvée', 'Tsy hita ny faktiora', 'Invoice not found')}</p>
          <button onClick={() => navigate('/confirmation-dossier')} className="btn-retour">
            {t('Retour', 'Hiverina', 'Back')}
          </button>
        </div>
      </>
    );
  }

  const IconComponent = getTypeIcon(facture.ref_client_type);
  const typeLabel = getTypeLabel(facture.ref_client_type);
  const { commonFields, specificFields } = renderFieldsByType();
  const showMoyensComm = hasMoyensCommunication(facture.ref_client_type);
  const showRetard = hasRetard(facture.ref_client_type);
  const totalMoyens = totalMoyensMemo;

  // ✅ PDF prêt seulement si TOUS les champs obligatoires sont remplis
  const isPersonneRecuValid = personneRecu && personneRecu.trim() !== '';
  const isPDFReady =
    isPersonneRecuValid &&
    quittanceValidee &&
    quittance && quittance !== '';

  const notActive = t('Non actif', 'Tsy mavitrika', 'Not active');

  return (
    <>
      <MiniSidebar />
      <div className="generation-facture-container">
        <div className="facture-header">
          <div className="header-left">
            <div className="header-info">
              <h1>{t('Génération de Facture', 'Famokarana Faktiora', 'Invoice generation')}</h1>
              <div className="header-type">
                <IconComponent size={18} />
                <span>{typeLabel}</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <span className={`facture-status status-${facture.statut || 'brouillon'}`}>
              {facture.statut === 'brouillon' && `📝 ${t('Brouillon', 'Volavola', 'Draft')}`}
              {facture.statut === 'validee' && `✅ ${t('Validée', 'Voamarina', 'Validated')}`}
              {!facture.statut && `📝 ${t('Brouillon', 'Volavola', 'Draft')}`}
            </span>
            <button className="btn-edit" onClick={() => setIsEditing(!isEditing)}>
              <Edit size={18} />{' '}
              {isEditing ? t('Terminer', 'Vita', 'Done') : t('Modifier', 'Ovay', 'Edit')}
            </button>
          </div>
        </div>

        <div className="facture-body">
          {/* Références */}
          <div className="facture-section references">
            <h3><Hash size={18} /> {t('Références', 'Fanondroana', 'References')}</h3>
            <div className="facture-grid">
              <div className="facture-field">
                <span className="field-label">Réf OMDA</span>
                <span className="field-value protected">{facture.ref_omda || '-'}</span>
              </div>
              <div className="facture-field">
                <span className="field-label">{t('N° Facture', 'N° Faktiora', 'Invoice N°')}</span>
                <span className="field-value protected">{facture.num_facture || '001'}</span>
              </div>
              <div className="facture-field">
                <span className="field-label">{t('Type Client', 'Karazana mpanjifa', 'Client type')}</span>
                <span className="field-value protected">{typeLabel}</span>
              </div>
              <div className="facture-field">
                <span className="field-label">{t('Type de facture', 'Karazana faktiora', 'Invoice type')}</span>
                {isEditing ? (
                  <select value={editedFacture.type_facture || 'DAFC'} onChange={(e) => handleEdit('type_facture', e.target.value)} className="field-input">
                    <option value="DAFC">DAFC</option>
                    <option value="SFL">SFL</option>
                  </select>
                ) : (
                  <span className="field-value">{facture.type_facture || 'DAFC'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div className="facture-section">
            <h3><Building2 size={18} /> {t('Informations Client', 'Fampahalalana mpanjifa', 'Client information')}</h3>
            <div className="facture-grid">{commonFields}</div>
          </div>

          {/* Représentant */}
          <div className="facture-section">
            <h3><User size={18} /> {t('Représentant', 'Mpisolo tena', 'Representative')}</h3>
            <div className="facture-grid">
              {renderField(t('Nom', 'Anarana', 'Name'), facture.representant_nom, 'representant_nom')}
              {renderField(t('Adresse', 'Adiresy', 'Address'), facture.representant_adresse, 'representant_adresse')}
              {renderField(t('Téléphone', 'Finday', 'Phone'), facture.representant_tel, 'representant_tel')}
              {renderField('CIN', facture.representant_cin, 'representant_cin')}
              {renderField(t('Fonction', 'Asa', 'Position'), facture.representant_fonction, 'representant_fonction')}
            </div>
          </div>

          {/* Spécifique */}
          {specificFields && (
            <div className="facture-section">
              <h3><FileText size={18} /> {t('Informations Spécifiques', 'Fampahalalana manokana', 'Specific information')}</h3>
              <div className="facture-grid">{specificFields}</div>
            </div>
          )}

          {/* Période */}
          <div className="facture-section">
            <h3><Calendar size={18} /> {t('Période', 'Fe-potoana', 'Period')}</h3>
            <div className="facture-grid">
              {renderField(t('A compter du', 'Manomboka ny', 'Starting from'), facture.a_compter_du, 'a_compter_du', 'date')}
              {renderField(t('Échéance', 'Faran\'ny fe-potoana', 'Due date'), facture.echeance, 'echeance', 'date')}
              {renderField(t('Date signature', 'Daty sonia', 'Signature date'), facture.date_signature, 'date_signature', 'date')}
            </div>
          </div>

          {/* ✅ Personne qui reçoit — OBLIGATOIRE, vide par défaut */}
          <div className="facture-section personne-recu-section">
            <h3>
              <UserPlus size={18} /> {t('Personne qui reçoit', 'Mpandray', 'Receiver')}{' '}
              <span style={{ color: 'red', fontSize: '14px' }}>*</span>
            </h3>
            <div className="personne-recu-container">
              <input
                type="text"
                value={personneRecu}
                onChange={(e) => setPersonneRecu(e.target.value)}
                placeholder={t('Saisir le nom de la personne qui reçoit', 'Ampidiro ny anaran\'ny mpandray', 'Enter the receiver name')}
                className="personne-recu-input"
                style={{
                  borderColor: isPersonneRecuValid ? '#27ae60' : '#dc3545',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                }}
                required
              />
              {isPersonneRecuValid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#2e7d32', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                  <CheckCircle size={14} color="#27ae60" />
                  <span><strong>✅ {personneRecu}</strong> - {t('Enregistré', 'Voatahiry', 'Recorded')}</span>
                </div>
              )}
              {!isPersonneRecuValid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#c62828', backgroundColor: '#ffebee', borderRadius: '4px' }}>
                  <AlertCircle size={14} color="#dc3545" />
                  <span>
                    <strong>⚠️ {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}</strong> -{' '}
                    {t('Saisissez le nom de la personne qui reçoit', 'Ampidiro ny anaran\'ny mpandray', 'Enter the receiver name')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ QUITTANCE — avec menu 3 points */}
          <div className="facture-section quittance-section">
            <h3>
              <FileCheck size={18} /> {t('Quittance', 'Taratasy', 'Receipt')}{' '}
              <span style={{ color: 'red', fontSize: '14px' }}>*</span>
            </h3>
            <div className="quittance-container">
              <div className="quittance-input-group">
                <div
                  className="quittance-input-wrapper"
                  ref={menuRef}
                  style={{ display: 'flex', gap: '4px', alignItems: 'stretch', position: 'relative', width: '100%' }}
                >
                  <input
                    type="text"
                    value={quittance}
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

                  {/* ✅ BOUTON 3 POINTS VERTICAUX */}
                  <button
                    type="button"
                    className="btn-quittance-menu"
                    onClick={() => setShowQuittanceMenu(!showQuittanceMenu)}
                    title={t('Actions', 'Hetsika', 'Actions')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '42px',
                      height: '42px',
                      backgroundColor: showQuittanceMenu ? '#2c7be5' : '#f1f5f9',
                      color: showQuittanceMenu ? '#ffffff' : '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isSavingQuittance ? (
                      <Loader2 size={18} className="spinner" />
                    ) : (
                      <MoreVertical size={18} />
                    )}
                  </button>

                  {/* ✅ MENU DÉROULANT */}
                  {showQuittanceMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '46px',
                        right: 0,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        minWidth: '240px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleEnregistrerQuittance}
                        disabled={isSavingQuittance || !quittance || quittance.trim() === ''}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          cursor:
                            isSavingQuittance || !quittance || quittance.trim() === ''
                              ? 'not-allowed'
                              : 'pointer',
                          color: '#1e40af',
                          fontSize: '14px',
                          fontWeight: '500',
                          textAlign: 'left',
                          opacity:
                            isSavingQuittance || !quittance || quittance.trim() === ''
                              ? 0.5
                              : 1,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <RefreshCw size={16} />
                        <span>
                          {t('Enregistrer la quittance', 'Tehirizo ny taratasy', 'Save receipt')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleVoirReference}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#334155',
                          fontSize: '14px',
                          fontWeight: '500',
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Eye size={16} />
                        <span>
                          {t('Voir la référence actuelle', 'Hijery ny références', 'View current reference')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkbox de validation */}
              <div className="quittance-validation">
                <label className="quittance-checkbox-label">
                  <input
                    type="checkbox"
                    checked={quittanceValidee}
                    onChange={(e) => {
                      if (!quittance || quittance === '') {
                        showToast(
                          t('⚠️ Saisissez d\'abord un numéro', '⚠️ Ampidiro aloha', '⚠️ Enter a number first'),
                          'error'
                        );
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
                {!quittanceValidee && quittance && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#e65100', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                    <AlertCircle size={16} color="#f39c12" />
                    <span>
                      <strong>☑️ {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}</strong> -{' '}
                      {t('Cochez la case', 'Tsindrio ny boaty', 'Check the box')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Moyens de communication */}
          {showMoyensComm && (
            <div className="facture-section moyens-comm-section">
              <h3><Radio size={18} /> {t('Moyens de Communication', 'Fitaovam-pifandraisana', 'Communication means')}</h3>
              <div className="moyens-comm-grid">
                <div className="moyen-comm-item">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={moyensCommunication.radio?.actif || false} disabled />
                    {t('Radio - Poste TSF', 'Radio - Poste TSF', 'Radio - TSF station')}
                  </label>
                  <div className="taux-display">
                    <span>{t('Taux', 'Taha', 'Rate')} :</span>
                    <span className="field-value protected">
                      {moyensCommunication.radio?.actif ? (moyensCommunication.radio?.taux || 0).toLocaleString(locale) + ' Ar' : notActive}
                    </span>
                  </div>
                </div>
                <div className="moyen-comm-item">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={moyensCommunication.lecteur?.actif || false} disabled />
                    {t('Lecteur', 'Mpamaky', 'Reader')}
                  </label>
                  <div className="taux-display">
                    <span>{t('Taux', 'Taha', 'Rate')} :</span>
                    <span className="field-value protected">
                      {moyensCommunication.lecteur?.actif ? (moyensCommunication.lecteur?.taux || 0).toLocaleString(locale) + ' Ar' : notActive}
                    </span>
                  </div>
                </div>
                <div className="moyen-comm-item">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={moyensCommunication.tv?.actif || false} disabled />
                    TV
                  </label>
                  <div className="taux-display">
                    <span>{t('Taux', 'Taha', 'Rate')} :</span>
                    <span className="field-value protected">
                      {moyensCommunication.tv?.actif ? (moyensCommunication.tv?.taux || 0).toLocaleString(locale) + ' Ar' : notActive}
                    </span>
                  </div>
                </div>
                <div className="moyen-comm-item">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={moyensCommunication.autres?.actif || false} disabled />
                    {t('Autres', 'Hafa', 'Others')}
                  </label>
                  <div className="taux-display">
                    <span>{t('Taux', 'Taha', 'Rate')} :</span>
                    <span className="field-value protected">
                      {moyensCommunication.autres?.actif ? (moyensCommunication.autres?.taux || 0).toLocaleString(locale) + ' Ar' : notActive}
                    </span>
                  </div>
                </div>
              </div>
              <div className="total-moyens-display">
                <span className="total-moyens-label">{t('Total Moyens de Communication', 'Totalin\'ny fitaovana', 'Total communication means')} :</span>
                <span className="total-moyens-value">{totalMoyens.toLocaleString(locale)} Ar</span>
              </div>
            </div>
          )}

          {/* Montants */}
          <div className="facture-section montants">
            <h3><DollarSign size={18} /> {t('Montants', 'Vola', 'Amounts')}</h3>
            <div className="facture-grid montants-grid">
              <div className="facture-field">
                <span className="field-label">
                  {facture.ref_client_type === 'OCC' ? t('Montant à payer', 'Vola haloa', 'Amount to pay')
                    : facture.ref_client_type === 'RDP' ? t('Taux', 'Taha', 'Rate')
                    : t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}
                </span>
                <span className="field-value protected" style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                  {(montant || 0).toLocaleString(locale)} Ar
                </span>
              </div>
              <div className="facture-field">
                <span className="field-label">{t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</span>
                <span className="field-value protected" style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                  {(fraisDossier || 0).toLocaleString(locale)} Ar
                  <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: '8px' }}>
                    ({t('fixe', 'raikitra', 'fixed')})
                  </span>
                </span>
              </div>
              {showRetard && (
                <div className="facture-field">
                  <span className="field-label">{t('Montant retard', 'Vola tara', 'Late amount')}</span>
                  <span className="field-value protected" style={{ fontWeight: 'bold', color: isRetard ? '#dc3545' : '#6c757d' }}>
                    {(isRetard ? montantRetard : 0).toLocaleString(locale)} Ar
                  </span>
                </div>
              )}
              {showRetard && (
                <div className="facture-field">
                  <span className="field-label">{t('Retard', 'Tara', 'Late')}</span>
                  <span className="field-value protected" style={{ fontWeight: 'bold', color: isRetard ? '#dc3545' : '#28a745' }}>
                    {isRetard ? t('Oui', 'Eny', 'Yes') : t('Non', 'Tsia', 'No')}
                  </span>
                </div>
              )}
              <div className="facture-field">
                <span className="field-label">{t('Uniter', 'Isan\'ny', 'Unit')}</span>
                <span className="field-value protected" style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                  {uniter || '1'}
                </span>
              </div>
              <div className="facture-field total">
                <span className="field-label" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {t('Soit Total', 'Vola Total', 'Total Amount')}
                </span>
                <span className="field-value protected total-value" style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {soitTotalCalcule.toLocaleString(locale)} Ar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="facture-footer">
          <button
            className="btn-generate-pdf"
            onClick={handleGeneratePDF}
            disabled={isGenerating || !isPDFReady}
            style={{
              opacity: isPDFReady ? 1 : 0.5,
              cursor: isPDFReady ? 'pointer' : 'not-allowed',
              backgroundColor: pdfGenere ? '#27ae60' : isPDFReady ? '#28a745' : '#6c757d',
            }}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="spinner" /> {t('Génération...', 'Mamorona...', 'Generating...')}</>
            ) : pdfGenere ? (
              <><CheckCircle size={18} /> {t('PDF généré', 'Vita ny PDF', 'PDF generated')}</>
            ) : (
              <><FileText size={18} /> {t('Générer le PDF', 'Hamorona PDF', 'Generate PDF')}</>
            )}
          </button>

          <button
            className="btn-retour-accueil-facture"
            onClick={handleRetour}
            disabled={!pdfGenere}
            style={{
              display: pdfGenere ? 'inline-flex' : 'none',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#2c3e50',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: pdfGenere ? 'pointer' : 'not-allowed',
            }}
          >
            <ArrowLeft size={18} />
            {t('Retour', 'Hiverina', 'Back')}
          </button>
        </div>
      </div>

      {/* ✅ MODAL DE RÉFÉRENCE */}
      {showReferenceModal && referenceInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={() => setShowReferenceModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#000000',
                  fontWeight: '700',
                }}
              >
                <FileCheck size={18} color="#000000" />
                <span>{t('Référence Quittance', 'Référence taratasy', 'Receipt reference')}</span>
              </h3>
              <button
                onClick={() => setShowReferenceModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} color="#000000" />
              </button>
            </div>

            <div style={{ padding: '22px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '18px',
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    border: '2px solid #BAE6FD',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#000000',
                      marginBottom: '6px',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {t('PROCHAIN NUMÉRO', 'LAHARANA MANARAKA', 'NEXT NUMBER')}
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: 'monospace',
                      letterSpacing: '3px',
                    }}
                  >
                    {referenceInfo.prochainNumero}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #BAE6FD',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#000000',
                      marginBottom: '2px',
                      fontWeight: '700',
                    }}
                  >
                    {t('DERNIER NUMÉRO', 'LAHARANA FARANY', 'LAST NUMBER')}
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#000000',
                      fontFamily: 'monospace',
                    }}
                  >
                    {referenceInfo.dernierNumeroFormate}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '14px 22px',
                background: '#FFFFFF',
                borderTop: '1px solid #BAE6FD',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowReferenceModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#FFFFFF',
                  color: '#000000',
                  border: '2px solid #BAE6FD',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {t('Fermer', 'Hidio', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GenerationFacture;