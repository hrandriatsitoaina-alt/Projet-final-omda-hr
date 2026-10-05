// server/routes/gestionbdAdmin.route.js
// ═══════════════════════════════════════════════════════════════════
// GESTION BDD ADMIN — Réservé SuperAdmin
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { hashPassword, verifyPassword } = require('../utils/password');

console.log('✅ Routeur gestionbdAdmin chargé (SuperAdmin only)');

// ============================================================
// CONSTANTES
// ============================================================
const SCHEMA = 'omda_app';
const CONFIRMATION_TRUNCATE = 'EFFACER_TOUT';
const MAX_ROWS_PER_PAGE = 200;

// ✅ TABLES PROTÉGÉES : jamais vidées, jamais supprimées
//    • restauration_config : contient le mot de passe de sécurité
//    • backup_config       : configuration de sauvegarde
//    • utilisateurs        : COMPTES UTILISATEURS (à protéger absolument)
const TABLES_PROTEGEES = [
  'restauration_config',
  'backup_config',
  'utilisateurs',
];

// ============================================================
// DÉCODAGE TOKEN OMDA
// ============================================================
const decodeOmdaToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0) return null;
  if (token.startsWith('eyJhbGci')) return null;
  try {
    const base64Part = token.substring(0, dotIndex);
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
};

// ============================================================
// MIDDLEWARE UNIVERSEL
// ============================================================
const requireSuperAdmin = async (req, res, next) => {
  try {
    const token =
      req.headers.admintoken ||
      req.headers.adminToken ||
      req.headers['x-admin-token'] ||
      (req.headers.authorization || '').replace('Bearer ', '') ||
      req.query.token ||
      '';

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }

    let payload = decodeOmdaToken(token);

    if (!payload && token.split('.').length === 3) {
      try {
        const jwt = require('jsonwebtoken');
        payload = jwt.decode(token);
      } catch (e) { /* ignore */ }
    }

    if (payload && payload.exp && payload.exp < Date.now()) {
      return res.status(401).json({ success: false, message: 'Session expirée' });
    }

    let user = null;
    if (payload) {
      const userId = payload.id || payload.userId || payload.sub;
      const userEmail = payload.email;
      if (userId) {
        const r = await pool.query(
          `SELECT id, nom, email, role, statut FROM utilisateurs WHERE id = $1`,
          [userId]
        );
        if (r.rows.length > 0) user = r.rows[0];
      }
      if (!user && userEmail) {
        const r = await pool.query(
          `SELECT id, nom, email, role, statut FROM utilisateurs WHERE LOWER(email) = $1`,
          [String(userEmail).toLowerCase()]
        );
        if (r.rows.length > 0) user = r.rows[0];
      }
    }

    if (!user) {
      let userId = null;
      if (token.startsWith('user_') || token.startsWith('token_')) {
        userId = parseInt(token.split('_')[1], 10);
      } else if (/^\d+$/.test(token)) {
        userId = parseInt(token, 10);
      }
      if (userId && !isNaN(userId)) {
        const r = await pool.query(
          `SELECT id, nom, email, role, statut FROM utilisateurs WHERE id = $1`,
          [userId]
        );
        if (r.rows.length > 0) user = r.rows[0];
      }
    }

    if (!user) {
      return res.status(403).json({ success: false, message: 'Utilisateur introuvable' });
    }
    if (user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: `Réservé au Super Admin (rôle: ${user.role})` });
    }
    if (user.statut !== 'actif') {
      return res.status(403).json({ success: false, message: 'Compte inactif' });
    }

    req.superAdmin = user;
    next();
  } catch (err) {
    console.error('❌ requireSuperAdmin:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// UTILITAIRES
// ============================================================
const isValidTable = async (tableName) => {
  if (!tableName || typeof tableName !== 'string') return false;
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) return false;
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [SCHEMA, tableName]
  );
  return result.rows.length > 0;
};

