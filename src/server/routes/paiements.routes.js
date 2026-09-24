// server/routes/paiements.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// GET - Paiements d'un usager
// ============================================================
router.get('/paiements/usager/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    console.log(`📊 Récupération des paiements pour usager ${id} (${type})`);

    const result = await pool.query(
      `SELECT * FROM omda_app.paiements 
       WHERE usager_id = $1 AND usager_type = $2 AND statut = 'paye'
       ORDER BY annee DESC, mois DESC`,
      [id, type]
    );

    res.json({
      success: true,
      paiements: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur récupération paiements usager:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      paiements: []
    });
  }
});

// ============================================================
// POST - Enregistrer un paiement
// ============================================================
router.post('/paiements/enregistrer', async (req, res) => {
  console.log('🔥 ROUTE /paiements/enregistrer appelée');
  console.log('📦 Body reçu:', req.body);

  const {
    usagerId,
    usagerType,
    type_paiement,
    montant,
    date_paiement,
    frais_dossier,
    montant_retard,
    est_retard,
    annee,
    mois,
    mois_payes,
    nombre_mois,
    reference,
    statut
  } = req.body;

  if (!usagerId || !montant) {
    return res.status(400).json({ success: false, message: 'usagerId et montant requis' });
  }

  try {
    const typePaiement = type_paiement || (usagerType === 'occ' ? 'unique' : 'mensuel');
    console.log(`📝 Type paiement: ${typePaiement}, usagerType: ${usagerType}`);

    if (usagerType === 'occ' || typePaiement === 'unique') {
      const result = await pool.query(
        `INSERT INTO omda_app.paiements 
         (usager_id, usager_type, type_paiement, montant, date_paiement, statut, frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          usagerId,
          usagerType || 'hotel',
          'unique',
          montant,
          date_paiement || new Date().toISOString().split('T')[0],
          statut || 'paye',
          frais_dossier || 0,
          montant_retard || 0,
          est_retard || false,
          reference || null,
          1,
          null
        ]
      );

      console.log('✅ Paiement unique enregistré, ID:', result.rows[0].id);
      return res.json({
        success: true,
        message: 'Paiement unique enregistré avec succès',
        id: result.rows[0].id
      });
    }

    let anneeFinale = annee || new Date().getFullYear();
    let moisFinal = mois || new Date().getMonth() + 1;
    let moisList = [];

    if (mois_payes && Array.isArray(mois_payes) && mois_payes.length > 0) {
      moisList = mois_payes;
      moisFinal = mois_payes[0];
    } else {
      moisList = [moisFinal];
    }

    const nombreMois = nombre_mois || moisList.length;

    console.log(`📝 Enregistrement mensuel :`);
    console.log(`   → annee = ${anneeFinale}`);
    console.log(`   → mois_payes = [${moisList.join(', ')}]`);
    console.log(`   → nombre_mois = ${nombreMois}`);
    console.log(`   → montant = ${montant}`);
    console.log(`   → frais_dossier = ${frais_dossier}`);

    if (moisList.length > 0) {
      const checkResult = await pool.query(
        `SELECT id, mois FROM omda_app.paiements 
         WHERE usager_id = $1 AND usager_type = $2 
           AND annee = $3
           AND statut = 'paye'
           AND mois IN (${moisList.map((_, i) => `$${i + 4}`).join(', ')})`,
        [usagerId, usagerType || 'hotel', anneeFinale, ...moisList]
      );

      if (checkResult.rows.length > 0) {
        const moisDejaPayes = checkResult.rows.map(r => r.mois).join(', ');
        console.log(`⚠️ Paiement déjà existant pour mois ${moisDejaPayes}/${anneeFinale}`);
        return res.json({
          success: true,
          message: `Paiement déjà enregistré pour le(s) mois : ${moisDejaPayes}`,
          id: checkResult.rows[0].id,
          dejaExistant: true
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO omda_app.paiements 
       (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, statut, frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        usagerId,
        usagerType || 'hotel',
        'mensuel',
        anneeFinale,
        moisFinal,
        montant,
        date_paiement || new Date().toISOString().split('T')[0],
        statut || 'paye',
        frais_dossier || 0,
        montant_retard || 0,
        est_retard || false,
        reference || null,
        nombreMois,
        JSON.stringify(moisList)
      ]
    );

    console.log('✅ Paiement mensuel enregistré (1 seule ligne), ID:', result.rows[0].id);

    return res.json({
      success: true,
      message: `Paiement enregistré avec succès (${nombreMois} mois)`,
      id: result.rows[0].id,
      nombre_mois: nombreMois,
      mois_payes: moisList
    });

  } catch (error) {
    console.error('❌ ERREUR SQL:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET - Statistiques des paiements (AVEC "other" + GLOBAL)
//    Le montant total est calculé UNIQUEMENT avec SUM(montant)
//    → même source que PayementChoix
// ============================================================
router.get('/paiements/stats', async (req, res) => {
  try {
    console.log('📊 Récupération des statistiques de paiements...');

    const stats = {
      hotel: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      'grand-surface': { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      bus: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      nightclub: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      media: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      occ: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
      other: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },   // ✅ AJOUT
    };

    const types = [
      { name: 'hotel', table: 'usagers_hotel' },
      { name: 'grand-surface', table: 'usagers_magasin' },
      { name: 'bus', table: 'usagers_bus' },
      { name: 'nightclub', table: 'usagers_nightclub' },
      { name: 'media', table: 'usagers_media' },
      { name: 'occ', table: 'usagers_occasionnel' },
      { name: 'other', table: 'usager_other' },   // ✅ AJOUT
    ];

    for (const type of types) {
      try {
        const totalResult = await pool.query(
          `SELECT COUNT(*) as count FROM omda_app.${type.table}`
        );
        stats[type.name].total = parseInt(totalResult.rows[0].count) || 0;

        // ✅ SOMME UNIQUEMENT DE montant (comme PayementChoix)
        const payesResult = await pool.query(
          `SELECT 
             COUNT(DISTINCT usager_id) as count,
             COALESCE(SUM(montant), 0) as total_montant
           FROM omda_app.paiements 
           WHERE usager_type = $1 AND statut = 'paye'`,
          [type.name]
        );
        stats[type.name].totalPayes = parseInt(payesResult.rows[0].count) || 0;
        stats[type.name].montantTotal = parseFloat(payesResult.rows[0].total_montant) || 0;
        stats[type.name].nonPayes = Math.max(
          0,
          stats[type.name].total - stats[type.name].totalPayes
        );
      } catch (err) {
        console.error(`❌ Erreur pour ${type.name}:`, err.message);
      }
    }

    // ✅ GLOBAL — UNIQUEMENT SUM(montant) sur tous les paiements 'paye'
    const globalResult = await pool.query(`
      SELECT 
        COALESCE(SUM(montant), 0) as montant_total,
        COUNT(*) as nb_paiements,
        COUNT(DISTINCT (usager_type || '_' || usager_id)) as nb_usagers_payes
      FROM omda_app.paiements
      WHERE statut = 'paye'
    `);

    const montantTotalGlobal = parseFloat(globalResult.rows[0].montant_total) || 0;
    const nbPaiementsGlobal = parseInt(globalResult.rows[0].nb_paiements) || 0;
    const nbUsagersPayesGlobal = parseInt(globalResult.rows[0].nb_usagers_payes) || 0;

    // Nombre total d'usagers toutes catégories (y compris "other")
    const totalUsagersResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM omda_app.usagers_hotel) +
        (SELECT COUNT(*) FROM omda_app.usagers_magasin) +
        (SELECT COUNT(*) FROM omda_app.usagers_bus) +
        (SELECT COUNT(*) FROM omda_app.usagers_nightclub) +
        (SELECT COUNT(*) FROM omda_app.usagers_media) +
        (SELECT COUNT(*) FROM omda_app.usagers_occasionnel) +
        (SELECT COUNT(*) FROM omda_app.usager_other) as total
    `);
    const totalUsagersGlobal = parseInt(totalUsagersResult.rows[0].total) || 0;

    const global = {
      totalUsagers: totalUsagersGlobal,
      totalPayes: nbUsagersPayesGlobal,
      montantTotal: montantTotalGlobal,
      nbPaiements: nbPaiementsGlobal,
    };

    // Log de vérification
    console.log('═══════════════════════════════════════');
    console.log('📊 STATS PAIEMENTS — DÉTAIL');
    console.log(`   Total usagers .......... : ${totalUsagersGlobal}`);
    console.log(`   Usagers payés (distinct) : ${nbUsagersPayesGlobal}`);
    console.log(`   Nb lignes paiements ..... : ${nbPaiementsGlobal}`);
    console.log(`   Montant total (SUM) ..... : ${montantTotalGlobal} Ar`);
    console.log('═══════════════════════════════════════');
    for (const [key, val] of Object.entries(stats)) {
      if (val.montantTotal > 0 || val.total > 0) {
        console.log(`   ${key.padEnd(15)} : ${val.totalPayes}/${val.total} payés — ${val.montantTotal} Ar`);
      }
    }
    console.log('═══════════════════════════════════════');

    res.json({ success: true, stats, global });
  } catch (error) {
    console.error('❌ Erreur paiements stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Années disponibles
// ============================================================
router.get('/paiements/annees-disponibles/:type', async (req, res) => {
  const currentYear = new Date().getFullYear();
  try {
    const result = await pool.query(
      `SELECT DISTINCT annee FROM omda_app.paiements WHERE annee IS NOT NULL ORDER BY annee DESC`
    );

    let annees = result.rows.map(r => r.annee);

    if (annees.length === 0) {
      annees = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    }

    res.json({ success: true, annees });
  } catch (error) {
    console.error('❌ Erreur annees disponibles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Tous les paiements (avec region + nom pour chaque type, y compris "other")
// ============================================================
router.get('/paiements/tous', async (req, res) => {
  try {
    console.log('📊 Récupération de tous les paiements...');

    const result = await pool.query(`
      SELECT 
        p.id,
        p.usager_id,
        p.usager_type,
        p.type_paiement,
        p.annee,
        p.mois,
        p.montant,
        p.date_paiement,
        p.frais_dossier,
        p.montant_retard,
        p.est_retard,
        p.reference,
        p.statut,
        p.nombre_mois,
        p.mois_payes,
        p.created_at,
        CASE 
          WHEN p.usager_type = 'hotel' THEN (SELECT denomination FROM omda_app.usagers_hotel WHERE id = p.usager_id)
          WHEN p.usager_type = 'grand-surface' THEN (SELECT denomination FROM omda_app.usagers_magasin WHERE id = p.usager_id)
          WHEN p.usager_type = 'bus' THEN (SELECT denomination FROM omda_app.usagers_bus WHERE id = p.usager_id)
          WHEN p.usager_type = 'nightclub' THEN (SELECT denomination FROM omda_app.usagers_nightclub WHERE id = p.usager_id)
          WHEN p.usager_type = 'media' THEN (SELECT denomination FROM omda_app.usagers_media WHERE id = p.usager_id)
          WHEN p.usager_type = 'occ' THEN (SELECT denomination FROM omda_app.usagers_occasionnel WHERE id = p.usager_id)
          WHEN p.usager_type = 'other' THEN (SELECT denomination FROM omda_app.usager_other WHERE id = p.usager_id)
          ELSE NULL
        END AS usager_nom,
        CASE 
          WHEN p.usager_type = 'hotel' THEN (SELECT region FROM omda_app.usagers_hotel WHERE id = p.usager_id)
          WHEN p.usager_type = 'grand-surface' THEN (SELECT region FROM omda_app.usagers_magasin WHERE id = p.usager_id)
          WHEN p.usager_type = 'bus' THEN (SELECT region FROM omda_app.usagers_bus WHERE id = p.usager_id)
          WHEN p.usager_type = 'nightclub' THEN (SELECT region FROM omda_app.usagers_nightclub WHERE id = p.usager_id)
          WHEN p.usager_type = 'media' THEN (SELECT region FROM omda_app.usagers_media WHERE id = p.usager_id)
          WHEN p.usager_type = 'occ' THEN (SELECT region FROM omda_app.usagers_occasionnel WHERE id = p.usager_id)
          WHEN p.usager_type = 'other' THEN (SELECT region FROM omda_app.usager_other WHERE id = p.usager_id)
          ELSE NULL
        END AS region
      FROM omda_app.paiements p
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      paiements: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération tous les paiements:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      paiements: []
    });
  }
});

// ============================================================
// GET - Historique des paiements
// ============================================================
router.get('/paiements/historique', async (req, res) => {
  try {
    console.log('📄 Récupération de l\'historique des paiements...');
    const historique = [];

    const result = await pool.query(`
      SELECT 
        p.id,
        p.usager_id,
        p.usager_type,
        p.type_paiement,
        p.mois,
        p.annee,
        p.montant,
        p.date_paiement,
        p.frais_dossier,
        p.montant_retard,
        p.est_retard,
        p.reference,
        p.statut,
        p.nombre_mois,
        p.mois_payes,
        p.created_at
      FROM omda_app.paiements p
      ORDER BY p.created_at DESC
      LIMIT 50
    `);

    for (const row of result.rows) {
      let usagerNom = 'Inconnu';
      let region = 'N/A';

      if (row.usager_type === 'hotel') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_hotel WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'grand-surface') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_magasin WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'bus') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_bus WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'nightclub') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_nightclub WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'media') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_media WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'occ') {
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usagers_occasionnel WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'other') {   // ✅ AJOUT
        const u = await pool.query(`SELECT denomination, region FROM omda_app.usager_other WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      }

      const typeLabels = {
        'hotel': 'Hôtel',
        'grand-surface': 'Grand Surface',
        'bus': 'Bus',
        'nightclub': 'Night club',
        'media': 'Télé/Radio',
        'occ': 'OCC',
        'other': 'Autre',   // ✅ AJOUT
      };

      const moisLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

      historique.push({
        id: row.id,
        usager: usagerNom,
        type: typeLabels[row.usager_type] || row.usager_type,
        typePaiement: row.type_paiement === 'unique' ? 'Unique (OCC)' : 'Mensuel',
        montant: parseFloat(row.montant) || 0,
        frais_dossier: parseFloat(row.frais_dossier) || 0,
        montant_retard: parseFloat(row.montant_retard) || 0,
        est_retard: row.est_retard || false,
        reference: row.reference || '-',
        date: row.date_paiement || row.created_at,
        mois: row.mois,
        moisLabel: row.mois ? moisLabels[row.mois - 1] : '-',
        annee: row.annee || '-',
        statut: row.statut || 'paye',
        region: region,
        nombre_mois: row.nombre_mois || 1,
        mois_payes: row.mois_payes || null,
      });
    }

    res.json({
      success: true,
      historique: historique,
      total: historique.length
    });
  } catch (error) {
    console.error('❌ Erreur historique paiements:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      historique: []
    });
  }
});

module.exports = router;