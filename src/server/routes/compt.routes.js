// server/routes/compt.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

const toNumber = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseFloat(String(v).replace(/\s/g, ''));
  return isNaN(n) ? 0 : n;
};

// Types + libellés
const TYPES = [
  { key: 'hotel',         label: 'Hôtel' },
  { key: 'grand-surface', label: 'Grand Surface' },
  { key: 'media',         label: 'Télé/Radio' },
  { key: 'occ',           label: 'Occasionnelle' },
  { key: 'bus',           label: 'Bus' },
  { key: 'nightclub',     label: 'Night Club' },
  { key: 'other',         label: 'Autre Usager' },
];

// Table usagers pour chaque type
const TABLE_USAGERS = {
  hotel: 'usagers_hotel',
  'grand-surface': 'usagers_magasin',
  media: 'usagers_media',
  occ: 'usagers_occasionnel',
  bus: 'usagers_bus',
  nightclub: 'usagers_nightclub',
  other: 'usager_other',
};

// ============================================================
// Récupère la liste des usagers d'un type (nom, demandeur, tél, région)
// ============================================================
async function getUsagersParType(type) {
  const table = TABLE_USAGERS[type];
  if (!table) return [];

  try {
    if (type === 'occ') {
      const r = await pool.query(`
        SELECT 
          id,
          COALESCE(denomination, genre_manifestation, organisateurs, 'Sans nom') AS nom,
          COALESCE(organisateurs, demandeur, '') AS demandeur,
          COALESCE(telephone, '') AS telephone,
          COALESCE(region, 'Non spécifié') AS region
        FROM ${table} ORDER BY id
      `);
      return r.rows;
    }
    if (type === 'media') {
      const r = await pool.query(`
        SELECT 
          id,
          COALESCE(denomination, 'Sans nom') AS nom,
          COALESCE(representant_nom, '') AS demandeur,
          COALESCE(telephone, '') AS telephone,
          COALESCE(region, 'Non spécifié') AS region
        FROM ${table} ORDER BY id
      `);
      return r.rows;
    }
    if (type === 'other') {
      const r = await pool.query(`
        SELECT 
          id,
          COALESCE(denomination, 'Sans nom') AS nom,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(nom, ''), ' ', COALESCE(prenom, ''))), ''),
            representant_par,
            ''
          ) AS demandeur,
          COALESCE(telephone, '') AS telephone,
          COALESCE(region, 'Non spécifié') AS region
        FROM ${table} ORDER BY id
      `);
      return r.rows;
    }
    // hotel / grand-surface / bus / nightclub
    const r = await pool.query(`
      SELECT 
        id,
        COALESCE(denomination, demandeur, 'Sans nom') AS nom,
        COALESCE(demandeur, '') AS demandeur,
        COALESCE(telephone, '') AS telephone,
        COALESCE(region, 'Non spécifié') AS region
      FROM ${table} ORDER BY id
    `);
    return r.rows;
  } catch (err) {
    console.error(`❌ getUsagersParType(${type}):`, err.message);
    return [];
  }
}

