// server/routes/admin.js
const express = require('express');
const router = express.Router();

// ✅ CORRECTION : importer le VRAI Pool
const db = require('../database');
const pool = db.pool;        // ← le vrai Pool (a .connect())
const query = db.query;      // ← la fonction wrapper (utilise pool.query)

const {
  verifyAdminToken,
  verifySuperAdminOnly,
  verifyAdminPanelAccess,
  hashUserPassword,
  CODE_REGEX,
} = require('./accesDaf.routes');

// ============================================================
// GÉNÉRATION DE PRÉFIXE UNIQUE (inchangé)
// ============================================================
function cleanName(nom) {
  return (nom || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
}

async function isPrefixAvailable(prefix, excludeUserId = null) {
  let q = 'SELECT id FROM utilisateurs WHERE prefix = $1';
  const params = [prefix];
  if (excludeUserId) {
    q += ' AND id != $2';
    params.push(excludeUserId);
  }
  const result = await query(q, params);
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
  if (consonnesApres.length >= 2) push(L1 + consonnesApres[0] + consonnesApres[1]);
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
  if (!cleaned) throw new Error('Nom invalide');
  const candidates = buildCandidates(cleaned);
  for (const candidate of candidates) {
    if (await isPrefixAvailable(candidate, excludeUserId)) return candidate;
  }
  const L1 = cleaned[0] || 'X';
  return await bruteForcePrefix(L1, excludeUserId);
}

// ============================================================
// ROUTES UTILISATEURS
// ============================================================
router.get('/admin/users', verifyAdminPanelAccess, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nom, email, role, statut, prefix, created_at, derniere_connexion FROM utilisateurs ORDER BY id'
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Erreur admin users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/users', verifySuperAdminOnly, async (req, res) => {
  const { nom, email, mot_de_passe, role, statut } = req.body;
  if (!nom || !email || !mot_de_passe) {
    return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
  }
  if (!CODE_REGEX.test(mot_de_passe)) {
    return res.status(400).json({ success: false, message: 'Code d\'accès invalide (4 caractères)' });
  }
  try {
    const existing = await query('SELECT id FROM utilisateurs WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cet email existe déjà' });
    }

    const prefix = await generateUniquePrefix(nom);
    const hashedPassword = await hashUserPassword(mot_de_passe);

    const result = await query(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nom, email, role, statut, prefix`,
      [nom, email, hashedPassword, role || 'user', statut || 'actif', prefix]
    );

    const newUserId = result.rows[0].id;
    const currentYear = new Date().getFullYear();
    const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'OCC', 'Bus', 'Night club'];

    for (const type of typesUsager) {
      await query(
        `INSERT INTO compteurs_dossiers_utilisateurs (utilisateur_id, annee, compteur, type_usager) 
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (utilisateur_id, annee, type_usager) DO NOTHING`,
        [newUserId, currentYear, type]
      );
    }

    await query(
      `INSERT INTO parametres_utilisateur (utilisateur_id) VALUES ($1) ON CONFLICT (utilisateur_id) DO NOTHING`,
      [newUserId]
    );

    res.json({ success: true, user: result.rows[0], message: 'Utilisateur créé avec succès' });
  } catch (error) {
    console.error('Erreur admin add user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/users/:id', verifyAdminPanelAccess, async (req, res) => {
  const { id } = req.params;
  const { nom, email, role, statut, mot_de_passe } = req.body;
  const requesterRole = req.adminRole;

  try {
    const userResult = await query(
      'SELECT id, role, nom, email, statut, prefix FROM utilisateurs WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const currentUser = userResult.rows[0];

    if (requesterRole === 'admin' && currentUser.role !== 'super_admin') {
      if (!statut || (statut !== 'actif' && statut !== 'inactif')) {
        return res.status(400).json({
          success: false,
          message: 'Seul le statut (actif/inactif) peut être modifié.'
        });
      }
      await query('UPDATE utilisateurs SET statut = $1 WHERE id = $2', [statut, id]);
      return res.json({
        success: true,
        message: `Statut mis à jour : ${statut}`,
        prefix: currentUser.prefix
      });
    }

    if (currentUser.role === 'super_admin' && requesterRole !== 'super_admin') {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier le Super Admin' });
    }

    if (role === 'super_admin' && currentUser.role !== 'super_admin') {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas créer un autre Super Admin' });
    }

    let newPrefix = currentUser.prefix;
    if (nom && nom !== currentUser.nom) {
      newPrefix = await generateUniquePrefix(nom, parseInt(id));
    }

    let q, params;
    if (mot_de_passe && mot_de_passe.trim() !== '') {
      if (!CODE_REGEX.test(mot_de_passe)) {
        return res.status(400).json({ success: false, message: 'Code invalide (4 caractères)' });
      }
      const hashedPassword = await hashUserPassword(mot_de_passe);
      q = `UPDATE utilisateurs SET nom = $1, email = $2, role = $3, statut = $4, mot_de_passe = $5, prefix = $6 WHERE id = $7`;
      params = [nom, email, role || currentUser.role, statut || 'actif', hashedPassword, newPrefix, id];
    } else {
      q = `UPDATE utilisateurs SET nom = $1, email = $2, role = $3, statut = $4, prefix = $5 WHERE id = $6`;
      params = [nom, email, role || currentUser.role, statut || 'actif', newPrefix, id];
    }
    await query(q, params);
    res.json({ success: true, message: 'Utilisateur modifié avec succès', prefix: newPrefix });
  } catch (error) {
    console.error('Erreur admin edit user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ✅ DELETE : SUPPRESSION ROBUSTE EN CASCADE
//    Utilise le VRAI Pool (avec .connect()) pour la transaction
// ============================================================
router.delete('/admin/users/:id', verifySuperAdminOnly, async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }

  // ✅ CORRECTION : utiliser le VRAI Pool (db.pool) pour .connect()
  const client = await pool.connect();
  try {
    // 1) Récupérer l'utilisateur
    const userResult = await client.query(
      'SELECT id, nom, email, role FROM utilisateurs WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const targetUser = userResult.rows[0];

    // 2) Protection Super Admin
    if (targetUser.role === 'super_admin') {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer un Super Admin'
      });
    }

    console.log(`🗑️ Suppression ID=${userId}, nom="${targetUser.nom}", role="${targetUser.role}"`);

    // 3) TRANSACTION
    await client.query('BEGIN');

    // a) SET NULL sur created_by
    const tablesSetNullCreatedBy = [
      'backup_historique',
      'backup_annuel',
      'artistes',
      'paiements',
      'facture_usager',
      'usagers',
      'usager_other',
      'usagers_hotel',
      'usagers_magasin',
      'usagers_media',
      'usagers_bus',
      'usagers_nightclub',
      'usagers_occasionnel',
      'notifications',
      'delete_requests',
      'event_artistes',
    ];

    for (const table of tablesSetNullCreatedBy) {
      try {
        await client.query(
          `UPDATE ${table} SET created_by = NULL WHERE created_by = $1`,
          [userId]
        );
      } catch (e) {
        console.log(`   ⚠️ ${table} (created_by): ${e.message.slice(0, 80)}`);
      }
    }

    // b) SET NULL sur user_id
    const tablesSetNullUserId = ['activites', 'delete_history'];
    for (const table of tablesSetNullUserId) {
      try {
        await client.query(
          `UPDATE ${table} SET user_id = NULL WHERE user_id = $1`,
          [userId]
        );
      } catch (e) {
        console.log(`   ⚠️ ${table} (user_id): ${e.message.slice(0, 80)}`);
      }
    }

    // c) SET NULL sur defini_par
    try {
      await client.query(
        `UPDATE backup_config SET defini_par = NULL WHERE defini_par = $1`,
        [userId]
      );
    } catch (e) {
      console.log(`   ⚠️ backup_config: ${e.message.slice(0, 80)}`);
    }

    // d) DELETE sur utilisateur_id (cascade manuelle)
    const tablesDelete = [
      'compteurs_dossiers_utilisateurs',
      'parametres_utilisateur',
    ];
    for (const table of tablesDelete) {
      try {
        await client.query(
          `DELETE FROM ${table} WHERE utilisateur_id = $1`,
          [userId]
        );
      } catch (e) {
        console.log(`   ⚠️ ${table} (delete): ${e.message.slice(0, 80)}`);
      }
    }

    // e) Supprimer l'utilisateur
    const deleteResult = await client.query(
      'DELETE FROM utilisateurs WHERE id = $1 RETURNING id',
      [userId]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    await client.query('COMMIT');
    client.release();

    console.log(`✅ Utilisateur "${targetUser.nom}" supprimé`);

    return res.json({
      success: true,
      message: `Utilisateur "${targetUser.nom}" supprimé avec succès`
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) { /* ignore */ }
    client.release();
    console.error('❌ Erreur suppression utilisateur:', error);

    let friendlyMessage = error.message;
    if (error.message.includes('violates foreign key constraint')) {
      const match = error.message.match(/constraint "([^"]+)"/);
      friendlyMessage = `Impossible de supprimer : contrainte "${match?.[1] || 'FK'}" non satisfaite. Réessayez après avoir nettoyé les données liées.`;
    }

    return res.status(500).json({
      success: false,
      message: friendlyMessage
    });
  }
});

// ============================================================
// ACTIVITÉS
// ============================================================
router.get('/admin/activities', verifyAdminPanelAccess, async (req, res) => {
  try {
    const result = await query(`
      SELECT a.id, a.action, a.details, a.created_at, u.nom as user_nom
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

router.post('/admin/activities', verifyAdminPanelAccess, async (req, res) => {
  const { action, details, user_id } = req.body;
  try {
    await query(
      `INSERT INTO activites (action, details, user_id) VALUES ($1, $2, $3)`,
      [action, details, user_id || 1]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur create activity:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;