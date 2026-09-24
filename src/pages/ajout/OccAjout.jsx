// src/pages/ajout/OccAjout.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Calendar, MapPin, CreditCard, DollarSign,
  Clock, FileText, CheckCircle, AlertCircle, PlusCircle,
  UserPlus, Music, Film, Star, Heart, Camera, BookOpen,
  ArrowLeft, ArrowRight, Save, X, Eye, Edit, Trash2,
  Hash, Home, Phone, BarChart, Info,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
// ✅ Hook unique de traduction
import { useT } from '../../hooks/useT';

const OccAjout = ({ onCancel }) => {
  const navigate = useNavigate();
  const showToast = useToast();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: null, nom: '', prefix: '',
    compteurs: { OCC: 0 },
    anneeEnCours: new Date().getFullYear(),
  });
  const [fraisDossier, setFraisDossier] = useState('');
  const [montant, setMontant] = useState('');
  const [uniter, setUniter] = useState(1);
  const [soitTotal, setSoitTotal] = useState(0);
  const [globalDossierNumber, setGlobalDossierNumber] = useState('');
  const [globalTotalCount, setGlobalTotalCount] = useState(0);

  const [regionsList, setRegionsList] = useState([]);
  const [newRegion, setNewRegion] = useState('');
  const [newRegionPhone, setNewRegionPhone] = useState('');
  const [showAddRegion, setShowAddRegion] = useState(false);

  const [hasOtherArtists, setHasOtherArtists] = useState(false);
  const [otherArtistsInputs, setOtherArtistsInputs] = useState([]);

  const [isRetard, setIsRetard] = useState(false);
  const [montantRetard, setMontantRetard] = useState('');

  const [occData, setOccData] = useState({
    organisateurs: '',
    representantPar: '',
    genreManifestation: '',
    artistes: '',
    dateEvenement: '',
    lieuEvenement: '',
    representantCin: '',
    representantCinDelivree: '',
    representantCinLieu: '',
    adresse: '',
    telephone: '',
    domicile: '',
    confirmationNom: '',
    dateSignature: '',
    lieuAjout: '',
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
    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const retardVal = parseFloat(montantRetard) || 0;
    const uniterVal = parseInt(uniter) || 1;

    let total = (montantVal * uniterVal) + fraisVal;
    if (isRetard) {
      total += retardVal;
    }
    return total;
  };

  useEffect(() => {
    setSoitTotal(calculateSoitTotal());
  }, [fraisDossier, montant, uniter, isRetard, montantRetard]);

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

  const handleMontantRetardChange = (e) => {
    const rawValue = e.target.value.replace(/\s/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setMontantRetard(rawValue);
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

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        try {
          const response = await fetch('http://localhost:3001/api/auth/current-user', {
            headers: { Authorization: `Bearer ${currentUser.id}` },
          });
          const data = await response.json();
          if (data.success && data.user) {
            const countersResponse = await fetch(`http://localhost:3001/api/users/counters/${data.user.id}?year=${new Date().getFullYear()}`);
            let compteurs = { OCC: 0 };
            if (countersResponse.ok) {
              const countersData = await countersResponse.json();
              if (countersData.success) compteurs = countersData.compteurs || { OCC: 0 };
            }
            setUserInfo({
              id: data.user.id,
              nom: data.user.nom,
              prefix: data.user.prefix || '',
              compteurs: compteurs,
              anneeEnCours: new Date().getFullYear(),
            });
          } else {
            setUserInfo({
              id: currentUser.id,
              nom: currentUser.nom,
              prefix: currentUser.prefix || '',
              compteurs: currentUser.compteurs || { OCC: 0 },
              anneeEnCours: currentUser.anneeEnCours || new Date().getFullYear(),
            });
          }
        } catch (error) {
          console.error('Erreur chargement user:', error);
          setUserInfo({
            id: currentUser.id,
            nom: currentUser.nom,
            prefix: currentUser.prefix || '',
            compteurs: currentUser.compteurs || { OCC: 0 },
            anneeEnCours: currentUser.anneeEnCours || new Date().getFullYear(),
          });
        }
      }
      loadRegions();
    };
    loadUserData();

    const fetchDossierNumber = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/occ/dossier-number');
        const data = await response.json();
        if (data.success) {
          setGlobalDossierNumber(data.dossierNumber);
          setGlobalTotalCount(data.totalCount || 0);
        }
      } catch (error) { console.error(error); }
    };
    fetchDossierNumber();
  }, []);

  const handleOccChange = (e) => {
    const { name, value } = e.target;
    setOccData(prev => ({ ...prev, [name]: value }));
  };

  const handleOtherArtistsChange = (e) => {
    setHasOtherArtists(e.target.checked);
    if (!e.target.checked) setOtherArtistsInputs([]);
  };

  const handleOtherArtistsCountChange = (value) => {
    const count = parseInt(value) || 0;
    const newArtists = [];
    for (let i = 0; i < count; i++) {
      newArtists.push({ nom: '', role: '' });
    }
    setOtherArtistsInputs(newArtists);
  };

  const handleOtherArtistChange = (index, field, value) => {
    const updatedArtists = [...otherArtistsInputs];
    updatedArtists[index][field] = value;
    setOtherArtistsInputs(updatedArtists);
  };

  const getTotalSteps = () => {
    if (hasOtherArtists && otherArtistsInputs.length > 0) return 5;
    return 4;
  };

  const isLastStep = () => currentStep === getTotalSteps();

  const handlePrevStep = (e) => {
    e.preventDefault();
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const totalSteps = getTotalSteps();

    if (currentStep === 1) {
      if (!occData.organisateurs || !occData.genreManifestation || !occData.dateEvenement || !occData.lieuEvenement) {
        showToast(t(
          'Veuillez remplir les champs obligatoires: Organisateurs, Genre, Date et Lieu',
          'Fenoy ny saha ilaina: Mpikarakara, Karazana, Daty ary Toerana',
          'Please fill required fields: Organizers, Genre, Date and Location'
        ), 'error');
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!occData.representantCin) {
        showToast(t(
          'Veuillez remplir les infos CIN du représentant',
          'Fenoy ny mombamomba CIN ny mpisolo tena',
          'Please fill the representative ID info'
        ), 'error');
        return;
      }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (hasOtherArtists && otherArtistsInputs.length > 0) {
        setCurrentStep(4);
        return;
      }
      setCurrentStep(totalSteps);
      return;
    }
    if (currentStep === 4 && hasOtherArtists) {
      const allFilled = otherArtistsInputs.every(a => a.nom);
      if (!allFilled) {
        showToast(t(
          'Veuillez remplir tous les artistes supplémentaires',
          'Fenoy ny mpihira fanampiny rehetra',
          'Please fill all additional artists'
        ), 'error');
        return;
      }
      setCurrentStep(5);
      return;
    }
    if (currentStep === totalSteps) {
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

    try {
      const totalResponse = await fetch('http://localhost:3001/api/occ/total-count');
      let totalGlobal = 0;
      if (totalResponse.ok) {
        const totalData = await totalResponse.json();
        if (totalData.success) totalGlobal = totalData.total;
      }

      const globalMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const globalYear = new Date().getFullYear();
      const nouveauTotalGlobal = totalGlobal + 1;
      const numeroDossierGlobal = `${nouveauTotalGlobal}/${globalMonth}/${globalYear}`;

      const prefix = userInfo.prefix || currentUser.nom?.substring(0, 3).toUpperCase() || '';
      const compteurActuel = userInfo.compteurs?.OCC || 0;
      const nouveauCompteur = compteurActuel + 1;
      const currentMonth = new Date().getMonth() + 1;
      const currentTrimestre = getTrimestreFromMonth(currentMonth);
      const numeroDossierUtilisateur = `${prefix} ${nouveauCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

      const fraisVal = parseFloat(fraisDossier) || 0;
      const montantVal = parseFloat(montant) || 0;
      const retardVal = parseFloat(montantRetard) || 0;
      const uniterVal = parseInt(uniter) || 1;

      let total = (montantVal * uniterVal) + fraisVal;
      if (isRetard) {
        total += retardVal;
      }

      const finalData = {
        type: 'OCC',
        userId: currentUser.id,
        prefix: prefix,
        organisateurs: occData.organisateurs || '',
        representant_par: occData.representantPar || '',
        genre_manifestation: occData.genreManifestation || '',
        artistes: occData.artistes || '',
        date_evenement: occData.dateEvenement || null,
        lieu_evenement: occData.lieuEvenement || '',
        representant_cin: occData.representantCin || '',
        representant_cin_delivree: occData.representantCinDelivree || null,
        representant_cin_lieu: occData.representantCinLieu || '',
        adresse: occData.adresse || '',
        telephone: occData.telephone || '',
        domicile: occData.domicile || '',
        confirmation_nom: occData.confirmationNom || '',
        date_signature: occData.dateSignature || null,
        lieu_ajout: occData.lieuAjout || '',
        region: occData.region || '',
        otherArtistsDetail: otherArtistsInputs,
        hasOtherArtists,
        demandeur: occData.organisateurs || '',
        denomination: occData.genreManifestation || '',
        numero_dossier_global: numeroDossierGlobal,
        numero_dossier_utilisateur: numeroDossierUtilisateur,
        uniter: uniterVal,
        montant: montantVal,
        frais_dossier: fraisVal,
        montant_retard: isRetard ? retardVal : 0,
        is_retard: isRetard,
        soit_total: total,
        date_ajout: new Date().toISOString().split('T')[0],
      };

      const response = await fetch('http://localhost:3001/api/usagers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      const result = await response.json();

      if (result.success) {
        const updatedUser = getCurrentUser();
        if (updatedUser) {
          updatedUser.compteurs = updatedUser.compteurs || {};
          updatedUser.compteurs.OCC = nouveauCompteur;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUserInfo(prev => ({
            ...prev,
            compteurs: {
              ...prev.compteurs,
              OCC: nouveauCompteur,
            },
          }));
        }

        showToast(t('✅ Occasionnelle ajoutée avec succès !', '✅ Vita ny fampidirana hetsika !', '✅ Occasional added successfully!'), 'success');

        navigate('/confirme-paiement', {
          state: {
            usager: {
              id: result.id,
              denomination: occData.genreManifestation || 'OCC',
              demandeur: occData.organisateurs,
              telephone: occData.telephone,
              region: occData.region,
              adresse: occData.adresse,
              genre_manifestation: occData.genreManifestation,
              date_evenement: occData.dateEvenement,
              lieu_evenement: occData.lieuEvenement,
              organisateurs: occData.organisateurs,
              artistes: occData.artistes,
              representant_par: occData.representantPar,
              representant_cin: occData.representantCin,
              representant_cin_delivree: occData.representantCinDelivree,
              representant_cin_lieu: occData.representantCinLieu,
              numero_dossier_utilisateur: numeroDossierUtilisateur,
              numero_dossier_global: numeroDossierGlobal,
              frais_dossier: fraisVal,
              montant_total: montantVal,
              montant_retard: isRetard ? retardVal : 0,
              is_retard: isRetard,
              soit_total: total,
              uniter: uniterVal,
              confirmation_nom: occData.confirmationNom,
              lieu_ajout: occData.lieuAjout,
              date_signature: occData.dateSignature,
              domicile: occData.domicile,
            },
            type: 'occ',
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
    const globalParts = globalDossierNumber.split('/');
    const globalCount = globalParts[0] || '0';
    const globalMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const globalYear = new Date().getFullYear();
    const globalDisplay = `${globalCount}/${globalMonth}/${globalYear}`;

    const prefix = userInfo.prefix || '';
    const nextCompteur = (userInfo.compteurs?.OCC || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${prefix} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    return (
      <>
        <div className="user-info-header">
          <div className="user-info-row">
            <Users size={18} strokeWidth={2} />
            <span>{t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({prefix})</span>
          </div>
          <div className="user-info-row">
            <FileText size={18} strokeWidth={2} />
            <span>{t('Dossier Global', 'Rakitra ankapobeny', 'Global file')}: <strong>{globalDisplay}</strong></span>
            <span style={{ marginLeft: '20px', color: '#007bff' }}>{userDossierDisplay}</span>
          </div>
          <div className="user-info-row" style={{ fontSize: '12px', color: '#6c757d' }}>
            <span>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Total dossiers OCC', 'Totalin\'ny rakitra OCC', 'Total OCC files')}: <strong>{globalTotalCount || globalCount}</strong>
            </span>
            <span style={{ marginLeft: '15px' }}>
              <BarChart size={14} strokeWidth={2} />{' '}
              {t('Vos dossiers cette année', 'Ny rakitrao ity taona ity', 'Your files this year')}: <strong>{userInfo.compteurs?.OCC || 0}</strong>
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Users size={18} strokeWidth={2} /> {t('Organisateurs', 'Mpikarakara', 'Organizers')} :</h2></div>
          <div className="form-input">
            <input type="text" name="organisateurs" value={occData.organisateurs} onChange={handleOccChange} className="input-style" placeholder={t('Nom des organisateurs', 'Anaran\'ny mpikarakara', 'Organizers name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Représenté par', 'Solontenan\'ny', 'Represented by')} :</h2></div>
          <div className="form-input">
            <input type="text" name="representantPar" value={occData.representantPar} onChange={handleOccChange} className="input-style" placeholder={t('Nom du représentant', 'Anaran\'ny mpisolo tena', 'Representative name')} />
          </div>
        </div>

        <hr className="step-divider" />

        <div className="form-row">
          <div className="form-label"><h2><Music size={18} strokeWidth={2} /> {t('Genre manifestation', 'Karazana hetsika', 'Event type')} :</h2></div>
          <div className="form-input">
            <input type="text" name="genreManifestation" value={occData.genreManifestation} onChange={handleOccChange} className="input-style" placeholder={t('Ex: Concert, Spectacle, Festival', 'Oh: Concert, Spectacle, Festival', 'E.g. Concert, Show, Festival')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Star size={18} strokeWidth={2} /> {t('Artiste', 'Mpihira', 'Artist')} :</h2></div>
          <div className="form-input">
            <input type="text" name="artistes" value={occData.artistes} onChange={handleOccChange} className="input-style" placeholder={t('Nom de l\'artiste principal', 'Anaran\'ny mpihira lehibe', 'Main artist name')} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><PlusCircle size={18} strokeWidth={2} /> {t('Autre artiste', 'Mpihira hafa', 'Other artist')} :</h2></div>
          <div className="form-input">
            <label className="checkbox-label">
              <input type="checkbox" checked={hasOtherArtists} onChange={handleOtherArtistsChange} />
              {t('Ajouter d\'autres artistes', 'Manampy mpihira hafa', 'Add other artists')}
            </label>
          </div>
        </div>

        {hasOtherArtists && (
          <div className="form-row">
            <div className="form-label"><h2><Users size={18} strokeWidth={2} /> {t('Nombre d\'artistes', 'Isan\'ny mpihira', 'Number of artists')} :</h2></div>
            <div className="form-input">
              <input type="number" onChange={(e) => handleOtherArtistsCountChange(e.target.value)} className="input-style" placeholder={t('Nombre d\'artistes supplémentaires', 'Isan\'ny mpihira fanampiny', 'Number of additional artists')} min="1" />
            </div>
          </div>
        )}

        {hasOtherArtists && otherArtistsInputs.map((artist, idx) => (
          <div key={idx} className="artist-card">
            <h4><Music size={16} strokeWidth={2} /> {t('Artiste', 'Mpihira', 'Artist')} {idx + 1}</h4>
            <div className="form-row">
              <div className="form-label"><h2>{t('Nom', 'Anarana', 'Name')} :</h2></div>
              <div className="form-input">
                <input type="text" placeholder={t('Nom d\'artiste', 'Anaran\'ny mpihira', 'Artist name')} value={artist.nom} onChange={(e) => handleOtherArtistChange(idx, 'nom', e.target.value)} className="input-style" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-label"><h2>{t('Rôle', 'Andraikitra', 'Role')} :</h2></div>
              <div className="form-input">
                <input type="text" placeholder={t('Chanteur, Musicien, DJ', 'Mpihira, Mpilalao zavamaneno, DJ', 'Singer, Musician, DJ')} value={artist.role} onChange={(e) => handleOtherArtistChange(idx, 'role', e.target.value)} className="input-style" />
              </div>
            </div>
          </div>
        ))}

        <div className="form-row">
          <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Date', 'Daty', 'Date')} :</h2></div>
          <div className="form-input">
            <input type="date" name="dateEvenement" value={occData.dateEvenement} onChange={handleOccChange} className="input-style" required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Lieu', 'Toerana', 'Location')} :</h2></div>
          <div className="form-input">
            <input type="text" name="lieuEvenement" value={occData.lieuEvenement} onChange={handleOccChange} className="input-style" placeholder={t('Lieu de l\'événement', 'Toeran\'ny hetsika', 'Event location')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')} :</h2></div>
          <div className="form-input" style={{ display: 'flex', gap: '10px' }}>
            <select name="region" value={occData.region || ''} onChange={handleOccChange} className="input-style" style={{ flex: 1 }}>
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
          {t('Organisateur', 'Mpikarakara', 'Organizer')} : <strong>{occData.organisateurs || t('Non renseigné', 'Tsy voafaritra', 'Not specified')}</strong>
        </span>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><CreditCard size={18} strokeWidth={2} /> {t('CIN du représentant', 'CIN ny mpisolo tena', 'Representative ID')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantCin" value={occData.representantCin} onChange={handleOccChange} className="input-style" placeholder={t('Numéro de la carte CIN', 'Laharana karatra CIN', 'ID card number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Délivré le', 'Nomena ny', 'Issued on')} :</h2></div>
        <div className="form-input">
          <input type="date" name="representantCinDelivree" value={occData.representantCinDelivree} onChange={handleOccChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('à', 'any', 'at')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantCinLieu" value={occData.representantCinLieu} onChange={handleOccChange} className="input-style" placeholder={t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Adresse', 'Adiresy', 'Address')} :</h2></div>
        <div className="form-input">
          <input type="text" name="adresse" value={occData.adresse} onChange={handleOccChange} className="input-style" placeholder={t('Adresse complète', 'Adiresy feno', 'Full address')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Contact', 'Fifandraisana', 'Contact')} :</h2></div>
        <div className="form-input">
          <input type="tel" name="telephone" value={occData.telephone} onChange={handleOccChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Domicile', 'Fonenana', 'Residence')} :</h2></div>
        <div className="form-input">
          <input type="text" name="domicile" value={occData.domicile} onChange={handleOccChange} className="input-style" placeholder={t('Domicile (quartier, ville)', 'Fonenana (faritra, tanàna)', 'Residence (district, city)')} />
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
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
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Montant à payer', 'Vola haloa', 'Amount to pay')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getDisplayValue(montant)} onChange={handleMontantChange} className="input-style" placeholder={t('Montant total en Ar', 'Vola total (Ar)', 'Total amount in Ar')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Hash size={18} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')} :</h2></div>
        <div className="form-input">
          <input
            type="number"
            min="1"
            value={uniter}
            onChange={(e) => setUniter(Math.max(1, parseInt(e.target.value) || 1))}
            className="input-style"
            style={{ width: '80px' }}
            placeholder="1"
          />
          <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6c757d' }}>
            ({t('nombre d\'unités', 'isan\'ny isa', 'number of units')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Clock size={18} strokeWidth={2} /> {t('Cas de retard', 'Tranga tara', 'Late case')} :</h2></div>
        <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={isRetard} onChange={(e) => setIsRetard(e.target.checked)} />
            {t('Appliquer une pénalité de retard', 'Hampiharina ny sazy tara', 'Apply a late penalty')}
          </label>
          {isRetard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{t('Pénalité', 'Sazy', 'Penalty')} :</span>
              <input
                type="text"
                value={getDisplayValue(montantRetard)}
                onChange={handleMontantRetardChange}
                className="input-style"
                placeholder={t('Montant de la pénalité (Ar)', 'Vola sazy (Ar)', 'Penalty amount (Ar)')}
                style={{ width: '180px' }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getSoitTotalDisplay()} readOnly className="input-style total-field" />
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
            ({t('Montant × Uniter + Frais + Retard', 'Vola × Isan\'ny + Saram-pandraharahana + Tara', 'Amount × Unit + Fees + Late')})
          </span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Edit size={18} strokeWidth={2} /> {t('Je soussigné(e) Mr/Mme', 'Izaho mpanasonia ', 'I, the undersigned Mr/Mrs')} :</h2></div>
        <div className="form-input">
          <input type="text" name="confirmationNom" value={occData.confirmationNom} onChange={handleOccChange} className="input-style" placeholder={t('Nom du signataire', 'Anaran\'ny mpanasonia', 'Signatory name')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Date', 'Daty', 'Date')} :</h2></div>
        <div className="form-input">
          <input type="date" name="dateSignature" value={occData.dateSignature} onChange={handleOccChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Lieu et date', 'Toerana sy daty', 'Place and date')} :</h2></div>
        <div className="form-input">
          <input type="text" name="lieuAjout" value={occData.lieuAjout} onChange={handleOccChange} className="input-style" placeholder={t('Lieu et date de signature', 'Toerana sy daty nanaovana sonia', 'Place and date of signature')} />
        </div>
      </div>
    </>
  );

  const renderStep4 = () => {
    const globalParts = globalDossierNumber.split('/');
    const globalCount = globalParts[0] || '0';
    const globalMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const globalYear = new Date().getFullYear();
    const globalDisplay = `${globalCount}/${globalMonth}/${globalYear}`;

    const prefix = userInfo.prefix || '';
    const nextCompteur = (userInfo.compteurs?.OCC || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${prefix} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    const fraisVal = parseFloat(fraisDossier) || 0;
    const montantVal = parseFloat(montant) || 0;
    const retardVal = parseFloat(montantRetard) || 0;
    const uniterVal = parseInt(uniter) || 1;

    let total = (montantVal * uniterVal) + fraisVal;
    if (isRetard) {
      total += retardVal;
    }

    return (
      <div className="recap-container">
        <h3>
          <CheckCircle size={20} strokeWidth={2} />{' '}
          {t('RÉCAPITULATIF - OCCASIONNELLE', 'FAMINTINANA - HETSIKA', 'SUMMARY - OCCASIONAL')}
        </h3>
        <div className="user-info-recap">
          <p><Users size={16} strokeWidth={2} /> {t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({prefix})</p>
          <p><FileText size={16} strokeWidth={2} /> {t('Dossiers déjà créés cette année', 'Rakitra efa vita ity taona ity', 'Files already created this year')}: <strong>{userInfo.compteurs?.OCC || 0}</strong></p>
          <p><BarChart size={16} strokeWidth={2} /> {t('Total Global OCC', 'Totalin\'ny OCC', 'OCC Global Total')}: <strong>{globalTotalCount || globalCount}</strong></p>
          <p>
            <Clock size={16} strokeWidth={2} /> {t('Cas de retard', 'Tranga tara', 'Late case')}: <strong>{isRetard ? t('Oui', 'Eny', 'Yes') : t('Non', 'Tsia', 'No')}</strong>{' '}
            {isRetard && `(${t('Pénalité', 'Sazy', 'Penalty')}: ${formatNumber(montantRetard)} Ar)`}
          </p>
        </div>
        <table className="recap-table">
          <tbody>
            <tr><td><FileText size={16} strokeWidth={2} /> {t('Dossier Global N°', 'Rakitra ankapobeny N°', 'Global file N°')} {globalDisplay}</td><td><strong>{userDossierDisplay}</strong></td></tr>
            <tr><td><Users size={16} strokeWidth={2} /> {t('Organisateurs', 'Mpikarakara', 'Organizers')}</td><td>{occData.organisateurs || '-'}</td></tr>
            <tr><td><User size={16} strokeWidth={2} /> {t('Représenté par', 'Solontenan\'ny', 'Represented by')}</td><td>{occData.representantPar || '-'}</td></tr>
            <tr><td><Music size={16} strokeWidth={2} /> {t('Genre manifestation', 'Karazana hetsika', 'Event type')}</td><td>{occData.genreManifestation || '-'}</td></tr>
            <tr><td><Star size={16} strokeWidth={2} /> {t('Artiste principal', 'Mpihira lehibe', 'Main artist')}</td><td>{occData.artistes || '-'}</td></tr>
            <tr><td><Calendar size={16} strokeWidth={2} /> {t('Date', 'Daty', 'Date')}</td><td>{occData.dateEvenement || '-'}</td></tr>
            <tr><td><MapPin size={16} strokeWidth={2} /> {t('Lieu', 'Toerana', 'Location')}</td><td>{occData.lieuEvenement || '-'}</td></tr>
            <tr><td><CreditCard size={16} strokeWidth={2} /> CIN</td><td>{occData.representantCin || '-'}</td></tr>
            <tr><td><MapPin size={16} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')}</td><td>{occData.region || '-'}</td></tr>
            <tr><td><FileText size={16} strokeWidth={2} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</td><td>{formatNumber(fraisVal)} Ar</td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Montant à payer', 'Vola haloa', 'Amount to pay')}</td><td>{formatNumber(montantVal)} Ar</td></tr>
            <tr><td><Hash size={16} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')}</td><td>{uniterVal}</td></tr>
            <tr><td><Clock size={16} strokeWidth={2} /> {t('Pénalité retard', 'Sazy tara', 'Late penalty')}</td><td>{isRetard ? formatNumber(retardVal) + ' Ar' : '-'}</td></tr>
            <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')}</td><td><strong style={{ color: '#28a745' }}>{formatNumber(total)} Ar</strong></td></tr>
            <tr><td><Edit size={16} strokeWidth={2} /> {t('Signataire', 'Mpanasonia', 'Signatory')}</td><td>{occData.confirmationNom || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="recap-container">
      <h3>
        <Music size={20} strokeWidth={2} /> {t('ARTISTES SUPPLÉMENTAIRES', 'MPIHIRA FANAMPINY', 'ADDITIONAL ARTISTS')}
      </h3>
      <table className="recap-table">
        <thead>
          <tr><th>#</th><th>{t('Nom', 'Anarana', 'Name')}</th><th>{t('Rôle', 'Andraikitra', 'Role')}</th></tr>
        </thead>
        <tbody>
          {otherArtistsInputs.map((a, i) => (
            <tr key={i}><td>{i + 1}</td><td>{a.nom || '-'}</td><td>{a.role || '-'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: if (hasOtherArtists) return renderStep5();
      default: return null;
    }
  };

  const getStepTitle = () => {
    const titles = {
      1: t('Étape 1 - Informations générales', 'Dingana 1 - Fampahalalana ankapobeny', 'Step 1 - General information'),
      2: t('Étape 2 - Représentant', 'Dingana 2 - Mpisolo tena', 'Step 2 - Representative'),
      3: t('Étape 3 - Calcul', 'Dingana 3 - Kajy', 'Step 3 - Calculation'),
      4: t('Récapitulatif', 'Famintinana', 'Summary'),
      5: t('Artistes supplémentaires', 'Mpihira fanampiny', 'Additional artists'),
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

export default OccAjout;