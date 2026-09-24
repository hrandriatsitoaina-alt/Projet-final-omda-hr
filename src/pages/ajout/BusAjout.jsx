// src/pages/ajout/BusAjout.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Building2, MapPin, FileText, Phone, Mail,
  CreditCard, Calendar, Clock, DollarSign, Hash,
  ArrowLeft, ArrowRight, Save, X, Edit, Briefcase, Home,
  PlusCircle, Bus, Route, Navigation, Truck, CheckCircle,
  UserPlus, MapPinned, Info, BarChart,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
// ✅ Hook unique de traduction
import { useT } from '../../hooks/useT';

const BusAjout = ({ onCancel }) => {
  const navigate = useNavigate();
  const showToast = useToast();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: null, nom: '', prefix: '',
    compteurs: { Bus: 0 },
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

  const [busData, setBusData] = useState({
    demandeur: '', denomination: '', adresseSiege: '', nifStat: '', telephone: '', email: '',
    representantNom: '', representantAdresse: '', representantTel: '', representantCin: '',
    representantCinDelivree: '', representantCinLieu: '', representantFonction: '',
    nombreVehicules: '', lignes: '', typeBus: '', trajet: '', horaires: '', zonesDesservies: '',
    confirmationNom: '', dateSignature: '', lieuSignature: '',
    region: '', aCompterDu: '', echeance: '',
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
    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const uniterVal = parseInt(uniter) || 1;
    return (montantVal * uniterVal) + fraisVal;
  };

  useEffect(() => {
    setSoitTotal(calculateSoitTotal());
  }, [fraisDossier, montant, uniter]);

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
      const response = await fetch(`http://localhost:3001/api/bus/total-count?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGlobalTotalCount(data.total || 0);
          console.log(`✅ Total Bus ${currentYear}: ${data.total}`);
        }
      } else {
        const fallbackResponse = await fetch('http://localhost:3001/api/usagers');
        if (fallbackResponse.ok) {
          const usagers = await fallbackResponse.json();
          const busCount = usagers.filter(u => {
            const createdAt = new Date(u.created_at);
            return u.type_usager === 'Bus' && createdAt.getFullYear() === currentYear;
          }).length;
          setGlobalTotalCount(busCount);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement total Bus:', error);
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
          compteurs: compteurs || currentUser.compteurs || { Bus: 0 },
          anneeEnCours: new Date().getFullYear(),
        }));
      }
      loadRegions();
      loadGlobalTotal();
    };
    loadUserData();
  }, []);

  const handleBusChange = (e) => {
    const { name, value } = e.target;
    setBusData(prev => ({ ...prev, [name]: value }));
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
      if (!busData.demandeur || !busData.denomination || !busData.region) {
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
      if (!busData.representantNom || !busData.representantCin) {
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
      if (!busData.nombreVehicules || !busData.lignes || !busData.typeBus) {
        showToast(t(
          'Veuillez renseigner les infos du transport',
          'Fenoy ny mombamomba ny fitaterana',
          'Please fill transport info'
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
    const total = (montantVal * uniterVal) + fraisVal;

    const finalData = {
      type: 'Bus',
      userId: currentUser.id,
      prefix: userInfo.prefix || currentUser.prefix || '',
      ...busData,
      frais_dossier: fraisVal,
      montant_mensuel: montantVal,
      montant_total: montantVal,
      soit_total: total,
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

        showToast(t('✅ Bus ajouté avec succès !', '✅ Vita ny fampidirana Bus !', '✅ Bus added successfully!'), 'success');

        const nouveauCompteur = (userInfo.compteurs?.Bus || 0) + 1;
        const prefix = userInfo.prefix || '';
        const currentTrimestre = getTrimestreFromMonth(new Date().getMonth() + 1);
        const anneeEnCours = new Date().getFullYear();

        const usagerData = {
          id: result.id,
          denomination: busData.denomination || t('Sans nom', 'Tsy misy anarana', 'No name'),
          demandeur: busData.demandeur || '',
          telephone: busData.telephone || '',
          region: busData.region || '',
          adresse_siege: busData.adresseSiege || '',
          nif_stat: busData.nifStat || '',
          email: busData.email || '',
          representant_nom: busData.representantNom || '',
          representant_adresse: busData.representantAdresse || '',
          representant_tel: busData.representantTel || '',
          representant_cin: busData.representantCin || '',
          representant_cin_delivree: busData.representantCinDelivree || '',
          representant_cin_lieu: busData.representantCinLieu || '',
          representant_fonction: busData.representantFonction || '',
          nombre_vehicules: busData.nombreVehicules || 0,
          lignes: busData.lignes || '',
          type_bus: busData.typeBus || '',
          trajet: busData.trajet || '',
          horaires: busData.horaires || '',
          zones_desservies: busData.zonesDesservies || '',
          a_compter_du: busData.aCompterDu || '',
          echeance: busData.echeance || '',
          confirmation_nom: busData.confirmationNom || '',
          lieu_signature: busData.lieuSignature || '',
          date_signature: busData.dateSignature || '',
          montant_mensuel: montantVal,
          frais_dossier: fraisVal,
          montant_total: montantVal,
          soit_total: total,
          uniter: uniterVal,
          numero_dossier_utilisateur: `${prefix} ${nouveauCompteur}/${currentTrimestre}/${anneeEnCours}`,
        };

        navigate('/confirme-paiement', {
          state: {
            usager: usagerData,
            type: 'bus',
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
    const nextCompteur = (userInfo.compteurs?.Bus || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${userInfo.prefix || ''} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    return (
      <>
        <div className="user-info-header">
          <div className="user-info-row">
            <Users size={18} strokeWidth={2} />
            <span>
              {t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({userInfo.prefix})
            </span>
          </div>
          <div className="user-info-row">
            <FileText size={18} strokeWidth={2} />
            <span>
              {t('Prochain dossier', 'Rakitra manaraka', 'Next file')}: <strong>{userDossierDisplay}</strong>
            </span>
          </div>
          <div className="user-info-row" style={{ fontSize: '12px', color: '#6c757d' }}>
            <span>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Total dossiers Bus', 'Totalin\'ny rakitra Bus', 'Total Bus files')}: <strong>{globalTotalCount}</strong>
            </span>
            <span style={{ marginLeft: '15px' }}>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Vos dossiers cette année', 'Ny rakitrao ity taona ity', 'Your files this year')}: <strong>{userInfo.compteurs?.Bus || 0}</strong>
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Users size={18} strokeWidth={2} /> {t('Demandeur', 'Mpangataka', 'Applicant')} :</h2></div>
          <div className="form-input">
            <input type="text" name="demandeur" value={busData.demandeur} onChange={handleBusChange} className="input-style" placeholder={t('Nom et prénoms du demandeur', 'Anarana sy fanampin\'anarana', 'Applicant full name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Building2 size={18} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')} :</h2></div>
          <div className="form-input">
            <input type="text" name="denomination" value={busData.denomination} onChange={handleBusChange} className="input-style" placeholder={t('Nom de l\'entreprise', 'Anaran\'ny orinasa', 'Company name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Adresse', 'Adiresy', 'Address')} :</h2></div>
          <div className="form-input">
            <input type="text" name="adresseSiege" value={busData.adresseSiege} onChange={handleBusChange} className="input-style" placeholder={t('Adresse du siège', 'Adiresin\'ny foibe', 'Head office address')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> NIF / STAT :</h2></div>
          <div className="form-input">
            <input type="text" name="nifStat" value={busData.nifStat} onChange={handleBusChange} className="input-style" placeholder={t('Numéro NIF ou STAT', 'Laharana NIF na STAT', 'NIF or STAT number')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
          <div className="form-input">
            <input type="tel" name="telephone" value={busData.telephone} onChange={handleBusChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Mail size={18} strokeWidth={2} /> {t('E-mail', 'Mailaka', 'Email')} :</h2></div>
          <div className="form-input">
            <input type="email" name="email" value={busData.email} onChange={handleBusChange} className="input-style" placeholder={t('Adresse e-mail', 'Adiresy mailaka', 'Email address')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')} :</h2></div>
          <div className="form-input" style={{ display: 'flex', gap: '10px' }}>
            <select name="region" value={busData.region || ''} onChange={handleBusChange} className="input-style" style={{ flex: 1 }} required>
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
          {t('Demandeur', 'Mpangataka', 'Applicant')} : <strong>{busData.demandeur || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
          {' - '}
          {t('Dénomination', 'Anarana', 'Name')} : <strong>{busData.denomination || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantNom" value={busData.representantNom} onChange={handleBusChange} className="input-style" placeholder={t('Nom complet du représentant', 'Anarana feno ny mpisolo tena', 'Representative full name')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Adresse', 'Adiresy', 'Address')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantAdresse" value={busData.representantAdresse} onChange={handleBusChange} className="input-style" placeholder={t('Adresse du représentant', 'Adiresin\'ny mpisolo tena', 'Representative address')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
        <div className="form-input">
          <input type="tel" name="representantTel" value={busData.representantTel} onChange={handleBusChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><CreditCard size={18} strokeWidth={2} /> {t('N° CIN', 'Laharana CIN', 'ID number')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantCin" value={busData.representantCin} onChange={handleBusChange} className="input-style" placeholder={t('Numéro de la carte CIN', 'Laharana karatra CIN', 'ID card number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Délivrée le / Lieu', 'Nomena ny / Toerana', 'Issued on / Place')} :</h2></div>
        <div className="form-input-horizontal">
          <input type="date" name="representantCinDelivree" value={busData.representantCinDelivree} onChange={handleBusChange} className="input-date" />
          <input type="text" name="representantCinLieu" value={busData.representantCinLieu} onChange={handleBusChange} placeholder={t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')} className="input-lieu" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Briefcase size={18} strokeWidth={2} /> {t('Fonction', 'Asa', 'Position')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantFonction" value={busData.representantFonction} onChange={handleBusChange} className="input-style" placeholder={t('Fonction du représentant', 'Asan\'ny mpisolo tena', 'Representative position')} />
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="info-banner">
        <Info size={18} strokeWidth={2} />
        <span>
          {t('Représentant', 'Mpisolo tena', 'Representative')} : <strong>{busData.representantNom || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
          {' - '}
          CIN : <strong>{busData.representantCin || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Bus size={18} strokeWidth={2} /> {t('Nombre de véhicules', 'Isan\'ny fiara', 'Number of vehicles')} :</h2></div>
        <div className="form-input">
          <input type="number" name="nombreVehicules" value={busData.nombreVehicules} onChange={handleBusChange} className="input-style" placeholder={t('Nombre total de véhicules', 'Isan\'ny fiara rehetra', 'Total number of vehicles')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Route size={18} strokeWidth={2} /> {t('Nom de ligne', 'Anaran\'ny lalana', 'Line name')} :</h2></div>
        <div className="form-input">
          <input type="text" name="lignes" value={busData.lignes} onChange={handleBusChange} className="input-style" placeholder={t('Nom de la ligne', 'Anaran\'ny lalana', 'Line name')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Navigation size={18} strokeWidth={2} /> {t('Type de transport', 'Karazana fitaterana', 'Transport type')} :</h2></div>
        <div className="form-input">
          <select name="typeBus" value={busData.typeBus} onChange={handleBusChange} className="input-style" required>
            <option value="">{t('Sélectionner', 'Misafidiana', 'Select')}</option>
            <option value="Urbaine">{t('Urbaine', 'An-tanàna', 'Urban')}</option>
            <option value="Suburbain">{t('Suburbain', 'Manodidina', 'Suburban')}</option>
            <option value="National">{t('National', 'Nasionaly', 'National')}</option>
            <option value="Regional">{t('Régional', 'Faritra', 'Regional')}</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPinned size={18} strokeWidth={2} /> {t('Parcours', 'Lalana', 'Route')} :</h2></div>
        <div className="form-input">
          <input type="text" name="trajet" value={busData.trajet} onChange={handleBusChange} className="input-style" placeholder="Antananarivo → Toamasina" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Clock size={18} strokeWidth={2} /> {t('Horaires', 'Ora', 'Schedules')} :</h2></div>
        <div className="form-input">
          <input type="text" name="horaires" value={busData.horaires} onChange={handleBusChange} className="input-style" placeholder={t('Horaires de service', 'Oran\'ny serivisy', 'Service hours')} />
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
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Montant', 'Vola', 'Amount')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getDisplayValue(montant)} onChange={handleMontantChange} className="input-style" placeholder={t('Montant Ar', 'Vola (Ar)', 'Amount Ar')} />
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
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getSoitTotalDisplay()} readOnly className="input-style total-field" />
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
            ({t('Montant × Uniter + Frais de dossier', 'Vola × Isan\'ny + Saram-pandraharahana', 'Amount × Unit + File fees')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('A compter du', 'Manomboka ny', 'Starting from')} :</h2></div>
        <div className="form-input">
          <input type="date" name="aCompterDu" value={busData.aCompterDu} onChange={handleBusChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Echéance', 'Faran\'ny fe-potoana', 'Due date')} :</h2></div>
        <div className="form-input">
          <input type="date" name="echeance" value={busData.echeance} onChange={handleBusChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Edit size={18} strokeWidth={2} /> {t('Soussigné(e)', 'Mpanasonia', 'Signed by')} :</h2></div>
        <div className="form-input">
          <input type="text" name="confirmationNom" value={busData.confirmationNom} onChange={handleBusChange} className="input-style" placeholder={t('Nom du signataire', 'Anaran\'ny mpanasonia', 'Signatory name')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Fait à', 'Natao tao', 'Done at')} :</h2></div>
        <div className="form-input">
          <input type="text" name="lieuSignature" value={busData.lieuSignature} onChange={handleBusChange} className="input-style" placeholder={t('Lieu de signature', 'Toerana sonia', 'Signature place')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('le', 'ny', 'on')} :</h2></div>
        <div className="form-input">
          <input type="date" name="dateSignature" value={busData.dateSignature} onChange={handleBusChange} className="input-style" />
        </div>
      </div>
    </>
  );

  const renderStep4 = () => {
    const nextCompteur = (userInfo.compteurs?.Bus || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${userInfo.prefix || ''} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const uniterVal = parseInt(uniter) || 1;
    const total = (montantVal * uniterVal) + fraisVal;

    return (
      <div className="recap-container">
        <h3><CheckCircle size={20} strokeWidth={2} /> {t('RÉCAPITULATIF - BUS', 'FAMINTINANA - BUS', 'SUMMARY - BUS')}</h3>
        <div className="user-info-recap">
          <p><Users size={16} strokeWidth={2} /> {t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({userInfo.prefix})</p>
          <p><FileText size={16} strokeWidth={2} /> {t('Prochain dossier', 'Rakitra manaraka', 'Next file')}: <strong>{userDossierDisplay}</strong></p>
          <p><BarChart size={16} strokeWidth={2} /> {t('Total dossiers Bus', 'Totalin\'ny rakitra Bus', 'Total Bus files')}: <strong>{globalTotalCount}</strong></p>
          <p><BarChart size={16} strokeWidth={2} /> {t('Vos dossiers cette année', 'Ny rakitrao ity taona ity', 'Your files this year')}: <strong>{userInfo.compteurs?.Bus || 0}</strong></p>
        </div>
        <table className="recap-table">
          <tbody>
            <tr><td><Users size={16} strokeWidth={2} /> {t('Demandeur', 'Mpangataka', 'Applicant')}</td><td>{busData.demandeur || '-'}</td></tr>
            <tr><td><Building2 size={16} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')}</td><td>{busData.denomination || '-'}</td></tr>
            <tr><td><MapPin size={16} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')}</td><td>{busData.region || '-'}</td></tr>
            <tr><td><Bus size={16} strokeWidth={2} /> {t('Nombre véhicules', 'Isan\'ny fiara', 'Number of vehicles')}</td><td>{busData.nombreVehicules || '0'}</td></tr>
            <tr><td><Route size={16} strokeWidth={2} /> {t('Ligne', 'Lalana', 'Line')}</td><td>{busData.lignes || '-'}</td></tr>
            <tr><td><Navigation size={16} strokeWidth={2} /> {t('Type', 'Karazana', 'Type')}</td><td>{busData.typeBus || '-'}</td></tr>
            <tr><td><FileText size={16} strokeWidth={2} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</td><td>{formatNumber(fraisVal)} Ar <span style={{ color: '#6c757d', fontSize: '12px' }}>({t('fixe', 'raikitra', 'fixed')})</span></td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')}</td><td>{formatNumber(montantVal)} Ar/{t('mois', 'volana', 'month')}</td></tr>
            <tr><td><Hash size={16} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')}</td><td>{uniterVal}</td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')}</td><td><strong style={{ color: '#28a745' }}>{formatNumber(total)} Ar</strong></td></tr>
            <tr><td><User size={16} strokeWidth={2} /> {t('Représentant', 'Mpisolo tena', 'Representative')}</td><td>{busData.representantNom || '-'}</td></tr>
            <tr><td><CreditCard size={16} strokeWidth={2} /> CIN</td><td>{busData.representantCin || '-'}</td></tr>
            <tr><td><Edit size={16} strokeWidth={2} /> {t('Signataire', 'Mpanasonia', 'Signatory')}</td><td>{busData.confirmationNom || '-'}</td></tr>
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
      3: t('Étape 3 - Transport et calcul', 'Dingana 3 - Fitaterana sy kajy', 'Step 3 - Transport and calculation'),
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

export default BusAjout;