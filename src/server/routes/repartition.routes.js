// server/routes/repartition.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

console.log('✅ Routeur repartition chargé');

// ============================================================
// 1. RÉCUPÉRER TOUS LES ÉVÉNEMENTS OCC (avec JOIN paiements)
// ✅ montant_total calculé : paiement réel sinon base+frais+retard
// ============================================================
router.get('/repartition/occ/events', async (req, res) => {
  try {
    console.log('📄 GET /api/repartition/occ/events appelée');

    const query = `
      SELECT
        uo.id,
        uo.demandeur,
        uo.denomination,
        uo.adresse_siege AS adresse,
        uo.telephone,
        uo.email,
        uo.lieu_evenement AS lieu,
        uo.date_evenement AS date_event,
        uo.nom_evenement,
        uo.organisateurs,
        uo.representant_par,
        uo.genre_manifestation,
        uo.artistes,
        uo.confirmation_nom,
        uo.date_signature,
        uo.lieu_ajout,
        uo.region,
        uo.uniter,
        uo.numero_dossier_global,
        uo.numero_dossier_utilisateur,
        uo.created_at,
        uo.created_by,
        uo.date_ajout,

        -- ✅ MONTANT DE BASE
        COALESCE(uo.montant, 0) AS montant_base,

        -- ✅ FRAIS DE DOSSIER
        COALESCE(uo.frais_dossier, 0) AS frais_dossier,

        -- ✅ PÉNALITÉ / RETARD
        COALESCE(uo.montant_retard, 0) AS montant_retard,

        -- ✅ MONTANT TOTAL : paiement réel sinon base+frais+retard
        CASE
          WHEN p.montant IS NOT NULL THEN p.montant
          ELSE COALESCE(uo.montant, 0) + COALESCE(uo.frais_dossier, 0) + COALESCE(uo.montant_retard, 0)
        END AS montant_total,

        -- ✅ Champ montant (compatibilité) = montant_total
        CASE
          WHEN p.montant IS NOT NULL THEN p.montant
          ELSE COALESCE(uo.montant, 0) + COALESCE(uo.frais_dossier, 0) + COALESCE(uo.montant_retard, 0)
        END AS montant,

        -- ✅ soit_total
        COALESCE(uo.soit_total, 0) AS soit_total,

        -- ✅ Infos paiement
        p.montant AS paiement_montant,
        p.frais_dossier AS paiement_frais,
        p.montant_retard AS paiement_retard,
        p.date_paiement,
        COALESCE(p.est_retard, uo.is_retard, false) AS is_retard
      FROM omda_app.usagers_occasionnel uo
      LEFT JOIN omda_app.paiements p
        ON p.usager_id = uo.id
        AND p.usager_type = 'occ'
        AND p.statut = 'paye'
      ORDER BY uo.date_evenement DESC NULLS LAST, uo.created_at DESC
    `;

    const result = await pool.query(query);

    const evenements = result.rows.map(row => ({
      id: row.id,
      demandeur: row.demandeur,
      denomination: row.denomination || row.nom_evenement || row.demandeur,
      lieu: row.lieu,
      adresse: row.adresse,
      date_event: row.date_event || row.date_ajout,
      montant: row.montant,
      montant_base: row.montant_base,
      montant_total: row.montant_total,
      frais_dossier: row.frais_dossier,
      montant_retard: row.montant_retard,
      paiement_montant: row.paiement_montant,
      soit_total: row.soit_total,
      telephone: row.telephone,
      email: row.email,
      statut: 'valide',
      organisateurs: row.organisateurs,
      representant_par: row.representant_par,
      genre_manifestation: row.genre_manifestation,
      artistes: row.artistes,
      confirmation_nom: row.confirmation_nom,
      date_signature: row.date_signature,
      lieu_ajout: row.lieu_ajout,
      region: row.region,
      uniter: row.uniter,
      numero_dossier_global: row.numero_dossier_global,
      numero_dossier_utilisateur: row.numero_dossier_utilisateur,
      created_at: row.created_at,
      created_by: row.created_by
    }));

    console.log(`✅ ${evenements.length} événements OCC trouvés`);
    if (evenements.length > 0) {
      const f = evenements[0];
      console.log('🔍 Vérif 1er événement:', {
        id: f.id,
        montant_base: f.montant_base,
        frais_dossier: f.frais_dossier,
        montant_retard: f.montant_retard,
        paiement_montant: f.paiement_montant,
        montant_total: f.montant_total
      });
    }

    res.json({
      success: true,
      evenements: evenements,
      total: evenements.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération des événements OCC:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements OCC',
      error: error.message,
      evenements: []
    });
  }
});

