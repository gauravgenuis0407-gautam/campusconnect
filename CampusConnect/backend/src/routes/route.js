const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { parseRoute, straightLineRoute } = require("../utils/steps");

const router = express.Router();

// GET /api/route?fromLat=..&fromLng=..&toLat=..&toLng=..&toName=Central%20Library
// Returns { distance (m), duration (s), geometry [[lat,lng]...], steps [...], approximate }
router.get("/", requireAuth, async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);
  const toName = (req.query.toName || "").toString().slice(0, 100);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return res.status(400).json({ error: "fromLat, fromLng, toLat and toLng are required." });
  }

  const from = { lat: fromLat, lng: fromLng };
  const to = { lat: toLat, lng: toLng, name: toName };

  const base = (process.env.ROUTING_URL || "https://routing.openstreetmap.de/routed-foot/route/v1/foot").replace(/\/$/, "");
  const url = `${base}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "CampusConnect-MiniProject/1.0" } });
    if (!r.ok) throw new Error("routing service answered " + r.status);
    const data = await r.json();
    const parsed = parseRoute(data, to);
    if (!parsed || parsed.geometry.length < 2) throw new Error("no route found");
    return res.json(parsed);
  } catch (err) {
    console.warn("routing fallback used:", err.message);
    // Do not fail the app. Show a straight line and say so.
    return res.json(straightLineRoute(from, to));
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
