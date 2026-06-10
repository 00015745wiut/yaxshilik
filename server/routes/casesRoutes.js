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
  deleteCaseProof,
  getAdminStats,
} = require('../controllers/casesController');

const router = Router();

// Case form accepts the main image plus categorised proof files.
const caseUpload = upload.fields([
  { name: 'image',           maxCount: 1  },
  { name: 'proof_documents', maxCount: 10 },
  { name: 'proof_photos',    maxCount: 10 },
  { name: 'proof_videos',    maxCount: 5  },
]);

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
  caseUpload,
  caseValidation,
  createCase
);

router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  caseUpload,
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

router.delete(
  '/:id/proofs/:proofId',
  authenticate,
  authorizeAdmin,
  param('id').isInt().withMessage('Invalid case ID'),
  param('proofId').isInt().withMessage('Invalid proof ID'),
  deleteCaseProof
);

module.exports = router;
