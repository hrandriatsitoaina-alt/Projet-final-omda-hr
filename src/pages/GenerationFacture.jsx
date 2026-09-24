// src/pages/GenerationFacture.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  ArrowLeft, Save, Printer, FileText, Building2, User,
  Phone, Mail, MapPin, Calendar, DollarSign, CreditCard,
  Hash, Edit, CheckCircle, AlertCircle, Loader2,
  Users, Bus, Hotel, Store, Tv2, PartyPopper, Ticket,
  UserPlus, FileCheck, Radio, Headphones, Home,
} from 'lucide-react';
import '../styles/generation-facture.css';
import MiniSidebar from '../components/MiniSidebar';
import { generateFacturePDF } from './pdf/facture_pdf_g';
import { useT } from '../hooks/useT';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [facture, setFacture] = useState(null);
  const [factureId, setFactureId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFacture, setEditedFacture] = useState({});
  const [pdfGenere, setPdfGenere] = useState(false);
  const [personneRecu, setPersonneRecu] = useState('');
  const [quittance, setQuittance] = useState('');
  const [quittanceValidee, setQuittanceValidee] = useState(false);

  const [montant, setMontant] = useState(0);
  const [fraisDossier, setFraisDossier] = useState(0);
  const [montantRetard, setMontantRetard] = useState(0);
  const [isRetard, setIsRetard] = useState(false);
  const [uniter, setUniter] = useState(1);
  const [refClientType, setRefClientType] = useState('');

  const [moyensCommunication, setMoyensCommunication] = useState({
    radio: { actif: false, taux: 0 },
    lecteur: { actif: false, taux: 0 },
    tv: { actif: false, taux: 0 },
    autres: { actif: false, taux: 0 },
  });

  const getOnlyNumbers = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  const formatQuittanceDisplay = (value) => {
    const numbers = getOnlyNumbers(value);
    if (!numbers) return '';
    return numbers.padStart(7, '0');
  };

  const getTotalMoyens = () => {
    let total = 0;
    if (moyensCommunication.radio?.actif) total += parseFloat(moyensCommunication.radio?.taux) || 0;
    if (moyensCommunication.lecteur?.actif) total += parseFloat(moyensCommunication.lecteur?.taux) || 0;
    if (moyensCommunication.tv?.actif) total += parseFloat(moyensCommunication.tv?.taux) || 0;
    if (moyensCommunication.autres?.actif) total += parseFloat(moyensCommunication.autres?.taux) || 0;
    return total;
  };

  const hasMoyensCommunication = (type) => {
    return ['HTL', 'MGS', 'NGT'].includes(type);
  };

  const hasRetard = (type) => {
    return type === 'OCC';
  };

  // ✅ EFFET 1 : Chargement de la facture
  // ✅ location.state au lieu de location (référence stable)
  useEffect(() => {
    const state = location.state;
    if (state && state.factureId) {
      setFactureId(state.factureId);
      fetchFacture(state.factureId);
    } else {
      showToast(t('Aucune facture à générer', 'Tsy misy faktiora hamoronana', 'No invoice to generate'), 'error');
      navigate('/confirmation-dossier');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, navigate]);

  const fetchFacture = async (id) => {
    try {
      setLoading(true);

      const response = await fetch(`http://localhost:3001/api/factures/${id}`);
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
            const usagerResponse = await fetch(`http://localhost:3001/api/usagers/${factureData.ref_usager}`);
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
            soitTotalVal = (montantVal * uniterVal) + fraisDossierVal + retard;
          }
        }

        setFacture(factureData);
        setEditedFacture(factureData);
        setPersonneRecu('');

        const quittanceRaw = factureData.quittance || '';
        const quittanceNumbers = getOnlyNumbers(quittanceRaw);
        if (quittanceNumbers) {
          setQuittance(quittanceNumbers);
        } else {
          setQuittance('');
        }
        setQuittanceValidee(factureData.quittance_validee || false);

        if (!quittanceNumbers || quittanceNumbers === '') {
          try {
            const quittanceResponse = await fetch('http://localhost:3001/api/quittance/last');
            const quittanceData = await quittanceResponse.json();
            if (quittanceData.success && quittanceData.nextQuittance) {
              const nextNumbers = getOnlyNumbers(quittanceData.nextQuittance);
              setQuittance(nextNumbers);
            }
          } catch (err) {
            console.warn('⚠️ Erreur récupération quittance:', err);
          }
        }

        setMontant(montantVal);
        setFraisDossier(fraisDossierVal);
        setMontantRetard(montantRetardVal);
        setIsRetard(isRetardVal);
        setUniter(uniterVal);
        setMoyensCommunication(moyensComm);
      } else {
        showToast(t('Erreur lors du chargement de la facture', 'Nisy olana tamin\'ny fakana ny faktiora', 'Error loading invoice'), 'error');
        navigate('/confirmation-dossier');
      }
    } catch (error) {
      console.error('❌ Erreur fetch:', error);
      showToast(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CALCUL À LA VOLÉE (remplace l'ancien useEffect qui bouclait)
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
    return (montant * uniter) + fraisDossier + retard;
  }, [montant, fraisDossier, montantRetard, isRetard, uniter, totalMoyensMemo, refClientType]);

  const handleEdit = (field, value) => {
    setEditedFacture(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveFacture = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...editedFacture,
        montant_mensuel: montant,
        frais_dossier: fraisDossier,
        montant_retard: isRetard ? montantRetard : 0,
        is_retard: isRetard,
        uniter: uniter,
        soit_total: soitTotalCalcule,
        quittance: getOnlyNumbers(quittance) || null,
        quittance_validee: quittanceValidee,
        moyens_communication: moyensCommunication,
        personne_recu: personneRecu,
      };

      const response = await fetch(`http://localhost:3001/api/factures/${factureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      const data = await response.json();
      if (data.success) {
        showToast(t('✅ Facture mise à jour avec succès', '✅ Vita ny fanavaozana ny faktiora', '✅ Invoice updated successfully'), 'success');
        setFacture(data.facture);
        setEditedFacture(data.facture);
        setIsEditing(false);
      } else {
        showToast(`❌ ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast(t('❌ Erreur de sauvegarde', '❌ Nisy olana tamin\'ny fitehirizana', '❌ Save error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!personneRecu || personneRecu.trim() === '') {
      showToast(t('⚠️ OBLIGATOIRE : Saisissez le nom de la personne qui reçoit', '⚠️ TSY AZO IHODIVIRANA : Ampidiro ny anaran\'ny mpandray', '⚠️ MANDATORY: Enter the receiver name'), 'error');
      return;
    }

    if (!quittanceValidee) {
      showToast(t('⚠️ OBLIGATOIRE : Cochez la case pour valider la quittance', '⚠️ TSY AZO IHODIVIRANA : Tsindrio ny boaty hanamarinana ny taratasy', '⚠️ MANDATORY: Check the box to validate the receipt'), 'error');
      return;
    }

    if (!quittance || quittance === '') {
      showToast(t('⚠️ OBLIGATOIRE : Saisissez un numéro de quittance', '⚠️ TSY AZO IHODIVIRANA : Ampidiro ny laharana taratasy', '⚠️ MANDATORY: Enter a receipt number'), 'error');
      return;
    }

    if (!facture) {
      showToast(t('Aucune facture à générer', 'Tsy misy faktiora hamoronana', 'No invoice to generate'), 'error');
      return;
    }

    try {
      setIsGenerating(true);
      showToast(t('🔄 Génération du PDF en cours...', '🔄 Mamorona PDF...', '🔄 Generating PDF...'), 'info');

      const factureData = {
        ...facture,
        montant_mensuel: montant,
        frais_dossier: fraisDossier,
        montant_retard: isRetard ? montantRetard : 0,
        is_retard: isRetard,
        uniter: uniter,
        soit_total: soitTotalCalcule,
        quittance: formatQuittanceDisplay(quittance),
        quittance_validee: quittanceValidee,
        moyens_communication: moyensCommunication,
        personne_recu: personneRecu,
      };

      const result = generateFacturePDF(factureData, false);

      if (result) {
        setPdfGenere(true);
        showToast(t('✅ PDF généré avec succès !', '✅ Vita ny PDF !', '✅ PDF generated successfully!'), 'success');
      } else {
        showToast(t('❌ Erreur lors de la génération du PDF', '❌ Nisy olana tamin\'ny famokarana PDF', '❌ PDF generation error'), 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showToast(t('❌ Erreur de génération PDF', '❌ Nisy olana tamin\'ny famokarana PDF', '❌ PDF generation error'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetour = () => {
    if (!pdfGenere) {
      showToast(t('⚠️ Veuillez d\'abord générer le PDF avant de retourner', '⚠️ Mamorona PDF aloha vao miverina', '⚠️ Please generate the PDF before returning'), 'warning');
      return;
    }
    navigate('/confirmation-dossier');
  };

  const handleMoyenCommEdit = (moyen, field, value) => {
    setMoyensCommunication(prev => ({
      ...prev,
      [moyen]: {
        ...prev[moyen],
        [field]: field === 'actif' ? value : parseFloat(value) || 0,
      },
    }));
  };

  const getTypeIcon = (type) => {
    const icons = {
      HTL: Hotel,
      MGS: Store,
      RDP: Tv2,
      TRP: Bus,
      NGT: PartyPopper,
      OCC: Ticket,
    };
    return icons[type] || Building2;
  };

  const getTypeLabel = (type) => {
    const labels = {
      HTL: t('Hôtel', 'Hotely', 'Hotel'),
      MGS: t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
      RDP: t('Radio/Télé', 'Radio/Tele', 'Radio/TV'),
      TRP: t('Transport', 'Fitaterana', 'Transport'),
      NGT: t('Night Club', 'Club alina', 'Night Club'),
      OCC: t('Occasionnel', 'Fotoana manokana', 'Occasional'),
    };
    return labels[type] || type;
  };

  const renderField = (label, value, field, type = 'text') => {
    const currentValue = isEditing ? editedFacture[field] : value;
    const displayValue = currentValue !== undefined && currentValue !== null ? currentValue : '';

    const isProtected = [
      'ref_omda', 'num_facture', 'num_facture_type', 'ref_client_type',
      'soit_total', 'montant_total',
    ].includes(field);

    const isMontantField = [
      'montant_mensuel', 'frais_dossier', 'montant_retard', 'is_retard', 'uniter', 'soit_total',
    ].includes(field);

    const canEdit = isEditing && !isProtected && !isMontantField;

    return (
      <div className="facture-field" key={field}>
        <span className="field-label">{label}</span>
        {canEdit ? (
          type === 'textarea' ? (
            <textarea
              value={displayValue}
              onChange={(e) => handleEdit(field, e.target.value)}
              className="field-input textarea"
              rows={2}
            />
          ) : type === 'select' ? (
            <select
              value={displayValue}
              onChange={(e) => handleEdit(field, e.target.value)}
              className="field-input"
            >
              <option value="DAFC">DAFC</option>
              <option value="Redevances">{t('Redevances', 'Taham-bola', 'Royalties')}</option>
              <option value="Droit d'auteur">{t('Droit d\'auteur', 'Zon\'ny mpanoratra', 'Copyright')}</option>
              <option value="Location">{t('Location', 'Fanofana', 'Rental')}</option>
              <option value="Autres">{t('Autres', 'Hafa', 'Others')}</option>
            </select>
          ) : type === 'date' ? (
            <input
              type="date"
              value={displayValue || ''}
              onChange={(e) => handleEdit(field, e.target.value)}
              className="field-input"
            />
          ) : type === 'number' ? (
            <input
              type="number"
              value={displayValue}
              onChange={(e) => handleEdit(field, parseFloat(e.target.value) || 0)}
              className="field-input"
            />
          ) : (
            <input
              type="text"
              value={displayValue}
              onChange={(e) => handleEdit(field, e.target.value)}
              className="field-input"
            />
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
        {renderField(t('Région', 'Faritra', 'Region'), data.region_usager, 'region_usager')}
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

  const isPDFReady =
    personneRecu && personneRecu.trim() !== '' &&
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
              <Edit size={18} /> {isEditing ? t('Annuler', 'Foanana', 'Cancel') : t('Modifier', 'Ovay', 'Edit')}
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
                  <select
                    value={editedFacture.type_facture || 'DAFC'}
                    onChange={(e) => handleEdit('type_facture', e.target.value)}
                    className="field-input"
                  >
                    <option value="DAFC">DAFC</option>
                    <option value="SFL">SFL</option>
                  </select>
                ) : (
                  <span className="field-value">{facture.type_facture || 'DAFC'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="facture-section">
            <h3><Building2 size={18} /> {t('Informations Client', 'Fampahalalana mpanjifa', 'Client information')}</h3>
            <div className="facture-grid">{commonFields}</div>
          </div>

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

          {specificFields && (
            <div className="facture-section">
              <h3><FileText size={18} /> {t('Informations Spécifiques', 'Fampahalalana manokana', 'Specific information')}</h3>
              <div className="facture-grid">{specificFields}</div>
            </div>
          )}

          <div className="facture-section">
            <h3><Calendar size={18} /> {t('Période', 'Fe-potoana', 'Period')}</h3>
            <div className="facture-grid">
              {renderField(t('A compter du', 'Manomboka ny', 'Starting from'), facture.a_compter_du, 'a_compter_du', 'date')}
              {renderField(t('Échéance', 'Faran\'ny fe-potoana', 'Due date'), facture.echeance, 'echeance', 'date')}
              {renderField(t('Date signature', 'Daty sonia', 'Signature date'), facture.date_signature, 'date_signature', 'date')}
            </div>
          </div>

          <div className="facture-section personne-recu-section">
            <h3>
              <UserPlus size={18} /> {t('Personne qui reçoit', 'Mpandray', 'Receiver')} <span style={{ color: 'red', fontSize: '14px' }}>*</span>
            </h3>
            <div className="personne-recu-container">
              <div className="personne-recu-input-group">
                <input
                  type="text"
                  value={personneRecu}
                  onChange={(e) => setPersonneRecu(e.target.value)}
                  placeholder={t('Saisir le nom de la personne qui reçoit (obligatoire)', 'Ampidiro ny anaran\'ny mpandray (tsy azo ihodivirana)', 'Enter the receiver name (mandatory)')}
                  className="personne-recu-input"
                  style={{
                    borderColor: personneRecu && personneRecu.trim() !== '' ? '#27ae60' : '#ddd',
                    borderWidth: personneRecu && personneRecu.trim() !== '' ? '2px' : '1px',
                  }}
                />
              </div>
              {personneRecu && personneRecu.trim() !== '' && (
                <div className="personne-recu-validee" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#2e7d32', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                  <CheckCircle size={14} color="#27ae60" />
                  <span><strong>✅ {personneRecu}</strong> - {t('Enregistré', 'Voatahiry', 'Recorded')}</span>
                </div>
              )}
              {(!personneRecu || personneRecu.trim() === '') && (
                <div className="personne-recu-requis" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#e65100', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                  <AlertCircle size={14} color="#f39c12" />
                  <span><strong>⚠️ {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}</strong> - {t('Saisissez le nom', 'Ampidiro ny anarana', 'Enter the name')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="facture-section quittance-section">
            <h3>
              <FileCheck size={18} /> {t('Quittance', 'Taratasy', 'Receipt')} <span style={{ color: 'red', fontSize: '14px' }}>*</span>
            </h3>
            <div className="quittance-container">
              <div className="quittance-input-group">
                <div className="quittance-input-wrapper">
                  <input
                    type="text"
                    value={quittance}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setQuittance(value);
                    }}
                    onBlur={() => {
                      if (quittance) {
                        setQuittance(formatQuittanceDisplay(quittance));
                      }
                    }}
                    placeholder={t('Numéro de quittance (obligatoire)', 'Laharana taratasy (tsy azo ihodivirana)', 'Receipt number (mandatory)')}
                    className="quittance-input"
                    maxLength={10}
                    style={{
                      borderColor: quittance && quittance !== '' ? '#27ae60' : '#ddd',
                      borderWidth: quittance && quittance !== '' ? '2px' : '1px',
                    }}
                  />
                </div>
              </div>

              <div className="quittance-validation">
                <label className="quittance-checkbox-label">
                  <input
                    type="checkbox"
                    checked={quittanceValidee}
                    onChange={(e) => {
                      if (!quittance || quittance === '') {
                        showToast(t('⚠️ Veuillez saisir d\'abord un numéro de quittance', '⚠️ Ampidiro aloha ny laharana taratasy', '⚠️ Please enter a receipt number first'), 'error');
                        return;
                      }
                      setQuittanceValidee(e.target.checked);
                    }}
                    className="quittance-checkbox"
                    disabled={!quittance || quittance === ''}
                  />
                  <span>
                    {t('Je confirme le numéro de quittance', 'Hamarino ny laharana taratasy', 'I confirm the receipt number')} : <strong>{quittance || '...'}</strong>
                  </span>
                </label>

                {quittanceValidee && quittance && (
                  <div className="quittance-validee-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#2e7d32', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                    <CheckCircle size={16} color="#27ae60" />
                    <span>✅ {t('Quittance validée', 'Voamarina ny taratasy', 'Receipt validated')}</span>
                  </div>
                )}
                {!quittanceValidee && quittance && (
                  <div className="quittance-non-validee-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#e65100', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                    <AlertCircle size={16} color="#f39c12" />
                    <span><strong>☑️ {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}</strong> - {t('Cochez la case pour valider la quittance', 'Tsindrio ny boaty hanamarinana ny taratasy', 'Check the box to validate the receipt')}</span>
                  </div>
                )}
                {!quittance && (
                  <div className="quittance-requis" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', marginTop: '4px', fontSize: '13px', color: '#dc3545', backgroundColor: '#fce4ec', borderRadius: '4px' }}>
                    <AlertCircle size={16} color="#dc3545" />
                    <span><strong>⚠️ {t('OBLIGATOIRE', 'TSY AZO IHODIVIRANA', 'MANDATORY')}</strong> - {t('Saisissez le numéro de quittance', 'Ampidiro ny laharana taratasy', 'Enter the receipt number')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                      {moyensCommunication.radio?.actif
                        ? (moyensCommunication.radio?.taux || 0).toLocaleString(locale) + ' Ar'
                        : notActive}
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
                      {moyensCommunication.lecteur?.actif
                        ? (moyensCommunication.lecteur?.taux || 0).toLocaleString(locale) + ' Ar'
                        : notActive}
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
                      {moyensCommunication.tv?.actif
                        ? (moyensCommunication.tv?.taux || 0).toLocaleString(locale) + ' Ar'
                        : notActive}
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
                      {moyensCommunication.autres?.actif
                        ? (moyensCommunication.autres?.taux || 0).toLocaleString(locale) + ' Ar'
                        : notActive}
                    </span>
                  </div>
                </div>
              </div>

              <div className="total-moyens-display">
                <span className="total-moyens-label">{t('Total Moyens de Communication', 'Totalin\'ny fitaovam-pifandraisana', 'Total communication means')} :</span>
                <span className="total-moyens-value">{totalMoyens.toLocaleString(locale)} Ar</span>
              </div>
            </div>
          )}

          <div className="facture-section montants">
            <h3><DollarSign size={18} /> {t('Montants', 'Vola', 'Amounts')}</h3>
            <div className="facture-grid montants-grid">
              <div className="facture-field">
                <span className="field-label">
                  {facture.ref_client_type === 'OCC'
                    ? t('Montant à payer', 'Vola haloa', 'Amount to pay')
                    : facture.ref_client_type === 'RDP'
                    ? t('Taux', 'Taha', 'Rate')
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
                  <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: '8px' }}>({t('fixe', 'raikitra', 'fixed')})</span>
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
                <span style={{ fontSize: '11px', color: '#6c757d', marginLeft: '8px' }}>
                  ({t('Montant × Uniter + Frais', 'Vola × Isan\'ny + Saram-pandraharahana', 'Amount × Unit + Fees')}{showRetard ? ` + ${t('Retard', 'Tara', 'Late')}` : ''})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="facture-footer">
          <button className="btn-save" onClick={handleSaveFacture} disabled={isSaving || !isEditing}>
            {isSaving ? (
              <><Loader2 size={18} className="spinner" /> {t('Sauvegarde...', 'Mitahiry...', 'Saving...')}</>
            ) : (
              <><Save size={18} /> {t('Sauvegarder', 'Tehirizo', 'Save')}</>
            )}
          </button>

          <button
            className="btn-generate-pdf"
            onClick={handleGeneratePDF}
            disabled={isGenerating || !isPDFReady}
            style={{
              opacity: isPDFReady ? 1 : 0.5,
              cursor: isPDFReady ? 'pointer' : 'not-allowed',
              backgroundColor: pdfGenere ? '#27ae60' : (isPDFReady ? '#28a745' : '#6c757d'),
            }}
            title={!isPDFReady
              ? t('⚠️ OBLIGATOIRE : Saisissez la personne qui reçoit et validez la quittance', '⚠️ TSY AZO IHODIVIRANA : Ampidiro ny mpandray ary hamarino ny taratasy', '⚠️ MANDATORY: Enter receiver and validate receipt')
              : t('Générer le PDF', 'Hamorona PDF', 'Generate PDF')}
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
              transition: 'all 0.3s ease',
              boxShadow: '0 3px 10px rgba(44, 62, 80, 0.25)',
            }}
            title={pdfGenere
              ? t('Retourner à la confirmation', 'Hiverina amin\'ny fanamarinana', 'Return to confirmation')
              : t('Générez d\'abord le PDF', 'Mamorona PDF aloha', 'Generate the PDF first')}
          >
            <ArrowLeft size={18} />
            {t('Retour', 'Hiverina', 'Back')}
          </button>
        </div>
      </div>
    </>
  );
};

export default GenerationFacture;