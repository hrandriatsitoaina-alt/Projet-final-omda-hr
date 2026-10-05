// src/pages/pdf/occ_pdf.jsx
import jsPDF from 'jspdf';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

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

// ============================================================
// FONCTION : FORMATAGE DATE CIN (JJ-MM-AAAA)
// ============================================================
const formatCinDate = (dateString) => {
  if (!dateString) return '';
  try {
    let cleanDate = dateString;
    if (typeof dateString === 'string' && dateString.includes('T')) {
      cleanDate = dateString.split('T')[0];
    }
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      const jour = date.getDate().toString().padStart(2, '0');
      const mois = (date.getMonth() + 1).toString().padStart(2, '0');
      const annee = date.getFullYear();
      return `${jour}-${mois}-${annee}`;
    }
    return cleanDate;
  } catch (error) {
    return dateString;
  }
};

// ✅ Constante pour soulignement
const SOULIGNEMENT_OFFSET = 0.8;

// ✅ Helper : souligner un texte
const souligner = (doc, x, y, texte) => {
  const width = doc.getTextWidth(texte);
  doc.line(x, y + SOULIGNEMENT_OFFSET, x + width, y + SOULIGNEMENT_OFFSET);
};

// ============================================================
// ✅ HELPERS DE POSITIONNEMENT DYNAMIQUE (MULTI-LANGUE)
// ============================================================
const champ = (doc, x, y, label, valeur, opts = {}) => {
  const { gap = 2, fontSize = 12 } = opts;
  doc.setFont('times', 'bold');
  doc.setFontSize(fontSize);
  doc.text(label, x, y);
  souligner(doc, x, y, label);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont('times', 'normal');
  doc.setFontSize(fontSize);
  const valX = x + labelWidth + gap;
  doc.text(valeur, valX, y);
  const valeurWidth = doc.getTextWidth(valeur);
  return { xEnd: valX + valeurWidth, labelWidth, valX };
};

const champDouble = (doc, x, y, label1, valeur1, label2, valeur2, opts = {}) => {
  const { minSecondX, gapEntreChamps = 10, gap = 2, fontSize = 12 } = opts;
  const r1 = champ(doc, x, y, label1, valeur1, { gap, fontSize });
  const secondX = Math.max(minSecondX ?? x, r1.xEnd + gapEntreChamps);
  const r2 = champ(doc, secondX, y, label2, valeur2, { gap, fontSize });
  return { r1, r2 };
};

const centrer = (doc, x, y, texte) => {
  doc.text(texte, x, y, { align: 'center' });
};

