const express = require('express');
const router = express.Router();
const pool = require('../database');
const { verifyAdminToken } = require('../middleware'); // ← AJOUTER CETTE LIGNE

// GET /api/notifications
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        message,
        type,
        usager_id,
        read,
        created_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json({ success: true, notifications: result.rows });
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE notifications SET read = true WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur notification read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/notifications/unread-count
router.get('/notifications/unread-count', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM notifications WHERE read = false
    `);
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Erreur count notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/usagers/delete-history
router.get('/usagers/delete-history', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        usager_nom,
        usager_type,
        deleted_by,
        deleted_by_role,
        deleted_at,
        details
      FROM delete_history
      ORDER BY deleted_at DESC
      LIMIT 30
    `);
    res.json({ success: true, history: result.rows });
  } catch (error) {
    console.error('Erreur delete history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/usagers/delete-history/cleanup
router.delete('/usagers/delete-history/cleanup', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM delete_history 
      WHERE id NOT IN (
        SELECT id FROM delete_history 
        ORDER BY deleted_at DESC 
        LIMIT 30
      )
      RETURNING id
    `);
    res.json({ 
      success: true, 
      message: `${result.rows.length} historiques supprimés (gardé 30 max)`,
      count: result.rows.length 
    });
  } catch (error) {
    console.error('Erreur cleanup delete history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;