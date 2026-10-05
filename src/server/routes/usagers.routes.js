// server/routes/usagers.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// ✅ UTILITAIRES
// ============================================================
const toNumber = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const cleaned = typeof v === 'string' ? v.replace(/\s/g, '') : v;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const toDate = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return v;
};

const normalizeStr = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const toId = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

// ============================================================
// ✅ HELPER : Résoudre region_id / ville_id depuis texte
// ============================================================
const resolveLocalisation = async (data) => {
  const loc = {
    region_id: toId(data.region_id || data.regionId),
    ville_id: toId(data.ville_id || data.villeId),
    quartier_id: toId(data.quartier_id || data.quartierId),
    numero_localite: data.numero_localite || data.numeroLocalite || null,
  };

  // Si pas de region_id mais region (texte) fourni → chercher l'ID
  if (!loc.region_id && data.region) {
    try {
      const r = await pool.query(
        'SELECT id FROM regions WHERE LOWER(nom) = LOWER($1)',
        [data.region]
      );
      if (r.rows.length > 0) loc.region_id = r.rows[0].id;
    } catch (e) { /* ignore */ }
  }

  // Si pas de ville_id mais ville (texte) fourni → chercher l'ID
  if (!loc.ville_id && data.ville && loc.region_id) {
    try {
      const v = await pool.query(
        'SELECT id FROM villes WHERE region_id = $1 AND LOWER(nom) = LOWER($2)',
        [loc.region_id, data.ville]
      );
      if (v.rows.length > 0) loc.ville_id = v.rows[0].id;
    } catch (e) { /* ignore */ }
  }

  return loc;
};

// ============================================================
// GET - Paiements par type d'usager
//    ✅ Filtres : ?region_id=...&ville_id=...&quartier_id=...
//    ✅ Fallback texte : ?region=...&ville=...
//    ✅ JOIN pour récupérer region_nom, ville_nom, quartier_nom
// ============================================================
router.get('/usagers/paiements/:type', async (req, res) => {
  const { type } = req.params;
  const { region, ville, region_id, ville_id, quartier_id } = req.query;

  console.log(`📊 Récupération usagers pour ${type}...`);
  if (region_id) console.log(`   📍 region_id : ${region_id}`);
  if (ville_id) console.log(`   🏙️  ville_id : ${ville_id}`);
  if (quartier_id) console.log(`   🏘️  quartier_id : ${quartier_id}`);
  if (region) console.log(`   📍 region (texte) : ${region}`);
  if (ville) console.log(`   🏙️  ville (texte) : ${ville}`);

  const typeMapping = {
    'hotel': 'usagers_hotel',
    'grand-surface': 'usagers_magasin',
    'media': 'usagers_media',
    'occ': 'usagers_occasionnel',
    'bus': 'usagers_bus',
    'nightclub': 'usagers_nightclub'
  };
  const tableName = typeMapping[type];
  if (!tableName) return res.status(400).json({ success: false, message: 'Type invalide' });

  try {
    let sqlQuery = `
      SELECT 
        u.*,
        r.nom AS region_nom,
        v.nom AS ville_nom,
        v.quartier AS quartier_nom,
        v.telephone AS ville_telephone
      FROM ${tableName} u
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN villes v ON u.ville_id = v.id
    `;
    const sqlParams = [];
    const conditions = [];

    // ✅ Filtre région : ID prioritaire, sinon texte
    if (region_id) {
      sqlParams.push(toId(region_id));
      conditions.push(`u.region_id = $${sqlParams.length}`);
    } else if (region) {
      sqlParams.push(region);
      conditions.push(`LOWER(u.region) = LOWER($${sqlParams.length})`);
    }

    // ✅ Filtre ville : ID prioritaire, sinon texte
    if (ville_id) {
      sqlParams.push(toId(ville_id));
      conditions.push(`u.ville_id = $${sqlParams.length}`);
    } else if (ville) {
      sqlParams.push(`%${ville.toLowerCase()}%`);
      const idx = sqlParams.length;
      conditions.push(`(
        LOWER(COALESCE(u.adresse_siege, '')) LIKE $${idx}
        OR LOWER(COALESCE(u.adresse, '')) LIKE $${idx}
        OR LOWER(COALESCE(u.lieu_evenement, '')) LIKE $${idx}
        OR LOWER(COALESCE(u.siege, '')) LIKE $${idx}
        OR LOWER(COALESCE(u.domicile, '')) LIKE $${idx}
      )`);
    }

    // ✅ Filtre quartier
    if (quartier_id) {
      sqlParams.push(toId(quartier_id));
      conditions.push(`u.quartier_id = $${sqlParams.length}`);
    }

    if (conditions.length > 0) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }

    sqlQuery += ' ORDER BY u.id';

    console.log(`📝 SQL : ${sqlQuery}`);
    console.log(`📝 Params :`, sqlParams);

    const usagers = await pool.query(sqlQuery, sqlParams);
    console.log(`✅ ${usagers.rows.length} usagers trouvés dans ${tableName}`);

    const result = [];
    const currentYear = new Date().getFullYear();

    for (const usager of usagers.rows) {
      const montantMensuel = parseFloat(usager.montant_mensuel) || 0;
      let moisCreation = 1, anneeCreation = currentYear;
      if (usager.created_at) {
        const creationDate = new Date(usager.created_at);
        moisCreation = creationDate.getMonth() + 1;
        anneeCreation = creationDate.getFullYear();
      }

      const paiements = await pool.query(
        `SELECT mois, annee FROM paiements 
         WHERE usager_id = $1 AND usager_type = $2 
         AND type_paiement = 'mensuel' AND statut = 'paye'
         ORDER BY annee, mois`,
        [usager.id, type]
      );

      const moisPayesParAnnee = {}, anneesPayes = {};
      for (const p of paiements.rows) {
        const annee = p.annee, mois = p.mois;
        if (!anneesPayes[annee]) anneesPayes[annee] = [];
        if (!moisPayesParAnnee[annee]) moisPayesParAnnee[annee] = [];
        anneesPayes[annee].push(mois);
        moisPayesParAnnee[annee].push(mois);
      }

      const resumeAnnees = [];
      for (let annee = currentYear - 1; annee <= currentYear + 1; annee++) {
        const moisPayes = anneesPayes[annee] || [];
        const nbMois = moisPayes.length;
        let moisDebutAnnee = 1;
        if (annee === anneeCreation) moisDebutAnnee = moisCreation;
        else if (annee > anneeCreation) moisDebutAnnee = 1;
        const moisTotalAttendus = 12 - moisDebutAnnee + 1;
        let estComplete = false;
        if (nbMois > 0 && nbMois >= moisTotalAttendus) estComplete = true;
        const moisValides = moisPayes.filter(mois => mois >= moisDebutAnnee);
        const nbMoisValides = moisValides.length;
        if (nbMoisValides >= moisTotalAttendus) estComplete = true;

        let affichage = '';
        const moisLabelsShort = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
        if (estComplete) {
          const moisTries = [...moisValides].sort((a,b)=>a-b);
          const affichageMois = moisTries.map(m=>moisLabelsShort[m-1]).join(', ');
          affichage = `✅ 12/12${affichageMois ? ` (${affichageMois})` : ''}`;
        } else if (nbMoisValides > 0) {
          const moisTries = [...moisValides].sort((a,b)=>a-b);
          const affichageMois = moisTries.map(m=>moisLabelsShort[m-1]).join(', ');
          affichage = `${nbMoisValides}/${moisTotalAttendus}${affichageMois ? ` (${affichageMois})` : ''}`;
        } else {
          affichage = `0/${moisTotalAttendus}`;
        }

        resumeAnnees.push({
          annee, nbMois: nbMoisValides, moisTotalAttendus,
          moisDebut: moisDebutAnnee, estComplete, affichage,
          moisCreation: annee===anneeCreation ? moisCreation : null,
          anneeCreation: annee===anneeCreation ? anneeCreation : null
        });
      }

      let artistes_detail = [];
      if (type === 'occ') {
        try {
          const artistesResult = await pool.query(
            `SELECT a.id, a.nom, a.prenom, a.role
             FROM event_artistes ea
             JOIN artistes a ON ea.artiste_id = a.id
             WHERE ea.event_id = $1
             ORDER BY a.id`,
            [usager.id]
          );
          artistes_detail = artistesResult.rows;
        } catch (err) {
          console.error('❌ Erreur récupération artistes OCC:', err);
        }
      }

      result.push({
        id: usager.id,
        denomination: usager.denomination || usager.genre_manifestation || usager.nom_evenement || 'Sans nom',
        demandeur: usager.demandeur || usager.organisateurs || '',
        telephone: usager.telephone || '',
        email: usager.email || '',
        montant_mensuel: montantMensuel,
        region: usager.region_nom || usager.region || 'N/A',
        region_id: usager.region_id || null,
        ville_id: usager.ville_id || null,
        quartier_id: usager.quartier_id || null,
        numero_localite: usager.numero_localite || '',
        region_nom: usager.region_nom || usager.region || 'N/A',
        ville_nom: usager.ville_nom || '',
        quartier_nom: usager.quartier_nom || '',
        ville_telephone: usager.ville_telephone || '',
        ville: usager.ville_nom || usager.ville || '',
        adresse: usager.adresse || usager.adresse_siege || '',
        adresse_siege: usager.adresse_siege || '',
        nif_stat: usager.nif_stat || '',
        uniter: usager.uniter || 1,
        resumeAnnees,
        moisPayesParAnnee,
        anneePayes: anneesPayes,
        totalMoisPayes: paiements.rows.length,
        aPayeAnneeCourante: (anneesPayes[currentYear] || []).length > 0,
        moisPayesAnneeCourante: (anneesPayes[currentYear] || []).length,
        anneeCourante: currentYear,
        estNouveau: false,
        statut_paiement: usager.statut_paiement || 'en_attente',
        created_at: usager.created_at || null,
        moisCreation,
        anneeCreation,
        etoiles: usager.etoiles || null,
        nombre_magasins: usager.nombre_magasins || 0,
        ravinala: usager.ravinala || false,
        activite: usager.activite || null,
        nombre_vehicules: usager.nombre_vehicules || 0,
        jauge_max: usager.jauge_max || 0,
        horaires: usager.horaires || null,
        lignes: usager.lignes || null,
        trajet: usager.trajet || null,
        type_bus: usager.type_bus || null,
        zones_desservies: usager.zones_desservies || null,
        frequence: usager.frequence || null,
        canal: usager.canal || null,
        siege: usager.siege || null,
        nif: usager.nif || null,
        stat: usager.stat || null,
        taux: usager.taux || null,
        genre_manifestation: usager.genre_manifestation || null,
        nom_evenement: usager.nom_evenement || null,
        date_evenement: usager.date_evenement || null,
        lieu_evenement: usager.lieu_evenement || null,
        artistes: usager.artistes || null,
        artistes_detail: artistes_detail,
        organisateurs: usager.organisateurs || null,
        representant_par: usager.representant_par || null,
        representant_nom: usager.representant_nom || null,
        representant_adresse: usager.representant_adresse || null,
        representant_tel: usager.representant_tel || null,
        representant_cin: usager.representant_cin || null,
        representant_cin_delivree: usager.representant_cin_delivree || null,
        representant_cin_lieu: usager.representant_cin_lieu || null,
        representant_fonction: usager.representant_fonction || null,
        confirmation_nom: usager.confirmation_nom || null,
        date_signature: usager.date_signature || null,
        lieu_signature: usager.lieu_signature || null,
        a_compter_du: usager.a_compter_du || null,
        echeance: usager.echeance || null,
        frais_dossier: parseFloat(usager.frais_dossier) || 0
      });
    }

    res.json({ success: true, usagers: result });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message, usagers: [] });
  }
});

