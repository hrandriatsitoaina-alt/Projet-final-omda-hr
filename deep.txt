// server/routes/artistes.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// GET - Récupérer tous les artistes d'un événement OCC
// ============================================================
router.get('/occ/artistes/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    console.log(`🔍 Récupération des artistes pour l'événement OCC ID: ${eventId}`);
    
    const query = `
      SELECT 
        a.id,
        a.nom,
        a.prenom,
        a.role,
        ea.event_id
      FROM event_artistes ea
      JOIN artistes a ON ea.artiste_id = a.id
      WHERE ea.event_id = $1
      ORDER BY a.id
    `;
    
    const result = await pool.query(query, [eventId]);
    
    console.log(`✅ ${result.rows.length} artistes trouvés pour l'événement ${eventId}`);
    
    res.json({
      success: true,
      artistes: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur récupération des artistes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      artistes: []
    });
  }
});

// ============================================================
// GET - Récupérer tous les artistes (liste complète)
// ============================================================
router.get('/artistes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nom, prenom, role, created_at 
      FROM artistes 
      ORDER BY nom, prenom
    `);
    
    res.json({
      success: true,
      artistes: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur récupération des artistes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// POST - Ajouter un artiste
// ============================================================
router.post('/artistes', async (req, res) => {
  const { nom, prenom, role } = req.body;
  
  if (!nom) {
    return res.status(400).json({
      success: false,
      message: 'Le nom de l\'artiste est obligatoire'
    });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO artistes (nom, prenom, role, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, nom, prenom, role`,
      [nom, prenom || '', role || 'Artiste']
    );
    
    res.json({
      success: true,
      artiste: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erreur ajout artiste:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// POST - Lier un artiste à un événement
// ============================================================
router.post('/occ/artistes/link', async (req, res) => {
  const { eventId, artisteId } = req.body;
  
  if (!eventId || !artisteId) {
    return res.status(400).json({
      success: false,
      message: 'eventId et artisteId sont obligatoires'
    });
  }
  
  try {
    await pool.query(
      `INSERT INTO event_artistes (event_id, artiste_id, created_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (event_id, artiste_id) DO NOTHING`,
      [eventId, artisteId]
    );
    
    res.json({
      success: true,
      message: 'Artiste lié à l\'événement avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur liaison artiste-événement:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// DELETE - Supprimer un artiste d'un événement
// ============================================================
router.delete('/occ/artistes/:eventId/:artisteId', async (req, res) => {
  const { eventId, artisteId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM event_artistes WHERE event_id = $1 AND artiste_id = $2`,
      [eventId, artisteId]
    );
    
    res.json({
      success: true,
      message: 'Artiste retiré de l\'événement avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression artiste-événement:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// DELETE - Supprimer un artiste (définitif)
// ============================================================
router.delete('/artistes/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Vérifier si l'artiste est lié à des événements
    const checkResult = await pool.query(
      `SELECT COUNT(*) FROM event_artistes WHERE artiste_id = $1`,
      [id]
    );
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      // Supprimer les liens d'abord
      await pool.query(`DELETE FROM event_artistes WHERE artiste_id = $1`, [id]);
    }
    
    // Supprimer l'artiste
    await pool.query(`DELETE FROM artistes WHERE id = $1`, [id]);
    
    res.json({
      success: true,
      message: 'Artiste supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression artiste:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================================
// GET - Récupérer les artistes d'un événement OCC avec détails complets
// ============================================================
router.get('/occ/artistes/details/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    const query = `
      SELECT 
        a.id,
        a.nom,
        a.prenom,
        a.role,
        a.created_at as artiste_created_at,
        ea.event_id,
        ea.created_at as linked_at
      FROM artistes a
      INNER JOIN event_artistes ea ON a.id = ea.artiste_id
      WHERE ea.event_id = $1
      ORDER BY a.nom, a.prenom
    `;
    
    const result = await pool.query(query, [eventId]);
    
    // Formater les artistes pour l'affichage
    const artistesFormatted = result.rows.map(artiste => {
      let fullName = artiste.nom;
      if (artiste.prenom && artiste.prenom.trim() !== '') {
        fullName = `${artiste.prenom} ${artiste.nom}`;
      }
      return {
        id: artiste.id,
        nom: artiste.nom,
        prenom: artiste.prenom,
        role: artiste.role || 'Artiste',
        fullName: fullName,
        displayName: fullName
      };
    });
    
    // Extraire juste les noms pour le QR Code
    const artistesNames = artistesFormatted.map(a => a.fullName);
    const artistesString = artistesNames.join(', ');
    
    res.json({
      success: true,
      artistes: artistesFormatted,
      artistesNames: artistesNames,
      artistesString: artistesString,
      count: artistesFormatted.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération des artistes détaillés:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      artistes: [],
      artistesNames: [],
      artistesString: '',
      count: 0
    });
  }
});

module.exports = router;