// ============================================================
// 2. RÉCUPÉRER UN ÉVÉNEMENT OCC SPÉCIFIQUE AVEC SES ARTISTES
// ============================================================
router.get('/repartition/occ/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    console.log(`📄 GET /api/repartition/occ/events/${eventId} appelée`);

    const query = `
      SELECT
        uo.id, uo.demandeur, uo.denomination,
        uo.adresse_siege AS adresse, uo.telephone, uo.email,
        uo.lieu_evenement AS lieu, uo.date_evenement AS date_event,
        uo.montant, uo.frais_dossier, uo.montant_retard, uo.is_retard, uo.soit_total,
        uo.date_ajout, uo.nom_evenement, uo.organisateurs, uo.representant_par,
        uo.genre_manifestation, uo.artistes, uo.confirmation_nom, uo.date_signature,
        uo.lieu_ajout, uo.region, uo.uniter, uo.numero_dossier_global,
        uo.numero_dossier_utilisateur, uo.created_at, uo.created_by
      FROM omda_app.usagers_occasionnel uo
      WHERE uo.id = $1
    `;

    const result = await pool.query(query, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Événement OCC non trouvé' });
    }

    const row = result.rows[0];
    const evenement = {
      id: row.id,
      demandeur: row.demandeur,
      denomination: row.denomination || row.nom_evenement || row.demandeur,
      lieu: row.lieu,
      adresse: row.adresse,
      date_event: row.date_event || row.date_ajout,
      montant: row.montant,
      montant_base: row.montant,
      frais_dossier: row.frais_dossier,
      montant_retard: row.montant_retard,
      soit_total: row.soit_total,
      telephone: row.telephone,
      email: row.email,
      statut: 'valide',
      organisateurs: row.organisateurs,
      representant_par: row.representant_par,
      genre_manifestation: row.genre_manifestation,
      artistes: row.artistes,
      confirmation_nom: row.confirmation_nom,
      date_signature: row.date_signature,
      lieu_ajout: row.lieu_ajout,
      region: row.region,
      uniter: row.uniter,
      numero_dossier_global: row.numero_dossier_global,
      numero_dossier_utilisateur: row.numero_dossier_utilisateur,
      created_at: row.created_at,
      created_by: row.created_by
    };

    const artistesQuery = `
      SELECT a.id, a.nom, a.prenom, a.role, a.created_at as artiste_created_at
      FROM omda_app.artistes a
      INNER JOIN omda_app.event_artistes ea ON a.id = ea.artiste_id
      WHERE ea.event_id = $1
      ORDER BY a.nom, a.prenom
    `;
    const artistesResult = await pool.query(artistesQuery, [eventId]);

    const artistesFormatted = artistesResult.rows.map(artiste => {
      let fullName = artiste.nom;
      if (artiste.prenom && artiste.prenom.trim() !== '') {
        fullName = `${artiste.prenom} ${artiste.nom}`;
      }
      return {
        id: artiste.id, nom: artiste.nom, prenom: artiste.prenom,
        role: artiste.role || 'Artiste',
        fullName: fullName, displayName: fullName
      };
    });

    const artistesNames = artistesFormatted.map(a => a.fullName);

    res.json({
      success: true,
      evenement: evenement,
      artistes: artistesFormatted,
      artistesNames: artistesNames,
      artistesString: artistesNames.join(', '),
      count: artistesFormatted.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération événement OCC:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'événement',
      error: error.message
    });
  }
});

