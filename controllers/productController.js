// controllers/productController.js
const mongoose = require("mongoose");
const axios = require("axios");
const crypto = require("crypto");
const Product = require("../models/productModel");
const handleAsync = require("../utils/handleAsync");
const { cloudinary, uploadFromBuffer } = require("../config/cloudinary");
const generateSlug = require("../utils/generateSlug");
const FeaturedProduct = require("../models/featuredProductModel");
const NotificationManager = require('../services/notificationManager');
const { resolveProductCategoryId } = require('../utils/resolveProductCategory');
const { ensureCategories } = require('../scripts/ensureCategories');


// ==================================================
// 🟢 CREATE PRODUCT (Seller adds new product)
// ==================================================
function hashValue(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeImei(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function validateImeiLuhn(imei) {
  const s = String(imei || "").replace(/\D/g, "");
  if (s.length !== 15) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(s[i]);
    if ((i % 2) === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (sum % 10) === 0;
}

function normalizeVehicleNumber(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

exports.createProduct = handleAsync(async (req, res) => {
  console.log("Creating product:", req.body.title);
  if (req.files) console.log("Files received:", req.files.length);
  else console.log("No files received");

  const data = { ...req.body };
  data.seller = req.user.id;

  if (!data.title || !data.description) {
    return res.status(400).json({ message: "Title and description are required" });
  }
  if (data.price === undefined || data.price === null || data.price === "") {
    return res.status(400).json({ message: "Price is required" });
  }
  data.price = Number(data.price);
  if (Number.isNaN(data.price) || data.price < 0) {
    return res.status(400).json({ message: "Price must be a valid non-negative number" });
  }

  await ensureCategories();
  const resolvedCategoryId = await resolveProductCategoryId(data.category, data.categoryTitle);
  if (!resolvedCategoryId) {
    return res.status(400).json({ message: "Please pick a product type and try again" });
  }
  data.category = resolvedCategoryId;

  const titleLower = String(data.title || "").toLowerCase();
  const categoryTitleLower = String(data.categoryTitle || "").toLowerCase();
  const isPhoneLike =
    /mobile|phone|iphone|android/.test(titleLower) ||
    /mobile|phone/.test(categoryTitleLower);
  const isVehicleLike =
    /car|bike|scooter|vehicle/.test(titleLower) ||
    /car|bike|scooter|vehicle/.test(categoryTitleLower);

  if (isPhoneLike && data.imei) {
    const imeiNormalized = normalizeImei(data.imei);
    if (!imeiNormalized || !validateImeiLuhn(imeiNormalized)) {
      return res.status(400).json({ message: "Please enter a valid 15-digit IMEI number, or leave the field empty." });
    }
    data.imeiHash = hashValue(imeiNormalized);
    data.imeiLast4 = imeiNormalized.slice(-4);
  }

  if (isVehicleLike && data.vehicleNumber) {
    const vehicleNormalized = normalizeVehicleNumber(data.vehicleNumber);
    if (!vehicleNormalized || vehicleNormalized.length < 4) {
      return res.status(400).json({ message: "Please enter a valid vehicle number, or leave the field empty." });
    }
    data.vehicleNumberHash = hashValue(vehicleNormalized);
    data.vehicleNumberLast4 = vehicleNormalized.slice(-4);
  }

  if (data.videoUrl) {
    const videoUrl = typeof data.videoUrl === "string" ? data.videoUrl.trim() : "";
    const looksUrl = /^https?:\/\//i.test(videoUrl);
    if (!looksUrl) {
      return res.status(400).json({ message: "Please enter a valid video URL starting with http:// or https://, or leave the field empty." });
    }
    data.videoUrl = videoUrl;
  } else {
    delete data.videoUrl;
  }

  delete data.imei;
  delete data.vehicleNumber;
  delete data.categoryTitle;

  if (typeof data.location === "string") {
    try {
      const locObj = JSON.parse(data.location);
      const parts = [locObj.area, locObj.city, locObj.state, locObj.pincode].filter(Boolean);
      data.location = parts.join(", ") || data.location;
    } catch (_) {
      // keep as is
    }
  }

  const minPhotos = process.env.NODE_ENV === "development" ? 1 : 4;
  if (!req.files || req.files.length < minPhotos) {
    return res.status(400).json({
      message:
        minPhotos === 1
          ? "Please upload at least 1 photo"
          : "Please upload at least 4 photos showing all sides of the item",
    });
  }

  if (req.files && req.files.length > 0) {
    try {
      const uploadResults = await Promise.all(
        req.files.map((file) => uploadFromBuffer(file.buffer, { folder: "products" }))
      );
      data.images = uploadResults.map((r) => ({
        url: r.secure_url,
        public_id: r.public_id,
      }));
    } catch (err) {
      // Fallback: store as data URLs so creation doesn't fail if Cloudinary is misconfigured
      data.images = req.files.map((file, i) => {
        const b64 = file.buffer.toString("base64");
        const url = `data:${file.mimetype};base64,${b64}`;
        return { url, public_id: `local-${Date.now()}-${i}` };
      });
    }
  }

  if (data.imeiHash) {
    const existingImei = await Product.findOne({ imeiHash: data.imeiHash, isSold: false }).select("_id");
    if (existingImei) {
      return res.status(409).json({ message: "This IMEI is already listed and active. Please verify ownership or contact support." });
    }
  }
  if (data.vehicleNumberHash) {
    const existingVeh = await Product.findOne({ vehicleNumberHash: data.vehicleNumberHash, isSold: false }).select("_id");
    if (existingVeh) {
      return res.status(409).json({ message: "This vehicle number is already listed and active. Please verify ownership or contact support." });
    }
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
  if (req.query.type) filter.type = req.query.type;
  if (req.query.location) filter.location = { $regex: req.query.location, $options: "i" };
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
    product = await Product.findById(productId)
      .populate("seller", "name email avatar")
      .populate("category", "title");
  } else {
    product = await Product.findOne({ slug: productId })
      .populate("seller", "name email avatar")
      .populate("category", "title");
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
    if (req.files.length < 4) {
      return res.status(400).json({ message: "Please upload at least 4 photos showing all sides of the item" });
    }
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
  if (req.query.location) filter.location = { $regex: req.query.location, $options: "i" };
  if (req.query.location) filter.location = { $regex: req.query.location, $options: "i" };

  let sort = { createdAt: -1 };
  if (req.query.sort === "price_asc") sort = { price: 1 };
  if (req.query.sort === "price_desc") sort = { price: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("seller", "name avatar")
      .populate("category", "title")
      .sort(sort)
      .skip(skip)
      .limit(limit),
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
// 👤 GET PRODUCTS BY SELLER (Public Profile)
// ==================================================
exports.getProductsBySeller = handleAsync(async (req, res) => {
  const { sellerId } = req.params;
  // find seller's active products
  const products = await Product.find({ seller: sellerId })
    .sort({ createdAt: -1 })
    .populate('category', 'name icon');

  res.json({ success: true, count: products.length, products });
});


// ==================================================
// 💬 ADD REVIEW TO PRODUCT
// ==================================================
exports.addReview = handleAsync(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  // Populate seller so we can notify them
  const product = await Product.findById(productId).populate('seller');
  if (!product) return res.status(404).json({ message: "Product not found" });

  const review = {
    user: req.user.id,
    rating: Number(rating),
    comment,
    date: new Date(),
  };

  product.reviews.push(review);
  await product.save();

  // 🔔 Notify Seller
  if (product.seller && product.seller._id.toString() !== req.user.id) {
     NotificationManager.notify(product.seller, 'new_review', { 
       productName: product.title,
       rating: rating,
       comment: comment
     }, { sendEmail: true, sendSms: false }) // Email only for reviews usually
     .catch(e => console.error("Notify Error:", e));
  }

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

  // 🤖 AUTO-MODERATION: Hide product if reports > 3
  if (product.reports.length > 3) {
    product.isSold = true; // Or use a new field 'isHidden'
    // Notify Admin (optional)
    console.log(`[AutoMod] Product ${product._id} hidden due to excessive reports.`);
  }

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
  product.soldAt = new Date();
  try {
    const catName = (await product.populate('category', 'title'))?.category?.title || '';
    const title = product.title || '';
    const pickType = () => {
      const t = title.toLowerCase();
      if (t.includes('laptop')) return 'Laptop';
      if (t.includes('mobile') || t.includes('phone') || t.includes('iphone') || t.includes('android')) return 'Mobile';
      if (catName && /furniture/i.test(catName)) return 'Furniture';
      if (catName && /fashion|clothing|apparel/i.test(catName)) return 'Fashion';
      if (catName && /electronic/i.test(catName)) return 'Electronics';
      return 'Default';
    };
    const type = pickType();
    const coeff = { Laptop: 200, Mobile: 70, Furniture: 100, Fashion: 25, Electronics: 120, Default: 60 };
    const harmCoeff = { Laptop: 3.0, Mobile: 1.8, Furniture: 5.0, Fashion: 0.8, Electronics: 2.5, Default: 1.0 };
    const savedFactor = 0.7;
    const avoidedHarmFactor = 0.6;
    const base = coeff[type] ?? coeff.Default;
    const harmBase = harmCoeff[type] ?? harmCoeff.Default;
    const savedCo2Kg = Number((base * savedFactor).toFixed(1));
    const avoidedWasteKg = Number((1.5).toFixed(1));
    const harmNewKg = Number(harmBase.toFixed(2));
    const harmAvoidedKg = Number((harmBase * avoidedHarmFactor).toFixed(2));
    product.environment = { savedCo2Kg, avoidedWasteKg, harmNewKg, harmAvoidedKg };
  } catch (e) {}
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

exports.getCarbonOverview = handleAsync(async (req, res) => {
  const products = await Product.find({}).populate('category', 'title name');
  const coeff = { Laptop: 200, Mobile: 70, Furniture: 100, Fashion: 25, Electronics: 120, Default: 60 };
  const savedFactor = 0.7;
  const pickType = (p) => {
    const t = (p.title || '').toLowerCase();
    const catTitle = (p.category?.title || p.category?.name || '');
    if (t.includes('laptop')) return 'Laptop';
    if (t.includes('mobile') || t.includes('phone') || t.includes('iphone') || t.includes('android')) return 'Mobile';
    if (catTitle && /furniture/i.test(catTitle)) return 'Furniture';
    if (catTitle && /fashion|clothing|apparel/i.test(catTitle)) return 'Fashion';
    if (catTitle && /electronic/i.test(catTitle)) return 'Electronics';
    return 'Default';
  };
  const byCat = {};
  let currentSaved = 0;
  let potentialSaved = 0;
  for (const p of products) {
    const type = pickType(p);
    const base = coeff[type] ?? coeff.Default;
    const savedSold = Number((base * savedFactor).toFixed(1));
    const saved = p.isSold ? (p.environment?.savedCo2Kg ?? savedSold) : savedSold;
    byCat[type] = (byCat[type] || 0) + saved;
    if (p.isSold) currentSaved += p.environment?.savedCo2Kg ?? savedSold;
    potentialSaved += savedSold;
  }
  const chart = Object.keys(byCat).map((k) => ({ category: k, savedKgCO2: Number(byCat[k].toFixed(1)) }));
  res.json({
    success: true,
    chart,
    totalCurrentSaved: Number(currentSaved.toFixed(1)),
    totalPotentialSaved: Number(potentialSaved.toFixed(1)),
  });
});

// ==================================================
// 📈 ADMIN PRODUCT STATS (totals + last 30-day sales)
// ==================================================
exports.getAdminStats = handleAsync(async (req, res) => {
  const rangeDaysRaw = Number(req.query.rangeDays || 30);
  const rangeDays = Math.max(1, Math.min(isNaN(rangeDaysRaw) ? 30 : rangeDaysRaw, 365));
  
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - rangeDays);

  const [allCount, allValueAgg, soldAgg, unsoldCount, dailySales, dailyAdded] = await Promise.all([
    Product.countDocuments({}),
    Product.aggregate([{ $group: { _id: null, totalValue: { $sum: { $ifNull: ["$price", 0] } } } }]),
    Product.aggregate([
      { $match: { isSold: true } },
      { $group: { _id: null, totalSalesValue: { $sum: { $ifNull: ["$price", 0] } }, soldCount: { $sum: 1 } } }
    ]),
    Product.countDocuments({ isSold: false }),
    // Daily Sales (Sold products grouped by soldAt or updatedAt)
    Product.aggregate([
      { 
        $match: { 
          isSold: true, 
          updatedAt: { $gte: dateLimit } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          total: { $sum: "$price" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", total: 1, count: 1, _id: 0 } }
    ]),
    // Daily Added (Products created grouped by createdAt)
    Product.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateLimit } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalValue: { $sum: "$price" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", totalValue: 1, count: 1, _id: 0 } }
    ])
  ]);

  const all = await Product.aggregate([
    { $group: { _id: "$category", avgPrice: { $avg: { $ifNull: ["$price", 0] } }, count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        avgPrice: 1,
        count: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { avgPrice: -1 } },
  ]);

  const sold = await Product.aggregate([
    { $match: { isSold: true } },
    { $group: { _id: "$category", avgPrice: { $avg: { $ifNull: ["$price", 0] } }, count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        avgPrice: 1,
        count: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { avgPrice: -1 } },
  ]);

  res.json({ 
    success: true, 
    all, 
    sold,
    dailySales,
    dailyAdded,
    totals: {
      totalProducts: allCount,
      totalValue: allValueAgg[0]?.totalValue || 0,
      totalSalesValue: soldAgg[0]?.totalSalesValue || 0,
      soldCount: soldAgg[0]?.soldCount || 0,
      unsoldCount
    }
  });
});

exports.getAdminCategoryDistribution = handleAsync(async (req, res) => {
  const byCat = await Product.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        count: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, categories: byCat });
});

exports.getAdminAvgPriceByCategory = handleAsync(async (req, res) => {
  const all = await Product.aggregate([
    { $group: { _id: "$category", avgPrice: { $avg: { $ifNull: ["$price", 0] } }, count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        avgPrice: 1,
        count: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { avgPrice: -1 } },
  ]);
  const sold = await Product.aggregate([
    { $match: { isSold: true } },
    { $group: { _id: "$category", avgPrice: { $avg: { $ifNull: ["$price", 0] } }, count: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        avgPrice: 1,
        count: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { avgPrice: -1 } },
  ]);
  res.json({ success: true, all, sold });
});

exports.getAdminTopCategorySales = handleAsync(async (req, res) => {
  const top = await Product.aggregate([
    { $match: { isSold: true } },
    { $group: { _id: "$category", totalSales: { $sum: { $ifNull: ["$price", 0] } }, soldCount: { $sum: 1 } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        categoryId: "$_id",
        totalSales: 1,
        soldCount: 1,
        title: { $ifNull: [{ $arrayElemAt: ["$cat.title", 0] }, "" ] },
      },
    },
    { $sort: { totalSales: -1 } },
  ]);
  res.json({ success: true, categories: top });
});

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.recommendProducts = handleAsync(async (req, res) => {
  const {
    brand,
    model,
    yearOfPurchase,
    condition,
    minPrice,
    maxPrice,
    page: rawPage,
    limit: rawLimit,
  } = req.body || {};

  if (!brand || !model || !yearOfPurchase) {
    return res.status(400).json({ message: "brand, model and yearOfPurchase are required" });
  }

  const page = Math.max(1, Number(rawPage) || 1);
  const limit = Math.max(1, Math.min(50, Number(rawLimit) || 20));
  const skip = (page - 1) * limit;

  const filter = { isSold: false };

  if (brand) {
    filter.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
  }
  if (model) {
    filter.model = { $regex: escapeRegex(model), $options: "i" };
  }
  if (yearOfPurchase) {
    const year = Number(yearOfPurchase);
    if (!Number.isNaN(year) && year > 1990) {
      filter.yearOfPurchase = { $gte: year - 6, $lte: year };
    }
  }
  if (condition) {
    filter.condition = condition;
  }

  let targetPrice = null;
  let priceMin = minPrice !== undefined && minPrice !== null ? Number(minPrice) : null;
  let priceMax = maxPrice !== undefined && maxPrice !== null ? Number(maxPrice) : null;

  if ((priceMin === null || Number.isNaN(priceMin)) && (priceMax === null || Number.isNaN(priceMax))) {
    const dsUrl = process.env.DS_SERVICE_URL || "http://localhost:8000/predict-price";
    try {
      const resp = await axios.post(dsUrl, {
        category: brand,
        condition: condition || "Used",
        original_price: 10000,
      });
      const rec = Number(resp.data && resp.data.recommended_price);
      if (!Number.isNaN(rec) && rec > 0) {
        targetPrice = rec;
        priceMin = Math.floor(rec * 0.5);
        priceMax = Math.ceil(rec * 1.6);
      }
    } catch (e) {}
  }

  if (priceMin !== null && !Number.isNaN(priceMin)) {
    filter.price = { ...(filter.price || {}), $gte: priceMin };
  }
  if (priceMax !== null && !Number.isNaN(priceMax)) {
    filter.price = { ...(filter.price || {}), $lte: priceMax };
  }

  const sort = {
    isSold: 1,
    rating: -1,
    yearOfPurchase: -1,
    price: 1,
    createdAt: -1,
  };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("seller", "name email avatar")
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    total,
    page,
    limit,
    targetPrice,
    products,
  });
});

