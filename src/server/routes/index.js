// server/routes/index.js
const express = require('express');
const router = express.Router();

const accesDafRoutes = require('./accesDaf.routes');
const authRoutes = require('./auth.routes');
const usagersRoutes = require('./usagers.routes');
const regionsRoutes = require('./regions.routes');
const adminRoutes = require('./admin.routes');
const paiementsRoutes = require('./paiements.routes');
const financeRoutes = require('./finance.routes');
const backupRoutes = require('./backup.routes');
const notificationsRoutes = require('./notifications.routes');
const profileRoutes = require('./profile.routes');
const factureRoutes = require('./facture.routes');
const artistesRoutes = require('./artistes.routes');
const parametreRoutes = require('./parametre.routes');
const verificationRoutes = require('./verification.routes');
const recfactureRoutes = require('./recfacture.routes');
const quitanceRoutes = require('./quitance.routes');
const bilanRoutes = require('./bilan.routes');
const repartitionRoutes = require('./repartition.routes');
const generateursiaRoutes = require('./generateursia.routes');
const otherusagerRoutes = require('./otherusager.routes');
const deleteRoutes = require('./delete.routes');
const comptRoutes = require('./compt.routes');


const gestionbdAdminRoutes = require('./gestionbdAdmin.route');

router.use(accesDafRoutes);
router.use(authRoutes);
router.use(usagersRoutes);
router.use(regionsRoutes);
router.use(adminRoutes);
router.use(paiementsRoutes);
router.use(financeRoutes);
router.use(backupRoutes);
router.use(notificationsRoutes);
router.use(profileRoutes);
router.use(factureRoutes);
router.use(artistesRoutes);
router.use(parametreRoutes);
router.use(verificationRoutes);
router.use(recfactureRoutes);
router.use(quitanceRoutes);
router.use(bilanRoutes);
router.use(repartitionRoutes);
router.use(generateursiaRoutes);
router.use(otherusagerRoutes);
router.use(deleteRoutes);
router.use(comptRoutes);


router.use(gestionbdAdminRoutes);

module.exports = router;