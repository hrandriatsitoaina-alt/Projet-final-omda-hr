const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// GET /api/profile/:id  -> récupérer le profil
// ============================================================
router.get('/profile/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }

  try {
    const result = await pool.query(
      `SELECT id, nom, email, role, statut, prefix, created_at, derniere_connexion
       FROM utilisateurs
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Erreur GET profile:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// PUT /api/profile/:id  -> modifier nom, email, mot de passe
// Le mot de passe est stocké EN CLAIR (4 caractères), comme
// dans /auth/login et /admin/users, pour que le login marche.
// ============================================================
router.put('/profile/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }

  const { nom, email, mot_de_passe } = req.body;

  try {
    // 1. L'utilisateur existe ?
    const current = await pool.query(
      'SELECT id, nom, email FROM utilisateurs WHERE id = $1',
      [userId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const currentUser = current.rows[0];

    // 2. Valeurs finales (on garde l'ancien si vide)
    const newNom = nom && nom.trim() !== '' ? nom.trim() : currentUser.nom;
    const newEmail = email && email.trim() !== '' ? email.trim() : currentUser.email;

    // 3. Email déjà utilisé par quelqu'un d'autre ?
    if (newEmail !== currentUser.email) {
      const emailCheck = await pool.query(
        'SELECT id FROM utilisateurs WHERE email = $1 AND id != $2',
        [newEmail, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
      }
    }

    // 4. Mot de passe (optionnel)
    const hasPassword =
      typeof mot_de_passe === 'string' && mot_de_passe.length > 0;

    if (hasPassword && mot_de_passe.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir exactement 4 caractères',
      });
    }

    // 5. UPDATE
    let result;
    if (hasPassword) {
      result = await pool.query(
        `UPDATE utilisateurs
         SET nom = $1, email = $2, mot_de_passe = $3
         WHERE id = $4
         RETURNING id, nom, email, role, statut, prefix, created_at, derniere_connexion`,
        [newNom, newEmail, mot_de_passe, userId]
      );
    } else {
      result = await pool.query(
        `UPDATE utilisateurs
         SET nom = $1, email = $2
         WHERE id = $3
         RETURNING id, nom, email, role, statut, prefix, created_at, derniere_connexion`,
        [newNom, newEmail, userId]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Mise à jour impossible' });
    }

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur PUT profile:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;