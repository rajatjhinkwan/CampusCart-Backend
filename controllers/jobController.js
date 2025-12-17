// controllers/jobController.js
const Job = require("../models/jobModel");

// ----------------------------------
// CREATE JOB (POST /api/jobs)
// ----------------------------------
exports.createJob = async (req, res) => {
    try {
        // ---------------------------
        // 1. CLEAN & NORMALIZE INPUT
        // ---------------------------

        // Map skills from "skills" (frontend) to model's skillsRequired
        if (Array.isArray(req.body.skills)) {
            req.body.skillsRequired = req.body.skills.map((s) => String(s).trim()).filter(Boolean);
        }

        // Convert skillsRequired string → array
        if (typeof req.body.skillsRequired === "string") {
            req.body.skillsRequired = req.body.skillsRequired
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        }

        if (!req.body.skillsRequired) {
            req.body.skillsRequired = [];
        }

        // Normalize salary as string
        if (req.body.salary !== undefined) {
            req.body.salary = String(req.body.salary);
        }

        // Build location string from structured location
        let loc = req.body.location;
        try { if (typeof loc === "string") loc = JSON.parse(loc); } catch { }
        if (loc && (loc.city || loc.state || loc.pincode || loc.address)) {
            const city = loc.city ? String(loc.city) : "";
            const state = loc.state ? String(loc.state) : "";
            const pincode = loc.pincode ? String(loc.pincode) : "";
            const address = loc.address ? String(loc.address) : "";
            req.body.location = [address, city, state].filter(Boolean).join(", ") + (pincode ? ` - ${pincode}` : "");
        }

        // Fallback for required fields
        if (!req.body.companyName) {
            req.body.companyName = req.user.name || "Independent";
        }

        // ---------------------------
        // 2. ATTACH USER ID
        // ---------------------------
        req.body.postedBy = req.user._id;

        // ---------------------------
        // 3. CREATE JOB
        // ---------------------------
        const job = await Job.create(req.body);

        // ---------------------------
        // 4. SEND RESPONSE
        // ---------------------------
        return res.status(201).json({
            success: true,
            message: "Job created successfully",
            data: job,
        });

    } catch (error) {
        console.error("CREATE JOB ERROR:", error);

        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


// ----------------------------------
// GET ALL JOBS (GET /api/jobs)
// Supports search, filter by type, pagination
// ----------------------------------
exports.getAllJobs = async (req, res) => {
    try {
        const { search, jobType, page = 1, limit = 10 } = req.query;

        const query = {};
        if (jobType) query.jobType = jobType;
        if (search) query.$text = { $search: search };

        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate("postedBy", "name email");

        const totalJobs = await Job.countDocuments(query);

        res.status(200).json({
            success: true,
            count: jobs.length,
            total: totalJobs,
            page: parseInt(page),
            jobs,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// FILTER JOBS (Advanced)
// ----------------------------------
exports.filterJobs = async (req, res) => {
    try {
        const { search, jobType, location, minSalary, maxSalary, page = 1, limit = 10 } = req.query;

        const query = {};

        // 1. Text Search
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { companyName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        // 2. Job Type
        if (jobType) {
            query.jobType = jobType;
        }

        // 3. Location
        if (location) {
            query.location = { $regex: location, $options: "i" };
        }

        const jobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate("postedBy", "name email");

        const total = await Job.countDocuments(query);

        res.status(200).json({
            success: true,
            count: jobs.length,
            total,
            jobs
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// GET SINGLE JOB (GET /api/jobs/:id)
// ----------------------------------
exports.getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate("postedBy", "name email");
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });
        res.status(200).json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// UPDATE JOB (PUT /api/jobs/:id)
// Only the owner can update
// ----------------------------------
// controllers/jobController.js

exports.updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user._id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        if (String(job.postedBy) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "You cannot update this job",
            });
        }

        // ALLOWED FIELDS BASED ON MODEL
        const allowedFields = [
            "title",
            "description",
            "companyName",
            "location",
            "salary",
            "jobType",
            "duration",
            "skillsRequired"
        ];

        // APPLY UPDATES SAFELY
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {

                // SPECIAL CASE: skillsRequired must always be an array of strings
                if (field === "skillsRequired") {
                    if (Array.isArray(req.body.skillsRequired)) {
                        job.skillsRequired = req.body.skillsRequired.map(s => s.trim());
                    } else if (typeof req.body.skillsRequired === "string") {
                        job.skillsRequired = req.body.skillsRequired
                            .split(",")
                            .map(s => s.trim())
                            .filter(Boolean);
                    }
                }
                else {
                    job[field] = req.body[field];
                }
            }
        });

        const updatedJob = await job.save();

        return res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: updatedJob
        });

    } catch (error) {
        console.error("UPDATE JOB ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




// ----------------------------------
// DELETE JOB (DELETE /api/jobs/:id)
// Only the owner can delete
// ----------------------------------
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: "Job not found or unauthorized" });
    res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminToggleJobActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    job.isActive = Boolean(active);
    await job.save();
    res.status(200).json({ success: true, isActive: job.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminDeleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    await job.deleteOne();
    res.status(200).json({ success: true, message: "Job deleted (admin)" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
