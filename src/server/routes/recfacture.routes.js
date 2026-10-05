// server/routes/recfacture.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

console.log('✅ Routeur recfacture chargé');

// ============================================================
// 1. RÉCUPÉRER LE NOM DU DAF
// ============================================================
const getDAFName = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'utilisateurs'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Table utilisateurs n\'existe pas');
      return 'Directeur Financier';
    }

    const result = await pool.query(
      `SELECT nom FROM utilisateurs WHERE role = 'daf' AND statut = 'actif' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return result.rows[0].nom;
    }

    const fallbackResult = await pool.query(
      `SELECT nom FROM utilisateurs WHERE role = 'super_admin' AND statut = 'actif' LIMIT 1`
    );
    if (fallbackResult.rows.length > 0) {
      return fallbackResult.rows[0].nom;
    }

    return 'Directeur Financier';
  } catch (error) {
    console.error('❌ Erreur récupération DAF:', error);
    return 'Directeur Financier';
  }
};

// ============================================================
// 1.b VÉRIFIER SI UNE COLONNE EXISTE DANS UNE TABLE
// ============================================================
const columnExists = async (tableName, columnName) => {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch {
    return false;
  }
};

// ============================================================
// 2. RÉCUPÉRER TOUTES LES FACTURES
// ============================================================
router.get('/recfacture/factures', async (req, res) => {
  try {
    console.log('📄 GET /api/recfacture/factures appelée');

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
        factures: [],
        total: 0,
        message: 'Aucune facture trouvée'
      });
    }

    // Vérifier si la table quitance_usager existe
    const quittanceTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'quitance_usager'
      )
    `);
    const hasQuittanceTable = quittanceTableCheck.rows[0].exists;

    // Vérifier si les colonnes de renouvellement existent
    const renouvColCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'facture_usager' 
      AND column_name IN ('is_renouvellement', 'frais_renouvellement')
    `);
    const hasRenouvCols = renouvColCheck.rows.length === 2;

    const renouvSelect = hasRenouvCols 
      ? ', f.is_renouvellement, f.frais_renouvellement' 
      : ', false as is_renouvellement, 0 as frais_renouvellement';

    // Vérifier les colonnes optionnelles
    const hasSuffixe = await columnExists('facture_usager', 'suffixe');
    const hasDescPerso = await columnExists('facture_usager', 'description_personnalisee');
    const hasMoisGroupes = await columnExists('facture_usager', 'mois_groupes');
    const hasTypeGroupe = await columnExists('facture_usager', 'type_groupe');
    const hasNumFactureType = await columnExists('facture_usager', 'num_facture_type');

    const optionalSelect = [
      hasNumFactureType ? 'f.num_facture_type' : "'A' as num_facture_type",
      hasSuffixe ? 'f.suffixe' : "'' as suffixe",
      hasDescPerso ? 'f.description_personnalisee' : 'NULL as description_personnalisee',
      hasMoisGroupes ? 'f.mois_groupes' : 'NULL as mois_groupes',
      hasTypeGroupe ? 'f.type_groupe' : "'A' as type_groupe",
    ].join(', ');

    // ✅ Construction du SELECT avec JOIN quitance_usager
    let query;
    if (hasQuittanceTable) {
      query = `
        SELECT 
          f.id, 
          f.ref_omda, 
          f.num_facture, 
          ${optionalSelect},
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
          f.montant_mensuel,
          f.frais_dossier, 
          f.montant_retard, 
          f.is_retard,
          f.soit_total, 
          f.uniter, 
          f.statut, 
          f.personne_recu,
          f.mois_facture, 
          f.annee_facture, 
          f.suffixe,
          f.description_personnalisee,
          f.representant_nom,
          f.representant_adresse,
          f.representant_tel,
          f.representant_cin,
          f.representant_fonction,
          f.activite,
          f.siege,
          f.nif,
          f.stat,
          f.taux,
          f.created_at, 
          f.created_by,
          f.updated_at,
          q.num_quitance,
          q.num_quitance_formate AS quittance,
          q.quittance_validee
          ${renouvSelect}
        FROM facture_usager f
        LEFT JOIN quitance_usager q ON q.id_facture = f.id
        ORDER BY f.created_at DESC
      `;
    } else {
      // Fallback sans table quitance_usager
      query = `
        SELECT 
          f.id, 
          f.ref_omda, 
          f.num_facture, 
          ${optionalSelect},
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
          f.montant_mensuel,
          f.frais_dossier, 
          f.montant_retard, 
          f.is_retard,
          f.soit_total, 
          f.uniter, 
          f.statut, 
          f.personne_recu,
          f.mois_facture, 
          f.annee_facture, 
          f.suffixe,
          f.description_personnalisee,
          f.representant_nom,
          f.representant_adresse,
          f.representant_tel,
          f.representant_cin,
          f.representant_fonction,
          f.activite,
          f.siege,
          f.nif,
          f.stat,
          f.taux,
          f.created_at, 
          f.created_by,
          f.updated_at,
          NULL as num_quitance,
          NULL as quittance,
          NULL as quittance_validee
          ${renouvSelect}
        FROM facture_usager f
        ORDER BY f.created_at DESC
      `;
    }

    const result = await pool.query(query);

    console.log(`✅ ${result.rows.length} factures récupérées`);

    const dafName = await getDAFName();

    res.json({
      success: true,
      factures: result.rows,
      total: result.rows.length,
      dafName: dafName
    });

  } catch (error) {
    console.error('❌ Erreur récupération factures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des factures',
      error: error.message
    });
  }
});

// ============================================================
// 3. RÉCUPÉRER LE NOM DU DAF
// ============================================================
router.get('/recfacture/daf-name', async (req, res) => {
  try {
    console.log('📄 GET /api/recfacture/daf-name appelée');
    const dafName = await getDAFName();
    res.json({
      success: true,
      dafName: dafName
    });
  } catch (error) {
    console.error('❌ Erreur récupération DAF:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 4. RÉCUPÉRER UNE FACTURE PAR ID
// ============================================================
router.get('/recfacture/factures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 GET /api/recfacture/factures/${id} appelée`);

    // Vérifier si les colonnes de renouvellement existent
    const renouvColCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'facture_usager' 
      AND column_name IN ('is_renouvellement', 'frais_renouvellement')
    `);
    const hasRenouvCols = renouvColCheck.rows.length === 2;

    const renouvSelect = hasRenouvCols 
      ? ', is_renouvellement, frais_renouvellement' 
      : ', false as is_renouvellement, 0 as frais_renouvellement';

    const result = await pool.query(
      `SELECT f.* ${renouvSelect},
              q.num_quitance, q.num_quitance_formate AS quittance, q.quittance_validee
       FROM facture_usager f
       LEFT JOIN quitance_usager q ON q.id_facture = f.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const dafName = await getDAFName();
    result.rows[0].daf_nom = dafName;

    res.json({
      success: true,
      facture: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur récupération facture:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 5. ROUTE DE TEST
// ============================================================
router.get('/recfacture/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route recfacture fonctionne correctement',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 6. RÉCUPÉRER LE DERNIER NUMÉRO DE QUITTANCE
// ============================================================
router.get('/recfacture/quittance/last', async (req, res) => {
  try {
    console.log('📄 GET /api/recfacture/quittance/last appelée');

    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'quitance_usager'
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
      SELECT COALESCE(MAX(num_quitance), 0) as max_quittance 
      FROM quitance_usager 
      WHERE num_quitance IS NOT NULL AND num_quitance > 0
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
    console.error('❌ Erreur récupération quittance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 7. CORRECTION DE TOUS LES QUITTANCES (SCRIPT DE RATTRAPAGE)
// ============================================================
router.post('/recfacture/quittance/repair', async (req, res) => {
  try {
    console.log('🔧 RÉPARATION DES QUITTANCES...');

    const factures = await pool.query(`
      SELECT f.id, f.num_facture, f.num_facture_type, f.ref_client_type, 
             q.num_quitance AS quittance, f.created_at, f.type_groupe, f.suffixe,
             f.mois_facture, f.annee_facture
      FROM facture_usager f
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      ORDER BY f.created_at ASC, f.id ASC
    `);

    if (factures.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune facture à corriger'
      });
    }

    let corrections = [];
    let currentQuittance = 1;
    let errors = [];

    for (const facture of factures.rows) {
      const numFacture = facture.num_facture;
      const typeFacture = facture.num_facture_type;

      let newQuittance = currentQuittance;

      if (typeFacture === 'B') {
        const baseNum = numFacture.split('-')[0];
        const existing = corrections.find(c => c.num_facture_base === baseNum && c.type === 'B');
        if (existing) {
          newQuittance = existing.quittance;
        }
      }

      if (facture.quittance === newQuittance) {
        if (typeFacture === 'B') {
          const baseNum = numFacture.split('-')[0];
          corrections.push({
            id: facture.id,
            num_facture: facture.num_facture,
            type: typeFacture,
            quittance: newQuittance,
            num_facture_base: baseNum,
            status: 'deja_correct'
          });
        }
        currentQuittance = Math.max(currentQuittance, newQuittance + 1);
        continue;
      }

      try {
        const numeroStr = String(newQuittance).padStart(7, '0');
        
        // Mettre à jour ou insérer dans quitance_usager
        const existingQ = await pool.query(
          `SELECT id FROM quitance_usager WHERE id_facture = $1`,
          [facture.id]
        );

        if (existingQ.rows.length > 0) {
          await pool.query(
            `UPDATE quitance_usager 
             SET num_quitance = $1, num_quitance_formate = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id_facture = $3`,
            [newQuittance, numeroStr, facture.id]
          );
        } else {
          await pool.query(
            `INSERT INTO quitance_usager (id_facture, num_quitance, num_quitance_formate, longueur_format, quittance_validee)
             VALUES ($1, $2, $3, 7, FALSE)`,
            [facture.id, newQuittance, numeroStr]
          );
        }
        
        const baseNum = typeFacture === 'B' ? numFacture.split('-')[0] : numFacture;
        
        corrections.push({
          id: facture.id,
          num_facture: facture.num_facture,
          type: typeFacture,
          old_quittance: facture.quittance,
          new_quittance: newQuittance,
          num_facture_base: baseNum
        });
        
        if (typeFacture === 'A') {
          currentQuittance = newQuittance + 1;
        } else if (typeFacture === 'B') {
          const baseNum = numFacture.split('-')[0];
          const existingB = corrections.find(c => 
            c.num_facture_base === baseNum && 
            c.type === 'B' && 
            c.id !== facture.id
          );
          if (!existingB) {
            currentQuittance = newQuittance + 1;
          }
        }
        
      } catch (err) {
        errors.push({
          id: facture.id,
          num_facture: facture.num_facture,
          error: err.message
        });
      }
    }

    const nextQuittanceResult = await pool.query(`
      SELECT COALESCE(MAX(num_quitance), 0) as max_quittance 
      FROM quitance_usager 
      WHERE num_quitance IS NOT NULL AND num_quitance > 0
    `);
    const nextQuittance = String(parseInt(nextQuittanceResult.rows[0].max_quittance) + 1).padStart(7, '0');

    res.json({
      success: true,
      message: `✅ ${corrections.length} quittances corrigées`,
      corrections: corrections,
      errors: errors,
      nextQuittance: nextQuittance
    });

  } catch (error) {
    console.error('❌ Erreur réparation quittances:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// 8. MISE À JOUR D'UNE FACTURE (PATCH)
// ============================================================
router.patch('/recfacture/factures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`📝 PATCH /api/recfacture/factures/${id} appelée`);
    console.log('📦 Données:', updates);

    const allowedFields = [
      'type_facture', 'personne_recu',
      'denomination', 'demandeur', 'telephone', 'email', 'adresse',
      'region_usager',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_cin_delivree', 'representant_cin_lieu',
      'representant_fonction',
      'activite', 'etoiles', 'ravinala',
      'nombre_magasins', 'nombre_vehicules', 'lignes', 'type_bus',
      'trajet', 'horaires', 'zones_desservies', 'jauge_max',
      'frequence', 'canal', 'siege', 'nif', 'stat', 'taux',
      'organisateurs', 'representant_par', 'genre_manifestation',
      'artistes', 'date_evenement', 'lieu_evenement', 'domicile',
      'lieu_ajout', 'date_signature', 'confirmation_nom',
      'moyens_communication', 'a_compter_du', 'echeance',
      'montant_mensuel', 'frais_dossier', 'montant_retard',
      'is_retard', 'soit_total', 'uniter',
      'description_personnalisee', 'suffixe',
      'is_renouvellement', 'frais_renouvellement'
    ];

    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Gestion séparée de quittance (stockée dans quitance_usager)
    const quittanceUpdate = updates.quittance;

    // Recalculer soit_total si les montants changent
    if (filteredUpdates.montant_mensuel !== undefined || 
        filteredUpdates.frais_dossier !== undefined || 
        filteredUpdates.uniter !== undefined ||
        filteredUpdates.is_renouvellement !== undefined ||
        filteredUpdates.frais_renouvellement !== undefined) {
      
      const currentResult = await pool.query(
        `SELECT montant_mensuel, frais_dossier, montant_retard, is_retard, uniter,
                is_renouvellement, frais_renouvellement
         FROM facture_usager WHERE id = $1`,
        [id]
      );
      
      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        const montantMensuel = filteredUpdates.montant_mensuel !== undefined ? filteredUpdates.montant_mensuel : current.montant_mensuel;
        const fraisDossier = filteredUpdates.frais_dossier !== undefined ? filteredUpdates.frais_dossier : current.frais_dossier;
        const montantRetard = filteredUpdates.montant_retard !== undefined ? filteredUpdates.montant_retard : current.montant_retard;
        const isRetard = filteredUpdates.is_retard !== undefined ? filteredUpdates.is_retard : current.is_retard;
        const uniter = filteredUpdates.uniter !== undefined ? filteredUpdates.uniter : current.uniter;
        const isRenouvellement = filteredUpdates.is_renouvellement !== undefined ? filteredUpdates.is_renouvellement : current.is_renouvellement;
        const fraisRenouvellement = filteredUpdates.frais_renouvellement !== undefined ? filteredUpdates.frais_renouvellement : current.frais_renouvellement;
        
        const baseTotal = (parseFloat(montantMensuel) || 0) * (parseInt(uniter) || 1);
        let total = baseTotal + (parseFloat(fraisDossier) || 0) + (isRetard ? (parseFloat(montantRetard) || 0) : 0);
        if (isRenouvellement && fraisRenouvellement > 0) {
          total += parseFloat(fraisRenouvellement) || 0;
        }
        filteredUpdates.soit_total = total;
      }
    }

    // Mettre à jour facture_usager
    const keys = Object.keys(filteredUpdates);
    if (keys.length > 0) {
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(filteredUpdates)];

      await pool.query(
        `UPDATE facture_usager 
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        values
      );
    }

    // Mettre à jour quittance si fournie
    if (quittanceUpdate !== undefined && quittanceUpdate !== null) {
      const clean = String(quittanceUpdate).replace(/\D/g, '');
      if (clean) {
        const numQuittance = parseInt(clean, 10);
        const numFormate = String(numQuittance).padStart(7, '0');

        const existingQ = await pool.query(
          `SELECT id FROM quitance_usager WHERE id_facture = $1`,
          [id]
        );

        if (existingQ.rows.length > 0) {
          await pool.query(
            `UPDATE quitance_usager 
             SET num_quitance = $1, num_quitance_formate = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id_facture = $3`,
            [numQuittance, numFormate, id]
          );
        } else {
          await pool.query(
            `INSERT INTO quitance_usager (id_facture, num_quitance, num_quitance_formate, longueur_format, quittance_validee)
             VALUES ($1, $2, $3, 7, FALSE)`,
            [id, numQuittance, numFormate]
          );
        }
      }
    }

    // Récupérer la facture mise à jour avec la quittance
    const result = await pool.query(
      `SELECT f.*, 
              q.num_quitance, q.num_quitance_formate AS quittance, q.quittance_validee
       FROM facture_usager f
       LEFT JOIN quitance_usager q ON q.id_facture = f.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const dafName = await getDAFName();
    result.rows[0].daf_nom = dafName;

    res.json({
      success: true,
      message: 'Facture mise à jour avec succès',
      facture: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour facture:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;