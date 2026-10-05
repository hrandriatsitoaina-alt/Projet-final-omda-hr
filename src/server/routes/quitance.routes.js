// server/routes/quitance.routes.js
// ═══════════════════════════════════════════════════════════════════
// ROUTES QUITTANCE - Relation 1:1 stricte avec facture_usager
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

console.log('✅ Routeur quitance chargé (source: quitance_usager, relation 1:1 avec facture_usager)');

// ============================================================
// LONGUEUR DE FORMATAGE PAR DÉFAUT (7 chiffres)
// ============================================================
const LONGUEUR_DEFAUT = parseInt(process.env.QUITTANCE_LENGTH || '7', 10);

// ============================================================
// ✅ UTILITAIRE : Formater un numéro sur une longueur donnée
// ============================================================
const formatNumero = (numero, longueur = LONGUEUR_DEFAUT) => {
  const numStr = String(parseInt(numero, 10) || 0);
  if (!longueur || longueur <= 0) return numStr;
  return numStr.padStart(Math.max(longueur, numStr.length), '0');
};

// ============================================================
// ✅ DERNIER NUMÉRO : num_quitance de LA LIGNE AVEC LE PLUS GRAND id
//    → PAS MAX(num_quitance) !
//    → Table vide → dernier = 0, prochain = 1
// ============================================================
const getDernierNumero = async (client = pool) => {
  try {
    const res = await client.query(`
      SELECT num_quitance, longueur_format
      FROM quitance_usager
      ORDER BY id DESC
      LIMIT 1
    `);

    if (res.rows.length === 0) {
      return {
        dernier: 0,
        dernierFormate: formatNumero(0, LONGUEUR_DEFAUT),
        longueur: LONGUEUR_DEFAUT,
      };
    }

    const dernier = parseInt(res.rows[0].num_quitance, 10) || 0;
    const longueur = parseInt(res.rows[0].longueur_format, 10) || LONGUEUR_DEFAUT;

    return {
      dernier,
      dernierFormate: formatNumero(dernier, longueur),
      longueur,
    };
  } catch (e) {
    console.error('❌ getDernierNumero:', e.message);
    return {
      dernier: 0,
      dernierFormate: formatNumero(0, LONGUEUR_DEFAUT),
      longueur: LONGUEUR_DEFAUT,
    };
  }
};

// ============================================================
// ✅ FONCTION INTERNE : Créer une quittance AUTOMATIQUE
//    → prochain = dernier (ligne id DESC) + 1
// ============================================================
const creerQuittancePourFacture = async (client, idFacture, userId = null) => {
  // Vérifier si la quittance existe déjà
  const existing = await client.query(`
    SELECT id, id_facture, num_quitance, num_quitance_formate, longueur_format
    FROM quitance_usager WHERE id_facture = $1
  `, [idFacture]);

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Calculer le prochain numéro
  const { dernier, longueur } = await getDernierNumero(client);
  const prochain = dernier + 1;
  const prochainLen = Math.max(longueur, String(prochain).length);
  const prochainFormate = formatNumero(prochain, prochainLen);

  const result = await client.query(`
    INSERT INTO quitance_usager (
      id_facture, num_quitance, num_quitance_formate,
      longueur_format, quittance_validee, created_by
    )
    VALUES ($1, $2, $3, $4, FALSE, $5)
    ON CONFLICT (id_facture) DO NOTHING
    RETURNING id, id_facture, num_quitance, num_quitance_formate, longueur_format
  `, [idFacture, prochain, prochainFormate, prochainLen, userId]);

  if (result.rows.length === 0) {
    const existing2 = await client.query(`
      SELECT id, id_facture, num_quitance, num_quitance_formate, longueur_format
      FROM quitance_usager WHERE id_facture = $1
    `, [idFacture]);
    return existing2.rows[0];
  }

  return result.rows[0];
};

