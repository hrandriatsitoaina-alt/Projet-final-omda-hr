// server/routes/verification.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// ROUTE - Récupérer tous les préfixes disponibles (depuis utilisateurs)
// ============================================================
router.get('/verification/prefixes', async (req, res) => {
  try {
    console.log('📋 Récupération des préfixes (utilisateurs)...');
    
    // ✅ Priorité : table `utilisateurs` (vrais préfixes des utilisateurs)
    const result = await pool.query(`
      SELECT 
        UPPER(prefix) as prefixe,
        nom
      FROM omda_app.utilisateurs
      WHERE prefix IS NOT NULL 
        AND prefix != ''
      ORDER BY prefix
    `);
    
    const prefixes = result.rows
      .map(row => row.prefixe)
      .filter(p => p && p.length > 0);
    
    console.log(`✅ ${prefixes.length} préfixes trouvés:`, prefixes);
    
    res.json({
      success: true,
      prefixes: prefixes
    });
  } catch (error) {
    console.error('❌ Erreur récupération préfixes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      prefixes: []
    });
  }
});

// ============================================================
// ✅ ROUTE CORRIGÉE - Détails des préfixes avec NOM UTILISATEUR
// Renvoie : { "AND": "ANDRIANINA", "FIT": "FITAHIANTSOA", ... }
// ============================================================
router.get('/verification/prefixes-details', async (req, res) => {
  try {
    console.log('📋 Récupération des détails des préfixes (depuis utilisateurs)...');
    
    // ✅ On lit UNIQUEMENT depuis `utilisateurs` pour avoir le NOM DE L'UTILISATEUR
    const result = await pool.query(`
      SELECT 
        UPPER(prefix) as prefixe,
        nom
      FROM omda_app.utilisateurs
      WHERE prefix IS NOT NULL 
        AND prefix != ''
        AND nom IS NOT NULL
        AND nom != ''
      ORDER BY prefix
    `);
    
    const prefixeDetails = {};
    
    for (const row of result.rows) {
      const prefixe = (row.prefixe || '').trim();
      const nom = (row.nom || '').trim();
      if (prefixe && nom) {
        // ✅ Le préfixe pointe vers le NOM DE L'UTILISATEUR
        prefixeDetails[prefixe] = nom.toUpperCase();
      }
    }
    
    console.log(`✅ ${Object.keys(prefixeDetails).length} préfixes avec noms:`);
    Object.entries(prefixeDetails).forEach(([k, v]) => {
      console.log(`   ${k} → ${v}`);
    });
    
    res.json({
      success: true,
      prefixes: prefixeDetails
    });
  } catch (error) {
    console.error('❌ Erreur récupération détails préfixes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      prefixes: {}
    });
  }
});

