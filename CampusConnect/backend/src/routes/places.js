const express = require("express");
const Place = require("../models/Place");
const { CATEGORIES } = require("../models/Place");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Checks body and builds the fields to save. Returns { error } or { data }
function readPlaceBody(body, isUpdate) {
  const out = {};
  if (!isUpdate || body.name !== undefined) {
    if (!body.name || !String(body.name).trim()) return { error: "Place name is required." };
    out.name = String(body.name).trim();
  }
  if (!isUpdate || body.slug !== undefined || body.name !== undefined) {
    const s = slugify(body.slug || body.name || "");
    if (!s) return { error: "Could not make a slug. Give a proper name." };
    out.slug = s;
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) return { error: "Invalid category." };
    out.category = body.category;
  }
  for (const f of ["building", "floor", "roomNo", "description", "parentSlug"]) {
    if (body[f] !== undefined) out[f] = String(body[f]).trim();
  }
  if (body.verified !== undefined) out.verified = !!body.verified;

  if (!isUpdate || body.lat !== undefined || body.lng !== undefined) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { error: "Valid lat and lng are required." };
    }
    out.location = { type: "Point", coordinates: [lng, lat] };
  }
  return { data: out };
}

// GET /api/places?q=lib&category=library
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    const q = (req.query.q || "").toString().trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { building: rx }, { roomNo: rx }, { description: rx }, { slug: rx }];
    }
    const places = await Place.find(filter).sort({ name: 1 }).limit(200);
    res.json({ places: places.map((p) => p.toClient()) });
  } catch (err) {
    console.error("places list error:", err.message);
    res.status(500).json({ error: "Could not load places." });
  }
});

// GET /api/places/nearby?lat=..&lng=..&max=500   (max in metres)
router.get("/nearby", requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const max = Math.min(Number(req.query.max) || 500, 5000);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng are required." });
    }
    const places = await Place.find({
      location: {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: max },
      },
    }).limit(20);
    res.json({ places: places.map((p) => p.toClient()) });
  } catch (err) {
    console.error("nearby error:", err.message);
    res.status(500).json({ error: "Could not find nearby places." });
  }
});

// GET /api/places/slug/central-library   (used when a QR code is scanned)
router.get("/slug/:slug", requireAuth, async (req, res) => {
  try {
    const place = await Place.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!place) return res.status(404).json({ error: "This QR / place was not found." });
    res.json({ place: place.toClient() });
  } catch (err) {
    res.status(500).json({ error: "Could not load the place." });
  }
});

// POST /api/places   (admin)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error, data } = readPlaceBody(req.body || {}, false);
    if (error) return res.status(400).json({ error });
    const exists = await Place.findOne({ slug: data.slug });
    if (exists) return res.status(409).json({ error: "A place with this name/slug already exists." });
    const place = await Place.create(data);
    res.status(201).json({ place: place.toClient() });
  } catch (err) {
    console.error("place create error:", err.message);
    res.status(500).json({ error: "Could not save the place." });
  }
});

// PUT /api/places/:id   (admin)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error, data } = readPlaceBody(req.body || {}, true);
    if (error) return res.status(400).json({ error });
    // Do not change the slug of an existing place (printed QR codes would break)
    delete data.slug;
    const place = await Place.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!place) return res.status(404).json({ error: "Place not found." });
    res.json({ place: place.toClient() });
  } catch (err) {
    console.error("place update error:", err.message);
    res.status(500).json({ error: "Could not update the place." });
  }
});

// DELETE /api/places/:id   (admin)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found." });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Could not delete the place." });
  }
});

module.exports = router;
