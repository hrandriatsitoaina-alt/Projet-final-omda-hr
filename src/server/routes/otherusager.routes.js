// server/routes/otherusager.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ============================================================
// HELPERS
// ============================================================

// ✅ Récupère le dernier numéro de quittance (table facture_usager)
const getLastQuittanceNumber = async (client = pool) => {
  try {
    const result = await client.query(`
      SELECT MAX(quittance) as max_quittance 
      FROM facture_usager 
      WHERE quittance IS NOT NULL AND quittance > 0
    `);
    if (result.rows.length > 0 && result.rows[0].max_quittance !== null) {
      return parseInt(result.rows[0].max_quittance, 10);
    }
    return 0;
  } catch (error) {
    console.error('❌ Erreur récupération quittance:', error);
    return 0;
  }
};

const formatQuittance = (num) => {
  const n = parseInt(num, 10) || 0;
  return String(n).padStart(7, '0');
};

// ✅ Récupère le nom du DAF
const getDAFName = async () => {
  try {
    const result = await pool.query(
      `SELECT nom FROM utilisateurs WHERE role = 'daf' AND statut = 'actif' LIMIT 1`
    );
    if (result.rows.length > 0) return result.rows[0].nom;
    return 'Directeur Financier';
  } catch {
    return 'Directeur Financier';
  }
};

