const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const handleAsync = require('../utils/handleAsync');


// =========================
// 🚀 PRODUCT ROUTES
// =========================

// =========================
// 🚀 PRODUCT ROUTES
// =========================

router.post('/', protect, upload.array('images', 6), handleAsync(productController.createProduct));

router.get('/my-products', protect, handleAsync(productController.getMyProducts));

router.get('/featured-products', protect, handleAsync(productController.getFeaturedProducts));

router.get('/filter', handleAsync(productController.getProductByFilter));

router.get('/near', protect, handleAsync(productController.getNearProducts));

router.get('/', handleAsync(productController.listProducts));

router.get('/category/:categoryId', handleAsync(productController.getProductsByCategory));

router.get('/seller/:sellerId', handleAsync(productController.getProductsBySeller));

router.put('/:productId', protect, upload.array('images', 6), handleAsync(productController.updateProduct));
router.delete('/:productId', protect, handleAsync(productController.deleteProduct));

router.get('/carbon-overview', protect, admin, handleAsync(productController.getCarbonOverview));

router.get('/admin/stats', protect, admin, handleAsync(productController.getAdminStats));
router.get('/admin/category-distribution', protect, admin, handleAsync(productController.getAdminCategoryDistribution));
router.get('/admin/avg-price-by-category', protect, admin, handleAsync(productController.getAdminAvgPriceByCategory));
router.get('/admin/top-category-sales', protect, admin, handleAsync(productController.getAdminTopCategorySales));

router.post('/:productId/reviews', protect, handleAsync(reviewController.createReview));
router.get('/:productId/reviews', handleAsync(reviewController.getReviews));

router.post('/:productId/report', protect, handleAsync(productController.reportProduct));

router.patch('/:productId/mark-sold', protect, handleAsync(productController.markAsSold));

// ⚠️ THIS MUST BE LAST
router.get('/:productId', handleAsync(productController.getProductById));

module.exports = router;
