// server/routes/delete.routes.js
// ============================================================
// ROUTES DE SUPPRESSION EN CASCADE
// Supprime un usager + TOUS ses paiements + données liées
// ⚠️ Utilise pool.query() (pas de pool.connect ni transactions manuelles)
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../database');

console.log('✅ Routeur DELETE chargé - delete.routes.js');

// ============================================================
// MAPPING : type URL → table usager + type paiement + libellé
// ============================================================
const TYPE_MAPPING = {
  'hotel':         { table: 'usagers_hotel',        paiementType: 'hotel',         label: 'Hôtel' },
  'grand-surface': { table: 'usagers_magasin',      paiementType: 'grand-surface', label: 'Grand Surface' },
  'media':         { table: 'usagers_media',        paiementType: 'media',         label: 'Télé/Radio' },
  'occ':           { table: 'usagers_occasionnel',  paiementType: 'occ',           label: 'OCC' },
  'bus':           { table: 'usagers_bus',          paiementType: 'bus',           label: 'Bus' },
  'nightclub':     { table: 'usagers_nightclub',    paiementType: 'nightclub',     label: 'Night club' },
  'other':         { table: 'usager_other',         paiementType: 'other',         label: 'Autre' },
};

console.log('   Types gérés :', Object.keys(TYPE_MAPPING).join(', '));

// ============================================================
// Helper : exécute une requête en ignorant les erreurs
// (utile pour les tables optionnelles qui peuvent ne pas exister)
// ============================================================
const safeQuery = async (sql, params = []) => {
  try {
    return await pool.query(sql, params);
  } catch (e) {
    return { rowCount: 0, rows: [], error: e.message };
  }
};

