// Run with:  npm test      (tests map maths + navigation logic, no browser needed)
import assert from "node:assert";
import { haversine, distanceToPolyline, formatDistance, formatDuration } from "./geo.js";
import { navTick, startState, ARRIVE_M } from "./nav.js";

// --- geo
const d = haversine({ lat: 28, lng: 77 }, { lat: 29, lng: 77 });
assert(d > 111000 && d < 111500);
// point 50 m east of a north-south line
const line = [
  [28.4572, 77.4972],
  [28.4592, 77.4972],
];
const eastM = 50 / (111320 * Math.cos((28.458 * Math.PI) / 180));
const dl = distanceToPolyline({ lat: 28.4582, lng: 77.4972 + eastM }, line);
assert(Math.abs(dl - 50) < 1.5, "distance to line should be ~50, got " + dl);
assert.strictEqual(formatDistance(480), "480 m");
assert.strictEqual(formatDistance(1530), "1.5 km");
assert.strictEqual(formatDuration(30), "1 min");
assert.strictEqual(formatDuration(5400), "1 h 30 min");

// --- navigation: walk north along a line, with a turn in the middle
const route = {
  approximate: false,
  geometry: [
    [28.4572, 77.4972],
    [28.4582, 77.4972],
    [28.4582, 77.4982],
  ],
  steps: [
    { text: "Start walking on Campus Road", distance: 111, lat: 28.4572, lng: 77.4972, type: "depart" },
    { text: "Turn right onto Library Lane", distance: 98, lat: 28.4582, lng: 77.4972, type: "turn" },
    { text: "You have reached Central Library", distance: 0, lat: 28.4582, lng: 77.4982, type: "arrive" },
  ],
};
const dest = { lat: 28.4582, lng: 77.4982, name: "Central Library" };

let st = startState(route);
assert.strictEqual(st.stepIdx, 1);

// far away: no announcement
let r = navTick(st, { lat: 28.4573, lng: 77.4972, accuracy: 5 }, route, dest);
assert.strictEqual(r.events.length, 0);
assert(r.remaining > 190 && r.remaining < 230, "remaining " + r.remaining);
st = r.state;

// ~40 m before the turn: announce once
r = navTick(st, { lat: 28.45784, lng: 77.4972, accuracy: 5 }, route, dest);
assert.strictEqual(r.events.length, 1);
assert.strictEqual(r.events[0].type, "announce");
assert(/turn right onto Library Lane/.test(r.events[0].text), r.events[0].text);
st = r.state;
r = navTick(st, { lat: 28.45790, lng: 77.4972, accuracy: 5 }, route, dest);
assert.strictEqual(r.events.length, 0, "must announce only once");
st = r.state;

// reached the turn: moves to the last step
r = navTick(st, { lat: 28.45819, lng: 77.4972, accuracy: 5 }, route, dest);
assert.strictEqual(r.stepIdx, 2);
st = r.state;

// arrive
r = navTick(st, { lat: 28.4582, lng: 77.49815, accuracy: 5 }, route, dest);
assert.strictEqual(r.events[0].type, "arrive");
assert(haversine({ lat: 28.4582, lng: 77.49815 }, dest) <= ARRIVE_M);
st = r.state;
r = navTick(st, { lat: 28.4582, lng: 77.49815, accuracy: 5 }, route, dest);
assert.strictEqual(r.events.length, 0, "arrive only once");

// off route: 3 readings far from the line
st = startState(route);
const far = { lat: 28.4577, lng: 77.4962, accuracy: 5 }; // ~100 m west of the line
let off = false;
for (let i = 0; i < 3; i++) {
  r = navTick(st, far, route, dest);
  st = r.state;
  off = r.offRoute;
}
assert.strictEqual(off, true, "should detect off route after 3 readings");

// straight-line fallback route never reports off route
const rough = { approximate: true, geometry: route.geometry.slice(0, 2), steps: [route.steps[0], route.steps[2]] };
st = startState(rough);
for (let i = 0; i < 5; i++) {
  r = navTick(st, far, rough, dest);
  st = r.state;
  assert.strictEqual(r.offRoute, false);
}

console.log("All frontend logic tests passed.");
