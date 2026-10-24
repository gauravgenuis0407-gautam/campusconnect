// Run with:  npm run seed
// Adds the starting campus places. Existing places (same slug) are NOT overwritten,
// so places you already verified are safe. Use  npm run seed -- --reset  to wipe and start fresh.
require("dotenv").config();
const mongoose = require("mongoose");
const Place = require("./models/Place");
const places = require("./data/places");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--reset")) {
    await Place.deleteMany({});
    console.log("Old places removed.");
  }

  let added = 0;
  let skipped = 0;
  for (const p of places) {
    const exists = await Place.findOne({ slug: p.slug });
    if (exists) {
      skipped++;
      continue;
    }
    const [lat, lng] = p.coords;
    await Place.create({
      name: p.name,
      slug: p.slug,
      category: p.category,
      building: p.building || "",
      floor: p.floor || "",
      roomNo: p.roomNo || "",
      description: p.description || "",
      parentSlug: p.parentSlug || "",
      location: { type: "Point", coordinates: [lng, lat] },
      verified: false,
    });
    added++;
  }
  console.log(`Seed done. Added ${added}, skipped ${skipped} (already present).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
