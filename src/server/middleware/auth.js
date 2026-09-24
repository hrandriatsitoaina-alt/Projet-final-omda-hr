// server/middleware/auth.js
const config = require('../config');
const pool = require('../database');

// -------------------------------------------------------------------
// Middleware : vérification du token administrateur
// -------------------------------------------------------------------
const verifyAdminToken = (req, res, next) => {
  // Récupération du token dans les en-têtes (accepte les deux cas)
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  console.log('🔐 verifyAdminToken - token reçu :', adminToken);

  // 1. Vérifier que le token est présent
  if (!adminToken) {
    console.warn('❌ Token manquant');
    return res.status(403).json({
      success: false,
      message: 'Non autorisé - Token manquant'
    });
  }

  // 2. Tokens de test (pour le développement)
  //    On accepte les tokens connus utilisés par le front-end
  const knownTokens = [
    'super_admin_secret_2026',
    'super_admin_token_2026',
    'admin_secret_2026',
    config.ADMIN_SECRET_TOKEN,
    config.DAF_SECRET_TOKEN,
  ].filter(Boolean); // retire les undefined

  if (knownTokens.includes(adminToken)) {
    console.log('✅ Token admin valide (reconnu)');
    req.userId = null; // aucun ID spécifique, mais autorisé
    return next();
  }

  // 3. Si le token est un email, on cherche l'utilisateur dans la base
  //    (utile si on utilise les emails comme tokens)
  pool.query(
    'SELECT id FROM utilisateurs WHERE email = $1',
    [adminToken],
    (err, result) => {
      if (err) {
        console.error('❌ Erreur SQL dans verifyAdminToken:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur interne du serveur'
        });
      }
      if (result.rows.length === 0) {
        console.warn('❌ Aucun utilisateur trouvé pour le token:', adminToken);
        return res.status(403).json({
          success: false,
          message: 'Token invalide - utilisateur non trouvé'
        });
      }
      // Succès : on associe l'ID utilisateur
      req.userId = result.rows[0].id;
      console.log('✅ Token email valide, utilisateur ID:', req.userId);
      next();
    }
  );
};

// -------------------------------------------------------------------
// Middleware : vérification du token DAF
// -------------------------------------------------------------------
const verifyDAFToken = (req, res, next) => {
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  console.log('🔐 verifyDAFToken - token reçu :', adminToken);

  if (!adminToken) {
    return res.status(403).json({
      success: false,
      message: 'Non autorisé - Token manquant'
    });
  }

  // Tokens acceptés pour DAF
  const dafTokens = [
    'daf_secret_2026',
    config.DAF_SECRET_TOKEN,
  ].filter(Boolean);

  if (dafTokens.includes(adminToken)) {
    console.log('✅ Token DAF valide');
    req.userId = null;
    return next();
  }

  // Sinon, essayer de trouver l'utilisateur par email
  pool.query(
    'SELECT id FROM utilisateurs WHERE email = $1',
    [adminToken],
    (err, result) => {
      if (err || result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Token invalide'
        });
      }
      req.userId = result.rows[0].id;
      next();
    }
  );
};

// -------------------------------------------------------------------
// Middleware : autoriser tout utilisateur (pour paiements)
// -------------------------------------------------------------------
const verifyAnyUser = (req, res, next) => {
  const adminToken = req.headers.adminToken || req.headers['admintoken'];
  console.log('🔐 verifyAnyUser - token reçu :', adminToken);

  // On autorise toujours, mais on essaie d'extraire l'ID si possible
  if (adminToken) {
    pool.query(
      'SELECT id FROM utilisateurs WHERE email = $1',
      [adminToken],
      (err, result) => {
        if (!err && result.rows.length > 0) {
          req.userId = result.rows[0].id;
        }
        next();
      }
    );
  } else {
    next();
  }
};

module.exports = {
  verifyAdminToken,
  verifyDAFToken,
  verifyAnyUser
};