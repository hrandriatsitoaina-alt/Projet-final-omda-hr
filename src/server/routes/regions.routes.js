// server/routes/regions.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
const { verifySession } = require('../utils/session');
const config = require('../config');

// ============================================================
// ✅ MIDDLEWARE LOCAL
// ============================================================
const verifyRegionAdmin = (req, res, next) => {
  const adminToken = req.headers.admintoken || req.headers['admintoken'];

  if (!adminToken) {
    return res.status(403).json({ success: false, message: 'Token manquant' });
  }

  try {
    const sessionPayload = verifySession(adminToken);
    if (sessionPayload) {
      const allowedRoles = ['super_admin', 'admin', 'daf'];
      if (allowedRoles.includes(sessionPayload.role)) {
        req.adminRole = sessionPayload.role;
        req.adminUserId = sessionPayload.id;
        req.adminEmail = sessionPayload.email;
        return next();
      }
      return res.status(403).json({ success: false, message: 'Rôle non autorisé' });
    }
  } catch (e) {
    // Pas un JWT valide
  }

  const validTokens = [config.ADMIN_SECRET_TOKEN, config.DAF_SECRET_TOKEN].filter(Boolean);
  if (validTokens.includes(adminToken)) {
    req.adminRole = adminToken === config.ADMIN_SECRET_TOKEN ? 'super_admin' : 'daf';
    return next();
  }

  return res.status(403).json({ success: false, message: 'Token invalide' });
};

