const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Reads "Authorization: Bearer <token>", loads the user and puts it in req.user
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Please login first." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found. Login again." });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admin can do this." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
