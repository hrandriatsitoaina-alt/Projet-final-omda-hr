// server/routes/quitance.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

console.log('✅ Routeur quitance chargé');

// ============================================================
// 1. RÉCUPÉRER TOUTES LES QUITTANCES AVEC RÉGIONS
// ============================================================
router.get('/quitance/liste', async (req, res) => {
  try {
    console.log('📄 GET /api/quitance/liste appelée');

    // Vérifier si la table existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'facture_usager'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Table facture_usager n\'existe pas');
      return res.json({
        success: true,
        quittances: [],
        total: 0,
        message: 'Aucune quittance trouvée'
      });
    }

    // Vérifier les colonnes disponibles
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'facture_usager'
    `);
    
    const availableColumns = columnsCheck.rows.map(row => row.column_name);
    console.log('📋 Colonnes disponibles:', availableColumns);

    // Construire la requête avec les colonnes disponibles
    let selectFields = `
      id,
      quittance,
      num_facture,
      denomination,
      soit_total,
      date_ajout,
      created_at,
      statut,
      ref_client_type,
      ref_usager,
      demandeur
    `;

    // Ajouter les colonnes si elles existent
    const optionalFields = [
      'siege', 'adresse', 'telephone', 'email', 'nif', 'stat',
      'type_facture', 'mois_facture', 'annee_facture', 'montant_mensuel',
      'frais_dossier', 'montant_retard', 'is_retard', 'taux',
      'num_facture_type', 'mois_groupes', 'type_groupe',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_fonction',
      'description_personnalisee', 'personne_recu', 'activite',
      'uniter', 'suffixe', 'quittance_validee'
    ];

    // Vérifier si region_usager existe
    let hasRegion = availableColumns.includes('region_usager');
    if (hasRegion) {
      selectFields += ', region_usager';
    }

    // Ajouter les champs optionnels qui existent
    for (const field of optionalFields) {
      if (availableColumns.includes(field)) {
        selectFields += `, ${field}`;
      }
    }

    // Construire la requête complète
    const query = `
      SELECT ${selectFields}
      FROM facture_usager 
      WHERE quittance IS NOT NULL AND quittance > 0
      ORDER BY quittance ASC
    `;

    console.log('📝 Requête SQL:', query);

    const result = await pool.query(query);
    console.log(`✅ ${result.rows.length} quittances récupérées`);

    // Si region_usager n'existe pas, ajouter une valeur par défaut
    if (!hasRegion) {
      result.rows = result.rows.map(row => ({
        ...row,
        region_usager: 'N/A'
      }));
    }

    res.json({
      success: true,
      quittances: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération quittances:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des quittances',
      error: error.message
    });
  }
});

// ============================================================
// 2. RÉCUPÉRER LES QUITTANCES PAR RÉGION
// ============================================================
router.get('/quitance/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    console.log(`📄 GET /api/quitance/region/${region} appelée`);

    // Vérifier les colonnes disponibles
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'facture_usager'
    `);
    
    const availableColumns = columnsCheck.rows.map(row => row.column_name);
    const hasRegion = availableColumns.includes('region_usager');

    if (!hasRegion) {
      console.log('⚠️ Colonne region_usager n\'existe pas');
      // Si la colonne n'existe pas, retourner toutes les quittances
      const result = await pool.query(`
        SELECT 
          id,
          quittance,
          num_facture,
          denomination,
          soit_total,
          date_ajout,
          created_at,
          statut,
          ref_client_type,
          ref_usager,
          demandeur
        FROM facture_usager 
        WHERE quittance IS NOT NULL AND quittance > 0
        ORDER BY quittance ASC
      `);
      
      return res.json({
        success: true,
        quittances: result.rows.map(row => ({
          ...row,
          region_usager: 'N/A'
        })),
        total: result.rows.length,
        region: region
      });
    }

    // Construire la requête avec les colonnes disponibles
    let selectFields = `
      id,
      quittance,
      num_facture,
      denomination,
      soit_total,
      region_usager,
      date_ajout,
      created_at,
      statut,
      ref_client_type,
      ref_usager,
      demandeur
    `;

    const optionalFields = [
      'siege', 'adresse', 'telephone', 'email', 'nif', 'stat',
      'type_facture', 'mois_facture', 'annee_facture', 'montant_mensuel',
      'frais_dossier', 'montant_retard', 'is_retard', 'taux',
      'num_facture_type', 'mois_groupes', 'type_groupe',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_fonction',
      'description_personnalisee', 'personne_recu', 'activite',
      'uniter', 'suffixe', 'quittance_validee'
    ];

    for (const field of optionalFields) {
      if (availableColumns.includes(field)) {
        selectFields += `, ${field}`;
      }
    }

    const result = await pool.query(`
      SELECT ${selectFields}
      FROM facture_usager 
      WHERE quittance IS NOT NULL AND quittance > 0
      AND region_usager = $1
      ORDER BY quittance ASC
    `, [region]);

    console.log(`✅ ${result.rows.length} quittances récupérées pour la région ${region}`);

    res.json({
      success: true,
      quittances: result.rows,
      total: result.rows.length,
      region: region
    });

  } catch (error) {
    console.error('❌ Erreur récupération quittances par région:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des quittances',
      error: error.message
    });
  }
});

