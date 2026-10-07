// src/server/database.js
// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION POSTGRESQL ROBUSTE - VERSION FINALE
// ═══════════════════════════════════════════════════════════════════
const { Pool } = require('pg');
const path = require('path');
const { hashPassword, isHashed } = require('./utils/password');

// Le fichier .env est à la racine du projet (deux dossiers au-dessus de src/server)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD manquant : vérifie le fichier .env à la racine du projet');
}

// ============================================================
// POOL POSTGRESQL - CONFIGURATION ANTI-TIMEOUT
// ============================================================
const pool = new Pool({
  user: process.env.DB_USER || 'omda_user',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'omda_db',

  options: '-c search_path=omda_app,public',

  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  statement_timeout: 30000,
  query_timeout: 30000,

  max: 20,
  min: 2,

  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  maxUses: 7500,

  application_name: 'omda-app',
});

// ============================================================
// GESTION DES ERREURS DU POOL
// ============================================================
pool.on('error', (err) => {
  console.error('⚠️ Erreur pool PG (non fatale):', err.message);
});

// ============================================================
// WRAPPER AVEC RETRY AUTOMATIQUE
// ============================================================
async function query(text, params) {
  const maxRetries = 3;
  let lastErr;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      lastErr = err;

      const isConnErr =
        err.message.includes('timeout') ||
        err.message.includes('terminated') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('Connection terminated');

      if (isConnErr && i < maxRetries - 1) {
        console.warn(`⚠️ Query échouée (${i + 1}/${maxRetries}): ${err.message}`);
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ============================================================
// ✅ FONCTION D'INITIALISATION COMPLÈTE
// ============================================================
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔍 Initialisation de la base de données...');

    await client.query('SET search_path TO omda_app, public;');

    // ============================================================
    // SCHÉMA
    // ============================================================
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS omda_app AUTHORIZATION omda_user;');
      console.log('✅ Schéma "omda_app" prêt.');
    } catch (schemaErr) {
      console.warn('⚠️ Le schéma omda_app existe déjà ou ne peut pas être créé.');
    }

    await client.query('SET search_path TO omda_app, public;');
    console.log('📁 Utilisation du schéma : omda_app');

    // ============================================================
    // TABLE UTILISATEURS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mot_de_passe VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        statut VARCHAR(20) DEFAULT 'actif',
        prefix VARCHAR(3),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        derniere_connexion TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON utilisateurs(role);
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_statut ON utilisateurs(statut);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_prefix
      ON utilisateurs(prefix) WHERE prefix IS NOT NULL;
    `);
    console.log('✅ Table utilisateurs prête');

    // ============================================================
    // TABLE REGIONS (UNIQUE sur nom)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table regions prête');

    // ============================================================
    // TABLE VILLES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS villes (
        id SERIAL PRIMARY KEY,
        region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        nom VARCHAR(100) NOT NULL,
        quartier VARCHAR(100),
        telephone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT villes_region_nom_unique UNIQUE (region_id, nom)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_villes_region ON villes(region_id);
      CREATE INDEX IF NOT EXISTS idx_villes_nom ON villes(nom);
    `);
    console.log('✅ Table villes prête');

    // ============================================================
    // MIGRATION AUTOMATIQUE : ancienne structure regions → nouvelle
    // ============================================================
    try {
      const columnsCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'regions' AND column_name = 'ville'
      `);

      if (columnsCheck.rows.length > 0) {
        console.log('⚠️ Ancienne structure détectée dans regions → migration...');

        const oldData = await client.query(
          `SELECT nom, ville, quartier, telephone FROM regions WHERE ville IS NOT NULL`
        );

        for (const row of oldData.rows) {
          const regionResult = await client.query(
            `INSERT INTO regions (nom) VALUES ($1)
             ON CONFLICT (nom) DO NOTHING
             RETURNING id`,
            [row.nom]
          );

          let regionId;
          if (regionResult.rows.length > 0) {
            regionId = regionResult.rows[0].id;
          } else {
            const existing = await client.query(
              `SELECT id FROM regions WHERE nom = $1`,
              [row.nom]
            );
            regionId = existing.rows[0].id;
          }

          if (row.ville) {
            await client.query(
              `INSERT INTO villes (region_id, nom, quartier, telephone)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (region_id, nom) DO NOTHING`,
              [regionId, row.ville, row.quartier, row.telephone]
            );
          }
        }

        console.log(`✅ Migration : ${oldData.rows.length} ligne(s) migrée(s)`);

        await client.query(`ALTER TABLE regions DROP COLUMN IF EXISTS ville`);
        await client.query(`ALTER TABLE regions DROP COLUMN IF EXISTS quartier`);
        await client.query(`ALTER TABLE regions DROP COLUMN IF EXISTS telephone`);

        console.log('✅ Migration : anciennes colonnes supprimées');
      }
    } catch (migErr) {
      console.warn('⚠️ Migration régions/villes:', migErr.message);
    }

    // ============================================================
    // TABLE COMPTEURS DOSSIERS UTILISATEURS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS compteurs_dossiers_utilisateurs (
        id SERIAL PRIMARY KEY,
        utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        annee INTEGER NOT NULL,
        compteur INTEGER DEFAULT 0,
        type_usager VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(utilisateur_id, annee, type_usager)
      )
    `);
    console.log('✅ Table compteurs_dossiers_utilisateurs prête');

    // ============================================================
    // TABLE NOTIFICATIONS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        usager_id INTEGER,
        read BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table notifications prête');

    // ============================================================
    // TABLE DELETE_REQUESTS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS delete_requests (
        id SERIAL PRIMARY KEY,
        usager_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table delete_requests prête');

    // ============================================================
    // TABLE DELETE_CONFIRMATIONS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS delete_confirmations (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES delete_requests(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(request_id, user_id)
      )
    `);
    console.log('✅ Table delete_confirmations prête');

    // ============================================================
    // TABLE DELETE_HISTORY
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS delete_history (
        id SERIAL PRIMARY KEY,
        usager_nom VARCHAR(200) NOT NULL,
        usager_type VARCHAR(50) NOT NULL,
        deleted_by VARCHAR(100) NOT NULL,
        deleted_by_role VARCHAR(50) DEFAULT 'super_admin',
        user_id INTEGER,
        created_by INTEGER REFERENCES utilisateurs(id),
        details JSONB,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table delete_history prête');

    // ============================================================
    // TABLE ACTIVITES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS activites (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        user_id INTEGER,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table activites prête');

    // ============================================================
    // TABLE USAGERS_VUS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS usagers_vus (
        id SERIAL PRIMARY KEY,
        usager_id INTEGER NOT NULL,
        usager_type VARCHAR(50) NOT NULL,
        vu_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usager_id, usager_type)
      )
    `);
    console.log('✅ Table usagers_vus prête');

    // ============================================================
    // TABLE ARTISTES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS artistes (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100),
        nationalite VARCHAR(50),
        role VARCHAR(100),
        biographie TEXT,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table artistes prête');

    // ============================================================
    // TABLE PAIEMENTS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS paiements (
        id SERIAL PRIMARY KEY,
        usager_id INTEGER NOT NULL,
        usager_type VARCHAR(50) NOT NULL,
        type_paiement VARCHAR(20) NOT NULL,
        annee INTEGER,
        mois INTEGER CHECK (mois IS NULL OR mois BETWEEN 1 AND 12),
        montant DECIMAL(15,2) NOT NULL,
        date_paiement DATE NOT NULL,
        frais_dossier DECIMAL(15,2) DEFAULT 0,
        montant_retard DECIMAL(15,2) DEFAULT 0,
        est_retard BOOLEAN DEFAULT FALSE,
        reference VARCHAR(100),
        statut VARCHAR(20) DEFAULT 'paye',
        nombre_mois INTEGER DEFAULT 1,
        mois_payes TEXT,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_paiements_usager ON paiements(usager_id, usager_type);
      CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
      CREATE INDEX IF NOT EXISTS idx_paiements_annee ON paiements(annee);
    `);
    console.log('✅ Table paiements prête');

    // ============================================================
    // MIGRATION : colonnes manquantes sur paiements
    // ============================================================
    try {
      await client.query(`ALTER TABLE paiements ADD COLUMN IF NOT EXISTS nombre_mois INTEGER DEFAULT 1`);
      await client.query(`ALTER TABLE paiements ADD COLUMN IF NOT EXISTS mois_payes TEXT`);
      console.log('✅ Migration : nombre_mois + mois_payes vérifiées');
    } catch (migErr) {
      console.warn('⚠️ Migration colonnes paiements:', migErr.message);
    }

    // ============================================================
    // MIGRATION : assouplir la contrainte CHECK
    // ============================================================
    try {
      await client.query(`ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_paiement`);
      await client.query(`
        ALTER TABLE paiements ADD CONSTRAINT check_paiement CHECK (
          (type_paiement = 'mensuel' AND annee IS NOT NULL AND mois IS NOT NULL) OR
          (type_paiement = 'unique')
        )
      `);
      console.log('✅ Contrainte check_paiement ajustée');
    } catch (migErr) {
      console.warn('⚠️ Contrainte check_paiement:', migErr.message);
    }

    // ============================================================
    // TABLE BACKUP_ANNUEL
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_annuel (
        id SERIAL PRIMARY KEY,
        annee INTEGER NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table backup_annuel prête');

    // ============================================================
    // TABLE PARAMETRES_UTILISATEUR
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS parametres_utilisateur (
        id SERIAL PRIMARY KEY,
        utilisateur_id INTEGER NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
        app_name VARCHAR(100) DEFAULT 'OMDA App',
        langue VARCHAR(10) DEFAULT 'fr',
        theme VARCHAR(20) DEFAULT 'light',
        date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
        time_format VARCHAR(10) DEFAULT '24h',
        couleur_principale VARCHAR(20) DEFAULT '#3498db',
        police VARCHAR(50) DEFAULT 'default',
        notifications JSONB DEFAULT '{"email":true,"push":true,"sms":false,"sound":true}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table parametres_utilisateur prête');

    // ============================================================
    // TABLE BACKUP_CONFIG
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        chemin_sauvegarde TEXT,
        defini_par INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT backup_config_single_row CHECK (id = 1)
      )
    `);
    console.log('✅ Table backup_config prête');

    // ============================================================
    // TABLE BACKUP_HISTORIQUE
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_historique (
        id SERIAL PRIMARY KEY,
        type_backup VARCHAR(20) NOT NULL,
        nom_fichier VARCHAR(255),
        chemin_complet TEXT,
        taille_octets BIGINT DEFAULT 0,
        statut VARCHAR(20) DEFAULT 'succes',
        message TEXT,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table backup_historique prête');

    // ============================================================
    // ✅ NOUVELLE TABLE : RESTAURATION_CONFIG
    //    → Stocke le mot de passe 4 chiffres pour la restauration BDD
    //    → Une seule ligne (id = 1)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS restauration_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        password_hash VARCHAR(255) NOT NULL,
        updated_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT restauration_config_single_row CHECK (id = 1)
      )
    `);
    console.log('✅ Table restauration_config prête');

    // ✅ Initialisation : mot de passe par défaut "0000" si la table est vide
    try {
      const checkPwd = await client.query(`SELECT id FROM restauration_config WHERE id = 1`);
      if (checkPwd.rows.length === 0) {
        const defaultHash = await hashPassword('0000');
        await client.query(`
          INSERT INTO restauration_config (id, password_hash, created_at, updated_at)
          VALUES (1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [defaultHash]);
        console.log('🔐 Mot de passe de restauration par défaut : "0000"');
      } else {
        console.log('ℹ️ Mot de passe de restauration déjà défini');
      }
    } catch (e) {
      console.warn('⚠️ Init mot de passe restauration:', e.message);
    }

    // ============================================================
    // TABLES DES USAGERS (6 types)
    // ============================================================
    const tablesUsagers = [
      {
        name: 'usagers_hotel',
        columns: `demandeur VARCHAR(255), denomination VARCHAR(255), adresse_siege VARCHAR(255), nif_stat VARCHAR(100), telephone VARCHAR(50), email VARCHAR(255), etoiles VARCHAR(10), ravinala BOOLEAN DEFAULT FALSE, representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_fonction VARCHAR(255), activite VARCHAR(100), moyens_communication JSONB, total VARCHAR(50), a_compter_du DATE, echeance DATE, confirmation_nom VARCHAR(255), date_signature DATE, lieu_signature VARCHAR(255), type_paiement VARCHAR(50) DEFAULT 'mensuel', montant_mensuel DECIMAL(15,2) DEFAULT 0, frais_dossier DECIMAL(15,2) DEFAULT 0, region VARCHAR(100), uniter INTEGER DEFAULT 1, numero_dossier_utilisateur VARCHAR(50), created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'usagers_magasin',
        columns: `demandeur VARCHAR(255), denomination VARCHAR(255), adresse_siege VARCHAR(255), nif_stat VARCHAR(100), telephone VARCHAR(50), representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_fonction VARCHAR(255), activite VARCHAR(255), nombre_magasins INTEGER DEFAULT 0, moyens_communication JSONB, total VARCHAR(50), a_compter_du DATE, echeance DATE, confirmation_nom VARCHAR(255), date_signature DATE, lieu_signature VARCHAR(255), type_paiement VARCHAR(50) DEFAULT 'mensuel', montant_mensuel DECIMAL(15,2) DEFAULT 0, frais_dossier DECIMAL(15,2) DEFAULT 0, region VARCHAR(100), uniter INTEGER DEFAULT 1, numero_dossier_utilisateur VARCHAR(50), created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'usagers_media',
        columns: `proprietaire_nom VARCHAR(255), proprietaire_adresse VARCHAR(255), proprietaire_tel VARCHAR(50), proprietaire_cin VARCHAR(100), proprietaire_cin_delivree DATE, proprietaire_cin_lieu VARCHAR(255), representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_pouvoir_date DATE, representant_pouvoir_par VARCHAR(255), representant_fonction VARCHAR(255), denomination VARCHAR(255), frequence VARCHAR(50), canal VARCHAR(50), siege VARCHAR(255), telephone VARCHAR(50), email VARCHAR(255), nif VARCHAR(100), stat VARCHAR(100), taux DECIMAL(15,2), couverture_capitale BOOLEAN DEFAULT FALSE, couverture_chef_lieu_province BOOLEAN DEFAULT FALSE, couverture_chef_lieu_region BOOLEAN DEFAULT FALSE, couverture_district BOOLEAN DEFAULT FALSE, horaires_jusqua12 BOOLEAN DEFAULT FALSE, horaires_13a24 BOOLEAN DEFAULT FALSE, has_regions BOOLEAN DEFAULT FALSE, regions_detail JSONB, type_paiement VARCHAR(50) DEFAULT 'mensuel', montant_mensuel DECIMAL(15,2) DEFAULT 0, frais_dossier DECIMAL(15,2) DEFAULT 0, region VARCHAR(100), confirmation_nom VARCHAR(255), date_signature DATE, lieu_signature VARCHAR(255), uniter INTEGER DEFAULT 1, numero_dossier_utilisateur VARCHAR(50), created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'usagers_bus',
        columns: `demandeur VARCHAR(255), denomination VARCHAR(255), adresse_siege VARCHAR(255), nif_stat VARCHAR(100), telephone VARCHAR(50), email VARCHAR(255), representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_fonction VARCHAR(255), nombre_vehicules INTEGER DEFAULT 0, lignes VARCHAR(255), type_bus VARCHAR(50), trajet VARCHAR(255), horaires VARCHAR(255), zones_desservies VARCHAR(255), a_compter_du DATE, echeance DATE, type_paiement VARCHAR(50) DEFAULT 'mensuel', montant_mensuel DECIMAL(15,2) DEFAULT 0, frais_dossier DECIMAL(15,2) DEFAULT 0, region VARCHAR(100), confirmation_nom VARCHAR(255), date_signature DATE, lieu_signature VARCHAR(255), uniter INTEGER DEFAULT 1, numero_dossier_utilisateur VARCHAR(50), created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'usagers_nightclub',
        columns: `demandeur VARCHAR(255), denomination VARCHAR(255), adresse_siege VARCHAR(255), nif_stat VARCHAR(100), telephone VARCHAR(50), email VARCHAR(255), representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_fonction VARCHAR(255), jauge_max INTEGER DEFAULT 0, horaires VARCHAR(255), moyens_communication JSONB, total VARCHAR(50), a_compter_du DATE, echeance DATE, type_paiement VARCHAR(50) DEFAULT 'mensuel', montant_mensuel DECIMAL(15,2) DEFAULT 0, frais_dossier DECIMAL(15,2) DEFAULT 0, region VARCHAR(100), confirmation_nom VARCHAR(255), date_signature DATE, lieu_signature VARCHAR(255), uniter INTEGER DEFAULT 1, numero_dossier_utilisateur VARCHAR(50), created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'usagers_occasionnel',
        columns: `demandeur VARCHAR(255), denomination VARCHAR(255), adresse_siege VARCHAR(255), nif_stat VARCHAR(100), telephone VARCHAR(50), email VARCHAR(255), representant_nom VARCHAR(255), representant_adresse VARCHAR(255), representant_tel VARCHAR(50), representant_cin VARCHAR(100), representant_cin_delivree DATE, representant_cin_lieu VARCHAR(255), representant_fonction VARCHAR(255), organisateurs VARCHAR(255), representant_par VARCHAR(255), genre_manifestation VARCHAR(255), artistes VARCHAR(255), date_evenement DATE, lieu_evenement VARCHAR(255), adresse VARCHAR(255), domicile VARCHAR(255), confirmation_nom VARCHAR(255), date_signature DATE, lieu_ajout VARCHAR(255), frais_dossier DECIMAL(15,2) DEFAULT 0, montant DECIMAL(15,2) DEFAULT 0, montant_retard DECIMAL(15,2) DEFAULT 0, is_retard BOOLEAN DEFAULT FALSE, soit_total DECIMAL(15,2) DEFAULT 0, date_ajout DATE, nom_evenement VARCHAR(255), numero_dossier_global VARCHAR(50), numero_dossier_utilisateur VARCHAR(50), region VARCHAR(100), uniter INTEGER DEFAULT 1, created_by INTEGER REFERENCES utilisateurs(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      }
    ];

    for (const table of tablesUsagers) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${table.name} (
          id SERIAL PRIMARY KEY,
          ${table.columns}
        )
      `);
      console.log(`✅ Table ${table.name} prête`);
    }

    // ============================================================
    // TABLE EVENT_ARTISTES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_artistes (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES usagers_occasionnel(id) ON DELETE CASCADE,
        artiste_id INTEGER NOT NULL REFERENCES artistes(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, artiste_id)
      )
    `);
    console.log('✅ Table event_artistes prête');

    // ============================================================
    // TABLE USAGERS (générique)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS usagers (
        id SERIAL PRIMARY KEY,
        type_usager VARCHAR(50) NOT NULL,
        denomination VARCHAR(255),
        demandeur VARCHAR(255),
        telephone VARCHAR(50),
        email VARCHAR(255),
        region VARCHAR(100),
        adresse TEXT,
        frais_dossier DECIMAL(15,2) DEFAULT 0,
        montant_mensuel DECIMAL(15,2) DEFAULT 0,
        uniter INTEGER DEFAULT 1,
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table usagers prête');

    // ============================================================
    // TABLE FACTURE_USAGER (SANS champ quittance)
    //    → ref_omda N'EST PLUS UNIQUE (autorisé pour Type B)
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS facture_usager (
        id SERIAL PRIMARY KEY,
        ref_omda INTEGER NOT NULL,
        num_facture VARCHAR(20) NOT NULL,
        num_facture_type VARCHAR(1) DEFAULT 'A',
        ref_client_type VARCHAR(10) NOT NULL,
        ref_usager INTEGER NOT NULL,
        type_facture VARCHAR(50),
        region_usager VARCHAR(100),
        date_ajout DATE DEFAULT CURRENT_DATE,
        denomination VARCHAR(255),
        demandeur VARCHAR(255),
        telephone VARCHAR(50),
        email VARCHAR(255),
        adresse TEXT,
        representant_nom VARCHAR(255),
        representant_adresse VARCHAR(255),
        representant_tel VARCHAR(50),
        representant_cin VARCHAR(100),
        representant_cin_delivree VARCHAR(50),
        representant_cin_lieu VARCHAR(255),
        representant_fonction VARCHAR(255),
        activite VARCHAR(255),
        etoiles VARCHAR(10),
        ravinala BOOLEAN DEFAULT FALSE,
        nombre_magasins INTEGER DEFAULT 0,
        nombre_vehicules INTEGER DEFAULT 0,
        lignes VARCHAR(255),
        type_bus VARCHAR(50),
        trajet VARCHAR(255),
        horaires VARCHAR(255),
        zones_desservies VARCHAR(255),
        jauge_max INTEGER DEFAULT 0,
        frequence VARCHAR(50),
        canal VARCHAR(50),
        siege VARCHAR(255),
        nif VARCHAR(100),
        stat VARCHAR(100),
        taux DECIMAL(15,2),
        organisateurs VARCHAR(255),
        representant_par VARCHAR(255),
        genre_manifestation VARCHAR(255),
        artistes VARCHAR(255),
        date_evenement DATE,
        lieu_evenement VARCHAR(255),
        domicile VARCHAR(255),
        lieu_ajout VARCHAR(255),
        date_signature DATE,
        confirmation_nom VARCHAR(255),
        personne_recu VARCHAR(255),
        moyens_communication JSONB,
        a_compter_du DATE,
        echeance DATE,
        montant_mensuel DECIMAL(15,2) DEFAULT 0,
        frais_dossier DECIMAL(15,2) DEFAULT 0,
        montant_retard DECIMAL(15,2) DEFAULT 0,
        is_retard BOOLEAN DEFAULT FALSE,
        soit_total DECIMAL(15,2) DEFAULT 0,
        uniter INTEGER DEFAULT 1,
        is_renouvellement BOOLEAN DEFAULT FALSE,
        frais_renouvellement DECIMAL(15,2) DEFAULT 0,
        is_renouvellement_facture BOOLEAN DEFAULT FALSE,
        frais_renouvellement_facture DECIMAL(15,2) DEFAULT 0,
        mois_facture INTEGER CHECK (mois_facture BETWEEN 1 AND 12),
        annee_facture INTEGER,
        mois_groupes TEXT,
        type_groupe VARCHAR(10) DEFAULT 'A',
        suffixe VARCHAR(5),
        description_personnalisee TEXT,
        annee_paiement INTEGER,
        mois_groupes_json JSONB,
        numero_dossier_utilisateur VARCHAR(50),
        numero_dossier_global VARCHAR(50),
        daf_nom VARCHAR(255),
        statut VARCHAR(20) DEFAULT 'brouillon',
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table facture_usager prête (ref_omda NON-UNIQUE pour Type B)');

    // ============================================================
    // ✅ MIGRATION CRITIQUE : SUPPRIMER LA CONTRAINTE UNIQUE SUR ref_omda
    // ============================================================
    try {
      console.log('🔄 Migration : suppression de la contrainte UNIQUE sur ref_omda...');

      const constraintsResult = await client.query(`
        SELECT tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'facture_usager'
          AND tc.constraint_type = 'UNIQUE'
          AND ccu.column_name = 'ref_omda'
      `);

      if (constraintsResult.rows.length > 0) {
        for (const row of constraintsResult.rows) {
          await client.query(`ALTER TABLE facture_usager DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
          console.log(`   ✅ Contrainte UNIQUE "${row.constraint_name}" supprimée`);
        }
      } else {
        console.log('   ℹ️ Aucune contrainte UNIQUE sur ref_omda (déjà OK)');
      }

      const indexesResult = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'facture_usager'
          AND indexdef LIKE '%UNIQUE%'
          AND indexdef LIKE '%ref_omda%'
      `);

      if (indexesResult.rows.length > 0) {
        for (const row of indexesResult.rows) {
          await client.query(`DROP INDEX IF EXISTS ${row.indexname}`);
          console.log(`   ✅ Index UNIQUE "${row.indexname}" supprimé`);
        }
      } else {
        console.log('   ℹ️ Aucun index UNIQUE sur ref_omda');
      }

      console.log('✅ Migration ref_omda terminée');
    } catch (migErr) {
      console.warn('⚠️ Migration suppression UNIQUE ref_omda:', migErr.message);
    }

    // ============================================================
    // ✅ MIGRATION : Supprimer l'ancienne colonne quittance de facture_usager
    // ============================================================
    try {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'facture_usager' AND column_name = 'quittance'
      `);
      if (colCheck.rows.length > 0) {
        console.log('⚠️ Ancienne colonne quittance détectée dans facture_usager');
        console.log('   → Migration vers quitance_usager en cours...');
      }
    } catch (e) {
      console.warn('⚠️ Vérification colonne quittance:', e.message);
    }

    // ============================================================
    // ✅ NOUVELLE TABLE QUITANCE_USAGER
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS quitance_usager (
        id SERIAL PRIMARY KEY,
        id_facture INTEGER NOT NULL REFERENCES facture_usager(id) ON DELETE CASCADE,
        num_quitance INTEGER NOT NULL,
        num_quitance_formate VARCHAR(20) NOT NULL,
        longueur_format INTEGER NOT NULL DEFAULT 7,
        quittance_validee BOOLEAN DEFAULT FALSE,
        personne_recu VARCHAR(255),
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT quitance_usager_facture_unique UNIQUE (id_facture)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quitance_usager_num ON quitance_usager(num_quitance);
      CREATE INDEX IF NOT EXISTS idx_quitance_usager_facture ON quitance_usager(id_facture);
      CREATE INDEX IF NOT EXISTS idx_quitance_usager_validee ON quitance_usager(quittance_validee);
      CREATE INDEX IF NOT EXISTS idx_quitance_usager_formate ON quitance_usager(num_quitance_formate);
    `);
    console.log('✅ Table quitance_usager prête (relation 1:1 stricte avec facture_usager)');

    // ============================================================
    // ✅ MIGRATION : Copier les quittances existantes
    // ============================================================
    try {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'facture_usager' AND column_name = 'quittance'
      `);

      if (colCheck.rows.length > 0) {
        console.log('🔄 Migration : copie des quittances existantes...');

        const existing = await client.query(`
          SELECT f.id AS id_facture, f.quittance, f.quittance_validee, f.personne_recu, f.created_by
          FROM facture_usager f
          LEFT JOIN quitance_usager q ON q.id_facture = f.id
          WHERE f.quittance IS NOT NULL AND f.quittance > 0
            AND q.id IS NULL
        `);

        if (existing.rows.length > 0) {
          for (const row of existing.rows) {
            const numStr = String(row.quittance);
            const longueur = Math.max(7, numStr.length);
            const formate = numStr.padStart(longueur, '0');

            await client.query(`
              INSERT INTO quitance_usager (
                id_facture, num_quitance, num_quitance_formate,
                longueur_format, quittance_validee, personne_recu, created_by
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (id_facture) DO NOTHING
            `, [
              row.id_facture,
              row.quittance,
              formate,
              longueur,
              row.quittance_validee || false,
              row.personne_recu || null,
              row.created_by || null,
            ]);
          }
          console.log(`✅ Migration : ${existing.rows.length} quittance(s) copiée(s)`);
        } else {
          console.log('ℹ️ Aucune quittance à migrer');
        }

        await client.query(`ALTER TABLE facture_usager DROP COLUMN IF EXISTS quittance`);
        await client.query(`ALTER TABLE facture_usager DROP COLUMN IF EXISTS quittance_validee`);
        console.log('✅ Migration : colonnes quittance supprimées de facture_usager');
      } else {
        console.log('ℹ️ facture_usager ne contient plus de colonne quittance (déjà migré)');
      }
    } catch (migErr) {
      console.warn('⚠️ Migration quitance_usager:', migErr.message);
    }

    // ============================================================
    // TABLE USAGER_OTHER
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS usager_other (
        id SERIAL PRIMARY KEY,
        type_usager VARCHAR(50) NOT NULL,
        denomination VARCHAR(255) NOT NULL,
        nom VARCHAR(255),
        prenom VARCHAR(255),
        telephone VARCHAR(50),
        email VARCHAR(255),
        adresse TEXT,
        region VARCHAR(100),
        representant_par VARCHAR(255),
        representant_cin VARCHAR(100),
        representant_cin_delivree DATE,
        representant_cin_lieu VARCHAR(255),
        representant_contact VARCHAR(50),
        mode_paiement VARCHAR(20) NOT NULL DEFAULT 'unique',
        numero_dossier_utilisateur VARCHAR(50),
        numero_dossier_global VARCHAR(50),
        quittance INTEGER,
        quittance_validee BOOLEAN DEFAULT FALSE,
        personne_recu VARCHAR(255),
        statut VARCHAR(20) DEFAULT 'actif',
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usager_other_type ON usager_other(type_usager);
      CREATE INDEX IF NOT EXISTS idx_usager_other_region ON usager_other(region);
      CREATE INDEX IF NOT EXISTS idx_usager_other_mode ON usager_other(mode_paiement);
      CREATE INDEX IF NOT EXISTS idx_usager_other_quittance ON usager_other(quittance);
    `);
    console.log('✅ Table usager_other prête');

    // ============================================================
    // TABLE OTHER_LIGNES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS other_lignes (
        id SERIAL PRIMARY KEY,
        usager_other_id INTEGER NOT NULL REFERENCES usager_other(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        uniter INTEGER DEFAULT 1,
        pu DECIMAL(15,2) DEFAULT 0,
        montant DECIMAL(15,2) DEFAULT 0,
        ordre INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_other_lignes_usager ON other_lignes(usager_other_id);
    `);
    console.log('✅ Table other_lignes prête');

    // ============================================================
    // MIGRATION : Ajout des colonnes region_id, ville_id, quartier_id, numero_localite
    // ============================================================
    const tablesAvecLocalisation = [
      'usagers_hotel',
      'usagers_magasin',
      'usagers_media',
      'usagers_bus',
      'usagers_nightclub',
      'usagers_occasionnel',
      'usager_other',
    ];

    console.log('🔄 Migration : ajout des colonnes de localisation...');

    for (const tableName of tablesAvecLocalisation) {
      try {
        await client.query(`
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL
        `);
        await client.query(`
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS ville_id INTEGER REFERENCES villes(id) ON DELETE SET NULL
        `);
        await client.query(`
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS quartier_id INTEGER
        `);
        await client.query(`
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS numero_localite VARCHAR(50)
        `);

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${tableName}_region_id ON ${tableName}(region_id)
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${tableName}_ville_id ON ${tableName}(ville_id)
        `);

        console.log(`   ✅ ${tableName} : region_id + ville_id + quartier_id + numero_localite`);
      } catch (migErr) {
        console.warn(`   ⚠️ ${tableName}:`, migErr.message);
      }
    }

    // ============================================================
    // BACKFILL AUTOMATIQUE
    // ============================================================
    try {
      console.log('🔄 Backfill : association region_id/ville_id...');

      for (const tableName of tablesAvecLocalisation) {
        await client.query(`
          UPDATE ${tableName} u
          SET region_id = r.id
          FROM regions r
          WHERE u.region_id IS NULL
            AND u.region IS NOT NULL
            AND LOWER(TRIM(u.region)) = LOWER(TRIM(r.nom))
        `);

        try {
          const colsResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
              AND column_name IN ('adresse_siege', 'adresse', 'siege', 'lieu_evenement', 'domicile')
          `);
          const existingCols = colsResult.rows.map(r => r.column_name);

          if (existingCols.length > 0) {
            const conditions = existingCols.map(col =>
              `LOWER(COALESCE(u.${col}, '')) LIKE '%' || LOWER(v.nom) || '%'`
            ).join(' OR ');

            await client.query(`
              UPDATE ${tableName} u
              SET ville_id = v.id
              FROM villes v
              WHERE u.ville_id IS NULL
                AND u.region_id = v.region_id
                AND (${conditions})
            `);
          }
        } catch (e) {
          console.warn(`   ⚠️ Backfill ville_id ${tableName}:`, e.message);
        }
      }

      for (const tableName of tablesAvecLocalisation) {
        try {
          const stats = await client.query(`
            SELECT
              COUNT(*) AS total,
              COUNT(region_id) AS avec_region,
              COUNT(ville_id) AS avec_ville
            FROM ${tableName}
          `);
          const s = stats.rows[0];
          console.log(`   📊 ${tableName}: ${s.total} total, ${s.avec_region} region_id, ${s.avec_ville} ville_id`);
        } catch (e) { /* ignore */ }
      }

      console.log('✅ Backfill terminé');
    } catch (backfillErr) {
      console.warn('⚠️ Backfill localisation:', backfillErr.message);
    }

    // ============================================================
    // MIGRATION : colonnes renouvellement
    // ============================================================
    try {
      await client.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS is_renouvellement BOOLEAN DEFAULT FALSE`);
      await client.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS frais_renouvellement DECIMAL(15,2) DEFAULT 0`);
      await client.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS is_renouvellement_facture BOOLEAN DEFAULT FALSE`);
      await client.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS frais_renouvellement_facture DECIMAL(15,2) DEFAULT 0`);
      console.log('✅ Migration : colonnes de renouvellement prêtes');
    } catch (migErr) {
      console.warn('⚠️ Migration colonnes renouvellement:', migErr.message);
    }

    // ============================================================
    // ✅ MIGRATION CRITIQUE FINALE : Vérifier et supprimer la contrainte UNIQUE
    // ============================================================
    try {
      const uniqueCheck = await client.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'facture_usager'
          AND tc.constraint_type = 'UNIQUE'
          AND ccu.column_name = 'ref_omda'
      `);

      if (uniqueCheck.rows.length > 0) {
        for (const row of uniqueCheck.rows) {
          await client.query(`ALTER TABLE facture_usager DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
          console.log(`   ✅ Contrainte UNIQUE "${row.constraint_name}" supprimée (vérif finale)`);
        }
      } else {
        console.log('   ✅ Aucune contrainte UNIQUE sur ref_omda — Type B supporté');
      }

      await client.query(`CREATE INDEX IF NOT EXISTS idx_facture_ref_omda ON facture_usager(ref_omda)`);
    } catch (e) {
      console.warn('⚠️ Vérif finale contrainte ref_omda:', e.message);
    }

    // ============================================================
    // INDEX
    // ============================================================
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facture_ref_client_type ON facture_usager(ref_client_type);
      CREATE INDEX IF NOT EXISTS idx_facture_ref_usager ON facture_usager(ref_usager);
      CREATE INDEX IF NOT EXISTS idx_facture_statut ON facture_usager(statut);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_mois_facture ON facture_usager(mois_facture);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_annee_facture ON facture_usager(annee_facture);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_type_groupe ON facture_usager(type_groupe);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_annee_paiement ON facture_usager(annee_paiement);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_suffixe ON facture_usager(suffixe);
      CREATE INDEX IF NOT EXISTS idx_backup_historique_type ON backup_historique(type_backup);
      CREATE INDEX IF NOT EXISTS idx_backup_historique_date ON backup_historique(created_at);
    `);
    console.log('✅ Index prêts');

    // ============================================================
    // UTILISATEURS PAR DÉFAUT
    // ============================================================
    const defaultUsers = [
      { nom: 'RANDRIANARIVELO Faniry', email: 'faniry@omda.mg', mot_de_passe: '1234', role: 'super_admin', prefix: 'FAN' },
      { nom: 'ANDRIATSITOAINA Herimbola', email: 'herimbola@omda.mg', mot_de_passe: '1234', role: 'super_admin', prefix: 'HER' }
    ];

    const currentYear = new Date().getFullYear();
    const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'Bus', 'Night club', 'OCC'];

    for (const user of defaultUsers) {
      const exists = await client.query(
        'SELECT id, mot_de_passe FROM utilisateurs WHERE email = $1 OR prefix = $2',
        [user.email, user.prefix]
      );
      let userId;

      const hashedPassword = await hashPassword(user.mot_de_passe);

      if (exists.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix)
           VALUES ($1, $2, $3, $4, 'actif', $5) RETURNING id`,
          [user.nom, user.email, hashedPassword, user.role, user.prefix]
        );
        userId = result.rows[0].id;
        console.log(`✅ Super Admin ${user.nom} créé (${user.email}) — mot de passe hashé`);
      } else {
        userId = exists.rows[0].id;
        const storedPassword = exists.rows[0].mot_de_passe;

        let finalPassword = storedPassword;
        if (!isHashed(storedPassword)) {
          finalPassword = hashedPassword;
          console.log(`🔐 Hash du mot de passe de ${user.nom} (migration)`);
        }

        await client.query(
          'UPDATE utilisateurs SET role = $1, statut = $2, mot_de_passe = $3 WHERE id = $4',
          [user.role, 'actif', finalPassword, userId]
        );
        console.log(`ℹ️ Super Admin ${user.nom} déjà présent (mis à jour)`);
      }

      for (const type of typesUsager) {
        await client.query(
          `INSERT INTO compteurs_dossiers_utilisateurs (utilisateur_id, annee, compteur, type_usager)
           VALUES ($1, $2, 0, $3)
           ON CONFLICT (utilisateur_id, annee, type_usager) DO NOTHING`,
          [userId, currentYear, type]
        );
      }

      await client.query(
        `INSERT INTO parametres_utilisateur (utilisateur_id)
         VALUES ($1)
         ON CONFLICT (utilisateur_id) DO NOTHING`,
        [userId]
      );
    }

    await client.query(`
      INSERT INTO backup_config (id, chemin_sauvegarde)
      VALUES (1, NULL)
      ON CONFLICT (id) DO NOTHING
    `);

    // ============================================================
    // MIGRATION AUTOMATIQUE : HASHER TOUS LES MOTS DE PASSE
    // ============================================================
    try {
      const plainUsers = await client.query(
        `SELECT id, nom, mot_de_passe FROM utilisateurs
         WHERE mot_de_passe NOT LIKE '$2a$%'
           AND mot_de_passe NOT LIKE '$2b$%'`
      );
      if (plainUsers.rows.length > 0) {
        console.log(`🔐 Migration : ${plainUsers.rows.length} mot(s) de passe en clair détecté(s)`);
        for (const u of plainUsers.rows) {
          const hashed = await hashPassword(u.mot_de_passe);
          await client.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, u.id]);
          console.log(`   ✅ ${u.nom} — mot de passe hashé`);
        }
      } else {
        console.log('🔐 Tous les mots de passe sont déjà hashés.');
      }
    } catch (migErr) {
      console.warn('⚠️ Migration hash passwords:', migErr.message);
    }

    console.log('✅ Base de données initialisée avec succès !');
    console.log('📂 Schéma utilisé : omda_app');
    console.log('');
    console.log('🔑 COMPTES SUPER ADMIN DISPONIBLES :');
    console.log('   1. faniry@omda.mg    / 1234  (RANDRIANARIVELO Faniry)');
    console.log('   2. herimbola@omda.mg / 1234  (ANDRIATSITOAINA Herimbola)');
    console.log('');
    console.log('✅ Type B supporté : plusieurs factures avec même ref_omda (suffixes A-L)');
    console.log('🔐 Mot de passe restauration BDD par défaut : "0000"');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur init DB:', error.message);
    console.error('📌 Détail complet:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// FONCTION DE TEST DE CONNEXION
// ============================================================
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as time, current_database() as db, current_schema() as schema');
    console.log(`✅ Test de connexion réussi: ${result.rows[0].time} (${result.rows[0].db} / ${result.rows[0].schema})`);
    return true;
  } catch (error) {
    console.error('❌ Test de connexion échoué:', error.message);
    return false;
  }
}

// ============================================================
// FERMETURE PROPRE
// ============================================================
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  pool,
  query,
  initDB,
  testConnection,
};