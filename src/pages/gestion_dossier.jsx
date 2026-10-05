// src/pages/GestionDossier.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import {
  FileText, Receipt, QrCode, Download, Printer, CheckCircle, XCircle,
  Info, AlertCircle, User, Phone, MapPin, Calendar, Star,
  Hotel, Store, Bus, PartyPopper, Tv2, Ticket, File, ArrowLeft,
  Clock, CreditCard, FileCheck, Loader2, FileSignature,
  Home, FolderOpen, FileArchive, Shield, Settings, Database,
  BarChart3, PieChart, TrendingUp, Users, DollarSign,
  ChevronRight, ChevronDown, Plus, Edit3, Trash2, Eye,
  Table, LayoutGrid, Search, Filter, RefreshCw, Globe,
  Mail, Headphones, Music, Briefcase, Layers, Box,
  HardDrive, Cpu, Server, Lock, Key, ShieldCheck,
  Upload, Copy, Clipboard, Menu, Maximize2, Hash, Banknote,
  Grid, List, ChevronsRight, Activity, PieChart as PieChartIcon,
  CreditCard as CreditCardIcon, Wallet, FileSpreadsheet, PieChart as PieChartIcon2,
  ChevronLeft
} from 'lucide-react';
import '../styles/gestion_dossier.css';
import MiniSidebar from '../components/MiniSidebar';
import { useT } from '../hooks/useT';

import { generateHotelPDF } from './pdf/hotel_pdf';
import { generateMagasinPDF } from './pdf/magasin_pdf';
import { generateMediaPDF } from './pdf/media_pdf';
import { generateNightPDF } from './pdf/night_pdf';
import { generateBusPDF } from './pdf/bus_pdf';
import { generateFacturePDF } from './pdf/facture_pdf_g';
import { generateBilanGlobalPDF } from './pdf/bilanGlobal_pdf';

const API_BASE = 'http://localhost:3001/api';

