/**
 * Ensures marketplace categories exist (main + subcategories).
 * Safe to run multiple times — creates only missing entries.
 */
const Category = require("../models/categoryModel");

const MAIN_CATEGORIES = [
  { title: "Product", icon: "shopping-bag", type: "product", desc: "Buy and sell products", color: "#2563EB", isPopular: true },
  { title: "Room", icon: "home", type: "room", desc: "Find rooms for rent", color: "#059669", isPopular: true },
  { title: "Job", icon: "briefcase", type: "job", desc: "Find jobs and internships", color: "#DC2626", isPopular: true },
  { title: "Service", icon: "wrench", type: "service", desc: "Hire services", color: "#7C3AED", isPopular: true },
];

const SUB_CATEGORIES = {
  product: [
    "Electronics", "Clothing", "Books", "Furniture", "Sports Equipment",
  ],
  room: ["1 BHK", "2 BHK", "3 BHK", "PG/Hostel", "Office Space"],
  job: [
    "Campus Ambassador", "Data Entry Assistant", "Junior Web Developer",
    "Video Editing Intern", "Graphic Design Intern", "Tutoring (Any Subject)",
    "Photography Assistant", "Social Media Intern", "Store Helper / Packing Work",
  ],
  service: ["Home Cleaning", "Tutoring", "Event Planning", "Photography", "Web Development"],
};

async function ensureCategories() {
  const mainIds = {};

  for (const cat of MAIN_CATEGORIES) {
    let existing = await Category.findOne({ title: cat.title, type: cat.type });
    if (!existing) {
      existing = await Category.create(cat);
      console.log("Created main category:", cat.title);
    }
    mainIds[cat.type] = existing._id;
  }

  for (const [type, titles] of Object.entries(SUB_CATEGORIES)) {
    const parent = mainIds[type];
    if (!parent) continue;

    for (const title of titles) {
      const exists = await Category.findOne({ title, type, parent });
      if (!exists) {
        await Category.create({
          title,
          icon: "tag",
          type,
          desc: title,
          color: "#64748B",
          parent,
        });
        console.log("Created subcategory:", title);
      }
    }
  }

  const total = await Category.countDocuments();
  console.log(`Categories ensured (${total} docs)`);
  return total;
}

module.exports = { ensureCategories };
