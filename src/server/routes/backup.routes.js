// server/routes/backup.routes.js
// ═══════════════════════════════════════════════════════════════════
// BACKUP ROUTES — Sauvegarde / Restauration PostgreSQL
//   • Sauvegarde auto : Lundi, Mercredi, Vendredi à 9h
//   • RATTRAPAGE automatique : toutes les 15 min + au démarrage
//   • Restauration avec DROP/CREATE schéma propre
//
//   ✅ CORRECTIONS (version fiable) :
//   1. getDossierBackup() est maintenant DANS le try → toute erreur est journalisée
//   2. Verrou anti-doublon (cron 9h + rattrapage 9h00 ne se lancent plus en même temps)
//   3. created_at est écrit explicitement par Node → plus de décalage de fuseau horaire
//   4. Dump écrit dans un fichier .tmp puis renommé → un échec n'écrase jamais une bonne sauvegarde
//   5. Erreurs d'INSERT dans l'historique affichées en détail dans la console
//   6. Après un échec, nouvelle tentative seulement après 30 min (pas de spam dans l'historique)
// ═══════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const cron = require('node-cron');
const db = require('../database');
const pool = db.pool;
const query = db.query;

// ============================================================
// CONFIGURATION POSTGRES
// ============================================================
const DB_CONFIG = {
  user: process.env.DB_USER || 'omda_user',
  password: process.env.DB_PASSWORD || 'Omda2026',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'omda_db',
  schema: 'omda_app',
};

// ============================================================
// JOURS DE SAUVEGARDE AUTOMATIQUE
// ============================================================
const JOURS_SAUVEGARDE_AUTO = [1, 3, 5]; // Lundi, Mercredi, Vendredi
const HEURE_SAUVEGARDE_AUTO = 9;
const DELAI_RETENTE_APRES_ECHEC_MIN = 30; // minutes

// ============================================================
// VERROU : empêche deux sauvegardes auto en même temps
// ============================================================
let sauvegardeEnCours = false;

// ============================================================
// DOSSIER DE SAUVEGARDE
// ============================================================
function getDossierBackup() {
  const annee = new Date().getFullYear();
  const dossierBase = process.platform === 'win32' ? 'C:\\backupOmda' : '/backupOmda';
  const dossierAnnee = path.join(dossierBase, annee.toString());
  if (!fs.existsSync(dossierBase)) fs.mkdirSync(dossierBase, { recursive: true });
  if (!fs.existsSync(dossierAnnee)) fs.mkdirSync(dossierAnnee, { recursive: true });
  return dossierAnnee;
}

const NOM_FICHIER_AUTO = 'omda_backup_auto.sql';
const NOM_FICHIER_MANUEL = 'omda_backup_manuel.sql';

// ============================================================
// UPLOAD
// ============================================================
const uploadDir = path.join(__dirname, '..', 'tmp_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// ============================================================
// TROUVER POSTGRESQL
// ============================================================
function findPostgresBinaries() {
  const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin',
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files\\PostgreSQL\\15\\bin',
    'C:\\Program Files\\PostgreSQL\\14\\bin',
    'C:\\Program Files\\PostgreSQL\\13\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
    '/usr/lib/postgresql/17/bin',
    '/usr/lib/postgresql/16/bin',
    '/usr/lib/postgresql/15/bin',
    '/usr/lib/postgresql/14/bin',
    '/usr/bin',
    '/usr/local/bin',
  ];

  for (const basePath of possiblePaths) {
    try {
      const pgDumpPath = path.join(basePath, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
      const psqlPath = path.join(basePath, process.platform === 'win32' ? 'psql.exe' : 'psql');
      if (fs.existsSync(pgDumpPath) && fs.existsSync(psqlPath)) {
        return { pgDump: pgDumpPath, psql: psqlPath, found: true };
      }
    } catch (e) { /* ignore */ }
  }

  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const pgDumpPath = execSync('where pg_dump', { encoding: 'utf8' }).trim().split('\n')[0].trim();
      const psqlPath = execSync('where psql', { encoding: 'utf8' }).trim().split('\n')[0].trim();
      if (pgDumpPath && psqlPath) return { pgDump: pgDumpPath, psql: psqlPath, found: true };
    } catch (e) { /* ignore */ }
  }

  return { pgDump: 'pg_dump', psql: 'psql', found: false };
}

