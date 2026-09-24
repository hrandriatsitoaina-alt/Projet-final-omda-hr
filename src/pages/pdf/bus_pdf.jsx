// src/pages/pdf/bus_pdf.jsx
import jsPDF from 'jspdf';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

// ============================================================
// ✅ NOM OFFICIEL FIXE (identique dans les 3 langues)
// ============================================================
const OMDA_NOM_FIXE = 'OFFICE MALAGASY DU DROIT D\'AUTEUR';

// ============================================================
// FONCTIONS UTILITAIRES EXPORTÉES
// ============================================================
export const formatDate = (dateString, langue = 'fr') => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const locale = getPdfLocale(langue);
    const jour = date.getDate();
    const mois = date.toLocaleString(locale, { month: 'long' });
    const annee = date.getFullYear();
    return `${jour} ${mois} ${annee}`;
  } catch (error) {
    return '';
  }
};

export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const getCurrentDate = (langue = 'fr') => {
  const date = new Date();
  const locale = getPdfLocale(langue);
  const mois = date.toLocaleString(locale, { month: 'long' });
  const jour = date.getDate();
  const annee = date.getFullYear();
  return `${jour} ${mois} ${annee}`;
};

// ============================================================
// FONCTION : NOMBRE EN LETTRES (Ariary)
// ============================================================
const nombreEnLettres = (num, langue = 'fr') => {
  if (num === 0) return 'zéro';
  if (num < 0) return 'moins ' + nombreEnLettres(-num, langue);

  const uniteMapping = {
    0: 'zéro', 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre',
    5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf',
    10: 'dix', 11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze',
    15: 'quinze', 16: 'seize', 17: 'dix-sept', 18: 'dix-huit', 19: 'dix-neuf',
    20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante',
    60: 'soixante', 70: 'soixante-dix', 80: 'quatre-vingts', 90: 'quatre-vingt-dix'
  };

  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cent';
    if (n < 100) {
      if (uniteMapping[n]) return uniteMapping[n];
      if (n < 70) {
        const tens = Math.floor(n / 10) * 10;
        const units = n % 10;
        if (units === 1 && tens !== 80) {
          return uniteMapping[tens] + ' et un';
        }
        return uniteMapping[tens] + (units > 0 ? '-' + uniteMapping[units] : '');
      }
      if (n < 80) {
        const units = n - 60;
        if (units === 0) return 'soixante';
        if (units === 1) return 'soixante et un';
        return 'soixante-' + convertHundreds(units);
      }
      if (n < 90) {
        const units = n - 80;
        if (units === 0) return 'quatre-vingts';
        if (units === 1) return 'quatre-vingt-un';
        return 'quatre-vingt-' + convertHundreds(units);
      }
      const units = n - 90;
      if (units === 0) return 'quatre-vingt-dix';
      if (units === 1) return 'quatre-vingt-onze';
      return 'quatre-vingt-' + convertHundreds(10 + units);
    }
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    let result = '';
    if (hundreds === 1) {
      result = 'cent';
    } else {
      result = convertHundreds(hundreds) + ' cents';
    }
    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }
    return result;
  };

  const convertMilliers = (n) => {
    if (n === 0) return '';
    if (n === 1) return 'mille';
    if (n < 1000) {
      return convertHundreds(n);
    }
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = '';
    if (thousands === 1) {
      result = 'mille';
    } else {
      result = convertHundreds(thousands) + ' mille';
    }
    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }
    return result;
  };

  const convertMillions = (n) => {
    if (n === 0) return '';
    if (n < 1000000) return convertMilliers(n);
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    let result = '';
    if (millions === 1) {
      result = 'un million';
    } else {
      result = convertHundreds(millions) + ' millions';
    }
    if (remainder > 0) {
      result += ' ' + convertMilliers(remainder);
    }
    return result;
  };

  const roundedNum = Math.round(num);
  if (roundedNum === 0) return 'zéro';
  return convertMillions(roundedNum);
};

// ============================================================
// ✅ Secours : lit la langue stockée par ParametreContext
// (même logique que occ_pdf.jsx)
// ============================================================
const lireLangueDepuisStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const l = window.localStorage.getItem('app-langue');
    return ['fr', 'mg', 'en'].includes(l) ? l : null;
  } catch {
    return null;
  }
};

