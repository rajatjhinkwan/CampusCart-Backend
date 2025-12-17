const Review = require('../models/reviewModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const Room = require('../models/roomModel');
const handleAsync = require('../utils/handleAsync');

// 🌟 Create a review
exports.createReview = handleAsync(async (req, res) => {
  const { productId, serviceId, roomId } = req.params;
  const { rating, text } = req.body;

  if (!rating) {
    return res.status(400).json({ message: '❌ Rating is required' });
  }

  let targetModel, targetField, targetId;

  if (productId) {
    targetModel = Product;
    targetField = 'product';
    targetId = productId;
  } else if (serviceId) {
    targetModel = Service;
    targetField = 'service';
    targetId = serviceId;
  } else if (roomId) {
    targetModel = Room;
    targetField = 'room';
    targetId = roomId;
  } else {
    return res.status(400).json({ message: '❌ No target specified' });
  }

  // Check if target exists
  const target = await targetModel.findById(targetId);
  if (!target) {
    return res.status(404).json({ message: '❌ Target not found' });
  }

  // check if user already reviewed this target
  const existing = await Review.findOne({ [targetField]: targetId, user: req.user._id });
  if (existing) {
    return res.status(400).json({ message: '⚠️ You already reviewed this item' });
  }

  // create new review
  const review = await Review.create({
    [targetField]: targetId,
    user: req.user._id,
    rating,
    text,
  });

  // recalculate average rating
  const stats = await Review.aggregate([
    { $match: { [targetField]: review[targetField] } },
    {
      $group: {
        _id: `$${targetField}`,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length) {
    const avgRating = stats[0].avg;
    const count = stats[0].count;

    if (targetField === 'service') {
        // Service uses nested structure
        await targetModel.findByIdAndUpdate(targetId, {
            rating: { average: avgRating, count: count }
        });
    } else {
        // Product and Room use flat structure
        await targetModel.findByIdAndUpdate(targetId, {
            rating: avgRating,
            reviewCount: count,
        });
    }
  }

  res.status(201).json({
    message: "✅ Review added successfully",
    review,
  });
});

// 📦 Get all reviews for a target
exports.getReviews = handleAsync(async (req, res) => {
  const { productId, serviceId, roomId } = req.params;
  
  let query = {};
  if (productId) query.product = productId;
  else if (serviceId) query.service = serviceId;
  else if (roomId) query.room = roomId;
  else return res.status(400).json({ message: "❌ No target specified" });

  const reviews = await Review.find(query)
    .populate('user', 'name email avatar') // show reviewer details
    .sort({ createdAt: -1 }); // latest first

  res.status(200).json({
    message: "📋 Reviews fetched successfully",
    reviews,
    count: reviews.length
  });
});
