// src/pages/ajout/HotelAjout.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Building2, MapPin, FileText, Phone, Mail,
  Star, CheckCircle, CreditCard, Calendar, Clock, DollarSign,
  ArrowLeft, ArrowRight, Save, X, Edit, Hash, Radio, Tv,
  Headphones, MoreHorizontal, Briefcase, Home, PlusCircle,
  Info, BarChart,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
// ✅ Hook unique de traduction
import { useT } from '../../hooks/useT';

const HotelAjout = ({ onCancel }) => {
  const navigate = useNavigate();
  const showToast = useToast();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: null, nom: '', prefix: '',
    compteurs: { Hôtel: 0 },
    anneeEnCours: new Date().getFullYear(),
  });
  const [fraisDossier, setFraisDossier] = useState('');
  const [montant, setMontant] = useState('');
  const [uniter, setUniter] = useState(1);
  const [soitTotal, setSoitTotal] = useState(0);
  const [globalTotalCount, setGlobalTotalCount] = useState(0);

  const [regionsList, setRegionsList] = useState([]);
  const [newRegion, setNewRegion] = useState('');
  const [newRegionPhone, setNewRegionPhone] = useState('');
  const [showAddRegion, setShowAddRegion] = useState(false);

  const [hotelData, setHotelData] = useState({
    demandeur: '', denomination: '', adresseSiege: '', nifStat: '', telephone: '', email: '',
    etoiles: '', ravinala: false,
    representantNom: '', representantAdresse: '', representantTel: '', representantCin: '',
    representantCinDelivree: '', representantCinLieu: '', representantFonction: '',
    activite: '',
    moyensCommunication: {
      radio: { actif: false, taux: '' },
      lecteur: { actif: false, taux: '' },
      tv: { actif: false, taux: '' },
      autres: { actif: false, taux: '' },
    },
    total: '', aCompterDu: '', echeance: '', confirmationNom: '', dateSignature: '', lieuSignature: '',
    region: '',
  });

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
  };

  const formatNumber = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = value.toString().replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (!num) return '';
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getDisplayValue = (rawValue) => formatNumber(rawValue);

  const calculateSoitTotal = () => {
    let totalMoyens = 0;
    if (hotelData.moyensCommunication.radio.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.radio.taux) || 0;
    }
    if (hotelData.moyensCommunication.lecteur.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.lecteur.taux) || 0;
    }
    if (hotelData.moyensCommunication.tv.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.tv.taux) || 0;
    }
    if (hotelData.moyensCommunication.autres.actif) {
      const taux = parseInt(hotelData.moyensCommunication.autres.taux) || 0;
      totalMoyens += taux;
    }
    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const uniterVal = parseInt(uniter) || 1;

    const totalCalcule = (montantVal + totalMoyens) * uniterVal;
    const totalFinal = totalCalcule + fraisVal;

    setHotelData(prev => ({ ...prev, total: totalFinal.toString() }));
    return totalFinal;
  };

  useEffect(() => {
    setSoitTotal(calculateSoitTotal());
  }, [hotelData.moyensCommunication, fraisDossier, montant, uniter]);

  const getSoitTotalDisplay = () => formatNumber(soitTotal) + ' Ar';

  const getTrimestreFromMonth = (month) => {
    if (month >= 1 && month <= 4) return 1;
    if (month >= 5 && month <= 8) return 2;
    return 3;
  };

  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) return JSON.parse(userStr);
    } catch (e) { console.error(e); }
    return null;
  };

  const handleFraisDossierChange = (e) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setFraisDossier(rawValue);
      e.target.value = formatNumber(rawValue);
    }
  };

  const handleMontantChange = (e) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setMontant(rawValue);
      e.target.value = formatNumber(rawValue);
    }
  };

  const loadRegions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/regions');
      const result = await response.json();
      if (result.success) {
        setRegionsList(result.regions);
      }
    } catch (error) {
      console.error('Erreur chargement régions:', error);
    }
  };

  const loadGlobalTotal = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch(`http://localhost:3001/api/hotel/total-count?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGlobalTotalCount(data.total || 0);
        }
      } else {
        const fallbackResponse = await fetch('http://localhost:3001/api/usagers');
        if (fallbackResponse.ok) {
          const usagers = await fallbackResponse.json();
          const hotelCount = usagers.filter(u => {
            const createdAt = new Date(u.created_at);
            return u.type_usager === 'Hôtel' && createdAt.getFullYear() === currentYear;
          }).length;
          setGlobalTotalCount(hotelCount);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement total Hôtel:', error);
    }
  };

  const handleAddRegion = async () => {
    const trimmed = newRegion.trim();
    if (!trimmed) {
      showToast(t('Veuillez saisir un nom de région', 'Ampidiro anarana faritra', 'Please enter a region name'), 'error');
      return;
    }
    if (regionsList.some(r => r.nom === trimmed)) {
      showToast(t('Cette région existe déjà', 'Efa misy io faritra io', 'This region already exists'), 'error');
      return;
    }

    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      showToast(t(
        'Token administrateur manquant. Veuillez vous reconnecter.',
        'Tsy misy ny mari-pahaizana admin. Mifandraisa indray.',
        'Admin token missing. Please log in again.'
      ), 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: adminToken,
        },
        body: JSON.stringify({
          nom: trimmed,
          telephone: newRegionPhone.trim() || null,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setRegionsList([...regionsList, result.region]);
        setNewRegion('');
        setNewRegionPhone('');
        setShowAddRegion(false);
        showToast(`✅ ${t('Région ajoutée', 'Faritra nampiana', 'Region added')} : "${trimmed}"`, 'success');
        loadRegions();
      } else {
        showToast(`❌ ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur ajout région:', error);
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'), 'error');
    }
  };

  const loadUserCounters = async (userId) => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`http://localhost:3001/api/users/counters/${userId}?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.compteurs;
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement compteurs:', error);
    }
    return null;
  };

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        const compteurs = await loadUserCounters(currentUser.id);
        setUserInfo(prev => ({
          ...prev,
          id: currentUser.id,
          nom: currentUser.nom,
          prefix: currentUser.prefix || '',
          compteurs: compteurs || currentUser.compteurs || { Hôtel: 0 },
          anneeEnCours: new Date().getFullYear(),
        }));
      }
      loadRegions();
      loadGlobalTotal();
    };
    loadUserData();
  }, []);

  const handleHotelChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHotelData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleHotelMoyenCommChange = (moyen, field, value) => {
    setHotelData(prev => ({
      ...prev,
      moyensCommunication: {
        ...prev.moyensCommunication,
        [moyen]: { ...prev.moyensCommunication[moyen], [field]: value },
      },
    }));
  };

  const getTotalSteps = () => 4;
  const isLastStep = () => currentStep === getTotalSteps();

  const handlePrevStep = (e) => {
    e.preventDefault();
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNextStep = (e) => {
    e.preventDefault();

    if (currentStep === 1) {
      if (!hotelData.demandeur || !hotelData.denomination || !hotelData.region) {
        showToast(t(
          'Veuillez remplir les champs obligatoires: Demandeur, Dénomination et Région',
          'Fenoy ny saha ilaina: Mpangataka, Anarana ary Faritra',
          'Please fill required fields: Applicant, Name and Region'
        ), 'error');
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!hotelData.representantNom || !hotelData.representantCin) {
        showToast(t(
          'Veuillez remplir les infos du représentant légal',
          'Fenoy ny mombamomba ny mpisolo tena ara-dalàna',
          'Please fill the legal representative info'
        ), 'error');
        return;
      }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!hotelData.activite) {
        showToast(t(
          'Veuillez sélectionner une activité',
          'Misafidiana hetsika',
          'Please select an activity'
        ), 'error');
        return;
      }
      setCurrentStep(4);
      return;
    }
    if (currentStep === 4) {
      handleFinalSubmit();
      return;
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
      showToast(t('Erreur: Utilisateur non identifié', 'Olana: Tsy fantatra ny mpampiasa', 'Error: User not identified'), 'error');
      setIsSubmitting(false);
      return;
    }

    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const uniterVal = parseInt(uniter) || 1;

    let totalMoyens = 0;
    if (hotelData.moyensCommunication.radio.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.radio.taux) || 0;
    }
    if (hotelData.moyensCommunication.lecteur.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.lecteur.taux) || 0;
    }
    if (hotelData.moyensCommunication.tv.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.tv.taux) || 0;
    }
    if (hotelData.moyensCommunication.autres.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.autres.taux) || 0;
    }

    const totalCalcule = (montantVal + totalMoyens) * uniterVal;
    const totalFinal = totalCalcule + fraisVal;

    const finalData = {
      type: 'Hôtel',
      userId: currentUser.id,
      prefix: userInfo.prefix || currentUser.prefix || '',
      ...hotelData,
      frais_dossier: fraisVal,
      montant_mensuel: montantVal,
      montant_total: montantVal,
      soit_total: totalFinal,
      uniter: uniterVal,
    };

    try {
      const response = await fetch('http://localhost:3001/api/usagers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      const result = await response.json();

      if (result.success) {
        const updatedCompteurs = await loadUserCounters(currentUser.id);

        const updatedUser = getCurrentUser();
        if (updatedUser) {
          updatedUser.compteurs = updatedCompteurs || updatedUser.compteurs || {};
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUserInfo(prev => ({
            ...prev,
            compteurs: updatedCompteurs || prev.compteurs,
          }));
        }

        await loadGlobalTotal();

        showToast(t('✅ Hôtel ajouté avec succès !', '✅ Vita ny fampidirana Hotely !', '✅ Hotel added successfully!'), 'success');

        const nouveauCompteur = (userInfo.compteurs?.Hôtel || 0) + 1;
        const prefix = userInfo.prefix || '';
        const currentTrimestre = getTrimestreFromMonth(new Date().getMonth() + 1);
        const anneeEnCours = new Date().getFullYear();

        navigate('/confirme-paiement', {
          state: {
            usager: {
              id: result.id,
              denomination: hotelData.denomination,
              demandeur: hotelData.demandeur,
              telephone: hotelData.telephone,
              region: hotelData.region,
              adresse_siege: hotelData.adresseSiege,
              nif_stat: hotelData.nifStat,
              email: hotelData.email,
              etoiles: hotelData.etoiles,
              ravinala: hotelData.ravinala,
              activite: hotelData.activite,
              representant_nom: hotelData.representantNom,
              representant_adresse: hotelData.representantAdresse,
              representant_tel: hotelData.representantTel,
              representant_cin: hotelData.representantCin,
              representant_cin_delivree: hotelData.representantCinDelivree,
              representant_cin_lieu: hotelData.representantCinLieu,
              representant_fonction: hotelData.representantFonction,
              moyens_communication: hotelData.moyensCommunication,
              a_compter_du: hotelData.aCompterDu,
              echeance: hotelData.echeance,
              confirmation_nom: hotelData.confirmationNom,
              lieu_signature: hotelData.lieuSignature,
              date_signature: hotelData.dateSignature,
              montant_mensuel: montantVal,
              frais_dossier: fraisVal,
              montant_total: montantVal,
              soit_total: totalFinal,
              uniter: uniterVal,
              numero_dossier_utilisateur: `${prefix} ${nouveauCompteur}/${currentTrimestre}/${anneeEnCours}`,
            },
            type: 'hotel',
          },
        });
      } else {
        showToast(`❌ ${t('Erreur', 'Olana', 'Error')}: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error(error);
      showToast(t('❌ Erreur de connexion', '❌ Nisy olana tamin\'ny fifandraisana', '❌ Connection error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => {
    const nextCompteur = (userInfo.compteurs?.Hôtel || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${userInfo.prefix || ''} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    return (
      <>
        <div className="user-info-header">
          <div className="user-info-row">
            <Users size={18} strokeWidth={2} />
            <span>{t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({userInfo.prefix})</span>
          </div>
          <div className="user-info-row">
            <FileText size={18} strokeWidth={2} />
            <span>{t('Prochain dossier', 'Rakitra manaraka', 'Next file')}: <strong>{userDossierDisplay}</strong></span>
          </div>
          <div className="user-info-row" style={{ fontSize: '12px', color: '#6c757d' }}>
            <span>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Total dossiers Hôtel', 'Totalin\'ny rakitra Hotely', 'Total Hotel files')}: <strong>{globalTotalCount}</strong>
            </span>
            <span style={{ marginLeft: '15px' }}>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Vos dossiers cette année', 'Ny rakitrao ity taona ity', 'Your files this year')}: <strong>{userInfo.compteurs?.Hôtel || 0}</strong>
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Users size={18} strokeWidth={2} /> {t('Demandeur', 'Mpangataka', 'Applicant')} :</h2></div>
          <div className="form-input">
            <input type="text" name="demandeur" value={hotelData.demandeur} onChange={handleHotelChange} className="input-style" placeholder={t('Nom et prénoms du demandeur', 'Anarana sy fanampin\'anarana', 'Applicant full name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Building2 size={18} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')} :</h2></div>
          <div className="form-input">
            <input type="text" name="denomination" value={hotelData.denomination} onChange={handleHotelChange} className="input-style" placeholder={t('Nom de l\'établissement', 'Anaran\'ny trano', 'Establishment name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Adresse du Siège', 'Adiresin\'ny foibe', 'Head office address')} :</h2></div>
          <div className="form-input">
            <input type="text" name="adresseSiege" value={hotelData.adresseSiege} onChange={handleHotelChange} className="input-style" placeholder={t('Adresse complète du siège', 'Adiresy feno ny foibe', 'Full head office address')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> NIF / N° STAT :</h2></div>
          <div className="form-input">
            <input type="text" name="nifStat" value={hotelData.nifStat} onChange={handleHotelChange} className="input-style" placeholder={t('Numéro NIF ou STAT', 'Laharana NIF na STAT', 'NIF or STAT number')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Tél.', 'Finday', 'Phone')} :</h2></div>
          <div className="form-input">
            <input type="tel" name="telephone" value={hotelData.telephone} onChange={handleHotelChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Mail size={18} strokeWidth={2} /> {t('E-mail', 'Mailaka', 'Email')} :</h2></div>
          <div className="form-input">
            <input type="email" name="email" value={hotelData.email} onChange={handleHotelChange} className="input-style" placeholder={t('Adresse e-mail', 'Adiresy mailaka', 'Email address')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Star size={18} strokeWidth={2} /> {t('Catégorie', 'Sokajy', 'Category')} :</h2></div>
          <div className="form-input-horizontal">
            <div className="inline-field">
              <span>{t('Étoiles', 'Kintana', 'Stars')} :</span>
              <select name="etoiles" value={hotelData.etoiles} onChange={handleHotelChange} className="input-small">
                <option value="">-</option>
                <option value="1">⭐</option>
                <option value="2">⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="5">⭐⭐⭐⭐⭐</option>
              </select>
            </div>
            <div className="inline-field">
              <span>{t('Ravinala', 'Ravinala', 'Ravinala')} :</span>
              <label><input type="checkbox" name="ravinala" checked={hotelData.ravinala} onChange={handleHotelChange} /></label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')} :</h2></div>
          <div className="form-input" style={{ display: 'flex', gap: '10px' }}>
            <select name="region" value={hotelData.region || ''} onChange={handleHotelChange} className="input-style" style={{ flex: 1 }} required>
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
            <button type="button" onClick={() => setShowAddRegion(!showAddRegion)} className="btn-add-region">+</button>
          </div>
        </div>

        {showAddRegion && (
          <div className="form-row">
            <div className="form-label"><h2><PlusCircle size={18} strokeWidth={2} /> {t('Nouvelle région', 'Faritra vaovao', 'New region')} :</h2></div>
            <div className="form-input" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder={t('Nom de la région', 'Anaran\'ny faritra', 'Region name')}
                className="input-style"
                style={{ flex: 1, minWidth: '150px' }}
              />
              <input
                type="text"
                value={newRegionPhone}
                onChange={(e) => setNewRegionPhone(e.target.value)}
                placeholder={t('Téléphone (optionnel)', 'Finday (tsy voatery)', 'Phone (optional)')}
                className="input-style"
                style={{ flex: 1, minWidth: '150px' }}
              />
              <button type="button" onClick={handleAddRegion} className="btn-add-region-confirm">
                {t('Ajouter', 'Hanampy', 'Add')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderStep2 = () => (
    <>
      <div className="info-banner">
        <Info size={18} strokeWidth={2} />
        <span>
          {t('Demandeur', 'Mpangataka', 'Applicant')} : <strong>{hotelData.demandeur || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
          {' - '}
          {t('Dénomination', 'Anarana', 'Name')} : <strong>{hotelData.denomination || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantNom" value={hotelData.representantNom} onChange={handleHotelChange} className="input-style" placeholder={t('Nom complet du représentant', 'Anarana feno ny mpisolo tena', 'Representative full name')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Adresse', 'Adiresy', 'Address')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantAdresse" value={hotelData.representantAdresse} onChange={handleHotelChange} className="input-style" placeholder={t('Adresse du représentant', 'Adiresin\'ny mpisolo tena', 'Representative address')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
        <div className="form-input">
          <input type="tel" name="representantTel" value={hotelData.representantTel} onChange={handleHotelChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><CreditCard size={18} strokeWidth={2} /> {t('N° CIN', 'Laharana CIN', 'ID number')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantCin" value={hotelData.representantCin} onChange={handleHotelChange} className="input-style" placeholder={t('Numéro de la carte CIN', 'Laharana karatra CIN', 'ID card number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Délivrée le / Lieu', 'Nomena ny / Toerana', 'Issued on / Place')} :</h2></div>
        <div className="form-input-horizontal">
          <input type="date" name="representantCinDelivree" value={hotelData.representantCinDelivree} onChange={handleHotelChange} className="input-date" />
          <input type="text" name="representantCinLieu" value={hotelData.representantCinLieu} onChange={handleHotelChange} placeholder={t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')} className="input-lieu" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Briefcase size={18} strokeWidth={2} /> {t('Fonction', 'Asa', 'Position')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantFonction" value={hotelData.representantFonction} onChange={handleHotelChange} className="input-style" placeholder={t('Fonction du représentant', 'Asan\'ny mpisolo tena', 'Representative position')} />
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="info-banner">
        <Info size={18} strokeWidth={2} />
        <span>
          {t('Représentant', 'Mpisolo tena', 'Representative')} : <strong>{hotelData.representantNom || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
          {' - '}
          CIN : <strong>{hotelData.representantCin || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Briefcase size={18} strokeWidth={2} /> {t('Activité', 'Asa', 'Activity')} :</h2></div>
        <div className="form-input radio-group">
          <label className="radio-label">
            <input type="radio" name="activite" value="hotellerie" checked={hotelData.activite === 'hotellerie'} onChange={handleHotelChange} />
            {t('Hôtellerie', 'Hotely', 'Hospitality')}
          </label>
          <label className="radio-label">
            <input type="radio" name="activite" value="restauration" checked={hotelData.activite === 'restauration'} onChange={handleHotelChange} />
            {t('Restauration', 'Fisakafoana', 'Catering')}
          </label>
          <label className="radio-label">
            <input type="radio" name="activite" value="hotellerie_restauration" checked={hotelData.activite === 'hotellerie_restauration'} onChange={handleHotelChange} />
            {t('Hôtellerie et restauration', 'Hotely sy fisakafoana', 'Hospitality and catering')}
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Radio size={18} strokeWidth={2} /> {t('Moyen de communication', 'Fitaovam-pifandraisana', 'Communication mean')} :</h2></div>
        <div className="form-input moyens-comm">
          <div className="moyen-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={hotelData.moyensCommunication.radio.actif} onChange={(e) => handleHotelMoyenCommChange('radio', 'actif', e.target.checked)} />
              {t('Radio - Poste TSF', 'Radio - Poste TSF', 'Radio - TSF station')}
            </label>
            <div className="taux-input">
              <span>{t('Taux', 'Taha', 'Rate')} :</span>
              <input type="number" value={hotelData.moyensCommunication.radio.taux} onChange={(e) => handleHotelMoyenCommChange('radio', 'taux', e.target.value)} placeholder="Ar/an" className="input-taux" disabled={!hotelData.moyensCommunication.radio.actif} />
            </div>
          </div>
          <div className="moyen-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={hotelData.moyensCommunication.lecteur.actif} onChange={(e) => handleHotelMoyenCommChange('lecteur', 'actif', e.target.checked)} />
              {t('Lecteur', 'Mpamaky', 'Reader')}
            </label>
            <div className="taux-input">
              <span>{t('Taux', 'Taha', 'Rate')} :</span>
              <input type="number" value={hotelData.moyensCommunication.lecteur.taux} onChange={(e) => handleHotelMoyenCommChange('lecteur', 'taux', e.target.value)} placeholder="Ar/an" className="input-taux" disabled={!hotelData.moyensCommunication.lecteur.actif} />
            </div>
          </div>
          <div className="moyen-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={hotelData.moyensCommunication.tv.actif} onChange={(e) => handleHotelMoyenCommChange('tv', 'actif', e.target.checked)} />
              {t('TV', 'TV', 'TV')}
            </label>
            <div className="taux-input">
              <span>{t('Taux', 'Taha', 'Rate')} :</span>
              <input type="number" value={hotelData.moyensCommunication.tv.taux} onChange={(e) => handleHotelMoyenCommChange('tv', 'taux', e.target.value)} placeholder="Ar/an" className="input-taux" disabled={!hotelData.moyensCommunication.tv.actif} />
            </div>
          </div>
          <div className="moyen-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={hotelData.moyensCommunication.autres.actif} onChange={(e) => handleHotelMoyenCommChange('autres', 'actif', e.target.checked)} />
              {t('Autres', 'Hafa', 'Others')}
            </label>
            <div className="taux-input">
              <span>{t('Taux', 'Taha', 'Rate')} :</span>
              <input type="number" value={hotelData.moyensCommunication.autres.taux} onChange={(e) => handleHotelMoyenCommChange('autres', 'taux', e.target.value)} placeholder="Ar/an" className="input-taux" disabled={!hotelData.moyensCommunication.autres.actif} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getDisplayValue(fraisDossier)} onChange={handleFraisDossierChange} className="input-style" placeholder={t('Frais de dossier en Ar', 'Saram-pandraharahana (Ar)', 'File fees in Ar')} />
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
            ({t('fixe, non multiplié par Uniter', 'raikitra, tsy ampitomboina amin\'ny Uniter', 'fixed, not multiplied by Unit')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Hash size={18} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')} :</h2></div>
        <div className="form-input">
          <input
            type="number"
            min="1"
            value={uniter}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setUniter(isNaN(val) || val < 1 ? 1 : val);
            }}
            className="input-style"
            style={{ width: '100px' }}
            placeholder="1"
          />
          <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6c757d' }}>
            ({t('nombre d\'unités', 'isan\'ny isa', 'number of units')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Soit au Total', 'Vola Total', 'Total Amount')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getSoitTotalDisplay()} readOnly className="input-style total-field" />
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
            ({t('Montant + Moyens comm.) × Uniter + Frais', 'Vola + Fitaovam-pifandraisana) × Isan\'ny + Saram-pandraharahana', 'Amount + Comm. means) × Unit + Fees')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Edit size={18} strokeWidth={2} /> {t('Soussigné(e)', 'Mpanasonia', 'Signed by')} :</h2></div>
        <div className="form-input">
          <input type="text" name="confirmationNom" value={hotelData.confirmationNom} onChange={handleHotelChange} className="input-style" placeholder={t('Nom du signataire', 'Anaran\'ny mpanasonia', 'Signatory name')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('A compter du', 'Manomboka ny', 'Starting from')} :</h2></div>
        <div className="form-input">
          <input type="date" name="aCompterDu" value={hotelData.aCompterDu} onChange={handleHotelChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Echéance', 'Faran\'ny fe-potoana', 'Due date')} :</h2></div>
        <div className="form-input">
          <input type="date" name="echeance" value={hotelData.echeance} onChange={handleHotelChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Fait à', 'Natao tao', 'Done at')} :</h2></div>
        <div className="form-input">
          <input type="text" name="lieuSignature" value={hotelData.lieuSignature} onChange={handleHotelChange} className="input-style" placeholder={t('Lieu de signature', 'Toerana sonia', 'Signature place')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('le', 'ny', 'on')} :</h2></div>
        <div className="form-input">
          <input type="date" name="dateSignature" value={hotelData.dateSignature} onChange={handleHotelChange} className="input-style" />
        </div>
      </div>
    </>
  );

  const renderStep4 = () => {
    const nextCompteur = (userInfo.compteurs?.Hôtel || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${userInfo.prefix || ''} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const uniterVal = parseInt(uniter) || 1;

    let totalMoyens = 0;
    if (hotelData.moyensCommunication.radio.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.radio.taux) || 0;
    }
    if (hotelData.moyensCommunication.lecteur.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.lecteur.taux) || 0;
    }
    if (hotelData.moyensCommunication.tv.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.tv.taux) || 0;
    }
    if (hotelData.moyensCommunication.autres.actif) {
      totalMoyens += parseInt(hotelData.moyensCommunication.autres.taux) || 0;
    }

    const totalCalcule = (montantVal + totalMoyens) * uniterVal;
    const totalFinal = totalCalcule + fraisVal;

    // ✅ Traduction des activités
    const activiteLabel = {
      hotellerie: t('Hôtellerie', 'Hotely', 'Hospitality'),
      restauration: t('Restauration', 'Fisakafoana', 'Catering'),
      hotellerie_restauration: t('Hôtellerie et restauration', 'Hotely sy fisakafoana', 'Hospitality and catering'),
    }[hotelData.activite] || '-';

    const notActive = t('Non actif', 'Tsy mavitrika', 'Not active');

    return (
      <div className="recap-container">
        <h3>
          <CheckCircle size={20} strokeWidth={2} />{' '}
          {t('RÉCAPITULATIF - HÔTEL / RESTAURANT', 'FAMINTINANA - HOTELY / FISAKAFOANA', 'SUMMARY - HOTEL / RESTAURANT')}
        </h3>
        <div className="user-info-recap">
          <p><Users size={16} strokeWidth={2} /> {t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({userInfo.prefix})</p>
          <p><FileText size={16} strokeWidth={2} /> {t('Prochain dossier', 'Rakitra manaraka', 'Next file')}: <strong>{userDossierDisplay}</strong></p>
          <p><BarChart size={16} strokeWidth={2} /> {t('Total dossiers Hôtel', 'Totalin\'ny rakitra Hotely', 'Total Hotel files')}: <strong>{globalTotalCount}</strong></p>
          <p><BarChart size={16} strokeWidth={2} /> {t('Vos dossiers cette année', 'Ny rakitrao ity taona ity', 'Your files this year')}: <strong>{userInfo.compteurs?.Hôtel || 0}</strong></p>
        </div>
        <table className="recap-table">
          <tbody>
            <tr><td><Users size={16} strokeWidth={2} /> {t('Demandeur', 'Mpangataka', 'Applicant')}</td><td>{hotelData.demandeur || '-'}</td></tr>
            <tr><td><Building2 size={16} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')}</td><td>{hotelData.denomination || '-'}</td></tr>
            <tr><td><MapPin size={16} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')}</td><td>{hotelData.region || '-'}</td></tr>
            <tr><td><Briefcase size={16} strokeWidth={2} /> {t('Activité', 'Asa', 'Activity')}</td><td>{activiteLabel}</td></tr>
            <tr><td><FileText size={16} strokeWidth={2} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</td><td>{formatNumber(fraisVal)} Ar <span style={{ color: '#6c757d', fontSize: '12px' }}>({t('fixe', 'raikitra', 'fixed')})</span></td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}</td><td>{formatNumber(montantVal)} Ar/{t('mois', 'volana', 'month')}</td></tr>
            <tr><td><Radio size={16} strokeWidth={2} /> {t('Radio - Poste TSF', 'Radio - Poste TSF', 'Radio - TSF station')}</td><td>{hotelData.moyensCommunication.radio.actif ? formatNumber(hotelData.moyensCommunication.radio.taux || 0) + ' Ar/an' : notActive}</td></tr>
            <tr><td><Headphones size={16} strokeWidth={2} /> {t('Lecteur', 'Mpamaky', 'Reader')}</td><td>{hotelData.moyensCommunication.lecteur.actif ? formatNumber(hotelData.moyensCommunication.lecteur.taux || 0) + ' Ar/an' : notActive}</td></tr>
            <tr><td><Tv size={16} strokeWidth={2} /> TV</td><td>{hotelData.moyensCommunication.tv.actif ? formatNumber(hotelData.moyensCommunication.tv.taux || 0) + ' Ar/an' : notActive}</td></tr>
            <tr><td><MoreHorizontal size={16} strokeWidth={2} /> {t('Autres', 'Hafa', 'Others')}</td><td>{hotelData.moyensCommunication.autres.actif ? formatNumber(hotelData.moyensCommunication.autres.taux || 0) + ' Ar/an' : notActive}</td></tr>
            <tr><td><Hash size={16} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')}</td><td>{uniterVal}</td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')}</td><td><strong style={{ color: '#28a745' }}>{formatNumber(totalFinal)} Ar</strong></td></tr>
            <tr><td><User size={16} strokeWidth={2} /> {t('Représentant', 'Mpisolo tena', 'Representative')}</td><td>{hotelData.representantNom || '-'}</td></tr>
            <tr><td><CreditCard size={16} strokeWidth={2} /> CIN</td><td>{hotelData.representantCin || '-'}</td></tr>
            <tr><td><Edit size={16} strokeWidth={2} /> {t('Signataire', 'Mpanasonia', 'Signatory')}</td><td>{hotelData.confirmationNom || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  const getStepTitle = () => {
    const titles = {
      1: t('Étape 1 - Informations générales', 'Dingana 1 - Fampahalalana ankapobeny', 'Step 1 - General information'),
      2: t('Étape 2 - Représentant légal', 'Dingana 2 - Mpisolo tena ara-dalàna', 'Step 2 - Legal representative'),
      3: t('Étape 3 - Activité et calcul', 'Dingana 3 - Asa sy kajy', 'Step 3 - Activity and calculation'),
      4: t('Récapitulatif', 'Famintinana', 'Summary'),
    };
    return titles[currentStep] || `${t('Étape', 'Dingana', 'Step')} ${currentStep}`;
  };

  return (
    <form onSubmit={handleNextStep}>
      <fieldset>
        <legend>{getStepTitle()}</legend>
        {renderCurrentStep()}
        <div className="button-group">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            <X size={18} strokeWidth={2} /> {t('Annuler', 'Foanana', 'Cancel')}
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep > 1 && (
              <button type="button" className="btn-secondary" onClick={handlePrevStep}>
                <ArrowLeft size={18} strokeWidth={2} /> {t('Précédent', 'Teo aloha', 'Previous')}
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isLastStep() ? (
                isSubmitting ? (
                  <><Clock size={18} strokeWidth={2} /> {t('Envoi...', 'Mandefa...', 'Sending...')}</>
                ) : (
                  <><Save size={18} strokeWidth={2} /> {t('Valider', 'Hamarino', 'Validate')}</>
                )
              ) : (
                <><ArrowRight size={18} strokeWidth={2} /> {t('Suivant', 'Manaraka', 'Next')}</>
              )}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
};

export default HotelAjout;