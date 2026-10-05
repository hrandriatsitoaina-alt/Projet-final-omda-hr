// src/pages/pdf/comptet_pdf.jsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPdfLocale } from './pdfI18n';

const TYPE_LABELS = {
  hotel: 'HÔTEL',
  'grand-surface': 'GRAND SURFACE',
  media: 'TÉLÉ / RADIO',
  occ: 'OCCASIONNELLE',
  bus: 'BUS',
  nightclub: 'NIGHT CLUB',
  autre: 'AUTRE USAGER',
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const toNumber = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseFloat(String(v).replace(/\s/g, ''));
  return isNaN(n) ? 0 : n;
};

// ✅ Formate un montant de retard — VIDE si 0 ou null
const formatRetard = (value) => {
  const n = toNumber(value);
  if (n <= 0) return '';   // ✅ vide au lieu de "—"
  return formatNumber(n);
};

// ============================================================
// En-tête simple (noir & blanc, sans fond)
// ============================================================
const drawHeader = (doc, pageWidth, margin, titre, sousTitre, locale, selectedRegion) => {
  let y = 12;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("OFFICE MALAGASY DU DROIT D'AUTEUR", pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(13);
  doc.text(titre, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${new Date().toLocaleDateString(locale)}`, margin, y);

  if (selectedRegion) {
    const txt = `Région : ${selectedRegion}`;
    doc.text(txt, pageWidth - margin - doc.getTextWidth(txt), y);
  }
  y += 5;

  if (sousTitre) {
    doc.text(sousTitre, pageWidth - margin - doc.getTextWidth(sousTitre), y);
    y += 5;
  }

  // Ligne de séparation sous l'en-tête
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 4;
};

// ============================================================
// ✅ PDF GLOBAL — noir & blanc, sous-total en tableau
//    + colonne RETARD (vide si 0)
// ============================================================
export const generateComptePDFGlobal = (recap, options = {}) => {
  if (!recap || recap.length === 0) {
    console.warn('⚠️ Aucun type à générer');
    return false;
  }

  try {
    const langue = options.langue || 'fr';
    const locale = getPdfLocale(langue);
    const selectedRegion = options.region || '';
    const selectedTypeLabel = options.typeLabel || '';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8;

    let y = drawHeader(
      doc,
      pageWidth,
      margin,
      'RÉCAPITULATIF GÉNÉRAL DES COMPTES',
      selectedTypeLabel ? `Type : ${selectedTypeLabel}` : '',
      locale,
      selectedRegion
    );

    // ============================================================
    // Colonnes principales — avec RETARD
    //   24 + 28 + 24 + 28 + 20 + 22 + 20 + 20 + 20 = 206 → à ajuster
    //   A4 = 210mm - 2*8 margin = 194mm utile
    // ============================================================
    const tableHeaders = [
      'TYPE',
      'NOM',
      'DEMANDEUR',
      'TÉLÉPHONE',
      'RÉGION',
      'MONTANT TOTAL',
      'SANS FRAIS',
      'FRAIS DOSSIER',
      'RETARD',      // ✅ NOUVELLE COLONNE
    ];

    // 22 + 28 + 24 + 26 + 20 + 22 + 20 + 16 + 16 = 194
    const columnStyles = {
      0: { cellWidth: 22, halign: 'left' },
      1: { cellWidth: 28, halign: 'left' },
      2: { cellWidth: 24, halign: 'left' },
      3: { cellWidth: 26, halign: 'left' },
      4: { cellWidth: 20, halign: 'left' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 16, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },  // ✅ RETARD
    };

    // ============================================================
    // Boucle par type
    // ============================================================
    recap.forEach((type, index) => {
      const typeLabel = TYPE_LABELS[type.key] || type.label.toUpperCase();

      if (y > pageHeight - 70) {
        doc.addPage();
        y = 20;
      }

      // ─── Titre du type (texte simple souligné, pas de fond) ───
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${typeLabel}`, margin, y);
      y += 5;

      // Ligne de soulignement du titre
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;

      // ─── Lignes du tableau ───
      const tableData = type.usagers.map((u) => [
        typeLabel,
        u.nom || '-',
        u.demandeur || '-',
        u.telephone || '-',
        u.region || '-',
        formatNumber(u.montant_avec_frais),
        formatNumber(u.montant_sans_frais),
        formatNumber(u.frais_dossier),
        formatRetard(u.montant_retard),   // ✅ RETARD (vide si 0)
      ]);

      let fontSize = 9;
      let cellPadding = 2;

      if (tableData.length > 15) {
        fontSize = 8.5;
        cellPadding = 1.8;
      }
      if (tableData.length > 25) {
        fontSize = 8;
        cellPadding = 1.6;
      }
      if (tableData.length > 40) {
        fontSize = 7.5;
        cellPadding = 1.4;
      }

      // ✅ Détection : a-t-on au moins un retard dans ce type ?
      const hasAnyRetard = type.usagers.some(
        (u) => toNumber(u.montant_retard) > 0
      );

      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableData.length > 0
          ? tableData
          : [['—', 'Aucun usager', '', '', '', '', '', '', '']],
        theme: 'grid',
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          valign: 'middle',
          textColor: [0, 0, 0],
          overflow: 'linebreak',
          minCellHeight: 6,
          font: 'helvetica',
          fillColor: false,
        },
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontSize: fontSize - 0.3,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: cellPadding,
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
        },
        columnStyles,
        didParseCell: function (data) {
          if (data.section === 'body') {
            const idx = data.column.index;
            if (idx === 0) data.cell.styles.fontSize = fontSize - 0.8;
            if (idx === 1) data.cell.styles.fontSize = fontSize - 0.5;
            if (idx === 2) data.cell.styles.fontSize = fontSize - 0.5;
            if (idx === 3) data.cell.styles.fontSize = fontSize - 0.3;
            if (idx === 4) data.cell.styles.fontSize = fontSize - 1;
            if (idx >= 5) data.cell.styles.fontSize = fontSize - 0.5;

            // ✅ Colonne RETARD : en gras si valeur présente
            if (idx === 8 && data.cell.raw && data.cell.raw !== '') {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      y = doc.lastAutoTable.finalY + 3;

      // ═══════════════════════════════════════════════════════
      // ✅ TABLEAU DE SOUS-TOTAL PAR TYPE
      //    TOTAL | MONTANT TOTAL | SANS FRAIS | FRAIS DOSSIER | RETARD
      // ═══════════════════════════════════════════════════════
      const totalRetard = toNumber(type.total_montant_retard);

      autoTable(doc, {
        startY: y,
        head: [['TOTAL', 'MONTANT TOTAL', 'SANS FRAIS', 'FRAIS DOSSIER', 'RETARD']],
        body: [[
          `${type.nombre} usager${type.nombre > 1 ? 's' : ''}`,
          formatNumber(type.total_montant_avec_frais) + ' Ar',
          formatNumber(type.total_montant_sans_frais) + ' Ar',
          formatNumber(type.total_frais_dossier) + ' Ar',
          totalRetard > 0 ? formatNumber(totalRetard) + ' Ar' : '',   // ✅ vide si 0
        ]],
        theme: 'grid',
        styles: {
          fontSize: 9.5,
          cellPadding: 2.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.15,
          textColor: [0, 0, 0],
          valign: 'middle',
          font: 'helvetica',
          fillColor: false,
        },
        headStyles: {
          fillColor: false,
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          fontSize: 9,
        },
        bodyStyles: {
          fontStyle: 'bold',
          textColor: [0, 0, 0],
        },
        // 56 + 36 + 36 + 34 + 32 = 194
        columnStyles: {
          0: { cellWidth: 56, halign: 'left', fontSize: 9 },
          1: { cellWidth: 36, halign: 'right' },
          2: { cellWidth: 36, halign: 'right' },
          3: { cellWidth: 34, halign: 'right' },
          4: { cellWidth: 32, halign: 'right' },   // ✅ RETARD
        },
        margin: { left: margin, right: margin },
        pageBreak: 'avoid',
      });

      y = doc.lastAutoTable.finalY + 8;
    });

    // ============================================================
    // RÉCAPITULATION GÉNÉRALE
    // ============================================================
    if (y > pageHeight - 70) {
      doc.addPage();
      y = 20;
    }

    // Titre souligné
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RÉCAPITULATION GÉNÉRALE', margin, y);
    y += 5;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    // Totaux globaux
    let totalGlobalFrais = 0;
    let totalGlobalSansFrais = 0;
    let totalGlobalAvecFrais = 0;
    let totalGlobalUsagers = 0;
    let totalGlobalRetard = 0;   // ✅ AJOUT

    recap.forEach(t => {
      totalGlobalFrais += toNumber(t.total_frais_dossier);
      totalGlobalSansFrais += toNumber(t.total_montant_sans_frais);
      totalGlobalAvecFrais += toNumber(t.total_montant_avec_frais);
      totalGlobalUsagers += t.nombre || 0;
      totalGlobalRetard += toNumber(t.total_montant_retard);   // ✅ AJOUT
    });

    const recapRows = recap.map(t => [
      TYPE_LABELS[t.key] || t.label.toUpperCase(),
      String(t.nombre),
      formatNumber(t.total_montant_avec_frais) + ' Ar',
      formatNumber(t.total_montant_sans_frais) + ' Ar',
      formatNumber(t.total_frais_dossier) + ' Ar',
      toNumber(t.total_montant_retard) > 0
        ? formatNumber(t.total_montant_retard) + ' Ar'
        : '',   // ✅ vide si 0
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        'TYPE D\'USAGER',
        'NOMBRE',
        'MONTANT TOTAL',
        'SANS FRAIS',
        'FRAIS DOSSIER',
        'RETARD',   // ✅ NOUVELLE COLONNE
      ]],
      body: recapRows,
      foot: [[
        'TOTAL GÉNÉRAL',
        String(totalGlobalUsagers),
        formatNumber(totalGlobalAvecFrais) + ' Ar',
        formatNumber(totalGlobalSansFrais) + ' Ar',
        formatNumber(totalGlobalFrais) + ' Ar',
        totalGlobalRetard > 0 ? formatNumber(totalGlobalRetard) + ' Ar' : '',   // ✅ vide si 0
      ]],
      theme: 'grid',
      styles: {
        fontSize: 9.5,
        cellPadding: 2.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
        font: 'helvetica',
        fillColor: false,
      },
      headStyles: {
        fillColor: false,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        fontSize: 9,
      },
      footStyles: {
        fillColor: false,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        fontSize: 9.5,
      },
      // 50 + 16 + 34 + 32 + 32 + 30 = 194
      columnStyles: {
        0: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 34, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' },   // ✅ RETARD
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 8;

    // Signatures
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Document généré automatiquement — OMDA', margin, y);
    doc.text('Signature : ______________________', pageWidth - margin, y, { align: 'right' });

    // ============================================================
    // PIED DE PAGE
    // ============================================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    }

    const fileName = `compte_global${selectedRegion ? '_' + selectedRegion.replace(/\s/g, '_') : ''}_${Date.now()}.pdf`;
    doc.save(fileName);
    console.log(`✅ PDF Compte global généré (${recap.length} types)`);
    return true;
  } catch (error) {
    console.error('❌ Erreur génération PDF compte global:', error);
    return false;
  }
};

