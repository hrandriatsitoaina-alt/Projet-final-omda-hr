// src/pages/pdf/bilanGlobal_pdf.jsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createPdfT,
  getPdfMoisLabels,
  getPdfLocale,
  formatPdfMontant,
  formatPdfDate,
} from './pdfI18n';

// ✅ Wrapper pour jsPDF : formatMontant (utilise helper partagé)
const formatMontant = formatPdfMontant;

// ✅ Wrapper pour jsPDF : formatDate
const formatDate = formatPdfDate;

export const generateBilanGlobalPDF = async (statsData, options = {}) => {
  try {
    // ✅ Langue depuis les options
    const langue = options.langue || 'fr';
    const t = createPdfT(langue);
    const moisLabels = getPdfMoisLabels(langue);
    // ✅ Locale utilisée pour le formatage des nombres (séparateurs de milliers)
    // — avant, tout était formaté en 'fr-FR' quelle que soit la langue choisie
    const numberLocale = getPdfLocale(langue);

    console.log('📄 Début génération Bilan Global PDF...');
    console.log('🌍 Langue :', langue);

    const {
      annee = new Date().getFullYear(),
      responsable = 'DAF',
      // ✅ Le défaut ne force plus 'fr-FR' : on utilise le format de date
      // neutre (JJ/MM/AAAA) déjà utilisé partout ailleurs dans le PDF
      dateGeneration = formatDate(new Date()),
      actionType = 'bilan_global',
    } = options;

    // ✅ Titre traduit selon actionType + langue
    const titresTraduits = {
      bilan_global: t('Bilan Global OMDA', 'Bilan OMDA', 'OMDA Global Report'),
      bilan_region: t('Bilan par Région', 'Bilan isaky ny Faritra', 'Report by Region'),
      bilan_paiements: t('Historique des Paiements', 'Tantaran\'ny Fandoavana', 'Payment History'),
      bilan_recettes: t('Recettes par Catégorie', 'Vola isaky ny Sokajy', 'Revenue by Category'),
      bilan_mensuel: t('Rapport Mensuel', 'Tatitra isam-bolana', 'Monthly Report'),
      bilan_stats: t('Statistiques Globales', 'Statistika ankapobeny', 'Global Statistics')
    };
    const title = titresTraduits[actionType] || titresTraduits.bilan_global;

    // ✅ Tous les libellés traduits ici, à un seul endroit
    const L = {
      responsable: t('Responsable', 'Tompon\'andraikitra', 'Manager'),
      type: t('Type', 'Karazana', 'Type'),
      annee: t('Année', 'Taona', 'Year'),
      genereLe: t('Généré le', 'Vita ny', 'Generated on'),
      page: t('Page', 'Pejy', 'Page'),
      officeNom: t(
        "Office Malagasy du Droit d'Auteur",
        "Birao Malagasy momba ny Zon'ny Mpanoratra",
        'Malagasy Copyright Office'
      ),
      footerNom: t(
        "OMDA - Office Malagasy du Droit d'Auteur",
        "OMDA - Birao Malagasy momba ny Zon'ny Mpanoratra",
        'OMDA - Malagasy Copyright Office'
      ),
    };

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 16;
    let y = margin;

    const NAVY = [26, 35, 126];
    const GREY = [90, 90, 90];
    const LIGHT_GREY = [235, 235, 235];

    // ===== BANDEAU D'EN-TÊTE =====
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`OMDA — ${title}`, margin, 13);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(L.officeNom, margin, 20);

    doc.setFontSize(9.5);
    doc.text(`${L.annee} ${annee}`, pageWidth - margin, 13, { align: 'right' });
    doc.text(`${L.genereLe} ${dateGeneration}`, pageWidth - margin, 20, { align: 'right' });

    y = 36;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${L.responsable} : ${responsable}`, margin, y);
    doc.text(`${L.type} : ${title}`, pageWidth - margin, y, { align: 'right' });
    y += 8;

    // ===== RÉSUMÉ GÉNÉRAL =====
    const totalDossiers = statsData?.totalDossiers || 0;
    const totalPaiements = statsData?.totalPaiements || 0;
    const totalMontant = statsData?.totalMontant || 0;

    const cardData = [
      { label: t('TOTAL DOSSIERS', 'TOTALY RAKITRA', 'TOTAL FILES'), value: totalDossiers.toLocaleString(numberLocale) },
      { label: t('TOTAL FACTURES', 'TOTALY FAKTIORA', 'TOTAL INVOICES'), value: totalPaiements.toLocaleString(numberLocale) },
      { label: t('MONTANT TOTAL', 'VOLA TOTAL', 'TOTAL AMOUNT'), value: `${formatMontant(totalMontant)} Ar` }
    ];

    const cardWidth = (pageWidth - margin * 2 - 8 * 2) / 3;
    const cardHeight = 22;

    cardData.forEach((card, i) => {
      const x = margin + i * (cardWidth + 8);
      doc.setDrawColor(...LIGHT_GREY);
      doc.setLineWidth(0.3);
      doc.setFillColor(248, 248, 250);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREY);
      doc.text(card.label, x + 4, y + 7);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(String(card.value), x + 4, y + 16);
    });

    y += cardHeight + 12;

    // ===== SECTION SPÉCIFIQUE =====
    switch (actionType) {
      case 'bilan_global':
        await renderBilanGlobal(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t);
        break;
      case 'bilan_region':
        await renderBilanRegion(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t);
        break;
      case 'bilan_paiements':
        await renderBilanPaiements(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t);
        break;
      case 'bilan_recettes':
        await renderBilanRecettes(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t);
        break;
      case 'bilan_mensuel':
        await renderBilanMensuel(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t, moisLabels, numberLocale);
        break;
      case 'bilan_stats':
        await renderBilanStats(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t, numberLocale);
        break;
      default:
        await renderBilanGlobal(doc, statsData, y, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t);
    }

    // ===== PIED DE PAGE =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footerY = pageHeight - 12;
      doc.setDrawColor(...LIGHT_GREY);
      doc.setLineWidth(0.2);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(L.footerNom, margin, footerY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GREY);
      doc.text(
        `${L.page} ${i} / ${pageCount}`,
        pageWidth - margin,
        footerY + 5,
        { align: 'right' }
      );
    }

    const filename = `${actionType}_omda_${annee}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    console.log(`✅ ${title} PDF généré avec succès (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur génération Bilan Global PDF:', error);
    return false;
  }
};

// ============================================================
// RENDER - Bilan Global
// ============================================================
async function renderBilanGlobal(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t) {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('RÉPARTITION PAR CATÉGORIE', 'FIZARANA ISAKY NY SOKAJY', 'DISTRIBUTION BY CATEGORY'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 62, y);
  y += 6;

  const categories = [
    { id: 'hotel', label: t('Hôtel', 'Hotely', 'Hotel') },
    { id: 'grand-surface', label: t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface') },
    { id: 'bus', label: t('Transport', 'Fitaterana', 'Transport') },
    { id: 'nightclub', label: t('Night Club', 'Club alina', 'Night Club') },
    { id: 'media', label: t('Radio / Télé', 'Radio / Tele', 'Radio / TV') },
    { id: 'occ', label: t('Occasionnel', 'Fotoana manokana', 'Occasional') }
  ];

  const categoryStats = categories.map(cat => {
    const data = statsData?.parCategorie?.[cat.id] || { total: 0, nouveaux: 0, montant: 0 };
    return { ...cat, ...data };
  });

  const totalGeneral = categoryStats.reduce((acc, c) => acc + (c.montant || 0), 0);

  const tableData = categoryStats.map(cat => {
    const pourcentage = totalGeneral > 0 ? ((cat.montant / totalGeneral) * 100).toFixed(1) : '0.0';
    return [
      cat.label,
      String(cat.total || 0),
      String(cat.nouveaux || 0),
      `${formatMontant(cat.montant)} Ar`,
      `${pourcentage} %`
    ];
  });

  tableData.push([
    t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL'),
    String(categoryStats.reduce((acc, c) => acc + (c.total || 0), 0)),
    String(categoryStats.reduce((acc, c) => acc + (c.nouveaux || 0), 0)),
    `${formatMontant(totalGeneral)} Ar`,
    '100 %'
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      t('Catégorie', 'Sokajy', 'Category'),
      t('Dossiers', 'Rakitra', 'Files'),
      t('Ce mois', 'Ity volana ity', 'This month'),
      t('Montant', 'Vola', 'Amount'),
      t('Part', 'Anjara', 'Share')
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
      textColor: [30, 30, 30]
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 48, halign: 'left' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 'auto', halign: 'right' },
      4: { cellWidth: 22, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.row.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 245];
      }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 12;

  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('DÉTAIL DES DOSSIERS ACTIFS', 'ANTSIPIRIHANY NY RAKITRA MAVITRIKA', 'ACTIVE FILES DETAILS'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 68, y);
  y += 8;

  categoryStats.forEach((cat) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.2);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 1.2, 1.2, 'FD');

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(cat.label, margin + 4, y + 8);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text(
      `${cat.total || 0} ${t('dossier(s) au total', 'rakitra amin\'ny fitambarany', 'file(s) total')}  •  ${cat.nouveaux || 0} ${t('nouveau(x) ce mois', 'vaovao ity volana ity', 'new this month')}`,
      margin + 4,
      y + 14.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.setFontSize(10.5);
    doc.text(`${formatMontant(cat.montant)} Ar`, pageWidth - margin - 4, y + 11, { align: 'right' });

    y += 24;
  });
}

// ============================================================
// RENDER - Bilan par Région
// ============================================================
async function renderBilanRegion(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t) {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('RÉPARTITION PAR RÉGION', 'FIZARANA ISAKY NY FARITRA', 'DISTRIBUTION BY REGION'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 58, y);
  y += 6;

  const regions = statsData?.parRegion || [];

  if (regions.length > 0) {
    const tableData = regions.map(region => [
      region.region || t('Non spécifié', 'Tsy voafaritra', 'Not specified'),
      String(region.total || 0),
      String(region.usagers || 0),
      `${formatMontant(region.montant)} Ar`
    ]);

    const totalRegionMontant = regions.reduce((acc, r) => acc + (r.montant || 0), 0);
    tableData.push([
      t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL'),
      String(regions.reduce((acc, r) => acc + (r.total || 0), 0)),
      String(regions.reduce((acc, r) => acc + (r.usagers || 0), 0)),
      `${formatMontant(totalRegionMontant)} Ar`
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        t('Région', 'Faritra', 'Region'),
        t('Dossiers', 'Rakitra', 'Files'),
        t('Usagers uniques', 'Mpampiasa tokana', 'Unique users'),
        t('Montant', 'Vola', 'Amount')
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        valign: 'middle',
        textColor: [30, 30, 30]
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'left' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.section === 'body' && data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 245];
        }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GREY);
    doc.text(t('Aucune donnée par région disponible', 'Tsy misy angona isaky ny faritra', 'No region data available'), margin, y);
    y += 10;
  }
}

// ============================================================
// RENDER - Bilan Paiements
// ============================================================
async function renderBilanPaiements(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t) {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('HISTORIQUE DES PAIEMENTS', 'TAHIRIN\'NY FAMBORANA VOLA', 'PAYMENT HISTORY'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 62, y);
  y += 6;

  const paiements = statsData?.paiements || [];

  if (paiements.length > 0) {
    const tableData = paiements.slice(0, 50).map(p => [
      p.reference || p.id || '-',
      p.type_paiement || 'N/A',
      formatDate(p.date_paiement) || formatDate(p.created_at) || '-',
      `${formatMontant(p.montant)} Ar`,
      p.statut || 'OK'
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        t('Référence', 'Fanondroana', 'Reference'),
        t('Type', 'Karazana', 'Type'),
        t('Date', 'Daty', 'Date'),
        t('Montant', 'Vola', 'Amount'),
        t('Statut', 'Toe-javatra', 'Status')
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        valign: 'middle',
        textColor: [30, 30, 30]
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'left' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 12;

    if (paiements.length > 50) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GREY);
      doc.text(
        `* ${t('Affichage des 50 premiers paiements sur', 'Fampisehoana ny fandoavana 50 voalohany amin\'ny', 'Showing first 50 payments out of')} ${paiements.length}`,
        margin,
        y
      );
      y += 8;
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GREY);
    doc.text(t('Aucun paiement enregistré', 'Tsy misy fandoavana voatahiry', 'No payment recorded'), margin, y);
    y += 10;
  }
}

// ============================================================
// RENDER - Bilan Recettes
// ============================================================
async function renderBilanRecettes(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t) {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('RECETTES PAR CATÉGORIE', 'VOLA VOARAY ISAKY NY SOKAJY', 'REVENUE BY CATEGORY'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 58, y);
  y += 6;

  const categories = [
    { id: 'hotel', label: `🏨 ${t('Hôtel', 'Hotely', 'Hotel')}` },
    { id: 'grand-surface', label: `🏬 ${t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface')}` },
    { id: 'bus', label: `🚌 ${t('Transport', 'Fitaterana', 'Transport')}` },
    { id: 'nightclub', label: `🎭 ${t('Night Club', 'Club alina', 'Night Club')}` },
    { id: 'media', label: `📺 ${t('Média', 'Haino aman-jery', 'Media')}` },
    { id: 'occ', label: `🎪 ${t('Occasionnel', 'Fotoana manokana', 'Occasional')}` }
  ];

  const categoryStats = categories.map(cat => {
    const data = statsData?.parCategorie?.[cat.id] || { total: 0, montant: 0 };
    return { ...cat, ...data };
  });

  const totalGeneral = categoryStats.reduce((acc, c) => acc + (c.montant || 0), 0);

  const tableData = categoryStats.map(cat => {
    const pourcentage = totalGeneral > 0 ? ((cat.montant / totalGeneral) * 100).toFixed(1) : '0.0';
    return [
      cat.label,
      `${formatMontant(cat.montant)} Ar`,
      `${pourcentage} %`
    ];
  });

  tableData.push([
    `📌 ${t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL')}`,
    `${formatMontant(totalGeneral)} Ar`,
    '100 %'
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      t('Catégorie', 'Sokajy', 'Category'),
      t('Montant', 'Vola', 'Amount'),
      t('Part', 'Anjara', 'Share')
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
      textColor: [30, 30, 30]
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 'auto', halign: 'right' },
      2: { cellWidth: 35, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.row.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 245];
      }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 12;
}

// ============================================================
// RENDER - Bilan Mensuel
// ============================================================
async function renderBilanMensuel(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t, moisLabels, numberLocale) {
  let y = startY;

  // ✅ CORRIGÉ : avant, le mois était généré avec toLocaleDateString('fr-MG', ...)
  // qui affiche en réalité le mois EN FRANÇAIS (locale "français de Madagascar"),
  // pas en malagasy. On utilise maintenant directement le tableau moisLabels
  // (les vrais noms de mois malagasy/français/anglais déjà fournis par pdfI18n).
  const maintenant0 = new Date();
  const moisActuel = `${moisLabels[maintenant0.getMonth()]} ${maintenant0.getFullYear()}`;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(
    `${t('RAPPORT MENSUEL', 'TATITRA ISAM-BOLANA', 'MONTHLY REPORT')} - ${moisActuel.toUpperCase()}`,
    margin,
    y
  );
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 70, y);
  y += 6;

  const factures = statsData?.factures || [];
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const facturesMois = factures.filter(f => {
    const date = f.created_at ? new Date(f.created_at) : null;
    return date && date >= debutMois;
  });

  const totalMois = facturesMois.length;
  const montantMois = facturesMois.reduce((acc, f) => acc + (parseFloat(f.soit_total) || 0), 0);

  // ✅ Libellés malagasy raccourcis pour tenir dans la largeur fixe des cartes
  // (ex. "SALANISA ISAKY NY RAKITRA" débordait) — mise en page inchangée
  const cardData = [
    { label: t('DOSSIERS DU MOIS', 'RAKITRA VOLANA ITY', 'FILES THIS MONTH'), value: totalMois.toLocaleString(numberLocale) },
    { label: t('MONTANT DU MOIS', 'VOLA VOLANA ITY', 'AMOUNT THIS MONTH'), value: `${formatMontant(montantMois)} Ar` },
    { label: t('MOYENNE PAR DOSSIER', 'SALANISA / RAKITRA', 'AVERAGE PER FILE'), value: totalMois > 0 ? `${formatMontant(montantMois / totalMois)} Ar` : '0 Ar' }
  ];

  const cardWidth = (pageWidth - margin * 2 - 8 * 2) / 3;
  const cardHeight = 20;

  cardData.forEach((card, i) => {
    const x = margin + i * (cardWidth + 8);
    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text(card.label, x + 4, y + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(card.value), x + 4, y + 15);
  });

  y += cardHeight + 12;

  if (facturesMois.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(t('DÉTAIL DES DOSSIERS DU MOIS', 'ANTSIPIRIHANY NY RAKITRA ITY VOLANA ITY', 'FILES DETAILS THIS MONTH'), margin, y);
    y += 3;
    doc.setDrawColor(...NAVY);
    doc.line(margin, y, margin + 58, y);
    y += 6;

    const tableData = facturesMois.slice(0, 30).map(f => [
      f.denomination || f.demandeur || '-',
      f.ref_client_type || '-',
      formatDate(f.created_at) || '-',
      `${formatMontant(f.soit_total)} Ar`
    ]);

    autoTable(doc, {
      startY: y,
      head: [[
        t('Bénéficiaire', 'Mpandray soa', 'Beneficiary'),
        t('Type', 'Karazana', 'Type'),
        t('Date', 'Daty', 'Date'),
        t('Montant', 'Vola', 'Amount')
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        valign: 'middle',
        textColor: [30, 30, 30]
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'left' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 12;

    if (facturesMois.length > 30) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GREY);
      doc.text(
        `* ${t('Affichage des 30 premiers dossiers sur', 'Fampisehoana ny rakitra 30 voalohany amin\'ny', 'Showing first 30 files out of')} ${facturesMois.length}`,
        margin,
        y
      );
      y += 8;
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GREY);
    doc.text(t('Aucun dossier pour le mois en cours', 'Tsy misy rakitra amin\'ity volana ity', 'No file for the current month'), margin, y);
    y += 10;
  }
}

// ============================================================
// RENDER - Statistiques Globales
// ============================================================
async function renderBilanStats(doc, statsData, startY, margin, pageWidth, pageHeight, NAVY, GREY, LIGHT_GREY, t, numberLocale) {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('STATISTIQUES GLOBALES', 'STATISTIKA ANKAPOBENY', 'GLOBAL STATISTICS'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 55, y);
  y += 6;

  const totalDossiers = statsData?.totalDossiers || 0;
  const totalUsagers = statsData?.totalUsagersUniques || 0;
  const totalPaiements = statsData?.totalPaiements || 0;
  const totalMontant = statsData?.totalMontant || 0;
  const totalRegions = statsData?.parRegion?.length || 0;

  const statsCards = [
    { label: t('Total Dossiers', 'Totaly Rakitra', 'Total Files'), value: totalDossiers.toLocaleString(numberLocale), icon: '📁' },
    { label: t('Usagers Uniques', 'Mpampiasa Tokana', 'Unique Users'), value: totalUsagers.toLocaleString(numberLocale), icon: '👤' },
    { label: t('Total Factures', 'Totaly Faktiora', 'Total Invoices'), value: totalPaiements.toLocaleString(numberLocale), icon: '📄' },
    { label: t('Montant Total', 'Vola Total', 'Total Amount'), value: `${formatMontant(totalMontant)} Ar`, icon: '💰' },
    { label: t('Régions', 'Faritra', 'Regions'), value: totalRegions.toLocaleString(numberLocale), icon: '🌍' },
    { label: t('Catégories', 'Sokajy', 'Categories'), value: '6', icon: '📊' }
  ];

  const cardWidth = (pageWidth - margin * 2 - 8 * 2) / 3;
  const cardHeight = 22;

  statsCards.forEach((card, i) => {
    const x = margin + (i % 3) * (cardWidth + 8);
    const rowY = y + Math.floor(i / 3) * (cardHeight + 6);

    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(x, rowY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text(`${card.icon} ${card.label}`, x + 4, rowY + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(card.value), x + 4, rowY + 17);
  });

  y += Math.ceil(statsCards.length / 3) * (cardHeight + 6) + 12;

  if (y > pageHeight - 80) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(t('DÉTAIL PAR CATÉGORIE', 'ANTSIPIRIHANY ISAKY NY SOKAJY', 'DETAIL BY CATEGORY'), margin, y);
  y += 3;
  doc.setDrawColor(...NAVY);
  doc.line(margin, y, margin + 58, y);
  y += 6;

  const categories = [
    { id: 'hotel', label: t('Hôtel', 'Hotely', 'Hotel'), emoji: '🏨' },
    { id: 'grand-surface', label: t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface'), emoji: '🏬' },
    { id: 'bus', label: t('Transport', 'Fitaterana', 'Transport'), emoji: '🚌' },
    { id: 'nightclub', label: t('Night Club', 'Club alina', 'Night Club'), emoji: '🎭' },
    { id: 'media', label: t('Média', 'Haino aman-jery', 'Media'), emoji: '📺' },
    { id: 'occ', label: t('Occasionnel', 'Fotoana manokana', 'Occasional'), emoji: '🎪' }
  ];

  const categoryStats = categories.map(cat => {
    const data = statsData?.parCategorie?.[cat.id] || { total: 0, nouveaux: 0, montant: 0 };
    return { ...cat, ...data };
  });

  const totalGeneral = categoryStats.reduce((acc, c) => acc + (c.montant || 0), 0);

  const tableData = categoryStats.map(cat => {
    const pourcentage = totalGeneral > 0 ? ((cat.montant / totalGeneral) * 100).toFixed(1) : '0.0';
    return [
      `${cat.emoji} ${cat.label}`,
      String(cat.total || 0),
      String(cat.nouveaux || 0),
      `${formatMontant(cat.montant)} Ar`,
      `${pourcentage} %`
    ];
  });

  tableData.push([
    `📌 ${t('TOTAL GÉNÉRAL', 'TOTALY ANKAPOBENY', 'GRAND TOTAL')}`,
    String(categoryStats.reduce((acc, c) => acc + (c.total || 0), 0)),
    String(categoryStats.reduce((acc, c) => acc + (c.nouveaux || 0), 0)),
    `${formatMontant(totalGeneral)} Ar`,
    '100 %'
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      t('Catégorie', 'Sokajy', 'Category'),
      t('Dossiers', 'Rakitra', 'Files'),
      t('Nouveaux', 'Vaovao', 'New'),
      t('Montant', 'Vola', 'Amount'),
      t('Part', 'Anjara', 'Share')
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
      textColor: [30, 30, 30]
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 'auto', halign: 'right' },
      4: { cellWidth: 22, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.row.section === 'body' && data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 245];
      }
    },
    margin: { left: margin, right: margin }
  });
}

export default generateBilanGlobalPDF;