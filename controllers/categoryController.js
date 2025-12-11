// controllers/categoryController.js
const Category = require('../models/categoryModel');
const handleAsync = require('../utils/handleAsync');

/**
 * @desc Create a new category (main or subcategory)
 * @route POST /api/categories
 * @access Admin / Protected
 */
exports.createCategory = handleAsync(async (req, res) => {
  const { title, icon, type, parent, desc, color, isPopular } = req.body;

  // Validation
  if (!title || !icon || !type) {
    return res.status(400).json({ success: false, message: "Title, icon, and type are required" });
  }

  // Check if category already exists
  const existing = await Category.findOne({ title });
  if (existing) {
    return res.status(409).json({ success: false, message: "Category already exists" });
  }

  // If parent is provided, validate parent exists
  let parentCategory = null;
  if (parent) {
    parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(404).json({ success: false, message: "Parent category not found" });
    }
  }

  const newCategory = await Category.create({
    title,
    icon,
    type,
    parent: parentCategory ? parentCategory._id : null,
    desc: desc || "",
    color: color || "#000000",
    isPopular: isPopular || false,
  });

  res.status(201).json({ success: true, category: newCategory });
});


/**
 * @desc Get all categories
 * @route GET /api/categories
 * @access Public
 */
exports.getAllCategories = handleAsync(async (req, res) => {
  // Optional query: ?type=product or ?type=room
  const filter = {};
  if (req.query.type) filter.type = req.query.type;

  const categories = await Category.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: categories.length, categories });
});


/**
 * @desc Get a single category by ID or slug
 * @route GET /api/categories/:idOrSlug
 * @access Public
 */
exports.getCategoryById = handleAsync(async (req, res) => {
  const idOrSlug = req.params.idOrSlug;

  let category;
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    category = await Category.findById(idOrSlug);
  } else {
    category = await Category.findOne({ slug: idOrSlug });
  }

  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  res.json({ success: true, category });
});


/**
 * @desc Update a category
 * @route PUT /api/categories/:id
 * @access Admin / Protected
 */
exports.updateCategory = handleAsync(async (req, res) => {
  const { title, icon, type, parent, desc, color, isPopular } = req.body;

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  // If updating parent, validate it
  if (parent && parent !== category.parent?.toString()) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.status(404).json({ success: false, message: "Parent category not found" });
    }
    category.parent = parentCategory._id;
  }

  category.title = title || category.title;
  category.icon = icon || category.icon;
  category.type = type || category.type;
  category.desc = desc || category.desc;
  category.color = color || category.color;
  category.isPopular = isPopular !== undefined ? isPopular : category.isPopular;

  await category.save();

  res.json({ success: true, category });
});


/**
 * @desc Delete a category
 * @route DELETE /api/categories/:id
 * @access Admin / Protected
 */
exports.deleteCategory = handleAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  // Optional: also remove subcategories
  await Category.deleteMany({ parent: category._id });

  await category.remove();
  res.json({ success: true, message: "Category deleted" });
});


/**
 * @desc Increment listing count for a category
 * @route POST /api/categories/:id/increment
 * @access Protected
 */
exports.incrementCategoryCount = handleAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  await category.incrementCount();
  res.json({ success: true, count: category.count });
});


/**
 * @desc Decrement listing count for a category
 * @route POST /api/categories/:id/decrement
 * @access Protected
 */
exports.decrementCategoryCount = handleAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }

  await category.decrementCount();
  res.json({ success: true, count: category.count });
});
