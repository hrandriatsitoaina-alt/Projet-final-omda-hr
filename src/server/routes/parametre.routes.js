// server/routes/parametre.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
// ✅ MODIFIÉ : utilise le wrapper query() avec retry automatique
const { query } = require('../database');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');

function lireVersionActuelle() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch (err) {
    return '1.0.0';
  }
}

// ============================================================
// GET /api/parametres/:userId
// ============================================================
router.get('/parametres/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    let result = await query(
      'SELECT * FROM omda_app.parametres_utilisateur WHERE utilisateur_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO omda_app.parametres_utilisateur (utilisateur_id)
         VALUES ($1) RETURNING *`,
        [userId]
      );
    }

    res.json({ success: true, parametres: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur récupération paramètres:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/parametres/utilisateur/:userId (alias)
// ============================================================
router.get('/parametres/utilisateur/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    let result = await query(
      'SELECT * FROM omda_app.parametres_utilisateur WHERE utilisateur_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO omda_app.parametres_utilisateur (utilisateur_id)
         VALUES ($1) RETURNING *`,
        [userId]
      );
    }

    res.json({ success: true, parametres: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur récupération paramètres (alias):', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// PUT /api/parametres/:userId
// 🔒 COALESCE garantit qu'on ne remplace pas une valeur existante par null
// ✅ accepte 'fr', 'mg', 'en'
// ============================================================
router.put('/parametres/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    appName, langue, theme, dateFormat, timeFormat,
    couleurPrincipale, police, notifications
  } = req.body;

  // ✅ Validation langue
  let langueValide = null;
  if (langue && ['fr', 'mg', 'en'].includes(langue)) {
    langueValide = langue;
  }

  try {
    const existing = await query(
      'SELECT id FROM omda_app.parametres_utilisateur WHERE utilisateur_id = $1',
      [userId]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO omda_app.parametres_utilisateur (utilisateur_id) VALUES ($1)`,
        [userId]
      );
    }

    const result = await query(
      `UPDATE omda_app.parametres_utilisateur SET
        app_name = COALESCE($1, app_name),
        langue = COALESCE($2, langue),
        theme = COALESCE($3, theme),
        date_format = COALESCE($4, date_format),
        time_format = COALESCE($5, time_format),
        couleur_principale = COALESCE($6, couleur_principale),
        police = COALESCE($7, police),
        notifications = COALESCE($8, notifications),
        updated_at = CURRENT_TIMESTAMP
       WHERE utilisateur_id = $9
       RETURNING *`,
      [
        appName || null,
        langueValide,
        theme || null,
        dateFormat || null,
        timeFormat || null,
        couleurPrincipale || null,
        police || null,
        notifications ? JSON.stringify(notifications) : null,
        userId
      ]
    );

    res.json({
      success: true,
      parametres: result.rows[0],
      message: 'Paramètres sauvegardés avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/parametres/notifications/:userId/test
// ============================================================
router.post('/parametres/notifications/:userId/test', async (req, res) => {
  const { userId } = req.params;
  try {
    await query(
      `INSERT INTO omda_app.notifications (message, type, created_by)
       VALUES ($1, 'info', $2)`,
      ['Ceci est une notification de test.', userId]
    );
    res.json({ success: true, message: 'Notification de test envoyée' });
  } catch (error) {
    console.error('❌ Erreur notification test:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/parametres/stats-charts
// ============================================================
router.get('/parametres/stats-charts', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const monthlyResult = await query(
      `SELECT EXTRACT(MONTH FROM date_paiement)::int AS mois,
              COALESCE(SUM(montant), 0) AS total
       FROM omda_app.paiements
       WHERE EXTRACT(YEAR FROM date_paiement) = $1
       GROUP BY mois
       ORDER BY mois`,
      [currentYear]
    );

    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const revenusParMois = moisLabels.map((label, index) => {
      const found = monthlyResult.rows.find(r => parseInt(r.mois) === index + 1);
      return { mois: label, montant: found ? parseFloat(found.total) : 0 };
    });

    const types = [
      { key: 'hotel', label: 'Hôtel', table: 'usagers_hotel' },
      { key: 'grand-surface', label: 'Grand Surface', table: 'usagers_magasin' },
      { key: 'media', label: 'Télé/Radio', table: 'usagers_media' },
      { key: 'occ', label: 'OCC', table: 'usagers_occasionnel' },
      { key: 'bus', label: 'Bus', table: 'usagers_bus' },
      { key: 'nightclub', label: 'Night Club', table: 'usagers_nightclub' }
    ];

    const repartition = [];
    for (const type of types) {
      try {
        const totalUsagers = await query(`SELECT COUNT(*) FROM omda_app.${type.table}`);
        const totalMontant = await query(
          `SELECT COALESCE(SUM(montant),0) as total FROM omda_app.paiements WHERE usager_type = $1`,
          [type.key]
        );
        repartition.push({
          name: type.label,
          usagers: parseInt(totalUsagers.rows[0].count) || 0,
          montant: parseFloat(totalMontant.rows[0].total) || 0
        });
      } catch (err) {
        repartition.push({ name: type.label, usagers: 0, montant: 0 });
      }
    }

    res.json({ success: true, revenusParMois, repartition });
  } catch (error) {
    console.error('❌ Erreur stats-charts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/parametres/db-size
// ============================================================
router.get('/parametres/db-size', async (req, res) => {
  try {
    const result = await query(`SELECT pg_database_size('omda_db') as size`);
    const sizeBytes = parseInt(result.rows[0].size) || 0;
    let sizeStr = '0 MB';
    if (sizeBytes > 0) {
      sizeStr = (sizeBytes / 1024 / 1024).toFixed(2) + ' MB';
    }
    res.json({ success: true, size: sizeStr });
  } catch (error) {
    console.error('❌ Erreur taille DB:', error);
    res.json({ success: true, size: '0 MB' });
  }
});

// ============================================================
// POST /api/parametres/update-app
// ============================================================
router.post('/parametres/update-app', async (req, res) => {
  try {
    const versionActuelle = lireVersionActuelle();
    res.json({
      success: true,
      aJour: true,
      versionActuelle,
      message: `Vous utilisez la version ${versionActuelle}.`
    });
  } catch (error) {
    console.error('❌ Erreur vérification mise à jour:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;