const GestionDossier = () => {
  const navigate = useNavigate();
  const qrRef = useRef(null);

  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [currentPath, setCurrentPath] = useState('OMDA /');
  const [viewMode, setViewMode] = useState('root');
  const [displayMode, setDisplayMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [usagers, setUsagers] = useState([]);
  const [filteredUsagers, setFilteredUsagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedUsagerForDetails, setSelectedUsagerForDetails] = useState(null);
  const [showUsagerDetails, setShowUsagerDetails] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [processingDoc, setProcessingDoc] = useState(null);
  const [validatedDossiers, setValidatedDossiers] = useState({});
  const [stats, setStats] = useState(null);
  const [qrCompteur, setQrCompteur] = useState(1);
  const [bilanData, setBilanData] = useState(null);

  // ✅ NOUVEAU : Cache des régions pour QR (comme ConfirmationDossier)
  const [regionsCache, setRegionsCache] = useState([]);

  const categoryMapping = useMemo(() => ({
    'Occasionnelle': 'occ',
    'Tele / Radio': 'media',
    'Magasin/Autre': 'grand-surface',
    'Night-Club': 'nightclub',
    'Hotel': 'hotel',
    'Transport': 'bus'
  }), []);

  const typeColors = useMemo(() => ({
    'occ': '#f59e0b', 'media': '#f43f5e', 'grand-surface': '#8b5cf6',
    'nightclub': '#ec4899', 'hotel': '#6366f1', 'transport': '#06b6d4'
  }), []);

  const typeIcons = useMemo(() => ({
    'occ': Ticket, 'media': Tv2, 'grand-surface': Store,
    'nightclub': PartyPopper, 'hotel': Hotel, 'transport': Bus
  }), []);

  const getRefClientTypeFromApi = useCallback((apiType) => {
    const mapping = {
      'hotel': 'HTL', 'grand-surface': 'MGS', 'media': 'RDP',
      'bus': 'TRP', 'nightclub': 'NGT', 'occ': 'OCC', 'other': 'OTH'
    };
    return mapping[apiType] || 'AUT';
  }, []);

  const getDefaultFonction = useCallback((apiType) => {
    const mapping = {
      'hotel': t('Directeur', 'Tale', 'Director'),
      'grand-surface': t('Gérant', 'Mpitantana', 'Manager'),
      'bus': t('Responsable transport', 'Mpitantana fitaterana', 'Transport manager'),
      'media': t('Directeur de publication', 'Tale ny famoahana', 'Publication director'),
      'nightclub': t('Gérant', 'Mpitantana', 'Manager'),
      'occ': t('Organisateur', 'Mpikarakara', 'Organizer')
    };
    return mapping[apiType] || t('Représentant légal', 'Mpisolotena ara-dalàna', 'Legal representative');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDocumentsForType = useCallback((apiType) => {
    if (apiType === 'occ') return ['Facture', 'QR Code'];
    return ['Contrat', 'Facture', 'QR Code'];
  }, []);

  // ============================================================
  // ✅ NOUVEAU : Charger les régions pour QR
  // ============================================================
  const loadRegions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/regions`);
      const data = await response.json();
      if (data.success && Array.isArray(data.regions)) {
        setRegionsCache(data.regions);
        return data.regions;
      }
    } catch (error) {
      console.error('⚠️ Erreur chargement régions:', error);
    }
    return [];
  }, []);

  // ✅ Récupérer les infos d'une région par son nom
  const getRegionInfo = useCallback((regionName) => {
    if (!regionName || !regionsCache || regionsCache.length === 0) return null;
    const normalized = String(regionName).trim().toLowerCase();
    return regionsCache.find(r => (r.nom || '').trim().toLowerCase() === normalized) || null;
  }, [regionsCache]);

  // ✅ Formater un numéro de téléphone
  const formatPhoneNumber = useCallback((phone) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\s/g, '').replace(/[^0-9]/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)}`;
  }, []);

  const utilityFolders = useMemo(() => [
    {
      id: 'bilan_annuel',
      name: t('Bilan Annuel', 'Bilan Isan-taona', 'Annual Report'),
      icon: BarChart3, color: '#2ecc71',
      desc: t("Résumé financier de l'année", "Fanintan'ny taona", 'Financial summary of the year'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_global',
      details: {
        title: t(
          `Bilan Annuel ${new Date().getFullYear()}`,
          `Bilan Isan-taona ${new Date().getFullYear()}`,
          `Annual Report ${new Date().getFullYear()}`
        ),
        content: t(
          "Rapport financier complet de l'Office Malagasy du Droit d'Auteur.",
          "Tatitra feno momba ny fitantanam-bola OMDA.",
          'Complete financial report of the Malagasy Copyright Office.'
        ),
        sections: [
          { label: t('Recettes totales', 'Vola miditra', 'Total revenue'), value: t('Voir Bilan Global (PDF)', 'Jereo Bilan Global (PDF)', 'See Global Report (PDF)') },
          { label: t('Dossiers traités (total)', 'Rakitra voahodina', 'Processed files'), value: t('Voir Bilan Global (PDF)', 'Jereo Bilan Global (PDF)', 'See Global Report (PDF)') },
          { label: t('Dernière génération', 'Famokarana farany', 'Last generation'), value: new Date().toLocaleDateString(locale) }
        ],
        files: [{ name: 'Bilan_Annuel.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    },
    {
      id: 'bilan_region',
      name: t('Bilan par Région', 'Bilan isaky ny Faritra', 'Report by Region'),
      icon: MapPin, color: '#3498db',
      desc: t('Résumé par région et par semestre', 'Fanintan\'ny faritra sy ny enim-bolana', 'Summary by region and semester'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_region',
      details: {
        title: t(`Bilan par Région - ${new Date().getFullYear()}`, `Bilan isaky ny Faritra - ${new Date().getFullYear()}`, `Report by Region - ${new Date().getFullYear()}`),
        content: t('Rapport détaillé par région avec répartition semestrielle.', 'Tatitra amin\'ny faritra tsirairay.', 'Detailed report by region with half-yearly breakdown.'),
        sections: [
          { label: t('Période', 'Fe-potoana', 'Period'), value: t('Année en cours', 'Taona ankehitriny', 'Current year') },
          { label: t('Source des données', 'Loharanom-baovao', 'Data source'), value: t('Table facture_usager', 'Tabilao facture_usager', 'facture_usager table') },
          { label: t('Mise à jour', 'Fanavaozana', 'Update'), value: t('Temps réel', 'Amin\'ny fotoana', 'Real-time') }
        ],
        files: [{ name: 'Bilan_Region.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    },
    {
      id: 'paiements',
      name: t('Paiements', 'Fandoavana', 'Payments'),
      icon: CreditCardIcon, color: '#9b59b6',
      desc: t('Historique des paiements', 'Tantaran\'ny fandoavana', 'Payment history'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_paiements',
      details: {
        title: t(`Historique des Paiements - ${new Date().getFullYear()}`, `Tantaran\'ny Fandoavana - ${new Date().getFullYear()}`, `Payment History - ${new Date().getFullYear()}`),
        content: t('Liste complète des paiements enregistrés.', 'Lisitra feno ny fandoavana voarakitra.', 'Complete list of recorded payments.'),
        sections: [
          { label: t('Total des paiements', 'Totalin\'ny fandoavana', 'Total payments'), value: t('Voir détails', 'Jereo ny antsipiriany', 'See details') },
          { label: t('Dernière mise à jour', 'Fanavaozana farany', 'Last update'), value: new Date().toLocaleDateString(locale) }
        ],
        files: [{ name: 'Paiements.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    },
    {
      id: 'recettes',
      name: t('Recettes', 'Vola miditra', 'Revenue'),
      icon: Wallet, color: '#f39c12',
      desc: t('Recettes par catégorie', 'Vola miditra isaky ny sokajy', 'Revenue by category'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_recettes',
      details: {
        title: t(`Recettes - ${new Date().getFullYear()}`, `Vola miditra - ${new Date().getFullYear()}`, `Revenue - ${new Date().getFullYear()}`),
        content: t('Récapitulatif des recettes par catégorie.', 'Fanintan\'ny vola miditra isaky ny sokajy.', 'Summary of revenue by category.'),
        sections: [
          { label: t('Total des recettes', 'Totalin\'ny vola miditra', 'Total revenue'), value: t('Voir détails', 'Jereo ny antsipiriany', 'See details') },
          { label: t('Dernière mise à jour', 'Fanavaozana farany', 'Last update'), value: new Date().toLocaleDateString(locale) }
        ],
        files: [{ name: 'Recettes.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    },
    {
      id: 'rapport_mensuel',
      name: t('Rapport Mensuel', 'Tatitra isam-bolana', 'Monthly Report'),
      icon: FileSpreadsheet, color: '#1abc9c',
      desc: t('Rapport du mois en cours', 'Tatitry ny volana ankehitriny', 'Current month report'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_mensuel',
      details: {
        title: t(
          `Rapport Mensuel - ${new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`,
          `Tatitra isam-bolana - ${new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`,
          `Monthly Report - ${new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`
        ),
        content: t('Statistiques et indicateurs de performance du mois en cours.', 'Statistika sy famantarana ny zava-bita amin\'ity volana ity.', 'Statistics and performance indicators of the current month.'),
        sections: [
          { label: t('Période', 'Fe-potoana', 'Period'), value: new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' }) },
          { label: t('Source des données', 'Loharanom-baovao', 'Data source'), value: t('Table facture_usager', 'Tabilao facture_usager', 'facture_usager table') },
          { label: t('Mise à jour', 'Fanavaozana', 'Update'), value: t('Temps réel', 'Amin\'ny fotoana', 'Real-time') }
        ],
        files: [{ name: 'Rapport_Mensuel.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    },
    {
      id: 'stats_globales',
      name: t('Statistiques Globales', 'Statistika ankapobeny', 'Global Statistics'),
      icon: PieChartIcon2, color: '#e74c3c',
      desc: t('Statistiques complètes', 'Statistika feno', 'Complete statistics'),
      itemCount: t('Générer PDF', 'Hamorona PDF', 'Generate PDF'),
      pdfAction: 'bilan_stats',
      details: {
        title: t(`Statistiques Globales - ${new Date().getFullYear()}`, `Statistika ankapobeny - ${new Date().getFullYear()}`, `Global Statistics - ${new Date().getFullYear()}`),
        content: t("Statistiques complètes de l'OMDA.", 'Statistika feno ny OMDA.', 'Complete OMDA statistics.'),
        sections: [
          { label: t('Total dossiers', 'Totalin\'ny rakitra', 'Total files'), value: t('Voir détails', 'Jereo ny antsipiriany', 'See details') },
          { label: t('Total usagers', 'Totalin\'ny mpampiasa', 'Total users'), value: t('Voir détails', 'Jereo ny antsipiriany', 'See details') },
          { label: t('Dernière mise à jour', 'Fanavaozana farany', 'Last update'), value: new Date().toLocaleDateString(locale) }
        ],
        files: [{ name: 'Statistiques.pdf', size: t('Généré à la demande', 'Vokatra amin\'ny fangatahana', 'Generated on demand'), action: 'bilan' }]
      }
    }
  ], [t, locale]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('userId');
        const response = await fetch(`${API_BASE}/auth/current-user`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const data = await response.json();
        if (data.success && data.user) setCurrentUser(data.user);
      } catch (error) {
        console.error('Erreur récupération utilisateur:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // ✅ Charger les régions au montage
  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const types = ['hotel', 'grand-surface', 'media', 'bus', 'nightclub', 'occ'];
        const parCategorie = {};

        for (const type of types) {
          try {
            const res = await fetch(`${API_BASE}/factures/type/${type}`);
            const data = await res.json();
            if (data.success && data.usagers) {
              const now = new Date();
              const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
              let montantTotal = 0;
              let nouveaux = 0;

              data.usagers.forEach(u => {
                montantTotal += parseFloat(u.soit_total || u.montant_mensuel || 0);
                const createdAt = u.created_at ? new Date(u.created_at) : null;
                if (createdAt && createdAt >= debutMois) nouveaux += 1;
              });

              parCategorie[type] = {
                total: data.usagers.length,
                nouveaux,
                montant: montantTotal
              };
            } else {
              parCategorie[type] = { total: 0, nouveaux: 0, montant: 0 };
            }
          } catch (err) {
            console.warn(`⚠️ Erreur stats ${type}:`, err.message);
            parCategorie[type] = { total: 0, nouveaux: 0, montant: 0 };
          }
        }

        setStats(parCategorie);

        const totalDossiers = Object.values(parCategorie).reduce((acc, s) => acc + (s.total || 0), 0);
        const totalMontant = Object.values(parCategorie).reduce((acc, s) => acc + (s.montant || 0), 0);
        const totalNouveaux = Object.values(parCategorie).reduce((acc, s) => acc + (s.nouveaux || 0), 0);

        setStatsData({
          totalDossiers,
          totalUsagers: totalDossiers,
          totalPaiements: totalDossiers,
          totalMontant,
          nouveaux: totalNouveaux,
          parCategorie
        });
      } catch (error) {
        console.error('❌ Erreur chargement stats:', error);
      }
    };
    fetchStats();
  }, []);

  const fetchBilanData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/bilan/global`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setBilanData(data.data);
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération bilan:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`
      });
      setTimeout(() => setNotification(null), 3000);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsagersByCategory = useCallback(async (categoryName) => {
    setLoading(true);
    const apiType = categoryMapping[categoryName];
    try {
      console.log(`📊 Chargement des usagers pour: ${categoryName} (${apiType})`);

      const response = await fetch(`${API_BASE}/factures/type/${apiType}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success && data.usagers) {
        let usagersEnrichis = data.usagers;

        if (apiType === 'occ') {
          usagersEnrichis = await Promise.all(
            data.usagers.map(async (usager) => {
              try {
                const artistesResponse = await fetch(`${API_BASE}/occ/artistes/details/${usager.id}`);
                if (artistesResponse.ok) {
                  const artistesData = await artistesResponse.json();
                  if (artistesData.success && artistesData.artistes) {
                    return { ...usager, artistes_detail: artistesData.artistes };
                  }
                }
                return usager;
              } catch (err) {
                console.error(`❌ Erreur artistes usager ${usager.id}:`, err);
                return usager;
              }
            })
          );
        }

        const usagersAvecPaiements = await Promise.all(
          usagersEnrichis.map(async (usager) => {
            try {
              const paiementsRes = await fetch(`${API_BASE}/paiements/usager/${usager.id}/${apiType}`);
              if (paiementsRes.ok) {
                const paiementsData = await paiementsRes.json();
                if (paiementsData.success && paiementsData.paiements) {
                  const paiements = paiementsData.paiements;
                  const moisPayes = paiements
                    .filter(p => p.statut === 'paye')
                    .map(p => p.mois)
                    .filter(Boolean)
                    .sort((a, b) => a - b);
                  const montantPaye = paiements
                    .filter(p => p.statut === 'paye')
                    .reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);

                  return {
                    ...usager,
                    paiements,
                    nbMoisPayes: moisPayes.length,
                    moisPayes,
                    montantPaye,
                    statutPaiement: moisPayes.length >= 12 ? 'bon-payeur'
                      : moisPayes.length >= 6 ? 'payeur-moyen'
                      : moisPayes.length > 0 ? 'mauvais-payeur'
                      : 'non-payeur'
                  };
                }
              }
              return usager;
            } catch (err) {
              console.error(`❌ Erreur paiements usager ${usager.id}:`, err);
              return usager;
            }
          })
        );

        setUsagers(usagersAvecPaiements);
        setFilteredUsagers(usagersAvecPaiements);
        console.log(`✅ ${usagersAvecPaiements.length} usagers enrichis pour ${categoryName}`);
      } else {
        setUsagers([]);
        setFilteredUsagers([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement dossiers:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`
      });
      setTimeout(() => setNotification(null), 3000);
      setUsagers([]);
      setFilteredUsagers([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryMapping]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = usagers.filter(u =>
        (u.denomination?.toLowerCase() || '').includes(term) ||
        (u.demandeur?.toLowerCase() || '').includes(term) ||
        (u.organisateurs?.toLowerCase() || '').includes(term) ||
        (u.telephone || '').includes(term) ||
        (u.numero_dossier_utilisateur?.toLowerCase() || '').includes(term) ||
        (u.quittance || '').includes(term) ||
        (u.region_usager?.toLowerCase() || '').includes(term)
      );
      setFilteredUsagers(filtered);
    } else {
      setFilteredUsagers(usagers);
    }
  }, [searchTerm, usagers]);

  const handleOpenCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setViewMode('sub');
    setCurrentPath(`OMDA / ${categoryName} /`);
    loadUsagersByCategory(categoryName);
  };

  const handleGoBack = () => {
    setViewMode('root');
    setSelectedCategory(null);
    setCurrentPath('OMDA /');
    setSearchTerm('');
    setUsagers([]);
    setFilteredUsagers([]);
  };

  const handleGoDashboard = () => navigate('/dashboard');

  const handleOpenUtilityFolder = (folder) => {
    setSelectedUtility(folder);
    setShowUtilityModal(true);
    if (folder.pdfAction) handleGenerateUtilityPDF(folder.pdfAction);
  };

  const getUtilityTitle = useCallback((actionType) => {
    const titles = {
      'bilan_global': t('Bilan Global', 'Bilan ankapobeny', 'Global Report'),
      'bilan_region': t('Bilan par Région', 'Bilan isaky ny Faritra', 'Report by Region'),
      'bilan_paiements': t('Historique des Paiements', 'Tantaran\'ny Fandoavana', 'Payment History'),
      'bilan_recettes': t('Recettes par Catégorie', 'Vola miditra isaky ny sokajy', 'Revenue by Category'),
      'bilan_mensuel': t('Rapport Mensuel', 'Tatitra isam-bolana', 'Monthly Report'),
      'bilan_stats': t('Statistiques Globales', 'Statistika ankapobeny', 'Global Statistics')
    };
    return titles[actionType] || t('Bilan OMDA', 'Bilan OMDA', 'OMDA Report');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateUtilityPDF = async (actionType) => {
    try {
      setNotification({
        type: 'info',
        message: `🔄 ${t('Génération du PDF...', 'Famokarana PDF...', 'Generating PDF...')}`
      });
      const data = await fetchBilanData();
      if (!data) {
        setNotification({
          type: 'error',
          message: `❌ ${t('Impossible de récupérer les données', 'Tsy afaka maka ny angona', 'Unable to fetch data')}`
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      const options = {
        annee: new Date().getFullYear(),
        responsable: currentUser?.nom || 'DAF',
        dateGeneration: new Date().toLocaleDateString(locale),
        actionType,
        title: getUtilityTitle(actionType)
      };
      const result = await generateBilanGlobalPDF(data, options);
      setNotification(result
        ? { type: 'success', message: `✅ ${t('PDF généré', 'PDF vita', 'PDF generated')}` }
        : { type: 'error', message: `❌ ${t('Erreur', 'Olana', 'Error')}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleShowUsagerDetails = (usager) => {
    setSelectedUsagerForDetails(usager);
    setShowUsagerDetails(true);
  };

  const handleGenerateBilanGlobal = async () => {
    try {
      setNotification({
        type: 'info',
        message: `🔄 ${t('Génération du Bilan Global...', 'Famokarana ny Bilan Global...', 'Generating Global Report...')}`
      });
      const data = await fetchBilanData();
      if (!data) {
        setNotification({
          type: 'error',
          message: `❌ ${t('Impossible de récupérer les données', 'Tsy afaka maka ny angona', 'Unable to fetch data')}`
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      const result = await generateBilanGlobalPDF(data, {
        annee: new Date().getFullYear(),
        responsable: currentUser?.nom || 'DAF',
        dateGeneration: new Date().toLocaleDateString(locale),
        actionType: 'bilan_global',
        title: t('Bilan Global OMDA', 'Bilan Global OMDA', 'OMDA Global Report')
      });
      setNotification(result
        ? { type: 'success', message: `✅ ${t('Bilan Global généré', 'Bilan Global vita', 'Global Report generated')}` }
        : { type: 'error', message: `❌ ${t('Erreur', 'Olana', 'Error')}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  }, [locale]);

  const formatDateForQR = useCallback((dateString) => {
    if (!dateString) return t('Date non spécifiée', 'Daty tsy voafaritra', 'Date not specified');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('Date invalide', 'Daty diso', 'Invalid date');
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return t('Date invalide', 'Daty diso', 'Invalid date');
    }
  }, [locale, t]);

  const formatMontant = useCallback((valeur) => {
    const n = Math.round(Number(valeur) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }, []);

  const normalizeFactureForContrat = useCallback((f, apiType) => {
    const representantNom = f?.representant_nom || f?.demandeur || f?.representant_par || f?.proprietaire_nom || f?.organisateurs || '';
    const representantAdresse = f?.representant_adresse || f?.adresse_siege || f?.adresse || f?.siege || f?.domicile || '';
    const representantTel = f?.representant_tel || f?.telephone || f?.proprietaire_tel || '';
    const representantCin = f?.representant_cin || f?.cin || f?.proprietaire_cin || '';
    const representantCinDelivree = f?.representant_cin_delivree || f?.cin_delivree || f?.proprietaire_cin_delivree || null;
    const representantCinLieu = f?.representant_cin_lieu || f?.cin_lieu || f?.proprietaire_cin_lieu || 'Antananarivo';
    const representantFonction = f?.representant_fonction || f?.proprietaire_fonction || f?.fonction || getDefaultFonction(apiType);

    return {
      id: f?.id || 0,
      denomination: f?.denomination || f?.nom || f?.nom_evenement || '',
      demandeur: f?.demandeur || f?.organisateurs || '',
      telephone: f?.telephone || '',
      email: f?.email || '',
      adresse: f?.adresse || f?.siege || f?.adresse_siege || f?.domicile || '',
      siege: f?.siege || f?.adresse || '',
      adresse_siege: f?.adresse_siege || f?.adresse || f?.siege || '',
      nif: f?.nif || '',
      stat: f?.stat || '',
      nif_stat: f?.nif_stat || [f?.nif, f?.stat].filter(Boolean).join(' / '),
      montant_mensuel: parseFloat(f?.montant_mensuel || f?.montant || 0),
      frais_dossier: parseFloat(f?.frais_dossier || 0),
      uniter: parseInt(f?.uniter) || 1,
      region: f?.region || f?.region_usager || '',
      region_usager: f?.region_usager || f?.region || '',
      created_at: f?.created_at || f?.date_ajout || new Date().toISOString(),
      date_ajout: f?.date_ajout || f?.created_at || new Date().toISOString(),
      numero_dossier_utilisateur: f?.numero_dossier_utilisateur || '',
      quittance: f?.quittance || '',
      soit_total: parseFloat(f?.soit_total || f?.montant_total || f?.montant_mensuel || 0),
      montant_total: parseFloat(f?.montant_total || f?.soit_total || f?.montant_mensuel || 0),
      moyens_communication: f?.moyens_communication || {},
      total: f?.total || '',
      a_compter_du: f?.a_compter_du || null,
      echeance: f?.echeance || null,
      confirmation_nom: f?.confirmation_nom || f?.demandeur || representantNom,
      date_signature: f?.date_signature || null,
      lieu_signature: f?.lieu_ajout || f?.lieu_signature || 'Antananarivo',
      lieu_ajout: f?.lieu_ajout || 'Antananarivo',
      etoiles: f?.etoiles || '',
      ravinala: f?.ravinala || false,
      nombre_magasins: parseInt(f?.nombre_magasins) || 0,
      nombre_vehicules: parseInt(f?.nombre_vehicules) || 0,
      jauge_max: parseInt(f?.jauge_max) || 0,
      lignes: f?.lignes || '',
      type_bus: f?.type_bus || '',
      trajet: f?.trajet || '',
      horaires: f?.horaires || '',
      zones_desservies: f?.zones_desservies || '',
      activite: f?.activite || '',
      representant_par: f?.representant_par || '',
      representant_nom: representantNom,
      representant_adresse: representantAdresse,
      representant_tel: representantTel,
      representant_cin: representantCin,
      representant_cin_delivree: representantCinDelivree,
      representant_cin_lieu: representantCinLieu,
      representant_fonction: representantFonction,
      cin: representantCin,
      cin_delivree: representantCinDelivree,
      cin_lieu: representantCinLieu,
      nom_signataire: representantNom,
      proprietaire_nom: f?.proprietaire_nom || representantNom,
      proprietaire_adresse: f?.proprietaire_adresse || representantAdresse,
      proprietaire_tel: f?.proprietaire_tel || representantTel,
      proprietaire_cin: f?.proprietaire_cin || representantCin,
      proprietaire_cin_delivree: f?.proprietaire_cin_delivree || representantCinDelivree,
      proprietaire_cin_lieu: f?.proprietaire_cin_lieu || representantCinLieu,
      proprietaire_fonction: f?.proprietaire_fonction || representantFonction,
      organisateurs: f?.organisateurs || f?.demandeur || representantNom,
      genre_manifestation: f?.genre_manifestation || '',
      date_evenement: f?.date_evenement || null,
      lieu_evenement: f?.lieu_evenement || '',
      nom_evenement: f?.nom_evenement || '',
      artistes: f?.artistes || '',
      artistes_detail: f?.artistes_detail || [],
      domicile: f?.domicile || representantAdresse,
      frequence: f?.frequence || '',
      canal: f?.canal || '',
      taux: parseFloat(f?.taux || 0),
      is_retard: f?.is_retard || false,
      montant_retard: parseFloat(f?.montant_retard || 0),
      ref_usager: f?.ref_usager || f?.id || 0,
      ref_client_type: f?.ref_client_type || getRefClientTypeFromApi(apiType)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRefClientTypeFromApi]);

  // ============================================================
  // ✅ GÉNÉRATION QR — IDENTIQUE À ConfirmationDossier
  //    Avec Ville / Quartier / Téléphone de la région
  //    SANS parenthèses
  // ============================================================
  const generateQRTextContent = useCallback((usager, type) => {
    if (!usager) return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}`;

    const numeroDossier = usager.numero_dossier_utilisateur || `REF-${usager.id}`;
    const omdaDefaultPhone = '034 05 533 88';
    const notSpecified = t('Non spécifié', 'Tsy voafaritra', 'Not specified');

    // ✅ Récupérer ville/quartier/téléphone de la région
    let ville = '';
    let quartier = '';
    let telephoneRegion = '';

    const regionName = usager.region || usager.region_usager || '';

    if (usager.ville) ville = String(usager.ville).trim();
    if (usager.quartier) quartier = String(usager.quartier).trim();
    if (usager.telephone_region) telephoneRegion = String(usager.telephone_region).trim();

    if ((!ville || !quartier || !telephoneRegion) && regionName) {
      const regionInfo = getRegionInfo(regionName);
      if (regionInfo) {
        if (!ville && regionInfo.ville) ville = String(regionInfo.ville).trim();
        if (!quartier && regionInfo.quartier) quartier = String(regionInfo.quartier).trim();
        if (!telephoneRegion && regionInfo.telephone) telephoneRegion = String(regionInfo.telephone).trim();
      }
    }

    // ✅ Ligne Region sans parenthèses
    const buildRegionLine = (region) => {
      return `${t('Region', 'Faritra', 'Region')} : ${region || notSpecified}`;
    };

    // ✅ Footer : © OMDA Ville - Quartier - Tel : XXX
    const buildFooterLine = () => {
      const parts = [];
      if (ville) parts.push(`© OMDA ${ville}`);
      else parts.push(`© OMDA`);
      if (quartier) parts.push(`${quartier}`);
      const tel = telephoneRegion ? formatPhoneNumber(telephoneRegion) : omdaDefaultPhone;
      parts.push(`Tel : ${tel}`);
      return parts.join(' - ');
    };

    const footerLine = buildFooterLine();

    switch (type) {
      case 'occ': {
        const organisateurs = usager.organisateurs || usager.demandeur || notSpecified;
        let artistesStr = notSpecified;
        if (usager.artistes_detail && usager.artistes_detail.length > 0) {
          artistesStr = usager.artistes_detail.map(a => {
            if (a.prenom && a.nom) return `${a.prenom} ${a.nom}`;
            return a.nom || a;
          }).join(', ');
        } else if (usager.artistes) {
          artistesStr = usager.artistes;
        }
        const lieu = usager.lieu_evenement || usager.adresse || notSpecified;
        const dateEvent = usager.date_evenement ? formatDateForQR(usager.date_evenement) : notSpecified;
        const evenement = usager.genre_manifestation || usager.nom_evenement || '';
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme un evenement', 'manamarina hetsika', 'certifies an event')} OCC`,
          `${t('Organisateur', 'Mpikarakara', 'Organizer')} : ${organisateurs}`,
        ];
        if (evenement) lines.push(`${t('Evenement', 'Hetsika', 'Event')} : ${evenement}`);
        if (artistesStr && artistesStr !== notSpecified) {
          lines.push(`${t('Artistes', 'Mpihira', 'Artists')} : ${artistesStr}`);
        }
        if (lieu) lines.push(`${t('Lieu', 'Toerana', 'Location')} : ${lieu}`);
        if (dateEvent && dateEvent !== notSpecified) lines.push(`${t('Date', 'Daty', 'Date')} : ${dateEvent}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      case 'hotel': {
        const denomination = usager.denomination || usager.demandeur || 'HÔTEL';
        const adresse = usager.adresse || usager.siege || usager.adresse_siege || '';
        const etoiles = usager.etoiles ? `${usager.etoiles} ${t('etoile(s)', 'kintana', 'star(s)')}` : '';
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} HOTEL`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (etoiles) lines.push(`${t('Categorie', 'Sokajy', 'Category')} : ${etoiles}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      case 'grand-surface': {
        const denomination = usager.denomination || usager.demandeur || '';
        const adresse = usager.adresse || usager.siege || usager.adresse_siege || '';
        const nb = usager.nombre_magasins || 0;
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} MAGASIN`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (nb > 0) lines.push(`${t('Nb magasins', 'Isan\'ny fivarotana', 'Stores')} : ${nb}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      case 'bus': {
        const denomination = usager.denomination || usager.demandeur || '';
        const adresse = usager.adresse || usager.siege || usager.adresse_siege || '';
        const lignes = usager.lignes || '';
        const nb = usager.nombre_vehicules || 0;
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme une societe', 'manamarina orinasa', 'certifies a company')} BUS`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (lignes) lines.push(`${t('Lignes', 'Lalana', 'Lines')} : ${lignes}`);
        if (nb > 0) lines.push(`${t('Vehicules', 'Fiara', 'Vehicles')} : ${nb}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      case 'nightclub': {
        const denomination = usager.denomination || usager.demandeur || '';
        const adresse = usager.adresse || usager.siege || usager.adresse_siege || '';
        const jauge = usager.jauge_max || 0;
        const horaires = usager.horaires || '';
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme un etablissement', 'manamarina trano', 'certifies an establishment')} NIGHT CLUB`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Adresse', 'Adiresy', 'Address')} : ${adresse}`);
        if (jauge > 0) lines.push(`${t('Jauge', 'Fahaiza-mandray', 'Capacity')} : ${jauge} ${t('pers.', 'olona', 'people')}`);
        if (horaires) lines.push(`${t('Horaires', 'Ora', 'Hours')} : ${horaires}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      case 'media': {
        const denomination = usager.denomination || usager.demandeur || '';
        const adresse = usager.siege || usager.adresse_siege || usager.adresse || '';
        const frequence = usager.frequence || '';
        const canal = usager.canal || '';
        const region = usager.region || usager.region_usager || '';

        let lines = [
          `OMDA ${t('affirme une station', 'manamarina station', 'certifies a station')} MEDIA`,
          `${t('Denomination', 'Anarana', 'Name')} : ${denomination}`,
        ];
        if (adresse) lines.push(`${t('Siege', 'Foibe', 'Head office')} : ${adresse}`);
        if (frequence) lines.push(`${t('Frequence', 'Fahita', 'Frequency')} : ${frequence}`);
        if (canal) lines.push(`${t('Canal', 'Fantsona', 'Channel')} : ${canal}`);
        lines.push(buildRegionLine(region));
        lines.push(`Ref : ${numeroDossier}`);
        lines.push(footerLine);
        return lines.join('\n');
      }

      default:
        return `© OMDA - ${t('Document officiel', 'Rakitra ofisialy', 'Official document')}\nRef: ${numeroDossier}\n${footerLine}`;
    }
  }, [t, formatDateForQR, getRegionInfo, formatPhoneNumber]);

  const handleOpenDocument = async (usager, docType) => {
    if (!usager) return;
    const apiType = categoryMapping[selectedCategory] || 'hotel';
    setProcessingDoc({ usagerId: usager.id, docType });

    try {
      setNotification({
        type: 'info',
        message: `${t('Génération du', 'Famokarana ny', 'Generating')} ${docType}...`
      });

      const representantNom = usager.representant_nom || usager.demandeur || usager.representant_par || usager.proprietaire_nom || usager.organisateurs || '';
      const representantAdresse = usager.representant_adresse || usager.adresse_siege || usager.adresse || usager.siege || usager.domicile || '';
      const representantTel = usager.representant_tel || usager.telephone || usager.proprietaire_tel || '';
      const representantCin = usager.representant_cin || usager.cin || usager.proprietaire_cin || '';
      const representantCinDelivree = usager.representant_cin_delivree || usager.cin_delivree || usager.proprietaire_cin_delivree || null;
      const representantCinLieu = usager.representant_cin_lieu || usager.cin_lieu || usager.proprietaire_cin_lieu || 'Antananarivo';
      const representantFonction = usager.representant_fonction || usager.proprietaire_fonction || usager.fonction || getDefaultFonction(apiType);

      const usagerComplet = {
        ...usager,
        denomination: usager.denomination || usager.nom || usager.nom_evenement || t('Sans nom', 'Tsy misy anarana', 'No name'),
        demandeur: usager.demandeur || usager.organisateurs || usager.representant_par || '',
        telephone: usager.telephone || usager.representant_tel || '',
        email: usager.email || '',
        adresse: usager.adresse || usager.siege || usager.adresse_siege || usager.domicile || '',
        siege: usager.siege || usager.adresse || '',
        adresse_siege: usager.adresse_siege || usager.adresse || usager.siege || '',
        region: usager.region || usager.region_usager || '',
        representant_nom: representantNom,
        representant_adresse: representantAdresse,
        representant_tel: representantTel,
        representant_cin: representantCin,
        representant_cin_delivree: representantCinDelivree,
        representant_cin_lieu: representantCinLieu,
        representant_fonction: representantFonction,
        confirmation_nom: usager.confirmation_nom || usager.demandeur || representantNom,
        cin: representantCin,
        cin_delivree: representantCinDelivree,
        cin_lieu: representantCinLieu,
        nom_signataire: representantNom,
        proprietaire_nom: usager.proprietaire_nom || representantNom,
        proprietaire_adresse: usager.proprietaire_adresse || representantAdresse,
        proprietaire_tel: usager.proprietaire_tel || representantTel,
        proprietaire_cin: usager.proprietaire_cin || representantCin,
        proprietaire_cin_delivree: usager.proprietaire_cin_delivree || representantCinDelivree,
        proprietaire_cin_lieu: usager.proprietaire_cin_lieu || representantCinLieu,
        proprietaire_fonction: usager.proprietaire_fonction || representantFonction,
        montant_mensuel: parseFloat(usager.montant_mensuel || usager.montant || 0),
        frais_dossier: parseFloat(usager.frais_dossier || 0),
        montant_retard: parseFloat(usager.montant_retard || 0),
        soit_total: parseFloat(usager.soit_total || usager.montant_total || usager.montant_mensuel || 0),
        uniter: parseInt(usager.uniter) || 1,
        is_retard: usager.is_retard || false,
        numero_dossier_utilisateur: usager.numero_dossier_utilisateur || '',
        numero_dossier_global: usager.numero_dossier_global || '',
        quittance: usager.quittance || '',
        ref_usager: usager.ref_usager || usager.id || 0,
        ref_client_type: usager.ref_client_type || getRefClientTypeFromApi(apiType),
        created_at: usager.created_at || usager.date_ajout || new Date().toISOString(),
        date_ajout: usager.date_ajout || usager.created_at || new Date().toISOString(),
        a_compter_du: usager.a_compter_du || null,
        echeance: usager.echeance || null,
        date_signature: usager.date_signature || null,
        lieu_signature: usager.lieu_signature || usager.lieu_ajout || 'Antananarivo',
        lieu_ajout: usager.lieu_ajout || 'Antananarivo',
        etoiles: usager.etoiles || '',
        ravinala: usager.ravinala || false,
        activite: usager.activite || '',
        nombre_magasins: parseInt(usager.nombre_magasins) || 0,
        nombre_vehicules: parseInt(usager.nombre_vehicules) || 0,
        lignes: usager.lignes || '',
        type_bus: usager.type_bus || '',
        trajet: usager.trajet || '',
        zones_desservies: usager.zones_desservies || '',
        jauge_max: parseInt(usager.jauge_max) || 0,
        horaires: usager.horaires || '',
        frequence: usager.frequence || '',
        canal: usager.canal || '',
        nif: usager.nif || '',
        stat: usager.stat || '',
        nif_stat: usager.nif_stat || [usager.nif, usager.stat].filter(Boolean).join(' / '),
        taux: parseFloat(usager.taux || 0),
        organisateurs: usager.organisateurs || usager.demandeur || representantNom,
        representant_par: usager.representant_par || '',
        genre_manifestation: usager.genre_manifestation || '',
        artistes: usager.artistes || '',
        artistes_detail: usager.artistes_detail || [],
        date_evenement: usager.date_evenement || null,
        lieu_evenement: usager.lieu_evenement || '',
        domicile: usager.domicile || usager.adresse || '',
        paiements: usager.paiements || [],
        nbMoisPayes: usager.nbMoisPayes || 0,
        moisPayes: usager.moisPayes || [],
        montantPaye: usager.montantPaye || 0,
        statutPaiement: usager.statutPaiement || 'non-payeur',
        type_usager: apiType
      };

      switch (docType) {
        case 'Contrat': {
          if (apiType === 'occ') {
            throw new Error(t(
              "Le contrat n'est pas disponible pour les dossiers OCC",
              "Tsy misy fifanarahana ho an'ny rakitra OCC",
              'Contract is not available for OCC files'
            ));
          }
          const normalizedData = normalizeFactureForContrat(usagerComplet, apiType);
          switch (apiType) {
            case 'hotel': await generateHotelPDF(normalizedData); break;
            case 'grand-surface': await generateMagasinPDF(normalizedData); break;
            case 'media': await generateMediaPDF(normalizedData); break;
            case 'nightclub': await generateNightPDF(normalizedData); break;
            case 'bus': await generateBusPDF(normalizedData); break;
            default: throw new Error(`${t('Type non supporté', 'Karazana tsy tohana', 'Unsupported type')}: ${apiType}`);
          }
          break;
        }

        case 'Facture':
          await generateFacturePDF(usagerComplet, false);
          break;

        case 'QR Code': {
          const qrText = generateQRTextContent(usagerComplet, apiType);
          setQrCodeData({ usager: usagerComplet, apiType, qrText });
          setShowQrModal(true);
          setProcessingDoc(null);
          return;
        }
        default: break;
      }

      setValidatedDossiers(prev => ({ ...prev, [`${usager.id}_${docType}`]: true }));
      setNotification({
        type: 'success',
        message: `✅ ${docType} ${t('généré avec succès', 'vita soa aman-tsara', 'generated successfully')}`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error(`❌ Erreur génération ${docType}:`, error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur', 'Olana', 'Error')}: ${error.message}`
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) {
      alert(t('QR code non disponible', 'QR code tsy misy', 'QR code not available'));
      return;
    }
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(qrRef.current, {
        scale: 3, backgroundColor: '#ffffff', useCORS: true, allowTaint: true, logging: false
      });
      const link = document.createElement('a');
      link.download = `qr-code-omda-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setNotification({
        type: 'success',
        message: `✅ ${t('QR Code téléchargé', 'QR Code alaina', 'QR Code downloaded')}`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Erreur:', error);
      setNotification({
        type: 'error',
        message: `❌ ${t('Erreur téléchargement', 'Olana amin\'ny fakana', 'Download error')}`
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintUtility = () => window.print();

  const getCategoryStats = (categoryName) => {
    const apiType = categoryMapping[categoryName];
    if (stats && stats[apiType]) {
      return { total: stats[apiType].total || 0, new: stats[apiType].nouveaux || 0 };
    }
    return { total: 0, new: 0 };
  };

  const totalDossiers = stats
    ? Object.values(stats).reduce((acc, s) => acc + (s.total || 0), 0)
    : 0;

  const FolderIcon = ({ color = '#ffc857', size = 40 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path fill={color} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      <path fill="#000" opacity="0.08" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" transform="translate(0,1)"/>
    </svg>
  );

  const renderNavigationFlec = () => (
    <div className="navigation-flec">
      <div className="flec-container">
        <button
          className={`flec-back-btn ${viewMode === 'root' ? 'flec-back-btn-disabled' : ''}`}
          onClick={handleGoBack}
          disabled={viewMode === 'root'}
        >
          <ChevronLeft size={18} className="flec-back-icon" />
          <span className="flec-back-text">{t('Retour', 'Hiverina', 'Back')}</span>
        </button>
        <div className="flec-separator">|</div>
        <div className="flec-path">
          <span className="flec-home"><Home size={14} /></span>
          {currentPath.split('/').filter(Boolean).map((seg, i, arr) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} className="flec-sep" />
              <span className={`flec-seg ${i === arr.length - 1 ? 'flec-seg-active' : ''}`}>
                {seg.trim()}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flec-indicator">
          <div className="flec-dot"></div>
          <span className="flec-count">
            {viewMode === 'root'
              ? t('Racine', 'Fototra', 'Root')
              : `${filteredUsagers.length} ${
                  filteredUsagers.length > 1
                    ? t('dossiers', 'rakitra', 'folders')
                    : t('dossier', 'rakitra', 'folder')
                }`}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MiniSidebar />
      <main className="contenu-gestion-dossier">
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

        {renderNavigationFlec()}

        <div className="explorer-titlebar">
          <div className="explorer-titlebar-left">
            <FolderOpen size={18} />
            <span>{t('Gestion des dossiers', 'Fitantanana ny rakitra', 'File Management')} — OMDA</span>
          </div>
          <div className="explorer-titlebar-right">
            <span className="total-dossiers-pill">
              {totalDossiers} {t('dossier(s) total', 'rakitra total', 'folder(s) total')}
            </span>
          </div>
        </div>

        <div className="explorer-ribbon">
          <button className="ribbon-btn" onClick={handleGenerateBilanGlobal}>
            <FileText size={16} /> <span>{t('Bilan PDF', 'Bilan PDF', 'PDF Report')}</span>
          </button>
          <button className="ribbon-btn" onClick={() => setShowStatsModal(true)}>
            <TrendingUp size={16} /> <span>{t('Statistiques', 'Statistika', 'Statistics')}</span>
          </button>
          <div className="ribbon-sep" />
          <div className="ribbon-view-toggle">
            <button className={displayMode === 'grid' ? 'active' : ''} onClick={() => setDisplayMode('grid')}>
              <Grid size={15} />
            </button>
            <button className={displayMode === 'list' ? 'active' : ''} onClick={() => setDisplayMode('list')}>
              <List size={15} />
            </button>
          </div>
          <div className="ribbon-spacer" />
          <button className="ribbon-btn dashboard-btn" onClick={handleGoDashboard}>
            <ArrowLeft size={16} /> <span>{t('Accueil', 'Hiverina amin\'ny Fandraisana', 'Back to Dashboard')}</span>
          </button>
        </div>

        <div className="windows-explorer-bar">
          <div className="explorer-nav">
            <h1></h1>
            <button
              onClick={handleGoBack}
              disabled={viewMode === 'root'}
              className={`nav-btn ${viewMode === 'root' ? 'nav-btn-disabled' : ''}`}
            >
              <ArrowLeft size={18} />
            </button>
          </div>
          <div className="explorer-address">
            <span className="address-icon"><FolderOpen size={16} /></span>
            {currentPath.split('/').filter(Boolean).map((seg, i, arr) => (
              <React.Fragment key={i}>
                <span className="breadcrumb-seg">{seg.trim()}</span>
                {i < arr.length - 1 && <ChevronsRight size={12} className="breadcrumb-sep" />}
              </React.Fragment>
            ))}
          </div>
          <div className="explorer-search">
            <Search size={16} className="search-icon-header" />
            <input
              type="text"
              placeholder={t(
                'Rechercher (nom, quittance, région...)',
                'Hikaroka (anarana, taratasy, faritra...)',
                'Search (name, receipt, region...)'
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="dossier-dashboard">
          {viewMode === 'root' && (
            <div className="root-view">
              <div className="section-utility-folders">
                <h2 className="section-title">
                  <Briefcase size={20} /> {t('Dossiers Utilitaires', 'Rakitra Fanampiny', 'Utility Folders')}
                </h2>
                <div className={displayMode === 'grid' ? 'utility-folders-grid' : 'explorer-list'}>
                  {utilityFolders.map((folder) => {
                    const IconComponent = folder.icon;
                    return displayMode === 'grid' ? (
                      <div
                        key={folder.id}
                        className="explorer-item"
                        onDoubleClick={() => handleOpenUtilityFolder(folder)}
                        onClick={() => handleOpenUtilityFolder(folder)}
                      >
                        <div className="explorer-item-icon">
                          <IconComponent size={40} color={folder.color} strokeWidth={1.4} />
                        </div>
                        <div className="explorer-item-name">{folder.name}</div>
                        <div className="explorer-item-sub">{folder.itemCount}</div>
                      </div>
                    ) : (
                      <div
                        key={folder.id}
                        className="explorer-list-row"
                        onClick={() => handleOpenUtilityFolder(folder)}
                      >
                        <IconComponent size={20} color={folder.color} />
                        <span className="row-name">{folder.name}</span>
                        <span className="row-desc">{folder.desc}</span>
                        <span className="row-meta">{folder.itemCount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="section-divider"></div>

              <div className="section-dossiers-usagers">
                <h2 className="section-title">
                  <Users size={20} /> {t('Dossiers Usagers', 'Rakitry ny Mpampiasa', 'User Folders')}
                </h2>
                <div className={displayMode === 'grid' ? 'utility-folders-grid' : 'explorer-list'}>
                  {Object.keys(categoryMapping).map((catName) => {
                    const statsCat = getCategoryStats(catName);
                    const apiType = categoryMapping[catName];
                    const color = typeColors[apiType] || '#6366f1';
                    const IconComponent = typeIcons[apiType] || FolderOpen;

                    const catLabel = {
                      'Occasionnelle': t('Occasionnelle', 'Fotoana manokana', 'Occasionals'),
                      'Tele / Radio': t('Tele / Radio', 'Fahitalavitra / Radio', 'TV / Radio'),
                      'Magasin/Autre': t('Magasin/Autre', 'Fivarotana/Hafa', 'Store/Other'),
                      'Night-Club': t('Night-Club', 'Club alina', 'Night-Club'),
                      'Hotel': t('Hotel', 'Hotely', 'Hotel'),
                      'Transport': t('Transport', 'Fitaterana', 'Transport')
                    }[catName] || catName;

                    return displayMode === 'grid' ? (
                      <div
                        key={catName}
                        className="explorer-item"
                        onDoubleClick={() => handleOpenCategory(catName)}
                        onClick={() => handleOpenCategory(catName)}
                      >
                        <div className="explorer-item-icon">
                          <FolderIcon size={40} color={color} />
                        </div>
                        <div className="explorer-item-name">{catLabel}</div>
                        <div className="explorer-item-sub">
                          {statsCat.total}{' '}
                          {statsCat.total > 1
                            ? t('dossiers', 'rakitra', 'folders')
                            : t('dossier', 'rakitra', 'folder')}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={catName}
                        className="explorer-list-row"
                        onClick={() => handleOpenCategory(catName)}
                      >
                        <IconComponent size={20} color={color} />
                        <span className="row-name">{catLabel}</span>
                        <span className="row-desc">
                          {statsCat.total}{' '}
                          {statsCat.total > 1
                            ? t('dossiers', 'rakitra', 'folders')
                            : t('dossier', 'rakitra', 'folder')}
                          {statsCat.new > 0 ? ` • ${statsCat.new}` : ''}
                        </span>
                        <span className="row-meta">→</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'sub' && (
            <div className="sub-view">
              <div className="filters-bar">
                <div className="filters-left">
                  <span className="filter-count">
                    <FileText size={16} /> {filteredUsagers.length}{' '}
                    {filteredUsagers.length > 1
                      ? t('dossiers', 'rakitra', 'folders')
                      : t('dossier', 'rakitra', 'folder')}
                  </span>
                  <span className="filter-category">
                    {
                      {
                        'Occasionnelle': t('Occasionnelle', 'Fotoana manokana', 'Occasionals'),
                        'Tele / Radio': t('Tele / Radio', 'Fahitalavitra / Radio', 'TV / Radio'),
                        'Magasin/Autre': t('Magasin/Autre', 'Fivarotana/Hafa', 'Store/Other'),
                        'Night-Club': t('Night-Club', 'Club alina', 'Night-Club'),
                        'Hotel': t('Hotel', 'Hotely', 'Hotel'),
                        'Transport': t('Transport', 'Fitaterana', 'Transport')
                      }[selectedCategory] || selectedCategory
                    }
                  </span>
                </div>
                <div className="filters-right">
                  <span className="filter-year">{new Date().getFullYear()}</span>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>{t('Chargement des dossiers...', 'Maka ny rakitra...', 'Loading folders...')}</p>
                </div>
              ) : filteredUsagers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><FolderOpen size={48} /></div>
                  <p>{t('Aucun dossier trouvé', 'Tsy misy rakitra hita', 'No folder found')}</p>
                </div>
              ) : (
                <div className="usagers-grid">
                  {filteredUsagers.map((usager) => {
                    const apiType = categoryMapping[selectedCategory] || 'hotel';
                    const nomDossier =
                      usager.denomination ||
                      usager.organisateurs ||
                      usager.demandeur ||
                      usager.nom_evenement ||
                      t('Sans nom', 'Tsy misy anarana', 'No name');
                    const dateDossier =
                      formatDate(usager.date_ajout || usager.created_at) ||
                      new Date().toLocaleDateString(locale);
                    const color = typeColors[apiType] || '#6366f1';

                    let artistesStr = '';
                    if (apiType === 'occ') {
                      if (usager.artistes_detail && usager.artistes_detail.length > 0) {
                        artistesStr = usager.artistes_detail.map(a => {
                          if (a.prenom && a.nom) return `${a.prenom} ${a.nom}`;
                          return a.nom || a;
                        }).join(', ');
                      } else if (usager.artistes) {
                        artistesStr = usager.artistes;
                      }
                    }

                    const documents = getDocumentsForType(apiType);
                    const docLabels = {
                      'Contrat': t('Contrat', 'Fifanarahana', 'Contract'),
                      'Facture': t('Facture', 'Faktiora', 'Invoice'),
                      'QR Code': t('QR Code', 'QR Code', 'QR Code')
                    };

                    return (
                      <div key={usager.id} className="usager-folder">
                        <div className="folder-tab-doc" style={{ background: color }}></div>
                        <div className="folder-content-doc">
                          <div className="folder-icon-doc">
                            <FolderIcon size={28} color={color} />
                          </div>
                          <div className="folder-info-doc">
                            <h4 className="folder-title-doc" onClick={() => handleShowUsagerDetails(usager)}>
                              {nomDossier}
                              <span className="info-icon"><Info size={14} /></span>
                            </h4>
                            <p className="folder-date-doc"><Calendar size={14} /> {dateDossier}</p>
                            <p className="folder-meta-doc">
                              <Hash size={12} /> {t('Quittance', 'Taratasy', 'Receipt')}: {usager.quittance || '-'}
                            </p>
                            <p className="folder-meta-doc">
                              <Banknote size={12} /> {formatMontant(usager.soit_total || usager.montant_mensuel || 0)} Ar
                            </p>
                            {usager.region_usager && (
                              <p className="folder-meta-doc"><MapPin size={12} /> {usager.region_usager}</p>
                            )}
                            {apiType === 'occ' && usager.date_evenement && (
                              <p className="folder-meta-doc">
                                <Calendar size={12} /> {t('Date événement', 'Daty hetsika', 'Event date')}: {formatDate(usager.date_evenement)}
                              </p>
                            )}
                            {apiType === 'occ' && usager.lieu_evenement && (
                              <p className="folder-meta-doc">
                                <MapPin size={12} /> {t('Lieu événement', 'Toerana', 'Event location')}: {usager.lieu_evenement}
                              </p>
                            )}
                            {apiType === 'occ' && artistesStr && (
                              <p className="folder-meta-doc">
                                <User size={12} /> {t('Artistes', 'Mpihira', 'Artists')}: {artistesStr}
                              </p>
                            )}
                            {apiType === 'hotel' && usager.etoiles && (
                              <p className="folder-meta-doc">
                                <Star size={12} /> {'⭐'.repeat(parseInt(usager.etoiles) || 0)}
                              </p>
                            )}
                            {apiType === 'grand-surface' && usager.nombre_magasins > 0 && (
                              <p className="folder-meta-doc">
                                <Store size={12} /> {usager.nombre_magasins}{' '}
                                {t('magasin(s)', 'fivarotana', 'store(s)')}
                              </p>
                            )}
                            {apiType === 'bus' && usager.nombre_vehicules > 0 && (
                              <p className="folder-meta-doc">
                                <Bus size={12} /> {usager.nombre_vehicules}{' '}
                                {t('véhicule(s)', 'fiara', 'vehicle(s)')}
                              </p>
                            )}
                            {apiType === 'nightclub' && usager.jauge_max > 0 && (
                              <p className="folder-meta-doc">
                                <Users size={12} /> {t('Jauge max', 'Fahaiza-mandray', 'Max capacity')}: {usager.jauge_max}{' '}
                                {t('pers.', 'olona', 'people')}
                              </p>
                            )}
                            {apiType === 'media' && usager.frequence && (
                              <p className="folder-meta-doc"><Tv2 size={12} /> {usager.frequence}</p>
                            )}
                          </div>
                          <div className="folder-documents-doc">
                            {documents.map((docType) => {
                              const isProcessing =
                                processingDoc?.usagerId === usager.id &&
                                processingDoc?.docType === docType;
                              const icons = { 'Contrat': FileSignature, 'Facture': Receipt, 'QR Code': QrCode };
                              const DocIcon = icons[docType];
                              return (
                                <div
                                  key={docType}
                                  className={`doc-item-doc ${isProcessing ? 'processing' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isProcessing) handleOpenDocument(usager, docType);
                                  }}
                                  style={{
                                    cursor: isProcessing ? 'wait' : 'pointer',
                                    opacity: isProcessing ? 0.6 : 1
                                  }}
                                >
                                  {isProcessing ? <Loader2 size={18} className="spinner-icon" /> : <DocIcon size={18} />}
                                  <span>{docLabels[docType] || docType}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {showStatsModal && statsData && (
          <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
            <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><TrendingUp size={20} /> {t('Statistiques Globales', 'Statistika ankapobeny', 'Global Statistics')}</h3>
                <button className="modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
              </div>
              <div className="stats-content">
                <div className="stats-grid">
                  <div className="stats-card">
                    <div className="stats-icon"><FolderOpen size={24} color="#6366f1" /></div>
                    <div className="stats-number">{statsData.totalDossiers.toLocaleString(locale)}</div>
                    <div className="stats-label">{t('dossier(s) total', 'rakitra total', 'folder(s) total')}</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-icon"><DollarSign size={24} color="#2ecc71" /></div>
                    <div className="stats-number">{formatMontant(statsData.totalMontant)} Ar</div>
                    <div className="stats-label">{t('Montant Total', 'Vola total', 'Total amount')}</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-icon"><FileText size={24} color="#3498db" /></div>
                    <div className="stats-number">{statsData.totalPaiements.toLocaleString(locale)}</div>
                    <div className="stats-label">{t('Facture', 'Faktiora', 'Invoice')}</div>
                  </div>
                </div>
                <div className="stats-categories">
                  <h4>{t('Par Catégorie', 'Isaky ny sokajy', 'By Category')}</h4>
                  {Object.entries(statsData.parCategorie || {}).map(([key, value]) => {
                    const labels = {
                      hotel: `🏨 ${t('Hôtel', 'Hotely', 'Hotel')}`,
                      'grand-surface': `🏬 ${t('Grande Surface', 'Fivarotana lehibe', 'Large Store')}`,
                      bus: `🚌 ${t('Transport', 'Fitaterana', 'Transport')}`,
                      nightclub: `🎭 ${t('Night Club', 'Club alina', 'Night Club')}`,
                      media: `📺 ${t('Média', 'Haino aman-jery', 'Media')}`,
                      occ: `🎪 ${t('Occasionnel', 'Fotoana manokana', 'Occasional')}`
                    };
                    return (
                      <div key={key} className="stats-category-item">
                        <span className="stats-category-name">{labels[key] || key}</span>
                        <span className="stats-category-total">
                          {value.total || 0} {t('dossiers', 'rakitra', 'folders')}
                        </span>
                        <span className="stats-category-montant">{formatMontant(value.montant)} Ar</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowStatsModal(false)}>
                  {t('Fermer', 'Hidio', 'Close')}
                </button>
                <button className="btn-print" onClick={handleGenerateBilanGlobal}>
                  <FileText size={18} /> {t('Exporter PDF', 'Alefa PDF', 'Export PDF')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQrModal && qrCodeData && (
          <div className="modal-overlay qr-modal-overlay" onClick={() => setShowQrModal(false)}>
            <div className="modal-content qr-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header qr-modal-header">
                <h3><QrCode size={20} /> {t('QR Code', 'QR Code', 'QR Code')} OMDA</h3>
                <button className="modal-close" onClick={() => setShowQrModal(false)}>×</button>
              </div>
              <div className="qr-body">
                <div className="qr-preview-container" ref={qrRef}>
                  <div className="qr-code-wrapper-only">
                    <div className="qr-red-border">
                      <div className="qr-code-container">
                        <QRCodeCanvas
                          value={qrCodeData.qrText}
                          size={240}
                          bgColor="#ffffff"
                          fgColor="#dc2626"
                          level="L"
                          includeMargin={true}
                        />
                        <div className="qr-logo-styled">
                          <div className="qr-logo-circle">
                            <img src="/logoqr.ico" alt="OMDA" className="qr-logo-img" />
                          </div>
                        </div>
                      </div>
                      <div className="qr-omda-footer">
                        OFFICE MALAGASY DU<br />DROIT D'AUTEUR
                      </div>
                    </div>
                  </div>
                </div>
                <div className="qr-data-preview">
                  <p className="qr-data-title">📋 {t('Contenu', 'Votoatiny', 'Content')} :</p>
                  <div className="qr-data-content">
                    {qrCodeData.qrText.split('\n').map((line, index) => {
                      if (!line.trim()) return null;
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                </div>
                <div className="qr-actions-only">
                  <button className="btn-cancel" onClick={() => setShowQrModal(false)}>
                    {t('Fermer', 'Hidio', 'Close')}
                  </button>
                  <button className="btn-download-qr-only" onClick={handleDownloadQR} disabled={isDownloading}>
                    {isDownloading ? (
                      <><Loader2 size={18} className="spinner" /> ...</>
                    ) : (
                      <><Download size={18} /> {t('Télécharger', 'Alaina', 'Download')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUtilityModal && selectedUtility && (
          <div className="modal-overlay utility-modal-overlay" onClick={() => setShowUtilityModal(false)}>
            <div className="modal-content utility-modal-content" onClick={(e) => e.stopPropagation()}>
              <div
                className="modal-header utility-modal-header"
                style={{ borderBottom: `3px solid ${selectedUtility.color}` }}
              >
                <h3>
                  <selectedUtility.icon size={20} color={selectedUtility.color} /> {selectedUtility.name}
                </h3>
                <button className="modal-close" onClick={() => setShowUtilityModal(false)}>×</button>
              </div>
              <div className="utility-body" id="utility-print-content">
                <div className="utility-header">
                  <div
                    className="utility-icon-large"
                    style={{ background: `${selectedUtility.color}15` }}
                  >
                    <selectedUtility.icon size={40} color={selectedUtility.color} />
                  </div>
                  <div>
                    <h2>{selectedUtility.details.title}</h2>
                    {selectedUtility.details.content && (
                      <p className="utility-description">{selectedUtility.details.content}</p>
                    )}
                  </div>
                </div>
                {selectedUtility.details.sections.length > 0 && (
                  <div className="utility-info-table">
                    {selectedUtility.details.sections.map((s, i) => (
                      <div key={i} className="utility-info-row">
                        <span className="utility-info-label">{s.label}</span>
                        <span className="utility-info-value">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedUtility.details.files.length > 0 && (
                  <div className="utility-files-list">
                    <h4>
                      <FileText size={16} />{' '}
                      {t('Documents disponibles', 'Rakitra misy', 'Available documents')}
                    </h4>
                    {selectedUtility.details.files.map((file, index) => (
                      <div
                        key={index}
                        className="utility-file-item"
                        onClick={() =>
                          file.action === 'bilan' && handleGenerateUtilityPDF(selectedUtility.pdfAction)
                        }
                      >
                        <FileSignature size={16} color="#e74c3c" />
                        <span className="file-name">{file.name}</span>
                        <span className="file-meta">{file.size}</span>
                        <Download size={14} className="file-download-icon" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="utility-footer"><p>© OMDA - {new Date().getFullYear()}</p></div>
              </div>
              <div className="modal-actions utility-actions">
                <button onClick={() => setShowUtilityModal(false)} className="btn-cancel">
                  {t('Fermer', 'Hidio', 'Close')}
                </button>
                <button onClick={handlePrintUtility} className="btn-print">
                  <Printer size={16} /> {t('Imprimer', 'Atonta', 'Print')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showUsagerDetails && selectedUsagerForDetails && (
          <div className="modal-overlay" onClick={() => setShowUsagerDetails(false)}>
            <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><User size={20} /> {t('Détails du dossier', 'Antsipirian\'ny rakitra', 'Folder details')}</h3>
                <button className="modal-close" onClick={() => setShowUsagerDetails(false)}>✕</button>
              </div>
              <div className="details-content">
                <div className="details-row">
                  <span className="details-label">
                    <User size={16} /> {t('Nom / Dénomination', 'Anarana', 'Name')}
                  </span>
                  <span className="details-value">
                    {selectedUsagerForDetails.denomination ||
                      selectedUsagerForDetails.demandeur ||
                      selectedUsagerForDetails.organisateurs ||
                      selectedUsagerForDetails.nom_evenement || '-'}
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label"><Phone size={16} /> {t('Téléphone', 'Finday', 'Phone')}</span>
                  <span className="details-value">{selectedUsagerForDetails.telephone || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="details-label"><Mail size={16} /> {t('Email', 'Mailaka', 'Email')}</span>
                  <span className="details-value">{selectedUsagerForDetails.email || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="details-label"><MapPin size={16} /> {t('Adresse', 'Adiresy', 'Address')}</span>
                  <span className="details-value">
                    {selectedUsagerForDetails.adresse ||
                      selectedUsagerForDetails.siege ||
                      selectedUsagerForDetails.adresse_siege || '-'}
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label"><MapPin size={16} /> {t('Région', 'Faritra', 'Region')}</span>
                  <span className="details-value">
                    {selectedUsagerForDetails.region_usager || selectedUsagerForDetails.region || '-'}
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label"><FileText size={16} /> {t('N° Dossier', 'Laharana rakitra', 'Folder N°')}</span>
                  <span className="details-value">{selectedUsagerForDetails.numero_dossier_utilisateur || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="details-label"><Hash size={16} /> {t('Quittance', 'Taratasy', 'Receipt')}</span>
                  <span className="details-value">{selectedUsagerForDetails.quittance || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="details-label"><DollarSign size={16} /> {t('Montant Total', 'Vola total', 'Total amount')}</span>
                  <span className="details-value">
                    {formatMontant(
                      selectedUsagerForDetails.soit_total ||
                      selectedUsagerForDetails.montant_mensuel || 0
                    )} Ar
                  </span>
                </div>
                {selectedUsagerForDetails.type_usager === 'occ' && (
                  <>
                    <div className="details-row">
                      <span className="details-label">
                        <Ticket size={16} /> {t('Genre manifestation', 'Karazana hetsika', 'Event type')}
                      </span>
                      <span className="details-value">{selectedUsagerForDetails.genre_manifestation || '-'}</span>
                    </div>
                    <div className="details-row">
                      <span className="details-label">
                        <Calendar size={16} /> {t('Date événement', 'Daty hetsika', 'Event date')}
                      </span>
                      <span className="details-value">{formatDate(selectedUsagerForDetails.date_evenement) || '-'}</span>
                    </div>
                    <div className="details-row">
                      <span className="details-label">
                        <MapPin size={16} /> {t('Lieu événement', 'Toerana', 'Event location')}
                      </span>
                      <span className="details-value">{selectedUsagerForDetails.lieu_evenement || '-'}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowUsagerDetails(false)} className="btn-cancel">
                  {t('Fermer', 'Hidio', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default GestionDossier;