const Trie = require('./dsa/Trie');
const LRUCache = require('./dsa/LRUCache');
const Queue = require('./dsa/Queue');
const Graph = require('./dsa/Graph');
const Product = require('../models/productModel');
const Room = require('../models/roomModel');
const Service = require('../models/serviceModel');
const Job = require('../models/jobModel');

// Initialize Singletons
const searchTrie = new Trie();
const productCache = new LRUCache(100); // Cache up to 100 distinct query results or items
const emailQueue = new Queue(); // Simple queue for email tasks
const recommendationGraph = new Graph();

// Function to populate Trie from DB
const initializeSearchTrie = async () => {
    try {
        console.log('Initializing Search Trie...');
        const [products, rooms, services, jobs] = await Promise.all([
            Product.find({ isSold: false }).select('title _id'),
            Room.find({ isActive: true }).select('title _id'),
            Service.find({ isAvailable: true }).select('title _id'),
            Job.find({ isActive: true }).select('title _id')
        ]);

        products.forEach(p => searchTrie.insert(p.title, { type: 'product', id: p._id }));
        rooms.forEach(r => searchTrie.insert(r.title, { type: 'room', id: r._id }));
        services.forEach(s => searchTrie.insert(s.title, { type: 'service', id: s._id }));
        jobs.forEach(j => searchTrie.insert(j.title, { type: 'job', id: j._id }));

        console.log('Search Trie Initialized successfully.');
    } catch (error) {
        console.error('Error initializing Search Trie:', error);
    }
};

// Function to populate Graph (Example: Categories or Related Items)
// For now, we'll just initialize it. A real graph might build connections based on user behavior.
const initializeGraph = async () => {
    // Placeholder for graph initialization logic
    // e.g., connect products in same category
    console.log('Graph structure ready.');
};

const initializeDSA = async () => {
    await initializeSearchTrie();
    await initializeGraph();
};

module.exports = {
    searchTrie,
    productCache,
    emailQueue,
    recommendationGraph,
    initializeDSA
};
