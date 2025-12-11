const Report = require('../models/reportModel');
const Product = require('../models/productModel');
const handleAsync = require('../utils/handleAsync');

// ✅ Create Report Controller
exports.createReport = async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!reason) {
      return res.status(400).json({ message: "Reason is required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyReported = product.reports.some(
      (report) => report.user && report.user.toString() === userId.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: "You have already reported this product." });
    }

    // ✅ Push new report
    product.reports.push({
      user: userId,
      reason,
      date: new Date(),
    });

    // ✅ Save without revalidating the whole schema
    await product.save({ validateBeforeSave: false });

    res.status(201).json({
      message: "Report submitted successfully.",
      productId: product._id,
      totalReports: product.reports.length,
    });
  } catch (error) {
    console.error("❌ Error creating report:", error);
    res.status(500).json({
      message: "Failed to report product",
      error: error.message,
    });
  }
};

// 🟢 Get all reports (Admin)
exports.getAllReports = handleAsync(async (req, res) => {
  const reports = await Report.find()
    .populate('product', 'name price category') // show basic product info
    .populate('reporter', 'name email') // show who reported it
    .sort({ createdAt: -1 });

  res.status(200).json({
    total: reports.length,
    reports,
  });
});

// 🟢 Resolve report (Admin)
exports.resolveReport = handleAsync(async (req, res) => {
  const { reportId } = req.params;
  const { action } = req.body; // e.g. "remove" or "ignore"

  const report = await Report.findById(reportId).populate('product');
  if (!report) return res.status(404).json({ message: 'Report not found.' });

  // Update report status
  if (action === 'remove') {
    report.status = 'Removed';
    if (report.product) await Product.findByIdAndDelete(report.product._id);
  } else {
    report.status = 'Ignored';
  }

  await report.save();

  res.status(200).json({
    message: 'Report handled successfully.',
    report,
  });
});
