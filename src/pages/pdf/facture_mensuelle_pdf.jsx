// src/pages/pdf/facture_mensuelle_pdf.jsx
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  createPdfT,
  getPdfLocale,
  getPdfMoisLabels,
} from './pdfI18n';

// ============================================================
// ✅ NOM OFFICIEL FIXE (identique dans les 3 langues)
// ============================================================
const OMDA_NOM_FIXE = "Office Malagasy des Droits d'Auteur";

// ✅ Noms propres institutionnels FIXES (jamais traduits)
const NOMS_FIXES = {
  OMDA_NOM_COURT: 'OMDA',
  ADRESSE_LIGNE: 'Antananarivo, Madagascar',
  TEL_LIGNE: 'Tél: +261 34 05 533 70',
  EMAIL_LIGNE: 'Email: contact@omda.mg',
};

// ✅ Formatage quittance sur 7 chiffres
const formatQuittance = (num) => {
  if (!num) return '0000000';
  const str = String(num).replace(/\D/g, '');
  return str.padStart(7, '0');
};

// ✅ Secours : lit la langue stockée par ParametreContext
const lireLangueDepuisStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const l = window.localStorage.getItem('app-langue');
    return ['fr', 'mg', 'en'].includes(l) ? l : null;
  } catch {
    return null;
  }
};

