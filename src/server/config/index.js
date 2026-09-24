// src/server/config/index.js
module.exports = {
  PORT: 3001,

  // ============================================================
  // TOKENS D'ACCÈS ADMINISTRATEURS
  // ============================================================
  // Super Admin : accès complet (ajout, modif, suppression, rôles…)
  ADMIN_SECRET_TOKEN: 'super_admin_token_2026',

  //  Admin : accès restreint (uniquement activer/désactiver les utilisateurs)
  ADMIN_ROLE_SECRET_TOKEN: 'admin_token_2026',

  //  DAF : accès DAF
  DAF_SECRET_TOKEN: 'daf_token_2026',

  // CORS
  CORS_ORIGINS: ['http://localhost:5173', 'http://localhost:3001'],
  CORS_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  CORS_HEADERS: ['Content-Type', 'Authorization', 'adminToken'],

  // Base de données
  DB: {
    user: 'omda_user',
    password: 'Omda2026',
    host: 'localhost',
    port: 5432,
    database: 'omda_db'
  }
};