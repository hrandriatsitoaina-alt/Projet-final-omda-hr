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
    
    // Formater les résultats
    const artistesFormatted = result.rows.map(artiste => ({
      id: artiste.id,
      nom: artiste.nom,
      prenom: artiste.prenom || '',
      role: artiste.role || 'Artiste',
      fullName: artiste.prenom ? `${artiste.prenom} ${artiste.nom}` : artiste.nom,
      event_id: artiste.event_id
    }));
    
    res.json({
      success: true,
      artistes: artistesFormatted
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
    
    const artistesFormatted = result.rows.map(a => ({
      id: a.id,
      nom: a.nom,
      prenom: a.prenom || '',
      role: a.role || 'Artiste',
      fullName: a.prenom ? `${a.prenom} ${a.nom}` : a.nom,
      created_at: a.created_at
    }));
    
    res.json({
      success: true,
      artistes: artistesFormatted
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
// POST - Ajouter un artiste (avec vérification d'existence)
// ============================================================
router.post('/artistes', async (req, res) => {
  const { nom, prenom, role } = req.body;
  
  if (!nom || nom.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Le nom de l\'artiste est obligatoire'
    });
  }
  
  try {
    // Vérifier si l'artiste existe déjà (recherche insensible à la casse)
    const existing = await pool.query(
      'SELECT id, nom, prenom, role FROM artistes WHERE LOWER(nom) = LOWER($1)',
      [nom.trim()]
    );
    
    if (existing.rows.length > 0) {
      // L'artiste existe déjà, le retourner
      const artiste = existing.rows[0];
      return res.json({
        success: true,
        artiste: {
          id: artiste.id,
          nom: artiste.nom,
          prenom: artiste.prenom || '',
          role: artiste.role || 'Artiste',
          fullName: artiste.prenom ? `${artiste.prenom} ${artiste.nom}` : artiste.nom
        },
        message: 'Artiste existant réutilisé'
      });
    }
    
    // Créer un nouvel artiste
    const result = await pool.query(
      `INSERT INTO artistes (nom, prenom, role, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id, nom, prenom, role`,
      [nom.trim(), prenom?.trim() || '', role?.trim() || 'Artiste']
    );
    
    const newArtiste = result.rows[0];
    
    res.json({
      success: true,
      artiste: {
        id: newArtiste.id,
        nom: newArtiste.nom,
        prenom: newArtiste.prenom || '',
        role: newArtiste.role || 'Artiste',
        fullName: newArtiste.prenom ? `${newArtiste.prenom} ${newArtiste.nom}` : newArtiste.nom
      },
      message: 'Artiste créé avec succès'
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
    // Vérifier si le lien existe déjà
    const existing = await pool.query(
      'SELECT id FROM event_artistes WHERE event_id = $1 AND artiste_id = $2',
      [eventId, artisteId]
    );
    
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Artiste déjà lié à cet événement'
      });
    }
    
    await pool.query(
      `INSERT INTO event_artistes (event_id, artiste_id, created_at) 
       VALUES ($1, $2, NOW())`,
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
    const result = await pool.query(
      `DELETE FROM event_artistes WHERE event_id = $1 AND artiste_id = $2 RETURNING id`,
      [eventId, artisteId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lien non trouvé'
      });
    }
    
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
// DELETE - Supprimer un artiste (définitif) - uniquement s'il n'est plus lié
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
      return res.status(400).json({
        success: false,
        message: 'Cet artiste est encore lié à des événements. Supprimez d\'abord les liens.'
      });
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
// ✅ CORRIGÉ : Artiste principal EN PREMIER, puis les autres dans l'ordre d'insertion
// ============================================================
router.get('/occ/artistes/details/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    console.log(`📄 GET /api/occ/artistes/details/${eventId} appelée`);
    
    // ✅ 1. Récupérer l'artiste PRINCIPAL depuis usagers_occasionnel.artistes
    const eventResult = await pool.query(
      `SELECT id, artistes FROM usagers_occasionnel WHERE id = $1`,
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé',
        artistes: [],
        artistesNames: [],
        artistesString: '',
        count: 0
      });
    }
    
    const artistePrincipal = (eventResult.rows[0].artistes || '').trim();
    console.log(`🎤 Artiste principal (depuis usagers_occasionnel.artistes) : "${artistePrincipal}"`);
    
    // ✅ 2. Récupérer les AUTRES artistes liés via event_artistes
    //    ⚠️ CORRECTION CLÉ : ORDER BY ea.id (ordre d'insertion) au lieu de a.nom/a.id
    const autresResult = await pool.query(
      `SELECT 
        a.id, a.nom, a.prenom, a.role,
        ea.id AS event_artiste_id,
        ea.created_at AS linked_at
       FROM event_artistes ea
       JOIN artistes a ON ea.artiste_id = a.id
       WHERE ea.event_id = $1
       ORDER BY ea.id ASC`,
      [eventId]
    );
    
    console.log(`🎵 ${autresResult.rows.length} autres artistes trouvés (ordre d'insertion)`);
    
    // ✅ 3. Construire la liste ORDONNÉE : PRINCIPAL EN PREMIER + autres
    const artistesFormatted = [];
    
    // ✅ 3a. Ajouter l'artiste principal EN PREMIER
    if (artistePrincipal && artistePrincipal !== '') {
      artistesFormatted.push({
        id: 'principal',
        nom: artistePrincipal,
        prenom: '',
        role: 'Artiste principal',
        fullName: artistePrincipal,
        displayName: artistePrincipal,
        isPrincipal: true
      });
    }
    
    // ✅ 3b. Ajouter les autres artistes (en évitant les doublons)
    for (const artiste of autresResult.rows) {
      let fullName = artiste.nom;
      if (artiste.prenom && artiste.prenom.trim() !== '') {
        fullName = `${artiste.prenom} ${artiste.nom}`;
      }
      
      // Éviter le doublon avec l'artiste principal
      if (fullName.toLowerCase().trim() === artistePrincipal.toLowerCase().trim()) {
        console.log(`⚠️ Doublon ignoré (déjà dans principal) : ${fullName}`);
        continue;
      }
      
      artistesFormatted.push({
        id: artiste.id,
        nom: artiste.nom,
        prenom: artiste.prenom || '',
        role: artiste.role || 'Artiste',
        fullName: fullName,
        displayName: fullName,
        isPrincipal: false
      });
    }
    
    const artistesNames = artistesFormatted.map(a => a.fullName);
    const artistesString = artistesNames.join(', ');
    
    console.log(`✅ Liste finale (ordonnée) :`, artistesNames);
    
    res.json({
      success: true,
      artistes: artistesFormatted,
      artistesNames: artistesNames,
      artistesString: artistesString,
      count: artistesFormatted.length,
      artistePrincipal: artistePrincipal
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