// ============================================================
// 3. RÉCUPÉRER LE DERNIER NUMÉRO DE QUITTANCE
// ============================================================
router.get('/quittance/last', async (req, res) => {
  try {
    console.log('📄 GET /api/quittance/last appelée');

    // Vérifier si la table existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'facture_usager'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        lastQuittance: 0,
        nextQuittance: '0000001'
      });
    }

    const result = await pool.query(`
      SELECT COALESCE(MAX(quittance), 0) as max_quittance 
      FROM facture_usager 
      WHERE quittance IS NOT NULL AND quittance > 0
    `);

    const lastNum = parseInt(result.rows[0].max_quittance) || 0;
    const nextNum = lastNum + 1;
    const nextQuittance = String(nextNum).padStart(7, '0');

    console.log(`📊 Dernier quittance: ${lastNum}, Prochain: ${nextQuittance}`);

    res.json({
      success: true,
      lastQuittance: lastNum,
      nextQuittance: nextQuittance
    });

  } catch (error) {
    console.error('❌ Erreur récupération dernière quittance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 4. RÉCUPÉRER LES STATISTIQUES DES QUITTANCES PAR RÉGION
// ============================================================
router.get('/quitance/stats', async (req, res) => {
  try {
    console.log('📄 GET /api/quitance/stats appelée');

    // Vérifier les colonnes disponibles
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'facture_usager'
    `);
    
    const availableColumns = columnsCheck.rows.map(row => row.column_name);
    const hasRegion = availableColumns.includes('region_usager');

    let query;
    if (hasRegion) {
      query = `
        SELECT 
          region_usager,
          COUNT(*) as total,
          SUM(soit_total) as total_montant,
          MIN(quittance) as premier_quittance,
          MAX(quittance) as dernier_quittance
        FROM facture_usager 
        WHERE quittance IS NOT NULL AND quittance > 0
        GROUP BY region_usager
        ORDER BY region_usager
      `;
    } else {
      // Si pas de région, faire un seul groupe
      query = `
        SELECT 
          'Toutes' as region_usager,
          COUNT(*) as total,
          SUM(soit_total) as total_montant,
          MIN(quittance) as premier_quittance,
          MAX(quittance) as dernier_quittance
        FROM facture_usager 
        WHERE quittance IS NOT NULL AND quittance > 0
      `;
    }

    const result = await pool.query(query);

    let totalGlobal = 0;
    let montantGlobal = 0;

    if (hasRegion) {
      totalGlobal = result.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
      montantGlobal = result.rows.reduce((sum, r) => sum + parseFloat(r.total_montant), 0);
    } else if (result.rows.length > 0) {
      totalGlobal = parseInt(result.rows[0].total) || 0;
      montantGlobal = parseFloat(result.rows[0].total_montant) || 0;
    }

    res.json({
      success: true,
      stats: result.rows,
      totalGlobal: totalGlobal,
      montantGlobal: montantGlobal
    });

  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 5. ROUTE DE TEST
// ============================================================
router.get('/quitance/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route quitance fonctionne correctement',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;