const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  createCheckout,
  getDonationStatus,
  getMyDonations,
  getDonationsByCase,
  getMyStats,
  getRecentDonations,
} = require('../controllers/donationsController');

const router = Router();

const donationValidation = [
  body('case_id')
    .isInt({ gt: 0 })
    .withMessage('A valid case_id is required'),
  body('amount')
    .isFloat({ min: 1000, max: 50_000_000 })
    .withMessage('Amount must be between 1,000 and 50,000,000'),
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message must be 200 characters or fewer'),
];

// Specific literal paths must come before /:param routes
router.get('/my/stats', authenticate,                  getMyStats);
router.get('/my',       authenticate,                  getMyDonations);
router.get('/recent',   authenticate, authorizeAdmin,  getRecentDonations);

// Start a payment: creates a pending donation + Multicard invoice
router.post(
  '/checkout',
  authenticate,
  donationValidation,
  createCheckout
);

// Poll a donation's payment status (owner only)
router.get(
  '/:id/status',
  authenticate,
  param('id').isInt({ gt: 0 }).withMessage('Invalid donation ID'),
  getDonationStatus
);

router.get(
  '/case/:caseId',
  authenticate,
  authorizeAdmin,
  param('caseId').isInt({ gt: 0 }).withMessage('Invalid case ID'),
  getDonationsByCase
);

module.exports = router;
