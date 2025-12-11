const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

/* ------------------------------------------------------
PUBLIC ROUTES — ANYONE CAN ACCESS
-------------------------------------------------------*/

// Get all categories (optionally filtered by type: ?type=product)
router.get('/', categoryController.getAllCategories);

// Get single category by ID or slug
router.get('/:id', categoryController.getCategoryById);

/* ------------------------------------------------------
ADMIN ROUTES — ONLY LOGGED IN ADMIN
-------------------------------------------------------*/

// Create a new category (main or subcategory)
router.post('/', auth.protect, admin, categoryController.createCategory);

// Update an existing category
router.put('/:id', auth.protect, admin, categoryController.updateCategory);

// Delete a category (and optionally its subcategories)
router.delete('/:id', auth.protect, admin, categoryController.deleteCategory);

// Increment / decrement listing count (optional)
router.post('/:id/increment', auth.protect, admin, categoryController.incrementCategoryCount);
router.post('/:id/decrement', auth.protect, admin, categoryController.decrementCategoryCount);

module.exports = router;