// ============================================================
// GET - Nouveaux IDs (24h)
// ============================================================
router.get('/usagers/nouveaux-ids/:type', async (req, res) => {
  const { type } = req.params;
  let tableName = '';
  switch(type) {
    case 'hotel': tableName = 'usagers_hotel'; break;
    case 'grand-surface': tableName = 'usagers_magasin'; break;
    case 'bus': tableName = 'usagers_bus'; break;
    case 'nightclub': tableName = 'usagers_nightclub'; break;
    case 'media': tableName = 'usagers_media'; break;
    case 'occ': tableName = 'usagers_occasionnel'; break;
    default: return res.status(400).json({ success: false });
  }
  try {
    const result = await pool.query(`SELECT id FROM ${tableName} WHERE created_at > NOW() - INTERVAL '24 hours'`);
    let ids = result.rows.map(row => row.id);
    const vusResult = await pool.query(`SELECT usager_id FROM usagers_vus WHERE usager_type = $1`, [type]);
    const idsVus = vusResult.rows.map(row => row.usager_id);
    ids = ids.filter(id => !idsVus.includes(id));
    res.json({ success: true, ids });
  } catch (error) {
    console.error('❌ Erreur nouveaux ids:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Nouveaux compteurs
// ============================================================
router.get('/usagers/nouveaux-compteur', async (req, res) => {
  try {
    const nouveaux = { hotel: 0, 'grand-surface': 0, bus: 0, nightclub: 0, media: 0, occ: 0 };
    const types = [
      { name: 'hotel', table: 'usagers_hotel' },
      { name: 'grand-surface', table: 'usagers_magasin' },
      { name: 'bus', table: 'usagers_bus' },
      { name: 'nightclub', table: 'usagers_nightclub' },
      { name: 'media', table: 'usagers_media' },
      { name: 'occ', table: 'usagers_occasionnel' }
    ];
    for (const type of types) {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM ${type.table} u
        WHERE u.created_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (SELECT 1 FROM usagers_vus v WHERE v.usager_id = u.id AND v.usager_type = $1)
      `, [type.name]);
      nouveaux[type.name] = parseInt(result.rows[0].count) || 0;
    }
    res.json({ success: true, nouveaux });
  } catch (error) {
    console.error('❌ Erreur nouveaux compteur:', error);
    res.json({ success: true, nouveaux: { hotel: 0, 'grand-surface': 0, bus: 0, nightclub: 0, media: 0, occ: 0 } });
  }
});

// ============================================================
// GET - Vérification d'existence d'un usager
// ============================================================
router.get('/usagers/check', async (req, res) => {
  const { denomination, type } = req.query;
  if (!denomination || denomination.length < 3) {
    return res.json({ success: false, exists: false, message: 'Dénomination trop courte' });
  }
  try {
    let tableName = '', query = '';
    switch(type) {
      case 'Hôtel':
        tableName = 'usagers_hotel';
        query = `SELECT demandeur, denomination, adresse_siege, nif_stat, telephone, email, etoiles, ravinala, 
                        representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, 
                        representant_cin_lieu, representant_fonction, activite, frais_dossier, montant_mensuel, region, uniter
                 FROM ${tableName} WHERE LOWER(denomination) = LOWER($1) LIMIT 1`;
        break;
      case 'Grand Surface':
        tableName = 'usagers_magasin';
        query = `SELECT demandeur, denomination, adresse_siege, nif_stat, telephone,
                        representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, 
                        representant_cin_lieu, representant_fonction, activite, nombre_magasins, frais_dossier, montant_mensuel, region, uniter
                 FROM ${tableName} WHERE LOWER(denomination) = LOWER($1) LIMIT 1`;
        break;
      case 'Bus':
        tableName = 'usagers_bus';
        query = `SELECT demandeur, denomination, adresse_siege, nif_stat, telephone, email,
                        representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, 
                        representant_cin_lieu, representant_fonction, nombre_vehicules, lignes, type_bus, trajet, horaires, 
                        frais_dossier, montant_mensuel, region, uniter
                 FROM ${tableName} WHERE LOWER(denomination) = LOWER($1) LIMIT 1`;
        break;
      case 'OCC':
        tableName = 'usagers_occasionnel';
        query = `SELECT organisateurs, representant_par, genre_manifestation, artistes, date_evenement, lieu_evenement,
                        representant_cin, representant_cin_delivree, representant_cin_lieu, adresse, telephone, domicile,
                        confirmation_nom, date_signature, lieu_ajout, region, uniter
                 FROM ${tableName} WHERE LOWER(genre_manifestation) = LOWER($1) LIMIT 1`;
        break;
      case 'Night club':
        tableName = 'usagers_nightclub';
        query = `SELECT demandeur, denomination, adresse_siege, nif_stat, telephone, email,
                        representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, 
                        representant_cin_lieu, representant_fonction, jauge_max, horaires, frais_dossier, montant_mensuel, region, uniter
                 FROM ${tableName} WHERE LOWER(denomination) = LOWER($1) LIMIT 1`;
        break;
      case 'Télé/Radio':
        tableName = 'usagers_media';
        query = `SELECT proprietaire_nom, proprietaire_adresse, proprietaire_tel, proprietaire_cin, proprietaire_cin_delivree, proprietaire_cin_lieu,
                        representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu,
                        representant_pouvoir_date, representant_pouvoir_par, representant_fonction,
                        denomination, frequence, canal, siege, telephone, email, nif, stat, taux,
                        couverture_capitale, couverture_chef_lieu_province, couverture_chef_lieu_region, couverture_district,
                        horaires_jusqua12, horaires_13a24,
                        confirmation_nom, date_signature, lieu_signature,
                        frais_dossier, region, uniter
                 FROM ${tableName} WHERE LOWER(denomination) = LOWER($1) LIMIT 1`;
        break;
      default: return res.json({ success: false, exists: false, message: 'Type non supporté' });
    }
    const result = await pool.query(query, [denomination]);
    if (result.rows.length > 0) res.json({ success: true, exists: true, data: result.rows[0] });
    else res.json({ success: true, exists: false });
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    res.status(500).json({ success: false, exists: false, message: error.message });
  }
});

// ============================================================
// GET - Usagers OCC avec détails des artistes
//    ✅ Filtres : ?region_id=...&ville_id=...&quartier_id=...
// ============================================================
router.get('/usagers/occasionnels', async (req, res) => {
  const { region, ville, region_id, ville_id, quartier_id } = req.query;

  try {
    let query = `
      SELECT 
        o.*,
        COALESCE(o.montant, 0) + COALESCE(o.frais_dossier, 0) + COALESCE(o.montant_retard, 0) AS montant_total,
        r.nom AS region_nom,
        v.nom AS ville_nom,
        v.quartier AS quartier_nom,
        v.telephone AS ville_telephone
      FROM usagers_occasionnel o
      LEFT JOIN regions r ON o.region_id = r.id
      LEFT JOIN villes v ON o.ville_id = v.id
    `;
    const params = [];
    const conditions = [];

    if (region_id) {
      params.push(toId(region_id));
      conditions.push(`o.region_id = $${params.length}`);
    } else if (region) {
      params.push(region);
      conditions.push(`LOWER(o.region) = LOWER($${params.length})`);
    }

    if (ville_id) {
      params.push(toId(ville_id));
      conditions.push(`o.ville_id = $${params.length}`);
    } else if (ville) {
      params.push(`%${ville.toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(COALESCE(o.lieu_evenement, '')) LIKE $${idx}
        OR LOWER(COALESCE(o.domicile, '')) LIKE $${idx}
        OR LOWER(COALESCE(o.adresse, '')) LIKE $${idx}
      )`);
    }

    if (quartier_id) {
      params.push(toId(quartier_id));
      conditions.push(`o.quartier_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.date_evenement DESC NULLS LAST, o.created_at DESC';

    const result = await pool.query(query, params);

    const events = [];
    for (const row of result.rows) {
      let artistes_detail = [];
      try {
        const artistesResult = await pool.query(
          `SELECT a.id, a.nom, a.prenom, a.role
           FROM event_artistes ea
           JOIN artistes a ON ea.artiste_id = a.id
           WHERE ea.event_id = $1
           ORDER BY a.id`,
          [row.id]
        );
        artistes_detail = artistesResult.rows;
      } catch (err) {
        console.error('❌ Erreur récupération artistes:', err);
      }

      events.push({
        id: row.id,
        nom_evenement: row.nom_evenement,
        genre_manifestation: row.genre_manifestation,
        date_evenement: row.date_evenement,
        lieu_evenement: row.lieu_evenement,
        region_id: row.region_id || null,
        ville_id: row.ville_id || null,
        quartier_id: row.quartier_id || null,
        numero_localite: row.numero_localite || '',
        region_nom: row.region_nom || row.region || '',
        ville_nom: row.ville_nom || '',
        quartier_nom: row.quartier_nom || '',
        ville_telephone: row.ville_telephone || '',
        ville: row.ville_nom || row.ville || '',
        artistes: row.artistes,
        artistes_detail: artistes_detail,
        artistesList: artistes_detail.map(a => ({
          nom: a.nom,
          prenom: a.prenom,
          role: a.role
        })),
        denomination: row.denomination,
        demandeur: row.demandeur,
        organisateurs: row.organisateurs,
        representant_par: row.representant_par,
        representant_cin: row.representant_cin,
        representant_cin_delivree: row.representant_cin_delivree,
        representant_cin_lieu: row.representant_cin_lieu,
        confirmation_nom: row.confirmation_nom,
        date_signature: row.date_signature,
        telephone: row.telephone,
        email: row.email,
        adresse: row.adresse,
        domicile: row.domicile,
        region: row.region,
        lieu_ajout: row.lieu_ajout,
        date_ajout: row.date_ajout,
        numero_dossier_global: row.numero_dossier_global,
        numero_dossier_utilisateur: row.numero_dossier_utilisateur,
        uniter: row.uniter || 1,
        frais_dossier: parseFloat(row.frais_dossier) || 0,
        montant: parseFloat(row.montant) || 0,
        montant_retard: parseFloat(row.montant_retard) || 0,
        is_retard: row.is_retard || false,
        soit_total: parseFloat(row.soit_total) || 0,
        montant_total: parseFloat(row.montant_total) || 0,
        created_at: row.created_at
      });
    }

    res.json({ success: true, events });
  } catch (error) {
    console.error('❌ Erreur récupération occasionnels:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Usagers par type spécifique
// ============================================================
router.get('/usagers/type/:type', async (req, res) => {
  const { type } = req.params;
  const typeMapping = {
    'hotel': 'usagers_hotel',
    'grand-surface': 'usagers_magasin',
    'media': 'usagers_media',
    'occ': 'usagers_occasionnel',
    'bus': 'usagers_bus',
    'nightclub': 'usagers_nightclub'
  };
  const tableName = typeMapping[type];
  if (!tableName) return res.status(400).json({ success: false, message: 'Type d\'usager invalide' });
  try {
    const result = await pool.query(`
      SELECT 
        u.*,
        r.nom AS region_nom,
        v.nom AS ville_nom,
        v.quartier AS quartier_nom
      FROM ${tableName} u
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN villes v ON u.ville_id = v.id
      ORDER BY u.id
    `);
    res.json({ success: true, usagers: result.rows });
  } catch (error) {
    console.error('❌ Erreur récupération usagers par type:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Tous les usagers (avec JOIN localisation)
// ============================================================
router.get('/usagers', async (req, res) => {
  try {
    console.log('📡 Requête /api/usagers reçue');
    const tables = [
      { name: 'usagers_hotel', type: 'Hôtel' },
      { name: 'usagers_magasin', type: 'Grand Surface' },
      { name: 'usagers_media', type: 'Télé/Radio' },
      { name: 'usagers_occasionnel', type: 'OCC' },
      { name: 'usagers_bus', type: 'Bus' },
      { name: 'usagers_nightclub', type: 'Night club' }
    ];
    let allUsagers = [];
    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT 
            u.*,
            r.nom AS region_nom,
            v.nom AS ville_nom,
            v.quartier AS quartier_nom,
            v.telephone AS ville_telephone
          FROM ${table.name} u
          LEFT JOIN regions r ON u.region_id = r.id
          LEFT JOIN villes v ON u.ville_id = v.id
        `);
        const usagers = result.rows.map(u => ({
          ...u,
          type_usager: table.type,
          uniter: u.uniter || 1,
          // Priorité aux noms JOIN
          region: u.region_nom || u.region || '',
          ville: u.ville_nom || u.ville || '',
        }));
        allUsagers = [...allUsagers, ...usagers];
        console.log(`✅ ${table.name}: ${usagers.length} usagers chargés`);
      } catch (tableError) {
        console.error(`❌ Erreur sur ${table.name}:`, tableError.message);
      }
    }

    try {
      const otherResult = await pool.query(`
        SELECT 
          u.*,
          r.nom AS region_nom,
          v.nom AS ville_nom,
          v.quartier AS quartier_nom
        FROM usager_other u
        LEFT JOIN regions r ON u.region_id = r.id
        LEFT JOIN villes v ON u.ville_id = v.id
        ORDER BY u.id
      `);
      const otherUsagers = otherResult.rows.map(u => ({
        ...u,
        type_usager: 'Autre',
        type_other: u.type_usager,
        demandeur: [u.nom, u.prenom].filter(Boolean).join(' ') || u.denomination || '',
        uniter: 1,
        region: u.region_nom || u.region || '',
        ville: u.ville_nom || u.ville || '',
      }));
      allUsagers = [...allUsagers, ...otherUsagers];
      console.log(`✅ usager_other: ${otherUsagers.length} usagers chargés`);
    } catch (otherError) {
      console.error(`❌ Erreur sur usager_other:`, otherError.message);
    }

    const uniqueMap = new Map();
    for (const usager of allUsagers) {
      const key = `${usager.id}_${usager.type_usager}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, usager);
    }
    const uniqueUsagers = Array.from(uniqueMap.values());
    uniqueUsagers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    console.log(`✅ Total usagers uniques: ${uniqueUsagers.length}`);
    res.json(uniqueUsagers);
  } catch (error) {
    console.error('❌ Erreur /api/usagers:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET - Tous les usagers OTHER (route dédiée)
// ============================================================
router.get('/usagers/other', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        uo.*,
        COALESCE(
          (SELECT SUM(ol.montant) FROM other_lignes ol WHERE ol.usager_other_id = uo.id),
          0
        ) AS montant_total,
        r.nom AS region_nom,
        v.nom AS ville_nom,
        v.quartier AS quartier_nom
      FROM usager_other uo
      LEFT JOIN regions r ON uo.region_id = r.id
      LEFT JOIN villes v ON uo.ville_id = v.id
      ORDER BY uo.created_at DESC NULLS LAST, uo.id DESC
    `);

    const usagers = [];
    for (const row of result.rows) {
      let lignes = [];
      try {
        const lignesRes = await pool.query(
          `SELECT id, description, uniter, pu, montant, ordre
           FROM other_lignes
           WHERE usager_other_id = $1
           ORDER BY ordre ASC, id ASC`,
          [row.id]
        );
        lignes = lignesRes.rows;
      } catch (err) {
        console.error('❌ Erreur récupération lignes other:', err.message);
      }

      usagers.push({
        id: row.id,
        type_usager: 'Autre',
        type_other: row.type_usager,
        denomination: row.denomination,
        nom: row.nom,
        prenom: row.prenom,
        demandeur: [row.nom, row.prenom].filter(Boolean).join(' ') || row.denomination || '',
        telephone: row.telephone || '',
        email: row.email || '',
        adresse: row.adresse || '',
        region: row.region_nom || row.region || '',
        region_id: row.region_id || null,
        ville_id: row.ville_id || null,
        quartier_id: row.quartier_id || null,
        region_nom: row.region_nom || row.region || '',
        ville_nom: row.ville_nom || '',
        quartier_nom: row.quartier_nom || '',
        ville: row.ville_nom || '',
        representant_par: row.representant_par || '',
        representant_cin: row.representant_cin || '',
        representant_cin_delivree: row.representant_cin_delivree || null,
        representant_cin_lieu: row.representant_cin_lieu || '',
        representant_contact: row.representant_contact || '',
        mode_paiement: row.mode_paiement || 'unique',
        numero_dossier_utilisateur: row.numero_dossier_utilisateur || '',
        numero_dossier_global: row.numero_dossier_global || '',
        quittance: row.quittance || null,
        quittance_validee: row.quittance_validee || false,
        personne_recu: row.personne_recu || '',
        statut: row.statut || 'actif',
        created_at: row.created_at,
        updated_at: row.updated_at,
        montant_total: parseFloat(row.montant_total) || 0,
        lignes: lignes,
      });
    }

    res.json({ success: true, usagers });
  } catch (error) {
    console.error('❌ Erreur GET /usagers/other:', error);
    res.status(500).json({ success: false, message: error.message, usagers: [] });
  }
});

// ============================================================
// GET - Usager OTHER par ID
// ============================================================
router.get('/usagers/other/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        u.*,
        r.nom AS region_nom,
        v.nom AS ville_nom,
        v.quartier AS quartier_nom
      FROM usager_other u
      LEFT JOIN regions r ON u.region_id = r.id
      LEFT JOIN villes v ON u.ville_id = v.id
      WHERE u.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usager "Autre" non trouvé' });
    }
    const usager = result.rows[0];

    let lignes = [];
    try {
      const lignesRes = await pool.query(
        `SELECT id, description, uniter, pu, montant, ordre
         FROM other_lignes
         WHERE usager_other_id = $1
         ORDER BY ordre ASC, id ASC`,
        [id]
      );
      lignes = lignesRes.rows;
    } catch (err) {
      console.error('❌ Erreur lignes other:', err.message);
    }

    usager.lignes = lignes;
    usager.type_other = usager.type_usager;
    usager.type_usager = 'Autre';
    res.json({ success: true, usager });
  } catch (error) {
    console.error('❌ Erreur GET /usagers/other/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Usager par ID (générique)
// ============================================================
router.get('/usagers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tables = ['usagers_hotel','usagers_magasin','usagers_media','usagers_occasionnel','usagers_bus','usagers_nightclub'];
    for (const table of tables) {
      const result = await pool.query(
        `SELECT *, '${table.replace('usagers_', '')}' as type_usager FROM ${table} WHERE id = $1`,
        [id]
      );
      if (result.rows.length > 0) return res.json(result.rows[0]);
    }
    res.status(404).json({ error: 'Usager non trouvé' });
  } catch (error) {
    console.error('❌ Erreur récupération usager:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET - Détails spécifiques par type
// ============================================================
router.get('/usagers/hotel/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_hotel WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Hôtel non trouvé' });
    res.json({ success: true, usager: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/usagers/magasin/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_magasin WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Magasin non trouvé' });
    res.json({ success: true, usager: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/usagers/media/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_media WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Média non trouvé' });
    res.json({ success: true, usager: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/usagers/occasionnel/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_occasionnel WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'OCC non trouvé' });

    let artistes_detail = [];
    try {
      const artistesResult = await pool.query(
        `SELECT a.id, a.nom, a.prenom, a.role
         FROM event_artistes ea
         JOIN artistes a ON ea.artiste_id = a.id
         WHERE ea.event_id = $1
         ORDER BY a.id`,
        [id]
      );
      artistes_detail = artistesResult.rows;
    } catch (err) {
      console.error('❌ Erreur récupération artistes:', err);
    }

    const usager = result.rows[0];
    usager.artistes_detail = artistes_detail;
    res.json({ success: true, usager });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/usagers/bus/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_bus WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Bus non trouvé' });
    res.json({ success: true, usager: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/usagers/nightclub/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM usagers_nightclub WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Night club non trouvé' });
    res.json({ success: true, usager: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Compteurs d'un utilisateur
// ============================================================
router.get('/users/counters/:userId', async (req, res) => {
  const { userId } = req.params;
  const year = req.query.year || new Date().getFullYear();
  try {
    const result = await pool.query(
      `SELECT type_usager, compteur FROM compteurs_dossiers_utilisateurs 
       WHERE utilisateur_id = $1 AND annee = $2`,
      [parseInt(userId), parseInt(year)]
    );
    const compteurs = {};
    for (const row of result.rows) {
      let key = row.type_usager;
      compteurs[key] = row.compteur;
    }
    const types = ['Hôtel','Grand Surface','Télé/Radio','OCC','Bus','Night club'];
    for (const type of types) {
      if (!compteurs[type]) compteurs[type] = 0;
    }
    res.json({ success: true, compteurs, year: parseInt(year) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Nombre total de dossiers OCC
// ============================================================
router.get('/occ/total-count', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const result = await pool.query(`SELECT COUNT(*) as total FROM usagers_occasionnel WHERE EXTRACT(YEAR FROM created_at) = $1`, [currentYear]);
    const total = parseInt(result.rows[0].total) || 0;
    res.json({ success: true, total, year: currentYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Numéro de dossier OCC
// ============================================================
router.get('/occ/dossier-number', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth()+1).padStart(2,'0');
    const currentDay = String(new Date().getDate()).padStart(2,'0');
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM usagers_occasionnel WHERE EXTRACT(YEAR FROM created_at) = $1`, [currentYear]);
    const totalCount = parseInt(countResult.rows[0].total) + 1;
    const dossierNumber = `${totalCount}/${currentDay}/${currentMonth}/${currentYear}`;
    res.json({ success: true, dossierNumber, totalCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST - Ajouter un usager
//    ✅ NOUVEAU : résolution region_id/ville_id via texte
// ============================================================
router.post('/usagers', async (req, res) => {
  const { type, userId, ...data } = req.body;
  console.log(`📝 Ajout usager - Type: ${type}, Utilisateur ID: ${userId}`);
  if (!type) return res.status(400).json({ success: false, message: 'Type d\'usager non spécifié' });

  const get = (snake, camel, defaultVal = '') => {
    if (data[snake] !== undefined && data[snake] !== null) return data[snake];
    if (camel && data[camel] !== undefined && data[camel] !== null) return data[camel];
    return defaultVal;
  };

  const montantMensuelVal = toNumber(get('montant_mensuel', 'montantMensuel', 0));
  const fraisDossierVal = toNumber(get('frais_dossier', 'fraisDossier', 0));

  // ✅ NOUVEAU : résolution des IDs de localisation
  let localisation = {
    region_id: toId(data.region_id || data.regionId),
    ville_id: toId(data.ville_id || data.villeId),
    quartier_id: toId(data.quartier_id || data.quartierId),
    numero_localite: data.numero_localite || data.numeroLocalite || null,
  };

  try {
    // Résolution automatique si texte fourni
    if (!localisation.region_id && data.region) {
      const r = await pool.query('SELECT id FROM regions WHERE LOWER(nom) = LOWER($1)', [data.region]);
      if (r.rows.length > 0) localisation.region_id = r.rows[0].id;
    }
    if (!localisation.ville_id && data.ville && localisation.region_id) {
      const v = await pool.query(
        'SELECT id FROM villes WHERE region_id = $1 AND LOWER(nom) = LOWER($2)',
        [localisation.region_id, data.ville]
      );
      if (v.rows.length > 0) localisation.ville_id = v.rows[0].id;
    }

    console.log('   📍 Localisation résolue :', localisation);

    let tableName = '', insertData = {}, uniter = data.uniter || 1;
    const typeMapping = {
      'Hôtel': 'usagers_hotel',
      'Grand Surface': 'usagers_magasin',
      'Bus': 'usagers_bus',
      'Night club': 'usagers_nightclub',
      'Télé/Radio': 'usagers_media',
      'OCC': 'usagers_occasionnel'
    };
    tableName = typeMapping[type];
    if (!tableName) return res.status(400).json({ success: false, message: 'Type d\'usager inconnu' });

    switch(type) {
      case 'Hôtel':
        insertData = {
          demandeur: get('demandeur', 'demandeur'),
          denomination: get('denomination', 'denomination'),
          adresse_siege: get('adresse_siege', 'adresseSiege'),
          nif_stat: get('nif_stat', 'nifStat'),
          telephone: get('telephone', 'telephone'),
          email: get('email', 'email'),
          etoiles: get('etoiles', 'etoiles'),
          ravinala: get('ravinala', 'ravinala', false),
          representant_nom: get('representant_nom', 'representantNom'),
          representant_adresse: get('representant_adresse', 'representantAdresse'),
          representant_tel: get('representant_tel', 'representantTel'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          representant_fonction: get('representant_fonction', 'representantFonction'),
          activite: get('activite', 'activite'),
          moyens_communication: JSON.stringify(get('moyens_communication', 'moyensCommunication', {})),
          total: get('total', 'total'),
          a_compter_du: toDate(get('a_compter_du', 'aCompterDu', null)),
          echeance: toDate(get('echeance', 'echeance', null)),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_signature: get('lieu_signature', 'lieuSignature'),
          type_paiement: 'mensuel',
          montant_mensuel: montantMensuelVal,
          frais_dossier: fraisDossierVal,
          region: get('region', 'region'),
          uniter: uniter,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      case 'Grand Surface':
        insertData = {
          demandeur: get('demandeur', 'demandeur'),
          denomination: get('denomination', 'denomination'),
          adresse_siege: get('adresse_siege', 'adresseSiege'),
          nif_stat: get('nif_stat', 'nifStat'),
          telephone: get('telephone', 'telephone'),
          representant_nom: get('representant_nom', 'representantNom'),
          representant_adresse: get('representant_adresse', 'representantAdresse'),
          representant_tel: get('representant_tel', 'representantTel'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          representant_fonction: get('representant_fonction', 'representantFonction'),
          activite: get('activite', 'activite'),
          nombre_magasins: data.nombre_magasins ? parseInt(data.nombre_magasins) : (data.nombreMagasins ? parseInt(data.nombreMagasins) : 0),
          moyens_communication: JSON.stringify(get('moyens_communication', 'moyensCommunication', {})),
          total: get('total', 'total'),
          a_compter_du: toDate(get('a_compter_du', 'aCompterDu', null)),
          echeance: toDate(get('echeance', 'echeance', null)),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_signature: get('lieu_signature', 'lieuSignature'),
          type_paiement: 'mensuel',
          montant_mensuel: montantMensuelVal,
          frais_dossier: fraisDossierVal,
          region: get('region', 'region'),
          uniter: uniter,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      case 'Bus':
        insertData = {
          demandeur: get('demandeur', 'demandeur'),
          denomination: get('denomination', 'denomination'),
          adresse_siege: get('adresse_siege', 'adresseSiege'),
          nif_stat: get('nif_stat', 'nifStat'),
          telephone: get('telephone', 'telephone'),
          email: get('email', 'email'),
          representant_nom: get('representant_nom', 'representantNom'),
          representant_adresse: get('representant_adresse', 'representantAdresse'),
          representant_tel: get('representant_tel', 'representantTel'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          representant_fonction: get('representant_fonction', 'representantFonction'),
          nombre_vehicules: data.nombre_vehicules ? parseInt(data.nombre_vehicules) : (data.nombreVehicules ? parseInt(data.nombreVehicules) : 0),
          lignes: get('lignes', 'lignes'),
          type_bus: get('type_bus', 'typeBus'),
          trajet: get('trajet', 'trajet'),
          horaires: get('horaires', 'horaires'),
          zones_desservies: get('zones_desservies', 'zonesDesservies'),
          a_compter_du: toDate(get('a_compter_du', 'aCompterDu', null)),
          echeance: toDate(get('echeance', 'echeance', null)),
          type_paiement: 'mensuel',
          montant_mensuel: montantMensuelVal,
          frais_dossier: fraisDossierVal,
          region: get('region', 'region'),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_signature: get('lieu_signature', 'lieuSignature'),
          uniter: uniter,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      case 'Night club':
        insertData = {
          demandeur: get('demandeur', 'demandeur'),
          denomination: get('denomination', 'denomination'),
          adresse_siege: get('adresse_siege', 'adresseSiege'),
          nif_stat: get('nif_stat', 'nifStat'),
          telephone: get('telephone', 'telephone'),
          email: get('email', 'email'),
          representant_nom: get('representant_nom', 'representantNom'),
          representant_adresse: get('representant_adresse', 'representantAdresse'),
          representant_tel: get('representant_tel', 'representantTel'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          representant_fonction: get('representant_fonction', 'representantFonction'),
          jauge_max: data.jauge_max ? parseInt(data.jauge_max) : (data.jaugeMax ? parseInt(data.jaugeMax) : 0),
          horaires: get('horaires', 'horaires'),
          moyens_communication: JSON.stringify(get('moyens_communication', 'moyensCommunication', {})),
          total: get('total', 'total'),
          a_compter_du: toDate(get('a_compter_du', 'aCompterDu', null)),
          echeance: toDate(get('echeance', 'echeance', null)),
          type_paiement: 'mensuel',
          montant_mensuel: montantMensuelVal,
          frais_dossier: fraisDossierVal,
          region: get('region', 'region'),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_signature: get('lieu_signature', 'lieuSignature'),
          uniter: uniter,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      case 'Télé/Radio':
        insertData = {
          proprietaire_nom: get('proprietaire_nom', 'proprietaireNom'),
          proprietaire_adresse: get('proprietaire_adresse', 'proprietaireAdresse'),
          proprietaire_tel: get('proprietaire_tel', 'proprietaireTel'),
          proprietaire_cin: get('proprietaire_cin', 'proprietaireCin'),
          proprietaire_cin_delivree: toDate(get('proprietaire_cin_delivree', 'proprietaireCinDelivree', null)),
          proprietaire_cin_lieu: get('proprietaire_cin_lieu', 'proprietaireCinLieu'),
          representant_nom: get('representant_nom', 'representantNom'),
          representant_adresse: get('representant_adresse', 'representantAdresse'),
          representant_tel: get('representant_tel', 'representantTel'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          representant_pouvoir_date: toDate(get('representant_pouvoir_date', 'representantPouvoirDate', null)),
          representant_pouvoir_par: get('representant_pouvoir_par', 'representantPouvoirPar'),
          representant_fonction: get('representant_fonction', 'representantFonction'),
          denomination: get('denomination', 'denomination'),
          frequence: get('frequence', 'frequence'),
          canal: get('canal', 'canal'),
          siege: get('siege', 'siege'),
          telephone: get('telephone', 'telephone'),
          email: get('email', 'email'),
          nif: get('nif', 'nif'),
          stat: get('stat', 'stat'),
          taux: get('taux', 'taux'),
          couverture_capitale: get('couverture_capitale', 'couvertureCapitale', false),
          couverture_chef_lieu_province: get('couverture_chef_lieu_province', 'couvertureChefLieuProvince', false),
          couverture_chef_lieu_region: get('couverture_chef_lieu_region', 'couvertureChefLieuRegion', false),
          couverture_district: get('couverture_district', 'couvertureDistrict', false),
          horaires_jusqua12: get('horaires_jusqua12', 'horairesJusqua12', false),
          horaires_13a24: get('horaires_13a24', 'horaires13a24', false),
          has_regions: get('has_regions', 'hasRegions', false),
          regions_detail: JSON.stringify(get('regions_detail', 'regionsDetail', [])),
          type_paiement: 'mensuel',
          montant_mensuel: montantMensuelVal,
          frais_dossier: fraisDossierVal,
          region: get('region', 'region'),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_signature: get('lieu_signature', 'lieuSignature'),
          uniter: uniter,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      case 'OCC':
        insertData = {
          organisateurs: get('organisateurs', 'organisateurs'),
          representant_par: get('representant_par', 'representantPar'),
          genre_manifestation: get('genre_manifestation', 'genreManifestation'),
          artistes: get('artistes', 'artistes'),
          date_evenement: toDate(get('date_evenement', 'dateEvenement', null)),
          lieu_evenement: get('lieu_evenement', 'lieuEvenement'),
          representant_cin: get('representant_cin', 'representantCin'),
          representant_cin_delivree: toDate(get('representant_cin_delivree', 'representantCinDelivree', null)),
          representant_cin_lieu: get('representant_cin_lieu', 'representantCinLieu'),
          adresse: get('adresse', 'adresse'),
          telephone: get('telephone', 'telephone'),
          domicile: get('domicile', 'domicile'),
          confirmation_nom: get('confirmation_nom', 'confirmationNom'),
          date_signature: toDate(get('date_signature', 'dateSignature', null)),
          lieu_ajout: get('lieu_ajout', 'lieuAjout'),
          date_ajout: toDate(get('date_ajout', 'dateAjout', null)),
          region: get('region', 'region'),
          demandeur: get('organisateurs', 'organisateurs'),
          denomination: get('genre_manifestation', 'genreManifestation'),
          numero_dossier_global: get('numero_dossier_global', 'numeroDossierGlobal'),
          numero_dossier_utilisateur: get('numero_dossier_utilisateur', 'numeroDossierUtilisateur'),
          montant: toNumber(get('montant', 'montant', 0)),
          frais_dossier: fraisDossierVal,
          montant_retard: toNumber(get('montant_retard', 'montant_retard', 0)),
          is_retard: get('is_retard', 'is_retard', false),
          soit_total: toNumber(get('soit_total', 'soit_total', 0)),
          uniter: data.uniter || 1,
          created_by: userId,
          region_id: localisation.region_id,
          ville_id: localisation.ville_id,
          quartier_id: localisation.quartier_id,
          numero_localite: localisation.numero_localite,
        };
        break;

      default: return res.status(400).json({ success: false, message: 'Type d\'usager inconnu' });
    }

    const columns = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await pool.query(query, values);
    const newId = result.rows[0].id;

    if (userId) {
      const currentYear = new Date().getFullYear();
      const userIdInt = parseInt(userId);

      let counterType = type;
      if (type === 'Grand Surface') counterType = 'Grand Surface';
      else if (type === 'Télé/Radio') counterType = 'Télé/Radio';
      else if (type === 'Night club') counterType = 'Night club';

      let counterResult = await pool.query(
        `SELECT compteur, id FROM compteurs_dossiers_utilisateurs 
         WHERE utilisateur_id = $1 AND annee = $2 AND type_usager = $3`,
        [userIdInt, currentYear, counterType]
      );

      let nouveauCompteur = 0;
      if (counterResult.rows.length > 0) {
        nouveauCompteur = counterResult.rows[0].compteur + 1;
        await pool.query(
          `UPDATE compteurs_dossiers_utilisateurs 
           SET compteur = $1, updated_at = NOW() 
           WHERE id = $2`,
          [nouveauCompteur, counterResult.rows[0].id]
        );
      } else {
        nouveauCompteur = 1;
        await pool.query(
          `INSERT INTO compteurs_dossiers_utilisateurs 
           (utilisateur_id, annee, compteur, type_usager, created_at, updated_at) 
           VALUES ($1, $2, 1, $3, NOW(), NOW())`,
          [userIdInt, currentYear, counterType]
        );
      }

      if (type !== 'OCC') {
        const prefix = data.prefix || '';
        const trimestre = Math.ceil((new Date().getMonth() + 1) / 4);
        const numeroDossierUtilisateur = `${prefix} ${nouveauCompteur}/${trimestre}/${currentYear}`;
        await pool.query(
          `UPDATE ${tableName} SET numero_dossier_utilisateur = $1 WHERE id = $2`,
          [numeroDossierUtilisateur, newId]
        );
      }
    }

    if (type === 'OCC') {
      const allArtists = [];

      if (data.artistes && data.artistes.trim() !== '') {
        allArtists.push({ nom: data.artistes.trim(), prenom: '', role: 'Artiste principal' });
      }

      if (data.otherArtistsDetail && Array.isArray(data.otherArtistsDetail) && data.otherArtistsDetail.length > 0) {
        for (const artist of data.otherArtistsDetail) {
          if (artist.nom && artist.nom.trim() !== '') {
            allArtists.push({
              nom: artist.nom.trim(),
              prenom: artist.prenom || '',
              role: artist.role || 'Artiste participant'
            });
          }
        }
      }

      await pool.query(`DELETE FROM event_artistes WHERE event_id = $1`, [newId]);

      for (const artist of allArtists) {
        let artisteId;
        const existingArtiste = await pool.query(
          'SELECT id FROM artistes WHERE LOWER(nom) = LOWER($1)',
          [artist.nom]
        );

        if (existingArtiste.rows.length === 0) {
          const newArtiste = await pool.query(
            'INSERT INTO artistes (nom, prenom, role) VALUES ($1, $2, $3) RETURNING id',
            [artist.nom, artist.prenom, artist.role]
          );
          artisteId = newArtiste.rows[0].id;
        } else {
          artisteId = existingArtiste.rows[0].id;
        }

        await pool.query(
          'INSERT INTO event_artistes (event_id, artiste_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newId, artisteId]
        );
      }
    }

    try {
      await pool.query(
        `INSERT INTO notifications (message, type, usager_id, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [`Nouveau ${type} ajouté: ${insertData.denomination || insertData.genre_manifestation || 'Nouvel usager'}`, 'new', newId]
      );
    } catch (notifError) {
      console.log('⚠️ Erreur notification:', notifError.message);
    }

    res.json({ success: true, id: newId, message: `${type} ajouté avec succès` });

  } catch (error) {
    console.error('❌ Erreur ajout usager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// PUT - Modifier un usager OTHER (Autre)
// ============================================================
router.put('/usagers/other/:id', async (req, res) => {
  const { id } = req.params;
  const {
    denomination, nom, prenom, telephone, email, adresse, region,
    representant_par, representant_cin, representant_cin_delivree,
    representant_cin_lieu, representant_contact, mode_paiement,
  } = req.body;

  if (!denomination) {
    return res.status(400).json({ success: false, message: 'La dénomination est obligatoire' });
  }

  try {
    const check = await pool.query(`SELECT id FROM usager_other WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usager "Autre" non trouvé' });
    }

    const fields = [];
    const values = [];
    let i = 1;

    const push = (col, val) => {
      if (val !== undefined && val !== null && val !== '') {
        fields.push(`${col} = $${i}`);
        values.push(val);
        i++;
      }
    };

    push('denomination', denomination);
    push('nom', nom);
    push('prenom', prenom);
    push('telephone', telephone);
    push('email', email);
    push('adresse', adresse);
    push('region', region);
    push('representant_par', representant_par);
    push('representant_cin', representant_cin);
    if (representant_cin_delivree) push('representant_cin_delivree', representant_cin_delivree);
    push('representant_cin_lieu', representant_cin_lieu);
    push('representant_contact', representant_contact);
    push('mode_paiement', mode_paiement);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE usager_other SET ${fields.join(', ')} WHERE id = $${i}`;
    await pool.query(query, values);

    res.json({ success: true, message: 'Usager "Autre" modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur PUT /usagers/other/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// PUT - Modifier un usager
// ============================================================
router.put('/usagers/:id', async (req, res) => {
  const { id } = req.params;
  const {
    denomination, demandeur, telephone, email, region, type_usager, adresse,
    confirmation_nom, representant_cin, representant_cin_delivree,
    representant_cin_lieu, representant_par, domicile,
    frais_dossier, montant_mensuel, uniter, etoiles, ravinala, activite,
    nombre_magasins, jauge_max, horaires, representant_nom, representant_adresse,
    representant_tel, representant_fonction, lieu_signature, date_signature,
    frequence, canal, siege, nif, stat, taux, nombre_vehicules,
    lignes, type_bus, trajet, organisateurs, representant_par_occ,
    genre_manifestation, artistes, date_evenement, lieu_evenement, lieu_ajout,
    region_id, ville_id, quartier_id, numero_localite
  } = req.body;

  if (!denomination) return res.status(400).json({ success: false, message: 'La dénomination est obligatoire' });
  try {
    let tableName = '', typeValue = type_usager;
    if (typeValue === 'Télé/Radio' || typeValue === 'Media') typeValue = 'Télé/Radio';
    switch(typeValue) {
      case 'Hôtel': tableName = 'usagers_hotel'; break;
      case 'Grand Surface': tableName = 'usagers_magasin'; break;
      case 'Télé/Radio': tableName = 'usagers_media'; break;
      case 'OCC': tableName = 'usagers_occasionnel'; break;
      case 'Bus': tableName = 'usagers_bus'; break;
      case 'Night club': tableName = 'usagers_nightclub'; break;
      default: return res.status(400).json({ success: false, message: 'Type d\'usager invalide' });
    }
    const checkResult = await pool.query(`SELECT id FROM ${tableName} WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Usager non trouvé' });
    const updateFields = [], updateValues = [];
    let paramIndex = 1;
    const commonFields = {
      denomination, demandeur, telephone, email, region,
      confirmation_nom, representant_cin,
      representant_cin_delivree: toDate(representant_cin_delivree),
      representant_cin_lieu, representant_nom, representant_adresse,
      representant_tel, representant_fonction, lieu_signature,
      date_signature: toDate(date_signature),
      frais_dossier, uniter, adresse_siege: adresse,
      etoiles, ravinala, activite, nombre_magasins, jauge_max, horaires,
      frequence, canal, siege, nif, stat, taux,
      nombre_vehicules, lignes, type_bus, trajet,
      organisateurs, representant_par: representant_par_occ,
      genre_manifestation, artistes,
      date_evenement: toDate(date_evenement),
      lieu_evenement, lieu_ajout,
      domicile,
      region_id, ville_id, quartier_id, numero_localite
    };
    if (typeValue !== 'OCC') {
      commonFields.montant_mensuel = montant_mensuel;
    }
    for (const [key, value] of Object.entries(commonFields)) {
      if (value !== undefined && value !== null && value !== '') {
        updateFields.push(`${key} = $${paramIndex}`);
        if (key === 'frais_dossier' || key === 'montant_mensuel' || key === 'uniter') {
          updateValues.push(parseFloat(value) || 0);
        } else if (key === 'nombre_magasins' || key === 'jauge_max' || key === 'nombre_vehicules') {
          updateValues.push(parseInt(value) || 0);
        } else if (key === 'region_id' || key === 'ville_id' || key === 'quartier_id') {
          updateValues.push(toId(value));
        } else {
          updateValues.push(value);
        }
        paramIndex++;
      }
    }
    if (updateFields.length === 0) return res.status(400).json({ success: false, message: 'Aucun champ à modifier' });
    updateValues.push(id);
    const query = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    await pool.query(query, updateValues);
    try {
      const adminToken = req.headers.adminToken || req.headers['admintoken'];
      let modifiedBy = 'Administrateur';
      if (adminToken) {
        const userResult = await pool.query(`SELECT nom FROM utilisateurs WHERE role = 'super_admin' OR role = 'daf' LIMIT 1`);
        if (userResult.rows.length > 0) modifiedBy = userResult.rows[0].nom;
      }
      await pool.query(`INSERT INTO notifications (message, type, usager_id, created_at) VALUES ($1, $2, $3, NOW())`, [`MODIFICATION: Usager "${denomination}" modifié par ${modifiedBy}`, 'update', parseInt(id)]);
    } catch (notifError) { console.log('⚠️ Erreur notification:', notifError.message); }
    res.json({ success: true, message: 'Usager modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur modification usager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// POST - Marquer un usager comme vu
// ============================================================
router.post('/usagers/marquer-vu', async (req, res) => {
  const { usagerId, type } = req.body;
  try {
    await pool.query(`INSERT INTO usagers_vus (usager_id, usager_type, vu_le) VALUES ($1, $2, NOW()) ON CONFLICT (usager_id, usager_type) DO NOTHING`, [usagerId, type]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur marquer vu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;