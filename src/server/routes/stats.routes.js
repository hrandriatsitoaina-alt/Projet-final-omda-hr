// ============================================================
// GET - Statistiques générales
// ============================================================
router.get('/stats/general', async (req, res) => {
    try {
      // Remplacer ces requêtes par vos vraies tables
      const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM categories');
      const sousCategoriesResult = await pool.query('SELECT COUNT(*) as count FROM sous_categories');
      const documentsResult = await pool.query('SELECT COUNT(*) as count FROM documents');
      const commercesResult = await pool.query('SELECT COUNT(*) as count FROM commerces');
      const restrictionsResult = await pool.query('SELECT COUNT(*) as count FROM restrictions');
      const tauxResult = await pool.query('SELECT AVG(taux) as avg_taux FROM taux');
  
      res.json({
        success: true,
        categories: parseInt(categoriesResult.rows[0].count) || 0,
        sousCategories: parseInt(sousCategoriesResult.rows[0].count) || 0,
        documents: parseInt(documentsResult.rows[0].count) || 0,
        commerces: parseInt(commercesResult.rows[0].count) || 0,
        restrictions: parseInt(restrictionsResult.rows[0].count) || 0,
        taux: Math.round(parseFloat(tauxResult.rows[0].avg_taux) * 100) / 100 || 0
      });
    } catch (error) {
      console.error('❌ Erreur stats générales:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });