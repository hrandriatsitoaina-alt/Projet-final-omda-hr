// src/pages/pdf/quitance_pdf.js
// ═══════════════════════════════════════════════════════════════════
// GÉNÉRATION PDF — SUIVI DES QUITTANCES
// - 20 lignes par page
// - Numéro de carnet basé sur la POSITION (1 → N)
// - N° QUITTANCE = position globale (ignore les doublons Type B)
// - Correspondance parfaite avec la pagination du tableau JSX
// ═══════════════════════════════════════════════════════════════════
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

// ============================================================
// ✅ Nombre de lignes par page PDF
// ============================================================
const QUITTANCES_PAR_PAGE = 20;

// ============================================================
// Secours : lit la langue stockée dans le localStorage
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
// Utilitaires montants
// ============================================================
const nettoyerMontant = (valeur) => {
  if (!valeur && valeur !== 0) return 0;
  if (typeof valeur === 'string') {
    const nettoye = valeur.replace(/[^\d.-]/g, '');
    const nombre = parseFloat(nettoye);
    return isNaN(nombre) ? 0 : Math.round(nombre);
  }
  return Math.round(Number(valeur)) || 0;
};

const formatMontant = (valeur) => {
  const nombre = nettoyerMontant(valeur);
  return String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// ============================================================
// ✅ Formatage du N° QUITTANCE — Basé sur la POSITION (1 → N)
//    Ignore les doublons Type B (plusieurs lignes, même num_quitance)
// ============================================================
const formatPositionQuittance = (position) => {
  const n = parseInt(position, 10);
  if (isNaN(n) || n <= 0) return '';
  return String(n).padStart(7, '0');
};

/**
 * ✅ Génère un PDF paginé avec 20 lignes par page
 *
 * @param {Array}  quittances  Liste des lignes à imprimer
 * @param {Object} options     {
 *    responsable, lieu, region, dateDelivre, dateRetour,
 *    langue, pageDepart
 * }
 */
export const generateQuitancePDF = (quittances, options = {}) => {
  if (!quittances || quittances.length === 0) {
    console.warn('⚠️ Aucune quittance à générer');
    return false;
  }

  try {
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);
    const locale = getPdfLocale(langue);

    console.log('📄 Génération PDF Quittance — Total lignes :', quittances.length);

    const {
      responsable = '',
      lieu = 'Antananarivo',
      region = t('Toutes les régions', 'Ny faritra rehetra', 'All regions'),
      dateDelivre = new Date().toLocaleDateString(locale),
      dateRetour = '',
      pageDepart = 1,
    } = options;

    // ✅ OFFSET GLOBAL : si on imprime à partir de la page 2 du tableau,
    //    l'offset = (2 - 1) × 20 = 20 → les positions commencent à 21
    const pageDepartNum = Math.max(1, parseInt(pageDepart, 10) || 1);
    const offsetGlobal = (pageDepartNum - 1) * QUITTANCES_PAR_PAGE;

    console.log(`📄 Offset global : ${offsetGlobal} (page de départ : ${pageDepartNum})`);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;

    // ============================================================
    // Labels types
    // ============================================================
    const typeLabels = {
      'HTL': t('Hôtel', 'Hotely', 'Hotel'),
      'MGS': t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface'),
      'RDP': t('Radio/Télé', 'Radio/Tele', 'Radio/TV'),
      'TRP': t('Transport', 'Fitaterana', 'Transport'),
      'NGT': t('Night Club', 'Club alina', 'Night Club'),
      'OCC': t('Occasionnel', 'Fotoana manokana', 'Occasional'),
      'OTH': t('Usager événementiel', 'Mpampiasa hetsika', 'Event user'),
    };

    const tableHeaders = [
      t('N° Quit', 'N°', 'N°'),
      t('TYPE', 'KARAZANA', 'TYPE'),
      t('CLIENT', 'MPANJIFA', 'CLIENT'),
      t('MONTANT', 'VOLA', 'AMOUNT'),
      t('OBS', 'FANAMARIHANA', 'OBS'),
    ];

    // ============================================================
    // ✅ Découpage en chunks de 20 lignes (1 chunk = 1 page PDF)
    // ============================================================
    const chunks = [];
    for (let i = 0; i < quittances.length; i += QUITTANCES_PAR_PAGE) {
      chunks.push(quittances.slice(i, i + QUITTANCES_PAR_PAGE));
    }

    const totalPages = chunks.length;

    // ============================================================
    // RENDER : une page PDF par chunk
    // ============================================================
    chunks.forEach((chunk, pageIndex) => {
      // ✅ Saut de page pour toutes sauf la première
      if (pageIndex > 0) doc.addPage();

      let y = margin;

      // ------------------------------------------------------
      // EN-TÊTE
      // ------------------------------------------------------
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        t('SUIVI QUITTANCE', 'FANARAHA-MASO TARATASY', 'RECEIPT TRACKING'),
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 7;

      // ✅ BORNES BASÉES SUR LA POSITION (1 → N), PAS sur num_quitance
      //    Position du 1er élément du chunk courant
      const positionDebut = offsetGlobal + pageIndex * QUITTANCES_PAR_PAGE + 1;
      const positionFin = positionDebut + chunk.length - 1;

      const debutFormate = formatPositionQuittance(positionDebut);
      const finFormate = formatPositionQuittance(positionFin);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${t('N° de carnet', 'Laharana carnet', 'Booklet N°')} : ${debutFormate} ${t('à', 'ka hatramin\'ny', 'to')} ${finFormate}`,
        margin,
        y
      );

      // Responsable (à droite)
      const responsableText = `${t('Responsable', 'Tompon\'andraikitra', 'Manager')} : ${responsable || '_______________'}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        responsableText,
        pageWidth - margin - doc.getTextWidth(responsableText),
        y
      );
      y += 6;

      // Lieu (à gauche) + Page X/Y (à droite)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${t("Lieu de l'agence", 'Toeran\'ny birao', 'Agency location')} : ${lieu || '_______________'}`,
        margin,
        y
      );

      const pageText = `${t('Page', 'Pejy', 'Page')} ${pageIndex + 1} / ${totalPages}`;
      doc.text(
        pageText,
        pageWidth - margin - doc.getTextWidth(pageText),
        y
      );
      y += 5;

      // Date délivrance (à gauche) + Date retour (à droite)
      doc.text(
        `${t('Date de délivrance', 'Daty nanomezana', 'Issue date')} : ${dateDelivre}`,
        margin,
        y
      );

      const dateRetourText = `${t('Date de retour', 'Daty famerenana', 'Return date')} : ${dateRetour || '_______________'}`;
      doc.text(
        dateRetourText,
        pageWidth - margin - doc.getTextWidth(dateRetourText),
        y
      );
      y += 6;

      // ------------------------------------------------------
      // ✅ TABLEAU — N° QUITTANCE BASÉ SUR LA POSITION GLOBALE
      // ------------------------------------------------------
      const tableData = chunk.map((q, idx) => {
        // Position globale de cette ligne (1 → N)
        const positionGlobale = positionDebut + idx;
        const numQFormate = formatPositionQuittance(positionGlobale);

        const typeLabel = typeLabels[q.ref_client_type] || q.ref_client_type || '-';
        const montantFormatted = formatMontant(q.soit_total);

        let clientInfo = q.denomination || q.demandeur || '-';
        if (q.denomination && q.siege) {
          clientInfo += `, ${q.siege}`;
        }

        let obs = '';
        if (q.region_usager && q.region_usager !== 'N/A') {
          obs = `${t('Région', 'Faritra', 'Region')}: ${q.region_usager}`;
        }
        if (!obs) obs = t('Aucune', 'Tsy misy', 'None');

        return [
          numQFormate,
          typeLabel,
          clientInfo,
          `${montantFormatted} Ar`,
          obs,
        ];
      });

      // ✅ Tailles adaptées pour tenir sur 1 page A4
      const fontSize = chunk.length <= 10 ? 10 : 9;
      const cellPadding = chunk.length <= 10 ? 3 : 2.5;
      const headFontSize = fontSize + 1;

      // Estimation de la hauteur pour réduire si nécessaire
      const minTableY = y + 2;
      const footerReserved = 20;
      const maxTableY = pageHeight - margin - footerReserved;
      const availableHeight = maxTableY - minTableY;
      const estimatedHeight =
        (chunk.length + 1) * (fontSize * 0.55 + cellPadding * 2);

      let finalFontSize = fontSize;
      let finalCellPadding = cellPadding;

      if (estimatedHeight > availableHeight) {
        finalFontSize = Math.max(7, fontSize - 1);
        finalCellPadding = Math.max(1.6, cellPadding - 0.7);
      }

      autoTable(doc, {
        startY: minTableY,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: finalFontSize,
          cellPadding: finalCellPadding,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          valign: 'middle',
          textColor: [0, 0, 0],
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontSize: headFontSize,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 'auto', halign: 'left' },
          3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 'auto', halign: 'left' },
        },
        margin: { left: margin, right: margin },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
      });

      // ------------------------------------------------------
      // PIED DE PAGE
      // ------------------------------------------------------
      const finalY = (doc.lastAutoTable?.finalY || minTableY) + 3;
      let footerY = Math.min(finalY, pageHeight - margin - 10);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      footerY += 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      // Nombre de lignes sur cette page
      const totalItemsPage = chunk.length;
      const itemLabel = totalItemsPage > 1
        ? t('quittances', 'taratasy', 'receipts')
        : t('quittance', 'taratasy', 'receipt');
      doc.text(`${totalItemsPage} ${itemLabel}`, margin, footerY);

      // Total de la page
      const totalMontantPage = chunk.reduce(
        (sum, q) => sum + nettoyerMontant(q.soit_total),
        0
      );
      const totalMontantFormatted = formatMontant(totalMontantPage);
      doc.text(
        `${t('Total page', 'Totaly pejy', 'Page total')} : ${totalMontantFormatted} Ar`,
        pageWidth - margin,
        footerY,
        { align: 'right' }
      );

      // Total général sur la dernière page uniquement
      if (pageIndex === totalPages - 1) {
        footerY += 6;
        const totalGeneralBrut = quittances.reduce(
          (sum, q) => sum + nettoyerMontant(q.soit_total),
          0
        );
        const totalGeneralFormatted = formatMontant(totalGeneralBrut);

        doc.setFontSize(11);
        doc.text(
          `${t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL')} : ${totalGeneralFormatted} Ar`,
          pageWidth - margin,
          footerY,
          { align: 'right' }
        );
      }
    });

    // ============================================================
    // SAUVEGARDE
    // ============================================================
    const regionSlug = String(region)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    const filename = `suivi_quittance_${regionSlug}_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(filename);

    console.log(`✅ PDF généré — ${quittances.length} lignes sur ${totalPages} page(s)`);
    return true;

  } catch (error) {
    console.error('❌ Erreur génération PDF Quittance:', error);
    console.error('❌ Stack:', error.stack);
    return false;
  }
};

export default generateQuitancePDF;