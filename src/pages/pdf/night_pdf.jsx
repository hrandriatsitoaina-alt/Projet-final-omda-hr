// src/pages/pdf/night_pdf.jsx
import jsPDF from 'jspdf';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

const OMDA_NOM_FIXE = 'OFFICE MALAGASY DU DROIT D\'AUTEUR';

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
  if (langue === 'mg') return '';
  if (langue === 'en') return nombreEnLettresAnglais(num);

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

const lireLangueDepuisStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const l = window.localStorage.getItem('app-langue');
    return ['fr', 'mg', 'en'].includes(l) ? l : null;
  } catch {
    return null;
  }
};

export const generateNightPDF = (usager, paymentDetails = {}, options = {}) => {
  try {
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);

    console.log('========== GÉNÉRATION PDF NIGHT CLUB ==========');
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
    const lineSpacing = 7.2;

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

    const jaugeMax = usager?.jauge_max || 0;
    const horaires = usager?.horaires || '';

    let radioTaux = 0, lecteurTaux = 0, tvTaux = 0, autresTaux = 0;

    try {
      let moyensComm = usager?.moyens_communication;
      if (moyensComm) {
        if (typeof moyensComm === 'string') moyensComm = JSON.parse(moyensComm);
        if (moyensComm && typeof moyensComm === 'object') {
          if (moyensComm.radio) {
            radioTaux = typeof moyensComm.radio === 'object' ? (Number(moyensComm.radio.taux) || 0) : Number(moyensComm.radio) || 0;
          }
          if (moyensComm.lecteur) {
            lecteurTaux = typeof moyensComm.lecteur === 'object' ? (Number(moyensComm.lecteur.taux) || 0) : Number(moyensComm.lecteur) || 0;
          }
          if (moyensComm.tv) {
            tvTaux = typeof moyensComm.tv === 'object' ? (Number(moyensComm.tv.taux) || 0) : Number(moyensComm.tv) || 0;
          }
          if (moyensComm.autres) {
            autresTaux = typeof moyensComm.autres === 'object' ? (Number(moyensComm.autres.taux) || 0) : Number(moyensComm.autres) || 0;
          }
        }
      }
    } catch (e) {
      console.error('Erreur parsing moyens:', e);
    }

    const radioActif = radioTaux > 0;
    const lecteurActif = lecteurTaux > 0;
    const tvActif = tvTaux > 0;
    const autresActif = autresTaux > 0;
    const sommeTaux = radioTaux + lecteurTaux + tvTaux + autresTaux;

    const montantMensuel = parseFloat(usager?.montant_mensuel) || 0;
    const fraisDossier = parseFloat(usager?.frais_dossier) || 0;
    const uniter = parseInt(usager?.uniter) || 1;

    const baseTotal = (montantMensuel + sommeTaux) * uniter;
    const soitTotal = baseTotal + fraisDossier;

    const totalEnLettres = nombreEnLettres(Math.round(soitTotal), langue);

    const totalLabel = t('Soit au Total', 'Vola total', 'Total amount');
    const totalValue = formatNumber(soitTotal);
    const totalLine = totalEnLettres
      ? `${totalLabel} : ${totalValue} Ariary (${totalEnLettres})`
      : `${totalLabel} : ${totalValue} Ariary`;

    const aCompterDu = usager?.a_compter_du ? formatDate(usager.a_compter_du, langue) : '';
    const echeance = usager?.echeance ? formatDate(usager.echeance, langue) : '';
    const confirmationNom = usager?.confirmation_nom || usager?.demandeur || '';
    const lieuSignature = usager?.lieu_signature || 'Antananarivo';
    const dateSignature = usager?.date_signature ? formatDate(usager.date_signature, langue) : getCurrentDate(langue);

    // ========== PAGE 1 ==========
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text(OMDA_NOM_FIXE, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(
      t(
        'FICHE DE RENSEIGNEMENTS – NIGHT CLUB',
        'TAKELAKA FAMPAHALALANA – CLUB ALINA',
        'INFORMATION SHEET – NIGHT CLUB'
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
    yPos += lineSpacing;

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

    doc.text(`${t("N° Carte d'identité nationale", 'Laharana kara-panondro', 'National ID number')} : ${representantCin || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    let cinText = `${t('Délivrée le', 'Nomena ny', 'Issued on')} : ${cinDelivree || '……………………………………'}`;
    if (representantCinLieu) cinText += ` ${t('à', 'tao', 'at')} ${representantCinLieu}`;
    doc.text(cinText, marginX + 5, yPos);
    yPos += lineSpacing;

    doc.text(`${t('Fonction', 'Asa', 'Position')} : ${representantFonction || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

    // SECTION 3
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section3Text = t(
      "3) RENSEIGNEMENTS SUR L'ETABLISSEMENT :",
      '3) FAMPAHALALANA MOMBA NY TOERAM-PIASANA :',
      '3) INFORMATION ABOUT THE ESTABLISHMENT :'
    );
    const section3Width = doc.getTextWidth(section3Text);
    doc.text(section3Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section3Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    doc.text(
      `${t('Jauge maximale', 'Fahaiza-mandray ambony', 'Maximum capacity')} : ${jaugeMax > 0 ? formatNumber(jaugeMax) : '………………'} ${t('personnes', 'olona', 'people')}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.text(`${t("Horaires d'ouverture", 'Ora fisokafana', 'Opening hours')} : ${horaires || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing + 5;

    doc.text(`${t('Moyen de communication', 'Fitaovam-pifandraisana', 'Communication means')} :`, marginX + 5, yPos);

    const moyenStartX = marginX + 58;
    const checkX = marginX + 120;
    const tauxX = checkX + 10;

    doc.text(t('Radio - Poste TSF', 'Radio - Poste TSF', 'Radio - TSF station'), moyenStartX, yPos);
    drawCheckbox(doc, checkX, yPos, radioActif);
    doc.text(`: ${t('Taux', 'Taha', 'Rate')} : ${formatNumber(radioTaux)} Ar/${t('an', 'taona', 'year')}`, tauxX, yPos);
    yPos += lineSpacing;

    doc.text(t('Lecteur', 'Mpamaky', 'Reader'), moyenStartX, yPos);
    drawCheckbox(doc, checkX, yPos, lecteurActif);
    doc.text(`: ${t('Taux', 'Taha', 'Rate')} : ${formatNumber(lecteurTaux)} Ar/${t('an', 'taona', 'year')}`, tauxX, yPos);
    yPos += lineSpacing;

    doc.text('TV', moyenStartX, yPos);
    drawCheckbox(doc, checkX, yPos, tvActif);
    doc.text(`: ${t('Taux', 'Taha', 'Rate')} : ${formatNumber(tvTaux)} Ar/${t('an', 'taona', 'year')}`, tauxX, yPos);
    yPos += lineSpacing;

    doc.text(t('Autres', 'Hafa', 'Others'), moyenStartX, yPos);
    drawCheckbox(doc, checkX, yPos, autresActif);
    doc.text(`: ${t('Taux', 'Taha', 'Rate')} : ${formatNumber(autresTaux)} Ar/${t('an', 'taona', 'year')}`, tauxX, yPos);
    yPos += lineSpacing;

    // SECTION 4 - REDEVANCES
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const section4Text = t('4) REDEVANCES :', '4) TAHAM-BOLA :', '4) ROYALTIES :');
    const section4Width = doc.getTextWidth(section4Text);
    doc.text(section4Text, marginX, yPos);
    doc.line(marginX, yPos + 1.5, marginX + section4Width, yPos + 1.5);
    yPos += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    yPos += lineSpacing;

    doc.text(
      `${t('Frais de dossier', 'Saram-pandraharahana', 'File fees')} : ${formatNumber(fraisDossier)} Ariary ${t('(fixe, non multiplié par Uniter)', '(raikitra, tsy ampitomboina amin\'ny Uniter)', '(fixed, not multiplied by Unit)')}`,
      marginX + 5,
      yPos
    );
    yPos += lineSpacing;

    doc.setFont('times', 'bold');
    doc.text(totalLine, marginX + 5, yPos);
    yPos += lineSpacing + 5;

    doc.setFont('times', 'normal');
    doc.text(`${t('A compter du', 'Manomboka ny', 'Starting from')} : ${aCompterDu || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;
    doc.text(`${t('Echéance', 'Faran\'ny fe-potoana', 'Due date')} : ${echeance || '……………………………………'}`, marginX + 5, yPos);
    yPos += lineSpacing;

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
    yPos += 25;

    const fileName = `nightclub_${(denomination || 'document').replace(/\s/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    console.log(`✅ PDF Night Club généré avec succès (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur PDF Night Club:', error);
    throw error;
  }
};

export default generateNightPDF;