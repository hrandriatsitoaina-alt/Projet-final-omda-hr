// server/routes/accesDaf.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
const config = require('../config');
const { hashPassword, verifyPassword, isHashed } = require('../utils/password');
const { signSession, verifySession } = require('../utils/session');

const CODE_REGEX = /^.{4}$/;
const ROLES_PAYMENT = ['super_admin', 'daf', 'admin'];
const ROLES_ADMIN_PANEL = ['super_admin', 'admin'];

async function hashUserPassword(plainPassword) {
  return await hashPassword(plainPassword);
}

async function verifyUserPassword(plainPassword, storedHash) {
  if (!storedHash) return false;
  if (!isHashed(storedHash)) {
    return String(plainPassword) === String(storedHash);
  }
  return await verifyPassword(plainPassword, storedHash);
}

function getAllowedRoles(scope) {
  if (scope === 'admin-panel') return ROLES_ADMIN_PANEL;
  return ROLES_PAYMENT;
}

// ============================================================
// MIDDLEWARES
// ============================================================
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers.admintoken || req.headers['admintoken'];
  if (!adminToken) return res.status(403).json({ success: false, message: 'Session invalide ou expirée' });
  const sessionPayload = verifySession(adminToken);
  if (sessionPayload && ROLES_PAYMENT.includes(sessionPayload.role)) {
    req.adminRole = sessionPayload.role;
    req.adminUserId = sessionPayload.id;
    req.adminEmail = sessionPayload.email;
    return next();
  }
  const validTokens = [config.ADMIN_SECRET_TOKEN, config.DAF_SECRET_TOKEN];
  if (validTokens.includes(adminToken)) {
    req.adminRole = adminToken === config.ADMIN_SECRET_TOKEN ? 'super_admin' : 'daf';
    return next();
  }
  return res.status(403).json({ success: false, message: 'Session invalide ou expirée' });
};

const verifySuperAdminOnly = (req, res, next) => {
  const adminToken = req.headers.admintoken || req.headers['admintoken'];
  if (!adminToken) return res.status(403).json({ success: false, message: 'Action réservée au Super Admin.' });
  const sessionPayload = verifySession(adminToken);
  if (sessionPayload) {
    if (sessionPayload.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Action réservée au Super Admin.' });
    }
    req.adminRole = 'super_admin';
    req.adminUserId = sessionPayload.id;
    req.adminEmail = sessionPayload.email;
    return next();
  }
  if (adminToken === config.ADMIN_SECRET_TOKEN) {
    req.adminRole = 'super_admin';
    return next();
  }
  return res.status(403).json({ success: false, message: 'Action réservée au Super Admin.' });
};

const verifyAdminPanelAccess = (req, res, next) => {
  const adminToken = req.headers.admintoken || req.headers['admintoken'];
  if (!adminToken) return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
  const sessionPayload = verifySession(adminToken);
  if (sessionPayload && ROLES_ADMIN_PANEL.includes(sessionPayload.role)) {
    req.adminRole = sessionPayload.role;
    req.adminUserId = sessionPayload.id;
    req.adminEmail = sessionPayload.email;
    return next();
  }
  if (adminToken === config.ADMIN_SECRET_TOKEN) {
    req.adminRole = 'super_admin';
    return next();
  }
  return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
};

