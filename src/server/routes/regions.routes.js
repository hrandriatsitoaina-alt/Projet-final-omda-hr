// server/routes/regions.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
const { verifyAdminToken } = require('../middleware');

// ============================================================
// GET /api/regions – Récupérer toutes les régions
// ============================================================
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, telephone, created_at FROM regions ORDER BY nom'
    );
    console.log(`✅ ${result.rows.length} régions chargées`);
    res.json({ success: true, regions: result.rows });
  } catch (error) {
    console.error('❌ GET /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/regions – Ajouter une région (avec token optionnel)
// ============================================================
router.post('/regions', async (req, res) => {
  const { nom, telephone } = req.body;
  console.log('📝 POST /regions - nom:', nom, 'téléphone:', telephone);

  if (!nom || nom.trim() === '') {
    return res.status(400).json({ success: false, message: 'Le nom de la région est obligatoire' });
  }

  try {
    // Vérifier l'existence (insensible à la casse)
    const existing = await pool.query(
      'SELECT id FROM regions WHERE LOWER(nom) = LOWER($1)',
      [nom.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cette région existe déjà' });
    }

    const result = await pool.query(
      'INSERT INTO regions (nom, telephone) VALUES ($1, $2) RETURNING id, nom, telephone, created_at',
      [nom.trim(), telephone || null]
    );
    console.log('✅ Région ajoutée :', result.rows[0]);
    res.json({ success: true, region: result.rows[0], message: 'Région ajoutée avec succès' });
  } catch (error) {
    console.error('❌ POST /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// PUT /api/regions/:id – Modifier une région (admin requis)
// ============================================================
router.put('/regions/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { nom, telephone } = req.body;
  console.log(`✏️ PUT /regions/${id} - nom:`, nom, 'téléphone:', telephone);

  if (!nom && telephone === undefined) {
    return res.status(400).json({ success: false, message: 'Au moins un champ est requis' });
  }

  try {
    const check = await pool.query('SELECT id FROM regions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Région non trouvée' });
    }

    let updates = [];
    let values = [];
    let paramIndex = 1;

    if (nom) {
      updates.push(`nom = $${paramIndex}`);
      values.push(nom.trim());
      paramIndex++;
    }
    if (telephone !== undefined) {
      updates.push(`telephone = $${paramIndex}`);
      values.push(telephone || null);
      paramIndex++;
    }

    values.push(id);
    const query = `
      UPDATE regions 
      SET ${updates.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, nom, telephone, created_at
    `;

    const result = await pool.query(query, values);
    console.log('✅ Région mise à jour :', result.rows[0]);
    res.json({ success: true, region: result.rows[0], message: 'Région mise à jour avec succès' });
  } catch (error) {
    console.error('❌ PUT /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// DELETE /api/regions/:id – Supprimer une région (admin requis)
// ============================================================
router.delete('/regions/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE /regions/${id}`);

  try {
    const result = await pool.query(
      'DELETE FROM regions WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Région non trouvée' });
    }
    console.log(`✅ Région ${id} supprimée`);
    res.json({ success: true, message: 'Région supprimée avec succès' });
  } catch (error) {
    console.error('❌ DELETE /regions:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;