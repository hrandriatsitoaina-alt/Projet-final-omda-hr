// src/pages/ConfirmationDossier.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import {
  FileText, Receipt, QrCode, Download, CheckCircle, XCircle,
  Info, AlertCircle, Building2, User, Phone, MapPin, Calendar, Star,
  Hotel, Store, Bus, PartyPopper, Tv2, Ticket, ArrowLeft,
  Loader2, FileSignature,
} from 'lucide-react';
import '../styles/confirmation-dossier.css';
import MiniSidebar from '../components/MiniSidebar';
import { useToast } from '../components/Toast';
import { useT } from '../hooks/useT';

// Générateurs PDF
import { generateHotelPDF } from './pdf/hotel_pdf';
import { generateMagasinPDF } from './pdf/magasin_pdf';
import { generateMediaPDF } from './pdf/media_pdf';
import { generateNightPDF } from './pdf/night_pdf';
import { generateBusPDF } from './pdf/bus_pdf';
import { generateOccPDF } from './pdf/occ_pdf';
import { generateFacturePDF } from './pdf/facture_pdf';

const ConfirmationDossier = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const qrRef = useRef(null);

  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [usager, setUsager] = useState(null);
  const [usagerType, setUsagerType] = useState('');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [validatedDossiers, setValidatedDossiers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreatingFacture, setIsCreatingFacture] = useState(false);

  const [factureAvanceeCreee, setFactureAvanceeCreee] = useState(false);
  const [contratGenere, setContratGenere] = useState(false);
  const [qrGenere, setQrGenere] = useState(false);

  // ============================================================
  // ✅ VERROUS SYNCHRONES (refs) — identiques pour les 3 actions.
  // Un ref se lit/écrit de façon 100% synchrone, contrairement à un
  // state React : même si le clic bulle deux fois (bouton + div
  // parent) dans le même tick, ou si l'utilisateur double-clique
  // avant le premier re-render, le second appel est bloqué AVANT
  // même de démarrer, car le ref est déjà à `true` au moment où il
  // est testé.
  // ============================================================
  const contratInFlightRef = useRef(false);
  const factureInFlightRef = useRef(false);
  const qrInFlightRef = useRef(false);

  const typeLabels = useMemo(() => ({
    hotel: t('Hôtel', 'Hotely', 'Hotel'),
    'grand-surface': t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
    bus: t('Bus', 'Bus', 'Bus'),
    nightclub: t('Night Club', 'Club alina', 'Night Club'),
    media: t('Média', 'Haino aman-jery', 'Media'),
    occ: t('Occasionnel', 'Fotoana manokana', 'Occasional'),
  }), [t]);

  const typeIcons = useMemo(() => ({
    hotel: Hotel,
    'grand-surface': Store,
    bus: Bus,
    nightclub: PartyPopper,
    media: Tv2,
    occ: Ticket,
  }), []);

  const typeColors = useMemo(() => ({
    hotel: '#4A90D9',
    'grand-surface': '#27ae60',
    bus: '#f39c12',
    nightclub: '#8e44ad',
    media: '#e74c3c',
    occ: '#1abc9c',
  }), []);

  const typeBgColors = useMemo(() => ({
    hotel: '#E8F0FE',
    'grand-surface': '#E8F8ED',
    bus: '#FFF8E1',
    nightclub: '#F3E5F5',
    media: '#FDE8E8',
    occ: '#E0F7F4',
  }), []);

  const fetchArtistesForEvent = useCallback(async (eventId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/occ/artistes/details/${eventId}`);
      const data = await response.json();
      if (data.success && data.artistes) return data;
      return { artistes: [], artistesNames: [], artistesString: '', count: 0 };
    } catch (error) {
      console.error('❌ Erreur récupération artistes:', error);
      return { artistes: [], artistesNames: [], artistesString: '', count: 0 };
    }
  }, []);

  const getArtistes = useCallback((u) => {
    let artistesList = [];

    if (u?.artistes_detail?.length > 0) {
      artistesList = u.artistes_detail.map(a => {
        if (a.nom && a.prenom) return `${a.prenom} ${a.nom}`;
        if (a.nom) return a.nom;
        return a;
      }).filter(Boolean);
    }

    if (artistesList.length === 0 && u?.otherArtistsDetail?.length > 0) {
      artistesList = u.otherArtistsDetail.map(a => {
        if (a.nom && a.prenom) return `${a.prenom} ${a.nom}`;
        if (a.nom) return a.nom;
        return a;
      }).filter(Boolean);
    }

    if (artistesList.length === 0 && u?.artistesList?.length > 0) {
      artistesList = u.artistesList.map(a => {
        if (a.nom && a.prenom) return `${a.prenom} ${a.nom}`;
        if (a.nom) return a.nom;
        return a;
      }).filter(Boolean);
    }

    if (artistesList.length === 0 && u?.artistes && u.artistes !== '' && u.artistes !== 'Non spécifié') {
      const s = u.artistes;
      if (s.includes(',')) artistesList = s.split(',').map(a => a.trim()).filter(Boolean);
      else if (s.includes(' et ')) artistesList = s.split(' et ').map(a => a.trim()).filter(Boolean);
      else artistesList = [s];
    }

    return artistesList;
  }, []);

  const formatDateForQR = useCallback((dateString) => {
    if (!dateString) return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');
    }
  }, [locale, t]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  }, [locale]);

  // ============================================================
  // EFFET 1 : Chargement de l'usager
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const loadUsager = async () => {
      const state = location.state;

      if (state?.usager) {
        let usagerData = state.usager;

        if (state.type === 'occ' && usagerData.id) {
          const artistesData = await fetchArtistesForEvent(usagerData.id);
          if (!cancelled && artistesData.artistes?.length > 0) {
            usagerData = {
              ...usagerData,
              artistes_detail: artistesData.artistes,
              artistesList: artistesData.artistes,
              artistesString: artistesData.artistesString,
            };
          }
        }

        if (!cancelled) {
          setUsager(usagerData);
          setUsagerType(state.type || 'hotel');
          setLoading(false);
        }

        try {
          sessionStorage.setItem('lastUsager', JSON.stringify({
            usager: usagerData,
            type: state.type || 'hotel',
          }));
        } catch (e) {
          console.warn('⚠️ sessionStorage indisponible:', e);
        }
        return;
      }

      const savedUsager = sessionStorage.getItem('lastUsager');
      if (savedUsager) {
        try {
          const parsed = JSON.parse(savedUsager);
          let usagerData = parsed.usager;

          if (parsed.type === 'occ' && usagerData.id) {
            const artistesData = await fetchArtistesForEvent(usagerData.id);
            if (!cancelled && artistesData.artistes?.length > 0) {
              usagerData = {
                ...usagerData,
                artistes_detail: artistesData.artistes,
                artistesList: artistesData.artistes,
                artistesString: artistesData.artistesString,
              };
            }
          }

          if (!cancelled) {
            setUsager(usagerData);
            setUsagerType(parsed.type || 'hotel');
            setLoading(false);
          }
          return;
        } catch (e) { /* ignore */ }
      }

      if (!cancelled) navigate('/dashboard');
    };

    loadUsager();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, navigate]);

  // ============================================================
  // EFFET 2 : Utilisateur courant (une seule fois)
  // ============================================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('userId');
        const response = await fetch('http://localhost:3001/api/auth/current-user', {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        const data = await response.json();
        if (data.success && data.user) setCurrentUser(data.user);
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // ============================================================
  // EFFET 3 : Vérification localStorage
  // ⚠️ Cet effet ne fait QUE LIRE le localStorage et mettre à jour
  // le state d'affichage. Il n'appelle JAMAIS handleGenerateFactureAvancee,
  // handleGenerateContrat ni handleGenerateQR — donc il ne peut pas être
  // la cause d'une génération "automatique".
  // ============================================================
  useEffect(() => {
    if (!usager?.id || !usagerType) return;

    const keyFacture = `facture_avancee_${usagerType}_${usager.id}`;
    const keyContrat = `contrat_genere_${usagerType}_${usager.id}`;
    const keyQr = `qr_genere_${usagerType}_${usager.id}`;

    if (localStorage.getItem(keyFacture) === 'true') {
      setFactureAvanceeCreee(true);
      setValidatedDossiers(prev => prev.FactureAvancee ? prev : { ...prev, FactureAvancee: true });
    }
    if (localStorage.getItem(keyContrat) === 'true') {
      setContratGenere(true);
      setValidatedDossiers(prev => prev.Contrat ? prev : { ...prev, Contrat: true });
    }
    if (localStorage.getItem(keyQr) === 'true') {
      setQrGenere(true);
      setValidatedDossiers(prev => prev['QR Code'] ? prev : { ...prev, 'QR Code': true });
    }
  }, [usager?.id, usagerType]);

  const generateQRTextContent = useCallback((u, type) => {
    if (!u) return `OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}`;

    const numeroDossier = u.numero_dossier_utilisateur || `ID-${u.id}`;
    const omdaPhone = '034 05 533 88';
    const omdaRegion = 'Analamanga';
    const notSpecified = t('Non spécifié', 'Tsy voafaritra', 'Not specified');

    let lines = [];
    let typePrefix = '';

    switch (type) {
      case 'occ': {
        typePrefix = 'OCC';
        const nomPrincipal = u.organisateurs || u.demandeur || notSpecified;
        const dateEvent = u.date_evenement ? formatDateForQR(u.date_evenement) : '';
        const lieu = u.lieu_evenement || u.adresse || '';
        const evenement = u.genre_manifestation || u.nom_evenement || '';
        const region = u.region || notSpecified;

        let artistesStr = t('Aucun artiste spécifié', 'Tsy misy mpihira voafaritra', 'No artist specified');
        if (u.artistes_detail?.length > 0) {
          artistesStr = u.artistes_detail.map(a => {
            if (a.nom && a.prenom) return `${a.prenom} ${a.nom}`;
            if (a.nom) return a.nom;
            return a;
          }).join(', ');
        } else {
          const fallback = getArtistes(u);
          if (fallback.length > 0) artistesStr = fallback.join(', ');
        }

        lines = [
          `OMDA ${t('affirme un evenement', 'manamarina hetsika', 'certifies an event')} ${typePrefix}`,
          `${t('Organisateur', 'Mpikarakara', 'Organizer')} : ${nomPrincipal}`,
        ];
        if (evenement) lines.push(`${t('Evenement', 'Hetsika', 'Event')} : ${evenement}`);
        if (artistesStr && artistesStr !== t('Aucun artiste spécifié', 'Tsy misy mpihira voafaritra', 'No artist specified')) {
          lines.push(`${t('Artistes', 'Mpihira', 'Artists')} : ${artistesStr}`);
        }
        if (lieu) lines.push(`${t('Lieu', 'Toerana', 'Location')} : ${lieu}`);
        if (dateEvent) lines.push(`${t('Date', 'Daty', 'Date')} : ${dateEvent}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      case 'hotel': {
        typePrefix = 'HOTEL';
        const denomination = u.denomination || u.nom || notSpecified;
        const adresse = u.adresse_siege || u.ville || u.adresse || '';
        const etoiles = u.etoiles ? `${u.etoiles} ${t('etoile(s)', 'kintana', 'star(s)')}` : '';
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (etoiles) lines.push(`${t('Categorie', 'Sokajy', 'Category')} : ${etoiles}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      case 'grand-surface': {
        typePrefix = 'MAGASIN';
        const denomination = u.denomination || u.nom || notSpecified;
        const adresse = u.adresse_siege || u.ville || u.adresse || '';
        const nb = u.nombre_magasins || 0;
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (nb > 0) lines.push(`${t('Nb magasins', 'Isan\'ny fivarotana', 'Stores')} : ${nb}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      case 'bus': {
        typePrefix = 'BUS';
        const denomination = u.denomination || u.nom || notSpecified;
        const adresse = u.adresse_siege || u.ville || u.adresse || '';
        const lignes = u.lignes || '';
        const nb = u.nombre_vehicules || 0;
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme une societe', 'manamarina orinasa', 'certifies a company')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (lignes) lines.push(`${t('Lignes', 'Lalana', 'Lines')} : ${lignes}`);
        if (nb > 0) lines.push(`${t('Vehicules', 'Fiara', 'Vehicles')} : ${nb}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      case 'nightclub': {
        typePrefix = 'NIGHT CLUB';
        const denomination = u.denomination || u.nom || notSpecified;
        const adresse = u.adresse_siege || u.ville || u.adresse || '';
        const jauge = u.jauge_max || 0;
        const horaires = u.horaires || '';
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (jauge > 0) lines.push(`${t('Jauge', 'Fahaiza-mandray', 'Capacity')} : ${jauge} ${t('pers.', 'olona', 'people')}`);
        if (horaires) lines.push(`${t('Horaires', 'Ora', 'Hours')} : ${horaires}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      case 'media': {
        typePrefix = 'MEDIA';
        const denomination = u.denomination || u.nom || notSpecified;
        const adresse = u.siege || u.adresse_siege || u.ville || u.adresse || '';
        const frequence = u.frequence || '';
        const canal = u.canal || '';
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme une station', 'manamarina station', 'certifies a station')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Siege', 'Foibe', 'Head office')} : ${adresse}`);
        if (frequence) lines.push(`${t('Frequence', 'Fahita', 'Frequency')} : ${frequence}`);
        if (canal) lines.push(`${t('Canal', 'Fantsona', 'Channel')} : ${canal}`);
        lines.push(
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`
        );
        break;
      }

      default: {
        typePrefix = type || t('Inconnu', 'Tsy fantatra', 'Unknown');
        const denomination = u.denomination || u.nom || notSpecified;
        const region = u.region || notSpecified;
        lines = [
          `OMDA ${t('affirme un document', 'manamarina rakitra', 'certifies a document')} ${typePrefix}`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
          `${t('Region', 'Faritra', 'Region')} : ${region}`,
          `Ref : ${numeroDossier}`,
          `© OMDA ${omdaRegion} - Tel : ${omdaPhone}`,
        ];
      }
    }

    return lines.join('\n');
  }, [t, formatDateForQR, getArtistes]);

  // ============================================================
  // ✅ QR CODE — un seul point d'entrée : onClick sur le doc-item
  // ============================================================
  const handleGenerateQR = useCallback(async () => {
    if (!usager) return;
    if (qrInFlightRef.current) return;

    const keyQr = `qr_genere_${usagerType}_${usager.id}`;
    const dejaGenere = qrGenere || localStorage.getItem(keyQr) === 'true';

    let usagerComplet = { ...usager };

    if (usagerType === 'occ' && usager.id) {
      const artistesData = await fetchArtistesForEvent(usager.id);
      if (artistesData.artistes?.length > 0) {
        usagerComplet = {
          ...usagerComplet,
          artistes_detail: artistesData.artistes,
          artistesList: artistesData.artistes,
          artistesString: artistesData.artistesString,
        };
      }
    }

    if (dejaGenere) {
      const qrText = generateQRTextContent(usagerComplet, usagerType);
      setQrCodeData({ usager: usagerComplet, type: usagerType, qrText });
      setShowQrModal(true);
      return;
    }

    qrInFlightRef.current = true;
    setIsGeneratingQR(true);
    setNotification({ type: 'info', message: `🔄 ${t('Génération du QR Code...', 'Famokarana QR Code...', 'Generating QR Code...')}` });

    try {
      const qrText = generateQRTextContent(usagerComplet, usagerType);
      setQrCodeData({ usager: usagerComplet, type: usagerType, qrText });
      setShowQrModal(true);

      localStorage.setItem(keyQr, 'true');
      setQrGenere(true);
      setValidatedDossiers(prev => ({ ...prev, 'QR Code': true }));

      setNotification({ type: 'success', message: `✅ ${t('QR Code généré avec succès', 'Vita ny QR Code', 'QR Code generated successfully')}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('❌ Erreur génération QR Code:', error);
      setNotification({ type: 'error', message: `❌ ${t('Erreur génération du QR Code', 'Nisy olana tamin\'ny famokarana QR Code', 'QR Code generation error')}` });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsGeneratingQR(false);
      qrInFlightRef.current = false;
    }
  }, [usager, usagerType, qrGenere, fetchArtistesForEvent, generateQRTextContent, t]);

  // ============================================================
  // ✅ CONTRAT — un seul point d'entrée : onClick sur le doc-item
  // ============================================================
  const handleGenerateContrat = useCallback(async () => {
    if (!usager) return;
    if (contratInFlightRef.current) return;

    const keyContrat = `contrat_genere_${usagerType}_${usager.id}`;
    const dejaGenere = contratGenere || localStorage.getItem(keyContrat) === 'true';

    if (dejaGenere) {
      showToast(t(
        '✅ Le contrat a déjà été généré pour ce dossier',
        '✅ Efa vita ny fifanarahana ho an\'ity rakitra ity',
        '✅ The contract has already been generated for this file'
      ), 'success');
      return;
    }

    contratInFlightRef.current = true;
    setIsGenerating(true);

    const pdfData = {
      date: usager.created_at || new Date().toISOString().split('T')[0],
      annee: new Date().getFullYear(),
      montant: usager.montant_mensuel || usager.montant_total || 0,
      nombreMois: 1,
      montantMensuel: usager.montant_mensuel || 0,
    };

    try {
      setNotification({ type: 'info', message: `🔄 ${t('Génération du contrat...', 'Fifanarahana...', 'Generating contract...')}` });

      switch (usagerType) {
        case 'hotel': generateHotelPDF(usager, pdfData); break;
        case 'grand-surface': generateMagasinPDF(usager, pdfData); break;
        case 'media': generateMediaPDF(usager, pdfData); break;
        case 'nightclub': generateNightPDF(usager, pdfData); break;
        case 'bus': generateBusPDF(usager, pdfData); break;
        case 'occ': await generateOccPDF(usager, pdfData); break;
        default: generateHotelPDF(usager, pdfData);
      }

      localStorage.setItem(keyContrat, 'true');
      setContratGenere(true);
      setValidatedDossiers(prev => ({ ...prev, Contrat: true }));

      setNotification({ type: 'success', message: `✅ ${t('Contrat généré avec succès', 'Vita ny fifanarahana', 'Contract generated successfully')}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Erreur:', error);
      setNotification({ type: 'error', message: `❌ ${t('Erreur génération du contrat', 'Nisy olana tamin\'ny famokarana fifanarahana', 'Contract generation error')}` });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsGenerating(false);
      contratInFlightRef.current = false;
    }
  }, [usager, usagerType, contratGenere, showToast, t]);

  const generateFacturePdfOnly = useCallback(async (montantMensuel, fraisDossier, montantRetard, isRetard, uniter, soitTotal) => {
    const pdfData = {
      date: usager.created_at || new Date().toISOString().split('T')[0],
      annee: new Date().getFullYear(),
      montant: montantMensuel,
      nombreMois: 1,
      montantMensuel,
      fraisDossier,
      montantRetard,
      isRetard,
      uniter,
      soitTotal,
    };
    await generateFacturePDF(usager, pdfData, usagerType);
  }, [usager, usagerType]);

  // ============================================================
  // ✅ FACTURE — désormais EXACTEMENT le même principe que
  // Contrat et QR : un seul point d'entrée (onClick sur le
  // doc-item, jamais sur le bouton en plus), un ref-lock qui se
  // pose en tout premier avant tout await ou setState, et une
  // relecture directe du localStorage pour ne jamais se fier
  // uniquement au state React.
  // ============================================================
  const handleGenerateFactureAvancee = useCallback(async () => {
    if (!usager || !currentUser) {
      showToast(t('Utilisateur non identifié', 'Tsy fantatra ny mpampiasa', 'User not identified'), 'error');
      return;
    }
    if (factureInFlightRef.current) return;

    const key = `facture_avancee_${usagerType}_${usager.id}`;
    const dejaCreee = factureAvanceeCreee || localStorage.getItem(key) === 'true';

    let montantMensuel = 0;
    let fraisDossier = 5000;
    let montantRetard = 0;
    let isRetard = false;
    let uniter = 1;
    let soitTotal = 0;

    switch (usagerType) {
      case 'hotel':
      case 'grand-surface':
      case 'nightclub':
      case 'bus':
        montantMensuel = parseFloat(usager.montant_mensuel) || 0;
        fraisDossier = parseFloat(usager.frais_dossier) || 5000;
        uniter = parseInt(usager.uniter) || 1;
        soitTotal = (montantMensuel * uniter) + fraisDossier;
        break;
      case 'media':
        montantMensuel = parseFloat(usager.taux) || 0;
        fraisDossier = parseFloat(usager.frais_dossier) || 5000;
        uniter = parseInt(usager.uniter) || 1;
        soitTotal = (montantMensuel * uniter) + fraisDossier;
        break;
      case 'occ':
        montantMensuel = parseFloat(usager.montant) || parseFloat(usager.montant_total) || 0;
        fraisDossier = parseFloat(usager.frais_dossier) || 5000;
        montantRetard = parseFloat(usager.montant_retard) || 0;
        isRetard = usager.is_retard || false;
        uniter = parseInt(usager.uniter) || 1;
        soitTotal = (montantMensuel * uniter) + fraisDossier + (isRetard ? montantRetard : 0);
        break;
      default:
        montantMensuel = parseFloat(usager.montant_mensuel) || 0;
        fraisDossier = parseFloat(usager.frais_dossier) || 5000;
        uniter = parseInt(usager.uniter) || 1;
        soitTotal = (montantMensuel * uniter) + fraisDossier;
    }

    // ✅ Verrou posé EN TOUT PREMIER, avant même le test "dejaCreee" —
    // il n'existe plus aucun chemin de code, dans ce composant, qui
    // puisse déclencher un appel serveur sans passer par ce verrou.
    factureInFlightRef.current = true;

    if (dejaCreee) {
      // Facture déjà créée côté serveur : on ne fait QUE régénérer le
      // PDF localement — aucun nouvel appel réseau, donc aucun risque
      // de doublon serveur, exactement comme le contrat régénère son
      // PDF sans jamais rappeler d'API.
      setIsCreatingFacture(true);
      try {
        setNotification({ type: 'info', message: `🔄 ${t('Régénération du PDF de la facture...', 'Famokarana indray ny PDF faktiora...', 'Regenerating invoice PDF...')}` });
        await generateFacturePdfOnly(montantMensuel, fraisDossier, montantRetard, isRetard, uniter, soitTotal);
        setNotification({ type: 'success', message: `✅ ${t('PDF de la facture régénéré', 'Voaverina ny PDF faktiora', 'Invoice PDF regenerated')}` });
        showToast(t('✅ PDF de la facture régénéré', '✅ Voaverina ny PDF faktiora', '✅ Invoice PDF regenerated'), 'success');
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('❌ Erreur régénération PDF:', error);
        setNotification({ type: 'error', message: `❌ ${t('Erreur régénération PDF', 'Nisy olana', 'Regeneration error')}` });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setIsCreatingFacture(false);
        factureInFlightRef.current = false;
      }
      return;
    }

    setIsCreatingFacture(true);

    try {
      setNotification({ type: 'info', message: `🔄 ${t('Création de la facture avancée...', 'Famoronana faktiora mandroso...', 'Creating advanced invoice...')}` });

      const response = await fetch('http://localhost:3001/api/factures/creer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          adminToken: localStorage.getItem('adminToken') || '',
        },
        body: JSON.stringify({
          usagerId: usager.id,
          usagerType,
          userId: currentUser.id,
          typeFacture: 'Redevances',
          regionUsager: usager.region || '',
          personneRecu: currentUser.nom || 'DAF',
          montantMensuel,
          fraisDossier,
          montantRetard,
          isRetard,
          uniter,
          soitTotal,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // ✅ Le localStorage est écrit AVANT toute autre chose, pour
        // qu'un éventuel remontage du composant (HMR en dev, navigation
        // rapide) voie immédiatement "déjà créée" et ne puisse plus
        // jamais repartir sur un nouvel appel serveur pour ce dossier.
        localStorage.setItem(key, 'true');
        setFactureAvanceeCreee(true);
        setValidatedDossiers(prev => ({ ...prev, FactureAvancee: true }));
        setNotification({ type: 'success', message: `✅ ${t('Facture avancée créée avec succès', 'Vita ny faktiora mandroso', 'Advanced invoice created successfully')}` });
        showToast(t('✅ Facture avancée créée avec succès', '✅ Vita ny faktiora mandroso', '✅ Advanced invoice created successfully'), 'success');

        setTimeout(() => {
          navigate('/generation-facture', { state: { factureId: data.factureId } });
        }, 500);
      } else {
        setNotification({ type: 'error', message: `❌ ${data.message}` });
        showToast(`❌ ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ Erreur création facture:', error);
      let errorMessage = t('Erreur de création de la facture', 'Nisy olana', 'Invoice creation error');
      if (error.message.includes('404')) errorMessage = t('Route API non trouvée.', 'Tsy hita ny lalana API.', 'API route not found.');
      else if (error.message.includes('500')) errorMessage = t('Erreur serveur.', 'Nisy olana tao amin\'ny server.', 'Server error.');
      else if (error.message.includes('ECONNREFUSED')) errorMessage = t('Serveur non démarré.', 'Tsy mandeha ny server.', 'Server not running.');

      setNotification({ type: 'error', message: `❌ ${errorMessage}` });
      showToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setIsCreatingFacture(false);
      factureInFlightRef.current = false;
    }
  }, [usager, usagerType, currentUser, factureAvanceeCreee, generateFacturePdfOnly, navigate, showToast, t]);

  const allDocumentsGenerated = useCallback(() => {
    return (
      validatedDossiers.Contrat === true &&
      validatedDossiers.FactureAvancee === true &&
      validatedDossiers['QR Code'] === true
    );
  }, [validatedDossiers]);

  const handleDownloadQR = async () => {
    if (!qrRef.current) {
      showToast(t('QR code non disponible', 'QR code tsy misy', 'QR code not available'), 'error');
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
      showToast(t('✅ QR Code téléchargé', '✅ Vita ny fakana QR Code', '✅ QR Code downloaded'), 'success');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      showToast(t('❌ Erreur téléchargement', '❌ Nisy olana', '❌ Download error'), 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoDashboard = () => {
    if (!allDocumentsGenerated()) {
      showToast(t(
        '⚠️ Veuillez générer tous les documents obligatoires avant de retourner à l\'accueil',
        '⚠️ Hamorona ny rakitra rehetra ilaina aloha',
        '⚠️ Please generate all required documents first'
      ), 'warning');
      return;
    }
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <div className="confirmation-loading">
          <Loader2 size={48} className="spinner" strokeWidth={1.5} />
          <p>{t('Chargement du dossier...', 'Maka ny rakitra...', 'Loading file...')}</p>
        </div>
      </>
    );
  }

  if (!usager) {
    return (
      <>
        <MiniSidebar />
        <div className="confirmation-error">
          <AlertCircle size={48} strokeWidth={1.5} />
          <p>{t('Aucun usager trouvé', 'Tsy misy mpampiasa hita', 'No user found')}</p>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-retour">
            {t('Retour au tableau de bord', 'Hiverina amin\'ny tabilao', 'Back to dashboard')}
          </button>
        </div>
      </>
    );
  }

  const IconComponent = typeIcons[usagerType] || Building2;
  const color = typeColors[usagerType] || '#4A90D9';
  const bgColor = typeBgColors[usagerType] || '#f0f0f0';

  return (
    <>
      <MiniSidebar />
      <main className="confirmation-dossier-container">
        <style>{`
          .btn-retour-accueil {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 28px;
            background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.35);
            font-family: inherit;
          }
          .btn-retour-accueil.visible { display: inline-flex; animation: fadeInUp 0.4s ease-out; }
          .btn-retour-accueil:hover {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(39, 174, 96, 0.45);
          }
          .btn-retour-accueil:active { transform: translateY(0); }
          .btn-retour-accueil svg { transition: transform 0.3s ease; }
          .btn-retour-accueil:hover svg { transform: translateX(-4px); }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {notification && (
          <div className={`notif ${notification.type}`}>
            <span>
              {notification.type === 'success' && <CheckCircle size={20} />}
              {notification.type === 'info' && <Info size={20} />}
              {notification.type === 'error' && <XCircle size={20} />}
            </span>
            <span>{notification.message}</span>
            <button type="button" className="notif-close" onClick={() => setNotification(null)}>×</button>
          </div>
        )}

        <div className="confirmation-card">
          <div className="confirmation-header">
            <div className="header-left">
              <div className="header-icon-wrapper" style={{ background: color }}>
                <IconComponent size={28} color="#fff" strokeWidth={1.5} />
              </div>
              <div>
                <h1>{t('Confirmation du dossier', 'Fanamarinana ny rakitra', 'File confirmation')}</h1>
                <p className="header-subtitle">
                  {typeLabels[usagerType] || t('Usager', 'Mpampiasa', 'User')} {t('ajouté avec succès – Téléchargez les documents ci-dessous.', 'nampiana soa aman-tsara – Alaina ny rakitra.', 'added successfully – Download documents below.')}
                </p>
              </div>
            </div>
            <div className="header-badge" style={{ background: bgColor, color }}>
              <span>{typeLabels[usagerType] || t('Usager', 'Mpampiasa', 'User')}</span>
            </div>
          </div>

          <div className="usager-info-card" style={{ borderColor: color, background: bgColor }}>
            <div className="usager-info-grid">
              <div className="info-item">
                <span className="info-label"><FileText size={16} /> ID</span>
                <span className="info-value">#{String(usager.id).padStart(3, '0')}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Building2 size={16} /> {t('Dénomination', 'Anarana', 'Name')}</span>
                <span className="info-value">{usager.denomination || usager.nom_evenement || usager.organisateurs || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><User size={16} /> {t('Demandeur', 'Mpangataka', 'Applicant')}</span>
                <span className="info-value">{usager.demandeur || usager.organisateurs || usager.representant_par || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Phone size={16} /> {t('Téléphone', 'Finday', 'Phone')}</span>
                <span className="info-value">{usager.telephone || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><MapPin size={16} /> {t('Région', 'Faritra', 'Region')}</span>
                <span className="info-value">{usager.region || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Calendar size={16} /> {t('Date création', 'Daty namoronana', 'Creation date')}</span>
                <span className="info-value">{formatDate(usager.created_at) || formatDate(new Date())}</span>
              </div>
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <span className="info-label"><FileText size={16} /> {t('Numéro de dossier', 'Laharana rakitra', 'File number')}</span>
                <span className="info-value" style={{ fontWeight: 'bold', color }}>
                  {usager.numero_dossier_utilisateur || t('Non défini', 'Tsy voafaritra', 'Not defined')}
                </span>
              </div>
              {usagerType === 'occ' && (
                <>
                  <div className="info-item">
                    <span className="info-label"><Ticket size={16} /> {t('Genre manifestation', 'Karazana hetsika', 'Event type')}</span>
                    <span className="info-value">{usager.genre_manifestation || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label"><Calendar size={16} /> {t('Date événement', 'Daty hetsika', 'Event date')}</span>
                    <span className="info-value">{formatDate(usager.date_evenement) || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label"><MapPin size={16} /> {t('Lieu', 'Toerana', 'Location')}</span>
                    <span className="info-value">{usager.lieu_evenement || '-'}</span>
                  </div>
                  {usager.artistes_detail?.length > 0 && (
                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="info-label"><User size={16} /> {t('Artistes', 'Mpihira', 'Artists')}</span>
                      <span className="info-value" style={{ fontSize: '14px' }}>
                        {usager.artistes_detail.map((a, i) => (
                          <span key={i}>
                            {a.prenom ? `${a.prenom} ${a.nom}` : a.nom}
                            {i < usager.artistes_detail.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </>
              )}
              {usager.etoiles && (
                <div className="info-item">
                  <span className="info-label"><Star size={16} /> {t('Étoiles', 'Kintana', 'Stars')}</span>
                  <span className="info-value">{'⭐'.repeat(parseInt(usager.etoiles) || 0)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="documents-card">
            <h3><FileText size={20} /> {t('Documents disponibles', 'Rakitra misy', 'Available documents')}</h3>
            <p className="documents-subtitle">
              {t('Générez et téléchargez les documents du dossier', 'Mamorona sy maka ny rakitra', 'Generate and download documents')}
            </p>

            <div className="documents-grid">
              {/* ✅ CONTRAT — onClick UNIQUEMENT sur le doc-item, le bouton n'a pas d'onClick propre */}
              <div className="doc-item" onClick={handleGenerateContrat}>
                <div className="doc-icon"><FileSignature size={24} color={color} /></div>
                <div className="doc-info">
                  <span className="doc-name">{t('Contrat de représentation', 'Fifanarahana fisolo tena', 'Representation contract')}</span>
                  <span className="doc-size">PDF • {t('Cliquer pour générer', 'Tsindrio hamorona', 'Click to generate')}</span>
                </div>
                <div className="doc-status">
                  {contratGenere ? (
                    <span className="badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#e8f5e9', borderRadius: '6px', color: '#2e7d32' }}>
                      <CheckCircle size={18} color="#27ae60" />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('Contrat généré', 'Vita ny fifanarahana', 'Contract generated')}</span>
                    </span>
                  ) : (
                    <span className="btn-generate" style={{ pointerEvents: 'none' }}>
                      {isGenerating
                        ? <><Loader2 size={16} className="spinner" /> {t('Génération...', 'Famokarana...', 'Generating...')}</>
                        : <><FileSignature size={16} /> {t('Générer contrat', 'Fifanarahana', 'Generate contract')}</>}
                    </span>
                  )}
                </div>
              </div>

              {/* ✅ FACTURE — même principe : onClick UNIQUEMENT sur le doc-item */}
              <div
                className="doc-item"
                onClick={!factureAvanceeCreee ? handleGenerateFactureAvancee : undefined}
                style={{ cursor: factureAvanceeCreee ? 'default' : 'pointer' }}
              >
                <div className="doc-icon"><Receipt size={24} color={color} /></div>
                <div className="doc-info">
                  <span className="doc-name">{t('Facture officielle', 'Faktiora ofisialy', 'Official invoice')}</span>
                  <span className="doc-size">PDF • {t('Cliquer pour générer', 'Tsindrio hamorona', 'Click to generate')}</span>
                </div>
                <div className="doc-status">
                  {factureAvanceeCreee ? (
                    <span className="badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '1px 1px', background: '#e8f5e9', borderRadius: '6px', color: '#2e7d32' }}>
                      <CheckCircle size={18} color="#27ae60" />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('Facture créée', 'Vita ny faktiora', 'Invoice created')}</span>
                    </span>
                  ) : (
                    <span className="btn-facture-avancee" style={{ pointerEvents: 'none' }}>
                      {isCreatingFacture
                        ? <><Loader2 size={18} className="spinner" /> {t('Création...', 'Famoronana...', 'Creating...')}</>
                        : <><Receipt size={15} /> {t('Facture Avancée', 'Faktiora mandroso', 'Advanced Invoice')}</>}
                    </span>
                  )}
                </div>
              </div>

              {/* ✅ QR — onClick UNIQUEMENT sur le doc-item */}
              <div className="doc-item" onClick={handleGenerateQR}>
                <div className="doc-icon"><QrCode size={24} color={color} /></div>
                <div className="doc-info">
                  <span className="doc-name">{t('QR Code sécurisé', 'QR Code azo antoka', 'Secure QR Code')}</span>
                  <span className="doc-size">PNG • {t('Cliquer pour générer', 'Tsindrio hamorona', 'Click to generate')}</span>
                </div>
                <div className="doc-status">
                  {qrGenere ? (
                    <span className="badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#e8f5e9', borderRadius: '6px', color: '#2e7d32' }}>
                      <CheckCircle size={18} color="#27ae60" />
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t('QR généré', 'Vita ny QR', 'QR generated')}</span>
                    </span>
                  ) : (
                    <span className="btn-generate" style={{ pointerEvents: 'none' }}>
                      {isGeneratingQR
                        ? <><Loader2 size={16} className="spinner" /> {t('Génération...', 'Famokarana...', 'Generating...')}</>
                        : <><QrCode size={16} /> {t('Générer code qr', 'Hamorona code qr', 'Generate QR code')}</>}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="documents-actions">
              <button type="button" className={`btn-retour-accueil ${allDocumentsGenerated() ? 'visible' : ''}`} onClick={handleGoDashboard}>
                <ArrowLeft size={18} /> {t('Retour à l\'accueil', 'Hiverina any amin\'ny fandraisana', 'Back to home')}
              </button>
            </div>

            {!allDocumentsGenerated() && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff8e1', border: '1px solid #f39c12', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#7a5c00' }}>
                <AlertCircle size={16} color="#f39c12" />
                <span>
                  {t('Veuillez générer tous les documents obligatoires. Restant :', 'Hamorona ny rakitra rehetra. Sisa :', 'Please generate all required documents. Remaining:')}
                  {!validatedDossiers.Contrat && ` ${t('Contrat', 'Fifanarahana', 'Contract')},`}
                  {!validatedDossiers.FactureAvancee && ` ${t('Facture', 'Faktiora', 'Invoice')},`}
                  {!validatedDossiers['QR Code'] && ` QR Code,`}
                </span>
              </div>
            )}
          </div>
        </div>

        {showQrModal && qrCodeData && (
          <div className="modal-overlay qr-modal-overlay" onClick={() => setShowQrModal(false)}>
            <div className="modal-content qr-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header qr-modal-header">
                <h3><QrCode size={20} /> QR Code OMDA</h3>
                <button type="button" className="modal-close" onClick={() => setShowQrModal(false)}>×</button>
              </div>

              <div className="qr-body">
                <div className="qr-preview-container" ref={qrRef}>
                  <div className="qr-code-wrapper-only">
                    <div className="qr-red-border">
                      <div className="qr-code-container">
                        <QRCodeCanvas value={qrCodeData.qrText} size={240} bgColor="#ffffff" fgColor="#dc2626" level="L" includeMargin={true} />
                        <div className="qr-logo-styled">
                          <div className="qr-logo-circle">
                            <img src="/logo.ico" alt="OMDA" className="qr-logo-img" />
                          </div>
                        </div>
                      </div>
                      <div className="qr-omda-footer">OFFICE MALAGASY DU <br /> DROIT D'AUTEUR</div>
                    </div>
                  </div>
                </div>

                <div className="qr-data-preview">
                  <p className="qr-data-title">📋 {t('Contenu', 'Votoatiny', 'Content')} :</p>
                  <div className="qr-data-content">
                    {qrCodeData.qrText.split('\n').map((line, index) => {
                      if (!line.trim()) return null;
                      if (line.toLowerCase().includes('artistes') || line.toLowerCase().includes('mpihira')) {
                        return <div key={index} className="qr-artist-line"><strong>{line}</strong></div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                </div>

                <div className="qr-actions-only">
                  <button type="button" className="btn-cancel" onClick={() => setShowQrModal(false)}>
                    {t('Fermer', 'Hidio', 'Close')}
                  </button>
                  <button type="button" className="btn-download-qr-only" onClick={handleDownloadQR} disabled={isDownloading}>
                    {isDownloading
                      ? <><Loader2 size={18} className="spinner" /> {t('Téléchargement...', 'Maka...', 'Downloading...')}</>
                      : <><Download size={18} /> {t('Télécharger', 'Alaina', 'Download')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default ConfirmationDossier;