// ============================================================
// ✅ FONCTION INTERNE : Créer une quittance AVEC NUMÉRO EXPLICITE
//    → Utilisé par Type B (12 factures → même num_quitance)
//    → Si numeroFourni est null/undefined → comportement auto
// ============================================================
const creerQuittanceAvecNumero = async (client, idFacture, numeroFourni, userId = null, personneRecu = null) => {
  // Vérifier si la quittance existe déjà
  const existing = await client.query(`
    SELECT id, id_facture, num_quitance, num_quitance_formate, longueur_format
    FROM quitance_usager WHERE id_facture = $1
  `, [idFacture]);

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  let numQuitanceFinal;
  let numFormate;
  let longueurFinale;

  if (numeroFourni !== null && numeroFourni !== undefined && numeroFourni !== '') {
    // ✅ Numéro explicite fourni (Type B : 12 factures même numéro)
    const numeroStr = String(numeroFourni).replace(/\D/g, '');
    numQuitanceFinal = parseInt(numeroStr, 10) || 1;
    longueurFinale = Math.max(numeroStr.length, LONGUEUR_DEFAUT);
    numFormate = formatNumero(numQuitanceFinal, longueurFinale);
    console.log(`   → Numéro explicite: ${numQuitanceFinal} (${numFormate})`);
  } else {
    // ✅ Calcul automatique
    const { dernier, longueur } = await getDernierNumero(client);
    numQuitanceFinal = dernier + 1;
    longueurFinale = Math.max(longueur, String(numQuitanceFinal).length);
    numFormate = formatNumero(numQuitanceFinal, longueurFinale);
    console.log(`   → Numéro auto: ${numQuitanceFinal} (${numFormate})`);
  }

  const result = await client.query(`
    INSERT INTO quitance_usager (
      id_facture, num_quitance, num_quitance_formate,
      longueur_format, quittance_validee, personne_recu, created_by
    )
    VALUES ($1, $2, $3, $4, FALSE, $5, $6)
    ON CONFLICT (id_facture) DO NOTHING
    RETURNING id, id_facture, num_quitance, num_quitance_formate, longueur_format
  `, [idFacture, numQuitanceFinal, numFormate, longueurFinale, personneRecu, userId]);

  if (result.rows.length === 0) {
    const existing2 = await client.query(`
      SELECT id, id_facture, num_quitance, num_quitance_formate, longueur_format
      FROM quitance_usager WHERE id_facture = $1
    `, [idFacture]);
    return existing2.rows[0];
  }

  return result.rows[0];
};

