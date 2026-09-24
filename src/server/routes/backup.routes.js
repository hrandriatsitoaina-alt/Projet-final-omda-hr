// server/routes/backup.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const cron = require('node-cron');
const pool = require('../database');

// ============================================================
// CONFIGURATION POSTGRES
// ============================================================
const DB_CONFIG = {
  user: 'omda_user',
  password: 'Omda2026',
  host: 'localhost',
  port: 5432,
  database: 'omda_db'
};

// ============================================================
// DOSSIER DE SAUVEGARDE UNIQUE SUR DISQUE C:
// ============================================================
function getDossierBackup() {
  const annee = new Date().getFullYear();
  let dossierBase;
  
  if (process.platform === 'win32') {
    dossierBase = 'C:\\backupOmda';
  } else {
    dossierBase = '/backupOmda';
  }
  
  const dossierAnnee = path.join(dossierBase, annee.toString());
  
  if (!fs.existsSync(dossierBase)) {
    fs.mkdirSync(dossierBase, { recursive: true });
    console.log('📁 Dossier créé:', dossierBase);
  }
  if (!fs.existsSync(dossierAnnee)) {
    fs.mkdirSync(dossierAnnee, { recursive: true });
    console.log('📁 Dossier créé:', dossierAnnee);
  }
  
  return dossierAnnee;
}

// ============================================================
// NOMS DES FICHIERS
// ============================================================
const NOM_FICHIER_AUTO = 'omda_backup_auto.sql';
const NOM_FICHIER_MANUEL = 'omda_backup_manuel.sql';

// Dossier temporaire pour les uploads
const upload = multer({ dest: path.join(__dirname, '..', 'tmp_uploads') });
if (!fs.existsSync(path.join(__dirname, '..', 'tmp_uploads'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'tmp_uploads'), { recursive: true });
}

// ============================================================
// TROUVER POSTGRESQL
// ============================================================
function findPostgresBinaries() {
  const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\16\\bin',
    'C:\\Program Files\\PostgreSQL\\15\\bin',
    'C:\\Program Files\\PostgreSQL\\14\\bin',
    'C:\\Program Files\\PostgreSQL\\13\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\15\\bin',
    'C:\\Program Files (x86)\\PostgreSQL\\14\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin',
    '/usr/bin',
    '/usr/local/bin',
    '/usr/pgsql/bin',
    '/opt/PostgreSQL/16/bin',
    '/opt/PostgreSQL/15/bin',
    '/opt/PostgreSQL/14/bin'
  ];

  for (const basePath of possiblePaths) {
    try {
      const pgDumpPath = path.join(basePath, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
      const psqlPath = path.join(basePath, process.platform === 'win32' ? 'psql.exe' : 'psql');
      
      if (fs.existsSync(pgDumpPath) && fs.existsSync(psqlPath)) {
        return { pgDump: pgDumpPath, psql: psqlPath, found: true };
      }
    } catch (e) {}
  }

  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const pgDumpPath = execSync('where pg_dump', { encoding: 'utf8' }).trim().split('\n')[0];
      const psqlPath = execSync('where psql', { encoding: 'utf8' }).trim().split('\n')[0];
      if (pgDumpPath && psqlPath) {
        return { pgDump: pgDumpPath, psql: psqlPath, found: true };
      }
    } catch (e) {}
  }

  return {
    pgDump: process.platform === 'win32' ? 'pg_dump' : 'pg_dump',
    psql: process.platform === 'win32' ? 'psql' : 'psql',
    found: false
  };
}

const PG_BIN = findPostgresBinaries();
console.log('🔍 PostgreSQL:', PG_BIN.found ? '✅ Trouvé' : '❌ Non trouvé');
console.log('📁 Dossier backup:', getDossierBackup());

// ============================================================
// UTILITAIRES
// ============================================================
function tailleFichier(cheminFichier) {
  try {
    return fs.statSync(cheminFichier).size;
  } catch {
    return 0;
  }
}