const PG_BIN = findPostgresBinaries();
console.log('🔍 PostgreSQL:', PG_BIN.found ? '✅ Trouvé' : '❌ Non trouvé');
try {
  console.log('📁 Dossier backup:', getDossierBackup());
} catch (e) {
  console.error('❌ Impossible de créer le dossier de backup:', e.message);
}

// ============================================================
// UTILITAIRES
// ============================================================
function tailleFichier(cheminFichier) {
  try { return fs.statSync(cheminFichier).size; }
  catch { return 0; }
}

function getJoursSauvegardeLabels() {
  const noms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return JOURS_SAUVEGARDE_AUTO.map(j => noms[j]).join(', ');
}

// ============================================================
// DUMP
// ============================================================
function executerDump(cheminSortie) {
  return new Promise((resolve, reject) => {
    const dossier = path.dirname(cheminSortie);
    if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });

    const commande = `"${PG_BIN.pgDump}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --schema=${DB_CONFIG.schema} --clean --if-exists --no-owner --no-acl -F p -f "${cheminSortie}"`;

    console.log('🔧 pg_dump en cours...');
    console.log('   Commande:', commande);

    exec(commande, {
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password },
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur pg_dump:', error.message);
        return reject(new Error(stderr || error.message));
      }
      console.log('✅ pg_dump terminé');
      resolve();
    });
  });
}

// ============================================================
// DROP + CREATE du schéma
// ============================================================
function reinitialiserSchema() {
  return new Promise((resolve, reject) => {
    const sqlCommands = `DROP SCHEMA IF EXISTS ${DB_CONFIG.schema} CASCADE; CREATE SCHEMA ${DB_CONFIG.schema};`;

    const tmpFile = path.join(uploadDir, `_reset_schema_${Date.now()}.sql`);
    fs.writeFileSync(tmpFile, sqlCommands, 'utf8');

    const commande = `"${PG_BIN.psql}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -v ON_ERROR_STOP=1 -f "${tmpFile}"`;

    console.log('🗑️  Réinitialisation du schéma...');

    exec(commande, {
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password },
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch (e) { /* ignore */ }

      if (error) {
        console.error('❌ Erreur reset schéma:', error.message);
        return reject(new Error(stderr || error.message));
      }
      console.log('✅ Schéma réinitialisé');
      resolve();
    });
  });
}

// ============================================================
// RESTORE
// ============================================================
function executerRestore(cheminFichier) {
  return new Promise((resolve, reject) => {
    const commande = `"${PG_BIN.psql}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --single-transaction --set ON_ERROR_STOP=on -f "${cheminFichier}"`;

    console.log('🔧 Restauration en cours...');

    exec(commande, {
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password },
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      timeout: 600000,
      maxBuffer: 100 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur psql:', error.message);
        return reject(new Error(stderr || error.message));
      }
      console.log('✅ Restauration terminée');
      resolve();
    });
  });
}

