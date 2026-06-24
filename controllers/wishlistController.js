const Wishlist = require("../models/wishlistModel");
const Product = require("../models/productModel");

// 🧩 Add product to wishlist
exports.addToWishlist = async (req, res) => {
  const userId = req.user._id; // comes from auth middleware
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  // check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // find or create wishlist for user
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [] });
  }

  // check if already added
  if (wishlist.products.includes(productId)) {
    return res.status(400).json({ message: "Product already in wishlist" });
  }

  wishlist.products.push(productId);
  await wishlist.save();

  res.status(200).json({
    message: "✅ Product added to wishlist",
    wishlist,
  });
};

// ❌ Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    return res.status(404).json({ message: "Wishlist not found" });
  }

  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );

  await wishlist.save();

  res.status(200).json({
    message: "🗑️ Product removed from wishlist",
    wishlist,
  });
};

// 🧾 Get my wishlist
exports.getMyWishlist = async (req, res) => {
  const userId = req.user._id;

  const wishlist = await Wishlist.findOne({ user: userId })
    .populate("products") // to show product details
    .populate("user", "name email");

  if (!wishlist) {
    return res.status(404).json({ message: "No wishlist found" });
  }

  res.status(200).json({
    message: "📦 Your wishlist fetched successfully",
    wishlist,
  });
};