// ✅ Fonction principale
export const generateFactureMensuellePDF = (facture, showPreview = false, options = {}) => {
  try {
    if (!facture) {
      console.error('❌ Aucune facture fournie');
      return false;
    }

    // ✅ Langue : priorité à options.langue, sinon localStorage, sinon 'fr'
    const langue = options.langue || lireLangueDepuisStorage() || 'fr';
    const t = createPdfT(langue);
    const locale = getPdfLocale(langue);
    const moisLabels = getPdfMoisLabels(langue);

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 20;
    let y = margin;

    // ========== EN-TÊTE ==========
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text(NOMS_FIXES.OMDA_NOM_COURT, margin, y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);

    // ✅ Nom officiel OMDA — FIXE (identique dans les 3 langues)
    doc.text(OMDA_NOM_FIXE, margin, y + 6);

    y += 12;
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(NOMS_FIXES.ADRESSE_LIGNE, margin, y);
    doc.text(NOMS_FIXES.TEL_LIGNE, margin, y + 4);
    doc.text(NOMS_FIXES.EMAIL_LIGNE, margin, y + 8);

    y += 14;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // ========== RÉFÉRENCES ==========
    const refOmda = facture.ref_omda || '0000';
    const numFacture = facture.num_facture || '0000';
    const refClient = facture.ref_client_type || 'HTL';

    let numFactureDisplay = numFacture;
    if (facture.num_facture_type === 'B' && facture.suffixe) {
      numFactureDisplay = `${numFacture}-${facture.suffixe}`;
    }

    const refClientDisplay = facture.ref_client_type
      ? `${facture.ref_client_type} / ${String(facture.ref_usager || 0).padStart(3, '0')}`
      : `${refClient} / 000`;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);

    const rightMargin = pageWidth - margin;
    const refText = `${t('Réf', 'Fanondroana', 'Ref')} : ${String(refOmda).padStart(4, '0')} / ${numFactureDisplay} / OMDA`;
    doc.text(refText, rightMargin - doc.getTextWidth(refText), y);

    y += 6;

    const factureText = `${t('FACTURE', 'FAKTIORA', 'INVOICE')} n° ${String(refOmda).padStart(4, '0')} / ${numFactureDisplay} / DAFC`;
    doc.text(factureText, rightMargin - doc.getTextWidth(factureText), y);

    y += 6;

    const clientText = `${t('Réf. Client', 'Fanondroana Mpanjifa', 'Client Ref')} : ${refClientDisplay}`;
    doc.text(clientText, rightMargin - doc.getTextWidth(clientText), y);

    y += 10;

    // ========== INFORMATIONS FACTURE ==========
    const description = facture.description_personnalisee || t('Renouvellement', 'Fanavaozana', 'Renewal');

    let moisText = '';
    if (facture.mois_groupes) {
      const moisList = facture.mois_groupes.split(',').map(Number);
      const moisNoms = moisList.map(m => moisLabels[m - 1]);
      moisText = moisNoms.join(', ');
    } else if (facture.mois_facture) {
      moisText = moisLabels[facture.mois_facture - 1];
    }

    const anneeText = facture.annee_facture || new Date().getFullYear();

    const datePaiement = facture.a_compter_du
      ? new Date(facture.a_compter_du).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const infoLines = [
      { label: t('Description', 'Fanazavana', 'Description'), value: description },
      { label: t('Période', 'Fe-potoana', 'Period'), value: `${moisText} ${anneeText}` },
      { label: t('Date de paiement', 'Daty nandoavana', 'Payment date'), value: datePaiement },
      { label: t('Quittance', 'Taratasy', 'Receipt'), value: formatQuittance(facture.quittance) }
    ];

    for (const info of infoLines) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${info.label} :`, margin, y);
      doc.setFont('helvetica', 'normal');
      const x = margin + 45;
      doc.text(info.value, x, y);
      y += 6;
    }

    y += 4;

    // ========== TABLEAU DES MONTANTS ==========
    const montantMensuel = parseFloat(facture.montant_mensuel) || 0;
    const uniter = parseInt(facture.uniter) || 1;
    const montantRetard = parseFloat(facture.montant_retard) || 0;
    const isRetard = facture.is_retard || false;

    let nombreMois = 1;
    if (facture.mois_groupes) {
      nombreMois = facture.mois_groupes.split(',').length;
    }

    const sousTotal = montantMensuel * uniter * nombreMois;
    const total = sousTotal + (isRetard ? montantRetard : 0);

    // Tableau
    const tableData = [
      [
        t('Désignation', 'Fanazavana', 'Description'),
        t('Quantité', 'Isan\'ny', 'Quantity'),
        `PU (Ar)`,
        `${t('Total', 'Totaly', 'Total')}`
      ],
      [
        `${t('Mensualité', 'Fandoavana isam-bolana', 'Monthly')} ${description}`,
        `${nombreMois} ${t('mois', 'volana', 'months')}`,
        (montantMensuel * uniter).toLocaleString(locale),
        sousTotal.toLocaleString(locale)
      ]
    ];

    if (isRetard && montantRetard > 0) {
      tableData.push([
        t('Pénalité de retard', 'Sazy noho ny fahatarana', 'Late penalty'),
        '1',
        montantRetard.toLocaleString(locale),
        montantRetard.toLocaleString(locale)
      ]);
    }

    doc.autoTable({
      startY: y,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [40, 167, 69],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 70, halign: 'left' },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 8;

    // ========== TOTAL ==========
    doc.setDrawColor(40, 167, 69);
    doc.setFillColor(40, 167, 69);
    doc.rect(margin + 120, y - 2, pageWidth - margin - 120 - margin, 10, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(t('TOTAL À PAYER', 'VOLA HALOA', 'TOTAL TO PAY'), margin + 125, y + 6);

    doc.setFontSize(12);
    doc.text(
      `${total.toLocaleString(locale)} Ar`,
      pageWidth - margin - 10 - doc.getTextWidth(`${total.toLocaleString(locale)} Ar`),
      y + 6
    );

    y += 14;

    // ========== DÉTAIL ==========
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    let detailText = `${t('Détail', 'Antsipiriany', 'Details')} : ${montantMensuel.toLocaleString(locale)} Ar × ${uniter} × ${nombreMois} ${t('mois', 'volana', 'months')}`;
    if (isRetard && montantRetard > 0) {
      detailText += ` + ${montantRetard.toLocaleString(locale)} Ar (${t('retard', 'tara', 'late')})`;
    }
    doc.text(detailText, margin, y);

    y += 6;
    doc.text(`${t('Net à payer', 'Vola haloa', 'Net to pay')} :`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${total.toLocaleString(locale)} Ar`, margin + 40, y);
    doc.setFont('helvetica', 'normal');

    y += 10;

    // ========== PIED DE PAGE ==========
    const dafName = facture.daf_nom || t('Directeur Financier', 'Talen\'ny fitantanam-bola', 'Chief Financial Officer');

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    doc.text(`${t('Signature du client', 'Sonia mpanjifa', 'Client signature')} :`, margin, y);
    doc.text('_________________________', margin, y + 6);

    doc.text(`${t('Signature du DAF', 'Sonia DAF', 'CFO signature')} :`, pageWidth - margin - 50, y);
    doc.text('_________________________', pageWidth - margin - 50, y + 6);

    doc.text(dafName, pageWidth - margin - 50 - doc.getTextWidth(dafName) / 2, y + 12);

    y += 20;

    // ========== MENTIONS LÉGALES ==========
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      t(
        'Merci de votre confiance. Paiement à effectuer sous 30 jours.',
        'Misaotra amin\'ny fitokisana. Fandoavana ao anatin\'ny 30 andro.',
        'Thank you for your trust. Payment within 30 days.'
      ),
      margin,
      pageHeight - 15
    );
    doc.text(
      t(
        'Toute contestation doit être formulée par écrit dans les 15 jours suivant la réception de la facture.',
        'Ny fanohitra rehetra dia tsy maintsy atao an-tsoratra ao anatin\'ny 15 andro aorian\'ny fandraisana ny faktiora.',
        'Any dispute must be made in writing within 15 days of receiving the invoice.'
      ),
      margin,
      pageHeight - 10
    );

    // ========== OUVERTURE / SAUVEGARDE ==========
    if (showPreview) {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const filename = `Facture_${facture.num_facture || '0000'}_${facture.ref_client_type || 'HTL'}.pdf`;
      doc.save(filename);
    }

    console.log(`✅ PDF Facture Mensuelle généré (langue: ${langue})`);
    return true;
  } catch (error) {
    console.error('❌ Erreur génération PDF mensuel:', error);
    return false;
  }
};

export default generateFactureMensuellePDF;