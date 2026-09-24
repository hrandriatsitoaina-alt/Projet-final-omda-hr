// server/routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
const config = require('../config');
const { hashPassword, verifyPassword, isHashed } = require('../utils/password');

// ============================================================
// GÉNÉRATION DE PRÉFIXE UNIQUE EN 3 LETTRES (JAMAIS DE CHIFFRES)
// ============================================================
function cleanName(nom) {
  return (nom || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
}

async function isPrefixAvailable(prefix, excludeUserId = null) {
  let query = 'SELECT id FROM utilisateurs WHERE prefix = $1';
  const params = [prefix];
  if (excludeUserId) {
    query += ' AND id != $2';
    params.push(excludeUserId);
  }
  const result = await pool.query(query, params);
  return result.rows.length === 0;
}

const VOYELLES = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

function buildCandidates(cleaned) {
  const candidates = [];
  const seen = new Set();
  const push = (s) => {
    const c = (s || '').substring(0, 3).toUpperCase();
    if (c.length === 3 && /^[A-Z]{3}$/.test(c) && !seen.has(c)) {
      seen.add(c);
      candidates.push(c);
    }
  };

  const letters = cleaned.split('');
  const L1 = letters[0] || 'X';

  push(cleaned.substring(0, 3));

  const consonnesApres = letters.slice(1).filter(c => !VOYELLES.has(c));
  if (consonnesApres.length >= 2) {
    push(L1 + consonnesApres[0] + consonnesApres[1]);
  }

  if (letters.length >= 3) {
    push(L1 + letters[1] + letters[letters.length - 1]);
    push(L1 + letters[letters.length - 1] + letters[letters.length - 2]);
  }

  if (letters.length >= 5) {
    push(L1 + letters[2] + letters[4]);
  }

  if (letters.length >= 4) {
    push(L1 + letters[1] + letters[3]);
  }

  for (let i = 2; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      push(L1 + letters[i] + letters[j]);
    }
  }

  const pool8 = letters.slice(0, 8);
  for (let i = 0; i < pool8.length; i++) {
    for (let j = i + 1; j < pool8.length; j++) {
      for (let k = j + 1; k < pool8.length; k++) {
        push(pool8[i] + pool8[j] + pool8[k]);
      }
    }
  }

  return candidates;
}

async function bruteForcePrefix(L1, excludeUserId = null) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const candidate = L1 + alphabet[i] + alphabet[j];
      if (await isPrefixAvailable(candidate, excludeUserId)) {
        return candidate;
      }
    }
  }
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      for (let k = 0; k < alphabet.length; k++) {
        const candidate = alphabet[i] + alphabet[j] + alphabet[k];
        if (await isPrefixAvailable(candidate, excludeUserId)) {
          return candidate;
        }
      }
    }
  }
  throw new Error('Impossible de générer un préfixe unique');
}

async function generateUniquePrefix(nom, excludeUserId = null) {
  const cleaned = cleanName(nom);
  if (!cleaned) {
    throw new Error('Nom invalide pour la génération du préfixe');
  }

  const candidates = buildCandidates(cleaned);
  for (const candidate of candidates) {
    if (await isPrefixAvailable(candidate, excludeUserId)) {
      return candidate;
    }
  }

  const L1 = cleaned[0] || 'X';
  return await bruteForcePrefix(L1, excludeUserId);
}

// ============================================================
// MIDDLEWARE DE VÉRIFICATION
// ============================================================

// ✅ Accepte super_admin ET admin (admin = accès restreint côté front)
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  if (!adminToken) {
    return res.status(403).json({ success: false, message: 'Non autorisé - Token manquant' });
  }

  const validTokens = [
    config.ADMIN_SECRET_TOKEN,        // super_admin
    config.ADMIN_ROLE_SECRET_TOKEN,   // admin
  ];

  if (!validTokens.includes(adminToken)) {
    return res.status(403).json({ success: false, message: 'Non autorisé - Token invalide' });
  }

  // ✅ Exposer le rôle pour que les routes puissent filtrer
  if (adminToken === config.ADMIN_SECRET_TOKEN) {
    req.adminRole = 'super_admin';
  } else if (adminToken === config.ADMIN_ROLE_SECRET_TOKEN) {
    req.adminRole = 'admin';
  }
  next();
};

