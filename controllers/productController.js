// controllers/productController.js
const mongoose = require("mongoose");
const Product = require("../models/productModel");
const handleAsync = require("../utils/handleAsync");
const { cloudinary, uploadFromBuffer } = require("../config/cloudinary");
const generateSlug = require("../utils/generateSlug");
const FeaturedProduct = require("../models/featuredProductModel");


// ==================================================
// 🟢 CREATE PRODUCT (Seller adds new product)
// ==================================================
exports.createProduct = handleAsync(async (req, res) => {
  const data = req.body;
  data.seller = req.user.id; // 🧑‍💼 Product owner

  // 🖼️ Upload multiple images to Cloudinary (max 6)
  if (req.files && req.files.length > 0) {
    const uploadResults = await Promise.all(
      req.files.map((file) => uploadFromBuffer(file.buffer, { folder: "products" }))
    );

    // store array of objects like: [{ url, public_id }]
    data.images = uploadResults.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));
  }

  // 🧩 Generate slug from title if not provided
  if (!data.slug && data.title) {
    data.slug = await generateSlug(data.title);
  }

  // 💾 Save product
  const product = await Product.create(data);

  res.status(201).json({ success: true, product });
});

exports.getMyProducts = handleAsync(async (req, res) => {
  // 1. Find products where seller matches logged-in user
  // 2. Populate: Get the 'name' from the User model based on the seller ID
  // 3. Sort: Show newest items first (-1)
  const products = await Product.find({ seller: req.user.id })
    .populate("seller", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});


// ==================================================
// 🔍 GET PRODUCTS (Public - with pagination, search, filter, sort)
// ==================================================
exports.getProducts = handleAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.minPrice) filter.price = { ...filter.price, $gte: Number(req.query.minPrice) };
  if (req.query.maxPrice) filter.price = { ...filter.price, $lte: Number(req.query.maxPrice) };
  if (req.query.condition) filter.condition = req.query.condition;
  if (req.query.search) filter.$text = { $search: req.query.search }; // text index needed

  let sort = { createdAt: -1 };
  if (req.query.sort === "price_asc") sort = { price: 1 };
  if (req.query.sort === "price_desc") sort = { price: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    products,
  });
});


// ==================================================
// 🧾 GET SINGLE PRODUCT (By ID or Slug)
// ==================================================
exports.getProductById = handleAsync(async (req, res) => {
  const { productId } = req.params;
  let product;

  if (mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId).populate("seller", "name email");
  } else {
    product = await Product.findOne({ slug: productId }).populate("seller", "name email");
  }

  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ success: true, product });
});


// ==================================================
// ✏️ UPDATE PRODUCT (Only Owner or Admin)
// ==================================================
exports.updateProduct = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);

  if (!product) return res.status(404).json({ message: "Product not found" });

  // 🔐 Authorization check
  if (product.seller.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to update this product" });
  }

  // 🖼️ If new images are uploaded
  if (req.files && req.files.length > 0) {
    // Delete old images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((img) =>
        cloudinary.uploader.destroy(img.public_id)
      );
      await Promise.allSettled(deletePromises);
    }

    // Upload new images
    const uploadResults = await Promise.all(
      req.files.map((file) => uploadFromBuffer(file.buffer, { folder: "products" }))
    );

    req.body.images = uploadResults.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));
  }

  // 🧩 Merge updates
  Object.assign(product, req.body);
  await product.save();

  res.json({ success: true, product });
});


// ==================================================
// 🗑️ DELETE PRODUCT (Only Owner or Admin)
// ==================================================
exports.deleteProduct = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);

  if (!product) return res.status(404).json({ message: "Product not found" });

  if (product.seller.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to delete this product" });
  }

  if (product.images && product.images.length > 0) {
    const deletePromises = product.images.map((img) =>
      cloudinary.uploader.destroy(img.public_id)
    );
    await Promise.allSettled(deletePromises);
  }

  await product.deleteOne();

  res.json({ success: true, message: "Product deleted successfully" });
});


