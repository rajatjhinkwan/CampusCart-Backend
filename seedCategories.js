require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/categoryModel');

const categoriesData = [
    // Main Categories
    {
        title: "Product",
        icon: "shopping-bag",
        type: "product",
        desc: "Buy and sell products",
        color: "#2563EB",
        isPopular: true,
    },
    {
        title: "Room",
        icon: "home",
        type: "room",
        desc: "Find rooms for rent",
        color: "#059669",
        isPopular: true,
    },
    {
        title: "Job",
        icon: "briefcase",
        type: "job",
        desc: "Find jobs and internships",
        color: "#DC2626",
        isPopular: true,
    },
    {
        title: "Service",
        icon: "wrench",
        type: "service",
        desc: "Hire services",
        color: "#7C3AED",
        isPopular: true,
    },

    // Product Subcategories
    {
        title: "Electronics",
        icon: "laptop",
        type: "product",
        desc: "Phones, laptops, gadgets",
        color: "#1E40AF",
    },
    {
        title: "Clothing",
        icon: "shirt",
        type: "product",
        desc: "Fashion and apparel",
        color: "#BE185D",
    },
    {
        title: "Books",
        icon: "book",
        type: "product",
        desc: "Textbooks and novels",
        color: "#92400E",
    },
    {
        title: "Furniture",
        icon: "armchair",
        type: "product",
        desc: "Home and office furniture",
        color: "#166534",
    },
    {
        title: "Sports Equipment",
        icon: "dumbbell",
        type: "product",
        desc: "Gym and outdoor gear",
        color: "#B91C1C",
    },

    // Room Subcategories
    {
        title: "1 BHK",
        icon: "home",
        type: "room",
        desc: "Single bedroom apartment",
        color: "#059669",
    },
    {
        title: "2 BHK",
        icon: "home",
        type: "room",
        desc: "Two bedroom apartment",
        color: "#0D9488",
    },
    {
        title: "3 BHK",
        icon: "home",
        type: "room",
        desc: "Three bedroom apartment",
        color: "#0F766E",
    },
    {
        title: "PG/Hostel",
        icon: "building",
        type: "room",
        desc: "Paying guest accommodation",
        color: "#7C2D12",
    },
    {
        title: "Office Space",
        icon: "building-2",
        type: "room",
        desc: "Commercial office space",
        color: "#1E3A8A",
    },

    // Job Subcategories
    {
        title: "Campus Ambassador",
        icon: "user-check",
        type: "job",
        desc: "Campus ambassador roles",
        color: "#DC2626",
    },
    {
        title: "Data Entry Assistant",
        icon: "file-text",
        type: "job",
        desc: "Data entry and administrative work",
        color: "#EA580C",
    },
    {
        title: "Junior Web Developer",
        icon: "code",
        type: "job",
        desc: "Entry-level web development",
        color: "#2563EB",
    },
    {
        title: "Video Editing Intern",
        icon: "video",
        type: "job",
        desc: "Video editing and production",
        color: "#7C3AED",
    },
    {
        title: "Graphic Design Intern",
        icon: "palette",
        type: "job",
        desc: "Graphic design and creative work",
        color: "#BE185D",
    },
    {
        title: "Tutoring (Any Subject)",
        icon: "graduation-cap",
        type: "job",
        desc: "Teaching and tutoring services",
        color: "#059669",
    },
    {
        title: "Photography Assistant",
        icon: "camera",
        type: "job",
        desc: "Photography and media assistance",
        color: "#92400E",
    },
    {
        title: "Social Media Intern",
        icon: "megaphone",
        type: "job",
        desc: "Social media management",
        color: "#B91C1C",
    },
    {
        title: "Store Helper / Packing Work",
        icon: "package",
        type: "job",
        desc: "Retail and packaging assistance",
        color: "#166534",
    },

    // Service Subcategories
    {
        title: "Home Cleaning",
        icon: "broom",
        type: "service",
        desc: "House cleaning services",
        color: "#7C3AED",
    },
    {
        title: "Tutoring",
        icon: "book-open",
        type: "service",
        desc: "Academic tutoring",
        color: "#059669",
    },
    {
        title: "Event Planning",
        icon: "calendar",
        type: "service",
        desc: "Event organization",
        color: "#DC2626",
    },
    {
        title: "Photography",
        icon: "camera",
        type: "service",
        desc: "Professional photography",
        color: "#92400E",
    },
    {
        title: "Web Development",
        icon: "code",
        type: "service",
        desc: "Website development",
        color: "#2563EB",
    },
];