// ============================================================
// DELETE /api/usagers/:type/:id
// Supprime un usager + tous ses paiements + données liées
// ============================================================
router.delete('/usagers/:type/:id', async (req, res) => {
  const { type, id } = req.params;

  console.log(`\n🗑️ DELETE /api/usagers/${type}/${id}`);

  const mapping = TYPE_MAPPING[type];
  if (!mapping) {
    console.warn(`   ⚠️ Type invalide : ${type}`);
    return res.status(400).json({
      success: false,
      message: `Type invalide : ${type}. Types acceptés : ${Object.keys(TYPE_MAPPING).join(', ')}`
    });
  }

  const { table, paiementType, label } = mapping;

  try {
    // ─── Vérifier que l'usager existe ───
    const checkResult = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      console.warn(`   ⚠️ Usager ${label} #${id} non trouvé`);
      return res.status(404).json({ success: false, message: `Usager ${label} non trouvé` });
    }

    const usagerData = checkResult.rows[0];
    const denomination =
      usagerData.denomination ||
      usagerData.nom_evenement ||
      usagerData.genre_manifestation ||
      'Inconnu';

    console.log(`   📋 Usager trouvé : ${denomination}`);

    // ─── Compter les paiements AVANT suppression ───
    let nbPaiements = 0;
    let montantTotalSupprime = 0;
    try {
      const paiementsCount = await pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(montant), 0) as montant_total
         FROM paiements
         WHERE usager_id = $1 AND usager_type = $2`,
        [id, paiementType]
      );
      nbPaiements = parseInt(paiementsCount.rows[0].total) || 0;
      montantTotalSupprime = parseFloat(paiementsCount.rows[0].montant_total) || 0;
      console.log(`   💰 ${nbPaiements} paiement(s) lié(s) — ${montantTotalSupprime} Ar`);
    } catch (e) {
      console.warn('   ⚠️ Impossible de compter les paiements:', e.message);
    }

    // ─── Compter les factures AVANT suppression ───
    let nbFactures = 0;
    try {
      const facturesCount = await pool.query(
        `SELECT COUNT(*) as total FROM facture_usager WHERE ref_usager = $1`,
        [id]
      );
      nbFactures = parseInt(facturesCount.rows[0].total) || 0;
      console.log(`   🧾 ${nbFactures} facture(s) liée(s)`);
    } catch (e) {
      console.warn('   ⚠️ Impossible de compter les factures:', e.message);
    }

    // ============================================================
    // SUPPRESSION EN CASCADE (séquentielle, sans transaction)
    // ============================================================

    // 1️⃣ Supprimer TOUS les paiements liés à cet usager
    try {
      const delPaiements = await pool.query(
        `DELETE FROM paiements 
         WHERE usager_id = $1 AND usager_type = $2`,
        [id, paiementType]
      );
      console.log(`   ✅ ${delPaiements.rowCount} paiement(s) supprimé(s)`);
    } catch (e) {
      console.error('   ❌ Erreur suppression paiements:', e.message);
      throw new Error(`Erreur suppression paiements: ${e.message}`);
    }

    // 2️⃣ Supprimer les factures liées
    try {
      const delFactures = await pool.query(
        `DELETE FROM facture_usager WHERE ref_usager = $1`,
        [id]
      );
      if (delFactures.rowCount > 0) {
        console.log(`   ✅ ${delFactures.rowCount} facture(s) supprimée(s)`);
      }
    } catch (e) {
      console.warn('   ⚠️ Factures:', e.message);
    }

    // 3️⃣ Supprimer les relations artistes (OCC uniquement)
    if (type === 'occ') {
      const delArt = await safeQuery(
        `DELETE FROM event_artistes WHERE event_id = $1`,
        [id]
      );
      if (delArt.rowCount > 0) {
        console.log(`   ✅ ${delArt.rowCount} relation(s) artiste(s) supprimée(s)`);
      }
    }

    // 4️⃣ Supprimer les lignes "other" (Autre uniquement)
    if (type === 'other') {
      const delLignes = await safeQuery(
        `DELETE FROM other_lignes WHERE usager_other_id = $1`,
        [id]
      );
      if (delLignes.rowCount > 0) {
        console.log(`   ✅ ${delLignes.rowCount} ligne(s) other supprimée(s)`);
      }
    }

    // 5️⃣ Nettoyer les tables annexes (best-effort)
    await safeQuery(
      `DELETE FROM usagers_vus WHERE usager_id = $1 AND usager_type = $2`,
      [id, paiementType]
    );
    await safeQuery(`DELETE FROM notifications WHERE usager_id = $1`, [id]);
    await safeQuery(`DELETE FROM delete_requests WHERE usager_id = $1`, [id]);

    // 6️⃣ ENFIN : supprimer l'usager
    try {
      const delUsager = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      console.log(`   ✅ Usager supprimé : ${delUsager.rowCount} ligne(s)`);
    } catch (e) {
      console.error('   ❌ Erreur suppression usager:', e.message);
      throw new Error(`Erreur suppression usager: ${e.message}`);
    }

    console.log(`✅ SUPPRESSION COMPLÈTE : ${label} #${id} - ${denomination}\n`);

    // 7️⃣ Historique (best-effort)
    try {
      const adminToken = req.headers.adminToken || req.headers['admintoken'] || '';
      let deletedBy = 'Administrateur';
      let userId = 1;

      if (adminToken) {
        const userResult = await pool.query(
          `SELECT id, nom FROM utilisateurs 
           WHERE role IN ('super_admin', 'daf') AND statut = 'actif' 
           LIMIT 1`
        );
        if (userResult.rows.length > 0) {
          deletedBy = userResult.rows[0].nom;
          userId = userResult.rows[0].id;
        }
      }

      await pool.query(
        `INSERT INTO delete_history 
         (usager_nom, usager_type, deleted_by, deleted_by_role, user_id, details, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          denomination,
          label,
          deletedBy,
          'admin',
          userId,
          JSON.stringify({
            demandeur: usagerData.demandeur || usagerData.nom || 'Inconnu',
            region: usagerData.region || 'Non spécifiée',
            telephone: usagerData.telephone || 'Non spécifié',
            uniter: usagerData.uniter || 1,
            nb_paiements_supprimes: nbPaiements,
            montant_total_supprime: montantTotalSupprime,
            nb_factures_supprimees: nbFactures,
          })
        ]
      );
    } catch (historyError) {
      console.warn('⚠️ Historique:', historyError.message);
    }

    // ✅ Réponse
    return res.json({
      success: true,
      message: `Usager "${denomination}" et ${nbPaiements} paiement(s) lié(s) supprimé(s) avec succès`,
      details: {
        usager_id: parseInt(id),
        usager_type: label,
        denomination,
        nb_paiements_supprimes: nbPaiements,
        montant_total_supprime: montantTotalSupprime,
        nb_factures_supprimees: nbFactures,
      }
    });

  } catch (error) {
    console.error('❌ Erreur DELETE /usagers/:type/:id:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
});

// ============================================================
// DELETE /api/usagers/:id (fallback sans type)
// Détecte automatiquement le type de l'usager
// ============================================================
router.delete('/usagers/:id', async (req, res) => {
  const { id } = req.params;
  const { type_usager } = req.query;

  console.log(`\n🗑️ DELETE /api/usagers/${id} (fallback)`);

  try {
    let foundType = null;
    let usagerData = null;
    let table = null;

    // Si le type est fourni en query
    if (type_usager) {
      const typeKey = Object.keys(TYPE_MAPPING).find(
        k => TYPE_MAPPING[k].label === type_usager
      );
      if (typeKey) {
        const m = TYPE_MAPPING[typeKey];
        const result = await pool.query(`SELECT * FROM ${m.table} WHERE id = $1`, [id]);
        if (result.rows.length > 0) {
          foundType = typeKey;
          table = m.table;
          usagerData = result.rows[0];
        }
      }
    }

    // Sinon, chercher dans toutes les tables
    if (!foundType) {
      for (const [key, m] of Object.entries(TYPE_MAPPING)) {
        const result = await pool.query(`SELECT * FROM ${m.table} WHERE id = $1`, [id]);
        if (result.rows.length > 0) {
          foundType = key;
          table = m.table;
          usagerData = result.rows[0];
          break;
        }
      }
    }

    if (!foundType || !usagerData) {
      return res.status(404).json({ success: false, message: 'Usager non trouvé' });
    }

    const mapping = TYPE_MAPPING[foundType];
    const denomination =
      usagerData.denomination ||
      usagerData.nom_evenement ||
      usagerData.genre_manifestation ||
      'Inconnu';

    let nbPaiements = 0;
    try {
      const paiementsCount = await pool.query(
        `SELECT COUNT(*) as total FROM paiements 
         WHERE usager_id = $1 AND usager_type = $2`,
        [id, mapping.paiementType]
      );
      nbPaiements = parseInt(paiementsCount.rows[0].total) || 0;
    } catch (e) { /* ignore */ }

    // ─── Suppression en cascade ───
    try {
      await pool.query(
        `DELETE FROM paiements WHERE usager_id = $1 AND usager_type = $2`,
        [id, mapping.paiementType]
      );
    } catch (e) {
      throw new Error(`Erreur suppression paiements: ${e.message}`);
    }

    await safeQuery(`DELETE FROM facture_usager WHERE ref_usager = $1`, [id]);

    if (foundType === 'occ') {
      await safeQuery(`DELETE FROM event_artistes WHERE event_id = $1`, [id]);
    }

    if (foundType === 'other') {
      await safeQuery(`DELETE FROM other_lignes WHERE usager_other_id = $1`, [id]);
    }

    await safeQuery(
      `DELETE FROM usagers_vus WHERE usager_id = $1 AND usager_type = $2`,
      [id, mapping.paiementType]
    );
    await safeQuery(`DELETE FROM notifications WHERE usager_id = $1`, [id]);
    await safeQuery(`DELETE FROM delete_requests WHERE usager_id = $1`, [id]);

    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);

    console.log(`✅ SUPPRESSION COMPLÈTE (fallback) : ${mapping.label} #${id}\n`);

    return res.json({
      success: true,
      message: `Usager "${denomination}" et ${nbPaiements} paiement(s) supprimé(s)`,
      details: {
        usager_id: parseInt(id),
        usager_type: mapping.label,
        denomination,
        nb_paiements_supprimes: nbPaiements,
      }
    });

  } catch (error) {
    console.error('❌ Erreur DELETE /usagers/:id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/delete-history - Historique des suppressions
// ============================================================
router.get('/delete-history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, usager_nom, usager_type, deleted_by, deleted_by_role,
        user_id, details, deleted_at
      FROM delete_history
      ORDER BY deleted_at DESC
      LIMIT 100
    `);
    res.json({ success: true, history: result.rows });
  } catch (error) {
    console.error('❌ Erreur GET /delete-history:', error);
    res.status(500).json({ success: false, message: error.message, history: [] });
  }
});

module.exports = router;