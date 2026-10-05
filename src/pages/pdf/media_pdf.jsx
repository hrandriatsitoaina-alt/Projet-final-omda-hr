// src/pages/pdf/media_pdf.jsx
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
// CONVERSION NOMBRE EN LETTRES (FR / EN)
//   - 'fr' → français
//   - 'en' → anglais
//   - 'mg' → PAS DE CONVERSION (retourne '' pour ne rien afficher)
// ============================================================
const nombreEnLettres = (num, langue = 'fr') => {
  // ✅ Malgache : on ne veut AUCUN texte entre parenthèses
  if (langue === 'mg') return '';

  if (langue === 'en') {
    return nombreEnLettresAnglais(num);
  }

  // ---- FRANÇAIS ----
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
        if (units === 1 && tens !== 80) return uniteMapping[tens] + ' et un';
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
    if (hundreds === 1) result = 'cent';
    else result = convertHundreds(hundreds) + ' cents';
    if (remainder > 0) result += ' ' + convertHundreds(remainder);
    return result;
  };

  const convertMilliers = (n) => {
    if (n === 0) return '';
    if (n === 1) return 'mille';
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = '';
    if (thousands === 1) result = 'mille';
    else result = convertHundreds(thousands) + ' mille';
    if (remainder > 0) result += ' ' + convertHundreds(remainder);
    return result;
  };

  const convertMillions = (n) => {
    if (n === 0) return '';
    if (n < 1000000) return convertMilliers(n);
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    let result = '';
    if (millions === 1) result = 'un million';
    else result = convertHundreds(millions) + ' millions';
    if (remainder > 0) result += ' ' + convertMilliers(remainder);
    return result;
  };

  const roundedNum = Math.round(num);
  if (roundedNum === 0) return 'zéro';
  return convertMillions(roundedNum);
};

// ============================================================
// CONVERSION NOMBRE EN LETTRES — ANGLAIS
// ============================================================
const nombreEnLettresAnglais = (num) => {
  if (num === 0) return 'zero';
  if (num < 0) return 'minus ' + nombreEnLettresAnglais(-num);

  const ones = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'
  ];
  const tens = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty',
    'sixty', 'seventy', 'eighty', 'ninety'
  ];

  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      return tens[t] + (u > 0 ? '-' + ones[u] : '');
    }
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    let result = ones[h] + ' hundred';
    if (remainder > 0) result += ' and ' + convertHundreds(remainder);
    return result;
  };

  const convertThousands = (n) => {
    if (n < 1000) return convertHundreds(n);
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = convertHundreds(thousands) + ' thousand';
    if (remainder > 0) result += ' ' + convertHundreds(remainder);
    return result;
  };

  const convertMillions = (n) => {
    if (n < 1000000) return convertThousands(n);
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    let result = convertHundreds(millions) + ' million';
    if (remainder > 0) result += ' ' + convertThousands(remainder);
    return result;
  };

  const roundedNum = Math.round(num);
  return convertMillions(roundedNum);
};

const drawCheckbox = (doc, x, y, checked) => {
  const size = 4.5;
  doc.setLineWidth(0.5);
  doc.rect(x, y - size / 2, size, size);
  if (checked) {
    doc.setLineWidth(0.8);
    doc.line(x + 0.5, y - size / 2 + 0.5, x + size - 0.5, y + size / 2 - 0.5);
    doc.line(x + size - 0.5, y - size / 2 + 0.5, x + 0.5, y + size / 2 - 0.5);
  }
};

// ============================================================
// ✅ Secours : lit la langue stockée par ParametreContext
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