// ============================================================
// Nettoyer le fichier SQL
// ============================================================
function nettoyerFichierSQL(cheminSource) {
  const contenu = fs.readFileSync(cheminSource, 'utf8');
  const lignes = contenu.split('\n');
  const lignesFiltrees = [];

  const motifsAIgnorer = [
    /^CREATE SCHEMA public/i,
    /^ALTER SCHEMA public/i,
    /^DROP SCHEMA public/i,
    /^COMMENT ON SCHEMA public/i,
    /^ALTER SCHEMA .* OWNER TO/i,
    /^REVOKE .* ON SCHEMA public/i,
    /^GRANT .* ON SCHEMA public/i,
    /^ALTER DEFAULT PRIVILEGES/i,
    /^DROP SCHEMA IF EXISTS omda_app/i,
    /^DROP SCHEMA omda_app/i,
    /^CREATE SCHEMA omda_app/i,
    /^CREATE SCHEMA IF NOT EXISTS omda_app/i,
    /^COMMENT ON SCHEMA omda_app/i,
  ];

  for (const ligne of lignes) {
    const trimmed = ligne.trim();
    if (motifsAIgnorer.some(r => r.test(trimmed))) {
      console.log(`   ⏭️ Ligne ignorée : ${trimmed.slice(0, 80)}`);
      continue;
    }
    lignesFiltrees.push(ligne);
  }

  const cheminNettoye = cheminSource + '.clean';
  fs.writeFileSync(cheminNettoye, lignesFiltrees.join('\n'), 'utf8');
  console.log(`✅ Fichier nettoyé : ${cheminNettoye}`);

  return cheminNettoye;
}

