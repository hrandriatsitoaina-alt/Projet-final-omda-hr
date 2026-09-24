// server/routes/other.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
// ============================================================
// PUT - Modifier un usager OTHER (Autre)
// ============================================================
router.put('/usagers/other/:id', async (req, res) => {
  const { id } = req.params;
  const {
    denomination, nom, prenom, telephone, email, adresse, region,
    representant_par, representant_cin, representant_cin_delivree,
    representant_cin_lieu, representant_contact, mode_paiement,
  } = req.body;

  if (!denomination) {
    return res.status(400).json({ success: false, message: 'La dénomination est obligatoire' });
  }

  try {
    const check = await pool.query(`SELECT id FROM usager_other WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usager "Autre" non trouvé' });
    }

    const fields = [];
    const values = [];
    let i = 1;

    const push = (col, val) => {
      if (val !== undefined && val !== null && val !== '') {
        fields.push(`${col} = $${i}`);
        values.push(val);
        i++;
      }
    };

    push('denomination', denomination);
    push('nom', nom);
    push('prenom', prenom);
    push('telephone', telephone);
    push('email', email);
    push('adresse', adresse);
    push('region', region);
    push('representant_par', representant_par);
    push('representant_cin', representant_cin);
    if (representant_cin_delivree) push('representant_cin_delivree', representant_cin_delivree);
    push('representant_cin_lieu', representant_cin_lieu);
    push('representant_contact', representant_contact);
    push('mode_paiement', mode_paiement);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE usager_other SET ${fields.join(', ')} WHERE id = $${i}`;
    await pool.query(query, values);

    res.json({ success: true, message: 'Usager "Autre" modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur PUT /usagers/other/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ============================================================
// POST - Créer un usager événementiel + ses lignes
//        (SANS créer le paiement - c'est le frontend qui le fait)
// ============================================================
router.post('/other-usagers/creer-complet', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { type, identification, representant, paiement, userId, quittance, personneRecu } = req.body;

    // 1. Créer l'usager_other
    const usagerResult = await client.query(
      `INSERT INTO omda_app.usager_other 
       (type_usager, denomination, nom, prenom, telephone, email, adresse, region,
        representant_par, representant_cin, representant_cin_delivree, representant_cin_lieu,
        representant_contact, mode_paiement, quittance, quittance_validee, personne_recu, created_by, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE, $16, $17, 'actif')
       RETURNING id`,
      [
        type,
        identification.denomination,
        identification.nom || null,
        identification.prenom || null,
        identification.telephone || null,
        identification.email || null,
        identification.adresse || null,
        identification.region || null,
        representant.representantPar || null,
        representant.cin || null,
        representant.cinDelivree || null,
        representant.cinLieu || null,
        representant.contact || null,
        paiement.mode || 'unique',
        quittance || null,
        personneRecu || null,
        userId || null,
      ]
    );
    const usagerOtherId = usagerResult.rows[0].id;

    // 2. Insérer les lignes de facture
    const lignes = paiement.lignes || [];
    for (const ligne of lignes) {
      const montant = parseFloat(ligne.pu) * (parseInt(ligne.uniter) || 1);
      await client.query(
        `INSERT INTO omda_app.other_lignes (usager_other_id, description, uniter, pu, montant)
         VALUES ($1, $2, $3, $4, $5)`,
        [usagerOtherId, ligne.description, ligne.uniter || 1, ligne.pu || 0, montant]
      );
    }

    // 3. Calculer le total
    const totalLignes = lignes.reduce(
      (acc, l) => acc + (parseFloat(l.pu) || 0) * (parseInt(l.uniter) || 1),
      0
    );
    const fraisDossier = parseFloat(paiement.frais_dossier) || 0;
    const montantRetard = parseFloat(paiement.montant_retard) || 0;
    const soitTotal = totalLignes + fraisDossier + montantRetard;

    await client.query('COMMIT');

    // ✅ On renvoie les infos, SANS enregistrer le paiement
    //    Le frontend appellera /paiements/enregistrer juste après
    res.json({
      success: true,
      usagerOtherId,
      soitTotal,
      fraisDossier,
      montantRetard,
      quittance,
      modePaiement: paiement.mode || 'unique'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur creer-complet:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;