// ✅ Signature étendue : (usager, paymentDetails, options)
export const generateMediaPDF = (usager, paymentDetails = {}, options = {}) => {
  try {
    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);

    console.log('========== GÉNÉRATION PDF MEDIA ==========');
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
    const proprietaireNom = usager?.proprietaire_nom || '';
    const proprietaireAdresse = usager?.proprietaire_adresse || '';
    const proprietaireTel = usager?.proprietaire_tel || '';
    const proprietaireCin = usager?.proprietaire_cin || '';

    let proprietaireCinDelivree = '';
    if (usager?.proprietaire_cin_delivree) {
      try {
        const d = new Date(usager.proprietaire_cin_delivree);
        if (!isNaN(d.getTime())) {
          proprietaireCinDelivree = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        }
      } catch (e) {}
    }
    const proprietaireCinLieu = usager?.proprietaire_cin_lieu || '';

    const representantNom = usager?.representant_nom || '';
    const representantAdresse = usager?.representant_adresse || '';
    const representantTel = usager?.representant_tel || '';
    const representantCin = usager?.representant_cin || '';

    let representantCinDelivree = '';
    if (usager?.representant_cin_delivree) {
      try {
        const d = new Date(usager.representant_cin_delivree);
        if (!isNaN(d.getTime())) {
          representantCinDelivree = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        }
      } catch (e) {}
    }
    const representantCinLieu = usager?.representant_cin_lieu || '';
    const representantPouvoirDate = usager?.representant_pouvoir_date ? formatDate(usager.representant_pouvoir_date, langue) : '';
    const representantPouvoirPar = usager?.representant_pouvoir_par || '';
    const representantFonction = usager?.representant_fonction || '';

    const denomination = usager?.denomination || '';
    const frequence = usager?.frequence || '';
    const canal = usager?.canal || '';
    const siege = usager?.siege || usager?.adresse_siege || '';
    const telephone = usager?.telephone || '';
    const email = usager?.email || '';
    const nif = usager?.nif || '';
    const stat = usager?.stat || '';
    const taux = parseFloat(usager?.taux) || 0;

    const couvertureCapitale = usager?.couverture_capitale || false;
    const couvertureChefLieuProvince = usager?.couverture_chef_lieu_province || false;
    const couvertureChefLieuRegion = usager?.couverture_chef_lieu_region || false;
    const couvertureDistrict = usager?.couverture_district || false;

    const horairesJusqua12 = usager?.horaires_jusqua12 || false;
    const horaires13a24 = usager?.horaires_13a24 || false;

    const fraisDossier = parseFloat(usager?.frais_dossier) || 0;
    const uniter = parseInt(usager?.uniter) || 1;

    const baseTotal = taux * uniter;
    const soitTotal = baseTotal + fraisDossier;

    // ✅ Calcul du montant en lettres
    //   - fr → français
    //   - en → anglais
    //   - mg → chaîne vide (rien à afficher)
    const totalEnLettres = nombreEnLettres(Math.round(soitTotal), langue);

    // ✅ Construction de la ligne "Soit au Total"
    const totalLabel = t('Soit au Total', 'Vola total', 'Total amount');
    const totalValue = formatNumber(soitTotal);
    const totalLine = totalEnLettres
      ? `${totalLabel} : ${totalValue} Ariary (${totalEnLettres})`
      : `${totalLabel} : ${totalValue} Ariary`;

    const confirmationNom = usager?.confirmation_nom || '';
    const lieuSignature = usager?.lieu_signature || 'Antananarivo';
    const dateSignature = usager?.date_signature ? formatDate(usager.date_signature, langue) : getCurrentDate(langue);

    // ========== PAGE 1 ==========
    // ✅ Nom officiel OMDA — FIXE
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(OMDA_NOM_FIXE, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // ✅ Sous-titre traduit
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(
      t(
        'FICHE DE RENSEIGNEMENTS – RADIO ET TELEVISION',
        'TAKELAKA FAMPAHALALANA – RADIO SY FAHITALAVITRA',
        'INFORMATION SHEET – RADIO AND TELEVISION'
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
      '1) RENSEIGNEMENTS SUR LE PROPRIETAIRE DE LA STATION :',
      '1) FAMPAHALALANA MOMBA NY TOMBON\'NY STATION :',
      '1) INFORMATION ABOUT THE STATION OWNER :'
    );
    const section1Width = doc.getTextWidth(section1Text);
    doc.text(section1Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section1Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(`${t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} : ${proprietaireNom || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Adresse (domicile)', 'Adiresy (trano)', 'Address (home)')} : ${proprietaireAdresse || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Téléphone', 'Finday', 'Phone')} : ${proprietaireTel || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t("N° Carte d'identité nationale", 'Laharana kara-panondro', 'National ID number')} : ${proprietaireCin || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    let cinPropText = `${t('Délivrée le', 'Nomena ny', 'Issued on')} : ${proprietaireCinDelivree || '……………………………………'}`;
    if (proprietaireCinLieu) cinPropText += ` ${t('à', 'tao', 'at')} ${proprietaireCinLieu}`;
    doc.text(cinPropText, marginX + 5, yPos);
    yPos += lineSpacing + 5;

    // SECTION 2
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section2Text = t(
      '2) RENSEIGNEMENTS SUR LE REPRESENTANT LEGAL :',
      '2) FAMPAHALALANA MOMBA NY MPISOLO TENA ARA-DALÀNA :',
      '2) INFORMATION ABOUT THE LEGAL REPRESENTATIVE :'
    );
    const section2Width = doc.getTextWidth(section2Text);
    doc.text(section2Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section2Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(`${t('Nom et prénoms', 'Anarana sy fanampin\'anarana', 'Full name')} : ${representantNom || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Adresse (domicile)', 'Adiresy (trano)', 'Address (home)')} : ${representantAdresse || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Téléphone', 'Finday', 'Phone')} : ${representantTel || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t("N° Carte d'identité nationale", 'Laharana kara-panondro', 'National ID number')} : ${representantCin || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    let cinRepText = `${t('Délivrée le', 'Nomena ny', 'Issued on')} : ${representantCinDelivree || '……………………………………'}`;
    if (representantCinLieu) cinRepText += ` ${t('à', 'tao', 'at')} ${representantCinLieu}`;
    doc.text(cinRepText, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Pouvoir donné le', 'Fahefana nomena ny', 'Power granted on')} : ${representantPouvoirDate || '……………………………………'}`, marginX + 5, yPos);
    doc.text(`${t('par', 'avy amin\'ny', 'by')} ${representantPouvoirPar || '……………………………………'}`, marginX + 85, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Fonction', 'Asa', 'Position')} : ${representantFonction || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing + 3;

    // SECTION 3
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section3Text = t(
      '3) RENSEIGNEMENTS SUR LA STATION RADIO/TV :',
      '3) FAMPAHALALANA MOMBA NY STATION RADIO/TV :',
      '3) INFORMATION ABOUT THE RADIO/TV STATION :'
    );
    const section3Width = doc.getTextWidth(section3Text);
    doc.text(section3Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section3Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(`${t('Dénomination', 'Anarana', 'Name')} : ${denomination || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Fréquence', 'Fahita', 'Frequency')} : ${frequence || '……………………………………'}`, marginX + 5, yPos);
    doc.text(`${t('Canal', 'Fantsona', 'Channel')} : ${canal || '……………………………………'}`, marginX + 85, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Siège', 'Foibe', 'Head office')} : ${siege || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Téléphone', 'Finday', 'Phone')} : ${telephone || '……………………………………'}`, marginX + 5, yPos);
    doc.text(`${t('E-mail', 'Mailaka', 'Email')} : ${email || '……………………………………'}`, marginX + 85, yPos);
    yPos += lineSpacing;

    doc.text(`NIF : ${nif || '……………………………………'}`, marginX + 5, yPos);
    doc.text(`STAT : ${stat || '……………………………………'}`, marginX + 85, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Taux', 'Taha', 'Rate')} : ${formatNumber(taux)} Ariary`, marginX + 5, yPos);
    yPos += lineSpacing;

    // Couverture
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`${t('Couverture', 'Faritra voarakotra', 'Coverage')} :`, marginX + 5, yPos);

    const couvStartX = marginX + 40;
    const couvPos1 = couvStartX;
    const couvPos2 = couvStartX + 26;
    const couvPos3 = couvStartX + 72;
    const couvPos4 = couvStartX + 122;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    drawCheckbox(doc, couvPos1, yPos, couvertureCapitale);
    doc.text(t('Capitale', 'Renivohitra', 'Capital'), couvPos1 + 7, yPos);

    drawCheckbox(doc, couvPos2, yPos, couvertureChefLieuProvince);
    doc.text(t('Chef-lieu de Province', 'Renivohim-paritra', 'Provincial capital'), couvPos2 + 7, yPos);

    drawCheckbox(doc, couvPos3, yPos, couvertureChefLieuRegion);
    doc.text(t('Chef-lieu de Région', 'Renivohim-paritra', 'Regional capital'), couvPos3 + 7, yPos);

    drawCheckbox(doc, couvPos4, yPos, couvertureDistrict);
    doc.text(t('District', 'Distrika', 'District'), couvPos4 + 7, yPos);
    yPos += lineSpacing;

    // Horaires
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`${t('Horaires de diffusion', 'Ora fampielezam-peo', 'Broadcast hours')} :`, marginX + 5, yPos);

    const horaireStartX = marginX + 60;
    const horairePos1 = horaireStartX;
    const horairePos2 = horaireStartX + 55;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    drawCheckbox(doc, horairePos1, yPos, horairesJusqua12);
    doc.text(t("Jusqu'à 12 heures", 'Ka hatramin\'ny 12 ora', 'Up to 12 hours'), horairePos1 + 7, yPos);

    drawCheckbox(doc, horairePos2, yPos, horaires13a24);
    doc.text(t('13 à 24 heures', '13 ka hatramin\'ny 24 ora', '13 to 24 hours'), horairePos2 + 7, yPos);
    yPos += lineSpacing;

    // Soit au Total
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(totalLine, marginX + 5, yPos);
    doc.text(`( ${formatNumber(taux)} × ${uniter} + ${formatNumber(fraisDossier)} )`, marginX + 5, yPos + 5);
    yPos += lineSpacing + 5;

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
    doc.text(`(${t('Signature', 'Sonia', 'Signature')})`, pageWidth - marginX - 5, yPos, { align: 'right' });
    yPos += 15;

    // ========== PAGE 2 ==========
    doc.addPage();
    yPos = 25;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(t('Dossier à fournir', 'Antontan-taratasy ilaina', 'Documents to provide'), marginX, yPos);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`• ${t('CIN certifié du propriétaire et du représentant légal', 'CIN voamarina an\'ny tompony sy ny mpisolo tena ara-dalàna', 'Certified ID of the owner and legal representative')}`, marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text('• Cif', marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text('• Stat', marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text(`• ${t('Autorisation Artec', 'Fahazoan-dàlana Artec', 'Artec authorization')}`, marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text(
      `• ${t('Autorisation du Ministère de la Communication', 'Fahazoan-dàlana avy amin\'ny Ministeran\'ny Fifandraisana', 'Authorization from the Ministry of Communication')}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing + 20;

    const fileName = `media_${(denomination || 'document').replace(/\s/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    console.log(`✅ PDF Media généré avec succès (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur PDF Media:', error);
    throw error;
  }
};

export default generateMediaPDF;