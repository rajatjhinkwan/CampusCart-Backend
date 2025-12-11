const Review = require('../models/reviewModel');
const Product = require('../models/productModel');
const handleAsync = require('../utils/handleAsync');

// 🌟 Create a review
exports.createReview = handleAsync(async (req, res) => {
  const { productId, rating, text } = req.body;

  if (!productId || !rating) {
    return res.status(400).json({ message: '❌ productId and rating are required' });
  }

  // check if user already reviewed this product
  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    return res.status(400).json({ message: '⚠️ You already reviewed this product' });
  }

  // create new review
  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating,
    text,
  });

  // recalculate average rating for the product
  const stats = await Review.aggregate([
    { $match: { product: review.product } },
    {
      $group: {
        _id: '$product',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length) {
    await Product.findByIdAndUpdate(productId, {
      rating: stats[0].avg,
      reviewCount: stats[0].count,
    });
  }

  res.status(201).json({
    message: "✅ Review added successfully",
    review,
  });
});

// 📦 Get all reviews for a product
exports.getProductReviews = handleAsync(async (req, res) => {
  const { productId } = req.params;

  const reviews = await Review.find({ product: productId })
    .populate('user', 'name email avatar') // show reviewer details
    .sort({ createdAt: -1 }); // latest first

  res.status(200).json({
    message: "📋 Product reviews fetched successfully",
    reviews,
  });
});