function executerDump(cheminSortie) {
  return new Promise((resolve, reject) => {
    const dossier = path.dirname(cheminSortie);
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier, { recursive: true });
    }
    
    const pgDumpCmd = PG_BIN.pgDump;
    const commande = `"${pgDumpCmd}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -F p -f "${cheminSortie}"`;
    
    console.log('🔧 pg_dump en cours...');
    
    exec(commande, { 
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password },
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      timeout: 300000
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

function executerRestore(cheminFichier) {
  return new Promise((resolve, reject) => {
    const psqlCmd = PG_BIN.psql;
    const commande = `"${psqlCmd}" -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${cheminFichier}"`;
    
    console.log('🔧 Restauration en cours...');
    
    exec(commande, { 
      env: { ...process.env, PGPASSWORD: DB_CONFIG.password },
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      timeout: 600000
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

async function journaliser({ type, nomFichier, cheminComplet, statut, message, userId }) {
  try {
    const taille = cheminComplet ? tailleFichier(cheminComplet) : 0;
    
    await pool.query(
      `INSERT INTO omda_app.backup_historique
       (type_backup, nom_fichier, chemin_complet, taille_octets, statut, message, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [type, nomFichier, cheminComplet, taille, statut, message || null, userId || null]
    );
    console.log(`📝 Journalisation: ${type} - ${statut} - ${nomFichier} (${(taille/1024).toFixed(1)} Ko)`);
  } catch (error) {
    console.error('❌ Erreur journalisation:', error);
  }
}

// ============================================================
// VÉRIFIER SI UNE SAUVEGARDE A DÉJÀ ÉTÉ FAITE AUJOURD'HUI
// ============================================================
async function sauvegardeDejaFaiteAujourdhui(type) {
  try {
    const aujourdhui = new Date();
    const debutJournee = new Date(aujourdhui);
    debutJournee.setHours(0, 0, 0, 0);
    
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM omda_app.backup_historique 
       WHERE type_backup = $1 
       AND statut = 'succes' 
       AND created_at >= $2`,
      [type, debutJournee]
    );
    
    const count = parseInt(result.rows[0].count);
    console.log(`🔍 Vérification sauvegarde ${type} aujourd'hui: ${count > 0 ? '✅ OUI' : '❌ NON'}`);
    return count > 0;
  } catch (error) {
    console.error('❌ Erreur vérification sauvegarde déjà faite:', error);
    return false;
  }
}

// ============================================================
// ⭐ VÉRIFIER LA DERNIÈRE SAUVEGARDE AUTO RÉUSSIE
// ============================================================
async function getDerniereSauvegardeAuto() {
  try {
    const result = await pool.query(
      `SELECT * FROM omda_app.backup_historique 
       WHERE type_backup = 'auto' AND statut = 'succes' 
       ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Erreur dernière sauvegarde:', error);
    return null;
  }
}

// ============================================================
// ⭐ VÉRIFIER SI LA SAUVEGARDE AUTO DU VENDREDI A ÉTÉ FAITE
// ============================================================
async function sauvegardeVendrediFaite() {
  try {
    // Récupérer la dernière sauvegarde auto réussie
    const derniere = await getDerniereSauvegardeAuto();
    
    if (!derniere) {
      console.log('📊 Aucune sauvegarde auto trouvée');
      return false;
    }
    
    const dateSauvegarde = new Date(derniere.created_at);
    const jourSemaine = dateSauvegarde.getDay(); // 5 = vendredi
    
    // Vérifier si la dernière sauvegarde a été faite un vendredi
    const estVendredi = jourSemaine === 5;
    
    console.log(`📊 Dernière sauvegarde auto: ${dateSauvegarde.toLocaleDateString('fr-FR')} - ${estVendredi ? '✅ VENDREDI' : '❌ Pas vendredi'}`);
    
    return estVendredi;
  } catch (error) {
    console.error('❌ Erreur vérification sauvegarde vendredi:', error);
    return false;
  }
}

// ============================================================
// ⭐ VÉRIFIER SI LA SAUVEGARDE AUTO DOIT ÊTRE FAITE
// ============================================================
async function doitFaireSauvegardeAuto() {
  const now = new Date();
  const jourSemaine = now.getDay(); // 0=Dimanche, 1=Lundi, ..., 5=Vendredi, 6=Samedi
  const heure = now.getHours();
  
  // Jours de la semaine
  const estVendredi = jourSemaine === 5;
  const estWeekend = jourSemaine === 0 || jourSemaine === 6; // Dimanche ou Samedi
  const estLundi = jourSemaine === 1;
  const estMardi = jourSemaine === 2;
  const estMercredi = jourSemaine === 3;
  const estJeudi = jourSemaine === 4;
  
  // Si c'est le weekend (Samedi ou Dimanche) -> PAS de sauvegarde
  if (estWeekend) {
    console.log(`📅 Weekend (${['Dimanche','Samedi'][jourSemaine === 0 ? 0 : 1]}) - Pas de sauvegarde`);
    return false;
  }
  
  // Cas 1: C'est VENDREDI et il est après 9h
  if (estVendredi && heure >= 9) {
    // Vérifier si une sauvegarde auto a déjà été faite aujourd'hui
    const dejaFaite = await sauvegardeDejaFaiteAujourdhui('auto');
    if (!dejaFaite) {
      console.log('✅ VENDREDI après 9h - Sauvegarde nécessaire');
      return true;
    } else {
      console.log('✅ VENDREDI après 9h - Déjà sauvegardé aujourd\'hui');
      return false;
    }
  }
  
  // Cas 2: C'est LUNDI, MARDI, MERCREDI ou JEUDI
  if (estLundi || estMardi || estMercredi || estJeudi) {
    // Vérifier si la sauvegarde du vendredi a été faite
    const vendrediFait = await sauvegardeVendrediFaite();
    
    if (!vendrediFait) {
      console.log(`✅ ${['Lundi','Mardi','Mercredi','Jeudi'][jourSemaine-1]} - Sauvegarde du vendredi NON faite - Rattrapage nécessaire`);
      return true;
    } else {
      console.log(`📅 ${['Lundi','Mardi','Mercredi','Jeudi'][jourSemaine-1]} - Sauvegarde du vendredi déjà faite - Pas de sauvegarde`);
      return false;
    }
  }
  
  // Cas 3: C'est VENDREDI avant 9h
  if (estVendredi && heure < 9) {
    console.log(`⏳ VENDREDI avant 9h (${heure}h) - Attente de 9h`);
    return false;
  }
  
  console.log(`📅 Aucune condition de sauvegarde remplie`);
  return false;
}

// ============================================================
// LANCER SAUVEGARDE AUTOMATIQUE
// ============================================================
async function lancerSauvegardeAutomatique(force = false) {
  if (!force) {
    const dejaFaite = await sauvegardeDejaFaiteAujourdhui('auto');
    if (dejaFaite) {
      console.log(`ℹ️ Sauvegarde auto déjà effectuée aujourd'hui - Sauvegarde annulée`);
      return { success: false, message: 'Sauvegarde déjà effectuée aujourd\'hui' };
    }
  }
  
  const dossier = getDossierBackup();
  const cheminSortie = path.join(dossier, NOM_FICHIER_AUTO);
  
  try {
    console.log('📁 Sauvegarde auto dans:', dossier);
    console.log('📄 Fichier:', NOM_FICHIER_AUTO);
    
    await executerDump(cheminSortie);
    const taille = tailleFichier(cheminSortie);
    
    if (taille === 0) {
      throw new Error('Le fichier de sauvegarde est vide (0 octet)');
    }
    
    await journaliser({
      type: 'auto',
      nomFichier: NOM_FICHIER_AUTO,
      cheminComplet: cheminSortie,
      statut: 'succes'
    });
    
    console.log(`✅ Sauvegarde auto - ${(taille / 1024).toFixed(1)} Ko`);
    return { success: true, message: `✅ Sauvegarde auto effectuée (${(taille / 1024).toFixed(1)} Ko)` };
  } catch (error) {
    console.error('❌ Erreur auto:', error.message);
    await journaliser({
      type: 'auto',
      nomFichier: NOM_FICHIER_AUTO,
      cheminComplet: '',
      statut: 'echec',
      message: error.message
    }).catch(() => {});
    throw error;
  }
}

// ============================================================
// ⭐ VÉRIFIER ET LANCER LA SAUVEGARDE (AMÉLIORÉE)
// ============================================================
async function verifierEtLancerSauvegarde() {
  const now = new Date();
  const jourSemaine = now.getDay();
  const heure = now.getHours();
  const minute = now.getMinutes();
  
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  console.log(`🔍 Vérification: ${now.toLocaleString('fr-FR')} - Jour: ${jours[jourSemaine]}, Heure: ${heure}:${String(minute).padStart(2, '0')}`);
  
  try {
    const doitFaire = await doitFaireSauvegardeAuto();
    
    if (doitFaire) {
      console.log(`⏰ [${now.toLocaleString('fr-FR')}] Lancement de la sauvegarde auto...`);
      const result = await lancerSauvegardeAutomatique(true);
      console.log(`✅ Résultat: ${result.message}`);
      return result;
    } else {
      console.log(`ℹ️ Aucune sauvegarde nécessaire à ce moment`);
      return { success: false, message: 'Aucune sauvegarde nécessaire' };
    }
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde auto:', error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// GET /api/backup/config
// ============================================================
router.get('/backup/config', async (req, res) => {
  try {
    const dossier = getDossierBackup();
    res.json({
      success: true,
      chemin: dossier,
      cheminEffectif: dossier,
      configure: true,
      dossierExiste: fs.existsSync(dossier)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/backup/config
// ============================================================
router.post('/backup/config', async (req, res) => {
  res.json({ 
    success: true, 
    message: 'Dossier de sauvegarde automatique sur C:\\backupOmda\\année' 
  });
});

// ============================================================
// GET /api/backup/check-pg
// ============================================================
router.get('/backup/check-pg', (req, res) => {
  res.json({
    success: true,
    pgFound: PG_BIN.found,
    pgDump: PG_BIN.pgDump,
    psql: PG_BIN.psql,
    message: PG_BIN.found ? 'PostgreSQL trouvé' : 'PostgreSQL non trouvé'
  });
});

// ============================================================
// GET /api/backup/dossier-info
// ============================================================
router.get('/backup/dossier-info', (req, res) => {
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
    } catch (e) {}
  }
  
  res.json({
    success: true,
    dossier,
    existe,
    fichiers,
    nombreFichiers: fichiers.length,
    tailleTotale: tailleTotale > 0 ? (tailleTotale / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'
  });
});

// ============================================================
// POST /api/backup/manuel
// ============================================================
router.post('/backup/manuel', async (req, res) => {
  const { userId } = req.body;
  
  if (!PG_BIN.found) {
    return res.status(500).json({ 
      success: false, 
      message: 'PostgreSQL (pg_dump) non trouvé.' 
    });
  }
  
  try {
    const dossier = getDossierBackup();
    const cheminSortie = path.join(dossier, NOM_FICHIER_MANUEL);
    
    console.log('📁 Sauvegarde manuelle dans:', dossier);
    console.log('📄 Fichier:', NOM_FICHIER_MANUEL);

    await executerDump(cheminSortie);
    
    const taille = tailleFichier(cheminSortie);
    
    if (taille === 0) {
      throw new Error('Le fichier de sauvegarde est vide (0 octet)');
    }
    
    await journaliser({
      type: 'manuel',
      nomFichier: NOM_FICHIER_MANUEL,
      cheminComplet: cheminSortie,
      statut: 'succes',
      userId
    });

    console.log(`✅ Sauvegarde manuelle - ${(taille / 1024).toFixed(1)} Ko`);

    res.json({
      success: true,
      message: `✅ Sauvegarde manuelle effectuée (${(taille / 1024).toFixed(1)} Ko)`,
      chemin: cheminSortie,
      dossier: dossier,
      taille: taille,
      date: new Date().toISOString()
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
    }).catch(() => {});
    res.status(500).json({ success: false, message: `❌ Échec : ${error.message}` });
  }
});

// ============================================================
// POST /api/backup/auto
// ============================================================
router.post('/backup/auto', async (req, res) => {
  if (!PG_BIN.found) {
    return res.status(500).json({ 
      success: false, 
      message: 'PostgreSQL (pg_dump) non trouvé.' 
    });
  }
  
  try {
    const result = await lancerSauvegardeAutomatique(true); // Force = true pour le test manuel
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ⭐ NOUVEAU : POST /api/backup/verifier-auto
// ============================================================
// Endpoint appelé par le frontend quand l'utilisateur ouvre l'application
// Déclenche la sauvegarde automatique si :
// - C'est vendredi après 9h ET pas encore sauvegardé
// - OU c'est lundi/mardi/mercredi/jeudi ET la sauvegarde du vendredi n'a PAS été faite
// ============================================================
router.post('/backup/verifier-auto', async (req, res) => {
  if (!PG_BIN.found) {
    return res.status(500).json({ 
      success: false, 
      message: 'PostgreSQL (pg_dump) non trouvé.' 
    });
  }
  
  try {
    console.log('📱 Vérification déclenchée par l\'ouverture de l\'application...');
    const result = await verifierEtLancerSauvegarde();
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur vérification auto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ⭐ NOUVEAU : GET /api/backup/statut-auto-detail
// ============================================================
router.get('/backup/statut-auto-detail', async (req, res) => {
  try {
    const maintenant = new Date();
    const jourSemaine = maintenant.getDay();
    const heure = maintenant.getHours();
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    const doitFaire = await doitFaireSauvegardeAuto();
    const derniereSauvegarde = await getDerniereSauvegardeAuto();
    const vendrediFait = await sauvegardeVendrediFaite();
    const dejaFaiteAujourdhui = await sauvegardeDejaFaiteAujourdhui('auto');
    
    res.json({
      success: true,
      statut: {
        dateActuelle: maintenant.toLocaleString('fr-FR'),
        jourSemaine: jours[jourSemaine],
        heure: heure,
        doitFaireSauvegarde: doitFaire,
        dejaFaiteAujourdhui: dejaFaiteAujourdhui,
        sauvegardeVendrediFaite: vendrediFait,
        derniereSauvegarde: derniereSauvegarde ? {
          date: derniereSauvegarde.created_at,
          fichier: derniereSauvegarde.nom_fichier,
          taille: derniereSauvegarde.taille_octets
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur statut détaillé:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// ⭐ PLANIFICATION : TOUS LES VENDREDIS À 9H
// ============================================================
cron.schedule('0 9 * * 5', async () => {
  const now = new Date();
  console.log(`⏰ [${now.toLocaleString('fr-FR')}] PLANIFICATION: Sauvegarde auto du vendredi 9h...`);
  try {
    const result = await lancerSauvegardeAutomatique(false);
    console.log(`✅ Résultat planification: ${result.message}`);
  } catch (error) {
    console.error('❌ Erreur sauvegarde auto planifiée:', error);
  }
});

// ============================================================
// ⭐ VÉRIFICATION PÉRIODIQUE TOUTES LES 30 MINUTES
// ============================================================
cron.schedule('*/30 * * * *', async () => {
  const now = new Date();
  const jourSemaine = now.getDay();
  const heure = now.getHours();
  
  // Vérifier uniquement pendant les heures de bureau (9h-18h)
  if (heure >= 9 && heure <= 18) {
    console.log(`🔄 VÉRIFICATION PÉRIODIQUE (30min) - ${now.toLocaleString('fr-FR')}`);
    try {
      await verifierEtLancerSauvegarde();
    } catch (error) {
      console.error('❌ Erreur vérification périodique:', error);
    }
  }
});

// ============================================================
// ⭐ VÉRIFICATION AU DÉMARRAGE DU SERVEUR
// ============================================================
setTimeout(async () => {
  console.log('🔍 VÉRIFICATION INITIALE AU DÉMARRAGE DU SERVEUR...');
  console.log(`📅 Date système: ${new Date().toLocaleString('fr-FR')}`);
  try {
    await verifierEtLancerSauvegarde();
  } catch (error) {
    console.error('❌ Erreur lors de la vérification initiale:', error);
  }
}, 5000);

console.log('=' .repeat(60));
console.log('✅ Sauvegarde automatique programmée : Tous les vendredis à 9h00');
console.log('✅ Vérification au démarrage : Si vendredi après 9h, sauvegarde immédiate');
console.log('✅ Vérification périodique : Toutes les 30 min (9h-18h)');
console.log('✅ Rattrapage : Lundi-Jeudi si sauvegarde du vendredi non faite');
console.log('✅ Vérification par l\'app : Quand l\'utilisateur ouvre l\'application');
console.log('✅ Protection : Une seule sauvegarde auto par jour');
console.log('=' .repeat(60));

// ============================================================
// GET /api/backup/last
// ============================================================
router.get('/backup/last', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM omda_app.backup_historique
       WHERE statut = 'succes'
       ORDER BY created_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, date: null });
    }
    res.json({ success: true, date: result.rows[0].created_at, backup: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/backup/historique - CORRIGÉ : Tri par date DESC (plus récent en haut)
// ============================================================
router.get('/backup/historique', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bh.*, u.nom as utilisateur_nom
       FROM omda_app.backup_historique bh
       LEFT JOIN omda_app.utilisateurs u ON bh.created_by = u.id
       ORDER BY bh.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, historique: result.rows });
  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET /api/database/size
// ============================================================
router.get('/database/size', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pg_size_pretty(pg_database_size($1)) as taille`,
      [DB_CONFIG.database]
    );
    res.json({ success: true, size: result.rows[0].taille });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST /api/backup/restore
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
  try {
    await executerRestore(cheminTemp);
    await journaliser({
      type: 'restauration',
      nomFichier: req.file.originalname,
      cheminComplet: cheminTemp,
      statut: 'succes',
      userId: req.body.userId
    });
    res.json({ success: true, message: '✅ Restauration effectuée avec succès' });
  } catch (error) {
    console.error('❌ Erreur restauration:', error);
    await journaliser({
      type: 'restauration',
      nomFichier: req.file.originalname,
      cheminComplet: cheminTemp,
      statut: 'echec',
      message: error.message
    }).catch(() => {});
    res.status(500).json({ success: false, message: `❌ Échec : ${error.message}` });
  } finally {
    try {
      if (fs.existsSync(cheminTemp)) {
        fs.unlinkSync(cheminTemp);
      }
    } catch (e) {}
  }
});

// ============================================================
// GET /api/backup/telecharger/:type
// ============================================================
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

module.exports = router;