// ✅ DAF : accepte super_admin, admin et daf
const verifyDAFToken = (req, res, next) => {
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  if (!adminToken) {
    return res.status(403).json({ success: false, message: 'Non autorisé - Token manquant' });
  }
  const validTokens = [
    config.ADMIN_SECRET_TOKEN,
    config.ADMIN_ROLE_SECRET_TOKEN,
    config.DAF_SECRET_TOKEN,
  ];
  if (!validTokens.includes(adminToken)) {
    return res.status(403).json({ success: false, message: 'Non autorisé - Token invalide' });
  }
  if (adminToken === config.ADMIN_SECRET_TOKEN) req.adminRole = 'super_admin';
  else if (adminToken === config.ADMIN_ROLE_SECRET_TOKEN) req.adminRole = 'admin';
  else req.adminRole = 'daf';
  next();
};

// ✅ Réservé STRICTEMENT au super_admin (actions sensibles)
const verifySuperAdminOnly = (req, res, next) => {
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  if (!adminToken || adminToken !== config.ADMIN_SECRET_TOKEN) {
    return res.status(403).json({
      success: false,
      message: 'Action réservée au Super Admin.'
    });
  }
  req.adminRole = 'super_admin';
  next();
};

// ============================================================
// ROUTES SUPER ADMIN
// ============================================================