const alignerDroite = (doc, x, y, texte) => {
  doc.text(texte, x, y, { align: 'right' });
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

// ============================================================
// ✅ NOM OFFICIEL FIXE (identique dans les 3 langues)
// ============================================================
const OMDA_NOM_FIXE = 'OFFICE MALAGASY DU DROIT D\'AUTEUR';

// ============================================================
// GÉNÉRATEUR PRINCIPAL : PDF CONTRAT OCC
// ============================================================
export const generateOccPDF = (usager, paymentDetails = {}, options = {}) => {
  try {
    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);

    console.log('Génération PDF avec:', { usager, paymentDetails, langueRecue: options.langue, langueUtilisee: langue });

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    let yPos = 14;

    const colGaucheCenterX = marginX + 42;
    const colDroiteCenterX = pageWidth - marginX - 45;

    // ========== RÉCUPÉRATION DES DONNÉES ==========
    const dossierGlobal = usager?.numero_dossier_global || '___/___/_______';
    const numeroDossierUtilisateur = usager?.numero_dossier_utilisateur || '';
    const organisateurs = usager?.organisateurs || usager?.demandeur || '';
    const representantPar = usager?.representant_par || usager?.demandeur || '';
    const genreManifestation = usager?.genre_manifestation || '';
    const artistes = usager?.artistes || usager?.nom_artiste || '';
    const dateEvenement = formatDate(usager?.date_evenement, langue) || '';
    const lieuEvenement = usager?.lieu_evenement || '';

    const montantPaye = parseFloat(paymentDetails?.montant || usager?.montant_total || usager?.montant || 0);
    const fraisDossier = parseFloat(usager?.frais_dossier) || 5000;
    const montantRetard = parseFloat(usager?.montant_retard) || 0;
    const estRetard = usager?.is_retard || false;
    const uniter = parseInt(usager?.uniter) || 1;

    const montantXUniter = montantPaye * uniter;

    let soitTotal = montantXUniter + fraisDossier;
    if (estRetard) {
      soitTotal += montantRetard;
    }

    // ✅ Calcul des montants en lettres selon la langue
    //   - fr → français
    //   - en → anglais
    //   - mg → chaîne vide (rien à afficher)
    const totalEnLettres = nombreEnLettres(Math.round(soitTotal), langue);
    const montantEnLettres = nombreEnLettres(Math.floor(montantXUniter), langue);

    const nomRepresentant = usager?.representant_par || usager?.demandeur || '';

    const cin = usager?.representant_cin || usager?.cin || '';
    const cinDelivree = usager?.representant_cin_delivree || usager?.cin_delivree || '';
    const cinLieu = usager?.representant_cin_lieu || usager?.cin_lieu || '';

    const adresse = usager?.adresse || '';
    const domicile = usager?.domicile || usager?.adresse || '';
    const telephone = usager?.telephone || '';

    const percepteurNom = usager?.confirmation_nom || usager?.nom_signataire || '';

    const currentDateStr = getCurrentDate(langue);
    const currentYear = new Date().getFullYear();

    const lieuAjout = usager?.lieu_ajout || 'Antananarivo';

    const numeroHain = numeroDossierUtilisateur || `01/${currentYear.toString().slice(-2)}`;

    const formattedCinDelivree = formatCinDate(cinDelivree);

    // ============================================================
    // PAGE 1
    // ============================================================

    // ✅ En-tête institutionnel
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      t(
        'REPOBLIKAN\'I MADAGASIKARA',
        'REPOBLIKAN\'I MADAGASIKARA',
        'REPUBLIC OF MADAGASCAR'
      ),
      pageWidth / 2, yPos, { align: 'center' }
    );
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      t(
        'Fitiavana - Tanindrazana - Fandrosoana',
        'Fitiavana - Tanindrazana - Fandrosoana',
        'Love - Homeland - Progress'
      ),
      pageWidth / 2, yPos, { align: 'center' }
    );
    yPos += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('=-=-=-=-=-=-=', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(
      t(
        'MINISTERE DE LA COMMUNICATION,',
        'MINISITERAN\'NY SERASERA,',
        'MINISTRY OF COMMUNICATION,'
      ),
      marginX + 8, yPos
    );
    yPos += 4;
    doc.text(
      t(
        'ET DE LA CULTURE',
        'SY NY KOLONTSAINA',
        'AND CULTURE'
      ),
      marginX + 18, yPos
    );
    yPos += 4;
    doc.text('-------------------', marginX + 23, yPos);
    yPos += 4;
    doc.text(
      t(
        'SECRETARIAT GENERAL',
        'SEKRETARIATA JENERALY',
        'GENERAL SECRETARIAT'
      ),
      marginX + 12, yPos
    );
    yPos += 4;
    doc.text('--------------------', marginX + 23, yPos);
    yPos += 6;

    // ✅ NOM OFFICIEL FIXE — identique dans les 3 langues
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(OMDA_NOM_FIXE, marginX, yPos);
    yPos += 5;
    doc.text('(O.M.D.A.)', marginX + 29, yPos);
    yPos += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Lot II F 62 , rue Fredy Rajaofera', marginX + 17, yPos);
    yPos += 4;
    doc.text('Tél : 034 05 533 88', marginX + 17, yPos);
    yPos += 4;
    doc.text('e-mail : omda@moov.mg', marginX + 17, yPos);
    yPos += 5;
    doc.text('* * * *', marginX + 27, yPos);
    yPos += 8;

    yPos += 1;

    // ✅ Titre traduit
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    const titreTexte = t(
      'CONTRAT DE REPRESENTATION',
      'FIFANARAHANA FISOLO TENA',
      'REPRESENTATION CONTRACT'
    );
    const titreWidth = doc.getTextWidth(titreTexte);
    doc.text(titreTexte, pageWidth / 2, yPos, { align: 'center' });
    doc.line(pageWidth / 2 - titreWidth / 2, yPos + SOULIGNEMENT_OFFSET, pageWidth / 2 + titreWidth / 2, yPos + SOULIGNEMENT_OFFSET);
    yPos += 9;

    // ✅ Dossier N°
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    const dossierLabel = `${t('Dossier N°', 'Rakitra N°', 'File N°')} : ${dossierGlobal}`;
    doc.text(dossierLabel, marginX, yPos);

    const hainText = `${numeroDossierUtilisateur || numeroHain}`;
    const hainWidth = doc.getTextWidth(hainText);
    const rectPadding = 2;
    const rectWidth = hainWidth + (rectPadding * 2) + 25;
    const rectX = pageWidth - marginX - rectWidth;
    const rectY = yPos - 4;
    const rectHeight = 7;
    doc.rect(rectX, rectY, rectWidth, rectHeight);

    const textX = rectX + (rectWidth / 2) - (hainWidth / 2);
    doc.text(hainText, textX, yPos);

    yPos += 9;

    // ✅ ENTRE LES SOUSSIGNES
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(
      t('ENTRE LES SOUSSIGNES :', 'EO ANELANELAN\'NY SONIA :', 'BETWEEN THE UNDERSIGNED:'),
      marginX,
      yPos
    );
    yPos += 8;

    // 1 - L'OFFICE — NOM OFFICIEL FIXE
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text('1 - ', marginX, yPos);
    doc.setFont('times', 'bold');
    doc.text('L\'' + OMDA_NOM_FIXE, marginX + 10, yPos);
    const nomOfficeWidth = doc.getTextWidth('L\'' + OMDA_NOM_FIXE);
    doc.setFont('times', 'normal');
    const etabLabel = t(
      ', Etablissement Public à caractère Industriel et',
      ', Andrim-panjakana ho an\'ny indostria sy',
      ', Public Industrial and'
    );
    doc.text(etabLabel, marginX + 10 + nomOfficeWidth + 5, yPos);
    yPos += 5;

    const commercialLabel = t(
      'Commercial, représenté par ',
      'Varotra, misolo tena ',
      'Commercial Establishment, represented by '
    );
    doc.text(commercialLabel, marginX + 5, yPos);
    const commercialLabelWidth = doc.getTextWidth(commercialLabel);
    if (percepteurNom) {
      doc.setFont('times', 'bold');
      doc.text(`${percepteurNom}`, marginX + 5 + commercialLabelWidth, yPos);
      const nomWidth = doc.getTextWidth(`${percepteurNom}`);
      doc.setFont('times', 'normal');
      const percepteurLabel = t(
        ', Percepteur et Contrôleur',
        ', Mpanangona hetra sy Mpanara-maso',
        ', Tax Collector and Controller'
      );
      doc.text(percepteurLabel, marginX + 5 + commercialLabelWidth + nomWidth, yPos);
    } else {
      doc.setFont('times', 'bold');
      doc.text('________________________', marginX + 5 + commercialLabelWidth, yPos);
      const blancWidth = doc.getTextWidth('________________________');
      doc.setFont('times', 'normal');
      const percepteurLabel = t(
        ', Percepteur et Contrôleur',
        ', Mpanangona hetra sy Mpanara-maso',
        ', Tax Collector and Controller'
      );
      doc.text(percepteurLabel, marginX + 5 + commercialLabelWidth + blancWidth, yPos);
    }
    yPos += 5;

    const ciApresLabel = t('Ci-après désigné « ', 'Antsoina manaraka hoe « ', 'Hereafter referred to as "');
    doc.text(ciApresLabel, marginX + 5, yPos);
    const ciApresLabelWidth = doc.getTextWidth(ciApresLabel);
    doc.setFont('times', 'bold');
    doc.text('l\'O.M.D.A.', marginX + 5 + ciApresLabelWidth, yPos);
    const omdaWidth = doc.getTextWidth('l\'O.M.D.A.');
    doc.setFont('times', 'normal');
    doc.text(' »', marginX + 5 + ciApresLabelWidth + omdaWidth + 2, yPos);
    yPos += 8;

    alignerDroite(doc, pageWidth - marginX, yPos, t('D\'UNE PART,', 'ANJARA IRAY,', 'ON ONE PART,'));
    yPos += 7;

    // 2 - BENEFICIAIRE
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text('2 - ', marginX, yPos);
    doc.setFont('times', 'bold');
    doc.text(`${organisateurs || '________________________'}`, marginX + 10, yPos);
    yPos += 5;

    const represLabel = t('Représenté par M. ', 'Mpisolo tena Andriamatoa ', 'Represented by Mr. ');
    doc.setFont('times', 'normal');
    doc.text(represLabel, marginX, yPos);
    const represLabelWidth = doc.getTextWidth(represLabel);
    doc.setFont('times', 'bold');
    doc.text(`${representantPar || '________________________'}`, marginX + represLabelWidth, yPos);
    yPos += 5;

    doc.setFont('times', 'normal');
    const ciApres2 = t('Ci-après désigné « ', 'Antsoina manaraka hoe « ', 'Hereafter referred to as "');
    doc.text(ciApres2, marginX, yPos);
    const ciApres2Width = doc.getTextWidth(ciApres2);
    doc.setFont('times', 'bold');
    const benefLabel = t('le BENEFICIAIRE', 'ny MPANDRY SOA', 'the BENEFICIARY');
    doc.text(benefLabel, marginX + ciApres2Width, yPos);
    const benefLabelWidth = doc.getTextWidth(benefLabel);
    doc.setFont('times', 'normal');
    doc.text(' »', marginX + ciApres2Width + benefLabelWidth + 1, yPos);
    yPos += 8;

    alignerDroite(doc, pageWidth - marginX, yPos, t('D\'AUTRE PART,', 'ANJARA IRAY KOSA,', 'ON THE OTHER PART,'));
    yPos += 7;

    // ✅ IL A ETE CONVENU
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      t(
        'IL A ETE CONVENU ET ARRETE CE QUI SUIT :',
        'NIFANARAHANA SY VOAFAFATRA IZAY MANARAKA IZAY :',
        'IT HAS BEEN AGREED AND DECIDED AS FOLLOWS:'
      ),
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      t('A - CONDITIONS GENERALES :', 'A - FEPETRA ANKAPOBENY :', 'A - GENERAL CONDITIONS:'),
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 8;

    // ⚠️ Articles juridiques — traduits
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art1Texte = t('Article premier :', 'Andininy voalohany :', 'Article one:');
    doc.text(art1Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art1Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'L\'O.M.D.A. donne au bénéficiaire dans les limites et sous les conditions ci-après précisées,',
      'Manome alalana ny mpandray soa ny O.M.D.A. ao anatin\'ny fetra sy fepetra voalaza etsy ambany,',
      'The O.M.D.A. grants the beneficiary, within the limits and under the conditions specified below,'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t(
      'l\'autorisation préalable à l\'effet de :',
      'ny alalana mialoha mba :',
      'the prior authorization to:'
    ), marginX + 5, yPos);
    yPos += 6;
    doc.text(t(
      '- Exécuter faire ou laisser exécuter publiquement les œuvres du répertoire aux seules fins d\'utilisation',
      '- Manatanteraka na mamela hanao ampahibemaso ny asa ao amin\'ny lisitra ho an\'ny fampiasana',
      '- Perform or allow public performance of repertoire works for the sole purpose of using'
    ), marginX + 10, yPos);
    yPos += 5;
    doc.text(t(
      'publique les enregistrements licites, les œuvres du répertoire général de l\'O.M.D.A. qu\'il jugera bon',
      'ampahibemaso ny firaketana ara-dalàna, ny asa ao amin\'ny lisitra ankapoben\'ny O.M.D.A. izay heveriny fa mety',
      'publicly the lawful recordings, the works of the general repertoire of the O.M.D.A. that it deems appropriate'
    ), marginX + 10, yPos);
    yPos += 5;
    doc.text(t('d\'utiliser ;', ' hampiasaina ;', 'to use;'), marginX + 10, yPos);
    yPos += 6;
    doc.text(t(
      '- Utiliser aux seules fins d\'exécution publique les enregistrements licites sur le territoire de la',
      '- Mampiasa ho an\'ny fampisehoana ampahibemaso ihany ny firaketana ara-dalàna eto amin\'ny tanin\'ny',
      '- Use solely for public performance the lawful recordings on the territory of the'
    ), marginX + 10, yPos);
    yPos += 5;
    doc.text(t(
      'République de Madagascar au titre du droit de reproduction mécanique des auteurs et de leurs',
      'Repoblikan\'i Madagasikara ho an\'ny zon\'ny fananana ara-mekanika ny mpanoratra sy ny',
      'Republic of Madagascar under the mechanical reproduction right of authors and their'
    ), marginX + 10, yPos);
    yPos += 5;
    doc.text(t(
      'ayants droits que l\'OMDA exerce.',
      'mpandova azy izay ampihariny ny OMDA.',
      'rights holders as exercised by OMDA.'
    ), marginX + 10, yPos);
    yPos += 6;

    doc.text(t(
      'Cette autorisation est consentie sous la réserve que possède le Directeur de l\'O.M.D.A. d\'interdire au titre',
      'Ity alalana ity dia omena miaraka amin\'ny fahefan\'ny Tale ny O.M.D.A. handrara amin\'ny',
      'This authorization is granted subject to the right of the Director of the O.M.D.A. to prohibit, under'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'du droit moral sur demande des auteurs ou de leurs ayants droit, l\'exécution et ou l\'utilisation publiques',
      'zon\'ny mpanoratra araka ny fangatahan\'ny mpanoratra na ny mpandova azy, ny fampisehoana na ny fampiasana',
      'moral rights at the request of authors or their rights holders, the public performance and/or use'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'd\'enregistrements mécaniques d\'une ou de plusieurs œuvres du répertoire général sans que l\'O.M.D.A. puisse',
      'firaketana mekanika ny asa iray na maromaro ao amin\'ny lisitra ankapobeny nefa tsy afaka',
      'of mechanical recordings of one or more works of the general repertoire without the O.M.D.A. being'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'être tenu à garantie à ce titre à l\'égard du bénéficiaire :',
      'miantoka amin\'izany ny mpandray soa :',
      'held liable in this respect towards the beneficiary:'
    ), marginX, yPos);
    yPos += 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art2Texte = t('Article 2 :', 'Andininy 2 :', 'Article 2:');
    doc.text(art2Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art2Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'Le bénéficiaire s\'engage à payer, en contrepartie de l\'autorisation, une redevance de :',
      'Manolo-tena handoa ny mpandray soa, ho takalon\'ny alalana, ny taham-bola :',
      'The beneficiary agrees to pay, in return for the authorization, a royalty of:'
    ), marginX, yPos);
    yPos += 6;
    doc.text(t(
      '1°- a) 6 % calculée sur la totalité des recettes brutes à l\'occasion des exécutions publiques par les entrées',
      '1°- a) 6 % amin\'ny totalin\'ny vola miditra amin\'ny fampisehoana ampahibemaso amin\'ny',
      '1°- a) 6% calculated on the total gross revenue of public performances from the entrance'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t('(billets, participations, etc...)', '(tapakila, fandraisana anjara, sns...)', '(tickets, participations, etc...)'), marginX + 5, yPos);
    yPos += 6;
    doc.text(t(
      '- b) toutes autres recettes (notamment les recettes de consommation sur table ou buvettes, buffet,',
      '- b) ny vola miditra hafa (indrindra ny fihinanana eo ambony latabatra na trano fisotroana, buffet,',
      '- b) all other revenues (notably table or bar consumption, buffet,'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t(
      'restauration, vente billets de tombola, de programme, etc...)',
      'fisakafoana, fivarotana tapakila tombola, fandaharana, sns...)',
      'restaurant, sale of tombola tickets, programs, etc...)'
    ), marginX + 5, yPos);
    yPos += 6;
    doc.text(t(
      'En cas d\'entrée gratuite, le taux est fixé à 6 % des dépenses occasionnées par l\'organisation de la',
      'Raha misy fidirana maimaim-poana, ny taham-bola dia 6 % amin\'ny fandaniana natao tamin\'ny',
      'In case of free admission, the rate is set at 6% of the expenses incurred for organizing the'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t('manifestation.', 'hetsika.', 'event.'), marginX + 5, yPos);
    yPos += 10;

    // ============================================================
    // PAGE 2
    // ============================================================
    doc.addPage();
    yPos = 14;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      '2°- 12% calculée sur la totalité des recettes brutes à l\'occasion des représentations dramatiques.',
      '2°- 12% amin\'ny totalin\'ny vola miditra amin\'ny fampisehoana an-tsehatra.',
      '2°- 12% calculated on the total gross revenue of dramatic performances.'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t(
      'Les invitations ou places de service et les consommations offertes à titre gracieux sont réputées payantes et',
      'Ny fanasana na toerana fanompoana sy ny zava-pisotro omena maimaim-poana dia heverina ho voaloa ary',
      'Invitations or service seats and complimentary consumption are deemed paid and'
    ), marginX + 5, yPos);
    yPos += 5;
    doc.text(t(
      'comprises dans l\'assiette de calcul des pourcentages.',
      'tafiditra amin\'ny kajy ny taham-bola.',
      'included in the basis for calculating percentages.'
    ), marginX + 5, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art3Texte = t('Article 3 :', 'Andininy 3 :', 'Article 3:');
    doc.text(art3Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art3Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'Le bénéficiaire s\'engage à remettre préalablement ou au moment du paiement, le programme exact',
      'Manolo-tena hametraka mialoha na amin\'ny fotoana fandoavana ny fandaharana marina',
      'The beneficiary agrees to provide, before or at the time of payment, the exact program'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'des œuvres exécutées. Ils doivent prendre toutes dispositions pour que le programme porte l\'indication, pour',
      'ny asa hatao. Mila mandray fepetra rehetra izy mba hampisehoana ao amin\'ny fandaharana, ho',
      'of the works performed. They must take all measures so that the program indicates, for'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'chaque œuvre du nom de l\'auteur, du compositeur et s\'il y a lieu, de l\'arrangeur. Le programme sera certifié',
      'ny asa tsirairay, ny anaran\'ny mpanoratra, ny mpamoron-kira ary raha ilaina ny mpandahatra. Hohamarinina',
      'each work the name of the author, the composer and, where applicable, the arranger. The program will be certified'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'sincère par le bénéficiaire et par le représentant du ou des groupes artistiques.',
      'ho marina ny fandaharana avy amin\'ny mpandray soa sy ny mpisolo tena ny vondrona artista.',
      'sincere by the beneficiary and by the representative of the artistic group(s).'
    ), marginX, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art4Texte = t('Article 4 :', 'Andininy 4 :', 'Article 4:');
    doc.text(art4Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art4Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'La présente autorisation est personnelle au bénéficiaire et ne s\'applique qu\'à la manifestation, objet',
      'Ity alalana ity dia manokana ho an\'ny mpandray soa ary tsy mihatra afa-tsy amin\'ny hetsika,',
      'This authorization is personal to the beneficiary and applies only to the event,'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'de sa demande, organisée par lui et pour son propre compte.',
      'ifangatahany, arindrainy sy ho azy manokana.',
      'subject of their request, organized by them and on their own account.'
    ), marginX, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art5Texte = t('Article 5 :', 'Andininy 5 :', 'Article 5:');
    doc.text(art5Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art5Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'L\'OMDA aura le droit de contrôle sur toutes les opérations rentrant dans l\'objet de la présente',
      'Manana ny zo hifehy ny OMDA amin\'ny asa rehetra ao anatin\'ity',
      'OMDA shall have the right to control all operations falling within the scope of this'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'autorisation. Le Directeur de l\'O.M.D.A. ou son délégué aura droit à deux places VIP ainsi qu\'à deux places',
      'alalana ity. Ny Tale ny O.M.D.A. na ny solontenany dia manan-jo amin\'ny seza VIP roa sy seza',
      'authorization. The Director of the O.M.D.A. or their delegate shall be entitled to two VIP seats and two'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'gratuites non négociables dont ils auront la libre disposition, quel que soit le mode d\'accès (billets, invitation,',
      'maimaim-poana tsy azo varotra izay azony ampiasaina malalaka, na inona na inona fomba fidirana (tapakila, fanasana,',
      'free non-transferable seats at their free disposal, whatever the access method (tickets, invitation,'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'consommation obligatoire public déterminé, etc...)',
      'fihinanana tsy maintsy atao ho an\'ny mpijery voafaritra, sns...)',
      'compulsory consumption for a specific audience, etc...)'
    ), marginX, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art6Texte = t('Article 6 :', 'Andininy 6 :', 'Article 6:');
    doc.text(art6Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art6Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'Le coût du timbre sur les quittances, les frais de correspondance et de recouvrement s\'il y a lieu seront',
      'Ny sarany ny tombo-kase amin\'ny taratasy, ny saran\'ny fifandraisana sy ny fanangonana raha misy dia',
      'The cost of the stamp on receipts, correspondence and collection fees, if any, shall be'
    ), marginX, yPos);
    yPos += 5;
    doc.text(t(
      'à la charge du bénéficiaire.',
      'efa ao an-tanan\'ny mpandray soa.',
      'borne by the beneficiary.'
    ), marginX, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art7Texte = t('Article 7 :', 'Andininy 7 :', 'Article 7:');
    doc.text(art7Texte, marginX, yPos);
    souligner(doc, marginX, yPos, art7Texte);
    yPos += 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(t(
      'Les frais des présentes et ceux qui en seront à la suite sont à la charge du bénéficiaire.',
      'Ny saran\'ity fifanarahana ity sy izay manaraka azy dia efa ao an-tanan\'ny mpandray soa.',
      'The costs of these presents and those following shall be borne by the beneficiary.'
    ), marginX, yPos);
    yPos += 10;

    // ✅ B - CONDITIONS PARTICULIERES
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(
      t(
        'B - CONDITIONS PARTICULIERES :',
        'B - FEPETRA MANOKANA :',
        'B - SPECIAL CONDITIONS:'
      ),
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 10;

    // ✅ Article 1
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art1bTexte = t('Article 1 :', 'Andininy 1 :', 'Article 1:');
    doc.text(art1bTexte, marginX, yPos);
    souligner(doc, marginX, yPos, art1bTexte);
    yPos += 7;

    // BENEFICIAIRE
    champ(
      doc, marginX, yPos,
      t('BENEFICIAIRE :', 'MPANDRY SOA :', 'BENEFICIARY:'),
      organisateurs || '________________________'
    );
    yPos += 7;

    // GENRE DE LA MANIFESTATION
    champ(
      doc, marginX, yPos,
      t('GENRE DE LA MANIFESTATION :', 'KARAZANA HETSIKA :', 'EVENT TYPE:'),
      genreManifestation || '________________________'
    );
    yPos += 7;

    // ARTISTE(S)
    champ(
      doc, marginX, yPos,
      t('ARTISTE(S) :', 'MPANAKANTO :', 'ARTIST(S):'),
      artistes || '________________________'
    );
    yPos += 7;

    // DATE + LIEU
    champDouble(
      doc, marginX, yPos,
      t('DATE :', 'DATY :', 'DATE:'), dateEvenement || '________________________',
      t('LIEU :', 'TOERANA :', 'LOCATION:'), lieuEvenement || '________________________',
      { minSecondX: marginX + 80 }
    );
    yPos += 7;

    // ✅ MONTANT — selon la langue
    //   - fr/en : "... Ar (soixante-treize mille Ariary)"
    //   - mg    : "... Ar" (sans parenthèses)
    let montantDisplay = '';
    if (uniter > 1) {
      const lettresPart = montantEnLettres ? ` (${montantEnLettres} Ariary)` : '';
      montantDisplay = `${formatNumber(montantPaye)} × ${uniter} ${t('Uniter', 'Uniter', 'Unit')} = ${formatNumber(montantXUniter)} Ar${lettresPart}`;
    } else {
      const lettresPart = montantEnLettres ? ` (${montantEnLettres} Ariary)` : '';
      montantDisplay = `${formatNumber(montantPaye)} Ar${lettresPart}`;
    }
    champ(
      doc, marginX, yPos,
      t('MONTANT :', 'VOLA :', 'AMOUNT:'),
      montantDisplay
    );
    yPos += 5;

    // FRAIS DE DOSSIER
    champ(
      doc, marginX, yPos,
      t('FRAIS DE DOSSIER :', 'SARAM-PANDRAHARAHANA :', 'FILE FEES:'),
      `${formatNumber(fraisDossier)} Ar`
    );
    yPos += 5;

    // PENALITE DE RETARD
    if (estRetard && montantRetard > 0) {
      champ(
        doc, marginX, yPos,
        t('PENALITE DE RETARD :', 'SAZY NOHO NY FAHATARANA :', 'LATE PENALTY:'),
        `${formatNumber(montantRetard)} Ar`
      );
      yPos += 7;
    } else {
      yPos += 2;
    }

    // ✅ SOIT TOTAL — selon la langue
    //   - fr/en : "... Ar (soixante-treize mille Ariary)"
    //   - mg    : "... Ar" (sans parenthèses)
    const soitTotalLettresPart = totalEnLettres ? ` (${totalEnLettres} Ariary)` : '';
    champ(
      doc, marginX, yPos,
      t('SOIT TOTAL :', 'VOLA TOTAL :', 'TOTAL AMOUNT:'),
      `${formatNumber(soitTotal)} Ar${soitTotalLettresPart}`
    );
    yPos += 7;

    // NOM ET PRENOMS
    champ(
      doc, marginX, yPos,
      t('NOM ET PRENOMS :', 'ANARANA SY FANAMPIN\'ANARANA :', 'FULL NAME:'),
      nomRepresentant || '________________________'
    );
    yPos += 7;

    // CIN
    let cinText = '';
    const delivreeLabel = t('délivrée le', 'nomena ny', 'issued on');
    const aLabel = t('à', 'tao', 'at');
    if (cin && formattedCinDelivree && cinLieu) {
      cinText = `${cin} ${delivreeLabel} ${formattedCinDelivree} ${aLabel} ${cinLieu}`;
    } else if (cin && formattedCinDelivree) {
      cinText = `${cin} ${delivreeLabel} ${formattedCinDelivree}`;
    } else if (cin && cinLieu) {
      cinText = `${cin} ${t('délivré à', 'nomena tao', 'issued at')} ${cinLieu}`;
    } else if (cin) {
      cinText = cin;
    } else {
      cinText = '________________________';
    }
    champ(doc, marginX, yPos, t('CIN :', 'CIN :', 'CIN:'), cinText);
    yPos += 7;

    // DOMICILE + Contact
    champDouble(
      doc, marginX, yPos,
      t('DOMICILE :', 'TRANO :', 'HOME ADDRESS:'), domicile || '________________________',
      t('Contact :', 'Fifandraisana :', 'Contact:'), telephone || '________________________',
      { minSecondX: marginX + 100 }
    );
    yPos += 10;

    // ✅ Article 2 traduit
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const art2bTexte = t('Article 2 :', 'Andininy 2 :', 'Article 2:');
    doc.text(art2bTexte, marginX, yPos);
    souligner(doc, marginX, yPos, art2bTexte);
    yPos += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(
      t(
        'Pour l\'exécution des clauses et conditions du présent contrat, les parties font élection de domicile ',
        'Ho fanatanterahana ny fepetra sy fizarana amin\'ity fifanarahana ity, ny roa tonta dia mifidy toerana ',
        'For the execution of the clauses and conditions of this contract, the parties elect domicile '
      ),
      marginX,
      yPos
    );
    yPos += 5;

    const lieuAjoutTexte = `${t('à', 'ao', 'in')} ${lieuAjout}.`;
    doc.text(lieuAjoutTexte, marginX, yPos);
    souligner(doc, marginX, yPos, lieuAjoutTexte);
    yPos += 8;

    // ✅ Bloc signature
    centrer(doc, colDroiteCenterX, yPos, `${lieuAjout}, ${t('le', 'ny', 'on')} ${currentDateStr}`);
    yPos += 5;
    centrer(
      doc, colDroiteCenterX, yPos,
      t(
        'Pour l\'Office Malagasy du Droit d\'Auteur',
        'Ho an\'ny Birao Malagasy misahana ny Zon\'ny Mpanoratra',
        'For the Malagasy Copyright Office'
      )
    );
    yPos += 5;
    centrer(doc, colGaucheCenterX, yPos, t('Le Bénéficiaire', 'Ny mpandray soa', 'The Beneficiary'));
    centrer(
      doc, colDroiteCenterX, yPos,
      t('Le Percepteur et Contrôleur', 'Ny mpanangona hetra sy mpanara-maso', 'The Tax Collector and Controller')
    );

    yPos += 25;
    centrer(doc, colGaucheCenterX, yPos, representantPar);
    centrer(doc, colDroiteCenterX, yPos, percepteurNom);

    // ============================================================
    // PAGE 3 - AUTORISATION / FAZAOAN-DALANA / AUTHORIZATION
    // ============================================================
    doc.addPage();
    yPos = 30;

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    const authTexte = t(
      'A U T O R I S A T I O N',
      'F A Z A O A N - D A L A N A',
      'A U T H O R I Z A T I O N'
    );
    const authWidth = doc.getTextWidth(authTexte);
    doc.text(authTexte, pageWidth / 2, yPos, { align: 'center' });
    doc.line(pageWidth / 2 - authWidth / 2, yPos + SOULIGNEMENT_OFFSET, pageWidth / 2 + authWidth / 2, yPos + SOULIGNEMENT_OFFSET);
    yPos += 18;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    let autorisationText = '';
    if (langue === 'mg') {
      autorisationText = `${organisateurs || '________'} misolo tena Andriamatoa ${representantPar || '________'} dia nahazo alalana hampiasa ny asa ao amin'ny lisitra ankapoben'ny Birao Malagasy misahana ny Zon'ny Mpanoratra (OMDA) amin'ny ${genreManifestation || '________'} ny ${dateEvenement || '________'} miaraka amin'ny ${artistes || '________'} ao ${lieuEvenement || '________'}.`;
    } else if (langue === 'en') {
      autorisationText = `${organisateurs || '________'} represented by Mr. ${representantPar || '________'} is authorized to use the works of the general repertoire of the Malagasy Copyright Office (OMDA) on the occasion of the ${genreManifestation || '________'} on ${dateEvenement || '________'} with ${artistes || '________'} at ${lieuEvenement || '________'}.`;
    } else {
      autorisationText = `${organisateurs || '________'} représenté par M. ${representantPar || '________'} est autorisé à utiliser les œuvres du répertoire général de l'Office Malagasy du Droit d'Auteur (OMDA) à l'occasion du ${genreManifestation || '________'} le ${dateEvenement || '________'} avec ${artistes || '________'} au ${lieuEvenement || '________'}.`;
    }

    const splitText = doc.splitTextToSize(autorisationText, pageWidth - 2 * marginX);
    doc.text(splitText, marginX, yPos);
    yPos += splitText.length * 5 + 15;

    centrer(doc, colDroiteCenterX, yPos, `${t('Fait à', 'Natao tao', 'Done at')} ${lieuAjout}, ${t('le', 'ny', 'on')} ${currentDateStr}`);
    yPos += 15;

    centrer(doc, colDroiteCenterX, yPos, t(
      'Pour l\'Office Malagasy du Droit d\'Auteur',
      'Ho an\'ny Office Malagasy du Droit d\'Auteur',
      'For the Office Malagasy du Droit d\'Auteur'
    ));
    yPos += 6;
    centrer(doc, colDroiteCenterX, yPos, '(OMDA)');
    yPos += 5;

    centrer(
      doc, colDroiteCenterX, yPos,
      t('Le Percepteur et Contrôleur', 'Ny mpanangona hetra sy mpanara-maso', 'The Tax Collector and Controller')
    );
    yPos += 35;

    doc.setFont('times', 'italic');
    centrer(doc, colDroiteCenterX, yPos, percepteurNom);

    const fileName = `contrat_occ_${(organisateurs || 'usager').replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
    doc.save(fileName);
    console.log(`PDF OCC généré avec succès (langue: ${langue}):`, fileName);
    return true;

  } catch (error) {
    console.error('Erreur génération PDF OCC:', error);
    throw error;
  }
};

export default generateOccPDF;