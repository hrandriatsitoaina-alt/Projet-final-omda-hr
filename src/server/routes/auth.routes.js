// server/routes/auth.js
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

  if (letters.length >= 5) push(L1 + letters[2] + letters[4]);
  if (letters.length >= 4) push(L1 + letters[1] + letters[3]);

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
      if (await isPrefixAvailable(candidate, excludeUserId)) return candidate;
    }
  }
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      for (let k = 0; k < alphabet.length; k++) {
        const candidate = alphabet[i] + alphabet[j] + alphabet[k];
        if (await isPrefixAvailable(candidate, excludeUserId)) return candidate;
      }
    }
  }
  throw new Error('Impossible de générer un préfixe unique');
}

async function generateUniquePrefix(nom, excludeUserId = null) {
  const cleaned = cleanName(nom);
  if (!cleaned) throw new Error('Nom invalide pour la génération du préfixe');
  const candidates = buildCandidates(cleaned);
  for (const candidate of candidates) {
    if (await isPrefixAvailable(candidate, excludeUserId)) return candidate;
  }
  const L1 = cleaned[0] || 'X';
  return await bruteForcePrefix(L1, excludeUserId);
}

// ============================================================
// ROUTE PUBLIQUE D'INSCRIPTION
// ============================================================
router.post('/auth/register', async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
  }
  if (mot_de_passe.length < 4) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 4 caractères.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    const prefix = await generateUniquePrefix(nom);
    // ✅ Hachage du mot de passe
    const hashedPassword = await hashPassword(mot_de_passe);

    const result = await pool.query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix)
       VALUES ($1, $2, $3, 'user', 'inactif', $4)
       RETURNING id, nom, email, role, statut, prefix`,
      [nom, email, hashedPassword, prefix]
    );

    const newUser = result.rows[0];
    const currentYear = new Date().getFullYear();
    const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'OCC', 'Bus', 'Night club'];
    for (const type of typesUsager) {
      await pool.query(
        `INSERT INTO compteurs_dossiers_utilisateurs (utilisateur_id, annee, compteur, type_usager)
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (utilisateur_id, annee, type_usager) DO NOTHING`,
        [newUser.id, currentYear, type]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      user: newUser
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
});

// ============================================================
// ✅ ROUTE DE LOGIN (CORRIGÉE AVEC BCRYPT)
// ============================================================
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔐 Tentative de connexion : ${username}`);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
  }

  try {
    // ✅ ÉTAPE 1 : Chercher l'utilisateur par email OU nom (SANS filtrer par mot de passe)
    const result = await pool.query(
      `SELECT id, nom, email, role, statut, prefix, mot_de_passe
       FROM utilisateurs 
       WHERE (email = $1 OR nom = $1) AND statut = 'actif'
       LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Aucun utilisateur trouvé : ${username}`);
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const user = result.rows[0];

    // ✅ ÉTAPE 2 : Vérifier le mot de passe (bcrypt OU clair pour migration)
    const passwordOk = await verifyPassword(password, user.mot_de_passe);

    if (!passwordOk) {
      console.log(`❌ Mot de passe incorrect pour : ${user.nom}`);
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    // ✅ ÉTAPE 3 : Migration progressive
    //    Si l'utilisateur avait un mot de passe en CLAIR, on le hashe automatiquement
    if (!isHashed(user.mot_de_passe)) {
      try {
        const hashed = await hashPassword(password);
        await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, user.id]);
        console.log(`🔐 Mot de passe hashé automatiquement pour ${user.nom}`);
      } catch (hashErr) {
        console.warn('⚠️ Impossible de hasher le mot de passe:', hashErr.message);
      }
    }

    // ✅ Mise à jour de la dernière connexion
    await pool.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = $1', [user.id]);

    console.log(`✅ Connexion réussie : ${user.nom} (${user.role})`);

    const responseData = {
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        prefix: user.prefix
      },
      message: `Bienvenue ${user.nom} !`
    };

    // ✅ Attribution du token selon le rôle
    if (user.role === 'super_admin') {
      responseData.adminToken = config.ADMIN_SECRET_TOKEN;
    } else if (user.role === 'admin') {
      responseData.adminToken = config.ADMIN_ROLE_SECRET_TOKEN;
    } else if (user.role === 'daf') {
      responseData.adminToken = config.DAF_SECRET_TOKEN;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================
// ÉTAPE 1 : VÉRIFICATION DE L'EMAIL (super_admin ou admin UNIQUEMENT)
// ============================================================
router.post('/admin/verify-email', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, notFound: true, message: 'Email requis.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      `SELECT id, nom, email, role, statut, prefix
       FROM utilisateurs
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        notFound: true,
        message: 'Accès refusé. Cet email n\'est pas autorisé.'
      });
    }

    const user = result.rows[0];

    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        notFound: false,
        message: 'Accès refusé. Réservé au Super Admin ou Admin.'
      });
    }

    if (user.statut !== 'actif') {
      return res.status(403).json({
        success: false,
        notFound: false,
        message: 'Compte inactif.'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        prefix: user.prefix
      }
    });
  } catch (error) {
    console.error('Erreur verify-email:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ============================================================
// ÉTAPE 2 : VÉRIFICATION DU MOT DE PASSE + GÉNÉRATION TOKEN
// ============================================================
router.post('/admin/verify', async (req, res) => {
  const { password, email } = req.body;

  if (!password || String(password).length !== 4) {
    return res.status(400).json({ success: false, message: 'Code à 4 chiffres requis.' });
  }

  try {
    let query, params;

    if (email) {
      query = `SELECT id, nom, email, role, statut, prefix, mot_de_passe
               FROM utilisateurs
               WHERE LOWER(email) = $1
                 AND statut = 'actif'
                 AND role IN ('super_admin', 'admin')
               LIMIT 1`;
      params = [String(email).trim().toLowerCase()];
    } else {
      query = `SELECT id, nom, email, role, statut, prefix, mot_de_passe
               FROM utilisateurs
               WHERE statut = 'actif'
                 AND role IN ('super_admin', 'admin')
               ORDER BY id
               LIMIT 1`;
      params = [];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Accès non autorisé.' });
    }

    const user = result.rows[0];

    // ✅ Vérification bcrypt (ou clair pour migration)
    const passwordOk = await verifyPassword(password, user.mot_de_passe);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect.' });
    }

    // ✅ Migration progressive : hash automatique si en clair
    if (!isHashed(user.mot_de_passe)) {
      try {
        const hashed = await hashPassword(password);
        await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, user.id]);
        console.log(`🔐 MDP hashé automatiquement pour ${user.nom}`);
      } catch (e) { /* ignore */ }
    }

    // ✅ Token selon le rôle
    let tokenValue;
    if (user.role === 'super_admin') {
      tokenValue = config.ADMIN_SECRET_TOKEN;
    } else if (user.role === 'admin') {
      tokenValue = config.ADMIN_ROLE_SECRET_TOKEN;
    } else if (user.role === 'daf') {
      tokenValue = config.DAF_SECRET_TOKEN;
    } else {
      return res.status(403).json({ success: false, message: 'Rôle non autorisé.' });
    }

    return res.json({
      success: true,
      token: tokenValue,
      role: user.role,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        prefix: user.prefix
      },
      message: `Accès autorisé — Bienvenue ${user.nom}`
    });
  } catch (error) {
    console.error('Erreur admin/verify:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ============================================================
// ROUTES POUR LE FRONTEND
// ============================================================
router.get('/auth/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, email, role, statut, prefix, created_at, derniere_connexion FROM utilisateurs ORDER BY id'
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Erreur auth/users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/auth/current-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try { userId = parseInt(token); } catch (e) { }
    }
    let result;
    if (userId) {
      result = await pool.query(`
        SELECT id, nom, email, role, prefix FROM utilisateurs 
        WHERE id = $1 AND statut = 'actif'`, [userId]);
    } else {
      result = await pool.query(`
        SELECT id, nom, email, role, prefix FROM utilisateurs 
        WHERE statut = 'actif' ORDER BY id LIMIT 1`);
    }
    if (result.rows.length === 0) {
      const defaultPrefix = await generateUniquePrefix('Utilisateur par défaut');
      const hashed = await hashPassword('1234');
      const insertResult = await pool.query(`
        INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix) 
        VALUES ('Utilisateur par défaut', 'user@omda.mg', $1, 'user', 'actif', $2) 
        RETURNING id, nom, email, role, prefix`, [hashed, defaultPrefix]);
      result.rows = insertResult.rows;
    }
    const user = result.rows[0];
    res.json({ success: true, user: { ...user, prefix: user.prefix } });
  } catch (error) {
    console.error('Erreur current-user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nom, u.prefix, u.email, u.role
      FROM utilisateurs u WHERE u.statut = 'actif' ORDER BY u.id
    `);
    const usersWithCounts = [];
    for (const user of result.rows) {
      const userData = { ...user, dossiers: {} };
      let totalDossiers = 0;
      const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'OCC', 'Bus', 'Night club'];
      for (const type of typesUsager) {
        const counterResult = await pool.query(
          `SELECT compteur FROM compteurs_dossiers_utilisateurs 
           WHERE utilisateur_id = $1 AND annee = $2 AND type_usager = $3`,
          [user.id, new Date().getFullYear(), type]
        );
        const count = counterResult.rows.length > 0 ? counterResult.rows[0].compteur : 0;
        userData.dossiers[type] = count;
        totalDossiers += count;
      }
      userData.totalDossiers = totalDossiers;
      usersWithCounts.push(userData);
    }
    res.json({ success: true, users: usersWithCounts });
  } catch (error) {
    console.error('Erreur stats users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;