// server/routes/bilan.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ============================================================
// ROUTE - Récupérer toutes les données pour le bilan global
// ============================================================
router.get('/bilan/global', async (req, res) => {
  try {
    console.log('📊 Récupération des données pour le bilan global...');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // 1. Récupérer toutes les factures
    const facturesResult = await pool.query(`
      SELECT 
        id, ref_omda, num_facture, ref_client_type, ref_usager,
        denomination, demandeur, telephone, region_usager,
        montant_mensuel, frais_dossier, montant_retard, is_retard,
        soit_total, uniter, quittance, date_ajout, created_at,
        mois_facture, annee_facture, statut
      FROM facture_usager
      ORDER BY created_at DESC
    `);
    
    const factures = facturesResult.rows;
    
    // 2. Récupérer tous les paiements
    const paiementsResult = await pool.query(`
      SELECT 
        id, usager_id, usager_type, type_paiement,
        annee, mois, montant, date_paiement,
        frais_dossier, montant_retard, est_retard,
        reference, statut, created_at
      FROM paiements
      ORDER BY created_at DESC
    `);
    
    const paiements = paiementsResult.rows;
    
    // 3. Statistiques par catégorie
    const typeMapping = {
      'HTL': 'hotel',
      'MGS': 'grand-surface',
      'RDP': 'media',
      'TRP': 'bus',
      'NGT': 'nightclub',
      'OCC': 'occ'
    };
    
    const categories = ['hotel', 'grand-surface', 'media', 'bus', 'nightclub', 'occ'];
    const categoryLabels = {
      'hotel': 'Hôtel',
      'grand-surface': 'Grande Surface',
      'media': 'Média / Radio',
      'bus': 'Transport',
      'nightclub': 'Night Club',
      'occ': 'Occasionnel'
    };
    
    const parCategorie = {};
    for (const cat of categories) {
      parCategorie[cat] = {
        total: 0,
        nouveaux: 0,
        montant: 0,
        label: categoryLabels[cat]
      };
    }
    
    for (const facture of factures) {
      const cat = typeMapping[facture.ref_client_type] || 'other';
      if (parCategorie[cat]) {
        parCategorie[cat].total += 1;
        parCategorie[cat].montant += parseFloat(facture.soit_total) || 0;
        
        const createdAt = facture.created_at ? new Date(facture.created_at) : null;
        if (createdAt) {
          const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 30) {
            parCategorie[cat].nouveaux += 1;
          }
        }
      }
    }
    
    // 4. Par région
    const regionsResult = await pool.query(`
      SELECT 
        region_usager,
        COUNT(*) as total,
        SUM(soit_total) as total_montant,
        COUNT(DISTINCT ref_usager) as usagers_uniques
      FROM facture_usager
      WHERE region_usager IS NOT NULL AND region_usager != ''
      GROUP BY region_usager
      ORDER BY region_usager
    `);
    
    const parRegion = regionsResult.rows.map(row => ({
      region: row.region_usager,
      total: parseInt(row.total) || 0,
      montant: parseFloat(row.total_montant) || 0,
      usagers: parseInt(row.usagers_uniques) || 0
    }));
    
    // 5. Par année
    const annuelResult = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date_ajout) as annee,
        COUNT(*) as total,
        SUM(soit_total) as total_montant
      FROM facture_usager
      WHERE date_ajout IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_ajout)
      ORDER BY annee DESC
    `);
    
    const parAnnee = annuelResult.rows.map(row => ({
      annee: parseInt(row.annee) || 0,
      total: parseInt(row.total) || 0,
      montant: parseFloat(row.total_montant) || 0
    }));
    
    // 6. Par région et année (pour le récapitulatif)
    const regionAnnuelResult = await pool.query(`
      SELECT 
        region_usager,
        EXTRACT(YEAR FROM date_ajout) as annee,
        COUNT(*) as total,
        SUM(soit_total) as total_montant,
        COUNT(DISTINCT ref_usager) as usagers_uniques
      FROM facture_usager
      WHERE region_usager IS NOT NULL AND region_usager != ''
      GROUP BY region_usager, EXTRACT(YEAR FROM date_ajout)
      ORDER BY region_usager, annee DESC
    `);
    
    const regionAnnuel = {};
    for (const row of regionAnnuelResult.rows) {
      const region = row.region_usager;
      if (!regionAnnuel[region]) {
        regionAnnuel[region] = {
          region: region,
          annees: []
        };
      }
      regionAnnuel[region].annees.push({
        annee: parseInt(row.annee) || 0,
        total: parseInt(row.total) || 0,
        montant: parseFloat(row.total_montant) || 0,
        usagers: parseInt(row.usagers_uniques) || 0
      });
    }
    
    const regionAnnuelArray = Object.values(regionAnnuel);
    
    // 7. Totaux généraux
    const totalDossiers = factures.length;
    const totalPaiements = paiements.length;
    const totalMontant = factures.reduce((acc, f) => acc + (parseFloat(f.soit_total) || 0), 0);
    const totalUsagersUniques = new Set(factures.map(f => f.ref_usager)).size;
    
    // 8. Récupérer les usagers par type pour les détails
    const usagersParType = {};
    const tableMapping = {
      'hotel': 'usagers_hotel',
      'grand-surface': 'usagers_magasin',
      'media': 'usagers_media',
      'bus': 'usagers_bus',
      'nightclub': 'usagers_nightclub',
      'occ': 'usagers_occasionnel'
    };
    
    for (const [cat, table] of Object.entries(tableMapping)) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
        usagersParType[cat] = result.rows;
      } catch (err) {
        console.log(`⚠️ Table ${table} non disponible:`, err.message);
        usagersParType[cat] = [];
      }
    }
    
    console.log('✅ Données du bilan global récupérées avec succès');
    
    res.json({
      success: true,
      data: {
        totalDossiers,
        totalPaiements,
        totalMontant,
        totalUsagersUniques,
        parCategorie,
        parRegion,
        parAnnee,
        usagersParType,
        regionAnnuel: regionAnnuelArray,
        factures,
        paiements,
        anneeCourante: currentYear,
        moisCourant: currentMonth,
        dateGeneration: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération bilan global:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;