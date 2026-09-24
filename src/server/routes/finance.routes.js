const express = require('express');
const router = express.Router();
const pool = require('../database');

// ============================================================
// GET - Montant par usager (UTILISE paiements_mensuels)
// ============================================================
router.get('/finance/montant-usager/:usagerId/:type', async (req, res) => {
  const { usagerId, type } = req.params;
  try {
    console.log(`💰 Montant usager ${usagerId} - Type: ${type}`);
    
    const typeMapping = {
      'hotel': { table: 'usagers_hotel' },
      'grand-surface': { table: 'usagers_magasin' },
      'media': { table: 'usagers_media' },
      'occ': { table: 'usagers_occasionnel' },
      'bus': { table: 'usagers_bus' },
      'nightclub': { table: 'usagers_nightclub' }
    };
    
    const mapping = typeMapping[type];
    if (!mapping) {
      return res.status(400).json({ success: false, message: 'Type d\'usager invalide' });
    }
    
    // Récupérer l'usager
    const usagerResult = await pool.query(
      `SELECT id, denomination, region, montant_mensuel FROM ${mapping.table} WHERE id = $1`,
      [usagerId]
    );
    
    if (usagerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usager non trouvé' });
    }
    
    const usager = usagerResult.rows[0];
    
    // Récupérer les paiements depuis paiements_mensuels
    const paiementsResult = await pool.query(
      `SELECT mois, annee, montant, date_paiement FROM paiements_mensuels 
       WHERE usager_id = $1 AND usager_type = $2 
       ORDER BY annee DESC, mois DESC`,
      [usagerId, type]
    );
    
    let montantTotal = 0;
    const details = [];
    
    for (const p of paiementsResult.rows) {
      montantTotal += parseFloat(p.montant) || 0;
      details.push({
        mois: p.mois,
        annee: p.annee,
        montant: parseFloat(p.montant) || 0,
        date_paiement: p.date_paiement
      });
    }
    
    res.json({
      success: true,
      usager: {
        id: parseInt(usagerId),
        denomination: usager.denomination || 'Usager',
        region: usager.region,
        montantMensuel: parseFloat(usager.montant_mensuel) || 0
      },
      montantTotal: montantTotal,
      nombrePaiements: details.length,
      details: details
    });
  } catch (error) {
    console.error('❌ Erreur calcul montant usager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Montant par type (UTILISE paiements_mensuels)
// ============================================================
router.get('/finance/montant-par-type', async (req, res) => {
  try {
    console.log('📊 Calcul des montants par type (paiements_mensuels)...');
    
    const types = [
      { id: 'hotel', label: 'Hôtel', table: 'usagers_hotel' },
      { id: 'grand-surface', label: 'Grand Surface', table: 'usagers_magasin' },
      { id: 'media', label: 'Télé/Radio', table: 'usagers_media' },
      { id: 'occ', label: 'OCC', table: 'usagers_occasionnel' },
      { id: 'bus', label: 'Bus', table: 'usagers_bus' },
      { id: 'nightclub', label: 'Night club', table: 'usagers_nightclub' }
    ];
    
    const resultats = [];
    
    for (const type of types) {
      try {
        // Récupérer tous les usagers
        const usagersResult = await pool.query(
          `SELECT id, denomination, region FROM ${type.table}`
        );
        
        let totalGeneral = 0;
        let usagersAvecPaiement = 0;
        let usagersSansPaiement = 0;
        const detailsUsagers = [];
        
        for (const usager of usagersResult.rows) {
          // Récupérer les paiements depuis paiements_mensuels
          const paiementsResult = await pool.query(
            `SELECT montant FROM paiements_mensuels 
             WHERE usager_id = $1 AND usager_type = $2`,
            [usager.id, type.id]
          );
          
          let montantPaye = 0;
          let nbPaiements = 0;
          
          for (const p of paiementsResult.rows) {
            montantPaye += parseFloat(p.montant) || 0;
            nbPaiements++;
          }
          
          totalGeneral += montantPaye;
          if (nbPaiements > 0) {
            usagersAvecPaiement++;
          } else {
            usagersSansPaiement++;
          }
          
          detailsUsagers.push({
            id: usager.id,
            denomination: usager.denomination || 'Usager',
            region: usager.region || 'N/A',
            montantPaye: montantPaye,
            nbPaiements: nbPaiements
          });
        }
        
        resultats.push({
          type: type.id,
          label: type.label,
          totalUsagers: usagersResult.rows.length,
          usagersAvecPaiement,
          usagersSansPaiement,
          montantTotalPaye: totalGeneral,
          details: detailsUsagers
        });
        
        console.log(`✅ ${type.label}: ${usagersResult.rows.length} usagers, ${totalGeneral} Ar (paiements_mensuels)`);
      } catch (err) {
        console.error(`❌ Erreur pour ${type.label}:`, err.message);
        resultats.push({
          type: type.id,
          label: type.label,
          totalUsagers: 0,
          usagersAvecPaiement: 0,
          usagersSansPaiement: 0,
          montantTotalPaye: 0,
          details: []
        });
      }
    }
    
    res.json({ success: true, resultats });
  } catch (error) {
    console.error('❌ Erreur calcul montant par type:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Montant par région (UTILISE paiements_mensuels)
// ============================================================
router.get('/finance/montant-par-region', async (req, res) => {
  try {
    console.log('📊 Calcul des montants par région (paiements_mensuels)...');
    
    const regionsResult = await pool.query('SELECT id, nom FROM regions ORDER BY nom');
    const regions = regionsResult.rows;
    
    const types = [
      { id: 'hotel', table: 'usagers_hotel', label: 'Hôtel' },
      { id: 'grand-surface', table: 'usagers_magasin', label: 'Grand Surface' },
      { id: 'media', table: 'usagers_media', label: 'Télé/Radio' },
      { id: 'occ', table: 'usagers_occasionnel', label: 'OCC' },
      { id: 'bus', table: 'usagers_bus', label: 'Bus' },
      { id: 'nightclub', table: 'usagers_nightclub', label: 'Night club' }
    ];
    
    const resultats = [];
    let totalGeneral = 0;
    let totalUsagersGeneral = 0;
    
    for (const region of regions) {
      let montantTotalRegion = 0;
      let totalUsagersRegion = 0;
      let usagersAvecPaiement = 0;
      let usagersSansPaiement = 0;
      const detailsParType = {};
      
      for (const type of types) {
        const usagersResult = await pool.query(
          `SELECT id, denomination FROM ${type.table} WHERE region = $1 OR region IS NULL`,
          [region.nom]
        );
        
        totalUsagersRegion += usagersResult.rows.length;
        let montantType = 0;
        let avecPaiement = 0;
        
        for (const usager of usagersResult.rows) {
          // Récupérer les paiements depuis paiements_mensuels
          const paiementsResult = await pool.query(
            `SELECT montant FROM paiements_mensuels 
             WHERE usager_id = $1 AND usager_type = $2`,
            [usager.id, type.id]
          );
          
          let montantPaye = 0;
          for (const p of paiementsResult.rows) {
            montantPaye += parseFloat(p.montant) || 0;
          }
          
          montantType += montantPaye;
          if (montantPaye > 0) avecPaiement++;
        }
        
        montantTotalRegion += montantType;
        usagersAvecPaiement += avecPaiement;
        usagersSansPaiement += usagersResult.rows.length - avecPaiement;
        
        detailsParType[type.id] = {
          total: usagersResult.rows.length,
          avecPaiement,
          sansPaiement: usagersResult.rows.length - avecPaiement,
          montant: montantType
        };
      }
      
      totalGeneral += montantTotalRegion;
      totalUsagersGeneral += totalUsagersRegion;
      
      resultats.push({
        region: region.nom,
        regionId: region.id,
        totalUsagers: totalUsagersRegion,
        usagersAvecPaiement,
        usagersSansPaiement,
        montantTotal: montantTotalRegion,
        detailsParType
      });
    }
    
    res.json({
      success: true,
      totalGeneral,
      totalUsagersGeneral,
      regions: resultats
    });
  } catch (error) {
    console.error('❌ Erreur calcul montant par région:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Montant région usagers (UTILISE paiements_mensuels)
// ============================================================
router.get('/finance/montant-region-usagers/:region', async (req, res) => {
  const { region } = req.params;
  try {
    console.log(`📊 Usagers pour la région: ${region}`);
    
    const types = [
      { id: 'hotel', table: 'usagers_hotel', label: 'Hôtel' },
      { id: 'grand-surface', table: 'usagers_magasin', label: 'Grand Surface' },
      { id: 'media', table: 'usagers_media', label: 'Télé/Radio' },
      { id: 'occ', table: 'usagers_occasionnel', label: 'OCC' },
      { id: 'bus', table: 'usagers_bus', label: 'Bus' },
      { id: 'nightclub', table: 'usagers_nightclub', label: 'Night club' }
    ];
    
    const usagersRegion = [];
    let totalRegion = 0;
    
    for (const type of types) {
      const usagersResult = await pool.query(
        `SELECT id, denomination FROM ${type.table} WHERE region = $1 OR region IS NULL`,
        [region]
      );
      
      for (const usager of usagersResult.rows) {
        // Récupérer les paiements depuis paiements_mensuels
        const paiementsResult = await pool.query(
          `SELECT montant FROM paiements_mensuels 
           WHERE usager_id = $1 AND usager_type = $2`,
          [usager.id, type.id]
        );
        
        let montantPaye = 0;
        let nbPaiements = 0;
        for (const p of paiementsResult.rows) {
          montantPaye += parseFloat(p.montant) || 0;
          nbPaiements++;
        }
        
        totalRegion += montantPaye;
        usagersRegion.push({
          id: usager.id,
          denomination: usager.denomination || 'Usager',
          type: type.id,
          typeLabel: type.label,
          montantPaye: montantPaye,
          nbPaiements: nbPaiements
        });
      }
    }
    
    usagersRegion.sort((a, b) => b.montantPaye - a.montantPaye);
    
    res.json({
      success: true,
      region,
      totalRegion,
      totalUsagers: usagersRegion.length,
      usagers: usagersRegion
    });
  } catch (error) {
    console.error('❌ Erreur calcul montant région usagers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// GET - Montant total global (UTILISE paiements_mensuels)
// ============================================================
router.get('/finance/montant-total-global', async (req, res) => {
  try {
    console.log('📊 Calcul du montant total global (paiements_mensuels)...');
    
    const types = [
      { id: 'hotel', table: 'usagers_hotel' },
      { id: 'grand-surface', table: 'usagers_magasin' },
      { id: 'media', table: 'usagers_media' },
      { id: 'occ', table: 'usagers_occasionnel' },
      { id: 'bus', table: 'usagers_bus' },
      { id: 'nightclub', table: 'usagers_nightclub' }
    ];
    
    let totalGlobal = 0;
    let totalUsagers = 0;
    let totalAvecPaiement = 0;
    let totalSansPaiement = 0;
    const detailsParType = {};
    
    for (const type of types) {
      // Récupérer tous les usagers
      const usagersResult = await pool.query(`SELECT id FROM ${type.table}`);
      totalUsagers += usagersResult.rows.length;
      
      let montantType = 0;
      let avecPaiement = 0;
      
      for (const usager of usagersResult.rows) {
        // Récupérer les paiements depuis paiements_mensuels
        const paiementsResult = await pool.query(
          `SELECT montant FROM paiements_mensuels 
           WHERE usager_id = $1 AND usager_type = $2`,
          [usager.id, type.id]
        );
        
        let montantPaye = 0;
        for (const p of paiementsResult.rows) {
          montantPaye += parseFloat(p.montant) || 0;
        }
        
        montantType += montantPaye;
        if (montantPaye > 0) avecPaiement++;
      }
      
      totalGlobal += montantType;
      totalAvecPaiement += avecPaiement;
      totalSansPaiement += usagersResult.rows.length - avecPaiement;
      
      detailsParType[type.id] = {
        total: usagersResult.rows.length,
        avecPaiement,
        sansPaiement: usagersResult.rows.length - avecPaiement,
        montant: montantType
      };
    }
    
    res.json({
      success: true,
      totalGlobal,
      totalUsagers,
      totalAvecPaiement,
      totalSansPaiement,
      detailsParType
    });
  } catch (error) {
    console.error('❌ Erreur calcul montant total global:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;