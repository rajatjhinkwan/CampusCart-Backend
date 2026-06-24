/**
 * Seeds demo categories (if missing), a demo seller, and sample marketplace listings.
 * Run: node scripts/seedDemoData.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const Room = require("../models/roomModel");
const Request = require("../models/requestModel");
const Service = require("../models/serviceModel");
const { ensureCategories } = require("./ensureCategories");

const DEMO_EMAIL = "demo@campsus.local";
const BUYER_EMAIL = "buyer@campsus.local";
const DEMO_PASSWORD = "Demo1234!";

const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/campuscart1/600/400",
  "https://picsum.photos/seed/campuscart2/600/400",
  "https://picsum.photos/seed/campuscart3/600/400",
  "https://picsum.photos/seed/campuscart4/600/400",
];

const PRODUCT_SAMPLES = [
  {
    title: "Samsung Galaxy S21 – 128GB",
    description: "Excellent condition phone with original box and charger.",
    price: 18999,
    condition: "Like New",
    categoryTitle: "Electronics",
    location: "Gopeshwar, Chamoli",
  },
  {
    title: "Study Table with Lamp",
    description: "Solid wood study table, ideal for hostel rooms.",
    price: 3500,
    condition: "Used",
    categoryTitle: "Furniture",
    location: "Nandprayag, Chamoli",
  },
  {
    title: "Engineering Mathematics Textbook",
    description: "Latest edition, minimal highlights.",
    price: 450,
    condition: "Used",
    categoryTitle: "Books",
    location: "Chamoli Bazar",
  },
  {
    title: "Firefox Mountain Bike",
    description: "Well maintained gear cycle, perfect for campus commute.",
    price: 6500,
    condition: "Used",
    categoryTitle: "Sports Equipment",
    location: "Pursadi, Chamoli",
  },
];

async function ensureDemoUser() {
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    // Reset password in case a prior seed double-hashed it
    user.password = DEMO_PASSWORD;
    await user.save();
  } else {
    user = await User.create({
      name: "Demo Seller",
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: "seller",
      isVerified: true,
      location: "Gopeshwar, Chamoli",
      institution: "Campus Demo University",
    });
    console.log("Created demo user:", DEMO_EMAIL, "password:", DEMO_PASSWORD);
  }
  return user;
}

async function ensureDemoBuyer() {
  let user = await User.findOne({ email: BUYER_EMAIL });
  if (user) {
    user.password = DEMO_PASSWORD;
    await user.save();
  } else {
    user = await User.create({
      name: "Demo Buyer",
      email: BUYER_EMAIL,
      password: DEMO_PASSWORD,
      role: "buyer",
      isVerified: true,
      location: "Chamoli Bazar",
      institution: "Campus Demo University",
    });
    console.log("Created demo buyer:", BUYER_EMAIL, "password:", DEMO_PASSWORD);
  }
  return user;
}

async function seedProducts(seller) {
  const existing = await Product.countDocuments();
  if (existing >= 3) {
    console.log(`Skipping products (${existing} already exist)`);
    return;
  }

  for (const sample of PRODUCT_SAMPLES) {
    const category =
      (await Category.findOne({ title: sample.categoryTitle, type: "product" })) ||
      (await Category.findOne({ type: "product", parent: { $ne: null } }));

    if (!category) {
      console.warn("No product category found — run category seed first");
      continue;
    }

    await Product.create({
      title: sample.title,
      description: sample.description,
      price: sample.price,
      category: category._id,
      condition: sample.condition,
      type: "sell",
      seller: seller._id,
      location: sample.location,
      images: PLACEHOLDER_IMAGES.map((url, i) => ({
          url,
          public_id: `demo-${Date.now()}-${i}`,
        })),
    });
    console.log("Added product:", sample.title);
  }
}

async function seedRoom(seller) {
  if (await Room.countDocuments()) return;
  await Room.create({
    title: "Single Room near Campus Gate",
    description: "Quiet single room with attached bathroom and Wi‑Fi.",
    rent: 5500,
    roomType: "Single Room",
    bhk: 1,
    furnished: "Semi-Furnished",
    contactNumber: "9876543210",
    seller: seller._id,
    location: { city: "Gopeshwar", area: "Near Campus", state: "Uttarakhand" },
    images: [
      { url: "https://picsum.photos/seed/campusroom/600/400", public_id: "demo-room-1" },
    ],
  });
  console.log("Added demo room");
}

async function seedRequests(buyer) {
  if (await Request.countDocuments()) return;
  const samples = [
    {
      title: "Need help moving furniture this weekend",
      description: "Looking for 2 people to help shift a bed and study table from Block A to Block C.",
      category: "Moving Help",
      location: "Gopeshwar, Chamoli",
      budget: "₹800",
      urgency: "High",
    },
    {
      title: "Tutor needed for Calculus",
      description: "First-year engineering student needs twice-weekly tutoring for Calculus I.",
      category: "Tutoring",
      location: "Chamoli Bazar",
      budget: "₹500/session",
      urgency: "Medium",
    },
  ];
  for (const sample of samples) {
    await Request.create({ ...sample, postedBy: buyer._id });
    console.log("Added request:", sample.title);
  }
}

async function seedServices(seller) {
  if (await Service.countDocuments()) return;
  const samples = [
    {
      title: "Math & Physics Tutoring",
      description: "Experienced tutor for school and college-level math and physics. Flexible evening slots.",
      category: "Tutoring",
      price: 500,
      location: { address: "Near Campus Gate", city: "Gopeshwar", state: "Uttarakhand", pincode: "246401" },
      images: ["https://picsum.photos/seed/service-tutor/600/400"],
    },
    {
      title: "Room Cleaning & Deep Sanitization",
      description: "Professional hostel room cleaning, laundry help, and monthly deep cleaning packages.",
      category: "Home Cleaning",
      price: 350,
      location: { address: "Chamoli Bazar", city: "Gopeshwar", state: "Uttarakhand", pincode: "246401" },
      images: ["https://picsum.photos/seed/service-clean/600/400"],
    },
  ];
  for (const sample of samples) {
    await Service.create({ ...sample, provider: seller._id, phone: "9876543210" });
    console.log("Added service:", sample.title);
  }
}

async function seedJobs(seller) {
  if (await Job.countDocuments()) return;
  const samples = [
    {
      title: "Frontend Developer Intern",
      description: "Work on React components for our campus marketplace. 15–20 hrs/week, remote-friendly.",
      companyName: "Campus Tech Labs",
      location: "Gopeshwar, Chamoli",
      salary: "₹8,000/month",
      jobType: "Internship",
      duration: "3 months",
      skillsRequired: ["React", "JavaScript", "CSS"],
    },
    {
      title: "Part-Time Delivery Associate",
      description: "Deliver packages within campus and nearby areas. Flexible shifts on weekends.",
      companyName: "QuickCampus Delivery",
      location: "Chamoli Bazar",
      salary: "₹200/day",
      jobType: "Part-Time",
      duration: "Flexible",
      skillsRequired: ["Driving license"],
    },
  ];
  for (const sample of samples) {
    await Job.create({ ...sample, postedBy: seller._id });
    console.log("Added job:", sample.title);
  }
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGO_URI or MONGODB_URI in my-backend/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const seller = await ensureDemoUser();
  const buyer = await ensureDemoBuyer();
  await ensureCategories();
  await seedProducts(seller);
  await seedRoom(seller);
  await seedRequests(buyer);
  await seedServices(seller);
  await seedJobs(seller);

  const productCount = await Product.countDocuments();
  const categoryCount = await Category.countDocuments();
  const serviceCount = await Service.countDocuments();
  const jobCount = await Job.countDocuments();
  console.log(`Done. Categories: ${categoryCount}, Products: ${productCount}, Services: ${serviceCount}, Jobs: ${jobCount}`);
  console.log(`Login with ${DEMO_EMAIL} / ${DEMO_PASSWORD} to test sell & messaging.`);
  console.log(`Login with ${BUYER_EMAIL} / ${DEMO_PASSWORD} to test buying & messaging sellers.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
