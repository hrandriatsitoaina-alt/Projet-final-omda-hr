// server/routes/verification.routes.js
// ═══════════════════════════════════════════════════════════════════
// ROUTES VÉRIFICATION USAGER - Version finale FLUIDE
// - Recherche progressive : chaque champ est OPTIONNEL
// - Combinaisons : préfixe / préfixe+num / préfixe+num+trim / tout
// - Tolérante (casse, espaces)
// - Quittance liée via quitance_usager (1:1 avec facture_usager)
// - Fallback Other → usager_other
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// HELPER - Parse un numéro de dossier
// Format attendu : "FAN 1/1/2026"
// ============================================================
function parseDossier(numDossier) {
  const raw = String(numDossier || '').trim();

  const matchPrefixe = raw.match(/^([A-Za-z]+)/);
  const prefixe = matchPrefixe ? matchPrefixe[1].toUpperCase() : '';

  const matchNumero = raw.match(/(\d+)/);
  const numero = matchNumero ? parseInt(matchNumero[1], 10) : 0;

  const matchTrimestre = raw.match(/\/(\d+)\//);
  const trimestre = matchTrimestre ? parseInt(matchTrimestre[1], 10) : 0;

  const matchAnnee = raw.match(/\/(\d{4})\s*$/);
  const annee = matchAnnee ? parseInt(matchAnnee[1], 10) : 0;

  return { numero_dossier: raw, prefixe, numero, trimestre, annee };
}

// ============================================================
// HELPER - Enrichit un usager
// ============================================================
function enrichUsager(row) {
  const parsed = parseDossier(
    row.numero_dossier_utilisateur || row.numero_dossier_global || ''
  );

  let denomination = row.denomination || '';
  let demandeur = row.demandeur || '';

  if (!denomination && row.ref_client_type === 'OTH') {
    denomination =
      row.other_denomination ||
      [row.other_nom, row.other_prenom].filter(Boolean).join(' ') ||
      'N/A';
  }
  if (!demandeur && row.ref_client_type === 'OTH') {
    demandeur =
      row.other_representant_par ||
      [row.other_nom, row.other_prenom].filter(Boolean).join(' ') ||
      'N/A';
  }

  return {
    ...row,
    ...parsed,
    denomination: denomination || row.denomination || 'N/A',
    demandeur: demandeur || row.demandeur || 'N/A',
    quittance: row.num_quitance ?? null,
    quittance_formate: row.num_quitance_formate ?? null,
    quittance_validee: row.quittance_validee ?? false,
    personne_recu:
      row.personne_recu || row.quittance_personne_recu || null,
  };
}

// ============================================================
// ROUTE - Tous les préfixes
// ============================================================
router.get('/verification/prefixes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT UPPER(prefix) AS prefixe
      FROM omda_app.utilisateurs
      WHERE prefix IS NOT NULL AND prefix != ''
      ORDER BY prefix
    `);
    const prefixes = result.rows.map(r => r.prefixe).filter(Boolean);
    res.json({ success: true, prefixes });
  } catch (error) {
    console.error('❌ Erreur préfixes:', error);
    res.status(500).json({ success: false, message: error.message, prefixes: [] });
  }
});

// ============================================================
// ROUTE - Détails des préfixes
// ============================================================
router.get('/verification/prefixes-details', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT UPPER(prefix) AS prefixe, nom
      FROM omda_app.utilisateurs
      WHERE prefix IS NOT NULL AND prefix != ''
        AND nom IS NOT NULL AND nom != ''
      ORDER BY prefix
    `);
    const prefixeDetails = {};
    for (const row of result.rows) {
      const p = (row.prefixe || '').trim();
      const n = (row.nom || '').trim();
      if (p && n) prefixeDetails[p] = n.toUpperCase();
    }
    res.json({ success: true, prefixes: prefixeDetails });
  } catch (error) {
    console.error('❌ Erreur détails préfixes:', error);
    res.status(500).json({ success: false, message: error.message, prefixes: {} });
  }
});

// ============================================================
// ROUTE - Années disponibles
// ============================================================
router.get('/verification/annees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM created_at) AS annee
      FROM facture_usager
      WHERE created_at IS NOT NULL
      ORDER BY annee DESC
    `);
    res.json({
      success: true,
      annees: result.rows.map(r => parseInt(r.annee, 10)),
    });
  } catch (error) {
    console.error('❌ Erreur années:', error);
    res.status(500).json({ success: false, message: error.message, annees: [] });
  }
});

// ============================================================
// ROUTE - Tous les usagers
// ============================================================
router.get('/verification/usagers', async (req, res) => {
  try {
    console.log('📋 Récupération de tous les usagers...');

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
        f.personne_recu, f.montant_mensuel, f.frais_dossier, f.montant_retard,
        f.is_retard, f.soit_total, f.uniter, f.numero_dossier_utilisateur,
        f.numero_dossier_global, f.statut, f.mois_facture, f.annee_facture,
        f.created_at, f.created_by, f.mois_groupes, f.type_groupe,
        u.nom AS createur_nom,
        q.num_quitance, q.num_quitance_formate, q.quittance_validee,
        q.personne_recu AS quittance_personne_recu,
        o.denomination AS other_denomination,
        o.nom          AS other_nom,
        o.prenom       AS other_prenom,
        o.representant_par AS other_representant_par
      FROM facture_usager f
      LEFT JOIN utilisateurs   u ON u.id = f.created_by
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      LEFT JOIN usager_other    o ON (o.id = f.ref_usager AND f.ref_client_type = 'OTH')
      ORDER BY f.created_at DESC
    `);

    const usagers = result.rows.map(enrichUsager);
    console.log(`✅ ${usagers.length} usagers trouvés`);

    res.json({ success: true, usagers, total: usagers.length });
  } catch (error) {
    console.error('❌ Erreur usagers:', error);
    res.status(500).json({ success: false, message: error.message, usagers: [] });
  }
});

