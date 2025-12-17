const Report = require('../models/reportModel');
const Product = require('../models/productModel');
const Room = require('../models/roomModel');
const Service = require('../models/serviceModel');
const Job = require('../models/jobModel');
const handleAsync = require('../utils/handleAsync');

// ✅ Create Report (generic across product/room/service/job)
exports.createReport = async (req, res) => {
  try {
    const typeParam = req.params.type;
    const idParam = req.params.id;
    const { reason, message } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason is required." });
    }

    // Backward compatibility: body-only productId
    let type = typeParam;
    let targetId = idParam;
    if (!type && req.body.productId) {
      type = 'product';
      targetId = req.body.productId;
    }

    const map = {
      product: { Model: Product, field: 'product' },
      room: { Model: Room, field: 'room' },
      service: { Model: Service, field: 'service' },
      job: { Model: Job, field: 'job' },
      user: { Model: require('../models/userModel'), field: 'user' },
    };
    const entry = map[type];
    if (!entry) return res.status(400).json({ message: "Invalid report type" });

    const target = await entry.Model.findById(targetId);
    if (!target) return res.status(404).json({ message: `${type} not found` });

    const dupQuery = { reporter: userId, [entry.field]: targetId };
    const existing = await Report.findOne(dupQuery);
    if (existing) return res.status(400).json({ message: "You have already reported this item." });

    const doc = await Report.create({
      reporter: userId,
      [entry.field]: targetId,
      targetType: type,
      reason,
      message: message || "",
      status: "Pending",
    });

    const total = await Report.countDocuments({ [entry.field]: targetId });

    res.status(201).json({
      message: "Report submitted successfully.",
      targetType: type,
      targetId,
      totalReports: total,
      reportId: doc._id,
    });
  } catch (error) {
    console.error("❌ Error creating report:", error);
    res.status(500).json({
      message: "Failed to create report",
      error: error.message,
    });
  }
};

// 🟢 Get all reports (Admin)
exports.getAllReports = handleAsync(async (req, res) => {
  const reports = await Report.find()
    .populate('product', 'title price')
    .populate('room', 'title rent')
    .populate('service', 'title price')
    .populate('job', 'title companyName')
    .populate('reporter', 'name email')
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

  const report = await Report.findById(reportId)
    .populate('product')
    .populate('room')
    .populate('service')
    .populate('job');
  if (!report) return res.status(404).json({ message: 'Report not found.' });

  // Update report status
  if (action === 'remove') {
    report.status = 'Removed';
    if (report.product) await Product.findByIdAndDelete(report.product._id);
    if (report.room) await Room.findByIdAndDelete(report.room._id);
    if (report.service) await Service.findByIdAndDelete(report.service._id);
    if (report.job) await Job.findByIdAndDelete(report.job._id);
  } else {
    report.status = 'Ignored';
  }

  await report.save();

  res.status(200).json({
    message: 'Report handled successfully.',
    report,
  });
});