// ============================================================
// 1. LISTE DE TOUTES LES QUITTANCES
// ============================================================
router.get('/quitance/liste', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.id,
        q.id_facture,
        q.num_quitance,
        q.num_quitance_formate,
        q.longueur_format,
        q.quittance_validee,
        q.personne_recu,
        q.created_at AS quittance_created_at,
        q.updated_at AS quittance_updated_at,
        f.ref_omda,
        f.num_facture,
        f.denomination,
        f.demandeur,
        f.soit_total,
        f.statut,
        f.ref_client_type,
        f.ref_usager,
        f.region_usager,
        f.date_ajout,
        f.created_at AS facture_created_at
      FROM quitance_usager q
      INNER JOIN facture_usager f ON f.id = q.id_facture
      ORDER BY q.id ASC
    `);

    res.json({
      success: true,
      quittances: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('❌ Erreur liste:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 2. QUITTANCES PAR RÉGION
// ============================================================
router.get('/quitance/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const result = await pool.query(`
      SELECT 
        q.id,
        q.id_facture,
        q.num_quitance,
        q.num_quitance_formate,
        q.quittance_validee,
        q.personne_recu,
        f.ref_omda,
        f.num_facture,
        f.denomination,
        f.demandeur,
        f.soit_total,
        f.region_usager,
        f.statut,
        f.ref_client_type,
        f.ref_usager
      FROM quitance_usager q
      INNER JOIN facture_usager f ON f.id = q.id_facture
      WHERE f.region_usager = $1
      ORDER BY q.id ASC
    `, [region]);

    res.json({
      success: true,
      quittances: result.rows,
      total: result.rows.length,
      region,
    });
  } catch (error) {
    console.error('❌ Erreur région:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 3. ✅ DERNIER NUMÉRO (ligne avec id DESC)
// ============================================================
router.get('/quittance/last', async (req, res) => {
  try {
    console.log('📄 GET /api/quittance/last');

    const { dernier, dernierFormate, longueur } = await getDernierNumero();

    const prochain = dernier + 1;
    const prochainLen = Math.max(longueur, String(prochain).length);
    const prochainFormate = formatNumero(prochain, prochainLen);

    console.log(`📊 Dernier (id DESC): ${dernierFormate} (${dernier}) → Prochain: ${prochainFormate} (${prochain})`);

    res.json({
      success: true,
      lastQuittance: dernier,
      lastQuittanceFormate: dernierFormate,
      nextQuittance: prochainFormate,
      nextQuittanceNum: prochain,
      longueurFormat: prochainLen,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 4. RÉFÉRENCE
// ============================================================
router.get('/quittance/reference', async (req, res) => {
  try {
    const { dernier, dernierFormate, longueur } = await getDernierNumero();

    const prochain = dernier + 1;
    const prochainLen = Math.max(longueur, String(prochain).length);

    res.json({
      success: true,
      dernierNumero: dernier,
      dernierNumeroFormate: dernierFormate,
      prochainNumero: formatNumero(prochain, prochainLen),
      prochainNumeroNum: prochain,
      longueurFormat: longueur,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 5. ✅ RÉCUPÉRER LA QUITTANCE D'UNE FACTURE
// ============================================================
router.get('/quittance/facture/:factureId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { factureId } = req.params;

    const factureCheck = await client.query(
      `SELECT id FROM facture_usager WHERE id = $1`,
      [factureId]
    );
    if (factureCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée',
      });
    }

    const result = await client.query(`
      SELECT 
        id,
        id_facture,
        num_quitance,
        num_quitance_formate,
        longueur_format,
        quittance_validee,
        personne_recu,
        created_at,
        updated_at
      FROM quitance_usager
      WHERE id_facture = $1
    `, [factureId]);

    if (result.rows.length === 0) {
      const userId = req.query.userId || null;
      const created = await creerQuittancePourFacture(client, factureId, userId);

      return res.json({
        success: true,
        quittance: created,
        created: true,
        message: 'Quittance créée automatiquement',
      });
    }

    res.json({
      success: true,
      quittance: result.rows[0],
      created: false,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 6. ✅ ENREGISTRER / MODIFIER UNE QUITTANCE
//    → Accepte TOUS les formats : 1, 0001, 0000001, 00000001, 500...
//    → Si la quittance existe → UPDATE (recul ou avancée acceptés)
//    → Si typeB = true → met à jour TOUTES les lignes partageant le même num_quitance
// ============================================================
router.post('/quittance/enregistrer', async (req, res) => {
  const { numero, factureId, userId, personneRecu, typeB } = req.body;

  console.log(`📄 POST /api/quittance/enregistrer - numero="${numero}", factureId=${factureId}, typeB=${typeB}`);

  if (numero === undefined || numero === null || numero === '') {
    return res.status(400).json({
      success: false,
      message: 'Numéro de quittance manquant',
    });
  }

  if (!factureId) {
    return res.status(400).json({
      success: false,
      message: 'factureId obligatoire',
    });
  }

  const client = await pool.connect();
  try {
    const numeroStr = String(numero).replace(/\D/g, '');
    if (!numeroStr) {
      return res.status(400).json({
        success: false,
        message: 'Numéro invalide (aucun chiffre)',
      });
    }

    const numeroInt = parseInt(numeroStr, 10);
    if (isNaN(numeroInt) || numeroInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Numéro invalide (doit être > 0)',
      });
    }

    const longueurSaisie = Math.max(numeroStr.length, LONGUEUR_DEFAUT);
    const numFormate = formatNumero(numeroInt, longueurSaisie);

    console.log(`   → num_quitance=${numeroInt}, format="${numFormate}", longueur=${longueurSaisie}, typeB=${typeB}`);

    await client.query('BEGIN');

    const factureCheck = await client.query(
      `SELECT id, num_facture_type, mois_facture, annee_facture FROM facture_usager WHERE id = $1`,
      [factureId]
    );
    if (factureCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée',
      });
    }

    const factureCourante = factureCheck.rows[0];
    const isTypeB = typeB === true || factureCourante.num_facture_type === 'B';

    let result;
    let lignesModifiees = 0;

    if (isTypeB) {
      // ✅ TYPE B : Modifier TOUTES les lignes quitance_usager des factures
      //    qui partagent le MÊME num_quitance que la facture courante
      const quittanceCourante = await client.query(
        `SELECT num_quitance FROM quitance_usager WHERE id_facture = $1`,
        [factureId]
      );

      if (quittanceCourante.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Quittance de la facture non trouvée',
        });
      }

      const ancienNumero = quittanceCourante.rows[0].num_quitance;

      // Trouver toutes les factures Type B du même groupe (même annee_facture)
      const groupeResult = await client.query(`
        SELECT q.id AS quittance_id, q.id_facture
        FROM quitance_usager q
        INNER JOIN facture_usager f ON f.id = q.id_facture
        WHERE q.num_quitance = $1
          AND f.num_facture_type = 'B'
      `, [ancienNumero]);

      console.log(`   → Type B : ${groupeResult.rows.length} ligne(s) à modifier`);

      // Modifier TOUTES les lignes du groupe
      for (const row of groupeResult.rows) {
        await client.query(`
          UPDATE quitance_usager
          SET num_quitance = $1,
              num_quitance_formate = $2,
              longueur_format = $3,
              quittance_validee = TRUE,
              personne_recu = COALESCE($4, personne_recu),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [numeroInt, numFormate, longueurSaisie, personneRecu || null, row.quittance_id]);
        lignesModifiees++;
      }

      // Retourner la première ligne modifiée
      const retour = await client.query(`
        SELECT id, id_facture, num_quitance, num_quitance_formate, longueur_format
        FROM quitance_usager WHERE id_facture = $1
      `, [factureId]);
      result = { rows: retour.rows };

      console.log(`   ✅ Type B : ${lignesModifiees} ligne(s) modifiée(s) vers ${numFormate}`);
    } else {
      // ✅ Type A / C : Modification simple (une seule ligne)
      const existing = await client.query(
        `SELECT id, num_quitance FROM quitance_usager WHERE id_facture = $1`,
        [factureId]
      );

      if (existing.rows.length > 0) {
        result = await client.query(`
          UPDATE quitance_usager
          SET num_quitance = $1,
              num_quitance_formate = $2,
              longueur_format = $3,
              quittance_validee = TRUE,
              personne_recu = COALESCE($4, personne_recu),
              updated_at = CURRENT_TIMESTAMP
          WHERE id_facture = $5
          RETURNING id, id_facture, num_quitance, num_quitance_formate, longueur_format
        `, [numeroInt, numFormate, longueurSaisie, personneRecu || null, factureId]);
        lignesModifiees = 1;
        console.log(`   ✅ Quittance modifiée: ${numeroInt} (${numFormate})`);
      } else {
        result = await client.query(`
          INSERT INTO quitance_usager (
            id_facture, num_quitance, num_quitance_formate,
            longueur_format, quittance_validee, personne_recu, created_by
          )
          VALUES ($1, $2, $3, $4, TRUE, $5, $6)
          RETURNING id, id_facture, num_quitance, num_quitance_formate, longueur_format
        `, [factureId, numeroInt, numFormate, longueurSaisie, personneRecu || null, userId || null]);
        lignesModifiees = 1;
        console.log(`   ✅ Quittance créée: ${numeroInt} (${numFormate})`);
      }
    }

    if (personneRecu) {
      if (isTypeB) {
        // Mettre à jour personne_recu sur TOUTES les factures du groupe
        await client.query(`
          UPDATE facture_usager
          SET personne_recu = $1
          WHERE id IN (
            SELECT q.id_facture FROM quitance_usager q
            WHERE q.num_quitance = $2 AND q.quittance_validee = TRUE
          )
        `, [personneRecu, numeroInt]);
      } else {
        await client.query(
          `UPDATE facture_usager SET personne_recu = $1 WHERE id = $2`,
          [personneRecu, factureId]
        );
      }
    }

    await client.query('COMMIT');

    const { dernier, dernierFormate, longueur } = await getDernierNumero(client);
    const prochain = dernier + 1;
    const prochainLen = Math.max(longueur, String(prochain).length);
    const prochainFormate = formatNumero(prochain, prochainLen);

    console.log(`✅ Enregistré: dernier=${dernierFormate}, prochain=${prochainFormate}, lignes modifiées=${lignesModifiees}`);

    res.json({
      success: true,
      message: isTypeB
        ? `Quittance ${numFormate} enregistrée pour ${lignesModifiees} facture(s). Prochain : ${prochainFormate}`
        : `Quittance ${numFormate} enregistrée. Prochain : ${prochainFormate}`,
      idFacture: factureId,
      quittanceId: result.rows[0].id,
      numQuitance: numeroInt,
      numQuitanceFormate: numFormate,
      longueurFormat: longueurSaisie,
      dernierNumero: dernier,
      dernierNumeroFormate: dernierFormate,
      prochainNumero: prochainFormate,
      prochainNumeroNum: prochain,
      typeB: isTypeB,
      lignesModifiees,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ============================================================
// 7. ✅ CRÉER UNE QUITTANCE POUR UNE FACTURE
// ============================================================
router.post('/quittance/creer', async (req, res) => {
  const { factureId, userId, numero, personneRecu } = req.body;

  if (!factureId) {
    return res.status(400).json({ success: false, message: 'factureId obligatoire' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const factureCheck = await client.query(
      `SELECT id FROM facture_usager WHERE id = $1`,
      [factureId]
    );
    if (factureCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    const created = await creerQuittanceAvecNumero(
      client,
      factureId,
      numero || null,
      userId || null,
      personneRecu || null
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      quittance: created,
      message: `Quittance ${created.num_quitance_formate} créée`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 8. SUPPRIMER LA QUITTANCE D'UNE FACTURE
// ============================================================
router.delete('/quittance/facture/:factureId', async (req, res) => {
  try {
    const { factureId } = req.params;
    const result = await pool.query(
      `DELETE FROM quitance_usager WHERE id_facture = $1 RETURNING id`,
      [factureId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quittance non trouvée' });
    }

    res.json({ success: true, message: 'Quittance supprimée' });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 9. STATISTIQUES
// ============================================================
router.get('/quitance/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.region_usager,
        COUNT(*) AS total,
        SUM(f.soit_total) AS total_montant,
        MIN(q.num_quitance) AS premier_quittance,
        MAX(q.num_quitance) AS dernier_quittance
      FROM quitance_usager q
      INNER JOIN facture_usager f ON f.id = q.id_facture
      GROUP BY f.region_usager
      ORDER BY f.region_usager
    `);

    const totalGlobal = result.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const montantGlobal = result.rows.reduce((sum, r) => sum + parseFloat(r.total_montant || 0), 0);

    res.json({
      success: true,
      stats: result.rows,
      totalGlobal,
      montantGlobal,
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 10. ✅ VÉRIFIER LA SYNCHRONISATION
// ============================================================
router.get('/quitance/sync', async (req, res) => {
  const client = await pool.connect();
  try {
    const facturesCount = await client.query(`SELECT COUNT(*) AS total FROM facture_usager`);
    const quitancesCount = await client.query(`SELECT COUNT(*) AS total FROM quitance_usager`);

    const totalFactures = parseInt(facturesCount.rows[0].total);
    const totalQuitances = parseInt(quitancesCount.rows[0].total);

    const manquantes = await client.query(`
      SELECT f.id
      FROM facture_usager f
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      WHERE q.id IS NULL
      ORDER BY f.id ASC
    `);

    let corrigees = 0;
    if (manquantes.rows.length > 0) {
      await client.query('BEGIN');
      for (const row of manquantes.rows) {
        await creerQuittancePourFacture(client, row.id, null);
        corrigees++;
      }
      await client.query('COMMIT');
    }

    const nouvelleCount = await client.query(`SELECT COUNT(*) AS total FROM quitance_usager`);

    res.json({
      success: true,
      totalFactures,
      totalQuitancesAvant: totalQuitances,
      totalQuitancesApres: parseInt(nouvelleCount.rows[0].total),
      quittancesManquantes: manquantes.rows.length,
      quittancesCorrigees: corrigees,
      synchronise: totalFactures === parseInt(nouvelleCount.rows[0].total),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 11. TEST
// ============================================================
router.get('/quitance/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route quitance fonctionne (quitance_usager, ordre id DESC)',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
module.exports.creerQuittancePourFacture = creerQuittancePourFacture;
module.exports.creerQuittanceAvecNumero = creerQuittanceAvecNumero;
module.exports.getDernierNumero = getDernierNumero;
module.exports.formatNumero = formatNumero;