// ============================================================
// ✅ 0. BOOTSTRAP-STATUS
// ============================================================
router.get('/admin/bootstrap-status', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS total FROM utilisateurs WHERE LOWER(TRIM(role)) = 'super_admin'"
    );
    const total = result.rows[0]?.total || 0;
    console.log(`🔎 /admin/bootstrap-status → ${total} super_admin en base → needsBootstrap=${total === 0}`);
    return res.json({ success: true, needsBootstrap: total === 0 });
  } catch (err) {
    console.error('❌ bootstrap-status error:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// ✅ 1. BOOTSTRAP : CRÉATION DU PREMIER SUPER ADMIN
// ============================================================
router.post('/admin/bootstrap', async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body || {};

    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Champs manquants' });
    }
    if (String(mot_de_passe).length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit contenir exactement 4 caractères',
      });
    }

    const existing = await pool.query(
      "SELECT id FROM utilisateurs WHERE LOWER(TRIM(role)) = 'super_admin' LIMIT 1"
    );
    if (existing.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Un Super Admin existe déjà. Bootstrap interdit.',
      });
    }

    const hash = await hashUserPassword(mot_de_passe);

    const insert = await pool.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, created_at)
       VALUES ($1, $2, $3, 'super_admin', 'actif', NOW())
       RETURNING id, nom, email, role, statut`,
      [nom.trim(), email.trim().toLowerCase(), hash]
    );

    const user = insert.rows[0];

    const sessionToken = signSession({
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      scope: 'admin-panel',
    });

    console.log(`✅ /admin/bootstrap → Super Admin créé ID=${user.id}, email="${user.email}"`);

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
      message: 'Super Admin créé avec succès ✅',
    });
  } catch (err) {
    console.error('❌ bootstrap error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ✅ /admin/session
// ============================================================
router.get('/admin/session', async (req, res) => {
  const adminToken = req.headers.admintoken || req.headers['admintoken'];
  const scope = req.query.scope || 'payment';
  if (!adminToken) return res.status(401).json({ success: false, message: 'Session manquante' });

  const allowedRoles = getAllowedRoles(scope);

  const payload = verifySession(adminToken);
  if (payload) {
    console.log(`🔍 /admin/session → token ID=${payload.id}, role=${payload.role}`);
    if (!allowedRoles.includes(payload.role)) {
      return res.status(403).json({ success: false, message: 'Accès refusé pour ce rôle.' });
    }
    try {
      const result = await pool.query(
        `SELECT id, nom, email, role, statut FROM utilisateurs 
         WHERE id = $1 AND LOWER(TRIM(statut)) = 'actif' LIMIT 1`,
        [payload.id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Utilisateur inactif' });
      }
      const user = result.rows[0];
      console.log(`✅ /admin/session → user ID=${user.id}, nom="${user.nom}"`);
      return res.json({
        success: true,
        user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  const validTokens = [config.ADMIN_SECRET_TOKEN, config.DAF_SECRET_TOKEN];
  if (validTokens.includes(adminToken)) {
    try {
      const roleToFind = adminToken === config.ADMIN_SECRET_TOKEN ? 'super_admin' : 'daf';
      const result = await pool.query(
        `SELECT id, nom, email, role FROM utilisateurs 
         WHERE LOWER(TRIM(role)) = $1 AND LOWER(TRIM(statut)) = 'actif' 
         ORDER BY id ASC LIMIT 1`,
        [roleToFind]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({
          success: true,
          user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
        });
      }
    } catch (e) { /* ignore */ }
  }

  return res.status(401).json({ success: false, message: 'Session invalide ou expirée' });
});

// ============================================================
// ✅ /admin/verify-email
// ============================================================
router.post('/admin/verify-email', async (req, res) => {
  const { email, scope } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email requis' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const allowedRoles = getAllowedRoles(scope || 'payment');

  console.log(`\n🔎 /admin/verify-email — email="${normalizedEmail}" scope="${scope}"`);

  try {
    const debug = await pool.query(
      `SELECT id, nom, email, role, statut FROM utilisateurs WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );
    console.log(`   ${debug.rows.length} utilisateur(s) avec cet email :`);
    debug.rows.forEach(u => console.log(`     → ID=${u.id}, nom="${u.nom}", role="${u.role}", statut="${u.statut}"`));

    const result = await pool.query(
      `SELECT id, nom, email, role FROM utilisateurs 
       WHERE LOWER(TRIM(email)) = $1 
         AND LOWER(TRIM(role)) = ANY($2::text[]) 
         AND LOWER(TRIM(statut)) = 'actif' LIMIT 1`,
      [normalizedEmail, allowedRoles]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Aucun utilisateur autorisé pour "${normalizedEmail}"`);
      return res.status(403).json({
        success: false,
        notFound: true,
        message: 'Cet email n\'est pas autorisé'
      });
    }
    const user = result.rows[0];
    console.log(`✅ /admin/verify-email → user ID=${user.id}, nom="${user.nom}"`);
    return res.json({
      success: true,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ /admin/verify
// ============================================================
router.post('/admin/verify', async (req, res) => {
  let { password, email, scope } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Code requis' });
  }
  password = password.trim();
  if (!CODE_REGEX.test(password)) {
    return res.status(400).json({ success: false, message: 'Le code doit contenir exactement 4 caractères' });
  }
  const allowedRoles = getAllowedRoles(scope || 'payment');

  console.log(`\n🔎 /admin/verify — email="${email}" scope="${scope}"`);

  try {
    let result;

    if (email && typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      result = await pool.query(
        `SELECT id, nom, email, role, mot_de_passe FROM utilisateurs 
         WHERE LOWER(TRIM(email)) = $1 
           AND LOWER(TRIM(role)) = ANY($2::text[]) 
           AND LOWER(TRIM(statut)) = 'actif' LIMIT 1`,
        [normalizedEmail, allowedRoles]
      );
      console.log(`   ${result.rows.length} utilisateur(s) ciblé(s) par email`);
    } else {
      result = await pool.query(
        `SELECT id, nom, email, role, mot_de_passe FROM utilisateurs 
         WHERE LOWER(TRIM(role)) = ANY($1::text[]) 
           AND LOWER(TRIM(statut)) = 'actif'
         ORDER BY id ASC`,
        [allowedRoles]
      );
      console.log(`   ${result.rows.length} compte(s) candidat(s) (pas d'email)`);
    }

    if (email && result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
    }

    for (const user of result.rows) {
      const storedHash = user.mot_de_passe;
      const ok = await verifyUserPassword(password, storedHash);
      console.log(`   Test user ID=${user.id} (${user.email}) → ${ok ? '✅ MATCH' : '❌'}`);

      if (!isHashed(storedHash) && String(password) === String(storedHash)) {
        try {
          const hashed = await hashUserPassword(password);
          await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, user.id]);
        } catch (e) { /* ignore */ }
      }

      if (ok) {
        const sessionToken = signSession({
          id: user.id,
          email: user.email,
          role: user.role,
          nom: user.nom,
          scope: scope || 'payment',
        });

        await pool.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = $1', [user.id]).catch(() => {});

        console.log(`✅ /admin/verify → session créée pour ID=${user.id}, nom="${user.nom}"`);
        return res.json({
          success: true,
          token: sessionToken,
          role: user.role,
          user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
          message: `Accès autorisé (${user.nom} - ${user.role})`
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Code incorrect' });
  } catch (error) {
    console.error('Erreur verify admin:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// CHANGEMENT DE MOT DE PASSE
// ============================================================
router.post('/admin/change-password', verifySuperAdminOnly, async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId requis' });
  try {
    const result = await pool.query(
      "SELECT mot_de_passe, id FROM utilisateurs WHERE id = $1 AND LOWER(TRIM(role)) = 'super_admin'",
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const ok = await verifyUserPassword(oldPassword, result.rows[0].mot_de_passe);
    if (!ok) return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect' });
    if (!newPassword || !CODE_REGEX.test(newPassword)) return res.status(400).json({ success: false, message: 'Code invalide' });
    const hashed = await hashUserPassword(newPassword);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, result.rows[0].id]);
    res.json({ success: true, message: 'Mot de passe modifié' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/change-password-daf', verifyAdminToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const result = await pool.query("SELECT mot_de_passe, id FROM utilisateurs WHERE LOWER(TRIM(role)) = 'daf' LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'DAF non trouvé' });
    const ok = await verifyUserPassword(oldPassword, result.rows[0].mot_de_passe);
    if (!ok) return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect' });
    if (!newPassword || !CODE_REGEX.test(newPassword)) return res.status(400).json({ success: false, message: 'Code invalide' });
    const hashed = await hashUserPassword(newPassword);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, result.rows[0].id]);
    res.json({ success: true, message: 'Mot de passe DAF modifié' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/change-password-admin', verifyAdminToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const result = await pool.query("SELECT mot_de_passe, id FROM utilisateurs WHERE LOWER(TRIM(role)) = 'admin' LIMIT 1");
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Admin non trouvé' });
    const ok = await verifyUserPassword(oldPassword, result.rows[0].mot_de_passe);
    if (!ok) return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect' });
    if (!newPassword || !CODE_REGEX.test(newPassword)) return res.status(400).json({ success: false, message: 'Code invalide' });
    const hashed = await hashUserPassword(newPassword);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, result.rows[0].id]);
    res.json({ success: true, message: 'Mot de passe Admin modifié' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.verifyAdminToken = verifyAdminToken;
module.exports.verifySuperAdminOnly = verifySuperAdminOnly;
module.exports.verifyAdminPanelAccess = verifyAdminPanelAccess;
module.exports.hashUserPassword = hashUserPassword;
module.exports.CODE_REGEX = CODE_REGEX;