/** Refresh demo product image URLs when placeholders fail to load. */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/productModel");

const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/campuscart1/600/400",
  "https://picsum.photos/seed/campuscart2/600/400",
  "https://picsum.photos/seed/campuscart3/600/400",
  "https://picsum.photos/seed/campuscart4/600/400",
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const products = await Product.find({});
  for (const p of products) {
    p.images = PLACEHOLDER_IMAGES.map((url, i) => ({
      url,
      public_id: p.images?.[i]?.public_id || `refresh-${p._id}-${i}`,
    }));
    await p.save();
  }
  console.log(`Updated images for ${products.length} products`);
  await mongoose.disconnect();
}

main().catch(console.error);