// ============================================================
// 3. RÉCUPÉRER TOUS LES ARTISTES D'UN ÉVÉNEMENT OCC
// ============================================================
router.get('/repartition/occ/artistes/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    console.log(`📄 GET /api/repartition/occ/artistes/${eventId} appelée`);

    const query = `
      SELECT a.id, a.nom, a.prenom, a.role, ea.event_id
      FROM omda_app.event_artistes ea
      JOIN omda_app.artistes a ON ea.artiste_id = a.id
      WHERE ea.event_id = $1
      ORDER BY a.id
    `;
    const result = await pool.query(query, [eventId]);
    console.log(`✅ ${result.rows.length} artistes trouvés pour l'événement ${eventId}`);

    res.json({ success: true, artistes: result.rows });
  } catch (error) {
    console.error('❌ Erreur récupération des artistes:', error);
    res.status(500).json({ success: false, message: error.message, artistes: [] });
  }
});

// ============================================================
// 4. RÉCUPÉRER LES ARTISTES D'UN ÉVÉNEMENT OCC AVEC DÉTAILS
// ============================================================
router.get('/repartition/occ/artistes/details/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    console.log(`📄 GET /api/repartition/occ/artistes/details/${eventId} appelée`);

    const query = `
      SELECT 
        a.id, a.nom, a.prenom, a.role,
        a.created_at as artiste_created_at,
        ea.event_id, ea.created_at as linked_at
      FROM omda_app.artistes a
      INNER JOIN omda_app.event_artistes ea ON a.id = ea.artiste_id
      WHERE ea.event_id = $1
      ORDER BY a.nom, a.prenom
    `;
    const result = await pool.query(query, [eventId]);

    const artistesFormatted = result.rows.map(artiste => {
      let fullName = artiste.nom;
      if (artiste.prenom && artiste.prenom.trim() !== '') {
        fullName = `${artiste.prenom} ${artiste.nom}`;
      }
      return {
        id: artiste.id, nom: artiste.nom, prenom: artiste.prenom,
        role: artiste.role || 'Artiste',
        fullName: fullName, displayName: fullName
      };
    });

    const artistesNames = artistesFormatted.map(a => a.fullName);

    res.json({
      success: true,
      artistes: artistesFormatted,
      artistesNames: artistesNames,
      artistesString: artistesNames.join(', '),
      count: artistesFormatted.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération artistes détails:', error);
    res.status(500).json({
      success: false, message: error.message,
      artistes: [], artistesNames: [], artistesString: '', count: 0
    });
  }
});

// ============================================================
// 5. ROUTE DE TEST
// ============================================================
router.get('/repartition/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route repartition fonctionne correctement',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 6. STATISTIQUES
// ============================================================
router.get('/repartition/stats', async (req, res) => {
  try {
    console.log('📄 GET /api/repartition/stats appelée');

    const totalEventsQuery = await pool.query(
      `SELECT COUNT(*) as total FROM omda_app.usagers_occasionnel`
    );

    const totalArtistesQuery = await pool.query(
      `SELECT COUNT(DISTINCT artiste_id) as total FROM omda_app.event_artistes`
    );

    const totalMontantQuery = await pool.query(`
      SELECT COALESCE(SUM(
        CASE
          WHEN p.montant IS NOT NULL THEN p.montant
          ELSE COALESCE(uo.montant, 0) + COALESCE(uo.frais_dossier, 0) + COALESCE(uo.montant_retard, 0)
        END
      ), 0) as total
      FROM omda_app.usagers_occasionnel uo
      LEFT JOIN omda_app.paiements p
        ON p.usager_id = uo.id
        AND p.usager_type = 'occ'
        AND p.statut = 'paye'
    `);

    const byYearQuery = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date_evenement) as annee,
        COUNT(*) as total_evenements,
        COALESCE(SUM(montant), 0) as total_montant
      FROM omda_app.usagers_occasionnel
      WHERE date_evenement IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date_evenement)
      ORDER BY annee DESC
    `);

    res.json({
      success: true,
      stats: {
        totalEvenements: parseInt(totalEventsQuery.rows[0]?.total) || 0,
        totalArtistes: parseInt(totalArtistesQuery.rows[0]?.total) || 0,
        totalMontant: parseFloat(totalMontantQuery.rows[0]?.total) || 0,
        parAnnee: byYearQuery.rows
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;