// ============================================================
// ✅ ROUTE RECHERCHE FLUIDE — Tous les champs sont OPTIONNELS
//    - Si seulement préfixe : filtre sur le préfixe du dossier
//    - Si + numéro : ajoute la condition sur le numéro
//    - Si + trimestre : ajoute la condition sur le trimestre
//    - Si + année : ajoute la condition sur l'année
//    - Aucun champ → retourne tous les usagers (limit 200)
// ============================================================
router.get('/verification/recherche', async (req, res) => {
  const { prefixe, numero, semestre, annee } = req.query;

  console.log(`🔍 Recherche fluide: prefixe="${prefixe}" numero="${numero}" trimestre="${semestre}" annee="${annee}"`);

  try {
    // ✅ Normaliser les entrées (vides = null)
    const prefixeUpper =
      prefixe && String(prefixe).trim() !== ''
        ? String(prefixe).trim().toUpperCase()
        : null;
    const numeroStr =
      numero && String(numero).trim() !== '' ? String(numero).trim() : null;
    const trimestreStr =
      semestre && String(semestre).trim() !== ''
        ? String(semestre).trim()
        : null;
    const anneeStr =
      annee && String(annee).trim() !== '' ? String(annee).trim() : null;

    // ✅ Validation légère (si fourni)
    if (numeroStr && !/^\d+$/.test(numeroStr)) {
      return res.status(400).json({
        success: false,
        code: 'NUMERO_INVALIDE',
        message: 'Le numéro doit contenir uniquement des chiffres',
        usagers: [],
      });
    }
    if (trimestreStr && !/^[1-4]$/.test(trimestreStr)) {
      return res.status(400).json({
        success: false,
        code: 'TRIMESTRE_INVALIDE',
        message: 'Le trimestre doit être compris entre 1 et 4',
        usagers: [],
      });
    }
    if (anneeStr && !/^\d{4}$/.test(anneeStr)) {
      return res.status(400).json({
        success: false,
        code: 'ANNEE_INVALIDE',
        message: "L'année doit contenir 4 chiffres (ex: 2026)",
        usagers: [],
      });
    }

    // ✅ Construire le WHERE dynamique
    const conditions = [];
    const params = [];

    // Si aucun critère → retourner les 200 derniers
    const aucunCritere = !prefixeUpper && !numeroStr && !trimestreStr && !anneeStr;

    if (prefixeUpper) {
      // Le préfixe est au début du numéro de dossier (avant un espace ou un chiffre)
      params.push(`${prefixeUpper}%`);
      conditions.push(
        `(UPPER(f.numero_dossier_utilisateur) LIKE $${params.length}
          OR UPPER(f.numero_dossier_global) LIKE $${params.length})`
      );
    }

    if (numeroStr) {
      // Numéro : on cherche "/NUM/" ou " NUM/" ou "NUM/" dans le dossier
      // → Plus fiable : chercher avec un pattern
      params.push(`%${numeroStr}/%`);
      conditions.push(
        `(f.numero_dossier_utilisateur LIKE $${params.length}
          OR f.numero_dossier_global LIKE $${params.length})`
      );
    }

    if (trimestreStr) {
      params.push(`%/${trimestreStr}/%`);
      conditions.push(
        `(f.numero_dossier_utilisateur LIKE $${params.length}
          OR f.numero_dossier_global LIKE $${params.length})`
      );
    }

    if (anneeStr) {
      params.push(`%/${anneeStr}`);
      conditions.push(
        `(f.numero_dossier_utilisateur LIKE $${params.length}
          OR f.numero_dossier_global LIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const limitClause = aucunCritere ? 'LIMIT 200' : '';

    const sql = `
      SELECT 
        f.id, f.ref_omda, f.num_facture, f.num_facture_type, f.ref_client_type,
        f.ref_usager, f.type_facture, f.region_usager, f.date_ajout,
        f.denomination, f.demandeur, f.telephone, f.email, f.adresse,
        f.representant_nom, f.representant_adresse, f.representant_tel,
        f.representant_cin, f.representant_cin_delivree, f.representant_cin_lieu,
        f.representant_fonction, f.representant_par, f.organisateurs,
        f.genre_manifestation, f.artistes, f.date_evenement, f.lieu_evenement,
        f.domicile, f.lieu_ajout, f.date_signature, f.confirmation_nom,
        f.personne_recu, f.montant_mensuel, f.frais_dossier, f.montant_retard,
        f.is_retard, f.soit_total, f.uniter, f.numero_dossier_utilisateur,
        f.numero_dossier_global, f.statut, f.mois_facture, f.annee_facture,
        f.created_at, f.created_by, f.mois_groupes, f.type_groupe,
        u.nom AS createur_nom,
        q.num_quitance, q.num_quitance_formate, q.quittance_validee,
        q.personne_recu AS quittance_personne_recu,
        o.denomination AS other_denomination,
        o.nom          AS other_nom,
        o.prenom       AS other_prenom,
        o.representant_par AS other_representant_par
      FROM facture_usager f
      LEFT JOIN utilisateurs   u ON u.id = f.created_by
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      LEFT JOIN usager_other    o ON (o.id = f.ref_usager AND f.ref_client_type = 'OTH')
      ${whereClause}
      ORDER BY f.created_at DESC
      ${limitClause}
    `;

    console.log(`📝 SQL WHERE: ${whereClause || '(aucun)'}`);
    console.log(`📝 Params:`, params);

    const result = await pool.query(sql, params);
    const usagers = result.rows.map(enrichUsager);

    console.log(`✅ ${usagers.length} usager(s) trouvé(s)`);

    // ✅ Construire le libellé du dossier recherché
    const dossierRecherche = [
      prefixeUpper,
      numeroStr,
      trimestreStr,
      anneeStr,
    ].filter(Boolean).join(' / ');

    // ✅ Message adapté
    let message = '';
    if (aucunCritere) {
      message = `${usagers.length} usager(s) affiché(s) (aucun critère)`;
    } else if (usagers.length === 0) {
      message = `Aucun usager trouvé pour : ${dossierRecherche}`;
    } else {
      message = `${usagers.length} usager(s) trouvé(s) pour : ${dossierRecherche}`;
    }

    res.json({
      success: true,
      usagers,
      total: usagers.length,
      dossierRecherche,
      criteres: {
        prefixe: prefixeUpper,
        numero: numeroStr,
        trimestre: trimestreStr,
        annee: anneeStr,
      },
      message,
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({ success: false, message: error.message, usagers: [] });
  }
});

// ============================================================
// ROUTE - Suggestions préfixes
// ============================================================
router.get('/verification/suggestions/prefixes', async (req, res) => {
  const { search } = req.query;
  if (!search || search.length < 1) {
    return res.json({ success: true, suggestions: [] });
  }
  try {
    const result = await pool.query(`
      SELECT DISTINCT UPPER(prefix) AS prefixe
      FROM omda_app.utilisateurs
      WHERE prefix IS NOT NULL AND prefix != ''
        AND UPPER(prefix) ILIKE $1
      ORDER BY prefixe
      LIMIT 10
    `, [`${search.toUpperCase()}%`]);
    res.json({
      success: true,
      suggestions: result.rows.map(r => r.prefixe).filter(Boolean),
    });
  } catch (error) {
    console.error('❌ Erreur suggestions:', error);
    res.status(500).json({ success: false, message: error.message, suggestions: [] });
  }
});

// ============================================================
// ROUTE - Détails d'un usager
// ============================================================
router.get('/verification/usager/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        f.*,
        u.nom AS createur_nom,
        q.num_quitance, q.num_quitance_formate, q.quittance_validee,
        q.personne_recu AS quittance_personne_recu,
        o.denomination AS other_denomination,
        o.nom          AS other_nom,
        o.prenom       AS other_prenom,
        o.representant_par AS other_representant_par
      FROM facture_usager f
      LEFT JOIN utilisateurs   u ON u.id = f.created_by
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      LEFT JOIN usager_other    o ON (o.id = f.ref_usager AND f.ref_client_type = 'OTH')
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usager non trouvé' });
    }

    res.json({ success: true, usager: enrichUsager(result.rows[0]) });
  } catch (error) {
    console.error('❌ Erreur usager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ROUTE DEBUG
// ============================================================
router.get('/verification/debug/dossiers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id,
        f.numero_dossier_utilisateur,
        f.numero_dossier_global,
        f.ref_client_type,
        f.denomination,
        f.created_at,
        q.num_quitance,
        q.num_quitance_formate
      FROM facture_usager f
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      WHERE f.numero_dossier_utilisateur IS NOT NULL
         OR f.numero_dossier_global IS NOT NULL
      ORDER BY f.created_at DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      total: result.rows.length,
      echantillons: result.rows.map(row => ({
        ...row,
        parsed: parseDossier(row.numero_dossier_utilisateur || row.numero_dossier_global || ''),
      })),
    });
  } catch (error) {
    console.error('❌ Erreur debug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;