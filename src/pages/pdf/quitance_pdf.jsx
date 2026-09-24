// src/pages/pdf/quitance_pdf.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  createPdfT,
  getPdfLocale,
} from './pdfI18n';

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

/**
 * Génère un PDF de suivi des quittances - 1 PAGE UNIQUEMENT
 * Style simple et épuré - Orientation PORTRAIT
 * ✅ Gestion de langue FR / MG / EN
 */
export const generateQuitancePDF = (quittances, options = {}) => {
  if (!quittances || quittances.length === 0) {
    console.warn('⚠️ Aucune quittance à générer');
    return false;
  }

  try {
    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);
    const locale = getPdfLocale(langue);

    console.log('📄 Début génération PDF Quittance...');
    console.log('🌍 Langue :', langue);
    console.log('📊 Nombre de quittances:', quittances.length);

    const {
      carnetDebut = '0000000',
      carnetFin = '0000000',
      responsable = '',
      lieu = 'Antananarivo',
      region = t('Toutes les régions', 'Ny faritra rehetra', 'All regions'),
      dateDelivre = new Date().toLocaleDateString(locale),
      dateRetour = ''
    } = options;

    // ============================================================
    // FONCTIONS DE NETTOYAGE / FORMATAGE DES MONTANTS
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

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    let y = margin;

    // ============================================================
    // EN-TÊTE
    // ============================================================
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(
      t('SUIVI QUITTANCE', 'FANARAHA-MASO TARATASY', 'RECEIPT TRACKING'),
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 9;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(
      `${t('N° de carnet', 'Laharana carnet', 'Booklet N°')} : ${carnetDebut} ${t('à', 'ka hatramin\'ny', 'to')} ${carnetFin}`,
      margin,
      y
    );

    const responsableText = `${t('Responsable', 'Tompon\'andraikitra', 'Manager')} : ${responsable || '_______________'}`;
    doc.text(responsableText, pageWidth - margin - doc.getTextWidth(responsableText), y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(
      `${t("Lieu de l'agence du Représentant", 'Toeran\'ny biraon\'ny mpisolo tena', "Representative's agency location")} : ${lieu || '_______________'}`,
      margin,
      y
    );
    y += 8;

    doc.text(`${t('Date de délivrance', 'Daty nanomezana', 'Issue date')} : ${dateDelivre}`, margin, y);

    const dateRetourText = `${t('Date de retour', 'Daty famerenana', 'Return date')} : ${dateRetour || '_______________'}`;
    doc.text(dateRetourText, pageWidth - margin - doc.getTextWidth(dateRetourText), y);
    y += 10;

    // ============================================================
    // TABLEAU
    // ============================================================
    const typeLabels = {
      'HTL': t('Hôtel', 'Hotely', 'Hotel'),
      'MGS': t('Grande Surface', 'Fivarotana lehibe', 'Grand Surface'),
      'RDP': t('Radio/Télé', 'Radio/Tele', 'Radio/TV'),
      'TRP': t('Transport', 'Fitaterana', 'Transport'),
      'NGT': t('Night Club', 'Club alina', 'Night Club'),
      'OCC': t('Occasionnel', 'Fotoana manokana', 'Occasional'),
      'OTH': t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')
    };

    const tableHeaders = [
      t('N° QUITTANCE', 'N° TARATASY', 'N° RECEIPT'),
      t('TYPE', 'KARAZANA', 'TYPE'),
      t('CLIENT', 'MPANJIFA', 'CLIENT'),
      t('MONTANT', 'VOLA', 'AMOUNT'),
      t('OBS', 'FANAMARIHANA', 'OBS')
    ];

    const tableData = quittances.map((q, index) => {
      const numGlobal = index + 1;
      const typeLabel = typeLabels[q.ref_client_type] || q.ref_client_type || '-';

      const montantFormatted = formatMontant(q.soit_total);

      let clientInfo = q.denomination || q.demandeur || '-';
      if (q.denomination && q.siege) {
        clientInfo += `, ${q.siege}`;
      }

      let obs = '';
      if (q.region_usager && q.region_usager !== 'N/A') {
        obs += `${t('Région', 'Faritra', 'Region')}: ${q.region_usager}`;
      }
      if (!obs) obs = t('Aucune', 'Tsy misy', 'None');

      return [
        String(q.quittance || numGlobal).padStart(7, '0'),
        typeLabel,
        clientInfo,
        `${montantFormatted} Ar`,
        obs
      ];
    });

    let fontSize = 11;
    let cellPadding = 4;

    if (tableData.length > 12) {
      fontSize = 10;
      cellPadding = 3.5;
    }
    if (tableData.length > 16) {
      fontSize = 9;
      cellPadding = 3;
    }
    if (tableData.length > 20) {
      fontSize = 8.5;
      cellPadding = 2.5;
    }

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
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontSize: fontSize + 1,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'left' }
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

    const totalItems = quittances.length;
    const itemLabel = totalItems > 1
      ? t('quittances', 'taratasy', 'receipts')
      : t('quittance', 'taratasy', 'receipt');
    doc.text(`${totalItems} ${itemLabel}`, margin, y);

    const totalMontantBrut = quittances.reduce(
      (sum, q) => sum + nettoyerMontant(q.soit_total),
      0
    );
    const totalMontantFormatted = formatMontant(totalMontantBrut);
    doc.text(
      `${t('Total', 'Totaly', 'Total')} : ${totalMontantFormatted} Ar`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );

    // ============================================================
    // SAUVEGARDE
    // ============================================================
    const regionSlug = region
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    const filename = `suivi_quittance_${regionSlug}_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(filename);

    console.log(`✅ PDF Quittance généré avec ${totalItems} quittances (langue: ${langue})`);
    return true;

  } catch (error) {
    console.error('❌ Erreur génération PDF Quittance:', error);
    console.error('❌ Stack:', error.stack);
    return false;
  }
};

export default generateQuitancePDF;