// ==================================================
// 🧭 LIST PRODUCTS (Pagination + Filters + Sorting)
// ==================================================
exports.listProducts = handleAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.q) filter.title = { $regex: req.query.q, $options: "i" };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.min) filter.price = { ...filter.price, $gte: Number(req.query.min) };
  if (req.query.max) filter.price = { ...filter.price, $lte: Number(req.query.max) };

  let sort = { createdAt: -1 };
  if (req.query.sort === "price_asc") sort = { price: 1 };
  if (req.query.sort === "price_desc") sort = { price: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    products,
  });
});


// ==================================================
// 📦 GET PRODUCTS BY CATEGORY
// ==================================================
exports.getProductsByCategory = handleAsync(async (req, res) => {
  const { categoryId } = req.params;
  const products = await Product.find({ category: categoryId, isSold: false }).sort({
    createdAt: -1,
  });

  if (!products.length)
    return res.status(404).json({ message: "No products found for this category" });

  res.json({ success: true, count: products.length, products });
});


// ==================================================
// 💬 ADD REVIEW TO PRODUCT
// ==================================================
exports.addReview = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const review = {
    user: req.user.id,
    rating: Number(rating),
    comment,
    date: new Date(),
  };

  product.reviews.push(review);
  await product.save();

  res.json({ success: true, message: "Review added successfully", review });
});


// ==================================================
// 🚩 REPORT PRODUCT (For inappropriate or fake ads)
// ==================================================
exports.reportProduct = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const { reason } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.reports.push({
    user: req.user ? req.user.id : null,
    reason,
    date: new Date(),
  });

  await product.save();
  res.json({ success: true, message: "Product reported successfully" });
});


// ==================================================
// ✅ MARK PRODUCT AS SOLD (Owner Only)
// ==================================================
exports.markAsSold = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);

  if (!product) return res.status(404).json({ message: "Product not found" });
  if (product.seller.toString() !== req.user.id) {
    return res.status(403).json({ message: "You are not the owner of this product" });
  }

  product.isSold = true;
  await product.save();

  res.json({ success: true, message: "Product marked as sold successfully", product });
});


exports.getFeaturedProducts = handleAsync(async (req, res) => {
  const products = await Product.find({ isFeatured: true })
    .sort({ createdAt: -1 })
    .populate("category", "name slug icon")
    .populate("seller", "name email avatar")
    .lean();

  return res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});


exports.getLatestListings = handleAsync(async (req, res) => {
  const products = await Product.find()
    .sort({ createdAt: -1 })     // latest first
    .limit(20)                   // show top 20 latest
    .lean();

  return res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});


exports.getNearProducts = async (req, res) => {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: "Coordinates missing" });
  }

  return res.json({ message: "Near API working!" });
};

exports.getProductByFilter = async (req, res) => {
  console.log("FILTER QUERY RECEIVED:", req.query);

  let {
    q,
    category,
    minPrice,
    maxPrice,
    condition,
    sort = "createdAt_desc",
    page = 1,
    limit = 20
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  let filter = {};

  // 🔍 TEXT SEARCH
  if (q) {
    filter.title = { $regex: q, $options: "i" };
  }

  // 🔍 CATEGORY FILTER
  if (category) {
    filter.category = category;
  }

  // 🔍 CONDITION FILTER
  if (condition) {
    filter.condition = condition;
  }

  // 🔍 PRICE FILTER — MAIN ISSUE FIXED
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  console.log("FINAL FILTER:", filter);

  // 🔽 SORTING
  const sortOptions = {};
  const [sortField, sortOrder] = sort.split("_");
  sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

  // 🧮 FETCH DATA
  const products = await Product.find(filter)
    .populate("seller", "name email")
    .populate("category")
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Product.countDocuments(filter);

  res.json({
    success: true,
    total,
    page,
    limit,
    products
  });
};