// ============================================================
// GET /api/compte/recap
//   → Lit les PAIEMENTS (statut='paye') pour calculer les montants
//   ✅ CORRECTION : on récupère aussi montant_retard
// ============================================================
router.get('/compte/recap', async (req, res) => {
  try {
    const recap = [];

    for (const t of TYPES) {
      const usagersBase = await getUsagersParType(t.key);

      // ✅ CORRECTION : ajout de montant_retard dans le SELECT
      let paiements = [];
      try {
        const r = await pool.query(
          `SELECT usager_id, montant, frais_dossier, montant_retard
           FROM omda_app.paiements
           WHERE usager_type = $1 AND statut = 'paye'`,
          [t.key]
        );
        paiements = r.rows;
      } catch (err) {
        console.warn(`⚠️ paiements ${t.key}:`, err.message);
      }

      // ✅ CORRECTION : regroupement avec retard
      const paiementsParUsager = {};
      for (const p of paiements) {
        const id = p.usager_id;
        if (!paiementsParUsager[id]) {
          paiementsParUsager[id] = { montant: 0, frais: 0, retard: 0 };
        }
        paiementsParUsager[id].montant += toNumber(p.montant);
        paiementsParUsager[id].frais += toNumber(p.frais_dossier);
        paiementsParUsager[id].retard += toNumber(p.montant_retard); // ✅ AJOUT
      }

      // ✅ CORRECTION : construction avec montant_retard
      const usagers = usagersBase.map(u => {
        const p = paiementsParUsager[u.id] || { montant: 0, frais: 0, retard: 0 };
        const montantTotal = p.montant;
        const fraisDossier = p.frais;
        const sansFrais = montantTotal - fraisDossier;
        const montantRetard = p.retard; // ✅ AJOUT

        return {
          id: u.id,
          nom: u.nom,
          demandeur: u.demandeur,
          telephone: u.telephone,
          region: u.region,
          montant_avec_frais: montantTotal,
          montant_sans_frais: sansFrais,
          frais_dossier: fraisDossier,
          montant_retard: montantRetard,   // ✅ AJOUT
        };
      });

      const totalFrais = usagers.reduce((s, u) => s + u.frais_dossier, 0);
      const totalSansFrais = usagers.reduce((s, u) => s + u.montant_sans_frais, 0);
      const totalAvecFrais = usagers.reduce((s, u) => s + u.montant_avec_frais, 0);
      const totalRetard = usagers.reduce((s, u) => s + (u.montant_retard || 0), 0); // ✅ AJOUT

      recap.push({
        key: t.key,
        label: t.label,
        nombre: usagers.length,
        total_frais_dossier: totalFrais,
        total_montant_sans_frais: totalSansFrais,
        total_montant_avec_frais: totalAvecFrais,
        total_montant_retard: totalRetard,   // ✅ AJOUT
        usagers,
      });
    }

    // ✅ Total global avec retard
    const totalGlobal = recap.reduce((acc, r) => ({
      nombre: acc.nombre + r.nombre,
      total_frais_dossier: acc.total_frais_dossier + r.total_frais_dossier,
      total_montant_sans_frais: acc.total_montant_sans_frais + r.total_montant_sans_frais,
      total_montant_avec_frais: acc.total_montant_avec_frais + r.total_montant_avec_frais,
      total_montant_retard: acc.total_montant_retard + (r.total_montant_retard || 0), // ✅ AJOUT
    }), {
      nombre: 0,
      total_frais_dossier: 0,
      total_montant_sans_frais: 0,
      total_montant_avec_frais: 0,
      total_montant_retard: 0,   // ✅ AJOUT
    });

    res.json({ success: true, global: totalGlobal, recap });
  } catch (error) {
    console.error('❌ GET /compte/recap:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/compte/type/:type
//   ✅ CORRECTION : ajout de montant_retard
// ============================================================
router.get('/compte/type/:type', async (req, res) => {
  const { type } = req.params;
  const { region } = req.query;

  try {
    const typeInfo = TYPES.find(t => t.key === type);
    if (!typeInfo) {
      return res.status(400).json({ success: false, message: 'Type invalide' });
    }

    let usagersBase = await getUsagersParType(type);
    if (region) {
      usagersBase = usagersBase.filter(u => (u.region || 'Non spécifié') === region);
    }

    // ✅ CORRECTION : SELECT avec montant_retard
    let paiements = [];
    try {
      const r = await pool.query(
        `SELECT usager_id, montant, frais_dossier, montant_retard
         FROM omda_app.paiements
         WHERE usager_type = $1 AND statut = 'paye'`,
        [type]
      );
      paiements = r.rows;
    } catch (err) {
      console.warn(`⚠️ paiements ${type}:`, err.message);
    }

    // ✅ CORRECTION : regroupement avec retard
    const paiementsParUsager = {};
    for (const p of paiements) {
      const id = p.usager_id;
      if (!paiementsParUsager[id]) {
        paiementsParUsager[id] = { montant: 0, frais: 0, retard: 0 };
      }
      paiementsParUsager[id].montant += toNumber(p.montant);
      paiementsParUsager[id].frais += toNumber(p.frais_dossier);
      paiementsParUsager[id].retard += toNumber(p.montant_retard); // ✅ AJOUT
    }

    const usagers = usagersBase.map(u => {
      const p = paiementsParUsager[u.id] || { montant: 0, frais: 0, retard: 0 };
      const montantTotal = p.montant;
      const fraisDossier = p.frais;
      const sansFrais = montantTotal - fraisDossier;
      const montantRetard = p.retard; // ✅ AJOUT

      return {
        id: u.id,
        nom: u.nom,
        demandeur: u.demandeur,
        telephone: u.telephone,
        region: u.region,
        montant_avec_frais: montantTotal,
        montant_sans_frais: sansFrais,
        frais_dossier: fraisDossier,
        montant_retard: montantRetard,   // ✅ AJOUT
      };
    });

    const totalFrais = usagers.reduce((s, u) => s + u.frais_dossier, 0);
    const totalSansFrais = usagers.reduce((s, u) => s + u.montant_sans_frais, 0);
    const totalAvecFrais = usagers.reduce((s, u) => s + u.montant_avec_frais, 0);
    const totalRetard = usagers.reduce((s, u) => s + (u.montant_retard || 0), 0); // ✅ AJOUT

    res.json({
      success: true,
      type,
      label: typeInfo.label,
      region: region || null,
      nombre: usagers.length,
      total_frais_dossier: totalFrais,
      total_montant_sans_frais: totalSansFrais,
      total_montant_avec_frais: totalAvecFrais,
      total_montant_retard: totalRetard,   // ✅ AJOUT
      usagers,
    });
  } catch (error) {
    console.error(`❌ GET /compte/type/${type}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/compte/regions
// ============================================================
router.get('/compte/regions', async (req, res) => {
  try {
    const regionsSet = new Set();
    const tables = Object.values(TABLE_USAGERS);

    for (const table of tables) {
      try {
        const r = await pool.query(
          `SELECT DISTINCT COALESCE(region, 'Non spécifié') AS region 
           FROM ${table} WHERE region IS NOT NULL`
        );
        for (const row of r.rows) {
          if (row.region) regionsSet.add(row.region);
        }
      } catch (err) {
        console.warn(`⚠️ régions ${table}:`, err.message);
      }
    }

    const regions = Array.from(regionsSet).sort();
    res.json({ success: true, regions });
  } catch (error) {
    console.error('❌ GET /compte/regions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;