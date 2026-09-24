const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { pool, initDB, testConnection } = require('./database'); // ✅ AJOUT

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

// ⭐ ROUTES - TOUTES PRÉFIXÉES PAR /api
app.use('/api', routes);

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API OMDA fonctionne !' });
});

const PORT = config.PORT || 3001;

// ✅ Démarrer le serveur APRÈS l'initialisation de la DB
async function startServer() {
  try {
    // 1. Initialiser la base de données (crée toutes les tables)
    await initDB();
    console.log('✅ Base de données initialisée avec succès');

    // 2. Tester la connexion (optionnel)
    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️ La connexion à PostgreSQL est établie mais le test a échoué');
    }

    // 3. Lancer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📡 Routes disponibles sous /api/`);
    });

  } catch (err) {
    console.error('❌ Erreur lors du démarrage du serveur:', err.message);
    console.error('📌 Détail complet:', err);
    process.exit(1);
  }
}

// Lancer le serveur
startServer();