// src/pages/pdf/facture_pdf_g.jsx
import jsPDF from 'jspdf';
import { formatNumber } from './occ_pdf';
import logoRepoblika from '../../assets/repoblika.jpg';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

// ============================================================
// ✅ NOMS PROPRES INSTITUTIONNELS FIXES (jamais traduits)
// ============================================================
const NOMS_FIXES = {
  OMDA_NOM: 'OFFICE MALAGASY DU DROIT D\'AUTEUR',
  OMDA_SIGLE: '( OMDA )',
  MINISTERE_LIGNE_1: 'MINISTERE DE LA COMMUNICATION',
  MINISTERE_LIGNE_2: 'ET DE LA CULTURE',
  SECRETARIAT: 'SECRETARIAT GENERAL',
  ADRESSE_LIGNE: 'Lot IIF 62, Fredy Rajaofera - Antaninandro - ANTANANARIVO - 101  |  Contacts : 034 05 533 88  |  mail: omda@moov.mg',
  STAT_NIF: 'Stat. N° 84212 11 2014 0 02912  •  NIF 4000 566 726',
};

// ============================================================
// FONCTIONS UTILITAIRES EXPORTÉES
// ============================================================

export const formatDate = (dateString, langue = 'fr') => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const annee = date.getFullYear();
    return `${jour}/${mois}/${annee}`;
  } catch (error) {
    return '';
  }
};