const getColumns = async (tableName) => {
  const result = await pool.query(`
    SELECT 
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
        AND tc.constraint_type = 'PRIMARY KEY'
    ) pk ON pk.column_name = c.column_name
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [SCHEMA, tableName]);
  return result.rows;
};

const getTableDependencies = async (tableName) => {
  const fkSortantes = await pool.query(`
    SELECT
      tc.constraint_name AS fk_name,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
  `, [SCHEMA, tableName]);

  const fkEntrantes = await pool.query(`
    SELECT
      tc.constraint_name AS fk_name,
      tc.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.column_name AS target_column,
      rc.delete_rule AS on_delete
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND ccu.table_name = $2
      AND tc.table_name != $2
  `, [SCHEMA, tableName]);

  return {
    sortantes: fkSortantes.rows,
    entrantes: fkEntrantes.rows,
  };
};

const getAllTables = async () => {
  const result = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name
  `, [SCHEMA]);

  const tables = [];
  for (const row of result.rows) {
    const tname = row.table_name;
    try {
      const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM ${SCHEMA}.${tname}`);
      const cols = await getColumns(tname);
      const pk = cols.find(c => c.is_primary);
      tables.push({
        name: tname,
        rowCount: countResult.rows[0].total,
        columns: cols,
        primaryKey: pk ? pk.column_name : 'id',
        protected: TABLES_PROTEGEES.includes(tname),
      });
    } catch (e) {
      tables.push({
        name: tname, rowCount: 0, columns: [],
        primaryKey: 'id', protected: TABLES_PROTEGEES.includes(tname), error: e.message,
      });
    }
  }
  return tables;
};

const logActivity = async (action, details, userId) => {
  try {
    await pool.query(`
      INSERT INTO activites (action, details, user_id, created_by, created_at)
      VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP)
    `, [action, details, userId || null]);
  } catch (e) {
    console.warn('⚠️ logActivity:', e.message);
  }
};

// ============================================================
// 1) GET /api/gestionbd/tables
// ============================================================
router.get('/gestionbd/tables', requireSuperAdmin, async (req, res) => {
  try {
    const tables = await getAllTables();
    res.json({ success: true, tables, total: tables.length });
  } catch (err) {
    console.error('❌ GET /gestionbd/tables:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 2) GET /api/gestionbd/table/:nom
// ============================================================
router.get('/gestionbd/table/:nom', requireSuperAdmin, async (req, res) => {
  try {
    const { nom } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, MAX_ROWS_PER_PAGE);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    if (!(await isValidTable(nom))) {
      return res.status(404).json({ success: false, message: `Table "${nom}" introuvable` });
    }

    const columns = await getColumns(nom);
    const pk = columns.find(c => c.is_primary);
    const primaryKey = pk ? pk.column_name : 'id';

    const [countRes, rowsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM ${SCHEMA}.${nom}`),
      pool.query(
        `SELECT * FROM ${SCHEMA}.${nom} ORDER BY ${primaryKey} ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    res.json({
      success: true, table: nom, columns, primaryKey,
      total: countRes.rows[0].total, limit, offset,
      rows: rowsRes.rows, protected: TABLES_PROTEGEES.includes(nom),
    });
  } catch (err) {
    console.error(`❌ GET /gestionbd/table/${req.params.nom}:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 3) GET /api/gestionbd/table/:nom/dependencies
// ============================================================
router.get('/gestionbd/table/:nom/dependencies', requireSuperAdmin, async (req, res) => {
  try {
    const { nom } = req.params;

    if (!(await isValidTable(nom))) {
      return res.status(404).json({ success: false, message: `Table "${nom}" introuvable` });
    }

    const deps = await getTableDependencies(nom);

    res.json({
      success: true,
      table: nom,
      sortantes: deps.sortantes,
      entrantes: deps.entrantes,
    });
  } catch (err) {
    console.error(`❌ GET /gestionbd/table/${req.params.nom}/dependencies:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 4) PUT /api/gestionbd/table/:nom/:id
// ============================================================
router.put('/gestionbd/table/:nom/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { nom, id } = req.params;
    const updates = req.body || {};

    if (!(await isValidTable(nom))) {
      return res.status(404).json({ success: false, message: `Table "${nom}" introuvable` });
    }
    if (TABLES_PROTEGEES.includes(nom)) {
      return res.status(403).json({ success: false, message: `Table "${nom}" protégée` });
    }

    const columns = await getColumns(nom);
    const pk = columns.find(c => c.is_primary);
    const primaryKey = pk ? pk.column_name : 'id';
    const columnNames = columns.map(c => c.column_name);

    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (columnNames.includes(key) && key !== primaryKey) {
        filteredUpdates[key] = value === '' ? null : value;
      }
    }

    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune donnée valide' });
    }

    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = [...Object.values(filteredUpdates), id];

    const sql = `
      UPDATE ${SCHEMA}.${nom} SET ${setClause}
      WHERE ${primaryKey} = $${values.length} RETURNING *
    `;

    const result = await pool.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ligne introuvable' });
    }

    await logActivity(
      `Modification BDD : ${nom}`,
      `Ligne ${primaryKey}=${id} modifiée (${keys.join(', ')})`,
      req.superAdmin.id
    );

    res.json({ success: true, message: 'Ligne mise à jour', row: result.rows[0] });
  } catch (err) {
    console.error(`❌ PUT /gestionbd/table/${req.params.nom}/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 5) DELETE /api/gestionbd/table/:nom/:id
// ============================================================
router.delete('/gestionbd/table/:nom/:id', requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { nom, id } = req.params;

    if (!(await isValidTable(nom))) {
      return res.status(404).json({ success: false, message: `Table "${nom}" introuvable` });
    }
    if (TABLES_PROTEGEES.includes(nom)) {
      return res.status(403).json({
        success: false,
        message: `La table "${nom}" est PROTÉGÉE et ne peut pas être modifiée`,
        hint: nom === 'utilisateurs'
          ? 'Pour désactiver un utilisateur, utilisez la gestion des utilisateurs dans le panneau Admin.'
          : 'Cette table est essentielle au fonctionnement du système.',
      });
    }

    const columns = await getColumns(nom);
    const pk = columns.find(c => c.is_primary);
    const primaryKey = pk ? pk.column_name : 'id';

    const deps = await getTableDependencies(nom);

    await client.query('BEGIN');

    const countsBefore = {};
    for (const dep of deps.entrantes) {
      if (dep.on_delete === 'CASCADE') {
        try {
          const cnt = await client.query(
            `SELECT COUNT(*)::int AS total FROM ${SCHEMA}.${dep.source_table} WHERE ${dep.source_column} = $1`,
            [id]
          );
          countsBefore[dep.source_table] = cnt.rows[0].total;
        } catch (e) {
          countsBefore[dep.source_table] = 0;
        }
      }
    }

    const result = await client.query(
      `DELETE FROM ${SCHEMA}.${nom} WHERE ${primaryKey} = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Ligne introuvable' });
    }

    await client.query('COMMIT');

    await logActivity(
      `Suppression BDD : ${nom}`,
      `Ligne ${primaryKey}=${id} supprimée`,
      req.superAdmin.id
    );

    const cascaded = Object.entries(countsBefore)
      .filter(([_, count]) => count > 0)
      .map(([table, count]) => ({ table, rowsDeleted: count }));

    res.json({
      success: true,
      message: 'Ligne supprimée',
      row: result.rows[0],
      cascaded,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ DELETE /gestionbd/table/${req.params.nom}/${req.params.id}:`, err);

    if (err.message.includes('violates foreign key constraint')) {
      const match = err.message.match(/table "([^"]+)"/);
      const tableName = match ? match[1] : 'autre table';
      return res.status(409).json({
        success: false,
        message: `Impossible de supprimer : cette ligne est référencée par d'autres données.`,
        hint: `Vérifiez la table "${tableName}" ou supprimez d'abord les éléments liés.`,
        errorType: 'FK_CONSTRAINT',
      });
    }

    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 6) POST /api/gestionbd/truncate-all
//    ⚠️ VIDE TOUTES LES TABLES SAUF LES PROTÉGÉES
//    → utilisateurs est automatiquement EXCLU
// ============================================================
router.post('/gestionbd/truncate-all', requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { confirmation } = req.body || {};
    if (confirmation !== CONFIRMATION_TRUNCATE) {
      return res.status(400).json({ success: false, message: `Confirmation "${CONFIRMATION_TRUNCATE}" requise` });
    }

    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name
    `, [SCHEMA]);

    // ✅ EXCLURE les tables protégées (dont utilisateurs)
    const tablesToTruncate = tablesRes.rows
      .map(r => r.table_name)
      .filter(t => !TABLES_PROTEGEES.includes(t));

    const tablesExclues = tablesRes.rows
      .map(r => r.table_name)
      .filter(t => TABLES_PROTEGEES.includes(t));

    if (tablesToTruncate.length === 0) {
      return res.json({ success: true, message: 'Aucune table à vider', truncated: [] });
    }

    await client.query('BEGIN');
    const list = tablesToTruncate.map(t => `${SCHEMA}.${t}`).join(', ');
    await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    await client.query('COMMIT');

    await logActivity(
      'TRUNCATE ALL (BDD)',
      `Tables vidées : ${tablesToTruncate.length}. Exclues : ${tablesExclues.join(', ')}`,
      req.superAdmin.id
    );

    console.log(`✅ TRUNCATE ALL : ${tablesToTruncate.length} table(s) vidée(s), ${tablesExclues.length} protégée(s)`);

    res.json({
      success: true,
      message: `✅ ${tablesToTruncate.length} table(s) vidée(s) • ${tablesExclues.length} protégée(s) (dont utilisateurs)`,
      truncated: tablesToTruncate,
      excluded: tablesExclues,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /gestionbd/truncate-all:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 7) POST /api/gestionbd/truncate/:nom
// ============================================================
router.post('/gestionbd/truncate/:nom', requireSuperAdmin, async (req, res) => {
  try {
    const { nom } = req.params;
    const { confirmation } = req.body || {};

    if (confirmation !== CONFIRMATION_TRUNCATE) {
      return res.status(400).json({ success: false, message: `Confirmation "${CONFIRMATION_TRUNCATE}" requise` });
    }
    if (!(await isValidTable(nom))) {
      return res.status(404).json({ success: false, message: `Table "${nom}" introuvable` });
    }
    if (TABLES_PROTEGEES.includes(nom)) {
      return res.status(403).json({
        success: false,
        message: `La table "${nom}" est PROTÉGÉE et ne peut pas être vidée`,
      });
    }

    await pool.query(`TRUNCATE TABLE ${SCHEMA}.${nom} RESTART IDENTITY CASCADE`);
    await logActivity(`TRUNCATE ${nom}`, `Table "${nom}" vidée`, req.superAdmin.id);

    res.json({ success: true, message: `✅ Table "${nom}" vidée`, truncated: [nom] });
  } catch (err) {
    console.error(`❌ POST /gestionbd/truncate/${req.params.nom}:`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 8) GET /api/gestionbd/restauration/password-status
// ============================================================
router.get('/gestionbd/restauration/password-status', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, updated_at FROM restauration_config WHERE id = 1`);
    if (result.rows.length === 0) {
      return res.json({ success: true, isDefined: false, lastUpdated: null });
    }
    res.json({ success: true, isDefined: true, lastUpdated: result.rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 9) POST /api/gestionbd/restauration/set-password
// ============================================================
router.post('/gestionbd/restauration/set-password', requireSuperAdmin, async (req, res) => {
  try {
    const { password, confirm } = req.body || {};

    if (!password || !confirm) {
      return res.status(400).json({ success: false, message: 'Mot de passe et confirmation requis' });
    }
    if (!/^\d{4}$/.test(password)) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir exactement 4 chiffres' });
    }
    if (password !== confirm) {
      return res.status(400).json({ success: false, message: 'Les deux codes ne correspondent pas' });
    }

    const newHash = await hashPassword(password);
    const existing = await pool.query(`SELECT id FROM restauration_config WHERE id = 1`);

    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO restauration_config (id, password_hash, updated_by, created_at, updated_at)
        VALUES (1, $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [newHash, req.superAdmin.id]);
    } else {
      await pool.query(`
        UPDATE restauration_config
        SET password_hash = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [newHash, req.superAdmin.id]);
    }

    await logActivity(
      'Changement mot de passe restauration',
      `Mot de passe mis à jour par ${req.superAdmin.nom}`,
      req.superAdmin.id
    );

    res.json({ success: true, message: 'Mot de passe enregistré' });
  } catch (err) {
    console.error('❌ POST /gestionbd/restauration/set-password:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 10) POST /api/gestionbd/restauration/verify-password
// ============================================================
router.post('/gestionbd/restauration/verify-password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || !/^\d{4}$/.test(password)) {
      return res.status(400).json({ success: false, message: 'Mot de passe 4 chiffres requis' });
    }
    const result = await pool.query(`SELECT password_hash FROM restauration_config WHERE id = 1`);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun mot de passe défini' });
    }
    const ok = await verifyPassword(password, result.rows[0].password_hash);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Mot de passe incorrect' });
    }
    res.json({ success: true, message: 'Mot de passe validé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 11) GET /api/gestionbd/health
// ============================================================
router.get('/gestionbd/health', (req, res) => {
  res.json({ success: true, message: 'Routeur OK', timestamp: new Date().toISOString() });
});

module.exports = router;