// ============================================================
// ROUTE - Récupérer les années disponibles
// ============================================================
router.get('/verification/annees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        EXTRACT(YEAR FROM created_at) as annee
      FROM facture_usager
      WHERE created_at IS NOT NULL
      ORDER BY annee DESC
    `);
    
    const annees = result.rows.map(row => parseInt(row.annee));
    
    res.json({
      success: true,
      annees: annees
    });
  } catch (error) {
    console.error('❌ Erreur récupération années:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      annees: []
    });
  }
});

// ============================================================
// ✅ ROUTE - Récupérer tous les usagers avec TOUS les champs
// (dénomination, organisateurs, genre, lieu, CIN, signature, etc.)
// ============================================================
router.get('/verification/usagers', async (req, res) => {
  try {
    console.log('📋 Récupération de tous les usagers pour vérification...');
    
    const result = await pool.query(`
      SELECT 
        f.id,
        f.ref_omda,
        f.num_facture,
        f.num_facture_type,
        f.ref_client_type,
        f.ref_usager,
        f.type_facture,
        f.region_usager,
        f.date_ajout,
        f.denomination,
        f.demandeur,
        f.telephone,
        f.email,
        f.adresse,
        f.representant_nom,
        f.representant_adresse,
        f.representant_tel,
        f.representant_cin,
        f.representant_cin_delivree,
        f.representant_cin_lieu,
        f.representant_fonction,
        f.representant_par,
        f.organisateurs,
        f.genre_manifestation,
        f.artistes,
        f.date_evenement,
        f.lieu_evenement,
        f.domicile,
        f.lieu_ajout,
        f.date_signature,
        f.confirmation_nom,
        f.personne_recu,
        f.quittance,
        f.quittance_validee,
        f.montant_mensuel,
        f.frais_dossier,
        f.montant_retard,
        f.is_retard,
        f.soit_total,
        f.uniter,
        f.numero_dossier_utilisateur,
        f.numero_dossier_global,
        f.statut,
        f.mois_facture,
        f.annee_facture,
        f.created_at,
        f.created_by,
        f.mois_groupes,
        f.type_groupe,
        u.nom as createur_nom
      FROM facture_usager f
      LEFT JOIN utilisateurs u ON f.created_by = u.id
      ORDER BY f.created_at DESC
    `);
    
    const usagers = result.rows.map(row => ({
      ...row,
      numero_dossier: row.numero_dossier_utilisateur || row.numero_dossier_global || '',
      prefixe: row.numero_dossier_utilisateur ? 
        row.numero_dossier_utilisateur.match(/^[A-Z]+/)?.[0] || '' : '',
      numero: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\d+/)?.[0]) || 0 : 0,
      semestre: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\/(\d+)\//)?.[1]) || 0 : 0,
      annee: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\/(\d{4})$/)?.[1]) || 0 : 0
    }));
    
    console.log(`✅ ${usagers.length} usagers trouvés`);
    
    res.json({
      success: true,
      usagers: usagers,
      total: usagers.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération usagers:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      usagers: []
    });
  }
});

// ============================================================
// ROUTE - Rechercher un usager par numéro de dossier
// ============================================================
router.get('/verification/recherche', async (req, res) => {
  const { prefixe, numero, semestre, annee } = req.query;
  
  console.log(`🔍 Recherche: ${prefixe} ${numero}/${semestre}/${annee}`);
  
  try {
    const dossierComplet = `${prefixe} ${numero}/${semestre}/${annee}`;
    
    const result = await pool.query(`
      SELECT 
        f.id, f.ref_omda, f.num_facture, f.num_facture_type, f.ref_client_type,
        f.ref_usager, f.type_facture, f.region_usager, f.date_ajout,
        f.denomination, f.demandeur, f.telephone, f.email, f.adresse,
        f.representant_nom, f.representant_adresse, f.representant_tel,
        f.representant_cin, f.representant_cin_delivree, f.representant_cin_lieu,
        f.representant_fonction, f.representant_par, f.organisateurs,
        f.genre_manifestation, f.artistes, f.date_evenement, f.lieu_evenement,
        f.domicile, f.lieu_ajout, f.date_signature, f.confirmation_nom,
        f.personne_recu, f.quittance, f.quittance_validee,
        f.montant_mensuel, f.frais_dossier, f.montant_retard, f.is_retard,
        f.soit_total, f.uniter, f.numero_dossier_utilisateur,
        f.numero_dossier_global, f.statut, f.mois_facture, f.annee_facture,
        f.created_at, f.created_by, f.mois_groupes, f.type_groupe,
        u.nom as createur_nom
      FROM facture_usager f
      LEFT JOIN utilisateurs u ON f.created_by = u.id
      WHERE f.numero_dossier_utilisateur = $1
         OR f.numero_dossier_global = $1
      ORDER BY f.created_at DESC
    `, [dossierComplet]);
    
    const usagers = result.rows.map(row => ({
      ...row,
      numero_dossier: row.numero_dossier_utilisateur || row.numero_dossier_global || '',
      prefixe: row.numero_dossier_utilisateur ? 
        row.numero_dossier_utilisateur.match(/^[A-Z]+/)?.[0] || '' : '',
      numero: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\d+/)?.[0]) || 0 : 0,
      semestre: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\/(\d+)\//)?.[1]) || 0 : 0,
      annee: row.numero_dossier_utilisateur ?
        parseInt(row.numero_dossier_utilisateur.match(/\/(\d{4})$/)?.[1]) || 0 : 0
    }));
    
    console.log(`✅ ${usagers.length} usagers trouvés pour le dossier ${dossierComplet}`);
    
    res.json({
      success: true,
      usagers: usagers,
      total: usagers.length,
      dossierRecherche: dossierComplet
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      usagers: []
    });
  }
});

// ============================================================
// ROUTE - Suggestions de préfixes en temps réel (depuis utilisateurs)
// ============================================================
router.get('/verification/suggestions/prefixes', async (req, res) => {
  const { search } = req.query;
  
  if (!search || search.length < 1) {
    return res.json({
      success: true,
      suggestions: []
    });
  }
  
  try {
    // ✅ Chercher dans `utilisateurs` (vrais préfixes)
    const result = await pool.query(`
      SELECT DISTINCT 
        UPPER(prefix) as prefixe
      FROM omda_app.utilisateurs 
      WHERE prefix IS NOT NULL 
        AND prefix != ''
        AND UPPER(prefix) ILIKE $1
      ORDER BY prefixe
      LIMIT 10
    `, [`${search.toUpperCase()}%`]);
    
    const suggestions = result.rows.map(row => row.prefixe).filter(p => p);
    
    res.json({
      success: true,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('❌ Erreur suggestions:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      suggestions: []
    });
  }
});

// ============================================================
// ROUTE - Obtenir les détails d'un usager spécifique
// ============================================================
router.get('/verification/usager/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        f.*,
        u.nom as createur_nom
      FROM facture_usager f
      LEFT JOIN utilisateurs u ON f.created_by = u.id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usager non trouvé'
      });
    }
    
    const usager = result.rows[0];
    usager.numero_dossier = usager.numero_dossier_utilisateur || usager.numero_dossier_global || '';
    
    res.json({
      success: true,
      usager: usager
    });
  } catch (error) {
    console.error('❌ Erreur récupération usager:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;