// ✅ GET /api/admin/users - Liste des utilisateurs (super_admin + admin)
router.get('/admin/users', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, email, role, statut, prefix, created_at, derniere_connexion FROM utilisateurs ORDER BY id'
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Erreur admin users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/admin/users - Créer un utilisateur (SUPER ADMIN uniquement)
router.post('/admin/users', verifySuperAdminOnly, async (req, res) => {
  const { nom, email, mot_de_passe, role, statut } = req.body;
  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
  }
  try {
    const existing = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cet email existe déjà' });
    }

    const prefix = await generateUniquePrefix(nom);

    // ✅ Hachage du mot de passe
    const hashedPassword = await hashPassword(mot_de_passe);

    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nom, email, role, statut, prefix`,
      [nom, email, hashedPassword, role || 'user', statut || 'actif', prefix]
    );

    const newUserId = result.rows[0].id;
    const currentYear = new Date().getFullYear();
    const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'OCC', 'Bus', 'Night club'];

    for (const type of typesUsager) {
      await pool.query(
        `INSERT INTO compteurs_dossiers_utilisateurs (utilisateur_id, annee, compteur, type_usager) 
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (utilisateur_id, annee, type_usager) DO NOTHING`,
        [newUserId, currentYear, type]
      );
    }

    await pool.query(
      `INSERT INTO parametres_utilisateur (utilisateur_id)
       VALUES ($1)
       ON CONFLICT (utilisateur_id) DO NOTHING`,
      [newUserId]
    );

    res.json({ success: true, user: result.rows[0], message: 'Utilisateur créé avec succès' });
  } catch (error) {
    console.error('Erreur admin add user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ PUT /api/admin/users/:id - Modifier un utilisateur
//    - super_admin : peut tout modifier (hashage du mot de passe si fourni)
//    - admin       : peut UNIQUEMENT changer le statut (actif/inactif)
router.put('/admin/users/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { nom, email, role, statut, mot_de_passe } = req.body;
  const requesterRole = req.adminRole; // 'super_admin' ou 'admin'

  try {
    const userResult = await pool.query(
      'SELECT id, role, nom, email, statut, prefix FROM utilisateurs WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const currentUser = userResult.rows[0];

    // 🚫 Personne ne touche au super_admin
    if (currentUser.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas modifier le Super Admin'
      });
    }

    // ================================================================
    // ✅ CAS ADMIN : autorisé uniquement à changer le statut
    // ================================================================
    if (requesterRole === 'admin') {
      if (!statut || (statut !== 'actif' && statut !== 'inactif')) {
        return res.status(400).json({
          success: false,
          message: 'Seul le statut (actif/inactif) peut être modifié.'
        });
      }
      await pool.query(
        'UPDATE utilisateurs SET statut = $1 WHERE id = $2',
        [statut, id]
      );
      return res.json({
        success: true,
        message: `Statut mis à jour : ${statut}`,
        prefix: currentUser.prefix
      });
    }

    // ================================================================
    // ✅ CAS SUPER ADMIN : peut tout modifier
    // ================================================================
    if (role === 'super_admin' && currentUser.role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas créer un autre Super Admin'
      });
    }

    // Recalculer le préfixe SI le nom a changé
    let newPrefix = currentUser.prefix;
    if (nom && nom !== currentUser.nom) {
      newPrefix = await generateUniquePrefix(nom, parseInt(id));
    }

    let query, params;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      // ✅ Hachage du nouveau mot de passe
      const hashedPassword = await hashPassword(mot_de_passe);
      query = `UPDATE utilisateurs SET nom = $1, email = $2, role = $3, statut = $4, mot_de_passe = $5, prefix = $6 WHERE id = $7`;
      params = [nom, email, role || currentUser.role, statut || 'actif', hashedPassword, newPrefix, id];
    } else {
      query = `UPDATE utilisateurs SET nom = $1, email = $2, role = $3, statut = $4, prefix = $5 WHERE id = $6`;
      params = [nom, email, role || currentUser.role, statut || 'actif', newPrefix, id];
    }
    await pool.query(query, params);
    res.json({ success: true, message: 'Utilisateur modifié avec succès', prefix: newPrefix });
  } catch (error) {
    console.error('Erreur admin edit user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ DELETE /api/admin/users/:id - Supprimer un utilisateur (SUPER ADMIN uniquement)
router.delete('/admin/users/:id', verifySuperAdminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const superAdmin = await pool.query("SELECT id FROM utilisateurs WHERE role = 'super_admin' LIMIT 1");
    if (superAdmin.rows.length > 0 && superAdmin.rows[0].id === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer le Super Admin' });
    }
    const result = await pool.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur admin delete user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/admin/change-password - Changer mot de passe (SUPER ADMIN uniquement)
router.post('/admin/change-password', verifySuperAdminOnly, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const result = await pool.query(
      "SELECT mot_de_passe, id FROM utilisateurs WHERE role = 'super_admin' LIMIT 1"
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Super Admin non trouvé' });
    }
    const currentPasswordHash = result.rows[0].mot_de_passe;
    const adminId = result.rows[0].id;

    // ✅ Vérification bcrypt (ou clair pour migration)
    const ok = await verifyPassword(oldPassword, currentPasswordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect' });
    }
    if (!newPassword || newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir 4 chiffres' });
    }

    // ✅ Hachage du nouveau mot de passe
    const hashed = await hashPassword(newPassword);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, adminId]);
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur admin change password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET /api/admin/activities - Liste des activités
router.get('/admin/activities', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.action,
        a.details,
        a.created_at,
        u.nom as user_nom
      FROM activites a
      LEFT JOIN utilisateurs u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, activities: result.rows });
  } catch (error) {
    console.error('Erreur activities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/admin/activities - Créer une activité
router.post('/admin/activities', verifyAdminToken, async (req, res) => {
  const { action, details, user_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO activites (action, details, user_id) VALUES ($1, $2, $3)`,
      [action, details, user_id || 1]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur create activity:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ POST /api/admin/verify - Vérifier les accès (fallback, avec bcrypt)
router.post('/admin/verify', async (req, res) => {
  const { password } = req.body;
  try {
    const superAdminResult = await pool.query(
      "SELECT mot_de_passe FROM utilisateurs WHERE role = 'super_admin' LIMIT 1"
    );

    if (superAdminResult.rows.length > 0) {
      const superHash = superAdminResult.rows[0].mot_de_passe;
      const ok = await verifyPassword(password, superHash);

      // ✅ Migration progressive : si le MDP était en clair, on le hashe
      if (!isHashed(superHash) && String(password) === String(superHash)) {
        try {
          const hashed = await hashPassword(password);
          await pool.query(
            "UPDATE utilisateurs SET mot_de_passe = $1 WHERE role = 'super_admin'",
            [hashed]
          );
          console.log('🔐 MDP Super Admin hashé automatiquement (via /admin/verify)');
        } catch (e) { /* ignore */ }
      }

      if (ok) {
        return res.json({
          success: true,
          token: config.ADMIN_SECRET_TOKEN,
          message: 'Accès Super Admin autorisé',
          role: 'super_admin'
        });
      }
    }

    const dafResult = await pool.query(
      "SELECT mot_de_passe FROM utilisateurs WHERE role = 'daf' LIMIT 1"
    );
    if (dafResult.rows.length > 0) {
      const dafHash = dafResult.rows[0].mot_de_passe;
      const ok = await verifyPassword(password, dafHash);

      if (!isHashed(dafHash) && String(password) === String(dafHash)) {
        try {
          const hashed = await hashPassword(password);
          await pool.query(
            "UPDATE utilisateurs SET mot_de_passe = $1 WHERE role = 'daf'",
            [hashed]
          );
          console.log('🔐 MDP DAF hashé automatiquement');
        } catch (e) { /* ignore */ }
      }

      if (ok) {
        return res.json({
          success: true,
          token: config.DAF_SECRET_TOKEN,
          message: 'Accès DAF autorisé',
          role: 'daf'
        });
      }
    }

    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  } catch (error) {
    console.error('Erreur verify admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;