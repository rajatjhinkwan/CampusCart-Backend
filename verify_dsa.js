const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { 
    initializeDSA, 
    searchTrie, 
    productCache, 
    emailQueue, 
    recommendationGraph 
} = require('./utils/dsaManager');

async function verifyDSA() {
    console.log("🔍 STARTING DSA VERIFICATION...\n");

    // 1. Connect to DB (needed for Trie initialization)
    await connectDB();
    console.log("--------------------------------------------------");

    // 2. Initialize DSA (Populates Trie from DB)
    console.log("⚙️  Initializing Data Structures...");
    await initializeDSA();
    console.log("✅ DSA Initialization Complete.\n");

    // 3. Verify Trie (Search)
    console.log("🌲 TESTING TRIE (Prefix Search)");
    // Insert a dummy item just to be sure we have a match
    searchTrie.insert("VerificationTestItem", { type: "test", id: "123" });
    const trieResults = searchTrie.startsWith("Verif");
    console.log(`   Query: "Verif"`);
    console.log(`   Results Found: ${trieResults.length}`);
    // Trie now returns original word (preserving case)
    if (trieResults.length > 0 && trieResults[0].word === "VerificationTestItem") {
        console.log("   ✅ Trie Test PASSED");
    } else {
        console.log(`   ❌ Trie Test FAILED (Got: ${trieResults.length > 0 ? trieResults[0].word : 'None'})`);
    }
    console.log("--------------------------------------------------");

    // 4. Verify LRU Cache
    console.log("💾 TESTING LRU CACHE");
    productCache.put("cacheKey1", "CachedValue1");
    const cachedVal = productCache.get("cacheKey1");
    console.log(`   Put: "cacheKey1" -> "CachedValue1"`);
    console.log(`   Get "cacheKey1": "${cachedVal}"`);
    if (cachedVal === "CachedValue1") {
        console.log("   ✅ LRU Cache Test PASSED");
    } else {
        console.log("   ❌ LRU Cache Test FAILED");
    }
    console.log("--------------------------------------------------");

    // 5. Verify Queue
    console.log("🚶 TESTING QUEUE");
    emailQueue.enqueue({ to: "test@example.com", subject: "Test" });
    console.log(`   Enqueued item. Queue size: ${emailQueue.size}`);
    const item = emailQueue.dequeue();
    console.log(`   Dequeued item to: ${item ? item.to : 'null'}`);
    if (item && item.to === "test@example.com" && emailQueue.isEmpty()) {
        console.log("   ✅ Queue Test PASSED");
    } else {
        console.log("   ❌ Queue Test FAILED");
    }
    console.log("--------------------------------------------------");

    // 6. Verify Graph
    console.log("🕸️  TESTING GRAPH");
    recommendationGraph.addVertex("ProductA");
    recommendationGraph.addVertex("ProductB");
    recommendationGraph.addEdge("ProductA", "ProductB");
    console.log("   Added Edge: ProductA <-> ProductB");
    const neighbors = recommendationGraph.adjacencyList["ProductA"];
    console.log(`   Neighbors of ProductA: ${JSON.stringify(neighbors)}`);
    if (neighbors.includes("ProductB")) {
        console.log("   ✅ Graph Test PASSED");
    } else {
        console.log("   ❌ Graph Test FAILED");
    }
    console.log("--------------------------------------------------");

    console.log("\n🎉 ALL CHECKS COMPLETED.");
    
    // Close DB connection
    await mongoose.connection.close();
    process.exit(0);
}

verifyDSA().catch(err => {
    console.error("❌ Verification Failed:", err);
    process.exit(1);
});
