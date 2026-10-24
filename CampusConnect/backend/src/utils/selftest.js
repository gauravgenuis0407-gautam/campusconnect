// Run with:  npm test
// Tests the pure helper code (no database / internet needed).
const assert = require("assert");
const { haversine, buildInstruction, parseRoute, straightLineRoute } = require("./steps");

// 1. distance: about 111.2 km per degree of latitude
const d = haversine(28.0, 77.0, 29.0, 77.0);
assert(d > 111000 && d < 111500, "haversine 1 degree should be ~111 km, got " + d);
assert.strictEqual(Math.round(haversine(28.5, 77.5, 28.5, 77.5)), 0);

// 2. instructions
assert.strictEqual(buildInstruction({ maneuver: { type: "turn", modifier: "left" }, name: "Main Road" }), "Turn left onto Main Road");
assert.strictEqual(buildInstruction({ maneuver: { type: "turn", modifier: "right" }, name: "" }), "Turn right");
assert.strictEqual(buildInstruction({ maneuver: { type: "depart" }, name: "Gate Road" }), "Start walking on Gate Road");
assert.strictEqual(buildInstruction({ maneuver: { type: "arrive" } }, "Central Library"), "You have reached Central Library");
assert.strictEqual(buildInstruction({ maneuver: { type: "roundabout", exit: 2 }, name: "" }), "Enter the roundabout and take exit 2");

// 3. parse a sample routing answer
const sample = {
  routes: [
    {
      distance: 250.4,
      duration: 190.2,
      geometry: { coordinates: [[77.4972, 28.4572], [77.4980, 28.4575], [77.4985, 28.4580]] },
      legs: [
        {
          steps: [
            { distance: 120, name: "Campus Road", maneuver: { type: "depart", location: [77.4972, 28.4572] } },
            { distance: 130, name: "Library Lane", maneuver: { type: "turn", modifier: "left", location: [77.4980, 28.4575] } },
            { distance: 0, name: "", maneuver: { type: "arrive", location: [77.4985, 28.4580] } },
          ],
        },
      ],
    },
  ],
};
const r = parseRoute(sample, { name: "Central Library" });
assert.strictEqual(r.distance, 250);
assert.strictEqual(r.duration, 190);
assert.strictEqual(r.geometry.length, 3);
assert.deepStrictEqual(r.geometry[0], [28.4572, 77.4972]); // lat first
assert.strictEqual(r.steps.length, 3);
assert.strictEqual(r.steps[1].text, "Turn left onto Library Lane");
assert.strictEqual(r.steps[2].text, "You have reached Central Library");
assert.strictEqual(parseRoute({ routes: [] }, {}), null);

// 4. fallback route
const f = straightLineRoute({ lat: 28.4572, lng: 77.4972 }, { lat: 28.4582, lng: 77.4972, name: "Canteen" });
assert(f.approximate === true && f.steps.length === 2 && f.distance > 100 && f.distance < 130);

console.log("All backend self tests passed.");