// ============================================================
// ✅ PDF pour UN SEUL TYPE
//    + colonne RETARD (vide si 0)
// ============================================================
export const generateComptePDFType = (typeData, options = {}) => {
  try {
    const langue = options.langue || 'fr';
    const locale = getPdfLocale(langue);
    const selectedRegion = options.region || '';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 8;

    const label = TYPE_LABELS[typeData.type] || (typeData.label || '').toUpperCase();

    let y = drawHeader(
      doc,
      pageWidth,
      margin,
      `RÉCAPITULATIF - ${label}`,
      `${typeData.nombre} usager${typeData.nombre > 1 ? 's' : ''}`,
      locale,
      selectedRegion
    );

    const tableHeaders = [
      'NOM',
      'DEMANDEUR',
      'TÉLÉPHONE',
      'RÉGION',
      'MONTANT TOTAL',
      'SANS FRAIS',
      'FRAIS DOSSIER',
      'RETARD',   // ✅ NOUVELLE COLONNE
    ];

    const tableData = typeData.usagers.map((u) => [
      u.nom || '-',
      u.demandeur || '-',
      u.telephone || '-',
      u.region || '-',
      formatNumber(u.montant_avec_frais),
      formatNumber(u.montant_sans_frais),
      formatNumber(u.frais_dossier),
      formatRetard(u.montant_retard),   // ✅ RETARD (vide si 0)
    ]);

    let fontSize = 9.5;
    let cellPadding = 2.2;
    if (tableData.length > 12) { fontSize = 9; cellPadding = 2; }
    if (tableData.length > 20) { fontSize = 8.5; cellPadding = 1.8; }
    if (tableData.length > 30) { fontSize = 8; cellPadding = 1.6; }

    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData.length > 0
        ? tableData
        : [['Aucun usager', '', '', '', '', '', '', '']],
      theme: 'grid',
      styles: {
        fontSize: fontSize,
        cellPadding: cellPadding,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle',
        textColor: [0, 0, 0],
        overflow: 'linebreak',
        minCellHeight: 6,
        font: 'helvetica',
        fillColor: false,
      },
      headStyles: {
        fillColor: false,
        textColor: [0, 0, 0],
        fontSize: fontSize - 0.3,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: cellPadding,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      // 38 + 30 + 28 + 22 + 22 + 20 + 18 + 16 = 194
      columnStyles: {
        0: { cellWidth: 38, halign: 'left' },
        1: { cellWidth: 30, halign: 'left' },
        2: { cellWidth: 28, halign: 'left' },
        3: { cellWidth: 22, halign: 'left' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 16, halign: 'right' },   // ✅ RETARD
      },
      didParseCell: function (data) {
        if (data.section === 'body') {
          const idx = data.column.index;
          if (idx === 0 || idx === 1) data.cell.styles.fontSize = fontSize - 0.5;
          if (idx === 2) data.cell.styles.fontSize = fontSize - 0.3;
          if (idx === 3) data.cell.styles.fontSize = fontSize - 1;
          if (idx >= 4) data.cell.styles.fontSize = fontSize - 0.5;

          // ✅ Colonne RETARD : en gras si valeur présente
          if (idx === 7 && data.cell.raw && data.cell.raw !== '') {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: margin, right: margin },
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
    });

    y = doc.lastAutoTable.finalY + 3;

    // ✅ Tableau de sous-total — avec RETARD
    const totalRetard = toNumber(typeData.total_montant_retard);

    autoTable(doc, {
      startY: y,
      head: [['TOTAL', 'MONTANT TOTAL', 'SANS FRAIS', 'FRAIS DOSSIER', 'RETARD']],
      body: [[
        `${typeData.nombre} usager${typeData.nombre > 1 ? 's' : ''}`,
        formatNumber(typeData.total_montant_avec_frais) + ' Ar',
        formatNumber(typeData.total_montant_sans_frais) + ' Ar',
        formatNumber(typeData.total_frais_dossier) + ' Ar',
        totalRetard > 0 ? formatNumber(totalRetard) + ' Ar' : '',   // ✅ vide si 0
      ]],
      theme: 'grid',
      styles: {
        fontSize: 9.5,
        cellPadding: 2.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        textColor: [0, 0, 0],
        valign: 'middle',
        font: 'helvetica',
        fillColor: false,
      },
      headStyles: {
        fillColor: false,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        fontSize: 9,
      },
      bodyStyles: {
        fontStyle: 'bold',
        textColor: [0, 0, 0],
      },
      // 56 + 36 + 36 + 34 + 32 = 194
      columnStyles: {
        0: { cellWidth: 56, halign: 'left', fontSize: 9 },
        1: { cellWidth: 36, halign: 'right' },
        2: { cellWidth: 36, halign: 'right' },
        3: { cellWidth: 34, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },   // ✅ RETARD
      },
      margin: { left: margin, right: margin },
      pageBreak: 'avoid',
    });

    // Numérotation
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    }

    const fileName = `recap_${typeData.type}${selectedRegion ? '_' + selectedRegion.replace(/\s/g, '_') : ''}_${Date.now()}.pdf`;
    doc.save(fileName);
    console.log(`✅ PDF Type ${typeData.type} généré`);
    return true;
  } catch (error) {
    console.error('❌ Erreur génération PDF type:', error);
    return false;
  }
};

export default generateComptePDFGlobal;