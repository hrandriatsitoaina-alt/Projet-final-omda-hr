// server/database.js
const { Pool } = require('pg');
const { hashPassword, isHashed } = require('./utils/password');

// ============================================================
// CONFIGURATION DE LA BASE DE DONNÉES
// ============================================================
const pool = new Pool({
  user: 'omda_user',
  password: 'Omda2026',
  host: 'localhost',
  port: 5432,
  database: 'omda_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  client.query('SET search_path TO omda_app, public;')
    .catch(err => console.warn('⚠️ Erreur SET search_path:', err.message));
});

pool.on('error', (err) => {
  console.error('❌ Erreur inattendue du pool PostgreSQL:', err);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion à PostgreSQL:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connecté à PostgreSQL');
    release();
  }
});

// ============================================================
// FONCTION D'INITIALISATION COMPLÈTE
// ============================================================
async function initDB() {
  try {
    console.log('🔍 Initialisation de la base de données...');

    try {
      await pool.query('CREATE SCHEMA IF NOT EXISTS omda_app AUTHORIZATION omda_user;');
      console.log('✅ Schéma "omda_app" prêt.');
    } catch (schemaErr) {
      console.warn('⚠️ Le schéma omda_app existe déjà ou ne peut pas être créé.');
    }

    await pool.query('SET search_path TO omda_app, public;');
    console.log('📁 Utilisation du schéma : omda_app');

    // ============================================================
    // TABLE UTILISATEURS
    // ============================================================
    await pool.query(`
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
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_role ON utilisateurs(role);
      CREATE INDEX IF NOT EXISTS idx_utilisateurs_statut ON utilisateurs(statut);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_prefix 
      ON utilisateurs(prefix) WHERE prefix IS NOT NULL;
    `);
    console.log('✅ Table utilisateurs prête');

    // ============================================================
    // TABLE REGIONS
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        telephone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table regions prête');

    // ============================================================
    // TABLE COMPTEURS DOSSIERS UTILISATEURS
    // ============================================================
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS paiements (
        id SERIAL PRIMARY KEY,
        usager_id INTEGER NOT NULL,
        usager_type VARCHAR(50) NOT NULL,
        type_paiement VARCHAR(20) NOT NULL,
        annee INTEGER,
        mois INTEGER CHECK (mois BETWEEN 1 AND 12),
        montant DECIMAL(15,2) NOT NULL,
        date_paiement DATE NOT NULL,
        frais_dossier DECIMAL(15,2) DEFAULT 0,
        montant_retard DECIMAL(15,2) DEFAULT 0,
        est_retard BOOLEAN DEFAULT FALSE,
        reference VARCHAR(100),
        statut VARCHAR(20) DEFAULT 'paye',
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_paiement CHECK (
          (type_paiement = 'mensuel' AND annee IS NOT NULL AND mois IS NOT NULL) OR
          (type_paiement = 'unique' AND annee IS NULL AND mois IS NULL)
        )
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_paiements_usager ON paiements(usager_id, usager_type);
      CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
      CREATE INDEX IF NOT EXISTS idx_paiements_annee ON paiements(annee);
    `);
    console.log('✅ Table paiements prête');

    // ============================================================
    // TABLE BACKUP_ANNUEL
    // ============================================================
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
      await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    // TABLE FACTURE_USAGER
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS facture_usager (
        id SERIAL PRIMARY KEY,
        ref_omda INTEGER NOT NULL UNIQUE,
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
        quittance INTEGER,
        quittance_validee BOOLEAN DEFAULT FALSE,
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
    console.log('✅ Table facture_usager prête');

    // ============================================================
    // TABLE USAGER_OTHER
    // ============================================================
    await pool.query(`
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
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usager_other_type ON usager_other(type_usager);
      CREATE INDEX IF NOT EXISTS idx_usager_other_region ON usager_other(region);
      CREATE INDEX IF NOT EXISTS idx_usager_other_mode ON usager_other(mode_paiement);
      CREATE INDEX IF NOT EXISTS idx_usager_other_quittance ON usager_other(quittance);
    `);
    console.log('✅ Table usager_other prête');

    // ============================================================
    // TABLE OTHER_LIGNES
    // ============================================================
    await pool.query(`
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
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_other_lignes_usager ON other_lignes(usager_other_id);
    `);
    console.log('✅ Table other_lignes prête');

    // ============================================================
    // MIGRATION : colonnes renouvellement
    // ============================================================
    try {
      await pool.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS is_renouvellement BOOLEAN DEFAULT FALSE`);
      await pool.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS frais_renouvellement DECIMAL(15,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS is_renouvellement_facture BOOLEAN DEFAULT FALSE`);
      await pool.query(`ALTER TABLE facture_usager ADD COLUMN IF NOT EXISTS frais_renouvellement_facture DECIMAL(15,2) DEFAULT 0`);
      console.log('✅ Migration : colonnes de renouvellement prêtes');
    } catch (migErr) {
      console.warn('⚠️ Migration colonnes renouvellement:', migErr.message);
    }

    // ============================================================
    // INDEX
    // ============================================================
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_facture_ref_omda ON facture_usager(ref_omda);
      CREATE INDEX IF NOT EXISTS idx_facture_ref_client_type ON facture_usager(ref_client_type);
      CREATE INDEX IF NOT EXISTS idx_facture_ref_usager ON facture_usager(ref_usager);
      CREATE INDEX IF NOT EXISTS idx_facture_statut ON facture_usager(statut);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_mois_facture ON facture_usager(mois_facture);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_annee_facture ON facture_usager(annee_facture);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_type_groupe ON facture_usager(type_groupe);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_annee_paiement ON facture_usager(annee_paiement);
      CREATE INDEX IF NOT EXISTS idx_facture_usager_quittance ON facture_usager(quittance);
      CREATE INDEX IF NOT EXISTS idx_backup_historique_type ON backup_historique(type_backup);
      CREATE INDEX IF NOT EXISTS idx_backup_historique_date ON backup_historique(created_at);
    `);
    console.log('✅ Index prêts');

    // ============================================================
    // ✅ CRÉATION DES UTILISATEURS PAR DÉFAUT (MOT DE PASSE HASHÉ)
    // ⚠️ SEULEMENT 2 SUPER ADMINS PRIORITAIRES
    //    1. RANDRIANARIVELO Faniry   (super_admin) - faniry@omda.mg / 1234
    //    2. ANDRIATSITOAINA Herimbola (super_admin) - herimbola@omda.mg / 1234
    // ============================================================
    const defaultUsers = [
      {
        nom: 'RANDRIANARIVELO Faniry',
        email: 'faniry@omda.mg',
        mot_de_passe: '1234',
        role: 'super_admin',
        prefix: 'FAN'
      },
      {
        nom: 'ANDRIATSITOAINA Herimbola',
        email: 'herimbola@omda.mg',
        mot_de_passe: '1234',
        role: 'super_admin',
        prefix: 'HER'
      }
    ];

    const currentYear = new Date().getFullYear();
    const typesUsager = ['Hôtel', 'Grand Surface', 'Télé/Radio', 'Bus', 'Night club', 'OCC'];

    for (const user of defaultUsers) {
      const exists = await pool.query(
        'SELECT id, mot_de_passe FROM utilisateurs WHERE email = $1 OR prefix = $2',
        [user.email, user.prefix]
      );
      let userId;

      // ✅ Hacher le mot de passe AVANT l'insertion
      const hashedPassword = await hashPassword(user.mot_de_passe);

      if (exists.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut, prefix) 
           VALUES ($1, $2, $3, $4, 'actif', $5) RETURNING id`,
          [user.nom, user.email, hashedPassword, user.role, user.prefix]
        );
        userId = result.rows[0].id;
        console.log(`✅ Super Admin ${user.nom} créé (${user.email}) — mot de passe hashé`);
      } else {
        userId = exists.rows[0].id;
        const storedPassword = exists.rows[0].mot_de_passe;

        // ✅ Si le mot de passe n'est PAS encore hashé → on le hashe
        let finalPassword = storedPassword;
        if (!isHashed(storedPassword)) {
          finalPassword = hashedPassword;
          console.log(`🔐 Hash du mot de passe de ${user.nom} (migration)`);
        }

        await pool.query(
          'UPDATE utilisateurs SET role = $1, statut = $2, mot_de_passe = $3 WHERE id = $4',
          [user.role, 'actif', finalPassword, userId]
        );
        console.log(`ℹ️ Super Admin ${user.nom} déjà présent (mis à jour)`);
      }

      // Compteurs de dossiers
      for (const type of typesUsager) {
        await pool.query(
          `INSERT INTO compteurs_dossiers_utilisateurs (utilisateur_id, annee, compteur, type_usager) 
           VALUES ($1, $2, 0, $3)
           ON CONFLICT (utilisateur_id, annee, type_usager) DO NOTHING`,
          [userId, currentYear, type]
        );
      }

      // Paramètres utilisateur
      await pool.query(
        `INSERT INTO parametres_utilisateur (utilisateur_id)
         VALUES ($1)
         ON CONFLICT (utilisateur_id) DO NOTHING`,
        [userId]
      );
    }

    await pool.query(`
      INSERT INTO backup_config (id, chemin_sauvegarde)
      VALUES (1, NULL)
      ON CONFLICT (id) DO NOTHING
    `);

    // ============================================================
    // ✅ MIGRATION AUTOMATIQUE : HASHER TOUS LES MOTS DE PASSE EN CLAIR
    // ============================================================
    try {
      const plainUsers = await pool.query(
        `SELECT id, nom, mot_de_passe FROM utilisateurs 
         WHERE mot_de_passe NOT LIKE '$2a$%' 
           AND mot_de_passe NOT LIKE '$2b$%'`
      );
      if (plainUsers.rows.length > 0) {
        console.log(`🔐 Migration : ${plainUsers.rows.length} mot(s) de passe en clair détecté(s)`);
        for (const u of plainUsers.rows) {
          const hashed = await hashPassword(u.mot_de_passe);
          await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, u.id]);
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

  } catch (error) {
    console.error('❌ Erreur init DB:', error.message);
    console.error('📌 Détail complet:', error);
    throw error;
  }
}

// ============================================================
// FONCTION DE TEST DE CONNEXION
// ============================================================
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ Test de connexion réussi:', result.rows[0].time);
    return true;
  } catch (error) {
    console.error('❌ Test de connexion échoué:', error.message);
    return false;
  }
}

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  pool,
  initDB,
  testConnection,
  query: (text, params) => pool.query(text, params)
};