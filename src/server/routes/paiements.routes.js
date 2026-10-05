// server/routes/paiements.routes.js
const express = require('express');
const router = express.Router();
const { query } = require('../database');

// ============================================================
// GET - Paiements d'un usager
// ============================================================
router.get('/paiements/usager/:id/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    console.log(`📊 Récupération des paiements pour usager ${id} (${type})`);

    const result = await query(
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
  console.log('📦 Body reçu:', JSON.stringify(req.body, null, 2));

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

  // ─── Validations de base ───
  if (!usagerId || !montant) {
    console.warn('⚠️ usagerId ou montant manquant');
    return res.status(400).json({
      success: false,
      message: 'usagerId et montant requis'
    });
  }

  try {
    const typePaiement = type_paiement || (usagerType === 'occ' ? 'unique' : 'mensuel');
    console.log(`📝 typePaiement=${typePaiement}, usagerType=${usagerType}`);

    // ═══════════════════════════════════════════════════════
    // ⭐ CAS SPÉCIAL : OTHER — 1 SEULE LIGNE (INSERT ou UPDATE)
    // ═══════════════════════════════════════════════════════
    if (usagerType === 'other') {
      const datePaiementFinal = date_paiement || new Date().toISOString().split('T')[0];
      const dateObj = new Date(datePaiementFinal);

      // ─── Paiement UNIQUE pour OTHER ───
      if (typePaiement === 'unique') {
        const anneeOther = annee || dateObj.getFullYear();
        const moisOther = mois || (dateObj.getMonth() + 1);

        const existing = await query(
          `SELECT id FROM omda_app.paiements 
           WHERE usager_id = $1 AND usager_type = 'other' 
           ORDER BY id DESC LIMIT 1`,
          [usagerId]
        );

        if (existing.rows.length > 0) {
          const updateResult = await query(
            `UPDATE omda_app.paiements SET
               type_paiement = 'unique',
               annee = $1,
               mois = $2,
               montant = $3,
               date_paiement = $4,
               statut = $5,
               frais_dossier = $6,
               montant_retard = $7,
               est_retard = $8,
               reference = $9,
               nombre_mois = 1,
               mois_payes = NULL
             WHERE id = $10
             RETURNING id`,
            [
              anneeOther,
              moisOther,
              montant,
              datePaiementFinal,
              statut || 'paye',
              frais_dossier || 0,
              montant_retard || 0,
              est_retard || false,
              reference || null,
              existing.rows[0].id
            ]
          );

          console.log('✅ Paiement unique OTHER mis à jour, ID:', updateResult.rows[0].id);
          return res.json({
            success: true,
            message: 'Paiement OTHER (unique) mis à jour avec succès',
            id: updateResult.rows[0].id,
            updated: true
          });
        }

        const insertResult = await query(
          `INSERT INTO omda_app.paiements 
           (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, statut, 
            frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
           VALUES ($1, 'other', 'unique', $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, NULL)
           RETURNING id`,
          [
            usagerId,
            anneeOther,
            moisOther,
            montant,
            datePaiementFinal,
            statut || 'paye',
            frais_dossier || 0,
            montant_retard || 0,
            est_retard || false,
            reference || null
          ]
        );

        console.log('✅ Paiement unique OTHER enregistré, ID:', insertResult.rows[0].id);
        return res.json({
          success: true,
          message: 'Paiement OTHER (unique) enregistré avec succès',
          id: insertResult.rows[0].id
        });
      }

      // ─── Paiement MENSUEL pour OTHER ───
      let anneeOther = annee || new Date().getFullYear();
      let moisList = [];

      if (mois_payes && Array.isArray(mois_payes) && mois_payes.length > 0) {
        moisList = mois_payes
          .map(m => parseInt(m, 10))
          .filter(m => !isNaN(m) && m >= 1 && m <= 12);
      }

      if (moisList.length === 0) {
        const moisFallback = mois || (new Date().getMonth() + 1);
        moisList = [parseInt(moisFallback, 10)];
      }

      const moisFinal = moisList[0];

      // ✅ CHERCHER une ligne existante AVEC LE MONTANT (pour cumul)
      const existing = await query(
        `SELECT id, nombre_mois, mois_payes, montant FROM omda_app.paiements 
         WHERE usager_id = $1 AND usager_type = 'other'
         ORDER BY id DESC LIMIT 1`,
        [usagerId]
      );

      if (existing.rows.length > 0) {
        // ═══════════════════════════════════════════════════════════
        // ✅ CORRECTION BUG n°2 : FUSIONNER les mois au lieu d'écraser
        // ═══════════════════════════════════════════════════════════
        let anciensMois = [];
        try {
          if (existing.rows[0].mois_payes) {
            if (Array.isArray(existing.rows[0].mois_payes)) {
              anciensMois = existing.rows[0].mois_payes;
            } else if (typeof existing.rows[0].mois_payes === 'string') {
              const parsed = JSON.parse(existing.rows[0].mois_payes);
              if (Array.isArray(parsed)) anciensMois = parsed;
            }
          }
        } catch (e) {
          console.warn('⚠️ Erreur parsing anciens mois:', e.message);
        }

        // ✅ FUSION : anciens + nouveaux (dédupliqués + triés)
        const moisFusionnes = [...new Set([...anciensMois, ...moisList])]
          .filter(m => typeof m === 'number' && m >= 1 && m <= 12)
          .sort((a, b) => a - b);

        const nombreMoisFusionnes = moisFusionnes.length;

        // ✅ CUMUL du montant
        const ancienMontant = parseFloat(existing.rows[0].montant) || 0;
        const nouveauMontant = ancienMontant + (parseFloat(montant) || 0);

        console.log(`🔄 FUSION OTHER : anciens=${JSON.stringify(anciensMois)} + nouveaux=${JSON.stringify(moisList)} = ${JSON.stringify(moisFusionnes)}`);
        console.log(`💰 Montant : ${ancienMontant} + ${montant} = ${nouveauMontant}`);

        const updateResult = await query(
          `UPDATE omda_app.paiements SET
             type_paiement = 'mensuel',
             annee = $1,
             mois = $2,
             montant = $3,
             date_paiement = $4,
             statut = $5,
             frais_dossier = $6,
             montant_retard = $7,
             est_retard = $8,
             reference = $9,
             nombre_mois = $10,
             mois_payes = $11
           WHERE id = $12
           RETURNING id`,
          [
            anneeOther,
            moisFusionnes[0] || moisFinal,
            nouveauMontant,
            datePaiementFinal,
            statut || 'paye',
            frais_dossier || 0,
            montant_retard || 0,
            est_retard || false,
            reference || null,
            nombreMoisFusionnes,
            JSON.stringify(moisFusionnes),
            existing.rows[0].id
          ]
        );

        console.log(`✅ Paiement mensuel OTHER fusionné (${nombreMoisFusionnes} mois au total), ID:`, updateResult.rows[0].id);
        return res.json({
          success: true,
          message: `Paiement OTHER fusionné (${nombreMoisFusionnes} mois au total)`,
          id: updateResult.rows[0].id,
          nombre_mois: nombreMoisFusionnes,
          mois_payes: moisFusionnes,
          updated: true
        });
      }

      // ✅ INSERT (première fois)
      const nombreMois = nombre_mois || moisList.length;
      const insertResult = await query(
        `INSERT INTO omda_app.paiements 
         (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, 
          statut, frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
         VALUES ($1, 'other', 'mensuel', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          usagerId,
          anneeOther,
          moisFinal,
          montant,
          datePaiementFinal,
          statut || 'paye',
          frais_dossier || 0,
          montant_retard || 0,
          est_retard || false,
          reference || null,
          nombreMois,
          JSON.stringify(moisList)
        ]
      );

      console.log('✅ Paiement mensuel OTHER enregistré (1ère fois), ID:', insertResult.rows[0].id);
      return res.json({
        success: true,
        message: `Paiement OTHER enregistré (${nombreMois} mois)`,
        id: insertResult.rows[0].id,
        nombre_mois: nombreMois,
        mois_payes: moisList
      });
    }

    // ═══════════════════════════════════════════════════════
    // CAS 1 : PAIEMENT UNIQUE (OCC et autres)
    // ═══════════════════════════════════════════════════════
    if (usagerType === 'occ' || typePaiement === 'unique') {
      const datePaiementFinal = date_paiement || new Date().toISOString().split('T')[0];
      const dateObj = new Date(datePaiementFinal);

      const anneeOcc = annee || dateObj.getFullYear();
      const moisOcc = mois || (dateObj.getMonth() + 1);

      const result = await query(
        `INSERT INTO omda_app.paiements 
         (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, statut, 
          frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          usagerId,
          usagerType || 'occ',
          'unique',
          anneeOcc,
          moisOcc,
          montant,
          datePaiementFinal,
          statut || 'paye',
          frais_dossier || 0,
          montant_retard || 0,
          est_retard || false,
          reference || null,
          1,
          null
        ]
      );

      console.log('✅ Paiement unique enregistré, ID:', result.rows[0].id, '- annee:', anneeOcc, 'mois:', moisOcc);
      return res.json({
        success: true,
        message: 'Paiement unique enregistré avec succès',
        id: result.rows[0].id
      });
    }

    // ═══════════════════════════════════════════════════════
    // CAS 2 : PAIEMENT MENSUEL (hotel, bus, media, etc.)
    // ═══════════════════════════════════════════════════════
    let anneeFinale = annee || new Date().getFullYear();
    let moisList = [];

    if (mois_payes && Array.isArray(mois_payes) && mois_payes.length > 0) {
      moisList = mois_payes
        .map(m => parseInt(m, 10))
        .filter(m => !isNaN(m) && m >= 1 && m <= 12);
    }

    if (moisList.length === 0) {
      const moisFallback = mois || (new Date().getMonth() + 1);
      moisList = [parseInt(moisFallback, 10)];
    }

    const moisFinal = moisList[0];

    if (!anneeFinale || !moisFinal || moisFinal < 1 || moisFinal > 12) {
      console.error('❌ annee ou mois invalide:', { anneeFinale, moisFinal, moisList });
      return res.status(400).json({
        success: false,
        message: `Année (${anneeFinale}) ou mois (${moisFinal}) invalide`
      });
    }

    const nombreMois = nombre_mois || moisList.length;

    console.log('📝 Enregistrement mensuel (non-other):');
    console.log('   → annee =', anneeFinale);
    console.log('   → mois_payes =', moisList);
    console.log('   → nombre_mois =', nombreMois);
    console.log('   → montant =', montant);

    // ─── Vérifier si déjà payé ───
    if (moisList.length > 0) {
      const placeholders = moisList.map((_, i) => `$${i + 4}`).join(', ');
      const checkResult = await query(
        `SELECT id, mois FROM omda_app.paiements 
         WHERE usager_id = $1 AND usager_type = $2 
           AND annee = $3
           AND statut = 'paye'
           AND mois IN (${placeholders})`,
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

    // ─── Insertion ───
    const result = await query(
      `INSERT INTO omda_app.paiements 
       (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, 
        statut, frais_dossier, montant_retard, est_retard, reference, nombre_mois, mois_payes)
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
    console.error('❌ ERREUR SQL dans /paiements/enregistrer:');
    console.error('   message :', error.message);
    console.error('   code    :', error.code);
    console.error('   detail  :', error.detail);
    console.error('   stack   :', error.stack);
    return res.status(500).json({
      success: false,
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

// ============================================================
// ✅ GET - Statistiques des paiements
// ⚠️ Pour OTHER, on déduplique par usager_id
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
      other: { total: 0, totalPayes: 0, nonPayes: 0, montantTotal: 0 },
    };

    const types = [
      { name: 'hotel', table: 'usagers_hotel' },
      { name: 'grand-surface', table: 'usagers_magasin' },
      { name: 'bus', table: 'usagers_bus' },
      { name: 'nightclub', table: 'usagers_nightclub' },
      { name: 'media', table: 'usagers_media' },
      { name: 'occ', table: 'usagers_occasionnel' },
      { name: 'other', table: 'usager_other' },
    ];

    for (const type of types) {
      try {
        const totalResult = await query(
          `SELECT COUNT(*) as count FROM omda_app.${type.table}`
        );
        stats[type.name].total = parseInt(totalResult.rows[0].count) || 0;

        let payesResult;
        if (type.name === 'other') {
          payesResult = await query(
            `SELECT 
               COUNT(DISTINCT usager_id) as count,
               COALESCE(SUM(montant), 0) as total_montant
             FROM omda_app.paiements p
             WHERE p.usager_type = 'other' 
               AND p.statut = 'paye'
               AND p.id IN (
                 SELECT MAX(id) FROM omda_app.paiements 
                 WHERE usager_type = 'other' AND statut = 'paye'
                 GROUP BY usager_id
               )`
          );
        } else {
          payesResult = await query(
            `SELECT 
               COUNT(DISTINCT usager_id) as count,
               COALESCE(SUM(montant), 0) as total_montant
             FROM omda_app.paiements 
             WHERE usager_type = $1 AND statut = 'paye'`,
            [type.name]
          );
        }
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

    const globalResult = await query(`
      SELECT 
        COALESCE(SUM(montant), 0) as montant_total,
        COUNT(*) as nb_paiements,
        COUNT(DISTINCT (usager_type || '_' || usager_id)) as nb_usagers_payes
      FROM omda_app.paiements p
      WHERE p.statut = 'paye'
        AND (
          p.usager_type != 'other'
          OR p.id IN (
            SELECT MAX(id) FROM omda_app.paiements 
            WHERE usager_type = 'other' AND statut = 'paye'
            GROUP BY usager_id
          )
        )
    `);

    const montantTotalGlobal = parseFloat(globalResult.rows[0].montant_total) || 0;
    const nbPaiementsGlobal = parseInt(globalResult.rows[0].nb_paiements) || 0;
    const nbUsagersPayesGlobal = parseInt(globalResult.rows[0].nb_usagers_payes) || 0;

    const totalUsagersResult = await query(`
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
    const result = await query(
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
// GET - Tous les paiements
// ✅ CORRECTION BUG n°1 : Renvoyer TOUTES les lignes OTHER
//    (suppression du MAX(id) qui cachait les autres paiements)
// ============================================================
router.get('/paiements/tous', async (req, res) => {
  try {
    console.log('📊 Récupération de tous les paiements...');

    const result = await query(`
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
      WHERE p.statut = 'paye'
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

    const result = await query(`
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
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_hotel WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'grand-surface') {
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_magasin WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'bus') {
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_bus WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'nightclub') {
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_nightclub WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'media') {
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_media WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'occ') {
        const u = await query(`SELECT denomination, region FROM omda_app.usagers_occasionnel WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      } else if (row.usager_type === 'other') {
        const u = await query(`SELECT denomination, region FROM omda_app.usager_other WHERE id = $1`, [row.usager_id]);
        if (u.rows.length > 0) { usagerNom = u.rows[0].denomination; region = u.rows[0].region; }
      }

      const typeLabels = {
        'hotel': 'Hôtel',
        'grand-surface': 'Grand Surface',
        'bus': 'Bus',
        'nightclub': 'Night club',
        'media': 'Télé/Radio',
        'occ': 'OCC',
        'other': 'Autre',
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