// ============================================================
// JOURNALISATION
//   ✅ created_at écrit explicitement par Node (même fuseau que les comparaisons)
//   ✅ erreur détaillée si l'INSERT échoue (contrainte, colonne, etc.)
// ============================================================
async function journaliser({ type, nomFichier, cheminComplet, statut, message, userId }) {
  try {
    const taille = cheminComplet ? tailleFichier(cheminComplet) : 0;
    await query(
      `INSERT INTO backup_historique
       (type_backup, nom_fichier, chemin_complet, taille_octets, statut, message, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [type, nomFichier, cheminComplet, taille, statut, message || null, userId || null, new Date()]
    );
    console.log(`📝 Journalisé: ${type} - ${statut}`);
  } catch (error) {
    console.error('❌ ERREUR JOURNALISATION (rien écrit dans backup_historique) :');
    console.error('   Message    :', error.message);
    if (error.detail) console.error('   Détail     :', error.detail);
    if (error.constraint) console.error('   Contrainte :', error.constraint);
    if (error.column) console.error('   Colonne    :', error.column);
  }
}

// ============================================================
// VÉRIFICATIONS
// ============================================================

/**
 * Vérifie si une sauvegarde a déjà été faite AUJOURD'HUI.
 */
async function sauvegardeDejaFaiteAujourdhui(type = 'auto') {
  try {
    const debutJournee = new Date();
    debutJournee.setHours(0, 0, 0, 0);
    const result = await query(
      `SELECT COUNT(*) as count FROM backup_historique 
       WHERE type_backup = $1 AND statut = 'succes' AND created_at >= $2`,
      [type, debutJournee]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error('❌ Erreur check aujourd\'hui:', error.message);
    return false;
  }
}

/**
 * Dernière sauvegarde automatique réussie.
 */
async function getDerniereSauvegardeAuto() {
  try {
    const result = await query(
      `SELECT * FROM backup_historique 
       WHERE type_backup = 'auto' AND statut = 'succes' 
       ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Erreur lecture dernière sauvegarde auto:', error.message);
    return null;
  }
}

/**
 * Y a-t-il eu un ÉCHEC auto récent ? (évite de réessayer toutes les 15 min en boucle)
 */
async function echecAutoRecent() {
  try {
    const limite = new Date(Date.now() - DELAI_RETENTE_APRES_ECHEC_MIN * 60 * 1000);
    const result = await query(
      `SELECT COUNT(*) as count FROM backup_historique
       WHERE type_backup = 'auto' AND statut = 'echec' AND created_at >= $1`,
      [limite]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Calcule la date du DERNIER jour planifié (Lun/Mer/Ven à 9h) qui est <= maintenant.
 */
function getDernierJourPlanifie() {
  const maintenant = new Date();

  for (let i = 0; i < 7; i++) {
    const jourTest = new Date(maintenant);
    jourTest.setDate(maintenant.getDate() - i);
    jourTest.setHours(HEURE_SAUVEGARDE_AUTO, 0, 0, 0);

    if (jourTest.getTime() > maintenant.getTime()) continue;

    if (JOURS_SAUVEGARDE_AUTO.includes(jourTest.getDay())) {
      return jourTest;
    }
  }

  return null;
}

/**
 * DÉTERMINE SI ON DOIT LANCER LA SAUVEGARDE MAINTENANT
 *   1. Dernier jour planifié (Lun/Mer/Ven 9h <= maintenant)
 *   2. Aucune sauvegarde auto réussie → LANCER
 *   3. Dernière sauvegarde antérieure au dernier jour planifié → LANCER (rattrapage)
 *   4. Sinon → NE PAS LANCER
 */
async function doitFaireSauvegardeAuto(verbose = true) {
  const maintenant = new Date();
  const joursNoms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const log = (...a) => { if (verbose) console.log(...a); };

  log(`\n🔍 ═══ ANALYSE DE LA SAUVEGARDE AUTO ═══`);
  log(`   📅 Maintenant : ${maintenant.toLocaleString('fr-FR')} (${joursNoms[maintenant.getDay()]})`);

  const dernierJourPlanifie = getDernierJourPlanifie();

  if (!dernierJourPlanifie) {
    log(`   ℹ️ Aucun jour planifié dans les 7 derniers jours → SKIP`);
    return false;
  }

  log(`   📅 Dernier jour planifié (${HEURE_SAUVEGARDE_AUTO}h) : ${dernierJourPlanifie.toLocaleString('fr-FR')}`);

  const derniere = await getDerniereSauvegardeAuto();

  if (!derniere) {
    log(`   ✅ Aucune sauvegarde auto réussie → LANCER`);
    return true;
  }

  const dateDerniere = new Date(derniere.created_at);
  log(`   📅 Dernière sauvegarde : ${dateDerniere.toLocaleString('fr-FR')}`);
  log(`   📊 Fichier : ${derniere.nom_fichier} (${(derniere.taille_octets / 1024).toFixed(1)} Ko)`);

  if (dateDerniere.getTime() < dernierJourPlanifie.getTime()) {
    log(`   ✅ → RATTRAPAGE NÉCESSAIRE`);
    return true;
  }

  log(`   ℹ️ Sauvegarde déjà à jour → SKIP`);
  return false;
}

/**
 * Lance la sauvegarde automatique.
 *   ✅ Verrou anti-doublon
 *   ✅ Tout est dans le try → toute erreur est journalisée dans l'historique
 *   ✅ Écriture dans un .tmp puis renommage
 */
async function lancerSauvegardeAutomatique(force = false) {
  if (sauvegardeEnCours) {
    return { success: false, message: 'Une sauvegarde automatique est déjà en cours' };
  }

  if (!force) {
    const dejaFaite = await sauvegardeDejaFaiteAujourdhui('auto');
    if (dejaFaite) {
      return { success: false, message: 'Sauvegarde déjà effectuée aujourd\'hui' };
    }
  }

  sauvegardeEnCours = true;
  let cheminTmp = null;

  try {
    if (!PG_BIN.found) {
      throw new Error('PostgreSQL (pg_dump/psql) introuvable sur ce serveur');
    }

    const dossier = getDossierBackup(); // ✅ maintenant dans le try
    const cheminSortie = path.join(dossier, NOM_FICHIER_AUTO);
    cheminTmp = cheminSortie + '.tmp';

    if (fs.existsSync(cheminTmp)) fs.unlinkSync(cheminTmp);

    await executerDump(cheminTmp);

    const taille = tailleFichier(cheminTmp);
    if (taille === 0) throw new Error('Fichier de sauvegarde vide');

    // Remplace l'ancienne sauvegarde seulement si la nouvelle est bonne
    if (fs.existsSync(cheminSortie)) fs.unlinkSync(cheminSortie);
    fs.renameSync(cheminTmp, cheminSortie);
    cheminTmp = null;

    await journaliser({
      type: 'auto',
      nomFichier: NOM_FICHIER_AUTO,
      cheminComplet: cheminSortie,
      statut: 'succes'
    });

    return { success: true, message: `✅ Sauvegarde auto effectuée (${(taille / 1024).toFixed(1)} Ko)` };
  } catch (error) {
    console.error('❌ Échec sauvegarde auto:', error.message);
    await journaliser({
      type: 'auto',
      nomFichier: NOM_FICHIER_AUTO,
      cheminComplet: '',
      statut: 'echec',
      message: error.message
    });
    throw error;
  } finally {
    try {
      if (cheminTmp && fs.existsSync(cheminTmp)) fs.unlinkSync(cheminTmp);
    } catch (e) { /* ignore */ }
    sauvegardeEnCours = false;
  }
}

/**
 * Vérifie + lance si nécessaire.
 */
async function verifierEtLancerSauvegarde() {
  try {
    if (sauvegardeEnCours) {
      return { success: false, message: 'Une sauvegarde est déjà en cours' };
    }

    const doitFaire = await doitFaireSauvegardeAuto();
    if (!doitFaire) {
      return { success: false, message: 'Aucune sauvegarde nécessaire pour le moment' };
    }

    if (await echecAutoRecent()) {
      return {
        success: false,
        message: `Un échec est survenu il y a moins de ${DELAI_RETENTE_APRES_ECHEC_MIN} min — nouvelle tentative plus tard`
      };
    }

    console.log('\n🚀 Lancement de la sauvegarde...');
    const result = await lancerSauvegardeAutomatique(true);
    console.log(`✅ Résultat : ${result.message}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur vérification/lancement:', error.message);
    return { success: false, message: error.message };
  }
}

// ============================================================
// ROUTES
// ============================================================

router.get('/backup/config', async (req, res) => {
  try {
    const dossier = getDossierBackup();
    res.json({
      success: true,
      chemin: dossier,
      configure: true,
      dossierExiste: fs.existsSync(dossier),
      joursSauvegarde: JOURS_SAUVEGARDE_AUTO,
      joursSauvegardeLabels: getJoursSauvegardeLabels(),
      heureSauvegarde: HEURE_SAUVEGARDE_AUTO,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/backup/check-pg', (req, res) => {
  res.json({
    success: true,
    pgFound: PG_BIN.found,
    pgDump: PG_BIN.pgDump,
    psql: PG_BIN.psql,
  });
});

router.get('/backup/dossier-info', (req, res) => {
  try {
    const dossier = getDossierBackup();
    const existe = fs.existsSync(dossier);
    let fichiers = [];
    let tailleTotale = 0;

    if (existe) {
      try {
        fichiers = fs.readdirSync(dossier).filter(f => f.endsWith('.sql'));
        fichiers.forEach(f => {
          const stat = fs.statSync(path.join(dossier, f));
          tailleTotale += stat.size;
        });
      } catch (e) { /* ignore */ }
    }

    res.json({
      success: true,
      dossier,
      existe,
      fichiers,
      nombreFichiers: fichiers.length,
      tailleTotale: tailleTotale > 0 ? (tailleTotale / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/backup/manuel', async (req, res) => {
  const { userId } = req.body;

  if (!PG_BIN.found) {
    return res.status(500).json({
      success: false,
      message: 'PostgreSQL (pg_dump) non trouvé. Vérifiez l\'installation.'
    });
  }

  try {
    const dossier = getDossierBackup();
    const cheminSortie = path.join(dossier, NOM_FICHIER_MANUEL);

    console.log('📁 Sauvegarde manuelle dans:', dossier);

    await executerDump(cheminSortie);
    const taille = tailleFichier(cheminSortie);

    if (taille === 0) throw new Error('Fichier de sauvegarde vide');

    await journaliser({
      type: 'manuel',
      nomFichier: NOM_FICHIER_MANUEL,
      cheminComplet: cheminSortie,
      statut: 'succes',
      userId
    });

    res.json({
      success: true,
      message: `✅ Sauvegarde manuelle effectuée (${(taille / 1024).toFixed(1)} Ko)`,
      chemin: cheminSortie,
      dossier: dossier,
      taille: taille,
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde manuelle:', error);
    await journaliser({
      type: 'manuel',
      nomFichier: NOM_FICHIER_MANUEL,
      cheminComplet: '',
      statut: 'echec',
      message: error.message,
      userId
    });
    res.status(500).json({ success: false, message: `❌ Échec : ${error.message}` });
  }
});

router.post('/backup/auto', async (req, res) => {
  try {
    const result = await lancerSauvegardeAutomatique(true);
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/backup/verifier-auto', async (req, res) => {
  try {
    const result = await verifierEtLancerSauvegarde();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/backup/statut-auto-detail', async (req, res) => {
  try {
    const maintenant = new Date();
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const doitFaire = await doitFaireSauvegardeAuto(false);
    const derniereSauvegarde = await getDerniereSauvegardeAuto();
    const dejaFaiteAujourdhui = await sauvegardeDejaFaiteAujourdhui('auto');
    const dernierJourPlanifie = getDernierJourPlanifie();
    const echecRecent = await echecAutoRecent();

    res.json({
      success: true,
      statut: {
        dateActuelle: maintenant.toLocaleString('fr-FR'),
        jourSemaine: jours[maintenant.getDay()],
        heure: maintenant.getHours(),
        joursSauvegarde: JOURS_SAUVEGARDE_AUTO.map(j => jours[j]),
        heureSauvegarde: HEURE_SAUVEGARDE_AUTO,
        doitFaireSauvegarde: doitFaire,
        dejaFaiteAujourdhui,
        sauvegardeEnCours,
        echecRecent,
        pgTrouve: PG_BIN.found,
        dernierJourPlanifie: dernierJourPlanifie ? dernierJourPlanifie.toLocaleString('fr-FR') : null,
        derniereSauvegarde: derniereSauvegarde ? {
          date: derniereSauvegarde.created_at,
          fichier: derniereSauvegarde.nom_fichier,
          taille: derniereSauvegarde.taille_octets
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/backup/last', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM backup_historique WHERE statut = 'succes' ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ success: true, backup: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/backup/historique', async (req, res) => {
  try {
    const result = await query(
      `SELECT bh.*, u.nom as utilisateur_nom
       FROM backup_historique bh
       LEFT JOIN utilisateurs u ON bh.created_by = u.id
       ORDER BY bh.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, historique: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/database/size', async (req, res) => {
  try {
    const result = await query(
      `SELECT pg_size_pretty(pg_database_size($1)) as taille`,
      [DB_CONFIG.database]
    );
    res.json({ success: true, size: result.rows[0].taille });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ROUTE RESTORE
// ============================================================
router.post('/backup/restore', upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
  }

  if (!PG_BIN.found) {
    return res.status(500).json({
      success: false,
      message: 'PostgreSQL (psql) non trouvé.'
    });
  }

  const cheminTemp = req.file.path;
  const userId = req.body.userId;
  let cheminNettoye = null;

  try {
    console.log(`\n📥 Restauration: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} Ko)`);

    if (req.file.size === 0) {
      throw new Error('Le fichier est vide');
    }

    console.log('\n🗑️  ═══ RÉINITIALISATION DU SCHÉMA ═══');
    await reinitialiserSchema();
    console.log('   ✅ DROP SCHEMA omda_app CASCADE');
    console.log('   ✅ CREATE SCHEMA omda_app');

    console.log('\n🧹 ═══ NETTOYAGE DU FICHIER SQL ═══');
    cheminNettoye = nettoyerFichierSQL(cheminTemp);
    console.log('   ✅ Fichier nettoyé');

    console.log('\n🔄 ═══ RESTAURATION ═══');
    await executerRestore(cheminNettoye);
    console.log('   ✅ Restauration terminée');

    await journaliser({
      type: 'restauration',
      nomFichier: req.file.originalname,
      cheminComplet: cheminTemp,
      statut: 'succes',
      userId
    });

    console.log('\n✅ ✅ ✅ RESTAURATION RÉUSSIE ✅ ✅ ✅\n');

    res.json({
      success: true,
      message: '✅ Restauration effectuée avec succès ! Rechargement dans 2 secondes...',
      details: {
        fichier: req.file.originalname,
        taille: req.file.size,
        date: new Date().toISOString(),
        schemaReinitialise: true,
      }
    });
  } catch (error) {
    console.error('\n❌ ❌ ❌ ERREUR RESTAURATION ❌ ❌ ❌');
    console.error('   Message:', error.message);

    await journaliser({
      type: 'restauration',
      nomFichier: req.file.originalname,
      cheminComplet: cheminTemp,
      statut: 'echec',
      message: error.message
    });

    res.status(500).json({
      success: false,
      message: `❌ Échec de la restauration : ${error.message}`
    });
  } finally {
    try {
      if (fs.existsSync(cheminTemp)) fs.unlinkSync(cheminTemp);
    } catch (e) { /* ignore */ }
    try {
      if (cheminNettoye && fs.existsSync(cheminNettoye)) fs.unlinkSync(cheminNettoye);
    } catch (e) { /* ignore */ }
  }
});

router.get('/backup/telecharger/:type', async (req, res) => {
  const { type } = req.params;
  const nomFichier = type === 'auto' ? NOM_FICHIER_AUTO : NOM_FICHIER_MANUEL;
  try {
    const dossier = getDossierBackup();
    const cheminFichier = path.join(dossier, nomFichier);
    if (!fs.existsSync(cheminFichier)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }
    res.download(cheminFichier, nomFichier);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// CRON PRINCIPAL — Lun/Mer/Ven à 9h PILE
// ============================================================
cron.schedule(`0 ${HEURE_SAUVEGARDE_AUTO} * * 1,3,5`, async () => {
  console.log(`\n⏰ ═══ CRON 9h (Lun/Mer/Ven) ═══`);
  try {
    const result = await lancerSauvegardeAutomatique(false);
    console.log(`✅ Résultat cron 9h : ${result.message}`);
  } catch (error) {
    console.error('❌ Erreur cron 9h:', error.message);
  }
});

// ============================================================
// CRON RATTRAPAGE — Toutes les 15 minutes (24h/24)
// ============================================================
cron.schedule('*/15 * * * *', async () => {
  const maintenant = new Date();
  const hh = String(maintenant.getHours()).padStart(2, '0');
  const mm = String(maintenant.getMinutes()).padStart(2, '0');
  console.log(`\n⏰ ═══ VÉRIFICATION RATTRAPAGE ${hh}:${mm} ═══`);
  try {
    const result = await verifierEtLancerSauvegarde();
    if (result.success) {
      console.log(`✅ Rattrapage effectué : ${result.message}`);
    } else {
      console.log(`ℹ️ ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Erreur vérif rattrapage:', error.message);
  }
});

// ============================================================
// VÉRIFICATION AU DÉMARRAGE (+5s après le boot)
// ============================================================
setTimeout(async () => {
  console.log('\n════════════════════════════════════════════');
  console.log('🔍 VÉRIFICATION INITIALE AU DÉMARRAGE');
  console.log('════════════════════════════════════════════');
  try {
    const result = await verifierEtLancerSauvegarde();
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`ℹ️ ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Erreur vérif initiale:', error.message);
  }
}, 5000);

// ============================================================
// LOGS DE DÉMARRAGE
// ============================================================
console.log('='.repeat(60));
console.log(`✅ Sauvegarde auto : ${getJoursSauvegardeLabels()} à ${HEURE_SAUVEGARDE_AUTO}h`);
console.log('✅ Rattrapage : toutes les 15 min (24h/24) + au démarrage');
console.log(`✅ Dump : --schema=${DB_CONFIG.schema} uniquement`);
console.log(`✅ Restore : DROP SCHEMA ${DB_CONFIG.schema} CASCADE + nettoyage`);
console.log('='.repeat(60));

module.exports = router;