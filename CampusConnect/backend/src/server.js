require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const placeRoutes = require("./routes/places");
const routeRoutes = require("./routes/route");

const required = ["MONGO_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env file. Copy .env.example to .env and fill it.`);
    process.exit(1);
  }
}

const app = express();

const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? "connected" : "not connected",
    campus: {
      lat: Number(process.env.CAMPUS_LAT) || 28.4572,
      lng: Number(process.env.CAMPUS_LNG) || 77.4972,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/route", routeRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));

// last safety net
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    // "0.0.0.0" so a phone on the same Wi-Fi can reach this server
    app.listen(PORT, "0.0.0.0", () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
