// server/routes/facture.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ============================================================
// 0. RÉCUPÉRER LE NOM DU DAF ACTIF
// ============================================================
const getDAFName = async () => {
  try {
    const result = await pool.query(
      `SELECT nom FROM utilisateurs WHERE role = 'daf' AND statut = 'actif' LIMIT 1`
    );
    if (result.rows.length > 0) return result.rows[0].nom;
    const fallbackResult = await pool.query(
      `SELECT nom FROM utilisateurs WHERE role = 'super_admin' AND statut = 'actif' LIMIT 1`
    );
    if (fallbackResult.rows.length > 0) return fallbackResult.rows[0].nom;
    return 'Directeur Financier';
  } catch (error) {
    console.error('❌ Erreur récupération DAF:', error);
    return 'Directeur Financier';
  }
};

// ============================================================
// 0.1 RÉCUPÉRER LE DERNIER NUMÉRO DE QUITTANCE
// ============================================================
const getLastQuittanceNumber = async (client = pool) => {
  try {
    const result = await client.query(`
      SELECT num_quitance 
      FROM quitance_usager 
      ORDER BY id DESC 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('📊 quitance_usager vide → 0');
      return 0;
    }

    const dernier = parseInt(result.rows[0].num_quitance, 10) || 0;
    console.log(`📊 Dernier numéro quittance: ${dernier}`);
    return dernier;
  } catch (error) {
    console.error('❌ Erreur récupération dernier quittance:', error);
    return 0;
  }
};

// ============================================================
// 0.1b RÉCUPÉRER LE DERNIER ref_omda
// ============================================================
const getLastRefOmda = async (client = pool) => {
  try {
    const result = await client.query(`
      SELECT COALESCE(MAX(ref_omda), 0) as max_ref FROM facture_usager
    `);
    return result.rows[0].max_ref || 0;
  } catch (error) {
    console.error('❌ Erreur récupération dernier ref_omda:', error);
    return 0;
  }
};

// ============================================================
// 0.2 CRÉER UNE LIGNE DANS QUITANCE_USAGER
// ============================================================
const creerQuittancePourFacture = async (client, idFacture, numQuitance, userId = null, personneRecu = null) => {
  try {
    const existing = await client.query(`
      SELECT id FROM quitance_usager WHERE id_facture = $1
    `, [idFacture]);

    if (existing.rows.length > 0) {
      console.log(`   ⚠️ Quittance déjà existante pour facture ${idFacture}`);
      return existing.rows[0];
    }

    const numeroInt = parseInt(numQuitance, 10) || 1;
    const numeroStr = String(numeroInt).padStart(7, '0');

    const result = await client.query(`
      INSERT INTO quitance_usager (
        id_facture, num_quitance, num_quitance_formate,
        longueur_format, quittance_validee, personne_recu, created_by
      )
      VALUES ($1, $2, $3, 7, FALSE, $4, $5)
      RETURNING id, id_facture, num_quitance, num_quitance_formate
    `, [idFacture, numeroInt, numeroStr, personneRecu, userId]);

    console.log(`   ✅ Quittance créée: ${numeroStr} (pour facture ${idFacture})`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur création quittance:', error);
    throw error;
  }
};

// ============================================================
// 0.3 FORMATER LE NUMÉRO DE QUITTANCE SUR 7 CHIFFRES
// ============================================================
const formatQuittance = (num) => {
  const n = parseInt(num, 10) || 0;
  return String(n).padStart(7, '0');
};

// ============================================================
// 0.4 EXTRACTION DU MONTANT
// ============================================================
const extractMontantDepuisBase = (usagerData) => {
  const candidats = [
    usagerData.montant_mensuel,
    usagerData.montant_total,
    usagerData.montant,
    usagerData.taux
  ];
  for (const val of candidats) {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
};

// ============================================================
// 0.5 GET TABLE NAME
// ============================================================
const getTableName = (usagerType) => {
  const mapping = {
    'hotel': 'usagers_hotel',
    'grand-surface': 'usagers_magasin',
    'media': 'usagers_media',
    'bus': 'usagers_bus',
    'nightclub': 'usagers_nightclub',
    'occ': 'usagers_occasionnel',
    'other': 'usager_other'
  };
  return mapping[usagerType];
};

// ============================================================
// 0.6 OBTENIR LES COLONNES D'UNE TABLE
// ============================================================
const getTableColumns = async (tableName) => {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
        AND table_schema IN ('omda_app', 'public')
    `, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`❌ Erreur récupération colonnes de ${tableName}:`, error);
    return [];
  }
};

// ============================================================
// 0.7 VÉRIFIER SI UNE COLONNE EXISTE
// ============================================================
const hasColumn = (columns, colName) => {
  return columns.includes(colName);
};

