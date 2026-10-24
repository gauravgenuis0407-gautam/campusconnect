const mongoose = require("mongoose");

const CATEGORIES = [
  "library",
  "canteen",
  "office",
  "hostel",
  "hall",
  "room",
  "parking",
  "metro",
  "ground",
  "gate",
  "other",
];

const placeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // short url-safe id, used inside QR codes. Example: "central-library"
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "other" },
    building: { type: String, default: "", trim: true },
    floor: { type: String, default: "", trim: true },
    roomNo: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    // GeoJSON point. IMPORTANT: order is [longitude, latitude]
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90,
          message: "coordinates must be [lng, lat]",
        },
      },
    },
    // false = approximate position, true = admin stood there and confirmed it
    verified: { type: Boolean, default: false },
    // if a room is inside a building, we can point to the building's entrance
    parentSlug: { type: String, default: "" },
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ name: "text", building: "text", roomNo: "text", description: "text" });

placeSchema.methods.toClient = function () {
  const [lng, lat] = this.location.coordinates;
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    category: this.category,
    building: this.building,
    floor: this.floor,
    roomNo: this.roomNo,
    description: this.description,
    lat,
    lng,
    verified: this.verified,
    parentSlug: this.parentSlug,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Place", placeSchema);
module.exports.CATEGORIES = CATEGORIES;
