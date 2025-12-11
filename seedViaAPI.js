const axios = require('axios');

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
        parent: "Product"
    },
    {
        title: "Clothing",
        icon: "shirt",
        type: "product",
        desc: "Fashion and apparel",
        color: "#BE185D",
        parent: "Product"
    },
    {
        title: "Books",
        icon: "book",
        type: "product",
        desc: "Textbooks and novels",
        color: "#92400E",
        parent: "Product"
    },
    {
        title: "Furniture",
        icon: "armchair",
        type: "product",
        desc: "Home and office furniture",
        color: "#166534",
        parent: "Product"
    },
    {
        title: "Sports Equipment",
        icon: "dumbbell",
        type: "product",
        desc: "Gym and outdoor gear",
        color: "#B91C1C",
        parent: "Product"
    },

    // Room Subcategories
    {
        title: "1 BHK",
        icon: "home",
        type: "room",
        desc: "Single bedroom apartment",
        color: "#059669",
        parent: "Room"
    },
    {
        title: "2 BHK",
        icon: "home",
        type: "room",
        desc: "Two bedroom apartment",
        color: "#0D9488",
        parent: "Room"
    },
    {
        title: "3 BHK",
        icon: "home",
        type: "room",
        desc: "Three bedroom apartment",
        color: "#0F766E",
        parent: "Room"
    },
    {
        title: "PG/Hostel",
        icon: "building",
        type: "room",
        desc: "Paying guest accommodation",
        color: "#7C2D12",
        parent: "Room"
    },
    {
        title: "Office Space",
        icon: "building-2",
        type: "room",
        desc: "Commercial office space",
        color: "#1E3A8A",
        parent: "Room"
    },

    // Job Subcategories
    {
        title: "Campus Ambassador",
        icon: "user-check",
        type: "job",
        desc: "Campus ambassador roles",
        color: "#DC2626",
        parent: "Job"
    },
    {
        title: "Data Entry Assistant",
        icon: "file-text",
        type: "job",
        desc: "Data entry and administrative work",
        color: "#EA580C",
        parent: "Job"
    },
    {
        title: "Junior Web Developer",
        icon: "code",
        type: "job",
        desc: "Entry-level web development",
        color: "#2563EB",
        parent: "Job"
    },
    {
        title: "Video Editing Intern",
        icon: "video",
        type: "job",
        desc: "Video editing and production",
        color: "#7C3AED",
        parent: "Job"
    },
    {
        title: "Graphic Design Intern",
        icon: "palette",
        type: "job",
        desc: "Graphic design and creative work",
        color: "#BE185D",
        parent: "Job"
    },
    {
        title: "Tutoring (Any Subject)",
        icon: "graduation-cap",
        type: "job",
        desc: "Teaching and tutoring services",
        color: "#059669",
        parent: "Job"
    },
    {
        title: "Photography Assistant",
        icon: "camera",
        type: "job",
        desc: "Photography and media assistance",
        color: "#92400E",
        parent: "Job"
    },
    {
        title: "Social Media Intern",
        icon: "megaphone",
        type: "job",
        desc: "Social media management",
        color: "#B91C1C",
        parent: "Job"
    },
    {
        title: "Store Helper / Packing Work",
        icon: "package",
        type: "job",
        desc: "Retail and packaging assistance",
        color: "#166534",
        parent: "Job"
    },

    // Service Subcategories
    {
        title: "Home Cleaning",
        icon: "broom",
        type: "service",
        desc: "House cleaning services",
        color: "#7C3AED",
        parent: "Service"
    },
    {
        title: "Tutoring",
        icon: "book-open",
        type: "service",
        desc: "Academic tutoring",
        color: "#059669",
        parent: "Service"
    },
    {
        title: "Event Planning",
        icon: "calendar",
        type: "service",
        desc: "Event organization",
        color: "#DC2626",
        parent: "Service"
    },
    {
        title: "Photography",
        icon: "camera",
        type: "service",
        desc: "Professional photography",
        color: "#92400E",
        parent: "Service"
    },
    {
        title: "Web Development",
        icon: "code",
        type: "service",
        desc: "Website development",
        color: "#2563EB",
        parent: "Service"
    },
];

async function seedViaAPI() {
    try {
        // First, get existing categories to find parent IDs
        const response = await axios.get('http://localhost:5000/api/categories');
        const existingCategories = response.data.categories;

        const parentMap = {};
        existingCategories.forEach(cat => {
            parentMap[cat.title] = cat._id;
        });

        console.log('Existing categories:', existingCategories.length);

        // Create categories via API
        for (const catData of categoriesData) {
            try {
                const dataToSend = { ...catData };
                if (catData.parent) {
                    dataToSend.parent = parentMap[catData.parent];
                    if (!dataToSend.parent) {
                        console.log(`Skipping ${catData.title} - parent ${catData.parent} not found`);
                        continue;
                    }
                }

                const createResponse = await axios.post('http://localhost:5000/api/categories', dataToSend);
                console.log(`Created: ${catData.title}`);
            } catch (err) {
                if (err.response?.status === 409) {
                    console.log(`Already exists: ${catData.title}`);
                } else {
                    console.log(`Error creating ${catData.title}:`, err.response?.data?.message || err.message);
                }
            }
        }

        console.log('Seeding via API completed');
    } catch (error) {
        console.error('Error in seeding via API:', error.message);
    }
}

seedViaAPI();
