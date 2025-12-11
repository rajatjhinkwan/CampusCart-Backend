const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const handleAsync = require('../utils/handleAsync');


// =========================
// 🚀 PRODUCT ROUTES
// =========================

router.post('/', protect, upload.array('images', 6), handleAsync(productController.createProduct));

router.get('/my-products', protect, handleAsync(productController.getMyProducts));

router.put('/:productId', protect, upload.array('images', 6), handleAsync(productController.updateProduct));

router.get('/filter', handleAsync(productController.getProductByFilter));

router.get('/:productId', handleAsync(productController.getProductById));

router.get('/', handleAsync(productController.listProducts));

router.get('/category/:categoryId', handleAsync(productController.getProductsByCategory));

router.post('/:productId/reviews', protect, handleAsync(productController.addReview));

router.post('/:productId/report', protect, handleAsync(productController.reportProduct));

router.patch('/:productId/mark-sold', protect, handleAsync(productController.markAsSold));

router.get('/featured-products', protect, handleAsync(productController.getFeaturedProducts));

router.get('/near', protect, handleAsync(productController.getNearProducts));


// ⚠️ THIS MUST BE LAST
router.get('/:productId', handleAsync(productController.getProductById));

module.exports = router;