// ============================================================
// POST - Créer un usager_other + paiement + facture (TOUT EN UN)
// ============================================================
router.post('/other-usagers/creer-complet', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('📥 ROUTE /other-usagers/creer-complet appelée');

    const {
      type,
      identification,
      representant,
      paiement,
      userId,
      quittance: frontQuittance,
      personneRecu
    } = req.body;

    // ✅ Validations
    if (!type || !identification?.denomination) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Type et dénomination sont obligatoires'
      });
    }

    if (!paiement?.mode) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le mode de paiement est obligatoire'
      });
    }

    if (!paiement?.lignes || paiement.lignes.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Au moins une ligne de facture est requise'
      });
    }

    // ✅ Quittance : utiliser celle fournie OU prendre la suivante
    let nextQuittance = frontQuittance
      ? parseInt(String(frontQuittance).replace(/\D/g, ''), 10)
      : (await getLastQuittanceNumber(client) + 1);

    if (!nextQuittance || isNaN(nextQuittance)) {
      nextQuittance = (await getLastQuittanceNumber(client)) + 1;
    }

    // ✅ 1. Insérer dans usager_other
    const insertUsager = await client.query(`
      INSERT INTO usager_other (
        type_usager, denomination, nom, prenom, telephone, email, adresse, region,
        representant_par, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_contact,
        mode_paiement, quittance, quittance_validee, personne_recu,
        numero_dossier_utilisateur, numero_dossier_global,
        created_by, statut
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, 'actif'
      ) RETURNING id
    `, [
      type,
      identification.denomination,
      identification.nom || null,
      identification.prenom || null,
      identification.telephone || null,
      identification.email || null,
      identification.adresse || null,
      identification.region || null,
      representant?.representantPar || null,
      representant?.cin || null,
      representant?.cinDelivree || null,
      representant?.cinLieu || null,
      representant?.contact || null,
      paiement.mode,
      nextQuittance,
      true, // ✅ quittance validée automatiquement
      personneRecu || null,
      null,
      null,
      userId || null
    ]);

    const usagerOtherId = insertUsager.rows[0].id;
    console.log(`✅ usager_other créé, ID: ${usagerOtherId}`);

    // ✅ 2. Insérer les lignes (RAKOTONAIVO, WEB, CD...)
    let totalLignes = 0;
    for (let i = 0; i < paiement.lignes.length; i++) {
      const l = paiement.lignes[i];
      const montantLigne = (parseFloat(l.pu) || 0) * (parseInt(l.uniter) || 1);
      totalLignes += montantLigne;

      await client.query(`
        INSERT INTO other_lignes (usager_other_id, description, uniter, pu, montant, ordre)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        usagerOtherId,
        l.description,
        parseInt(l.uniter) || 1,
        parseFloat(l.pu) || 0,
        montantLigne,
        i
      ]);
    }
    console.log(`✅ ${paiement.lignes.length} lignes insérées, total: ${totalLignes}`);

    // ✅ 3. Insérer dans paiements
    const fraisDossier = parseFloat(paiement.frais_dossier) || 0;
    const montantRetard = parseFloat(paiement.montant_retard) || 0;
    const isRetard = paiement.is_retard || false;
    const soitTotal = totalLignes + fraisDossier + (isRetard ? montantRetard : 0);

    const typePaiement = paiement.mode; // 'mensuel' ou 'unique'

    if (typePaiement === 'unique') {
      // ✅ Paiement unique (comme OCC)
      await client.query(`
        INSERT INTO paiements 
        (usager_id, usager_type, type_paiement, montant, date_paiement, statut,
         frais_dossier, montant_retard, est_retard, reference)
        VALUES ($1, 'other', 'unique', $2, CURRENT_DATE, 'paye', $3, $4, $5, $6)
      `, [
        usagerOtherId,
        soitTotal,
        fraisDossier,
        isRetard ? montantRetard : 0,
        isRetard,
        `OTHER-${usagerOtherId}`
      ]);
      console.log('✅ Paiement unique enregistré');
    } else {
      // ✅ Paiement mensuel
      const annee = new Date().getFullYear();
      const mois = new Date().getMonth() + 1;
      await client.query(`
        INSERT INTO paiements 
        (usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, statut,
         frais_dossier, montant_retard, est_retard, reference)
        VALUES ($1, 'other', 'mensuel', $2, $3, $4, CURRENT_DATE, 'paye', $5, $6, $7, $8)
      `, [
        usagerOtherId,
        annee,
        mois,
        soitTotal,
        fraisDossier,
        isRetard ? montantRetard : 0,
        isRetard,
        `OTHER-${usagerOtherId}-${annee}-${mois}`
      ]);
      console.log(`✅ Paiement mensuel enregistré (${mois}/${annee})`);
    }

    // ✅ 4. Créer la facture dans facture_usager
    const refResult = await client.query(
      `SELECT COALESCE(MAX(ref_omda), 0) + 1 AS new_ref FROM facture_usager`
    );
    const newRefOmda = refResult.rows[0].new_ref;

    const numFacture = String(newRefOmda).padStart(4, '0');
    const typeMapping = { cd: 'CD', mp3: 'MP3', 'oeuvre-web': 'WEB', hologramme: 'HOL', video: 'VID', autre: 'AUT' };
    const refClientType = typeMapping[type] || 'OTH';

    // ✅ Construire la description personnalisée (pour PDF)
    const descriptionPersonnalisee = paiement.lignes.map(l =>
      `${l.description} (U:${l.uniter} × ${parseFloat(l.pu).toLocaleString()} Ar = ${(parseFloat(l.pu) * parseInt(l.uniter)).toLocaleString()} Ar)`
    ).join('\n');

    const insertFacture = await client.query(`
      INSERT INTO facture_usager (
        ref_omda, num_facture, num_facture_type, ref_client_type,
        ref_usager, type_facture, region_usager, date_ajout,
        denomination, demandeur, telephone, email, adresse,
        representant_nom, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_tel,
        montant_mensuel, frais_dossier, montant_retard, is_retard, soit_total, uniter,
        quittance, quittance_validee, personne_recu,
        description_personnalisee,
        statut, created_by, mois_facture, annee_facture,
        numero_dossier_utilisateur, numero_dossier_global
      ) VALUES (
        $1, $2, 'A', $3,
        $4, 'DAFC', $5, CURRENT_DATE,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24,
        $25,
        'validee', $26, $27, $28,
        $29, $30
      ) RETURNING id, ref_omda, num_facture
    `, [
      newRefOmda,
      numFacture,
      refClientType,
      usagerOtherId,
      identification.region || '',
      identification.denomination,
      identification.denomination, // demandeur = denomination par défaut
      identification.telephone || '',
      identification.email || '',
      identification.adresse || '',
      representant?.representantPar || '',
      representant?.cin || '',
      representant?.cinDelivree || null,
      representant?.cinLieu || '',
      representant?.contact || '',
      totalLignes, // montant_mensuel = total des lignes
      fraisDossier,
      isRetard ? montantRetard : 0,
      isRetard,
      soitTotal,
      1, // uniter global
      nextQuittance,
      true,
      personneRecu || '',
      descriptionPersonnalisee,
      userId || null,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
      null,
      null
    ]);

    const factureId = insertFacture.rows[0].id;
    console.log(`✅ Facture créée, ID: ${factureId}`);

    // ✅ Récupérer le nom du DAF
    const dafName = await getDAFName();

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Usager événementiel, paiement et facture créés avec succès',
      usagerOtherId,
      factureId,
      refOmda: newRefOmda,
      numFacture,
      quittance: formatQuittance(nextQuittance),
      quittanceNumber: nextQuittance,
      soitTotal,
      dafName,
      lignes: paiement.lignes.length,
      modePaiement: typePaiement
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création other-usager:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================================
// GET - Liste des usagers_other
// ============================================================
router.get('/other-usagers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT uo.*,
        (SELECT json_agg(json_build_object(
          'id', ol.id,
          'description', ol.description,
          'uniter', ol.uniter,
          'pu', ol.pu,
          'montant', ol.montant
        ) ORDER BY ol.ordre)
        FROM other_lignes ol WHERE ol.usager_other_id = uo.id) AS lignes,
        (SELECT json_build_object(
          'montant', p.montant,
          'frais_dossier', p.frais_dossier,
          'montant_retard', p.montant_retard,
          'date_paiement', p.date_paiement,
          'statut', p.statut
        ) FROM paiements p
        WHERE p.usager_id = uo.id AND p.usager_type = 'other'
        ORDER BY p.created_at DESC LIMIT 1) AS paiement
      FROM usager_other uo
      ORDER BY uo.created_at DESC
    `);

    res.json({
      success: true,
      usagers: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération usagers_other:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      usagers: []
    });
  }
});

// ============================================================
// GET - Dernier numéro de quittance (pour le front)
// ============================================================
router.get('/other-usagers/quittance/last', async (req, res) => {
  try {
    const lastNum = await getLastQuittanceNumber();
    const nextNum = lastNum + 1;
    res.json({
      success: true,
      lastQuittance: lastNum,
      nextQuittance: formatQuittance(nextNum),
      nextQuittanceNumber: nextNum
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Une facture other par ID
// ============================================================
router.get('/other-usagers/facture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT fu.*,
        (SELECT json_agg(json_build_object(
          'description', ol.description,
          'uniter', ol.uniter,
          'pu', ol.pu,
          'montant', ol.montant
        ) ORDER BY ol.ordre)
        FROM other_lignes ol WHERE ol.usager_other_id = fu.ref_usager) AS lignes
      FROM facture_usager fu
      WHERE fu.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }

    const dafName = await getDAFName();
    const facture = result.rows[0];
    facture.daf_nom = dafName;
    if (facture.quittance) facture.quittance = formatQuittance(facture.quittance);

    res.json({ success: true, facture });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;