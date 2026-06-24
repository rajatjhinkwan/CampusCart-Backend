const express = require("express");
const router = express.Router();

/* ------------------------------
   MAIN ROUTE ENTRY POINT
------------------------------ */

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/products", require("./productRoutes"));
router.use("/conversations", require("./conversationRoutes"));
router.use("/messages", require("./messageRoutes"));
router.use("/categories", require("./categoryRoutes"));
router.use("/wishlist", require("./wishlistRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/reports", require("./reportRoutes"));
router.use("/requests", require("./requestRoutes")); // Added for consistency
router.use("/rooms", require("./roomRoutes"));  // ✅ Correct
router.use("/services", require("./serviceRoutes"));
router.use("/jobs", require("./jobRoutes"));
router.use("/rides", require("./rideRoutes"));
router.use("/transports", require("./transportRoutes"));
router.use("/ml", require("./mlRoutes"));



module.exports = router;