async function seedCategories() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/yourdb');
        console.log('Connected to MongoDB');

        // Clear existing categories
        await Category.deleteMany({});
        console.log('Cleared existing categories');

        // Create main categories first
        const mainCategories = categoriesData.filter(cat => !cat.parent);
        const createdMains = [];

        for (const catData of mainCategories) {
            const category = new Category(catData);
            await category.save();
            createdMains.push(category);
            console.log(`Created main category: ${category.title}`);
        }

        // Create subcategories
        const subCategories = categoriesData.filter(cat => !cat.parent); // Wait, this is wrong, subcategories don't have parent in the data

        // Actually, in the data above, all are main categories except the ones that should have parent.
        // I need to fix this. The subcategories should have parent set to the main category ID.

        // Let's recreate with proper parent relationships
        const mainCatMap = {};
        for (const main of createdMains) {
            mainCatMap[main.type] = main._id;
        }

        // Now create subcategories with parents
        const subCatsData = [
            // Product subs
            { title: "Electronics", icon: "laptop", type: "product", desc: "Phones, laptops, gadgets", color: "#1E40AF", parent: mainCatMap.product },
            { title: "Clothing", icon: "shirt", type: "product", desc: "Fashion and apparel", color: "#BE185D", parent: mainCatMap.product },
            { title: "Books", icon: "book", type: "product", desc: "Textbooks and novels", color: "#92400E", parent: mainCatMap.product },
            { title: "Furniture", icon: "armchair", type: "product", desc: "Home and office furniture", color: "#166534", parent: mainCatMap.product },
            { title: "Sports Equipment", icon: "dumbbell", type: "product", desc: "Gym and outdoor gear", color: "#B91C1C", parent: mainCatMap.product },

            // Room subs
            { title: "1 BHK", icon: "home", type: "room", desc: "Single bedroom apartment", color: "#059669", parent: mainCatMap.room },
            { title: "2 BHK", icon: "home", type: "room", desc: "Two bedroom apartment", color: "#0D9488", parent: mainCatMap.room },
            { title: "3 BHK", icon: "home", type: "room", desc: "Three bedroom apartment", color: "#0F766E", parent: mainCatMap.room },
            { title: "PG/Hostel", icon: "building", type: "room", desc: "Paying guest accommodation", color: "#7C2D12", parent: mainCatMap.room },
            { title: "Office Space", icon: "building-2", type: "room", desc: "Commercial office space", color: "#1E3A8A", parent: mainCatMap.room },

            // Job subs
            { title: "Campus Ambassador", icon: "user-check", type: "job", desc: "Campus ambassador roles", color: "#DC2626", parent: mainCatMap.job },
            { title: "Data Entry Assistant", icon: "file-text", type: "job", desc: "Data entry and administrative work", color: "#EA580C", parent: mainCatMap.job },
            { title: "Junior Web Developer", icon: "code", type: "job", desc: "Entry-level web development", color: "#2563EB", parent: mainCatMap.job },
            { title: "Video Editing Intern", icon: "video", type: "job", desc: "Video editing and production", color: "#7C3AED", parent: mainCatMap.job },
            { title: "Graphic Design Intern", icon: "palette", type: "job", desc: "Graphic design and creative work", color: "#BE185D", parent: mainCatMap.job },
            { title: "Tutoring (Any Subject)", icon: "graduation-cap", type: "job", desc: "Teaching and tutoring services", color: "#059669", parent: mainCatMap.job },
            { title: "Photography Assistant", icon: "camera", type: "job", desc: "Photography and media assistance", color: "#92400E", parent: mainCatMap.job },
            { title: "Social Media Intern", icon: "megaphone", type: "job", desc: "Social media management", color: "#B91C1C", parent: mainCatMap.job },
            { title: "Store Helper / Packing Work", icon: "package", type: "job", desc: "Retail and packaging assistance", color: "#166534", parent: mainCatMap.job },

            // Service subs
            { title: "Home Cleaning", icon: "broom", type: "service", desc: "House cleaning services", color: "#7C3AED", parent: mainCatMap.service },
            { title: "Tutoring", icon: "book-open", type: "service", desc: "Academic tutoring", color: "#059669", parent: mainCatMap.service },
            { title: "Event Planning", icon: "calendar", type: "service", desc: "Event organization", color: "#DC2626", parent: mainCatMap.service },
            { title: "Photography", icon: "camera", type: "service", desc: "Professional photography", color: "#92400E", parent: mainCatMap.service },
            { title: "Web Development", icon: "code", type: "service", desc: "Website development", color: "#2563EB", parent: mainCatMap.service },
        ];

        for (const subData of subCatsData) {
            const subcategory = new Category(subData);
            await subcategory.save();
            console.log(`Created subcategory: ${subcategory.title}`);
        }

        console.log('Seeding completed successfully');
    } catch (error) {
        console.error('Error seeding categories:', error);
    } finally {
        mongoose.connection.close();
    }
}

seedCategories();
