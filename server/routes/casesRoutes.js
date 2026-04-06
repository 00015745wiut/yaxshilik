const { Router } = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  getAdminStats,
} = require('../controllers/casesController');

const router = Router();

// Validation rules shared by create and update
const caseValidation = [
  body('title').trim().escape()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description').trim()           // trim only — preserve user formatting
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('goal_amount')
    .isFloat({ gt: 0 })
    .withMessage('Goal amount must be greater than 0'),
  body('category_id')
    .isInt({ gt: 0 })
    .withMessage('A valid category is required'),
];

const updateValidation = [
  body('title').optional().trim().escape()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description').optional().trim()
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('goal_amount').optional().isFloat({ gt: 0 })
    .withMessage('Goal amount must be greater than 0'),
  body('category_id').optional().isInt({ gt: 0 })
    .withMessage('A valid category is required'),
  body('status').optional().isIn(['active', 'completed', 'closed'])
    .withMessage('Status must be active, completed, or closed'),
];

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', getAllCases);
router.get('/admin/stats', authenticate, authorizeAdmin, getAdminStats);
router.get('/:id', param('id').isInt().withMessage('Invalid case ID'), getCaseById);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  upload.single('image'),
  caseValidation,
  createCase
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  upload.single('image'),
  updateValidation,
  updateCase
);

router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  param('id').isInt().withMessage('Invalid case ID'),
  deleteCase
);

module.exports = router;
