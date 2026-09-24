// src/components/GenerateQRCode.jsx
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import '../styles/generate-qrcode.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const GenerateQRCode = ({
  usager,
  type = 'occ',
  onClose = null,
  onGenerate = null,
}) => {
  const qrRef = useRef(null);

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [qrText, setQrText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [compteur, setCompteur] = useState(1);

  // Récupérer l'utilisateur courant et le compteur
  useEffect(() => {
    const fetchUserAndCounter = async () => {
      try {
        const token = localStorage.getItem('userId');
        const userResponse = await fetch('http://localhost:3001/api/auth/current-user', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        const userData = await userResponse.json();
        if (userData.success && userData.user) {
          setCurrentUser(userData.user);

          // ✅ On utilise le type BACKEND (toujours FR) indépendamment de la langue
          const typeLabels = {
            hotel: 'Hôtel',
            'grand-surface': 'Grand Surface',
            bus: 'Bus',
            nightclub: 'Night club',
            media: 'Média',
            occ: 'OCC',
          };

          const typeName = typeLabels[type] || type;
          const counterResponse = await fetch(
            `http://localhost:3001/api/users/dossier-counter/${userData.user.id}/${typeName}`
          );
          const counterData = await counterResponse.json();
          if (counterData.success) {
            setCompteur(counterData.compteur + 1);
          }
        }
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
      }
    };
    fetchUserAndCounter();
  }, [type]);

  // ============================================================
  // ✅ Formatage de date pour QR (avec locale)
  // ============================================================
  const formatDateForQR = useCallback((dateString) => {
    if (!dateString) return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('Date invalide', 'Daty diso', 'Invalid date');

      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return t('Date invalide', 'Daty diso', 'Invalid date');
    }
  }, [locale, t]);

  // ============================================================
  // ✅ Formatage de date pour référence (JJ/MM/AAAA — universel)
  // ============================================================
  const formatDateForReference = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // ============================================================
  // ✅ Génération du texte QR (avec traductions selon la langue)
  // ============================================================
  const generateQRTextContent = useCallback((usagerData, typeParam) => {
    if (!usagerData) {
      return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}`;
    }

    const dateStr = formatDateForReference();
    const compteurValue = compteur || usagerData.id || 1;
    const andReference = `AND ${dateStr}-${compteurValue}`;
    const notSpecified = t('Non spécifié', 'Tsy voafaritra', 'Not specified');

    let typePrefix = '';

    switch (typeParam) {
      case 'occ': {
        typePrefix = 'OCC';
        const organisateurs = usagerData.organisateurs || usagerData.demandeur || notSpecified;

        let artistesStr = notSpecified;
        if (usagerData.artistes_detail && usagerData.artistes_detail.length > 0) {
          artistesStr = usagerData.artistes_detail.map(a => a.nom).join(', ');
        } else if (usagerData.artistesList && usagerData.artistesList.length > 0) {
          artistesStr = usagerData.artistesList.map(a => a.nom).join(', ');
        } else if (usagerData.artistes && usagerData.artistes !== '' && usagerData.artistes !== 'Non spécifié') {
          artistesStr = usagerData.artistes;
        }

        const lieu = usagerData.lieu_evenement || usagerData.adresse || t('Lieu non spécifié', 'Toerana tsy voafaritra', 'Location not specified');
        const dateEvent = usagerData.date_evenement
          ? formatDateForQR(usagerData.date_evenement)
          : t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');

        return `© OMDA ${t('affirme un événement', 'manamarina hetsika', 'certifies an event')} : ${typePrefix} : ${t('Organisateurs', 'Mpikarakara', 'Organizers')}: ${organisateurs}, ${t('Artistes', 'Mpihira', 'Artists')}: ${artistesStr}, ${t('Lieu', 'Toerana', 'Location')}: ${lieu}, ${t('Date événement', 'Daty hetsika', 'Event date')}: ${dateEvent}, ${andReference}`;
      }

      case 'hotel': {
        typePrefix = t('Hôtel', 'Hotely', 'Hotel');
        const nomHotel = usagerData.denomination || usagerData.nom || 'HÔTEL';
        const adresseHotel = usagerData.adresse_siege || usagerData.ville || usagerData.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const etoiles = usagerData.etoiles || notSpecified;
        let anneePaiementHotel = new Date().getFullYear();
        if (usagerData.annee_dernier_paiement) {
          anneePaiementHotel = usagerData.annee_dernier_paiement;
        } else if (usagerData.paiements && usagerData.paiements.length > 0) {
          const dernierPaiement = usagerData.paiements.sort((a, b) =>
            new Date(b.date_paiement) - new Date(a.date_paiement)
          )[0];
          if (dernierPaiement) {
            anneePaiementHotel = new Date(dernierPaiement.date_paiement).getFullYear();
          }
        }

        return `${typePrefix} : ${nomHotel}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseHotel}, ${t('Étoiles', 'Kintana', 'Stars')}: ${etoiles}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementHotel}, ${andReference}`;
      }

      case 'grand-surface': {
        typePrefix = t('Grande Surface', 'Fivarotana lehibe', 'Large Store');
        const nomGS = usagerData.denomination || usagerData.nom || 'GRANDE SURFACE';
        const adresseGS = usagerData.adresse_siege || usagerData.ville || usagerData.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const nbMagasins = usagerData.nombre_magasins || 0;
        let anneePaiementGS = new Date().getFullYear();
        if (usagerData.annee_dernier_paiement) {
          anneePaiementGS = usagerData.annee_dernier_paiement;
        } else if (usagerData.paiements && usagerData.paiements.length > 0) {
          const dernierPaiement = usagerData.paiements.sort((a, b) =>
            new Date(b.date_paiement) - new Date(a.date_paiement)
          )[0];
          if (dernierPaiement) {
            anneePaiementGS = new Date(dernierPaiement.date_paiement).getFullYear();
          }
        }

        return `${typePrefix} : ${nomGS}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseGS}, ${t('Nb magasins', 'Isan\'ny fivarotana', 'Stores')}: ${nbMagasins}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementGS}, ${andReference}`;
      }

      case 'bus': {
        typePrefix = t('Bus', 'Bus', 'Bus');
        const nomBus = usagerData.denomination || usagerData.nom || 'ENTREPRISE DE BUS';
        const adresseBus = usagerData.adresse_siege || usagerData.ville || usagerData.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const typeBus = usagerData.type_bus || notSpecified;
        const nbBus = usagerData.nombre_vehicules || 0;
        const lignes = usagerData.lignes || t('Non spécifiées', 'Tsy voafaritra', 'Not specified');
        let anneePaiementBus = new Date().getFullYear();
        if (usagerData.annee_dernier_paiement) {
          anneePaiementBus = usagerData.annee_dernier_paiement;
        } else if (usagerData.paiements && usagerData.paiements.length > 0) {
          const dernierPaiement = usagerData.paiements.sort((a, b) =>
            new Date(b.date_paiement) - new Date(a.date_paiement)
          )[0];
          if (dernierPaiement) {
            anneePaiementBus = new Date(dernierPaiement.date_paiement).getFullYear();
          }
        }

        return `${typePrefix} : ${nomBus}, ${t('Type', 'Karazana', 'Type')}: ${typeBus}, ${t('Nb bus', 'Isan\'ny fiara', 'Buses')}: ${nbBus}, ${t('Lignes', 'Lalana', 'Lines')}: ${lignes}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementBus}, ${andReference}`;
      }

      case 'nightclub': {
        typePrefix = t('Night Club', 'Club alina', 'Night Club');
        const nomNC = usagerData.denomination || usagerData.nom || 'NIGHT CLUB';
        const adresseNC = usagerData.adresse_siege || usagerData.ville || usagerData.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const jauge = usagerData.jauge_max || 0;
        const horaires = usagerData.horaires || t('Non spécifiés', 'Tsy voafaritra', 'Not specified');
        let anneePaiementNC = new Date().getFullYear();
        if (usagerData.annee_dernier_paiement) {
          anneePaiementNC = usagerData.annee_dernier_paiement;
        } else if (usagerData.paiements && usagerData.paiements.length > 0) {
          const dernierPaiement = usagerData.paiements.sort((a, b) =>
            new Date(b.date_paiement) - new Date(a.date_paiement)
          )[0];
          if (dernierPaiement) {
            anneePaiementNC = new Date(dernierPaiement.date_paiement).getFullYear();
          }
        }

        return `${typePrefix} : ${nomNC}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseNC}, ${t('Jauge', 'Fahaiza-mandray', 'Capacity')}: ${jauge}, ${t('Horaires', 'Ora', 'Hours')}: ${horaires}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementNC}, ${andReference}`;
      }

      case 'media': {
        typePrefix = t('Média', 'Haino aman-jery', 'Media');
        const nomMedia = usagerData.denomination || usagerData.nom || 'MÉDIA';
        const adresseMedia = usagerData.siege || usagerData.adresse_siege || usagerData.ville || usagerData.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const canal = usagerData.canal || usagerData.frequence || notSpecified;
        let anneePaiementMedia = new Date().getFullYear();
        if (usagerData.annee_dernier_paiement) {
          anneePaiementMedia = usagerData.annee_dernier_paiement;
        } else if (usagerData.paiements && usagerData.paiements.length > 0) {
          const dernierPaiement = usagerData.paiements.sort((a, b) =>
            new Date(b.date_paiement) - new Date(a.date_paiement)
          )[0];
          if (dernierPaiement) {
            anneePaiementMedia = new Date(dernierPaiement.date_paiement).getFullYear();
          }
        }

        return `${typePrefix} : ${nomMedia}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseMedia}, ${t('Canal/Fréquence', 'Fantsona/Fahita', 'Channel/Frequency')}: ${canal}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementMedia}, ${andReference}`;
      }

      default:
        return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}, ${andReference}`;
    }
  }, [compteur, t, formatDateForQR, formatDateForReference]);

  useEffect(() => {
    if (usager) {
      const text = generateQRTextContent(usager, type);
      setQrText(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usager, type, currentUser, compteur, langue]);

  // ============================================================
  // ✅ Formatage d'affichage (avec locale)
  // ============================================================
  const formatDisplayDate = useCallback((dateString) => {
    if (!dateString) return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }, [locale, t]);

  const handleDownload = async () => {
    if (!qrRef.current) {
      alert(t('QR code non disponible', 'QR code tsy misy', 'QR code not available'));
      return;
    }

    setIsDownloading(true);

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
      link.download = `qr-code-omda-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      if (onGenerate) onGenerate();
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      alert(t('Erreur lors du téléchargement du QR code', 'Nisy olana tamin\'ny fakana ny QR code', 'Error downloading QR code'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!usager) {
    return (
      <div className="qr-generate-overlay">
        <div className="qr-generate-modal">
          <div className="qr-modal-body">
            <p>{t('Aucun usager sélectionné', 'Tsy misy mpampiasa voafidy', 'No user selected')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Obtenir les artistes formatés (mémoïsé)
  const artistesFormatted = useMemo(() => {
    if (usager.artistes_detail && usager.artistes_detail.length > 0) {
      return usager.artistes_detail.map(a => a.nom).join(', ');
    }
    if (usager.artistesList && usager.artistesList.length > 0) {
      return usager.artistesList.map(a => a.nom).join(', ');
    }
    if (usager.artistes && usager.artistes !== '' && usager.artistes !== 'Non spécifié') {
      return usager.artistes;
    }
    return null;
  }, [usager]);

  const getEventName = useCallback(() => {
    if (type === 'occ') {
      return usager.organisateurs || usager.demandeur || usager.nom_evenement || t('ÉVÉNEMENT', 'HETSIKA', 'EVENT');
    }
    return usager.denomination || usager.nom || t('ENTREPRISE', 'ORINASA', 'COMPANY');
  }, [type, usager, t]);

  const getLieu = useCallback(() => {
    if (type === 'occ') {
      return usager.lieu_evenement || t('Lieu non spécifié', 'Toerana tsy voafaritra', 'Location not specified');
    }
    return usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
  }, [type, usager, t]);

  const getDate = useCallback(() => {
    if (type === 'occ') {
      return formatDisplayDate(usager.date_evenement);
    }
    return formatDisplayDate(usager.created_at);
  }, [type, usager, formatDisplayDate]);

  const getTypeLabel = useCallback(() => {
    const labels = {
      hotel: t('Hôtel', 'Hotely', 'Hotel'),
      'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
      bus: t('Bus', 'Bus', 'Bus'),
      nightclub: t('Night Club', 'Club alina', 'Night Club'),
      media: t('Média', 'Haino aman-jery', 'Media'),
      occ: t('OCC', 'OCC', 'OCC'),
    };
    return labels[type] || type;
  }, [type, t]);

  const getSubTitle = useCallback(() => {
    if (type === 'occ') {
      return t('affirme un événement', 'manamarina hetsika', 'certifies an event');
    }
    if (type === 'hotel') {
      return t('Autorisation d\'exploitation - Hôtel', 'Fahazoan-dalana hitantana - Hotely', 'Operating authorization - Hotel');
    }
    if (type === 'grand-surface') {
      return t('Autorisation commerciale - Grande Surface', 'Fahazoan-dalana ara-barotra - Fivarotana lehibe', 'Commercial authorization - Large Store');
    }
    if (type === 'bus') {
      return t('Autorisation de transport - Bus', 'Fahazoan-dalana fitaterana - Bus', 'Transport authorization - Bus');
    }
    if (type === 'nightclub') {
      return t('Autorisation d\'exploitation - Night Club', 'Fahazoan-dalana hitantana - Club alina', 'Operating authorization - Night Club');
    }
    if (type === 'media') {
      return t('Autorisation de diffusion - Média', 'Fahazoan-dalana fampielezana - Haino aman-jery', 'Broadcasting authorization - Media');
    }
    return t('Autorisation', 'Fahazoan-dalana', 'Authorization');
  }, [type, t]);

  const dateStr = formatDateForReference();
  const compteurValue = compteur || usager.id || 1;
  const referenceText = `AND ${dateStr}-${compteurValue}`;

  return (
    <div className="qr-generate-overlay">
      <div className="qr-generate-modal">
        <div className="qr-modal-header">
          <div className="qr-modal-title">
            <span className="qr-title-icon">🔐</span>
            <h3>{t('Génération du QR Code', 'Famokarana QR Code', 'QR Code generation')}</h3>
          </div>
          <button className="qr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-usager-info">
            <div className="qr-usager-name">
              {getEventName()}
            </div>
            <div className="qr-usager-details">
              <span>📋 {usager.numero_dossier_utilisateur || t('N° dossier', 'Laharana rakitra', 'File N°')}</span>
              <span>📞 {usager.telephone || t('Téléphone', 'Finday', 'Phone')}</span>
              <span>🏷️ {getTypeLabel()}</span>
            </div>
          </div>

          <div className="qr-code-wrapper" ref={qrRef}>
            <div className="qr-red-border">
              <div className="qr-code-container">
                <QRCodeCanvas
                  value={qrText}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#dc2626"
                  level="H"
                  includeMargin={true}
                />
                <div className="qr-logo-styled">
                  <div className="qr-logo-circle">
                    <img src="/logo.ico" alt="OMDA" className="qr-logo-img" />
                  </div>
                </div>
              </div>
            </div>

            <div className="qr-text-container">
              <div className="qr-text-main">
                © OMDA - {getSubTitle()}
              </div>
              <div className="qr-text-event">
                {getEventName()}
              </div>
              {type === 'occ' && (
                <>
                  {usager.organisateurs && (
                    <div className="qr-text-occ-infos">
                      {t('Organisateurs', 'Mpikarakara', 'Organizers')}: {usager.organisateurs}
                    </div>
                  )}
                  {artistesFormatted && (
                    <div className="qr-text-occ-infos">
                      {t('Artistes', 'Mpihira', 'Artists')}: {artistesFormatted}
                    </div>
                  )}
                  {usager.genre_manifestation && (
                    <div className="qr-text-occ-infos">
                      {t('Genre', 'Karazana', 'Genre')}: {usager.genre_manifestation}
                    </div>
                  )}
                </>
              )}
              {type === 'hotel' && usager.etoiles && (
                <div className="qr-text-occ-infos">
                  {t('Étoiles', 'Kintana', 'Stars')}: {usager.etoiles}⭐
                </div>
              )}
              {type === 'grand-surface' && usager.nombre_magasins && (
                <div className="qr-text-occ-infos">
                  {t('Nb magasins', 'Isan\'ny fivarotana', 'Stores')}: {usager.nombre_magasins}
                </div>
              )}
              {type === 'bus' && usager.nombre_vehicules && (
                <div className="qr-text-occ-infos">
                  {t('Nb bus', 'Isan\'ny fiara', 'Buses')}: {usager.nombre_vehicules} | {t('Lignes', 'Lalana', 'Lines')}: {usager.lignes || t('Non spécifiées', 'Tsy voafaritra', 'Not specified')}
                </div>
              )}
              {type === 'nightclub' && usager.jauge_max && (
                <div className="qr-text-occ-infos">
                  {t('Jauge', 'Fahaiza-mandray', 'Capacity')}: {usager.jauge_max} | {t('Horaires', 'Ora', 'Hours')}: {usager.horaires || t('Non spécifiés', 'Tsy voafaritra', 'Not specified')}
                </div>
              )}
              {type === 'media' && usager.canal && (
                <div className="qr-text-occ-infos">
                  {t('Canal/Fréquence', 'Fantsona/Fahita', 'Channel/Frequency')}: {usager.canal}
                </div>
              )}
              <div className="qr-text-lieu">
                📍 {getLieu()}
              </div>
              <div className="qr-text-date">
                📅 {getDate()}
              </div>
              <div className="qr-text-reference">
                🔗 {referenceText}
              </div>
            </div>
          </div>
        </div>

        <div className="qr-modal-footer">
          <button className="qr-btn qr-btn-secondary" onClick={onClose}>
            {t('Fermer', 'Hidio', 'Close')}
          </button>
          <button className="qr-btn qr-btn-print" onClick={handlePrint}>
            🖨️ {t('Imprimer', 'Atonta', 'Print')}
          </button>
          <button
            className="qr-btn qr-btn-primary"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading
              ? `⏳ ${t('Téléchargement...', 'Maka...', 'Downloading...')}`
              : `📥 ${t('Télécharger', 'Alaina', 'Download')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateQRCode;