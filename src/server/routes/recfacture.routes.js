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

    const result = await pool.query(`
      SELECT 
        id, 
        ref_omda, 
        num_facture, 
        num_facture_type,
        ref_client_type, 
        ref_usager, 
        type_facture,
        region_usager, 
        date_ajout, 
        denomination,
        demandeur, 
        telephone, 
        email,
        adresse,
        montant_mensuel,
        frais_dossier, 
        montant_retard, 
        is_retard,
        soit_total, 
        uniter, 
        statut, 
        personne_recu,
        quittance, 
        quittance_validee,
        mois_facture, 
        annee_facture, 
        mois_groupes, 
        type_groupe,
        suffixe, 
        description_personnalisee,
        representant_nom,
        representant_adresse,
        representant_tel,
        representant_cin,
        representant_fonction,
        activite,
        siege,
        nif,
        stat,
        taux,
        created_at, 
        created_by,
        updated_at
        ${renouvSelect}
      FROM facture_usager 
      ORDER BY created_at DESC
    `);

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
      `SELECT * ${renouvSelect} FROM facture_usager WHERE id = $1`,
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
      SELECT id, num_facture, num_facture_type, ref_client_type, 
             quittance, created_at, type_groupe, suffixe,
             mois_facture, annee_facture
      FROM facture_usager 
      ORDER BY created_at ASC, id ASC
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
        await pool.query(
          `UPDATE facture_usager 
           SET quittance = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [newQuittance, facture.id]
        );
        
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
      SELECT COALESCE(MAX(quittance), 0) as max_quittance 
      FROM facture_usager 
      WHERE quittance IS NOT NULL AND quittance > 0
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
// 8. NOUVEAU : MISE À JOUR D'UNE FACTURE (PATCH)
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
      'quittance', 'quittance_validee',
      'description_personnalisee', 'suffixe',
      'is_renouvellement', 'frais_renouvellement'
    ];

    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        if (key === 'quittance') {
          const clean = String(updates[key]).replace(/\D/g, '');
          filteredUpdates[key] = clean ? parseInt(clean, 10) : null;
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    }

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

    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];

    const result = await pool.query(
      `UPDATE facture_usager 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const dafName = await getDAFName();
    result.rows[0].daf_nom = dafName;

    if (result.rows[0].quittance !== null && result.rows[0].quittance !== undefined) {
      result.rows[0].quittance = String(result.rows[0].quittance).padStart(7, '0');
    }

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