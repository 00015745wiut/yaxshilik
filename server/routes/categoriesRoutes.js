const { Router } = require('express');
const { getAllCategories } = require('../controllers/categoriesController');

const router = Router();

router.get('/', getAllCategories);

module.exports = router;
