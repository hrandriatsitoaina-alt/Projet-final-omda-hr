// src/pages/pdf/pdfI18n.js

/**
 * ✅ Helper de traduction pour les PDF (jsPDF)
 * Utilisation : const t = createPdfT(langue);
 *               t('FR', 'MG', 'EN')
 */
 export const createPdfT = (langue = 'fr') => {
    return (fr, mg, en) => {
      if (langue === 'mg') return mg || fr;
      if (langue === 'en') return en || fr;
      return fr;
    };
  };
  
  /**
   * ✅ Mois longs pour PDF
   */
  export const getPdfMoisLabels = (langue = 'fr') => {
    if (langue === 'en') {
      return ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];
    }
    if (langue === 'mg') {
      return ['Janoary', 'Febroary', 'Martsa', 'Aprily', 'Mey', 'Jona',
              'Jolay', 'Aogositra', 'Septambra', 'Oktobra', 'Novambra', 'Desambra'];
    }
    return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  };
  
  /**
   * ✅ Mois courts pour PDF
   */
  export const getPdfMoisLabelsShort = (langue = 'fr') => {
    if (langue === 'en') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    }
    if (langue === 'mg') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des'];
    }
    return ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  };
  
  /**
   * ✅ Locale pour formatage nombres/dates
   */
  export const getPdfLocale = (langue = 'fr') => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  };
  
  /**
   * ✅ Formatage montant avec séparateur de milliers (espace)
   */
  export const formatPdfMontant = (valeur) => {
    const n = Math.round(Number(valeur) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  
  /**
   * ✅ Formatage date JJ/MM/AAAA
   */
  export const formatPdfDate = (dateString, avecSiecle = true) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const jour = String(date.getDate()).padStart(2, '0');
      const mois = String(date.getMonth() + 1).padStart(2, '0');
      const annee = avecSiecle
        ? date.getFullYear()
        : String(date.getFullYear()).slice(-2);
      return `${jour}/${mois}/${annee}`;
    } catch {
      return '';
    }
  };