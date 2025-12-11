function isAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // ✅ Check role instead of isAdmin
    if (req.user.role === "admin") {
      return next();
    }

    return res.status(403).json({ message: "Forbidden: admin only" });
  } 
  catch (err) {
    console.error("Admin middleware error:", err.message);
    return res.status(500).json({ message: "Server error in admin middleware" });
  }
}

module.exports = isAdmin;
