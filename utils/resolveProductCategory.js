const mongoose = require("mongoose");
const Category = require("../models/categoryModel");

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

async function resolveProductCategoryId(categoryId, categoryTitle) {
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const exists = await Category.findById(categoryId).select("_id");
    if (exists) return exists._id;
  }

  const label = String(categoryTitle || categoryId || "").trim();
  if (!label) {
    const fallback = await Category.findOne({ type: "product", parent: { $ne: null } }).select("_id");
    return fallback?._id || null;
  }

  const mapped = mapUiLabel(label);
  const norm = (s) => String(s || "").trim().toLowerCase();

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
      (c) => norm(c.title).includes(norm(label)) || norm(label).includes(norm(c.title)) || norm(c.title) === norm(mapped)
    );
  }

  if (match) return match._id;

  const fallback = await Category.findOne({ type: "product", parent: { $ne: null } }).select("_id");
  return fallback?._id || null;
}

module.exports = { resolveProductCategoryId, mapUiLabel };