// ============================================================
// 0.8 GET LIGNES OTHER
// ============================================================
const getOtherLignes = async (usagerOtherId, client = pool) => {
  try {
    const result = await client.query(`
      SELECT description, uniter, pu, montant, ordre
      FROM other_lignes 
      WHERE usager_other_id = $1
      ORDER BY ordre ASC
    `, [usagerOtherId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur récupération other_lignes:', error);
    return [];
  }
};

// ============================================================
// 0.9 TYPE MAPPING (ref_client_type)
// ============================================================
const getRefClientType = (usagerType) => {
  const typeMapping = {
    'hotel': 'HTL',
    'grand-surface': 'MGS',
    'media': 'RDP',
    'bus': 'TRP',
    'nightclub': 'NGT',
    'occ': 'OCC',
    'other': 'OTH'
  };
  return typeMapping[usagerType] || 'AUT';
};

// ============================================================
// 1. CRÉER UNE FACTURE SIMPLE (TYPE A)
// ============================================================
router.post('/factures/creer', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('📥 ROUTE /factures/creer appelée');
    
    const { 
      usagerId, 
      usagerType, 
      userId,
      typeFacture = 'DAFC',
      regionUsager,
      personneRecu,
      montantMensuel: frontMontantMensuel,
      fraisDossier: frontFraisDossier,
      montantRetard: frontMontantRetard,
      isRetard: frontIsRetard,
      uniter: frontUniter,
      soitTotal: frontSoitTotal,
      quittance: frontQuittance,
      quittanceValidee: frontQuittanceValidee,
      isRenouvellement: frontIsRenouvellement,
      fraisRenouvellement: frontFraisRenouvellement,
      isRenouvellementFacture: frontIsRenouvellementFacture,
      fraisRenouvellementFacture: frontFraisRenouvellementFacture
    } = req.body;

    if (!usagerId || !usagerType || !userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: usagerId, usagerType et userId sont requis'
      });
    }

    const tableName = getTableName(usagerType);
    if (!tableName) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Type d'usager non reconnu: ${usagerType}`
      });
    }

    const usagerResult = await client.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [usagerId]
    );
    
    if (usagerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Usager non trouvé'
      });
    }
    const usagerData = usagerResult.rows[0];

    let montantMensuel = frontMontantMensuel || extractMontantDepuisBase(usagerData) || 0;
    let fraisDossier = frontFraisDossier || parseFloat(usagerData.frais_dossier) || 0;
    let montantRetard = frontMontantRetard || parseFloat(usagerData.montant_retard) || 0;
    let isRetard = frontIsRetard !== undefined ? frontIsRetard : (usagerData.is_retard || false);
    let uniter = frontUniter || parseInt(usagerData.uniter) || 1;
    let isRenouvellement = frontIsRenouvellement !== undefined ? frontIsRenouvellement : false;
    let fraisRenouvellement = frontFraisRenouvellement || 0;
    let isRenouvellementFacture = frontIsRenouvellementFacture !== undefined ? frontIsRenouvellementFacture : false;
    let fraisRenouvellementFacture = frontFraisRenouvellementFacture || 0;
    
    let soitTotal = frontSoitTotal || (
      montantMensuel * uniter + 
      fraisDossier + 
      (isRetard ? montantRetard : 0) + 
      (isRenouvellement ? fraisRenouvellement : 0) +
      (isRenouvellementFacture ? fraisRenouvellementFacture : 0)
    );

    const lastRefResult = await client.query(
      `SELECT COALESCE(MAX(ref_omda), 0) as max_ref FROM facture_usager`
    );
    const newRefOmda = (lastRefResult.rows[0].max_ref || 0) + 1;

    const refClientType = getRefClientType(usagerType);

    let nextQuittanceNum;
    if (frontQuittance) {
      nextQuittanceNum = parseInt(String(frontQuittance).replace(/\D/g, ''), 10) || 1;
    } else {
      const dernier = await getLastQuittanceNumber(client);
      nextQuittanceNum = dernier + 1;
    }
    console.log(`📝 Numéro de quittance utilisé: ${nextQuittanceNum}`);

    const factureColumns = await getTableColumns('facture_usager');

    const baseColumns = [
      'ref_omda', 'num_facture', 'num_facture_type', 'ref_client_type',
      'ref_usager', 'type_facture', 'region_usager', 'date_ajout',
      'denomination', 'demandeur', 'telephone', 'email', 'adresse',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_cin_delivree', 'representant_cin_lieu',
      'representant_fonction', 'activite', 'etoiles', 'ravinala',
      'nombre_magasins', 'nombre_vehicules', 'lignes', 'type_bus',
      'trajet', 'horaires', 'zones_desservies', 'jauge_max',
      'frequence', 'canal', 'siege', 'nif', 'stat', 'taux',
      'organisateurs', 'representant_par', 'genre_manifestation',
      'artistes', 'date_evenement', 'lieu_evenement', 'domicile',
      'lieu_ajout', 'date_signature', 'confirmation_nom',
      'personne_recu',
      'moyens_communication', 'a_compter_du', 'echeance',
      'montant_mensuel', 'frais_dossier', 'montant_retard',
      'is_retard', 'soit_total', 'uniter',
      'is_renouvellement', 'frais_renouvellement',
      'is_renouvellement_facture', 'frais_renouvellement_facture',
      'numero_dossier_utilisateur', 'numero_dossier_global',
      'statut', 'created_by', 'mois_facture', 'annee_facture'
    ];

    const existingColumns = baseColumns.filter(col => factureColumns.includes(col));
    const placeholders = existingColumns.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO facture_usager (${existingColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    const valuesMap = {
      ref_omda: newRefOmda,
      num_facture: String(newRefOmda).padStart(4, '0'),
      num_facture_type: 'A',
      ref_client_type: refClientType,
      ref_usager: usagerId,
      type_facture: typeFacture,
      region_usager: regionUsager || usagerData.region || '',
      date_ajout: new Date().toISOString().split('T')[0],
      denomination: usagerData.denomination || usagerData.nom_evenement || usagerData.genre_manifestation || '',
      demandeur: usagerData.demandeur || usagerData.proprietaire_nom || usagerData.organisateurs || '',
      telephone: usagerData.telephone || '',
      email: usagerData.email || '',
      adresse: usagerData.adresse_siege || usagerData.siege || usagerData.adresse || '',
      representant_nom: usagerData.representant_nom || usagerData.representant_par || '',
      representant_adresse: usagerData.representant_adresse || usagerData.proprietaire_adresse || '',
      representant_tel: usagerData.representant_tel || usagerData.proprietaire_tel || '',
      representant_cin: usagerData.representant_cin || usagerData.proprietaire_cin || '',
      representant_cin_delivree: usagerData.representant_cin_delivree || usagerData.proprietaire_cin_delivree || null,
      representant_cin_lieu: usagerData.representant_cin_lieu || usagerData.proprietaire_cin_lieu || '',
      representant_fonction: usagerData.representant_fonction || usagerData.proprietaire_fonction || '',
      activite: usagerData.activite || '',
      etoiles: usagerData.etoiles || '',
      ravinala: usagerData.ravinala || false,
      nombre_magasins: usagerData.nombre_magasins || 0,
      nombre_vehicules: usagerData.nombre_vehicules || 0,
      lignes: usagerData.lignes || '',
      type_bus: usagerData.type_bus || '',
      trajet: usagerData.trajet || '',
      horaires: usagerData.horaires || '',
      zones_desservies: usagerData.zones_desservies || '',
      jauge_max: usagerData.jauge_max || 0,
      frequence: usagerData.frequence || '',
      canal: usagerData.canal || '',
      siege: usagerData.siege || '',
      nif: usagerData.nif || '',
      stat: usagerData.stat || '',
      taux: usagerData.taux || 0,
      organisateurs: usagerData.organisateurs || '',
      representant_par: usagerData.representant_par || '',
      genre_manifestation: usagerData.genre_manifestation || '',
      artistes: usagerData.artistes || '',
      date_evenement: usagerData.date_evenement || null,
      lieu_evenement: usagerData.lieu_evenement || '',
      domicile: usagerData.domicile || usagerData.adresse || '',
      lieu_ajout: usagerData.lieu_ajout || usagerData.lieu_signature || 'Antananarivo',
      date_signature: usagerData.date_signature || null,
      confirmation_nom: usagerData.confirmation_nom || usagerData.demandeur || '',
      personne_recu: personneRecu || '',
      moyens_communication: usagerData.moyens_communication || null,
      a_compter_du: null,
      echeance: null,
      montant_mensuel: montantMensuel,
      frais_dossier: fraisDossier,
      montant_retard: montantRetard,
      is_retard: isRetard,
      soit_total: soitTotal,
      uniter: uniter,
      is_renouvellement: isRenouvellement,
      frais_renouvellement: fraisRenouvellement,
      is_renouvellement_facture: isRenouvellementFacture,
      frais_renouvellement_facture: fraisRenouvellementFacture,
      numero_dossier_utilisateur: usagerData.numero_dossier_utilisateur || '',
      numero_dossier_global: usagerData.numero_dossier_global || '',
      statut: 'validee',
      created_by: userId,
      mois_facture: new Date().getMonth() + 1,
      annee_facture: new Date().getFullYear()
    };

    const values = existingColumns.map(col => valuesMap[col] !== undefined ? valuesMap[col] : null);

    const result = await client.query(query, values);
    const nouvelleFactureId = result.rows[0].id;

    await creerQuittancePourFacture(client, nouvelleFactureId, nextQuittanceNum, userId, personneRecu);
    
    const dafName = await getDAFName();
    
    await client.query('COMMIT');
    
    console.log(`✅ Facture créée: ID=${nouvelleFactureId}, Quittance=${formatQuittance(nextQuittanceNum)}`);

    res.json({
      success: true,
      message: 'Facture créée avec succès',
      factureId: nouvelleFactureId,
      refOmda: newRefOmda,
      numFacture: String(newRefOmda).padStart(4, '0'),
      dafName: dafName,
      quittance: formatQuittance(nextQuittanceNum),
      quittanceNumber: nextQuittanceNum,
      soitTotal: soitTotal
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la facture',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================================
// 2. CRÉER UNE FACTURE AVEC PAIEMENT (Type B et C)
//    ✅ Accepte refOmdaBase du frontend pour Type B
// ============================================================
router.post('/factures/creer-avec-paiement', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('📥 ROUTE /factures/creer-avec-paiement appelée');
    
    const { 
      usagerId, 
      usagerType, 
      userId,
      typeFacture = 'DAFC',
      regionUsager,
      personneRecu,
      montantMensuel: frontMontantMensuel,
      fraisDossier: frontFraisDossier,
      montantRetard: frontMontantRetard,
      isRetard: frontIsRetard,
      uniter: frontUniter,
      soitTotal: frontSoitTotal,
      mois,
      annee,
      datePaiement,
      numFactureType = 'B',
      suffixe,
      descriptionPersonnalisee,
      quittance: frontQuittance,
      quittanceValidee: frontQuittanceValidee,
      refOmdaBase: frontRefOmdaBase,
      isRenouvellement: frontIsRenouvellement,
      fraisRenouvellement: frontFraisRenouvellement,
      isRenouvellementFacture: frontIsRenouvellementFacture,
      fraisRenouvellementFacture: frontFraisRenouvellementFacture
    } = req.body;

    if (!usagerId || !usagerType || !userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: usagerId, usagerType et userId sont requis'
      });
    }

    const tableName = getTableName(usagerType);
    if (!tableName) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Type d'usager non reconnu: ${usagerType}`
      });
    }

    const usagerResult = await client.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [usagerId]
    );
    
    if (usagerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Usager non trouvé'
      });
    }
    const usagerData = usagerResult.rows[0];

    let otherLignes = [];
    if (usagerType === 'other') {
      otherLignes = await getOtherLignes(usagerId, client);
    }

    let montantMensuel = frontMontantMensuel || extractMontantDepuisBase(usagerData) || 0;
    let fraisDossier = frontFraisDossier || parseFloat(usagerData.frais_dossier) || 0;
    let montantRetard = frontMontantRetard || parseFloat(usagerData.montant_retard) || 0;
    let isRetard = frontIsRetard !== undefined ? frontIsRetard : (usagerData.is_retard || false);
    let uniter = frontUniter || parseInt(usagerData.uniter) || 1;
    let isRenouvellement = frontIsRenouvellement !== undefined ? frontIsRenouvellement : false;
    let fraisRenouvellement = frontFraisRenouvellement || 0;
    let isRenouvellementFacture = frontIsRenouvellementFacture !== undefined ? frontIsRenouvellementFacture : false;
    let fraisRenouvellementFacture = frontFraisRenouvellementFacture || 0;
    
    let soitTotal = frontSoitTotal || (
      montantMensuel * uniter + 
      fraisDossier + 
      (isRetard ? montantRetard : 0) + 
      (isRenouvellement ? fraisRenouvellement : 0) +
      (isRenouvellementFacture ? fraisRenouvellementFacture : 0)
    );

    // ✅ Utiliser refOmdaBase si fourni (Type B)
    let newRefOmda;
    if (frontRefOmdaBase !== undefined && frontRefOmdaBase !== null && !isNaN(parseInt(frontRefOmdaBase))) {
      newRefOmda = parseInt(frontRefOmdaBase, 10);
      console.log(`📌 refOmdaBase fourni: ${newRefOmda}`);
    } else {
      const lastRefResult = await client.query(
        `SELECT COALESCE(MAX(ref_omda), 0) as max_ref FROM facture_usager`
      );
      newRefOmda = (lastRefResult.rows[0].max_ref || 0) + 1;
      console.log(`📌 refOmdaBase calculé: ${newRefOmda}`);
    }

    const refClientType = getRefClientType(usagerType);

    let nextQuittanceNum;
    if (frontQuittance) {
      nextQuittanceNum = parseInt(String(frontQuittance).replace(/\D/g, ''), 10) || 1;
    } else {
      const dernier = await getLastQuittanceNumber(client);
      nextQuittanceNum = dernier + 1;
    }
    console.log(`📝 Quittance pour facture ${numFactureType}: ${nextQuittanceNum}`);

    let numFactureDisplay = String(newRefOmda).padStart(4, '0');
    if (suffixe) {
      numFactureDisplay = `${numFactureDisplay}-${suffixe}`;
    }

    const factureColumns = await getTableColumns('facture_usager');
    
    const baseColumns = [
      'ref_omda', 'num_facture', 'num_facture_type', 'ref_client_type',
      'ref_usager', 'type_facture', 'region_usager', 'date_ajout',
      'denomination', 'demandeur', 'telephone', 'email', 'adresse',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_cin_delivree', 'representant_cin_lieu',
      'representant_fonction', 'activite', 'etoiles', 'ravinala',
      'nombre_magasins', 'nombre_vehicules', 'lignes', 'type_bus',
      'trajet', 'horaires', 'zones_desservies', 'jauge_max',
      'frequence', 'canal', 'siege', 'nif', 'stat', 'taux',
      'organisateurs', 'representant_par', 'genre_manifestation',
      'artistes', 'date_evenement', 'lieu_evenement', 'domicile',
      'lieu_ajout', 'date_signature', 'confirmation_nom',
      'personne_recu',
      'moyens_communication', 'a_compter_du', 'echeance',
      'montant_mensuel', 'frais_dossier', 'montant_retard',
      'is_retard', 'soit_total', 'uniter',
      'is_renouvellement', 'frais_renouvellement',
      'is_renouvellement_facture', 'frais_renouvellement_facture',
      'numero_dossier_utilisateur', 'numero_dossier_global',
      'statut', 'created_by', 'mois_facture', 'annee_facture'
    ];

    const optionalColumns = ['suffixe', 'description_personnalisee'];
    const allColumns = [...baseColumns];
    optionalColumns.forEach(col => {
      if (factureColumns.includes(col)) {
        allColumns.push(col);
      }
    });

    const placeholders = allColumns.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO facture_usager (${allColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    let descPersoFinale = descriptionPersonnalisee || null;
    if (usagerType === 'other' && otherLignes.length > 0 && !descPersoFinale) {
      descPersoFinale = otherLignes.map(l =>
        `${l.description} (U:${l.uniter} × ${parseFloat(l.pu).toLocaleString()} Ar = ${parseFloat(l.montant).toLocaleString()} Ar)`
      ).join('\n');
    }

    const valuesMap = {
      ref_omda: newRefOmda,
      num_facture: numFactureDisplay,
      num_facture_type: numFactureType,
      ref_client_type: refClientType,
      ref_usager: usagerId,
      type_facture: typeFacture,
      region_usager: regionUsager || usagerData.region || '',
      date_ajout: new Date().toISOString().split('T')[0],
      denomination: usagerData.denomination || usagerData.nom_evenement || usagerData.genre_manifestation || '',
      demandeur: usagerData.demandeur || usagerData.proprietaire_nom || usagerData.organisateurs || '',
      telephone: usagerData.telephone || '',
      email: usagerData.email || '',
      adresse: usagerData.adresse_siege || usagerData.siege || usagerData.adresse || '',
      representant_nom: usagerData.representant_nom || usagerData.representant_par || '',
      representant_adresse: usagerData.representant_adresse || usagerData.proprietaire_adresse || '',
      representant_tel: usagerData.representant_tel || usagerData.proprietaire_tel || '',
      representant_cin: usagerData.representant_cin || usagerData.proprietaire_cin || '',
      representant_cin_delivree: usagerData.representant_cin_delivree || usagerData.proprietaire_cin_delivree || null,
      representant_cin_lieu: usagerData.representant_cin_lieu || usagerData.proprietaire_cin_lieu || '',
      representant_fonction: usagerData.representant_fonction || usagerData.proprietaire_fonction || '',
      activite: usagerData.activite || '',
      etoiles: usagerData.etoiles || '',
      ravinala: usagerData.ravinala || false,
      nombre_magasins: usagerData.nombre_magasins || 0,
      nombre_vehicules: usagerData.nombre_vehicules || 0,
      lignes: usagerData.lignes || '',
      type_bus: usagerData.type_bus || '',
      trajet: usagerData.trajet || '',
      horaires: usagerData.horaires || '',
      zones_desservies: usagerData.zones_desservies || '',
      jauge_max: usagerData.jauge_max || 0,
      frequence: usagerData.frequence || '',
      canal: usagerData.canal || '',
      siege: usagerData.siege || '',
      nif: usagerData.nif || '',
      stat: usagerData.stat || '',
      taux: usagerData.taux || 0,
      organisateurs: usagerData.organisateurs || '',
      representant_par: usagerData.representant_par || '',
      genre_manifestation: usagerData.genre_manifestation || '',
      artistes: usagerData.artistes || '',
      date_evenement: usagerData.date_evenement || null,
      lieu_evenement: usagerData.lieu_evenement || '',
      domicile: usagerData.domicile || usagerData.adresse || '',
      lieu_ajout: usagerData.lieu_ajout || usagerData.lieu_signature || 'Antananarivo',
      date_signature: usagerData.date_signature || null,
      confirmation_nom: usagerData.confirmation_nom || usagerData.demandeur || '',
      personne_recu: personneRecu || '',
      moyens_communication: usagerData.moyens_communication || null,
      a_compter_du: datePaiement || new Date().toISOString().split('T')[0],
      echeance: null,
      montant_mensuel: montantMensuel,
      frais_dossier: fraisDossier,
      montant_retard: montantRetard,
      is_retard: isRetard,
      soit_total: soitTotal,
      uniter: uniter,
      is_renouvellement: isRenouvellement,
      frais_renouvellement: fraisRenouvellement,
      is_renouvellement_facture: isRenouvellementFacture,
      frais_renouvellement_facture: fraisRenouvellementFacture,
      numero_dossier_utilisateur: usagerData.numero_dossier_utilisateur || '',
      numero_dossier_global: usagerData.numero_dossier_global || '',
      statut: 'validee',
      created_by: userId,
      mois_facture: mois || new Date().getMonth() + 1,
      annee_facture: annee || new Date().getFullYear(),
      suffixe: suffixe || '',
      description_personnalisee: descPersoFinale
    };

    const values = allColumns.map(col => valuesMap[col] !== undefined ? valuesMap[col] : null);

    const result = await client.query(query, values);
    const nouvelleFactureId = result.rows[0].id;

    await creerQuittancePourFacture(client, nouvelleFactureId, nextQuittanceNum, userId, personneRecu);
    
    const dafName = await getDAFName();
    
    await client.query('COMMIT');
    
    console.log(`✅ Facture ${numFactureType} créée: ID=${nouvelleFactureId}, N°=${numFactureDisplay}`);

    res.json({
      success: true,
      message: 'Facture avec paiement créée avec succès',
      factureId: nouvelleFactureId,
      refOmda: newRefOmda,
      numFacture: numFactureDisplay,
      dafName: dafName,
      quittance: formatQuittance(nextQuittanceNum),
      quittanceNumber: nextQuittanceNum,
      mois: mois,
      annee: annee,
      soitTotal: soitTotal,
      lignes: otherLignes
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création facture avec paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la facture avec paiement',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================================
// 3. CRÉER UNE FACTURE GROUPÉE (Type A groupé)
// ============================================================
router.post('/factures/creer-avec-paiement-groupe', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('📥 ROUTE /factures/creer-avec-paiement-groupe appelée');
    
    const { 
      usagerId, 
      usagerType, 
      userId,
      typeFacture = 'DAFC',
      regionUsager,
      personneRecu,
      montantMensuel: frontMontantMensuel,
      fraisDossier: frontFraisDossier,
      montantRetard: frontMontantRetard,
      isRetard: frontIsRetard,
      uniter: frontUniter,
      soitTotal: frontSoitTotal,
      mois: moisGroupes,
      annee,
      datePaiement,
      numFactureType = 'A',
      typeGroupe,
      descriptionPersonnalisee,
      quittance: frontQuittance,
      quittanceValidee: frontQuittanceValidee,
      isRenouvellement: frontIsRenouvellement,
      fraisRenouvellement: frontFraisRenouvellement,
      isRenouvellementFacture: frontIsRenouvellementFacture,
      fraisRenouvellementFacture: frontFraisRenouvellementFacture
    } = req.body;

    if (!usagerId || !usagerType || !userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: usagerId, usagerType et userId sont requis'
      });
    }

    const tableName = getTableName(usagerType);
    if (!tableName) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Type d'usager non reconnu: ${usagerType}`
      });
    }

    const usagerResult = await client.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [usagerId]
    );
    
    if (usagerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Usager non trouvé'
      });
    }
    const usagerData = usagerResult.rows[0];

    let otherLignes = [];
    if (usagerType === 'other') {
      otherLignes = await getOtherLignes(usagerId, client);
    }

    let montantMensuel = frontMontantMensuel || extractMontantDepuisBase(usagerData) || 0;
    let fraisDossier = frontFraisDossier || parseFloat(usagerData.frais_dossier) || 0;
    let montantRetard = frontMontantRetard || parseFloat(usagerData.montant_retard) || 0;
    let isRetard = frontIsRetard !== undefined ? frontIsRetard : (usagerData.is_retard || false);
    let uniter = frontUniter || parseInt(usagerData.uniter) || 1;
    let isRenouvellement = frontIsRenouvellement !== undefined ? frontIsRenouvellement : false;
    let fraisRenouvellement = frontFraisRenouvellement || 0;
    let isRenouvellementFacture = frontIsRenouvellementFacture !== undefined ? frontIsRenouvellementFacture : false;
    let fraisRenouvellementFacture = frontFraisRenouvellementFacture || 0;
    const nbMois = moisGroupes ? moisGroupes.length : 1;
    
    let soitTotal = frontSoitTotal || (
      montantMensuel * uniter * nbMois + 
      fraisDossier + 
      (isRetard ? montantRetard : 0) + 
      (isRenouvellement ? fraisRenouvellement : 0) +
      (isRenouvellementFacture ? fraisRenouvellementFacture : 0)
    );

    const lastRefResult = await client.query(
      `SELECT COALESCE(MAX(ref_omda), 0) as max_ref FROM facture_usager`
    );
    const newRefOmda = (lastRefResult.rows[0].max_ref || 0) + 1;

    const refClientType = getRefClientType(usagerType);

    let nextQuittanceNum;
    if (frontQuittance) {
      nextQuittanceNum = parseInt(String(frontQuittance).replace(/\D/g, ''), 10) || 1;
    } else {
      const dernier = await getLastQuittanceNumber(client);
      nextQuittanceNum = dernier + 1;
    }
    console.log(`📝 Quittance pour facture groupée: ${nextQuittanceNum}`);

    const moisGroupesStr = moisGroupes ? moisGroupes.join(',') : null;
    const premierMois = moisGroupes && moisGroupes.length > 0 ? moisGroupes[0] : 1;

    const factureColumns = await getTableColumns('facture_usager');
    
    const baseColumns = [
      'ref_omda', 'num_facture', 'num_facture_type', 'ref_client_type',
      'ref_usager', 'type_facture', 'region_usager', 'date_ajout',
      'denomination', 'demandeur', 'telephone', 'email', 'adresse',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_cin_delivree', 'representant_cin_lieu',
      'representant_fonction', 'activite', 'etoiles', 'ravinala',
      'nombre_magasins', 'nombre_vehicules', 'lignes', 'type_bus',
      'trajet', 'horaires', 'zones_desservies', 'jauge_max',
      'frequence', 'canal', 'siege', 'nif', 'stat', 'taux',
      'organisateurs', 'representant_par', 'genre_manifestation',
      'artistes', 'date_evenement', 'lieu_evenement', 'domicile',
      'lieu_ajout', 'date_signature', 'confirmation_nom',
      'personne_recu',
      'moyens_communication', 'a_compter_du', 'echeance',
      'montant_mensuel', 'frais_dossier', 'montant_retard',
      'is_retard', 'soit_total', 'uniter',
      'is_renouvellement', 'frais_renouvellement',
      'is_renouvellement_facture', 'frais_renouvellement_facture',
      'numero_dossier_utilisateur', 'numero_dossier_global',
      'statut', 'created_by', 'annee_facture', 'mois_facture'
    ];

    const optionalColumns = ['mois_groupes', 'type_groupe', 'description_personnalisee'];
    const allColumns = [...baseColumns];
    optionalColumns.forEach(col => {
      if (factureColumns.includes(col)) {
        allColumns.push(col);
      }
    });

    const placeholders = allColumns.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO facture_usager (${allColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    let descPersoFinale = descriptionPersonnalisee || null;
    if (usagerType === 'other' && otherLignes.length > 0 && !descPersoFinale) {
      descPersoFinale = otherLignes.map(l =>
        `${l.description} (U:${l.uniter} × ${parseFloat(l.pu).toLocaleString()} Ar = ${parseFloat(l.montant).toLocaleString()} Ar)`
      ).join('\n');
    }

    const valuesMap = {
      ref_omda: newRefOmda,
      num_facture: String(newRefOmda).padStart(4, '0'),
      num_facture_type: numFactureType,
      ref_client_type: refClientType,
      ref_usager: usagerId,
      type_facture: typeFacture,
      region_usager: regionUsager || usagerData.region || '',
      date_ajout: new Date().toISOString().split('T')[0],
      denomination: usagerData.denomination || usagerData.nom_evenement || usagerData.genre_manifestation || '',
      demandeur: usagerData.demandeur || usagerData.proprietaire_nom || usagerData.organisateurs || '',
      telephone: usagerData.telephone || '',
      email: usagerData.email || '',
      adresse: usagerData.adresse_siege || usagerData.siege || usagerData.adresse || '',
      representant_nom: usagerData.representant_nom || usagerData.representant_par || '',
      representant_adresse: usagerData.representant_adresse || usagerData.proprietaire_adresse || '',
      representant_tel: usagerData.representant_tel || usagerData.proprietaire_tel || '',
      representant_cin: usagerData.representant_cin || usagerData.proprietaire_cin || '',
      representant_cin_delivree: usagerData.representant_cin_delivree || usagerData.proprietaire_cin_delivree || null,
      representant_cin_lieu: usagerData.representant_cin_lieu || usagerData.proprietaire_cin_lieu || '',
      representant_fonction: usagerData.representant_fonction || usagerData.proprietaire_fonction || '',
      activite: usagerData.activite || '',
      etoiles: usagerData.etoiles || '',
      ravinala: usagerData.ravinala || false,
      nombre_magasins: usagerData.nombre_magasins || 0,
      nombre_vehicules: usagerData.nombre_vehicules || 0,
      lignes: usagerData.lignes || '',
      type_bus: usagerData.type_bus || '',
      trajet: usagerData.trajet || '',
      horaires: usagerData.horaires || '',
      zones_desservies: usagerData.zones_desservies || '',
      jauge_max: usagerData.jauge_max || 0,
      frequence: usagerData.frequence || '',
      canal: usagerData.canal || '',
      siege: usagerData.siege || '',
      nif: usagerData.nif || '',
      stat: usagerData.stat || '',
      taux: usagerData.taux || 0,
      organisateurs: usagerData.organisateurs || '',
      representant_par: usagerData.representant_par || '',
      genre_manifestation: usagerData.genre_manifestation || '',
      artistes: usagerData.artistes || '',
      date_evenement: usagerData.date_evenement || null,
      lieu_evenement: usagerData.lieu_evenement || '',
      domicile: usagerData.domicile || usagerData.adresse || '',
      lieu_ajout: usagerData.lieu_ajout || usagerData.lieu_signature || 'Antananarivo',
      date_signature: usagerData.date_signature || null,
      confirmation_nom: usagerData.confirmation_nom || usagerData.demandeur || '',
      personne_recu: personneRecu || '',
      moyens_communication: usagerData.moyens_communication || null,
      a_compter_du: datePaiement || new Date().toISOString().split('T')[0],
      echeance: null,
      montant_mensuel: montantMensuel,
      frais_dossier: fraisDossier,
      montant_retard: montantRetard,
      is_retard: isRetard,
      soit_total: soitTotal,
      uniter: uniter,
      is_renouvellement: isRenouvellement,
      frais_renouvellement: fraisRenouvellement,
      is_renouvellement_facture: isRenouvellementFacture,
      frais_renouvellement_facture: fraisRenouvellementFacture,
      numero_dossier_utilisateur: usagerData.numero_dossier_utilisateur || '',
      numero_dossier_global: usagerData.numero_dossier_global || '',
      statut: 'validee',
      created_by: userId,
      annee_facture: annee || new Date().getFullYear(),
      mois_facture: premierMois,
      mois_groupes: moisGroupesStr,
      type_groupe: typeGroupe || 'A',
      description_personnalisee: descPersoFinale
    };

    const values = allColumns.map(col => valuesMap[col] !== undefined ? valuesMap[col] : null);

    const result = await client.query(query, values);
    const nouvelleFactureId = result.rows[0].id;

    await creerQuittancePourFacture(client, nouvelleFactureId, nextQuittanceNum, userId, personneRecu);
    
    const dafName = await getDAFName();
    
    await client.query('COMMIT');
    
    console.log(`✅ Facture groupée créée: ID=${nouvelleFactureId}`);

    res.json({
      success: true,
      message: 'Facture groupée créée avec succès',
      factureId: nouvelleFactureId,
      refOmda: newRefOmda,
      numFacture: String(newRefOmda).padStart(4, '0'),
      dafName: dafName,
      quittance: formatQuittance(nextQuittanceNum),
      quittanceNumber: nextQuittanceNum,
      moisGroupes: moisGroupes,
      soitTotal: soitTotal,
      lignes: otherLignes
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création facture groupée:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la facture groupée',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// ============================================================
// 4. RÉCUPÉRER LE DERNIER ref_omda (pour Type B)
// ============================================================
router.get('/factures/last-ref-omda', async (req, res) => {
  try {
    const lastRef = await getLastRefOmda();
    res.json({
      success: true,
      lastRefOmda: lastRef,
      nextRefOmda: lastRef + 1,
      nextRefOmdaFormate: String(lastRef + 1).padStart(4, '0')
    });
  } catch (error) {
    console.error('❌ Erreur récupération dernier ref_omda:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 5. RÉCUPÉRER LE NOM DU DAF
// ============================================================
router.get('/daf/name', async (req, res) => {
  try {
    const dafName = await getDAFName();
    res.json({ success: true, dafName: dafName });
  } catch (error) {
    console.error('❌ Erreur récupération DAF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 6. RÉCUPÉRER UNE FACTURE PAR ID
// ============================================================
router.get('/factures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM facture_usager WHERE id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }
    
    const facture = result.rows[0];
    
    if (facture.ref_client_type === 'OTH') {
      facture.lignes_other = await getOtherLignes(facture.ref_usager);
    }
    
    try {
      const quittanceResult = await pool.query(`
        SELECT num_quitance, num_quitance_formate, quittance_validee, personne_recu
        FROM quitance_usager WHERE id_facture = $1
      `, [id]);
      
      if (quittanceResult.rows.length > 0) {
        facture.quittance = quittanceResult.rows[0].num_quitance_formate;
        facture.quittance_validee = quittanceResult.rows[0].quittance_validee;
        if (!facture.personne_recu) {
          facture.personne_recu = quittanceResult.rows[0].personne_recu;
        }
      }
    } catch (e) {
      console.warn('⚠️ Erreur chargement quittance:', e.message);
    }
    
    const dafName = await getDAFName();
    facture.daf_nom = dafName;
    
    res.json({ success: true, facture: facture });
  } catch (error) {
    console.error('❌ Erreur récupération facture:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 7. RÉCUPÉRER TOUTES LES FACTURES
// ============================================================
router.get('/factures', async (req, res) => {
  try {
    console.log('📄 Récupération de toutes les factures...');
    
    const result = await pool.query(`
      SELECT 
        f.id, f.ref_omda, f.num_facture, f.num_facture_type,
        f.ref_client_type, f.ref_usager, f.type_facture,
        f.region_usager, f.date_ajout, f.denomination,
        f.demandeur, f.telephone, f.montant_mensuel,
        f.frais_dossier, f.montant_retard, f.is_retard,
        f.soit_total, f.uniter, f.statut, f.personne_recu,
        f.is_renouvellement, f.frais_renouvellement,
        f.is_renouvellement_facture, f.frais_renouvellement_facture,
        f.mois_facture, f.annee_facture, f.mois_groupes, f.type_groupe,
        f.suffixe, f.description_personnalisee,
        f.created_at, f.created_by,
        q.num_quitance, q.num_quitance_formate, q.quittance_validee
      FROM facture_usager f
      LEFT JOIN quitance_usager q ON q.id_facture = f.id
      ORDER BY f.created_at DESC
    `);
    
    const dafName = await getDAFName();
    const factures = result.rows.map(f => ({
      ...f,
      daf_nom: dafName,
      quittance: f.num_quitance_formate || ''
    }));
    
    res.json({
      success: true,
      factures: factures,
      total: factures.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération factures:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      factures: []
    });
  }
});

// ============================================================
// 8. METTRE À JOUR UNE FACTURE
// ============================================================
router.put('/factures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'type_facture', 'personne_recu',
      'denomination', 'demandeur', 'telephone', 'email', 'adresse',
      'region_usager',
      'representant_nom', 'representant_adresse', 'representant_tel',
      'representant_cin', 'representant_cin_delivree', 'representant_cin_lieu',
      'representant_fonction',
      'activite', 'etoiles', 'ravinala',
      'nombre_magasins', 'nombre_vehicules', 'lignes', 'type_bus',
      'trajet', 'horaires', 'zones_desservies', 'jauge_max',
      'frequence', 'canal', 'siege', 'nif', 'stat', 'taux',
      'organisateurs', 'representant_par', 'genre_manifestation',
      'artistes', 'date_evenement', 'lieu_evenement', 'domicile',
      'lieu_ajout', 'date_signature', 'confirmation_nom',
      'moyens_communication', 'a_compter_du', 'echeance',
      'montant_mensuel', 'frais_dossier', 'montant_retard',
      'is_retard', 'soit_total', 'uniter',
      'description_personnalisee', 'suffixe',
      'is_renouvellement', 'frais_renouvellement',
      'is_renouvellement_facture', 'frais_renouvellement_facture'
    ];
    
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    
    if (filteredUpdates.montant_mensuel !== undefined || 
        filteredUpdates.frais_dossier !== undefined || 
        filteredUpdates.uniter !== undefined ||
        filteredUpdates.is_renouvellement !== undefined ||
        filteredUpdates.frais_renouvellement !== undefined ||
        filteredUpdates.is_renouvellement_facture !== undefined ||
        filteredUpdates.frais_renouvellement_facture !== undefined) {
      
      const currentResult = await pool.query(
        `SELECT montant_mensuel, frais_dossier, montant_retard, is_retard, uniter, 
                is_renouvellement, frais_renouvellement,
                is_renouvellement_facture, frais_renouvellement_facture
         FROM facture_usager WHERE id = $1`,
        [id]
      );
      
      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        const montantMensuel = filteredUpdates.montant_mensuel !== undefined ? filteredUpdates.montant_mensuel : current.montant_mensuel;
        const fraisDossier = filteredUpdates.frais_dossier !== undefined ? filteredUpdates.frais_dossier : current.frais_dossier;
        const montantRetard = filteredUpdates.montant_retard !== undefined ? filteredUpdates.montant_retard : current.montant_retard;
        const isRetard = filteredUpdates.is_retard !== undefined ? filteredUpdates.is_retard : current.is_retard;
        const uniter = filteredUpdates.uniter !== undefined ? filteredUpdates.uniter : current.uniter;
        const isRenouvellement = filteredUpdates.is_renouvellement !== undefined ? filteredUpdates.is_renouvellement : current.is_renouvellement;
        const fraisRenouvellement = filteredUpdates.frais_renouvellement !== undefined ? filteredUpdates.frais_renouvellement : current.frais_renouvellement;
        const isRenouvellementFacture = filteredUpdates.is_renouvellement_facture !== undefined ? filteredUpdates.is_renouvellement_facture : current.is_renouvellement_facture;
        const fraisRenouvellementFacture = filteredUpdates.frais_renouvellement_facture !== undefined ? filteredUpdates.frais_renouvellement_facture : current.frais_renouvellement_facture;
        
        const baseTotal = (parseFloat(montantMensuel) || 0) * (parseInt(uniter) || 1);
        let total = baseTotal + (parseFloat(fraisDossier) || 0) + (isRetard ? (parseFloat(montantRetard) || 0) : 0);
        if (isRenouvellement && fraisRenouvellement > 0) {
          total += parseFloat(fraisRenouvellement) || 0;
        }
        if (isRenouvellementFacture && fraisRenouvellementFacture > 0) {
          total += parseFloat(fraisRenouvellementFacture) || 0;
        }
        filteredUpdates.soit_total = total;
      }
    }
    
    const keys = Object.keys(filteredUpdates);
    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await pool.query(
      `UPDATE facture_usager 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }
    
    const facture = result.rows[0];
    
    if (facture.ref_client_type === 'OTH') {
      facture.lignes_other = await getOtherLignes(facture.ref_usager);
    }
    
    const dafName = await getDAFName();
    facture.daf_nom = dafName;
    
    res.json({
      success: true,
      message: 'Facture mise à jour avec succès',
      facture: facture
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour facture:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 9. VALIDER UNE FACTURE
// ============================================================
router.patch('/factures/:id/valider', async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    
    const result = await pool.query(
      `UPDATE facture_usager 
       SET statut = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2
       RETURNING *`,
      [statut || 'validee', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }
    
    const dafName = await getDAFName();
    result.rows[0].daf_nom = dafName;
    
    res.json({
      success: true,
      message: 'Statut de la facture mis à jour',
      facture: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erreur validation facture:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 10. SUPPRIMER UNE FACTURE
// ============================================================
router.delete('/factures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM facture_usager WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture non trouvée' });
    }
    
    res.json({ success: true, message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression facture:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 11. GET - Récupérer les usagers par type
// ============================================================
router.get('/factures/type/:type', async (req, res) => {
  const { type } = req.params;
  console.log(`📊 Récupération des usagers pour le type: ${type}`);
  
  try {
    const typeMapping = {
      'hotel': 'usagers_hotel',
      'grand-surface': 'usagers_magasin',
      'media': 'usagers_media',
      'bus': 'usagers_bus',
      'nightclub': 'usagers_nightclub',
      'occ': 'usagers_occasionnel',
      'other': 'usager_other'
    };
    
    const tableName = typeMapping[type];
    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: `Type d'usager non reconnu: ${type}`
      });
    }
    
    const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
    
    const usagers = await Promise.all(result.rows.map(async (usager) => {
      const factureResult = await pool.query(`
        SELECT f.*, q.num_quitance_formate as quittance_formate
        FROM facture_usager f
        LEFT JOIN quitance_usager q ON q.id_facture = f.id
        WHERE f.ref_usager = $1 AND f.ref_client_type = $2
        ORDER BY f.created_at DESC LIMIT 1
      `, [usager.id, getRefClientType(type)]);
      
      const facture = factureResult.rows[0] || {};
      
      let lignes_other = [];
      if (type === 'other') {
        lignes_other = await getOtherLignes(usager.id);
      }
      
      let artistes_detail = [];
      if (type === 'occ' && usager.id) {
        try {
          const artistesResult = await pool.query(`
            SELECT a.id, a.nom, a.prenom, a.role
            FROM event_artistes ea
            JOIN artistes a ON ea.artiste_id = a.id
            WHERE ea.event_id = $1
            ORDER BY a.id
          `, [usager.id]);
          artistes_detail = artistesResult.rows;
        } catch (err) {
          console.error('❌ Erreur récupération artistes OCC:', err);
        }
      }
      
      return {
        ...usager,
        ...facture,
        id: usager.id,
        type_usager: type,
        artistes_detail: artistes_detail,
        lignes_other: lignes_other,
        quittance: facture.quittance_formate || null,
        soit_total: facture.soit_total || usager.montant || usager.montant_mensuel || 0,
        region_usager: facture.region_usager || usager.region || '',
        numero_dossier_utilisateur: usager.numero_dossier_utilisateur || facture.numero_dossier_utilisateur || '',
        date_ajout: usager.created_at || usager.date_ajout || facture.date_ajout || null,
        created_at: usager.created_at || facture.created_at || new Date().toISOString(),
        personne_recu: facture.personne_recu || '',
        frais_dossier: usager.frais_dossier || facture.frais_dossier || 0,
        montant_mensuel: usager.montant_mensuel || facture.montant_mensuel || 0,
        uniter: usager.uniter || facture.uniter || 1
      };
    }));
    
    console.log(`✅ ${usagers.length} usagers récupérés pour le type ${type}`);
    
    res.json({
      success: true,
      usagers: usagers,
      total: usagers.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération usagers par type:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      usagers: []
    });
  }
});

module.exports = router;