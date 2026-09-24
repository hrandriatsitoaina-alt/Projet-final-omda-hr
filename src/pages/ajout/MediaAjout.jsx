// src/pages/ajout/MediaAjout.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Building2, MapPin, FileText, Phone, Mail,
  CreditCard, Calendar, Clock, DollarSign, Hash,
  ArrowLeft, ArrowRight, Save, X, Edit, Briefcase, Home,
  PlusCircle, Radio, Tv, Antenna, Globe, Layers, CheckCircle,
  UserPlus, Headphones, Sparkles, Monitor, Mic, Music,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
// ✅ Hook unique de traduction
import { useT } from '../../hooks/useT';

const MediaAjout = ({ onCancel }) => {
  const navigate = useNavigate();
  const showToast = useToast();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: null, nom: '', prefix: '',
    compteurs: { 'Télé/Radio': 0 },
    anneeEnCours: new Date().getFullYear(),
  });
  const [fraisDossier, setFraisDossier] = useState('');
  const [uniter, setUniter] = useState(1);
  const [soitTotal, setSoitTotal] = useState(0);

  const [regionsList, setRegionsList] = useState([]);
  const [newRegion, setNewRegion] = useState('');
  const [newRegionPhone, setNewRegionPhone] = useState('');
  const [showAddRegion, setShowAddRegion] = useState(false);

  const [mediaData, setMediaData] = useState({
    proprietaireNom: '', proprietaireAdresse: '', proprietaireTel: '', proprietaireCin: '',
    proprietaireCinDelivree: '', proprietaireCinLieu: '',
    representantNom: '', representantAdresse: '', representantTel: '', representantCin: '',
    representantCinDelivree: '', representantCinLieu: '',
    representantPouvoirDate: '', representantPouvoirPar: '', representantFonction: '',
    denomination: '', frequence: '', canal: '', siege: '', telephone: '', email: '',
    nif: '', stat: '', taux: '',
    couvertureCapitale: false, couvertureChefLieuProvince: false,
    couvertureChefLieuRegion: false, couvertureDistrict: false,
    horairesJusqua12: false, horaires13a24: false,
    confirmationNom: '', dateSignature: '', lieuSignature: '',
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

  // ✅ CALCUL
  useEffect(() => {
    const tauxVal = parseFloat(mediaData.taux) || 0;
    const fraisVal = parseFloat(fraisDossier) || 0;
    const uniterVal = parseInt(uniter) || 1;

    const totalFinal = (tauxVal * uniterVal) + fraisVal;
    setSoitTotal(totalFinal);
  }, [mediaData.taux, fraisDossier, uniter]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUserInfo(prev => ({
        ...prev,
        id: currentUser.id,
        nom: currentUser.nom,
        prefix: currentUser.prefix,
        compteurs: currentUser.compteurs || { 'Télé/Radio': 0 },
        anneeEnCours: currentUser.anneeEnCours || new Date().getFullYear(),
      }));
    }
    loadRegions();
  }, []);

  const handleMediaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMediaData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      if (!mediaData.proprietaireNom || !mediaData.proprietaireCin || !mediaData.proprietaireAdresse || !mediaData.proprietaireTel) {
        showToast(t(
          'Veuillez remplir tous les champs du propriétaire',
          'Fenoy ny saha rehetra momba ny tompony',
          'Please fill all owner fields'
        ), 'error');
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!mediaData.representantNom || !mediaData.representantCin || !mediaData.representantAdresse || !mediaData.representantTel) {
        showToast(t(
          'Veuillez remplir tous les champs du représentant légal',
          'Fenoy ny saha rehetra momba ny mpisolo tena ara-dalàna',
          'Please fill all legal representative fields'
        ), 'error');
        return;
      }
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!mediaData.denomination || !mediaData.frequence || !mediaData.siege || !mediaData.telephone || !mediaData.taux) {
        showToast(t(
          'Veuillez remplir tous les champs de la station',
          'Fenoy ny saha rehetra momba ny station',
          'Please fill all station fields'
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
    const tauxVal = parseFloat(mediaData.taux) || 0;
    const uniterVal = parseInt(uniter) || 1;

    const totalFinal = (tauxVal * uniterVal) + fraisVal;

    const finalData = {
      type: 'Télé/Radio',
      userId: currentUser.id,
      prefix: userInfo.prefix || currentUser.prefix || '',
      ...mediaData,
      frais_dossier: fraisVal,
      montant_mensuel: totalFinal,
      montant_total: totalFinal,
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
        const updatedUser = getCurrentUser();
        if (updatedUser) {
          updatedUser.compteurs = updatedUser.compteurs || {};
          const nouveauCompteur = (updatedUser.compteurs['Télé/Radio'] || 0) + 1;
          updatedUser.compteurs['Télé/Radio'] = nouveauCompteur;
          localStorage.setItem('user', JSON.stringify(updatedUser));

          setUserInfo(prev => ({
            ...prev,
            compteurs: {
              ...prev.compteurs,
              'Télé/Radio': nouveauCompteur,
            },
          }));
        }

        showToast(t('✅ Télé/Radio ajouté avec succès !', '✅ Vita ny fampidirana Tele/Radio !', '✅ TV/Radio added successfully!'), 'success');

        navigate('/confirme-paiement', {
          state: {
            usager: {
              id: result.id,
              denomination: mediaData.denomination,
              demandeur: mediaData.proprietaireNom,
              telephone: mediaData.telephone,
              region: mediaData.region,
              adresse_siege: mediaData.siege,
              email: mediaData.email,
              proprietaire_nom: mediaData.proprietaireNom,
              proprietaire_adresse: mediaData.proprietaireAdresse,
              proprietaire_tel: mediaData.proprietaireTel,
              proprietaire_cin: mediaData.proprietaireCin,
              proprietaire_cin_delivree: mediaData.proprietaireCinDelivree,
              proprietaire_cin_lieu: mediaData.proprietaireCinLieu,
              representant_nom: mediaData.representantNom,
              representant_adresse: mediaData.representantAdresse,
              representant_tel: mediaData.representantTel,
              representant_cin: mediaData.representantCin,
              representant_cin_delivree: mediaData.representantCinDelivree,
              representant_cin_lieu: mediaData.representantCinLieu,
              representant_pouvoir_date: mediaData.representantPouvoirDate,
              representant_pouvoir_par: mediaData.representantPouvoirPar,
              representant_fonction: mediaData.representantFonction,
              frequence: mediaData.frequence,
              canal: mediaData.canal,
              siege: mediaData.siege,
              nif: mediaData.nif,
              stat: mediaData.stat,
              taux: tauxVal,
              couverture_capitale: mediaData.couvertureCapitale,
              couverture_chef_lieu_province: mediaData.couvertureChefLieuProvince,
              couverture_chef_lieu_region: mediaData.couvertureChefLieuRegion,
              couverture_district: mediaData.couvertureDistrict,
              horaires_jusqua12: mediaData.horairesJusqua12,
              horaires_13a24: mediaData.horaires13a24,
              confirmation_nom: mediaData.confirmationNom,
              lieu_signature: mediaData.lieuSignature,
              date_signature: mediaData.dateSignature,
              montant_mensuel: totalFinal,
              frais_dossier: fraisVal,
              montant_total: totalFinal,
              soit_total: totalFinal,
              uniter: uniterVal,
              numero_dossier_utilisateur: `${userInfo.prefix || ''} ${(userInfo.compteurs?.['Télé/Radio'] || 0) + 1}/${getTrimestreFromMonth(new Date().getMonth() + 1)}/${userInfo.anneeEnCours || new Date().getFullYear()}`,
            },
            type: 'media',
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
    const nextCompteur = (userInfo.compteurs?.['Télé/Radio'] || 0) + 1;
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
        </div>

        <div className="form-section-title">
          <UserPlus size={18} strokeWidth={2} />{' '}
          {t(
            '1) RENSEIGNEMENTS SUR LE PROPRIETAIRE DE LA STATION',
            '1) FAMPAHALALANA MOMBA NY TOMPON\'NY STATION',
            '1) INFORMATION ABOUT THE STATION OWNER'
          )} :
        </div>

        <div className="form-row">
          <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} :</h2></div>
          <div className="form-input">
            <input type="text" name="proprietaireNom" value={mediaData.proprietaireNom} onChange={handleMediaChange} className="input-style" placeholder={t('Nom et prénoms du propriétaire', 'Anarana sy fanampin\'anarana ny tompony', 'Owner full name')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Adresse (domicile)', 'Adiresy (fonenana)', 'Address (home)')} :</h2></div>
          <div className="form-input">
            <input type="text" name="proprietaireAdresse" value={mediaData.proprietaireAdresse} onChange={handleMediaChange} className="input-style" placeholder={t('Adresse du propriétaire', 'Adiresin\'ny tompony', 'Owner address')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
          <div className="form-input">
            <input type="tel" name="proprietaireTel" value={mediaData.proprietaireTel} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><CreditCard size={18} strokeWidth={2} /> {t('N° CIN', 'Laharana CIN', 'ID number')} :</h2></div>
          <div className="form-input">
            <input type="text" name="proprietaireCin" value={mediaData.proprietaireCin} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro de la carte CIN', 'Laharana karatra CIN', 'ID card number')} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Délivrée le', 'Nomena ny', 'Issued on')} :</h2></div>
          <div className="form-input-horizontal">
            <input type="date" name="proprietaireCinDelivree" value={mediaData.proprietaireCinDelivree} onChange={handleMediaChange} className="input-date" />
            <span style={{ margin: '0 8px' }}>{t('à', 'any', 'at')}</span>
            <input type="text" name="proprietaireCinLieu" value={mediaData.proprietaireCinLieu} onChange={handleMediaChange} placeholder={t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')} className="input-lieu" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')} :</h2></div>
          <div className="form-input" style={{ display: 'flex', gap: '10px' }}>
            <select name="region" value={mediaData.region || ''} onChange={handleMediaChange} className="input-style" style={{ flex: 1 }} required>
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
      <div className="form-section-title">
        <UserPlus size={18} strokeWidth={2} />{' '}
        {t(
          '2) RENSEIGNEMENTS SUR LE REPRESENTANT LEGAL',
          '2) FAMPAHALALANA MOMBA NY MPISOLO TENA ARA-DALÀNA',
          '2) INFORMATION ABOUT THE LEGAL REPRESENTATIVE'
        )} :
      </div>

      <div className="form-row">
        <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantNom" value={mediaData.representantNom} onChange={handleMediaChange} className="input-style" placeholder={t('Nom et prénoms du représentant', 'Anarana sy fanampin\'anarana ny mpisolo tena', 'Representative full name')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Home size={18} strokeWidth={2} /> {t('Adresse (domicile)', 'Adiresy (fonenana)', 'Address (home)')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantAdresse" value={mediaData.representantAdresse} onChange={handleMediaChange} className="input-style" placeholder={t('Adresse du représentant', 'Adiresin\'ny mpisolo tena', 'Representative address')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
        <div className="form-input">
          <input type="tel" name="representantTel" value={mediaData.representantTel} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><CreditCard size={18} strokeWidth={2} /> {t('N° CIN', 'Laharana CIN', 'ID number')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantCin" value={mediaData.representantCin} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro de la carte CIN', 'Laharana karatra CIN', 'ID card number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Délivrée le', 'Nomena ny', 'Issued on')} :</h2></div>
        <div className="form-input-horizontal">
          <input type="date" name="representantCinDelivree" value={mediaData.representantCinDelivree} onChange={handleMediaChange} className="input-date" />
          <span style={{ margin: '0 8px' }}>{t('à', 'any', 'at')}</span>
          <input type="text" name="representantCinLieu" value={mediaData.representantCinLieu} onChange={handleMediaChange} placeholder={t('Lieu de délivrance', 'Toerana nanomezana', 'Place of issue')} className="input-lieu" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> {t('Pouvoir donné le', 'Fahefana ', 'Power given on')} :</h2></div>
        <div className="form-input-horizontal">
          <input type="date" name="representantPouvoirDate" value={mediaData.representantPouvoirDate} onChange={handleMediaChange} className="input-date" />
          <span style={{ margin: '0 8px' }}>{t('par', 'avy', 'by')}</span>
          <input type="text" name="representantPouvoirPar" value={mediaData.representantPouvoirPar} onChange={handleMediaChange} placeholder={t('Nom', 'Anarana', 'Name')} className="input-lieu" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Briefcase size={18} strokeWidth={2} /> {t('Fonction', 'Asa', 'Position')} :</h2></div>
        <div className="form-input">
          <input type="text" name="representantFonction" value={mediaData.representantFonction} onChange={handleMediaChange} className="input-style" placeholder={t('Fonction du représentant', 'Asan\'ny mpisolo tena', 'Representative position')} />
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* CSS dans le JSX — inchangé */}
      <style>{`
        .checkbox-group-modern {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          padding: 8px 0;
          width: 100%;
        }
        .checkbox-label-modern {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #f8f9fa;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s ease;
          font-size: 14px;
          font-weight: 500;
          color: #495057;
          user-select: none;
        }
        .checkbox-label-modern:hover {
          background: #eef4ff;
          border-color: #4A90D9;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(74, 144, 217, 0.15);
        }
        .checkbox-label-modern input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #4A90D9;
          cursor: pointer;
          flex-shrink: 0;
        }
        .checkbox-label-modern.checked {
          background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%);
          border-color: #4A90D9;
          color: #1a5490;
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(74, 144, 217, 0.2);
        }
        .checkbox-label-modern.checked::after {
          content: '✓';
          margin-left: auto;
          color: #27ae60;
          font-weight: bold;
          font-size: 16px;
        }
        .checkbox-label-modern.horaire.checked {
          background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%);
          border-color: #4A90D9;
          color: #1a5490;
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(74, 144, 217, 0.2);
        }
        .checkbox-label-modern.horaire.checked::after {
          color: #27ae60;
        }
        .checkbox-label-modern.horaire:hover {
          background: #eef4ff;
          border-color: #4A90D9;
          box-shadow: 0 3px 8px rgba(74, 144, 217, 0.15);
        }
      `}</style>

      <div className="form-section-title">
        <Monitor size={18} strokeWidth={2} />{' '}
        {t(
          '3) RENSEIGNEMENTS SUR LA STATION RADIO/TV',
          '3) FAMPAHALALANA MOMBA NY STATION RADIO/TV',
          '3) INFORMATION ABOUT THE RADIO/TV STATION'
        )} :
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Building2 size={18} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')} :</h2></div>
        <div className="form-input">
          <input type="text" name="denomination" value={mediaData.denomination} onChange={handleMediaChange} className="input-style" placeholder={t('Nom de la station', 'Anaran\'ny station', 'Station name')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Radio size={18} strokeWidth={2} /> {t('Fréquence', 'Fahita', 'Frequency')} :</h2></div>
        <div className="form-input">
          <input type="text" name="frequence" value={mediaData.frequence} onChange={handleMediaChange} className="input-style" placeholder="Ex: 101.5 FM" required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Tv size={18} strokeWidth={2} /> {t('Canal', 'Fantsona', 'Channel')} :</h2></div>
        <div className="form-input">
          <input type="text" name="canal" value={mediaData.canal} onChange={handleMediaChange} className="input-style" placeholder={t('Canal (ex: Canal 4)', 'Fantsona (oh: Canal 4)', 'Channel (e.g. Channel 4)')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('Siège', 'Foibe', 'Head office')} :</h2></div>
        <div className="form-input">
          <input type="text" name="siege" value={mediaData.siege} onChange={handleMediaChange} className="input-style" placeholder={t('Adresse du siège social', 'Adiresin\'ny foibe', 'Head office address')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Phone size={18} strokeWidth={2} /> {t('Téléphone', 'Finday', 'Phone')} :</h2></div>
        <div className="form-input">
          <input type="tel" name="telephone" value={mediaData.telephone} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro de téléphone', 'Laharana finday', 'Phone number')} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Mail size={18} strokeWidth={2} /> {t('E-mail', 'Mailaka', 'Email')} :</h2></div>
        <div className="form-input">
          <input type="email" name="email" value={mediaData.email} onChange={handleMediaChange} className="input-style" placeholder={t('Adresse e-mail', 'Adiresy mailaka', 'Email address')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> NIF :</h2></div>
        <div className="form-input">
          <input type="text" name="nif" value={mediaData.nif} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro NIF', 'Laharana NIF', 'NIF number')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><FileText size={18} strokeWidth={2} /> STAT :</h2></div>
        <div className="form-input">
          <input type="text" name="stat" value={mediaData.stat} onChange={handleMediaChange} className="input-style" placeholder={t('Numéro STAT', 'Laharana STAT', 'STAT number')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Taux', 'Taha', 'Rate')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getDisplayValue(mediaData.taux)} onChange={(e) => {
            const rawValue = e.target.value.replace(/\s/g, '');
            if (rawValue === '' || /^\d+$/.test(rawValue)) {
              setMediaData(prev => ({ ...prev, taux: rawValue }));
              e.target.value = formatNumber(rawValue);
            }
          }} className="input-style" required placeholder={t('Montant en Ar', 'Vola (Ar)', 'Amount in Ar')} />
        </div>
      </div>

      <div className="form-section-subtitle" style={{ color: '#000' }}>
        <Globe size={16} strokeWidth={2} style={{ color: '#000', stroke: '#000' }} />{' '}
        {t('Couverture', 'Fandrakofana', 'Coverage')} :
      </div>
      <div className="form-row">
        <div className="form-label"></div>
        <div className="form-input">
          <div className="checkbox-group-modern">
            <label className={`checkbox-label-modern ${mediaData.couvertureCapitale ? 'checked' : ''}`}>
              <input type="checkbox" name="couvertureCapitale" checked={mediaData.couvertureCapitale} onChange={handleMediaChange} />
              {t('Capitale', 'Renivohitra', 'Capital')}
            </label>
            <label className={`checkbox-label-modern ${mediaData.couvertureChefLieuProvince ? 'checked' : ''}`}>
              <input type="checkbox" name="couvertureChefLieuProvince" checked={mediaData.couvertureChefLieuProvince} onChange={handleMediaChange} />
              {t('Chef-lieu de Province', 'Renivohim-paritra', 'Provincial capital')}
            </label>
            <label className={`checkbox-label-modern ${mediaData.couvertureChefLieuRegion ? 'checked' : ''}`}>
              <input type="checkbox" name="couvertureChefLieuRegion" checked={mediaData.couvertureChefLieuRegion} onChange={handleMediaChange} />
              {t('Chef-lieu de Région', 'Renivohim-paritra kely', 'Regional capital')}
            </label>
            <label className={`checkbox-label-modern ${mediaData.couvertureDistrict ? 'checked' : ''}`}>
              <input type="checkbox" name="couvertureDistrict" checked={mediaData.couvertureDistrict} onChange={handleMediaChange} />
              {t('District', 'Distrika', 'District')}
            </label>
          </div>
        </div>
      </div>

      <div className="form-section-subtitle" style={{ color: '#000' }}>
        <Clock size={16} strokeWidth={2} style={{ color: '#000', stroke: '#000' }} />{' '}
        {t('Horaires de diffusion', 'Oran\'ny fampielezana', 'Broadcasting hours')} :
      </div>
      <div className="form-row">
        <div className="form-label"></div>
        <div className="form-input">
          <div className="checkbox-group-modern">
            <label className={`checkbox-label-modern horaire ${mediaData.horairesJusqua12 ? 'checked' : ''}`}>
              <input type="checkbox" name="horairesJusqua12" checked={mediaData.horairesJusqua12} onChange={handleMediaChange} />
              {t("Jusqu'à 12 heures", 'Hatramin\'ny 12 ora', 'Up to 12 hours')}
            </label>
            <label className={`checkbox-label-modern horaire ${mediaData.horaires13a24 ? 'checked' : ''}`}>
              <input type="checkbox" name="horaires13a24" checked={mediaData.horaires13a24} onChange={handleMediaChange} />
              {t('13 à 24 heures', '13 ka hatramin\'ny 24 ora', '13 to 24 hours')}
            </label>
          </div>
        </div>
      </div>

      <div className="form-section-subtitle">{t('Calculs', 'Kajy', 'Calculations')} :</div>

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
        <div className="form-label"><h2><DollarSign size={18} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')} :</h2></div>
        <div className="form-input">
          <input type="text" value={getSoitTotalDisplay()} readOnly className="input-style total-field" />
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
            ({t('Taux × Uniter + Frais de dossier', 'Taha × Isan\'ny + Saram-pandraharahana', 'Rate × Unit + File fees')})
          </span>
        </div>
      </div>

      <div className="form-section-subtitle">
        <Edit size={16} strokeWidth={2} /> {t('Signature', 'Sonia', 'Signature')} :
      </div>
      <div className="form-row">
        <div className="form-label"><h2><User size={18} strokeWidth={2} /> {t('Je soussigné(e) Mr/Mme', 'Mpanasonia ', 'I, the undersigned Mr/Mrs')} :</h2></div>
        <div className="form-input">
          <input type="text" name="confirmationNom" value={mediaData.confirmationNom} onChange={handleMediaChange} className="input-style" placeholder={t('Nom du signataire', 'Anaran\'ny mpanasonia', 'Signatory name')} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><Calendar size={18} strokeWidth={2} /> {t('Le', 'Ny', 'On')} :</h2></div>
        <div className="form-input">
          <input type="date" name="dateSignature" value={mediaData.dateSignature} onChange={handleMediaChange} className="input-style" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-label"><h2><MapPin size={18} strokeWidth={2} /> {t('A', 'Ao', 'At')} :</h2></div>
        <div className="form-input">
          <input type="text" name="lieuSignature" value={mediaData.lieuSignature} onChange={handleMediaChange} className="input-style" placeholder={t('Lieu de signature', 'Toerana sonia', 'Signature place')} />
        </div>
      </div>
    </>
  );

  const renderStep4 = () => {
    const nextCompteur = (userInfo.compteurs?.['Télé/Radio'] || 0) + 1;
    const currentMonth = new Date().getMonth() + 1;
    const currentTrimestre = getTrimestreFromMonth(currentMonth);
    const userDossierDisplay = `${userInfo.prefix || ''} ${nextCompteur}/${currentTrimestre}/${userInfo.anneeEnCours || new Date().getFullYear()}`;

    return (
      <div className="recap-container">
        <h3>
          <CheckCircle size={20} strokeWidth={2} />{' '}
          {t('RÉCAPITULATIF - RADIO / TÉLÉVISION', 'FAMINTINANA - RADIO / TELE', 'SUMMARY - RADIO / TELEVISION')}
        </h3>
        <div className="user-info-recap">
          <p><Users size={16} strokeWidth={2} /> {t('Utilisateur', 'Mpampiasa', 'User')}: <strong>{userInfo.nom}</strong> ({userInfo.prefix})</p>
          <p><FileText size={16} strokeWidth={2} /> {t('Prochain dossier', 'Rakitra manaraka', 'Next file')}: <strong>{userDossierDisplay}</strong></p>
        </div>
        <div className="recap-section">
          <h4><UserPlus size={16} strokeWidth={2} /> {t('1) PROPRIÉTAIRE', '1) TOMPONY', '1) OWNER')}</h4>
          <table className="recap-table">
            <tbody>
              <tr><td><User size={16} strokeWidth={2} /> {t('Nom', 'Anarana', 'Name')}</td><td>{mediaData.proprietaireNom || '-'}</td></tr>
              <tr><td><CreditCard size={16} strokeWidth={2} /> CIN</td><td>{mediaData.proprietaireCin || '-'}</td></tr>
              <tr><td><MapPin size={16} strokeWidth={2} /> {t('Région', 'Faritra', 'Region')}</td><td>{mediaData.region || '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="recap-section">
          <h4><UserPlus size={16} strokeWidth={2} /> {t('2) REPRÉSENTANT LÉGAL', '2) MPISOLO TENA ARA-DALÀNA', '2) LEGAL REPRESENTATIVE')}</h4>
          <table className="recap-table">
            <tbody>
              <tr><td><User size={16} strokeWidth={2} /> {t('Nom', 'Anarana', 'Name')}</td><td>{mediaData.representantNom || '-'}</td></tr>
              <tr><td><CreditCard size={16} strokeWidth={2} /> CIN</td><td>{mediaData.representantCin || '-'}</td></tr>
              <tr><td><Briefcase size={16} strokeWidth={2} /> {t('Fonction', 'Asa', 'Position')}</td><td>{mediaData.representantFonction || '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="recap-section">
          <h4><Monitor size={16} strokeWidth={2} /> {t('3) STATION', '3) STATION', '3) STATION')}</h4>
          <table className="recap-table">
            <tbody>
              <tr><td><Building2 size={16} strokeWidth={2} /> {t('Dénomination', 'Anarana', 'Name')}</td><td>{mediaData.denomination || '-'}</td></tr>
              <tr><td><Radio size={16} strokeWidth={2} /> {t('Fréquence', 'Fahita', 'Frequency')}</td><td>{mediaData.frequence || '-'}</td></tr>
              <tr><td><MapPin size={16} strokeWidth={2} /> {t('Siège', 'Foibe', 'Head office')}</td><td>{mediaData.siege || '-'}</td></tr>
              <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Taux', 'Taha', 'Rate')}</td><td>{formatNumber(mediaData.taux || 0)} Ar</td></tr>
              <tr><td><FileText size={16} strokeWidth={2} /> {t('Frais de dossier', 'Saram-pandraharahana', 'File fees')}</td><td>{formatNumber(fraisDossier || 0)} Ar <span style={{ color: '#6c757d', fontSize: '12px' }}>({t('fixe', 'raikitra', 'fixed')})</span></td></tr>
              <tr><td><Hash size={16} strokeWidth={2} /> {t('Uniter', 'Isan\'ny', 'Unit')}</td><td>{uniter}</td></tr>
              <tr><td><DollarSign size={16} strokeWidth={2} /> {t('Soit Total', 'Vola Total', 'Total Amount')}</td><td><strong style={{ color: '#28a745' }}>{getSoitTotalDisplay()}</strong></td></tr>
            </tbody>
          </table>
        </div>
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
      1: t('Étape 1 - Propriétaire', 'Dingana 1 - Tompony', 'Step 1 - Owner'),
      2: t('Étape 2 - Représentant légal', 'Dingana 2 - Mpisolo tena ara-dalàna', 'Step 2 - Legal representative'),
      3: t('Étape 3 - Station et calcul', 'Dingana 3 - Station sy kajy', 'Step 3 - Station and calculation'),
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

export default MediaAjout;