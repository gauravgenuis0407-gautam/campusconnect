const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function makeToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup  { name, email, password, role }
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    let { role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    // People can choose only student or parent. Admin is decided by ADMIN_EMAIL.
    role = role === "parent" ? "parent" : "student";
    if (
      process.env.ADMIN_EMAIL &&
      String(email).toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
    ) {
      role = "admin";
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: "This email is already registered." });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json({ token: makeToken(user), user: user.toSafeJSON() });
  } catch (err) {
    console.error("signup error:", err.message);
    res.status(500).json({ error: "Signup failed. Try again." });
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
    if (!ok) return res.status(401).json({ error: "Wrong email or password." });

    res.json({ token: makeToken(user), user: user.toSafeJSON() });
  } catch (err) {
    console.error("login error:", err.message);
    res.status(500).json({ error: "Login failed. Try again." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