// ============================================================
// ✅ GET /api/regions
//    Renvoie la liste des régions UNIQUES
//    Possibilité de filtrer par ?nom=Analamanga
// ============================================================
router.get('/regions', async (req, res) => {
  const { nom } = req.query;

  try {
    let query = 'SELECT id, nom, created_at FROM regions';
    const params = [];

    if (nom) {
      params.push(nom);
      query += ` WHERE LOWER(nom) = LOWER($${params.length})`;
    }

    query += ' ORDER BY nom';

    const result = await pool.query(query, params);
    console.log(`✅ GET /regions → ${result.rows.length} région(s)`);
    res.json({ success: true, regions: result.rows });
  } catch (error) {
    console.error('❌ GET /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET /api/regions/avec-villes
//    Renvoie toutes les régions AVEC leurs villes
//    Format : [{ id, nom, villes: [{ id, nom, quartier, telephone }] }]
// ============================================================
router.get('/regions/avec-villes', async (req, res) => {
  try {
    const regionsResult = await pool.query(
      'SELECT id, nom, created_at FROM regions ORDER BY nom'
    );

    const regions = [];

    for (const region of regionsResult.rows) {
      const villesResult = await pool.query(
        `SELECT id, nom, quartier, telephone, created_at 
         FROM villes 
         WHERE region_id = $1 
         ORDER BY nom`,
        [region.id]
      );

      regions.push({
        ...region,
        villes: villesResult.rows,
      });
    }

    console.log(`✅ GET /regions/avec-villes → ${regions.length} région(s)`);
    res.json({ success: true, regions });
  } catch (error) {
    console.error('❌ GET /regions/avec-villes:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET /api/regions/unique-noms
//    Liste UNIQUE des noms de régions
// ============================================================
router.get('/regions/unique-noms', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT nom FROM regions ORDER BY nom`
    );
    res.json({ success: true, noms: result.rows.map(r => r.nom) });
  } catch (error) {
    console.error('❌ GET /regions/unique-noms:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET /api/regions/:id/villes
//    Renvoie les villes d'une région donnée
// ============================================================
router.get('/regions/:id/villes', async (req, res) => {
  const { id } = req.params;

  try {
    const regionId = parseInt(id, 10);
    if (isNaN(regionId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const regionCheck = await pool.query(
      'SELECT id, nom FROM regions WHERE id = $1',
      [regionId]
    );

    if (regionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Région non trouvée' });
    }

    const villesResult = await pool.query(
      `SELECT id, nom, quartier, telephone, created_at 
       FROM villes 
       WHERE region_id = $1 
       ORDER BY nom`,
      [regionId]
    );

    res.json({
      success: true,
      region: regionCheck.rows[0],
      villes: villesResult.rows,
    });
  } catch (error) {
    console.error(`❌ GET /regions/${id}/villes:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET /api/regions/villes/:nom
//    Renvoie les villes d'une région donnée (par nom)
// ============================================================
router.get('/regions/villes/:nom', async (req, res) => {
  const { nom } = req.params;

  try {
    const result = await pool.query(
      `SELECT v.id, v.nom AS ville, v.quartier, v.telephone 
       FROM villes v
       JOIN regions r ON v.region_id = r.id
       WHERE LOWER(r.nom) = LOWER($1)
       ORDER BY v.nom`,
      [nom]
    );
    res.json({ success: true, villes: result.rows });
  } catch (error) {
    console.error('❌ GET /regions/villes/:nom:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ GET /api/villes
//    Renvoie TOUTES les villes avec leur région
// ============================================================
router.get('/villes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id, v.nom, v.quartier, v.telephone, v.created_at,
        r.id AS region_id, r.nom AS region_nom
      FROM villes v
      JOIN regions r ON v.region_id = r.id
      ORDER BY r.nom, v.nom
    `);

    res.json({ success: true, villes: result.rows });
  } catch (error) {
    console.error('❌ GET /villes:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ POST /api/regions
//    Ajoute une nouvelle région (ou utilise l'existante)
//    Puis ajoute la ville associée
//    ✅ Analamanga n'est JAMAIS dupliquée
// ============================================================
router.post('/regions', async (req, res) => {
  const { nom, ville, quartier, telephone } = req.body;
  console.log('📝 POST /regions - nom:', nom, '| ville:', ville);

  if (!nom || nom.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Le nom de la région est obligatoire'
    });
  }

  if (!ville || ville.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'La ville est obligatoire'
    });
  }

  try {
    // 1) ✅ Créer ou récupérer la région (UNIQUE)
    let regionId;
    const existingRegion = await pool.query(
      'SELECT id FROM regions WHERE LOWER(nom) = LOWER($1)',
      [nom.trim()]
    );

    if (existingRegion.rows.length > 0) {
      regionId = existingRegion.rows[0].id;
      console.log(`ℹ️ Région "${nom.trim()}" existe déjà (id=${regionId})`);
    } else {
      const insertRegion = await pool.query(
        'INSERT INTO regions (nom) VALUES ($1) RETURNING id',
        [nom.trim()]
      );
      regionId = insertRegion.rows[0].id;
      console.log(`✅ Nouvelle région "${nom.trim()}" créée (id=${regionId})`);
    }

    // 2) ✅ Vérifier si la ville existe déjà pour cette région
    const existingVille = await pool.query(
      `SELECT id FROM villes 
       WHERE region_id = $1 AND LOWER(nom) = LOWER($2)`,
      [regionId, ville.trim()]
    );

    if (existingVille.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `La ville "${ville.trim()}" existe déjà pour la région "${nom.trim()}".`
      });
    }

    // 3) ✅ Insérer la ville
    const insertVille = await pool.query(
      `INSERT INTO villes (region_id, nom, quartier, telephone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nom, quartier, telephone, created_at`,
      [
        regionId,
        ville.trim(),
        quartier ? quartier.trim() : null,
        telephone || null,
      ]
    );

    console.log(`✅ Ville "${ville.trim()}" ajoutée à la région "${nom.trim()}"`);

    res.json({
      success: true,
      region: { id: regionId, nom: nom.trim() },
      ville: insertVille.rows[0],
      message: `Ville "${ville.trim()}" ajoutée à la région "${nom.trim()}"`,
    });
  } catch (error) {
    console.error('❌ POST /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ PUT /api/regions/:id
//    Modifie le nom d'une région
// ============================================================
router.put('/regions/:id', verifyRegionAdmin, async (req, res) => {
  const { id } = req.params;
  const { nom } = req.body;
  console.log(`✏️ PUT /regions/${id}`);

  if (!nom || nom.trim() === '') {
    return res.status(400).json({ success: false, message: 'Le nom est obligatoire' });
  }

  try {
    const check = await pool.query('SELECT id FROM regions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Région non trouvée' });
    }

    const duplicateCheck = await pool.query(
      `SELECT id FROM regions 
       WHERE LOWER(nom) = LOWER($1) AND id != $2`,
      [nom.trim(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `La région "${nom.trim()}" existe déjà.`
      });
    }

    const result = await pool.query(
      `UPDATE regions SET nom = $1 WHERE id = $2
       RETURNING id, nom, created_at`,
      [nom.trim(), id]
    );

    console.log('✅ Région mise à jour :', result.rows[0]);
    res.json({
      success: true,
      region: result.rows[0],
      message: 'Région mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ PUT /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ PUT /api/villes/:id
//    Modifie une ville
// ============================================================
router.put('/villes/:id', verifyRegionAdmin, async (req, res) => {
  const { id } = req.params;
  const { nom, quartier, telephone, region_id } = req.body;
  console.log(`✏️ PUT /villes/${id}`);

  try {
    const check = await pool.query('SELECT id, region_id FROM villes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ville non trouvée' });
    }

    const currentVille = check.rows[0];
    const finalRegionId = region_id !== undefined ? parseInt(region_id) : currentVille.region_id;

    if (nom !== undefined) {
      const duplicateCheck = await pool.query(
        `SELECT id FROM villes 
         WHERE region_id = $1 AND LOWER(nom) = LOWER($2) AND id != $3`,
        [finalRegionId, nom.trim(), id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: `La ville "${nom.trim()}" existe déjà dans cette région.`
        });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (nom !== undefined) {
      updates.push(`nom = $${paramIndex}`);
      values.push(nom.trim());
      paramIndex++;
    }
    if (quartier !== undefined) {
      updates.push(`quartier = $${paramIndex}`);
      values.push(quartier ? quartier.trim() : null);
      paramIndex++;
    }
    if (telephone !== undefined) {
      updates.push(`telephone = $${paramIndex}`);
      values.push(telephone || null);
      paramIndex++;
    }
    if (region_id !== undefined) {
      updates.push(`region_id = $${paramIndex}`);
      values.push(parseInt(region_id));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
    }

    values.push(id);
    const query = `UPDATE villes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, region_id, nom, quartier, telephone, created_at`;

    const result = await pool.query(query, values);
    console.log('✅ Ville mise à jour :', result.rows[0]);
    res.json({ success: true, ville: result.rows[0], message: 'Ville mise à jour avec succès' });
  } catch (error) {
    console.error('❌ PUT /villes:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ DELETE /api/regions/:id
//    Supprime une région ET toutes ses villes (CASCADE)
// ============================================================
router.delete('/regions/:id', verifyRegionAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`\n🗑️  DELETE /regions/${id} — début`);

  try {
    const regionId = parseInt(id, 10);
    if (isNaN(regionId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const check = await pool.query('SELECT id, nom FROM regions WHERE id = $1', [regionId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Région non trouvée' });
    }

    const { nom } = check.rows[0];
    console.log(`   ℹ️  À supprimer : "${nom}" (id=${regionId})`);

    const result = await pool.query(
      'DELETE FROM regions WHERE id = $1 RETURNING id, nom',
      [regionId]
    );

    console.log(`   ✅ Supprimée :`, result.rows[0]);
    return res.json({
      success: true,
      message: `Région "${nom}" et ses villes supprimées avec succès`,
      region: result.rows[0],
    });
  } catch (error) {
    console.error(`   ❌ DELETE /regions/${id}:`, error.message);
    return res.status(500).json({
      success: false,
      message: `Erreur serveur : ${error.message}`,
    });
  }
});

// ============================================================
// ✅ DELETE /api/villes/:id
// ============================================================
router.delete('/villes/:id', verifyRegionAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`\n🗑️  DELETE /villes/${id} — début`);

  try {
    const villeId = parseInt(id, 10);
    if (isNaN(villeId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const check = await pool.query('SELECT id, nom FROM villes WHERE id = $1', [villeId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ville non trouvée' });
    }

    const { nom } = check.rows[0];

    const result = await pool.query(
      'DELETE FROM villes WHERE id = $1 RETURNING id, nom',
      [villeId]
    );

    console.log(`   ✅ Supprimée :`, result.rows[0]);
    return res.json({
      success: true,
      message: `Ville "${nom}" supprimée avec succès`,
      ville: result.rows[0],
    });
  } catch (error) {
    console.error(`   ❌ DELETE /villes/${id}:`, error.message);
    return res.status(500).json({
      success: false,
      message: `Erreur serveur : ${error.message}`,
    });
  }
});

module.exports = router;