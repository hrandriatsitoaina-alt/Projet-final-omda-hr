// src/pages/pdf/artiste_pdf.jsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createPdfT,
  formatPdfMontant,
  formatPdfDate,
} from './pdfI18n';

/**
 * Génère un PDF de répartition des artistes - 1 PAGE UNIQUEMENT
 * Orientation PORTRAIT
 * ✅ Gestion de langue FR / MG / EN
 * ✅ Largeurs de colonnes ÉQUILIBRÉES pour les mots longs (3 mots)
 */
export const generateArtistePDF = (evenements, options = {}) => {
  if (!evenements || evenements.length === 0) {
    console.warn('⚠️ Aucun événement à générer');
    return false;
  }

  try {
    // ✅ Langue depuis les options (transmise par la page)
    const langue = options.langue || 'fr';
    const t = createPdfT(langue);

    console.log('📄 Début génération PDF Artiste...');
    console.log('🌍 Langue :', langue);
    console.log('📊 Nombre d\'événements:', evenements.length);

    const {
      mois = '',
      annee = new Date().getFullYear(),
      responsable = '',
      lieu = 'Antananarivo',
      dateDelivre = new Date().toLocaleDateString('fr-FR'),
      dateRetour = '',
      periode = 'mensuelle'
    } = options;

    // ============================================================
    // FONCTIONS DE NETTOYAGE / FORMATAGE
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

    const extraireLieu = (event) => {
      const champs = [
        'lieu_evenement', 'lieu', 'lieuEvent',
        'adresse', 'domicile', 'region'
      ];
      for (const champ of champs) {
        const val = event[champ];
        if (val && typeof val === 'string') {
          const v = val.trim();
          if (v !== '' && v !== 'null' && v !== 'undefined' && v !== 'Non spécifié') {
            return v;
          }
        }
      }
      if (event.lieu_evenement && typeof event.lieu_evenement === 'object') {
        const keys = ['nom', 'lieu', 'adresse', 'ville', 'nom_lieu'];
        for (const k of keys) {
          const val = event.lieu_evenement[k];
          if (val && typeof val === 'string' && val.trim() !== '') {
            return val.trim();
          }
        }
      }
      return t('Non spécifié', 'Tsy voafaritra', 'Not specified');
    };

    const extraireRegion = (event) => {
      const champs = ['region', 'Region', 'REGION', 'region_usager'];
      for (const champ of champs) {
        const val = event[champ];
        if (val && typeof val === 'string') {
          const v = val.trim();
          if (v !== '' && v !== 'null' && v !== 'undefined' && v !== 'Non spécifié') {
            return v;
          }
        }
      }
      return t('Non spécifiée', 'Tsy voafaritra', 'Not specified');
    };

    const extraireOrganisateurs = (event) => {
      const champs = [
        'representant_par',
        'organisateurs',
        'denomination',
        'demandeur',
        'nom_evenement'
      ];
      for (const champ of champs) {
        const val = event[champ];
        if (val && typeof val === 'string') {
          const v = val.trim();
          if (v !== '' && v !== 'null' && v !== 'undefined' && v !== 'Non spécifié') {
            return v;
          }
        }
      }
      return '-';
    };

    // ============================================================
    // CRÉATION DU DOCUMENT
    // ============================================================
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 8;
    let y = 12;

    // ============================================================
    // EN-TÊTE
    // ============================================================
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(
      t('RÉPARTITION ARTISTES', 'FIZARANA MPANAKANTO', 'ARTISTS DISTRIBUTION'),
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const periodeText = periode === 'mensuelle'
      ? `${t('Période', 'Fe-potoana', 'Period')} : ${mois} ${annee}`
      : `${t('Période', 'Fe-potoana', 'Period')} : ${t('Année', 'Taona', 'Year')} ${annee}`;
    doc.text(periodeText, margin, y);

    const responsableText = `${t('Responsable', 'Tompon\'andraikitra', 'Manager')} : ${responsable || '_______________'}`;
    doc.text(responsableText, pageWidth - margin - doc.getTextWidth(responsableText), y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(
      `${t("Lieu de l'agence du Représentant", "Toeran'ny biraon'ny mpisolo tena", "Representative's agency location")} : ${lieu || '_______________'}`,
      margin,
      y
    );
    y += 6;

    doc.text(`${t('Date de délivrance', 'Daty nanomezana', 'Issue date')} : ${dateDelivre}`, margin, y);

    const dateRetourText = `${t('Date de retour', 'Daty famerenana', 'Return date')} : ${dateRetour || '_______________'}`;
    doc.text(dateRetourText, pageWidth - margin - doc.getTextWidth(dateRetourText), y);
    y += 7;

    // ============================================================
    // TABLEAU — Colonnes ÉQUILIBRÉES pour FR / MG / EN
    // ============================================================
    const tableHeaders = [
      'N',
      t('ORGANISATEURS', 'MPIKARAKARA', 'ORGANIZERS'),
      t('LIEU', 'TOERANA', 'LOCATION'),
      t('RÉGION', 'FARITRA', 'REGION'),
      t('DATE', 'DATY', 'DATE'),
      t('ARTISTES', 'MPANAKANTO', 'ARTISTS'),
      t('MONTANT', 'VOLA', 'AMOUNT'),
    ];

    const tableData = evenements.map((e, index) => {
      const num = index + 1;
      const organisateurs = extraireOrganisateurs(e);
      const lieuEvent = extraireLieu(e);
      const regionEvent = extraireRegion(e);
      const dateFormatted = formatPdfDate(e.date_event, false);
      const artistes = e.artistesString || t('Aucun artiste', 'Tsy misy mpanakanto', 'No artist');
      const montantFormatted = formatPdfMontant(e.montant);

      return [
        String(num),
        organisateurs,
        lieuEvent,
        regionEvent,
        dateFormatted,
        artistes,
        `${montantFormatted} Ar`
      ];
    });

    // ✅ Police adaptative
    let fontSize = 10;
    let cellPadding = 3;

    if (tableData.length > 12) {
      fontSize = 9.5;
      cellPadding = 2.8;
    }
    if (tableData.length > 16) {
      fontSize = 9;
      cellPadding = 2.5;
    }
    if (tableData.length > 20) {
      fontSize = 9;
      cellPadding = 2.2;
    }

    // ✅ Largeurs ÉQUILIBRÉES (total ≈ 194 mm utiles sur A4 portrait)
    //    A4 = 210 mm, marges = 8+8 = 16 → 194 mm utiles
    //    Somme : 8 + 40 + 28 + 26 + 20 + 44 + 28 = 194 mm
    autoTable(doc, {
      startY: y,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: fontSize,
        cellPadding: cellPadding,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        valign: 'middle',
        textColor: [0, 0, 0],
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontSize: fontSize - 0.5,  // ✅ En-têtes légèrement plus petits
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: cellPadding
      },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },   // N
        1: { cellWidth: 40, halign: 'left' },     // ORGANISATEURS
        2: { cellWidth: 28, halign: 'left' },     // LIEU
        3: { cellWidth: 26, halign: 'left' },     // RÉGION
        4: { cellWidth: 20, halign: 'center' },   // DATE
        5: { cellWidth: 44, halign: 'left' },     // ARTISTES
        6: { cellWidth: 28, halign: 'right' }     // MONTANT
      },
      // ✅ Réduire la police des colonnes denses (ORGANISATEURS, LIEU, RÉGION, ARTISTES)
      didParseCell: function (data) {
        if (data.section === 'body') {
          const idx = data.column.index;
          // Colonnes texte longues → police -0.5pt pour éviter débordement
          if (idx === 1 || idx === 2 || idx === 3 || idx === 5) {
            data.cell.styles.fontSize = fontSize - 0.5;
          }
          // RÉGION encore plus petite car souvent longue
          if (idx === 3) {
            data.cell.styles.fontSize = fontSize - 1;
          }
        }
      },
      margin: { left: margin, right: margin },
      pageBreak: 'avoid'
    });

    // ============================================================
    // PIED DE PAGE
    // ============================================================
    const finalY = doc.lastAutoTable.finalY + 4;
    y = finalY;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    const totalItems = evenements.length;
    const eventsLabel = totalItems > 1
      ? t('événements', 'hetsika', 'events')
      : t('événement', 'hetsika', 'event');
    doc.text(`${totalItems} ${eventsLabel}`, margin, y);

    const totalArtistes = evenements.reduce((sum, e) => sum + (e.artistesCount || 0), 0);
    doc.text(
      `${t('Total artistes', 'Totalin\'ny mpanakanto', 'Total artists')} : ${totalArtistes}`,
      pageWidth / 2 - 15,
      y
    );

    const totalMontantBrut = evenements.reduce(
      (sum, e) => sum + nettoyerMontant(e.montant),
      0
    );
    const totalMontantFormatted = formatPdfMontant(totalMontantBrut);
    doc.text(
      `${t('Total', 'Totaly', 'Total')} : ${totalMontantFormatted} Ar`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );

    // ============================================================
    // SAUVEGARDE
    // ============================================================
    const periodeSlug = periode === 'mensuelle'
      ? `${mois}_${annee}`
      : `annee_${annee}`;
    const filename = `repartition_artistes_${periodeSlug}_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(filename);

    console.log(`✅ PDF Artiste généré avec ${totalItems} événements (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur génération PDF Artiste:', error);
    console.error('❌ Stack:', error.stack);
    return false;
  }
};

export default generateArtistePDF;