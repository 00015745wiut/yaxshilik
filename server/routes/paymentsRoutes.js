const { Router } = require('express');
const { handlePaymentCallback } = require('../controllers/donationsController');

const router = Router();

// Public server-to-server callback from Multicard. No JWT — the request is
// authenticated by its signature (verified in the controller).
router.post('/callback', handlePaymentCallback);

module.exports = router;