export const formatDateLong = (dateString, langue = 'fr') => {
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

// ✅ Conversion en lettres (FR uniquement — inchangé)
function numberToWords(num, langue = 'fr') {
  if (num === 0) return 'Zéro Ariary';
  if (num < 0) return 'Moins ' + numberToWords(Math.abs(num), langue);

  const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
  const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
  const tens = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingt', 'Quatre-vingt-dix'];

  function convertToWords(n) {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (unit === 0) return tens[ten];
      if (ten === 7) return 'Soixante-dix' + (unit > 0 ? '-' + units[unit] : '');
      if (ten === 8) return 'Quatre-vingt' + (unit > 0 ? '-' + units[unit] : '');
      if (ten === 9) return 'Quatre-vingt-dix' + (unit > 0 ? '-' + units[unit] : '');
      return tens[ten] + '-' + units[unit];
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      if (rest === 0) return units[hundred] + ' Cent';
      return units[hundred] + ' Cent ' + convertToWords(rest);
    }
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      if (rest === 0) return convertToWords(thousand) + ' Mille';
      return convertToWords(thousand) + ' Mille ' + convertToWords(rest);
    }
    if (n < 1000000000) {
      const million = Math.floor(n / 1000000);
      const rest = n % 1000000;
      if (rest === 0) return convertToWords(million) + ' Million';
      return convertToWords(million) + ' Million ' + convertToWords(rest);
    }
    return 'Nombre trop grand';
  }

  const ariary = Math.floor(num);
  let result = convertToWords(ariary);
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' Ariary';
}

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
// FONCTION PRINCIPALE - GENERATION FACTURE
// ✅ Signature étendue : (factureData, returnBlob, options)
// ============================================================
export const generateFacturePDF = async (factureData, returnBlob = false, options = {}) => {
  try {
    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);
    const locale = getPdfLocale(langue);

    let dafName = 'DAF';
    try {
      const response = await fetch('http://localhost:3001/api/daf/name');
      const data = await response.json();
      if (data.success && data.dafName) dafName = data.dafName;
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer le DAF');
    }

    if (!dafName || dafName === '' || dafName === 'Directeur Financier' || dafName === 'undefined') {
      dafName = 'DAF';
    }

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 20;
    let yPos = 8;

    // ========================================================================
    // 1 - LOGO
    // ========================================================================
    const logoWidth = 65;
    const logoHeight = 20;
    doc.addImage(logoRepoblika, 'JPEG', (pageWidth / 2) - (logoWidth / 2), yPos, logoWidth, logoHeight);
    yPos += logoHeight + 6;

    // ============================================================
    // 2 - EN-TÊTE ADMINISTRATIF — NOMS FIXES
    // ============================================================
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text(NOMS_FIXES.MINISTERE_LIGNE_1, marginX + 8, yPos);
    yPos += 4.5;
    doc.text(NOMS_FIXES.MINISTERE_LIGNE_2, marginX + 20, yPos);
    yPos += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('********', marginX + 30, yPos);
    yPos += 4.5;
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text(NOMS_FIXES.SECRETARIAT, marginX + 18, yPos);
    yPos += 3.5;
    doc.setFont('helvetica', 'normal');
    doc.text('********', marginX + 30, yPos);
    yPos += 5.5;

    // ✅ NOM OFFICIEL FIXE — identique dans les 3 langues
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(NOMS_FIXES.OMDA_NOM, marginX, yPos);

    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const currentYear = currentDate.getFullYear().toString().slice(-2);

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(
      `Antananarivo, ${t('le', 'ny', 'on')} ${dateStr}`,
      pageWidth - marginX,
      yPos,
      { align: 'right' }
    );

    yPos += 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    const omdaWidth = doc.getTextWidth(NOMS_FIXES.OMDA_NOM + ' ');
    doc.text(NOMS_FIXES.OMDA_SIGLE, marginX + (omdaWidth / 2), yPos, { align: 'center' });
    yPos += 12;

    // ========================================================================
    // 3 - RÉFÉRENCES
    // ========================================================================
    const refOmda = factureData.ref_omda || '001';
    const numFacture = factureData.num_facture || refOmda;
    const refClientType = factureData.ref_client_type || 'AUT';
    const refUsager = factureData.ref_usager || '0';

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`${t('Réf', 'Fanondroana', 'Ref')} : ${currentYear} / ${refOmda} / OMDA`, marginX, yPos);
    yPos += 7;

    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    const numFactureFormatted = String(numFacture).padStart(3, '0');

    let typeFactureLabel = factureData.type_facture || 'DAFC';
    if (typeFactureLabel !== 'DAFC' && typeFactureLabel !== 'SFL') {
      typeFactureLabel = 'DAFC';
    }

    const factureNum = `${currentYear} / ${numFactureFormatted} / ${typeFactureLabel}`;
    doc.text(
      `${t('FACTURE', 'FAKTIORA', 'INVOICE')} n° ${factureNum}`,
      marginX + 50,
      yPos + 4
    );
    yPos += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const clientRef = `${refClientType} / ${String(refUsager).padStart(3, '0')}`;
    doc.text(`${t('Réf. Client', 'Fanondroana Mpanjifa', 'Client Ref')} : ${clientRef}`, marginX, yPos + 4);
    doc.setTextColor(17, 17, 17);
    yPos += 10;

    // ========================================================================
    // 4 - BLOC CLIENT
    // ========================================================================
    const boxWidth = pageWidth - (marginX * 2);
    const boxHeight = 34;

    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(229, 229, 229);
    doc.setLineWidth(0.25);
    doc.rect(marginX, yPos, boxWidth, boxHeight, 'FD');

    const labelX = marginX + 5;
    const contentX = marginX + 45;
    let clientY = yPos + 6;

    const nomClient = factureData.denomination || factureData.demandeur || factureData.organisateurs || t('CLIENT', 'MPANJIFA', 'CLIENT');
    doc.setFont('times', 'bold');
    doc.text(`${t('Doit', 'Tokony handoa', 'Owes')} :`, labelX, clientY);
    doc.setFont('times', 'bold');
    const nomClientLines = doc.splitTextToSize(nomClient, boxWidth - (contentX - marginX) - 5);
    doc.text(nomClientLines, contentX, clientY);
    clientY += (nomClientLines.length * 5) + 1;

    const responsable = factureData.representant_par || factureData.demandeur || factureData.representant_nom || t('Non spécifié', 'Tsy voafaritra', 'Not specified');
    doc.setFont('times', 'bold');
    doc.text(`${t('Responsable', 'Tompon\'andraikitra', 'Manager')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    const respLines = doc.splitTextToSize(responsable, boxWidth - (contentX - marginX) - 5);
    doc.text(respLines, contentX, clientY);
    clientY += (respLines.length * 5) + 1;

    const adresse = factureData.adresse || factureData.siege || factureData.adresse_siege || t('Adresse non spécifiée', 'Adiresy tsy voafaritra', 'Address not specified');
    doc.setFont('times', 'bold');
    doc.text(`${t('Adresse', 'Adiresy', 'Address')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    const adresseLines = doc.splitTextToSize(adresse, boxWidth - (contentX - marginX) - 5);
    doc.text(adresseLines, contentX, clientY);
    clientY += (adresseLines.length * 5) + 1;

    const contact = factureData.telephone || t('Non spécifié', 'Tsy voafaritra', 'Not specified');
    doc.setFont('times', 'bold');
    doc.text(`${t('Contact', 'Fifandraisana', 'Contact')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    doc.text(contact, contentX, clientY);
    clientY += 6;

    doc.setFont('times', 'bold');
    doc.text(`${t('OBJET', 'ANTONY', 'SUBJECT')} :`, labelX, clientY);
    doc.setFont('times', 'bold');
    doc.text(t("Redevances d'auteur", "Taham-bolan'ny mpanoratra", 'Copyright royalties'), contentX, clientY);

    const finalBoxHeight = Math.max(boxHeight, (clientY - yPos) + 5);
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(229, 229, 229);
    doc.rect(marginX, yPos, boxWidth, finalBoxHeight, 'FD');

    // Réécriture
    clientY = yPos + 6;
    doc.setFont('times', 'bold');
    doc.text(`${t('Doit', 'Tokony handoa', 'Owes')} :`, labelX, clientY);
    doc.text(nomClientLines, contentX, clientY);
    clientY += (nomClientLines.length * 5) + 1;
    doc.text(`${t('Responsable', 'Tompon\'andraikitra', 'Manager')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    doc.text(respLines, contentX, clientY);
    clientY += (respLines.length * 5) + 1;
    doc.setFont('times', 'bold');
    doc.text(`${t('Adresse', 'Adiresy', 'Address')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    doc.text(adresseLines, contentX, clientY);
    clientY += (adresseLines.length * 5) + 1;
    doc.setFont('times', 'bold');
    doc.text(`${t('Contact', 'Fifandraisana', 'Contact')} :`, labelX, clientY);
    doc.setFont('times', 'normal');
    doc.text(contact, contentX, clientY);
    clientY += 6;
    doc.setFont('times', 'bold');
    doc.text(`${t('OBJET', 'ANTONY', 'SUBJECT')} :`, labelX, clientY);
    doc.text(t("Redevances d'auteur", "Taham-bolan'ny mpanoratra", 'Copyright royalties'), contentX, clientY);

    yPos += finalBoxHeight + 8;

    // ========================================================================
    // 5 - RÉCUPÉRATION DES MONTANTS (inchangé)
    // ========================================================================
    let montantMensuel = 0;
    let fraisDossier = 0;
    let montantRetard = 0;
    let isRetard = false;
    let uniter = 1;
    let totalGeneral = 0;

    if (factureData.montant_mensuel && factureData.montant_mensuel !== '') {
      montantMensuel = parseFloat(factureData.montant_mensuel) || 0;
    }
    if (montantMensuel === 0 && factureData.montant && factureData.montant !== '') {
      montantMensuel = parseFloat(factureData.montant) || 0;
    }
    if (montantMensuel === 0 && factureData.taux && factureData.taux !== '') {
      montantMensuel = parseFloat(factureData.taux) || 0;
    }
    if (montantMensuel === 0 && factureData.montant_total && factureData.montant_total !== '') {
      montantMensuel = parseFloat(factureData.montant_total) || 0;
    }

    if (factureData.frais_dossier && factureData.frais_dossier !== '') {
      fraisDossier = parseFloat(factureData.frais_dossier) || 0;
    }

    if (factureData.uniter && factureData.uniter !== '') {
      uniter = parseInt(factureData.uniter) || 1;
    }
    if (!uniter || uniter <= 0) uniter = 1;

    if (factureData.montant_retard && factureData.montant_retard !== '') {
      montantRetard = parseFloat(factureData.montant_retard) || 0;
    }
    if (factureData.is_retard !== undefined && factureData.is_retard !== null) {
      isRetard = factureData.is_retard === true || factureData.is_retard === 'true' || factureData.is_retard === 1;
    }

    // Fallback API usager
    if (montantMensuel === 0 && factureData.ref_usager) {
      try {
        const usagerResponse = await fetch(`http://localhost:3001/api/usagers/${factureData.ref_usager}`);
        const usagerData = await usagerResponse.json();

        if (usagerData.success && usagerData.usager) {
          const usager = usagerData.usager;

          if (usager.montant_mensuel && usager.montant_mensuel !== '') {
            montantMensuel = parseFloat(usager.montant_mensuel) || 0;
          }
          if (montantMensuel === 0 && usager.montant && usager.montant !== '') {
            montantMensuel = parseFloat(usager.montant) || 0;
          }
          if (montantMensuel === 0 && usager.taux && usager.taux !== '') {
            montantMensuel = parseFloat(usager.taux) || 0;
          }
          if (montantMensuel === 0 && usager.montant_total && usager.montant_total !== '') {
            montantMensuel = parseFloat(usager.montant_total) || 0;
          }

          if (fraisDossier === 0 && usager.frais_dossier && usager.frais_dossier !== '') {
            fraisDossier = parseFloat(usager.frais_dossier) || 0;
          }

          if (uniter === 1 && usager.uniter && usager.uniter !== '') {
            uniter = parseInt(usager.uniter) || 1;
          }

          if (montantRetard === 0 && usager.montant_retard && usager.montant_retard !== '') {
            montantRetard = parseFloat(usager.montant_retard) || 0;
          }
          if (!isRetard && usager.is_retard !== undefined && usager.is_retard !== null) {
            isRetard = usager.is_retard === true || usager.is_retard === 'true' || usager.is_retard === 1;
          }
        }
      } catch (err) {
        console.warn('⚠️ Erreur récupération usager:', err);
      }
    }

    // Fallback API montants
    if (montantMensuel === 0 && factureData.ref_usager) {
      try {
        const montantResponse = await fetch(`http://localhost:3001/api/montants/usager/${factureData.ref_usager}`);
        const montantData = await montantResponse.json();
        if (montantData.success && montantData.montant) {
          montantMensuel = parseFloat(montantData.montant) || 0;
          if (montantData.frais_dossier) {
            fraisDossier = parseFloat(montantData.frais_dossier) || 0;
          }
        }
      } catch (err) {
        console.warn('⚠️ Erreur récupération montants:', err);
      }
    }

    // Déduction depuis soit_total
    if (montantMensuel === 0 && factureData.soit_total && parseFloat(factureData.soit_total) > 0) {
      const soitTotalValue = parseFloat(factureData.soit_total) || 0;
      const retardValue = isRetard ? montantRetard : 0;
      const montantSansFraisNiRetard = soitTotalValue - fraisDossier - retardValue;

      if (montantSansFraisNiRetard > 0 && uniter > 0) {
        montantMensuel = montantSansFraisNiRetard / uniter;
      }
    }

    const montantAffiche = montantMensuel * uniter;
    const baseTotal = montantAffiche + fraisDossier;
    totalGeneral = isRetard ? baseTotal + montantRetard : baseTotal;

    if (factureData.soit_total && parseFloat(factureData.soit_total) > 0) {
      totalGeneral = parseFloat(factureData.soit_total);
    }

    // ========================================================================
    // 6 - TABLEAU
    // ========================================================================
    const xDesc = marginX;
    const xU = 125;
    const xPu = 140;
    const xMnt = 165;
    const xEnd = pageWidth - marginX;

    yPos += 2;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`( x 1 ${t('ariary', 'ariary', 'ariary')} )`, xEnd - 3, yPos - 6, { align: 'right' });

    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.3);
    doc.line(xDesc, yPos, xEnd, yPos);

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 17, 17);

    doc.text(t('DESCRIPTIONS', 'FANAZAVANA', 'DESCRIPTIONS'), xDesc + 3, yPos + 5.5);
    doc.text('U.', xU + 3, yPos + 5.5);
    doc.text('P.U. (Ar)', xPu + 3, yPos + 5.5);
    doc.text(
      `${t('MONTANT', 'VOLA', 'AMOUNT')}`,
      xEnd - 3,
      yPos + 5.5,
      { align: 'right' }
    );

    yPos += 8;
    doc.line(xDesc, yPos, xEnd, yPos);

    const tableStartHeight = yPos - 8;

    yPos += 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);

    // ============================================================
    // ✅ CONSTRUCTION DE LA DESCRIPTION — SIMPLIFIÉE
    // Uniquement "Nom - Activité", plus aucun élément additionnel
    // (étoiles, ville, magasins, artistes, dates, lignes, jauge,
    // fréquence, etc.) afin d'éviter tout débordement dans la
    // colonne "U." du tableau.
    // ============================================================
    const nomPrincipal = factureData.denomination || factureData.demandeur || factureData.organisateurs || t('Prestation OMDA', 'Tolotra OMDA', 'OMDA Service');
    let descLine = nomPrincipal;

    if (factureData.activite) {
      descLine += ` - ${factureData.activite}`;
    }

    const puValue = montantMensuel > 0 ? montantMensuel : 0;
    const montantValue = puValue * uniter;

    const maxWidthDesc = xU - xDesc - 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(descLine, maxWidthDesc);
    const lineHeightDesc = 5;
    const hauteurDesc = descLines.length * lineHeightDesc;

    for (let i = 0; i < descLines.length; i++) {
      const currentY = yPos + (i * lineHeightDesc);
      doc.text(descLines[i], xDesc + 3, currentY);
    }

    doc.text(String(uniter), xU + 5, yPos);
    doc.text(formatNumber(puValue), xPu + 3, yPos);
    doc.text(formatNumber(montantValue), xEnd - 3, yPos, { align: 'right' });

    yPos += hauteurDesc + 2;
    doc.setDrawColor(235, 235, 235);
    doc.line(xDesc, yPos, xEnd, yPos);

    // ✅ FRAIS DE DOSSIER
    yPos += 6;
    doc.setDrawColor(26, 26, 26);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(t('Frais de dossier', 'Saram-pandraharahana', 'File fees'), xDesc + 3, yPos);
    doc.text('1', xU + 5, yPos);
    doc.text(formatNumber(fraisDossier), xPu + 3, yPos);
    doc.text(formatNumber(fraisDossier), xEnd - 3, yPos, { align: 'right' });
    yPos += 4;

    // ✅ PÉNALITÉ DE RETARD
    if (isRetard && montantRetard > 0) {
      yPos += 6;
      doc.text(t('Pénalité de retard', 'Sazy noho ny fahatarana', 'Late penalty'), xDesc + 3, yPos);
      doc.text('1', xU + 5, yPos);
      doc.text(formatNumber(montantRetard), xPu + 3, yPos);
      doc.text(formatNumber(montantRetard), xEnd - 3, yPos, { align: 'right' });
      yPos += 4;
    }

    // ✅ LIGNES DE FERMETURE
    doc.line(xDesc, yPos, xEnd, yPos);
    doc.line(xDesc, tableStartHeight, xDesc, yPos);
    doc.line(xU, tableStartHeight, xU, yPos);
    doc.line(xPu, tableStartHeight, xPu, yPos);
    doc.line(xMnt, tableStartHeight, xMnt, yPos);
    doc.line(xEnd, tableStartHeight, xEnd, yPos);

    // ========================================================================
    // 7 - TOTAL
    // ========================================================================
    const totalValue = totalGeneral;
    doc.setFillColor(248, 248, 248);
    doc.rect(xMnt, yPos, xEnd - xMnt, 8, 'FD');
    doc.rect(xDesc, yPos, xMnt - xDesc, 8, 'D');

    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text(t('TOTAL', 'TOTALY', 'TOTAL'), xDesc + 3, yPos + 5.5);
    doc.text(formatNumber(totalValue), xEnd - 3, yPos + 5.5, { align: 'right' });

    // ========================================================================
    // 8 - SOMME EN LETTRES
    // ========================================================================
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginX, yPos, xEnd, yPos);

    yPos += 5;
    doc.setTextColor(17, 17, 17);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    const phrase = t(
      'Arrêtée la présente facture à la somme de : ',
      'Voatokana ity faktiora ity ho vola : ',
      'This invoice is set at the amount of: '
    );
    doc.text(phrase, marginX, yPos);
    doc.setFont('times', 'italic');
    const phraseWidth = doc.getTextWidth(phrase);
    const montantLettres = numberToWords(totalValue, langue);
    doc.text(montantLettres, marginX + phraseWidth + 5, yPos);

    yPos += 4;
    doc.line(marginX, yPos, xEnd, yPos);

    // ========================================================================
    // 9 - SIGNATURES
    // ========================================================================
    yPos += 12;
    doc.setFont('times', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text(t('Le client', 'Ny mpanjifa', 'The client'), marginX + 10, yPos);
    doc.text(t('Le Directeur Financier', 'Talen\'ny fitantanam-bola', 'Chief Financial Officer'), xEnd - 55, yPos);

    yPos += 27;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);

    const dafTextWidth = doc.getTextWidth(dafName);
    const dafX = (xEnd - 55) + 27 - (dafTextWidth / 2) - 10;
    doc.text(dafName, dafX, yPos);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const dafSubText = t(
      '(Directeur Administratif et Financier)',
      '(Talen\'ny fitantanam-bola)',
      '(Chief Financial Officer)'
    );
    const dafSubWidth = doc.getTextWidth(dafSubText);
    const dafSubX = (xEnd - 55) + 27 - (dafSubWidth / 2) - 10;
    doc.text(dafSubText, dafSubX, yPos + 5);

    yPos += 15;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${t('Reçu ce', 'Voaray ny', 'Received on')} : ${dateStr}`, marginX, yPos);
    yPos += 5.5;

    const personneRecuValue = factureData.personne_recu || responsable || '________________________';
    doc.text(`${t('Par', 'Avy amin\'ny', 'By')} : ${personneRecuValue}`, marginX, yPos);

    // ========================================================================
    // 10 - PIED DE PAGE — ADRESSE ET STAT/NIF FIXES
    // ========================================================================
    const footerY = 274;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(marginX, footerY, xEnd, footerY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(NOMS_FIXES.ADRESSE_LIGNE, pageWidth / 2, footerY + 4, { align: 'center' });
    doc.setFont('times', 'bold');
    doc.text(NOMS_FIXES.STAT_NIF, pageWidth / 2, footerY + 8, { align: 'center' });

    // ========================================================================
    // 11 - SORTIE
    // ========================================================================
    if (returnBlob) {
      return doc.output('blob');
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `facture_${numFactureFormatted}_${refClientType}_${currentYear}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

    console.log(`✅ Facture PDF générée avec succès (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur génération facture PDF:', error);
    throw error;
  }
};

export default generateFacturePDF;