// ============================================================
// GÉNÉRATEUR PRINCIPAL : PDF BUS / TRANSPORT
// ============================================================
export const generateBusPDF = (usager, paymentDetails = {}, options = {}) => {
  try {
    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);
    const locale = getPdfLocale(langue);

    console.log('========== GÉNÉRATION PDF BUS ==========');
    console.log('🌍 Langue :', langue);
    console.log('Données usager reçues:', usager);

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 15;
    let yPos = 25;
    const lineSpacing = 7.5;

    // Récupération des données
    const demandeur = usager?.demandeur || '';
    const denomination = usager?.denomination || '';
    const adresseSiege = usager?.adresse_siege || '';
    const nifStat = usager?.nif_stat || '';
    const telephone = usager?.telephone || '';
    const email = usager?.email || '';

    const representantNom = usager?.representant_nom || '';
    const representantAdresse = usager?.representant_adresse || '';
    const representantTel = usager?.representant_tel || '';
    const representantCin = usager?.representant_cin || '';
    const representantCinLieu = usager?.representant_cin_lieu || '';
    const representantFonction = usager?.representant_fonction || '';

    let cinDelivree = '';
    if (usager?.representant_cin_delivree) {
      try {
        const d = new Date(usager.representant_cin_delivree);
        if (!isNaN(d.getTime())) {
          cinDelivree = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        }
      } catch (e) {}
    }

    const nombreVehicules = usager?.nombre_vehicules || 0;
    const lignes = usager?.lignes || '';
    const typeBus = usager?.type_bus || '';
    const trajet = usager?.trajet || '';
    const horaires = usager?.horaires || '';
    const zonesDesservies = usager?.zones_desservies || '';

    const montantMensuel = parseFloat(usager?.montant_mensuel) || 0;
    const fraisDossier = parseFloat(usager?.frais_dossier) || 0;
    const uniter = parseInt(usager?.uniter) || 1;

    const baseTotal = montantMensuel * uniter;
    const soitTotal = baseTotal + fraisDossier;
    const totalEnLettres = nombreEnLettres(Math.round(soitTotal), langue);

    const aCompterDu = usager?.a_compter_du ? formatDate(usager.a_compter_du, langue) : '';
    const echeance = usager?.echeance ? formatDate(usager.echeance, langue) : '';
    const confirmationNom = usager?.confirmation_nom || usager?.demandeur || '';
    const lieuSignature = usager?.lieu_signature || 'Antananarivo';
    const dateSignature = usager?.date_signature ? formatDate(usager.date_signature, langue) : getCurrentDate(langue);

    // ========== PAGE 1 ==========
    // ✅ Nom officiel OMDA — FIXE (identique dans les 3 langues)
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(OMDA_NOM_FIXE, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // ✅ Sous-titre traduit
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(
      t(
        'FICHE DE RENSEIGNEMENTS – BUS / TRANSPORT',
        'TAKELAKA FAMPAHALALANA – BUS / FITATERANA',
        'INFORMATION SHEET – BUS / TRANSPORT'
      ),
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 10;

    // SECTION 1
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section1Text = t(
      '1) RENSEIGNEMENTS GENERAUX :',
      '1) FAMPAHALALANA ANKAPOBENY :',
      '1) GENERAL INFORMATION :'
    );
    const section1Width = doc.getTextWidth(section1Text);
    doc.text(section1Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section1Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(`${t('Demandeur', 'Mpangataka', 'Applicant')} : ${demandeur || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Dénomination', 'Anarana', 'Name')} : ${denomination || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(
      `${t("Adresse du Siège / lieu d'exploitation", 'Adiresin\'ny foibe / toeram-piasana', 'Head office address / operating location')} : ${adresseSiege || '……………………………………'}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.text(`NIF / N° STAT : ${nifStat || '……………………………………'}`, marginX + 5, yPos);
    doc.text(`${t('Tél.', 'Finday', 'Phone')} : ${telephone || '……………………………………'}`, marginX + 100, yPos);
    yPos += lineSpacing;

    doc.text(`${t('E-mail', 'Mailaka', 'Email')} : ${email || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing + 3;

    // SECTION 2
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section2Text = t(
      '2) REPRESENTANT LEGAL :',
      '2) MPISOLO TENA ARA-DALÀNA :',
      '2) LEGAL REPRESENTATIVE :'
    );
    const section2Width = doc.getTextWidth(section2Text);
    doc.text(section2Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section2Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(`${t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} : ${representantNom || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Adresse personnelle', 'Adiresy manokana', 'Personal address')} : ${representantAdresse || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Téléphone', 'Finday', 'Phone')} : ${representantTel || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(
      `${t("N° Carte d'identité nationale", 'Laharana kara-panondro', 'National ID number')} : ${representantCin || '……………………………………'}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    let cinText = `${t('Délivrée le', 'Nomena ny', 'Issued on')} : ${cinDelivree || '……………………………………'}`;
    if (representantCinLieu) cinText += ` ${t('à', 'tao', 'at')} ${representantCinLieu}`;
    doc.text(cinText, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Fonction', 'Asa', 'Position')} : ${representantFonction || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing + 3;

    // SECTION 3
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section3Text = t(
      "3) RENSEIGNEMENTS SUR L'ACTIVITE :",
      "3) FAMPAHALALANA MOMBA NY ASA :",
      '3) ACTIVITY INFORMATION :'
    );
    const section3Width = doc.getTextWidth(section3Text);
    doc.text(section3Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section3Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(
      `${t('Nombre de véhicules', 'Isan\'ny fiara', 'Number of vehicles')} : ${nombreVehicules > 0 ? formatNumber(nombreVehicules) : '………………'}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.text(`${t('Lignes exploitées', 'Lalana ampiasaina', 'Operated lines')} : ${lignes || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Type de transport', 'Karazana fitaterana', 'Transport type')} : ${typeBus || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Parcours', 'Lalana', 'Route')} : ${trajet || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Horaires', 'Ora', 'Schedules')} : ${horaires || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    // SECTION 4 - REDEVANCES
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section4Text = t(
      '4) REDEVANCES :',
      '4) TAHAM-BOLA :',
      '4) ROYALTIES :'
    );
    const section4Width = doc.getTextWidth(section4Text);
    doc.text(section4Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section4Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(
      `${t('Montant mensuel', 'Vola isam-bolana', 'Monthly amount')} : ${formatNumber(montantMensuel)} Ariary`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.text(
      `${t('Frais de dossier', 'Saram-pandraharahana', 'File fees')} : ${formatNumber(fraisDossier)} Ariary ${t('(fixe, non multiplié par Uniter)', '(raikitra, tsy ampitomboina amin\'ny Uniter)', '(fixed, not multiplied by Unit)')}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.setFont('times', 'bold');
    doc.text(
      `${t('Soit au Total', 'Vola total', 'Total amount')} : ${formatNumber(soitTotal)} Ariary (${totalEnLettres})`,
      marginX + 5,
      yPos
    );
    doc.text(
      `( ${formatNumber(montantMensuel)} × ${uniter} + ${formatNumber(fraisDossier)} )`,
      marginX + 5,
      yPos + 5
    );
    yPos += lineSpacing + 5;

    doc.setFont('times', 'normal');
    doc.text(`${t('A compter du', 'Manomboka ny', 'Starting from')} : ${aCompterDu || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text(`${t('Echéance', 'Faran\'ny fe-potoana', 'Due date')} : ${echeance || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    // Signature
    doc.text(
      `${t('Je soussigné(e) Mr/Mme', 'Izaho manao sonia .', 'I, the undersigned Mr/Mrs')} ${confirmationNom || '……………………………………'}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      t(
        "confirme sous ma responsabilité la sincérité et l'exactitude des renseignements ci-dessus et",
        "manamarina amin'ny andraikitro ny fahamarinana sy ny fahitsian'ny fampahalalana etsy ambony ary",
        'confirm on my responsibility the truthfulness and accuracy of the information above and'
      ),
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;
    doc.text(
      t(
        "m'engage à respecter les obligations prévues par le contrat général de représentation.",
        "manolo-tena hanaja ny adidy voafaritry ny fifanarahana ankapobeny momba ny fisolo tena.",
        'undertake to respect the obligations provided for in the general representation contract.'
      ),
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    // Fait à et Signature
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.text(
      `${t('Fait à', 'Natao tao', 'Done at')} ${lieuSignature}, ${t('le', 'ny', 'on')} ${dateSignature}`,
      pageWidth - marginX - 5,
      yPos,
      { align: 'right' }
    );
    yPos += lineSpacing;

    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.text(
      `(${t('Signature', 'Sonia', 'Signature')})`,
      pageWidth - marginX - 5,
      yPos,
      { align: 'right' }
    );
    yPos += 25;

    const fileName = `bus_${(denomination || 'document').replace(/\s/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    console.log(`✅ PDF Bus généré avec succès (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur PDF Bus:', error);
    throw error;
  }
};

export default generateBusPDF;