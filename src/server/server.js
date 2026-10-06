// server/server.js
const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { pool, initDB, testConnection } = require('./database');

// ✅ IMPORT EXPLICITE des routes d'accès DAF/Admin
const accesDafRoutes = require('./routes/accesDaf.routes');

const app = express();

// Middleware
app.use(cors({
  origin: config.CORS_ORIGINS,
  methods: config.CORS_METHODS,
  allowedHeaders: config.CORS_HEADERS,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐ ROUTES — L'ORDRE EST CRITIQUE
// ✅ 1) D'ABORD les routes d'accès (verify-email, verify, session)
app.use('/api', accesDafRoutes);

// ✅ 2) ENSUITE les autres routes (users, activities, etc.)
app.use('/api', routes);

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API OMDA fonctionne !' });
});

// ✅ MIDDLEWARE 404 — Syntaxe Express 5 compatible
// ❌ AVANT (invalide) : app.use('/api/*', ...)
// ✅ APRÈS (valide)   : app.use('/api', ...) sans wildcard
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route API introuvable : ${req.method} ${req.originalUrl}`
  });
});

// ✅ MIDDLEWARE D'ERREUR GLOBAL — TOUJOURS RENVOYER DU JSON
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne'
  });
});

const PORT = config.PORT || 3001;

async function startServer() {
  try {
    await initDB();
    console.log('✅ Base de données initialisée avec succès');

    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️ La connexion à PostgreSQL est établie mais le test a échoué');
    }

    // ✅ LOG : afficher toutes les routes montées pour debug
    console.log('\n📋 Routes montées :');
    console.log('   /api/admin/verify-email  (POST)');
    console.log('   /api/admin/verify        (POST)');
    console.log('   /api/admin/session       (GET)');
    console.log('   /api/admin/users         (GET, POST)');
    console.log('   /api/admin/users/:id     (PUT, DELETE)');
    console.log('   /api/admin/activities    (GET, POST)\n');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  } catch (err) {
    console.error('❌ Erreur lors du démarrage du serveur:', err.message);
    console.error('📌 Détail complet:', err);
    process.exit(1);
  }
}

startServer();