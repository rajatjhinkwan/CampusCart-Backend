const mongoose = require("mongoose");
const Category = require("../models/categoryModel");
const { ensureCategories } = require("../scripts/ensureCategories");

const UI_TO_DB = {
  Mobiles: "Electronics",
  Laptops: "Electronics",
  Cameras: "Electronics",
  "Gaming Consoles": "Electronics",
  "Headphones & Earbuds": "Electronics",
  "Monitors & Screens": "Electronics",
  "Musical Instruments": "Electronics",
  Fashion: "Clothing",
  Fitness: "Sports Equipment",
  Bikes: "Sports Equipment",
  "Study Table & Lamps": "Furniture",
  "Kitchen & Utensils": "Furniture",
  Electronics: "Electronics",
  Clothing: "Clothing",
  Books: "Books",
  Furniture: "Furniture",
  "Sports Equipment": "Sports Equipment",
};

function mapUiLabel(label) {
  if (!label) return label;
  return UI_TO_DB[label] || label;
}

const norm = (s) => String(s || "").trim().toLowerCase();

async function getProductMainCategory() {
  let main = await Category.findOne({ type: "product", parent: null, title: "Product" });
  if (!main) {
    await ensureCategories();
    main = await Category.findOne({ type: "product", parent: null, title: "Product" });
  }
  return main;
}

async function getOrCreateProductSubcategory(title) {
  const mapped = mapUiLabel(String(title || "").trim());
  if (!mapped) return null;

  const main = await getProductMainCategory();
  if (!main) return null;

  let sub = await Category.findOne({
    type: "product",
    parent: main._id,
    title: { $regex: new RegExp(`^${mapped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  }).select("_id");

  if (!sub) {
    try {
      sub = await Category.create({
        title: mapped,
        icon: "tag",
        type: "product",
        parent: main._id,
        desc: mapped,
        color: "#64748B",
      });
    } catch (err) {
      if (err?.code === 11000) {
        sub = await Category.findOne({ title: mapped, type: "product" }).select("_id");
      } else {
        throw err;
      }
    }
  }

  return sub?._id || null;
}

async function resolveProductCategoryId(categoryId, categoryTitle) {
  await ensureCategories();

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const exists = await Category.findById(categoryId).select("_id");
    if (exists) return exists._id;
  }

  const label = String(categoryTitle || "").trim();
  if (label) {
    const mapped = mapUiLabel(label);

    let match = await Category.findOne({
      type: "product",
      parent: { $ne: null },
      title: { $regex: new RegExp(`^${mapped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    }).select("_id");

    if (!match) {
      match = await Category.findOne({
        type: "product",
        parent: { $ne: null },
        title: { $regex: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      }).select("_id");
    }

    if (!match) {
      const subs = await Category.find({ type: "product", parent: { $ne: null } }).select("_id title");
      match = subs.find(
        (c) =>
          norm(c.title).includes(norm(label)) ||
          norm(label).includes(norm(c.title)) ||
          norm(c.title) === norm(mapped)
      );
    }

    if (match) return match._id;

    const created = await getOrCreateProductSubcategory(label);
    if (created) return created;
  }

  const fallback = await Category.findOne({ type: "product", parent: { $ne: null } }).select("_id");
  if (fallback) return fallback._id;

  return getOrCreateProductSubcategory("Electronics");
}

module.exports = { resolveProductCategoryId, mapUiLabel, getOrCreateProductSubcategory };
