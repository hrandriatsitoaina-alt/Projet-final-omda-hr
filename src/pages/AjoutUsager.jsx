import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Store, Radio, CalendarDays, Bus, Music,
  ChevronDown, Sparkles, AlertCircle, PlusCircle,
} from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MiniSidebar from '../components/MiniSidebar';
import HotelAjout from './ajout/HotelAjout';
import MagasinAjout from './ajout/MagasinAjout';
import MediaAjout from './ajout/MediaAjout';
import OccAjout from './ajout/OccAjout';
import BusAjout from './ajout/BusAjout';
import NightAjout from './ajout/NightAjout';
import '../styles/AjoutUsager.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const AjoutUsager = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [selectedType, setSelectedType] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Options traduites (mémoïsées)
  const typeOptions = useMemo(() => [
    { value: 'Hôtel',         label: t('Hôtel / Restaurant',     'Hotely / Fisoronana',         'Hotel / Restaurant'),   icon: Building2 },
    { value: 'Grand Surface', label: t('Magasin et Autres',      'Fivarotana sy hafa',          'Store and Others'),     icon: Store },
    { value: 'Télé/Radio',    label: t('Radio / Télévision',     'Radio / Fahitalavitra',       'Radio / Television'),   icon: Radio },
    { value: 'OCC',           label: t('Occasionnelle',          'Fotoana manokana',            'Occasional'),           icon: CalendarDays },
    { value: 'Bus',           label: t('Transport - Bus',        'Fitaterana - Bus',            'Transport - Bus'),      icon: Bus },
    { value: 'Night club',    label: t('Night Club',             'Club alina',                  'Night Club'),           icon: Music },
  ], [t]);

  const selectedOption = typeOptions.find(opt => opt.value === selectedType);
  const SelectedIcon = selectedOption?.icon || PlusCircle;

  const handleSelect = (value) => {
    setSelectedType(value);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (window.confirm(t(
      'Êtes-vous sûr de vouloir annuler ?',
      'Tena tianao ve ny hanafoana ?',
      'Are you sure you want to cancel?'
    ))) {
      navigate('/dashboard');
    }
  };

  const renderSelectedComponent = () => {
    switch (selectedType) {
      case 'Hôtel':         return <HotelAjout onCancel={handleCancel} />;
      case 'Grand Surface': return <MagasinAjout onCancel={handleCancel} />;
      case 'Télé/Radio':    return <MediaAjout onCancel={handleCancel} />;
      case 'OCC':           return <OccAjout onCancel={handleCancel} />;
      case 'Bus':           return <BusAjout onCancel={handleCancel} />;
      case 'Night club':    return <NightAjout onCancel={handleCancel} />;
      default:              return null;
    }
  };

  return (
    <>
      <Header />
      <Sidebar />
      <MiniSidebar />
      <main className="contenu">
        <fieldset>
          <legend>
            <Sparkles size={20} strokeWidth={2} />
            {t(
              "OFFICE MALAGASY DU DROIT D'AUTEUR – FICHE DE RENSEIGNEMENTS",
              "BIRAO MALAGASY MOMBA NY ZON'NY MPANORATRA – TARATASY FANORATANA",
              "MALAGASY COPYRIGHT OFFICE – INFORMATION FORM"
            )}
          </legend>

          <div className="type-selection-container">
            <div className="type-selection-header">
              {/* Sélecteur personnalisé */}
              <div className="custom-select-wrapper" ref={wrapperRef}>
                <div
                  className={`custom-select ${isOpen ? 'open' : ''}`}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <div className="custom-select-display">
                    <div className="custom-select-icon">
                      <SelectedIcon size={22} strokeWidth={2} />
                    </div>
                    <span className="custom-select-value">
                      {selectedType || t(
                        'Sélectionnez le type d\'établissement',
                        'Misafidiana ny karazana trano',
                        'Select the establishment type'
                      )}
                    </span>
                  </div>
                  <div className="custom-select-arrow">
                    <ChevronDown size={20} strokeWidth={2} />
                  </div>
                </div>
                {isOpen && (
                  <ul className="custom-select-options">
                    <li
                      className="custom-select-option"
                      onClick={() => handleSelect('')}
                    >
                      <span className="option-icon">✕</span>
                      <span className="option-label">
                        {t('Aucune sélection', 'Tsy misy safidy', 'No selection')}
                      </span>
                    </li>
                    {typeOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <li
                          key={opt.value}
                          className={`custom-select-option ${selectedType === opt.value ? 'active' : ''}`}
                          onClick={() => handleSelect(opt.value)}
                        >
                          <span className="option-icon">
                            <Icon size={20} strokeWidth={2} />
                          </span>
                          <span className="option-label">{opt.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                className="btn-new"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <Sparkles size={18} strokeWidth={2} />
                {t('Nouveau dossier', 'Rakitra vaovao', 'New file')}
              </button>
            </div>

            <div className="type-status-bar">
              <div className="status-item">
                <span className="status-label">
                  {t('Type sélectionné', 'Karazana voafidy', 'Selected type')}
                </span>
                <span className="status-value badge">
                  {selectedType || t('Aucun', 'Tsy misy', 'None')}
                </span>
              </div>
              <div className="status-divider"></div>
              <div className="status-item">
                <span className="status-label">
                  {t('Statut', 'Toe-javatra', 'Status')}
                </span>
                <span className="status-value step-number">
                  {selectedType
                    ? t('En cours', 'Mandalo', 'In progress')
                    : t('En attente', 'Miandry', 'Pending')}
                </span>
              </div>
            </div>
          </div>

          {!selectedType ? (
            <div className="alert-message">
              <AlertCircle size={28} strokeWidth={2} />
              <span>
                {t(
                  "Veuillez sélectionner un type d'établissement pour commencer",
                  'Misafidiana karazana trano hanombohana',
                  'Please select an establishment type to begin'
                )}
              </span>
            </div>
          ) : (
            <div className="form-container step-container">
              {renderSelectedComponent()}
            </div>
          )}
        </fieldset>
      </main>
    </>
  );
};

export default AjoutUsager;