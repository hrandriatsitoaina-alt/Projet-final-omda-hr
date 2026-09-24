// src/pages/gestion_contra.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/gestion-contra.css';
import '../styles/generate-qrcode.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MiniSidebar from '../components/MiniSidebar';
import { generateHotelPDF } from './pdf/hotel_pdf';
import { generateMagasinPDF } from './pdf/magasin_pdf';
import { generateMediaPDF } from './pdf/media_pdf';
import { generateNightPDF } from './pdf/night_pdf';
import { generateBusPDF } from './pdf/bus_pdf';
import { generateOccPDF } from './pdf/occ_pdf';
import { generateFacturePDF } from './pdf/facture_pdf';
import GenerateQRCode from '../components/GenerateQRCode';
import { useT } from '../hooks/useT';

const GestionContra = () => {
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [selectedType, setSelectedType] = useState('hotel');
  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedUsager, setSelectedUsager] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [nouveauxIds, setNouveauxIds] = useState({});
  const [checkedUsagers, setCheckedUsagers] = useState(new Set());
  const [currentYear] = useState(new Date().getFullYear());
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // ✅ Labels/icônes/couleurs traduits (mémoïsés)
  const typeLabels = useMemo(() => ({
    hotel: t('Hôtels', 'Hotely', 'Hotels'),
    'grand-surface': t('Grandes Surfaces', 'Fivarotana lehibe', 'Large Stores'),
    bus: t('Bus', 'Bus', 'Bus'),
    nightclub: t('Night Clubs', 'Club alina', 'Night Clubs'),
    media: t('Médias', 'Haino aman-jery', 'Media'),
    occ: t('Occasionnels', 'Fotoana manokana', 'Occasionals'),
  }), [t]);

  const typeIcons = useMemo(() => ({
    hotel: '🏨',
    'grand-surface': '🏬',
    bus: '🚌',
    nightclub: '🎭',
    media: '📺',
    occ: '🎪',
  }), []);

  const typeColors = useMemo(() => ({
    hotel: '#6366f1',
    'grand-surface': '#8b5cf6',
    bus: '#06b6d4',
    nightclub: '#ec4899',
    media: '#f43f5e',
    occ: '#f59e0b',
  }), []);

  // Récupérer l'utilisateur courant
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('userId');
        const response = await fetch('http://localhost:3001/api/auth/current-user', {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const generateNumeroDossierUtilisateur = useCallback((type, id) => {
    const typeCode = {
      hotel: 'H',
      'grand-surface': 'G',
      bus: 'B',
      nightclub: 'N',
      media: 'M',
      occ: 'O',
    };
    const code = typeCode[type] || 'X';
    return `${code}${String(id).padStart(5, '0')}`;
  }, []);

  const formatDateQR = useCallback((dateString) => {
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

  const formatDateForDossier = useCallback((dateString) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    if (!dateString) return `${day}/${month}/${year}`;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return `${day}/${month}/${year}`;
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return `${day}/${month}/${year}`;
    }
  }, []);

  const generateQRText = useCallback((usager, type) => {
    if (!usager) return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}`;

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const dateStr = `${day}/${month}/${year}`;

    const compteur = usager._compteur || usager.id || 1;
    const andReference = `AND ${dateStr}-${compteur}`;
    const notSpecified = t('Non spécifié', 'Tsy voafaritra', 'Not specified');

    let typePrefix = '';

    switch (type) {
      case 'occ': {
        typePrefix = 'OCC';
        const organisateurs = usager.organisateurs || usager.demandeur || notSpecified;

        let artistesStr = notSpecified;
        if (usager.artistes_detail && usager.artistes_detail.length > 0) {
          artistesStr = usager.artistes_detail.map(a => a.nom).join(', ');
        } else if (usager.artistesList && usager.artistesList.length > 0) {
          artistesStr = usager.artistesList.map(a => a.nom).join(', ');
        } else if (usager.artistes && usager.artistes !== '') {
          artistesStr = usager.artistes;
        }

        const lieu = usager.lieu_evenement || usager.adresse || t('Lieu non spécifié', 'Toerana tsy voafaritra', 'Location not specified');
        const dateEvent = usager.date_evenement
          ? formatDateQR(usager.date_evenement)
          : t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');

        return `© OMDA ${t('affirme un événement', 'manamarina hetsika', 'certifies an event')} : ${typePrefix} : ${t('Organisateurs', 'Mpikarakara', 'Organizers')}: ${organisateurs}, ${t('Artistes', 'Mpihira', 'Artists')}: ${artistesStr}, ${t('Lieu', 'Toerana', 'Location')}: ${lieu}, ${t('Date événement', 'Daty hetsika', 'Event date')}: ${dateEvent}, ${andReference}`;
      }

      case 'hotel': {
        typePrefix = t('Hôtel', 'Hotely', 'Hotel');
        const nomHotel = usager.denomination || usager.nom || 'HÔTEL';
        const adresseHotel = usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const etoiles = usager.etoiles || notSpecified;
        const anneePaiementHotel = usager.annee_dernier_paiement || year;
        return `${typePrefix} : ${nomHotel}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseHotel}, ${t('Étoiles', 'Kintana', 'Stars')}: ${etoiles}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementHotel}, ${andReference}`;
      }

      case 'grand-surface': {
        typePrefix = t('Grande Surface', 'Fivarotana lehibe', 'Large Store');
        const nomGS = usager.denomination || usager.nom || 'GRANDE SURFACE';
        const adresseGS = usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const nbMagasins = usager.nombre_magasins || 0;
        const anneePaiementGS = usager.annee_dernier_paiement || year;
        return `${typePrefix} : ${nomGS}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseGS}, ${t('Nb magasins', 'Isan\'ny fivarotana', 'Stores')}: ${nbMagasins}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementGS}, ${andReference}`;
      }

      case 'bus': {
        typePrefix = t('Bus', 'Bus', 'Bus');
        const nomBus = usager.denomination || usager.nom || 'ENTREPRISE DE BUS';
        const adresseBus = usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const typeBus = usager.type_bus || notSpecified;
        const nbBus = usager.nombre_vehicules || 0;
        const lignes = usager.lignes || t('Non spécifiées', 'Tsy voafaritra', 'Not specified');
        const anneePaiementBus = usager.annee_dernier_paiement || year;
        return `${typePrefix} : ${nomBus}, ${t('Type', 'Karazana', 'Type')}: ${typeBus}, ${t('Nb bus', 'Isan\'ny fiara', 'Buses')}: ${nbBus}, ${t('Lignes', 'Lalana', 'Lines')}: ${lignes}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementBus}, ${andReference}`;
      }

      case 'nightclub': {
        typePrefix = t('Night Club', 'Club alina', 'Night Club');
        const nomNC = usager.denomination || usager.nom || 'NIGHT CLUB';
        const adresseNC = usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const jauge = usager.jauge_max || 0;
        const horaires = usager.horaires || t('Non spécifiés', 'Tsy voafaritra', 'Not specified');
        const anneePaiementNC = usager.annee_dernier_paiement || year;
        return `${typePrefix} : ${nomNC}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseNC}, ${t('Jauge', 'Fahaiza-mandray', 'Capacity')}: ${jauge}, ${t('Horaires', 'Ora', 'Hours')}: ${horaires}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementNC}, ${andReference}`;
      }

      case 'media': {
        typePrefix = t('Média', 'Haino aman-jery', 'Media');
        const nomMedia = usager.denomination || usager.nom || 'MÉDIA';
        const adresseMedia = usager.siege || usager.adresse_siege || usager.ville || usager.adresse || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
        const canal = usager.canal || usager.frequence || notSpecified;
        const anneePaiementMedia = usager.annee_dernier_paiement || year;
        return `${typePrefix} : ${nomMedia}, ${t('Adresse', 'Adiresy', 'Address')}: ${adresseMedia}, ${t('Canal/Fréquence', 'Fantsona/Fahita', 'Channel/Frequency')}: ${canal}, ${t('Validation année', 'Fanekena taona', 'Validation year')}: ${anneePaiementMedia}, ${andReference}`;
      }

      default:
        return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}, ${andReference}`;
    }
  }, [t, formatDateQR]);

  // ✅ checkNouveauxUsagers mémoïsé SANS dépendances
  const checkNouveauxUsagers = useCallback(async () => {
    try {
      const countResponse = await fetch('http://localhost:3001/api/usagers/nouveaux-compteur');
      const countData = await countResponse.json();

      if (countData.success && countData.nouveaux) {
        const nouveauxIdsTemp = {};
        for (const [type, count] of Object.entries(countData.nouveaux)) {
          if (count > 0) {
            const idsResponse = await fetch(`http://localhost:3001/api/usagers/nouveaux-ids/${type}`);
            const idsData = await idsResponse.json();
            nouveauxIdsTemp[type] = idsData.success ? idsData.ids : [];
          } else {
            nouveauxIdsTemp[type] = [];
          }
        }
        setNouveauxIds(nouveauxIdsTemp);
      }
    } catch (error) {
      console.error('Erreur check nouveaux:', error);
    }
  }, []);

  // ✅ loadUsagers : dépendances minimales (t RETIRÉ)
  const loadUsagers = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResponse, usagersResponse] = await Promise.all([
        fetch('http://localhost:3001/api/paiements/stats'),
        fetch(`http://localhost:3001/api/usagers/paiements/${selectedType}`),
      ]);

      const statsData = await statsResponse.json();
      const usagersData = await usagersResponse.json();

      if (statsData.success) setStats(statsData.stats);

      if (usagersData.success && usagersData.usagers) {
        let usagersWithDetails = [...usagersData.usagers];

        if (selectedType === 'occ') {
          try {
            const occResponse = await fetch('http://localhost:3001/api/usagers/occasionnels');
            const occData = await occResponse.json();
            if (occData.success && occData.events) {
              usagersWithDetails = usagersWithDetails.map(u => {
                const foundEvent = occData.events.find(e => e.id === u.id);
                if (foundEvent) {
                  return {
                    ...u,
                    artistes_detail: foundEvent.artistes_detail || [],
                    artistesList: foundEvent.artistesList || [],
                    artistes: foundEvent.artistes || u.artistes || '',
                  };
                }
                return u;
              });
            }
          } catch (err) {
            console.error('Erreur récupération artistes OCC:', err);
          }
        }

        const usagersWithCounters = await Promise.all(usagersWithDetails.map(async (u) => {
          try {
            const typeNameMap = {
              hotel: 'Hôtel',
              'grand-surface': 'Grand Surface',
              bus: 'Bus',
              nightclub: 'Night club',
              media: 'Télé/Radio',
              occ: 'OCC',
            };
            const typeName = typeNameMap[selectedType] || selectedType;
            const counterResponse = await fetch(`http://localhost:3001/api/users/dossier-counter/${currentUser?.id || 1}/${typeName}`);
            const counterData = await counterResponse.json();
            const compteurValue = counterData.success ? counterData.compteur + 1 : u.id;
            return {
              ...u,
              _compteur: compteurValue,
              numero_dossier_utilisateur: u.numero_dossier_utilisateur || generateNumeroDossierUtilisateur(selectedType, u.id),
            };
          } catch {
            return {
              ...u,
              _compteur: u.id || 1,
              numero_dossier_utilisateur: u.numero_dossier_utilisateur || generateNumeroDossierUtilisateur(selectedType, u.id),
            };
          }
        }));

        let sortedUsagers = [...usagersWithCounters];

        if (selectedType === 'occ') {
          sortedUsagers.sort((a, b) => {
            const aPaye = a.statut_paiement === 'paye';
            const bPaye = b.statut_paiement === 'paye';
            if (aPaye === bPaye) return 0;
            return aPaye ? 1 : -1;
          });
        } else {
          sortedUsagers.sort((a, b) => {
            const aNew = a.estNouveau ? 1 : 0;
            const bNew = b.estNouveau ? 1 : 0;
            return bNew - aNew;
          });
        }

        setUsagers(sortedUsagers);
        setFilteredUsagers(sortedUsagers);
        await checkNouveauxUsagers();
      } else {
        setUsagers([]);
        setFilteredUsagers([]);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setNotification({
        type: 'error',
        message: t('Erreur chargement des usagers', 'Nisy olana tamin\'ny fakana ny mpampiasa', 'Error loading users'),
      });
    } finally {
      setLoading(false);
    }
  // ✅ SUPPRESSION de `t` des dépendances : on ne veut PAS que loadUsagers change quand t change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, currentUser, generateNumeroDossierUtilisateur]);

  // ✅ useEffect : dépendances primitives uniquement
  useEffect(() => {
    if (currentUser) {
      loadUsagers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, currentUser?.id]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = usagers.filter(u =>
        (u.denomination?.toLowerCase() || '').includes(term) ||
        (u.demandeur?.toLowerCase() || '').includes(term) ||
        (u.telephone || '').includes(term) ||
        (u.email?.toLowerCase() || '').includes(term) ||
        (u.nom_evenement?.toLowerCase() || '').includes(term) ||
        (u.organisateurs?.toLowerCase() || '').includes(term) ||
        (u.numero_dossier_utilisateur?.toLowerCase() || '').includes(term) ||
        (u.artistes?.toLowerCase() || '').includes(term)
      );
      setFilteredUsagers(filtered);
    } else {
      setFilteredUsagers(usagers);
    }
  }, [searchTerm, usagers]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedUsager(null);
    setShowDocuments(false);
    setShowQRGenerator(false);
    setDocuments([]);
    setSearchTerm('');
  };

  const fetchUsagerComplet = useCallback(async (usager, type) => {
    let typeUrl = '';
    switch (type) {
      case 'hotel': typeUrl = 'hotel'; break;
      case 'grand-surface': typeUrl = 'magasin'; break;
      case 'media': typeUrl = 'media'; break;
      case 'nightclub': typeUrl = 'nightclub'; break;
      case 'bus': typeUrl = 'bus'; break;
      case 'occ': typeUrl = 'occasionnel'; break;
      default: return usager;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/usagers/${typeUrl}/${usager.id}`);
      const data = await response.json();
      if (data.success && data.usager) {
        const usagerComplet = { ...usager, ...data.usager };

        if (type === 'occ') {
          try {
            const occResponse = await fetch('http://localhost:3001/api/usagers/occasionnels');
            const occData = await occResponse.json();
            if (occData.success && occData.events) {
              const foundEvent = occData.events.find(e => e.id === usager.id);
              if (foundEvent) {
                usagerComplet.artistes_detail = foundEvent.artistes_detail || [];
                usagerComplet.artistesList = foundEvent.artistesList || [];
                if (foundEvent.artistes_detail && foundEvent.artistes_detail.length > 0) {
                  usagerComplet.artistes = foundEvent.artistes_detail.map(a => a.nom).join(', ');
                } else if (foundEvent.artistesList && foundEvent.artistesList.length > 0) {
                  usagerComplet.artistes = foundEvent.artistesList.map(a => a.nom).join(', ');
                }
              }
            }
          } catch (err) {
            console.error('Erreur récupération artistes:', err);
          }
        }

        return usagerComplet;
      }
    } catch (err) {
      console.error('Erreur récupération détails:', err);
    }
    return usager;
  }, []);

  const getPaiementsUsager = useCallback(async (usagerId, type) => {
    try {
      const response = await fetch(`http://localhost:3001/api/paiements/usager/${type}/${usagerId}`);
      const data = await response.json();
      return data.success ? data.paiements : [];
    } catch (err) {
      console.error('Erreur récupération paiements:', err);
      return [];
    }
  }, []);

  const generateDocumentsList = useCallback((usager, type, paiements) => {
    const totalPayeAnnee = paiements
      .filter(p => new Date(p.date_paiement).getFullYear() === currentYear)
      .reduce((sum, p) => sum + p.montant, 0);
    const montantMensuel = usager.montant_mensuel || 0;
    const moisPayes = montantMensuel > 0 ? Math.floor(totalPayeAnnee / montantMensuel) : 0;

    const qrText = generateQRText(usager, type);

    return [
      {
        id: 1,
        nom: t('Contrat de représentation', 'Fifanarahana fisolo tena', 'Representation contract'),
        type: 'contrat',
        date: usager.created_at || new Date().toISOString(),
        size: '245 KB',
        icon: '📄',
        action: 'view',
        content: usager,
      },
      {
        id: 2,
        nom: t("Autorisation d'exploitation", 'Fahazoan-dalana hitantana', 'Operating authorization'),
        type: 'autorisation',
        date: usager.created_at || new Date().toISOString(),
        size: '189 KB',
        icon: '📋',
        action: 'pdf',
        pdfType: type,
      },
      {
        id: 3,
        nom: t('Fiche de renseignements', 'Taratasy fanoratana', 'Information sheet'),
        type: 'fiche',
        date: usager.created_at || new Date().toISOString(),
        size: '512 KB',
        icon: '📑',
        action: 'view',
      },
      {
        id: 4,
        nom: t('Avenant au contrat', 'Fanampin\'ny fifanarahana', 'Contract amendment'),
        type: 'avenant',
        date: usager.created_at || new Date().toISOString(),
        size: '178 KB',
        icon: '📎',
        action: 'montant',
        montantMensuel: montantMensuel,
        totalPayeAnnee: totalPayeAnnee,
        moisPayes: moisPayes,
      },
      {
        id: 5,
        nom: t('Facture', 'Faktiora', 'Invoice'),
        type: 'facture',
        date: new Date().toISOString(),
        size: '234 KB',
        icon: '💰',
        action: 'facture',
        pdfType: type,
      },
      {
        id: 6,
        nom: t('Générer QR Code', 'Hamorona QR Code', 'Generate QR Code'),
        type: 'qr',
        date: new Date().toISOString(),
        size: 'QR',
        icon: '🔐',
        action: 'qr',
        qrText: qrText,
        usagerComplet: usager,
      },
    ];
  }, [currentYear, t, generateQRText]);

  const handleUsagerClick = useCallback(async (usager) => {
    setLoadingDocuments(true);
    setSelectedUsager(usager);
    setShowDocuments(true);
    setShowQRGenerator(false);

    try {
      const [usagerComplet, paiements] = await Promise.all([
        fetchUsagerComplet(usager, selectedType),
        getPaiementsUsager(usager.id, selectedType),
      ]);

      if (!usagerComplet.created_at && usager.created_at) usagerComplet.created_at = usager.created_at;
      if (!usagerComplet.date_evenement && usager.date_evenement) usagerComplet.date_evenement = usager.date_evenement;

      const docs = generateDocumentsList(usagerComplet, selectedType, paiements);
      setDocuments(docs);

      try {
        await fetch('http://localhost:3001/api/usagers/marquer-vu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usagerId: usager.id, type: selectedType }),
        });
        loadUsagers();
      } catch (err) {
        console.error(err);
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur chargement des documents', 'Nisy olana tamin\'ny fakana ny rakitra', 'Error loading documents')}`,
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingDocuments(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, fetchUsagerComplet, getPaiementsUsager, generateDocumentsList, t]);

  const handleBack = () => {
    setSelectedUsager(null);
    setShowDocuments(false);
    setShowQRGenerator(false);
    setDocuments([]);
  };

  const handlePrint = useCallback(async (usager, documentType, pdfType = null) => {
    try {
      setNotification({
        type: 'info',
        message: `🔄 ${t('Génération du document...', 'Famokarana ny rakitra...', 'Generating document...')}`,
      });

      let usagerComplet = { ...usager };
      const type = pdfType || selectedType;

      if (type === 'hotel') {
        const response = await fetch(`http://localhost:3001/api/usagers/hotel/${usager.id}`);
        const data = await response.json();
        if (data.success && data.usager) usagerComplet = { ...usagerComplet, ...data.usager };
      } else if (type === 'grand-surface') {
        const response = await fetch(`http://localhost:3001/api/usagers/magasin/${usager.id}`);
        const data = await response.json();
        if (data.success && data.usager) usagerComplet = { ...usagerComplet, ...data.usager };
      } else if (type === 'media') {
        const response = await fetch(`http://localhost:3001/api/usagers/media/${usager.id}`);
        const data = await response.json();
        if (data.success && data.usager) usagerComplet = { ...usagerComplet, ...data.usager };
      } else if (type === 'nightclub') {
        const response = await fetch(`http://localhost:3001/api/usagers/nightclub/${usager.id}`);
        const data = await response.json();
        if (data.success && data.usager) usagerComplet = { ...usagerComplet, ...data.usager };
      } else if (type === 'bus') {
        const response = await fetch(`http://localhost:3001/api/usagers/bus/${usager.id}`);
        const data = await response.json();
        if (data.success && data.usager) usagerComplet = { ...usagerComplet, ...data.usager };
      } else if (type === 'occ') {
        const response = await fetch('http://localhost:3001/api/usagers/occasionnels');
        const data = await response.json();
        if (data.success && data.events) {
          const found = data.events.find(e => e.id === usager.id);
          if (found) {
            usagerComplet = { ...usagerComplet, ...found };
            if (found.artistes_detail && found.artistes_detail.length > 0) {
              usagerComplet.artistes = found.artistes_detail.map(a => a.nom).join(', ');
            } else if (found.artistesList && found.artistesList.length > 0) {
              usagerComplet.artistes = found.artistesList.map(a => a.nom).join(', ');
            }
          }
        }
      }

      const pdfData = {
        date: usager.created_at || new Date().toISOString().split('T')[0],
        annee: currentYear,
        montant: usager.montant_mensuel || 0,
        nombreMois: 1,
        montantMensuel: usager.montant_mensuel || 0,
      };

      if (documentType === t('Facture', 'Faktiora', 'Invoice') || documentType === 'Facture') {
        await generateFacturePDF(usagerComplet, pdfData, type);
      } else {
        switch (type) {
          case 'hotel': generateHotelPDF(usagerComplet, pdfData); break;
          case 'grand-surface': generateMagasinPDF(usagerComplet, pdfData); break;
          case 'media': generateMediaPDF(usagerComplet, pdfData); break;
          case 'nightclub': generateNightPDF(usagerComplet, pdfData); break;
          case 'bus': generateBusPDF(usagerComplet, pdfData); break;
          case 'occ': {
            const occUsager = {
              ...usagerComplet,
              frais_dossier: usagerComplet.frais_dossier || 5000,
              organisateurs: usagerComplet.organisateurs || usagerComplet.demandeur,
              representant_par: usagerComplet.representant_par || usagerComplet.demandeur,
              genre_manifestation: usagerComplet.genre_manifestation,
              artistes: usagerComplet.artistes || usagerComplet.nom_artiste,
              date_evenement: usagerComplet.date_evenement,
              lieu_evenement: usagerComplet.lieu_evenement,
              telephone: usagerComplet.telephone,
              numero_dossier_utilisateur: usagerComplet.numero_dossier_utilisateur,
              confirmation_nom: usagerComplet.confirmation_nom || usagerComplet.representant_par,
            };
            await generateOccPDF(occUsager, pdfData);
            break;
          }
          default: console.error('Type non supporté');
        }
      }

      setNotification({
        type: 'success',
        message: `✅ ${documentType} ${t('généré avec succès', 'vita soa aman-tsara', 'generated successfully')}`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Erreur génération:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur lors de la génération', 'Nisy olana tamin\'ny famokarana', 'Generation error')}`,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, currentYear, t]);

  const handleRenew = useCallback(async (usager) => {
    try {
      setNotification({
        type: 'info',
        message: `🔄 ${t('Renouvellement du contrat...', 'Fanavaozana ny fifanarahana...', 'Renewing contract...')}`,
      });

      const response = await fetch(`http://localhost:3001/api/contrats/renouveler/${usager.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, annee: currentYear + 1 }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          type: 'success',
          message: `✅ ${t('Contrat renouvelé avec succès', 'Vita ny fanavaozana ny fifanarahana', 'Contract renewed successfully')}`,
        });
        setTimeout(() => setNotification(null), 3000);
        loadUsagers();
      } else {
        setNotification({
          type: 'error',
          message: `❌ ${data.message || t('Erreur lors du renouvellement', 'Nisy olana tamin\'ny fanavaozana', 'Renewal error')}`,
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Erreur renouvellement:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur lors du renouvellement', 'Nisy olana tamin\'ny fanavaozana', 'Renewal error')}`,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, currentYear, loadUsagers, t]);

  const handleViewDocument = useCallback((doc) => {
    if (doc.type === 'avenant') {
      setNotification({
        type: 'info',
        message: `💰 ${t('Informations paiement', 'Fampahalalana fandoavana', 'Payment info')} - ${t('Mensuel', 'Isam-bolana', 'Monthly')}: ${(doc.montantMensuel || 0).toLocaleString(locale)} Ar | ${t('Payé', 'Voaloa', 'Paid')}: ${(doc.totalPayeAnnee || 0).toLocaleString(locale)} Ar | ${t('Mois', 'Volana', 'Months')}: ${doc.moisPayes || 0}/12`,
      });
    } else if (doc.type === 'contrat') {
      setNotification({
        type: 'info',
        message: `📋 ${t('Contrat de représentation', 'Fifanarahana fisolo tena', 'Representation contract')} - ${t('Version signée le', 'Dika nosoniavina ny', 'Version signed on')} ${formatDateQR(doc.date)}`,
      });
    } else if (doc.type === 'fiche') {
      setNotification({
        type: 'info',
        message: `📑 ${t('Fiche de renseignements', 'Taratasy fanoratana', 'Information sheet')} - ${t('Complétée le', 'Vita ny', 'Completed on')} ${formatDateQR(doc.date)}`,
      });
    } else if (doc.type === 'qr') {
      setShowQRGenerator(true);
    } else if (doc.type === 'facture') {
      setNotification({
        type: 'info',
        message: `💰 ${t('Facture générée le', 'Faktiora vita ny', 'Invoice generated on')} ${formatDateQR(doc.date)}`,
      });
    } else {
      setNotification({
        type: 'info',
        message: `👁️ ${t('Aperçu de', 'Topi-maso ny', 'Preview of')} "${doc.nom}"`,
      });
    }
    setTimeout(() => setNotification(null), 4000);
  }, [t, locale, formatDateQR]);

  const handleCheckUsager = (usagerId, e) => {
    e.stopPropagation();
    setCheckedUsagers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(usagerId)) newSet.delete(usagerId);
      else newSet.add(usagerId);
      return newSet;
    });
  };

  const getSpecificInfo = (usager, type) => {
    switch (type) {
      case 'hotel':
        return usager.etoiles ? `${usager.etoiles}⭐` : '-';
      case 'grand-surface':
        return usager.nombre_magasins ? `${usager.nombre_magasins} ${t('mag', 'fiv', 'st')}` : '-';
      case 'bus':
        return usager.nombre_vehicules ? `${usager.nombre_vehicules} ${t('bus', 'fiara', 'bus')}` : '-';
      case 'nightclub':
        return usager.jauge_max ? `${usager.jauge_max} ${t('pl', 'ol', 'ppl')}` : '-';
      case 'media':
        return usager.frequence || usager.canal || '-';
      case 'occ': {
        if (usager.artistes_detail && usager.artistes_detail.length > 0) {
          return usager.artistes_detail.map(a => a.nom).join(', ');
        }
        if (usager.artistesList && usager.artistesList.length > 0) {
          return usager.artistesList.map(a => a.nom).join(', ');
        }
        return usager.artistes || usager.nom_evenement || usager.genre_manifestation || '-';
      }
      default:
        return '-';
    }
  };

  const isNouveau = (usager) => {
    if (selectedType === 'occ') return usager.statut_paiement !== 'paye';
    return nouveauxIds[selectedType]?.includes(usager.id) || usager.estNouveau;
  };

  const formatDateDisplay = useCallback((dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  }, [locale]);

  return (
    <>
      <Header />
      <Sidebar />
      <MiniSidebar />
      <main className="contenu-gestion-contra">
        {notification && (
          <div className={`notification ${notification.type}`}>
            <div className="notification-content">
              <span className="notification-icon">
                {notification.type === 'success' ? '✅' : notification.type === 'info' ? 'ℹ️' : '❌'}
              </span>
              <span className="notification-message">{notification.message}</span>
              <button className="notification-close" onClick={() => setNotification(null)}>✕</button>
            </div>
          </div>
        )}

        <div className="dashboard">
          <br /><br /><br />
          <div className="dashboard-header">
            <div className="header-content">
              <h1>📋 {t('Gestion des contrats', 'Fitantanana ny fifanarahana', 'Contract management')}</h1>
              <p>{t('Consultez, gérez et imprimez les documents contractuels', 'Jereo, tantano ary atonta ny rakitra fifanarahana', 'View, manage and print contract documents')}</p>
            </div>
            <div className="header-stats">
              <div className="header-stat">
                <span className="stat-value">{stats?.[selectedType]?.total || 0}</span>
                <span className="stat-label">{t('Total usagers', 'Totalin\'ny mpampiasa', 'Total users')}</span>
              </div>
              <div className="header-stat">
                <span className="stat-value">{stats?.[selectedType]?.totalPayes || 0}</span>
                <span className="stat-label">{t('À jour', 'Voaloa', 'Up to date')}</span>
              </div>
            </div>
          </div>

          <div className="stats-cards">
            {Object.keys(typeLabels).map((type) => (
              <div
                key={type}
                className={`stat-card ${selectedType === type ? 'active' : ''}`}
                onClick={() => handleTypeChange(type)}
                style={{ borderLeftColor: typeColors[type] }}
              >
                <div className="stat-card-icon" style={{ backgroundColor: typeColors[type] }}>
                  {typeIcons[type]}
                </div>
                <div className="stat-card-info">
                  <h4>{typeLabels[type]}</h4>
                  <div className="stat-card-numbers">
                    <span className="total">{stats?.[type]?.total || 0}</span>
                    <span className="paid">✓ {stats?.[type]?.totalPayes || 0}</span>
                    <span className="unpaid">✗ {stats?.[type]?.nonPayes || 0}</span>
                  </div>
                </div>
                {nouveauxIds[type]?.length > 0 && <span className="stat-badge">{nouveauxIds[type].length}</span>}
              </div>
            ))}
          </div>

          <div className="search-section">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={t(
                  'Rechercher par nom, téléphone, numéro de dossier, artistes...',
                  'Hikaroka amin\'ny anarana, finday, laharana rakitra, mpihira...',
                  'Search by name, phone, file number, artists...'
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{t('Chargement des usagers...', 'Maka ny mpampiasa...', 'Loading users...')}</p>
              </div>
            ) : filteredUsagers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>{t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found')}</p>
              </div>
            ) : (
              <table className="usager-table">
                <thead>
                  <tr>
                    <th width="40">
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) setCheckedUsagers(new Set(filteredUsagers.map(u => u.id)));
                        else setCheckedUsagers(new Set());
                      }} />
                    </th>
                    <th>{t('N° Dossier', 'N° Rakitra', 'File N°')}</th>
                    <th>{t('Nom / Raison sociale', 'Anarana / Orinasa', 'Name / Company')}</th>
                    <th>{t('Demandeur', 'Mpangataka', 'Applicant')}</th>
                    <th>{t('Contact', 'Fifandraisana', 'Contact')}</th>
                    <th>{t('Infos', 'Fampahalalana', 'Info')}</th>
                    <th width="120">{t('Action', 'Hetsika', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsagers.map((u) => {
                    const nouveau = isNouveau(u);
                    return (
                      <tr key={u.id} className={nouveau ? 'row-new' : ''}>
                        <td>
                          <input type="checkbox" checked={checkedUsagers.has(u.id)} onChange={(e) => handleCheckUsager(u.id, e)} />
                        </td>
                        <td>
                          <span className="dossier-badge">{u.numero_dossier_utilisateur}</span>
                          {nouveau && <span className="new-badge">{t('NOUVEAU', 'VAOVAO', 'NEW')}</span>}
                        </td>
                        <td className="usager-name">{u.denomination || u.nom_evenement || u.organisateurs || '-'}</td>
                        <td>{u.demandeur || u.representant_par || '-'}</td>
                        <td>
                          <div className="contact-info">
                            <span>{u.telephone || '-'}</span>
                            {u.email && <small>{u.email}</small>}
                          </div>
                        </td>
                        <td>
                          <span className="info-tag">{getSpecificInfo(u, selectedType)}</span>
                        </td>
                        <td>
                          <button className="btn-documents" onClick={() => handleUsagerClick(u)}>
                            📄 {t('Documents', 'Rakitra', 'Documents')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showDocuments && selectedUsager && (
          <div className="modal-overlay" onClick={handleBack}>
            <div className="modal-documents" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <span className="modal-icon">📄</span>
                  <h3>{t('Documents contractuels', 'Rakitra fifanarahana', 'Contract documents')}</h3>
                  {loadingDocuments && <span className="loading-spinner-small">⏳</span>}
                </div>
                <button className="modal-close" onClick={handleBack}>✕</button>
              </div>

              <div className="modal-usager-info">
                <div className="usager-avatar" style={{ backgroundColor: typeColors[selectedType] }}>
                  {typeIcons[selectedType]}
                </div>
                <div className="usager-details">
                  <h4>{selectedUsager.denomination || selectedUsager.nom_evenement || selectedUsager.organisateurs}</h4>
                  <div className="usager-metas">
                    <span className="meta"><strong>{t('N° Dossier', 'N° Rakitra', 'File N°')}:</strong> {selectedUsager.numero_dossier_utilisateur}</span>
                    <span className="meta"><strong>{t('Demandeur', 'Mpangataka', 'Applicant')}:</strong> {selectedUsager.demandeur || selectedUsager.representant_par || '-'}</span>
                    <span className="meta"><strong>{t('Tél', 'Finday', 'Phone')}:</strong> {selectedUsager.telephone || '-'}</span>
                    {selectedUsager.date_evenement && (
                      <span className="meta"><strong>{t('Date événement', 'Daty hetsika', 'Event date')}:</strong> {formatDateDisplay(selectedUsager.date_evenement)}</span>
                    )}
                    {selectedUsager.artistes && (
                      <span className="meta"><strong>{t('Artistes', 'Mpihira', 'Artists')}:</strong> {selectedUsager.artistes}</span>
                    )}
                    {selectedUsager.created_at && (
                      <span className="meta"><strong>{t('Date création', 'Daty namoronana', 'Creation date')}:</strong> {formatDateDisplay(selectedUsager.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>

              {loadingDocuments ? (
                <div className="loading-documents">
                  <div className="spinner"></div>
                  <p>{t('Chargement des documents...', 'Maka ny rakitra...', 'Loading documents...')}</p>
                </div>
              ) : (
                <div className="documents-grid">
                  {documents.map((doc) => (
                    <div key={doc.id} className={`document-card ${doc.type === 'qr' ? 'qr-document-card' : ''}`}>
                      <div className="document-card-icon">{doc.icon}</div>
                      <div className="document-card-content">
                        <div className="document-card-title">{doc.nom}</div>
                        <div className="document-card-meta">
                          <span>📅 {formatDateDisplay(doc.date)}</span>
                          <span>📦 {doc.size}</span>
                        </div>
                        {doc.type === 'avenant' && (
                          <div className="payment-info">
                            <div className="payment-row">
                              <span>💰 {t('Mensuel', 'Isam-bolana', 'Monthly')}:</span>
                              <strong>{(doc.montantMensuel || 0).toLocaleString(locale)} Ar</strong>
                            </div>
                            <div className="payment-row">
                              <span>✅ {t('Mois payés', 'Volana voaloa', 'Months paid')}:</span>
                              <strong>{doc.moisPayes || 0}/12</strong>
                            </div>
                            <div className="payment-row">
                              <span>💵 {t('Total payé', 'Vola voaloa', 'Total paid')}:</span>
                              <strong>{(doc.totalPayeAnnee || 0).toLocaleString(locale)} Ar</strong>
                            </div>
                          </div>
                        )}
                        {doc.type === 'qr' && (
                          <div className="qr-preview-text">
                            <small>{doc.qrText || generateQRText(selectedUsager, selectedType)}</small>
                          </div>
                        )}
                      </div>
                      <div className="document-card-actions">
                        {doc.type === 'qr' ? (
                          <button
                            className="qr-generate-btn"
                            onClick={() => setShowQRGenerator(true)}
                            title={t('Générer le QR Code', 'Hamorona QR Code', 'Generate QR Code')}
                          >
                            <span>🔐</span> {t('Générer', 'Hamorona', 'Generate')}
                          </button>
                        ) : doc.type === 'facture' ? (
                          <button
                            className="action-btn facture-btn"
                            onClick={() => handlePrint(selectedUsager, t('Facture', 'Faktiora', 'Invoice'), doc.pdfType)}
                            title={t('Générer la facture', 'Hamorona ny faktiora', 'Generate invoice')}
                          >
                            <span>💰</span> {t('Facture', 'Faktiora', 'Invoice')}
                          </button>
                        ) : (
                          <>
                            <button className="action-btn view-btn" onClick={() => handleViewDocument(doc)} title={t('Aperçu', 'Topi-maso', 'Preview')}>
                              👁️
                            </button>
                            {(doc.action === 'pdf' || doc.type === 'autorisation') && (
                              <button className="action-btn print-btn" onClick={() => handlePrint(selectedUsager, doc.nom, doc.pdfType)} title={t('Imprimer', 'Atonta', 'Print')}>
                                🖨️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleBack}>
                  {t('Fermer', 'Hidio', 'Close')}
                </button>
                <button className="btn-primary" onClick={() => handleRenew(selectedUsager)}>
                  🔄 {t('Renouveler le contrat', 'Hanavao ny fifanarahana', 'Renew contract')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQRGenerator && selectedUsager && (
          <GenerateQRCode
            usager={selectedUsager}
            type={selectedType}
            onClose={() => setShowQRGenerator(false)}
            onGenerate={() => {
              setNotification({
                type: 'success',
                message: `✅ ${t('QR Code généré avec succès', 'Vita ny QR Code', 'QR Code generated successfully')}`,
              });
              setTimeout(() => setNotification(null), 3000);
            }}
          />
        )}
      </main>
    </>
  );
};

export default GestionContra;