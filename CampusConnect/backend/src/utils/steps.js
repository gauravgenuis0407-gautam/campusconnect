// Helpers that turn a routing-service answer (OSRM format) into simple
// walking hints for the app. No database or network here, so it is easy to test.

function round(n, d = 6) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

// Distance in metres between two lat/lng points (haversine formula)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const MODIFIER_TEXT = {
  uturn: "Take a U-turn",
  "sharp right": "Take a sharp right",
  right: "Turn right",
  "slight right": "Bear slightly right",
  straight: "Go straight",
  "slight left": "Bear slightly left",
  left: "Turn left",
  "sharp left": "Take a sharp left",
};

// Makes one readable sentence for one routing step
function buildInstruction(step, destinationName) {
  const m = step.maneuver || {};
  const type = m.type;
  const modifier = m.modifier;
  const road = step.name ? ` onto ${step.name}` : "";

  switch (type) {
    case "depart":
      return step.name ? `Start walking on ${step.name}` : "Start walking";
    case "arrive":
      return destinationName ? `You have reached ${destinationName}` : "You have reached your destination";
    case "roundabout":
    case "rotary":
      return `Enter the roundabout${m.exit ? " and take exit " + m.exit : ""}`;
    case "exit roundabout":
      return `Exit the roundabout${road}`;
    case "continue":
      return step.name ? `Continue on ${step.name}` : "Continue straight";
    case "new name":
      return step.name ? `Continue on ${step.name}` : "Continue straight";
    case "end of road":
      return `${MODIFIER_TEXT[modifier] || "Turn"} at the end of the road${road}`;
    case "fork":
      return `Keep ${modifier && modifier.includes("left") ? "left" : "right"} at the fork`;
    case "merge":
      return `Merge${road}`;
    default:
      if (modifier && MODIFIER_TEXT[modifier]) {
        return modifier === "straight" && !step.name
          ? "Go straight"
          : `${MODIFIER_TEXT[modifier]}${road}`;
      }
      return step.name ? `Continue on ${step.name}` : "Continue";
  }
}

// data = JSON answer from routing service. to = { lat, lng, name }
function parseRoute(data, to) {
  const route = data && data.routes && data.routes[0];
  if (!route) return null;

  const geometry = (route.geometry && route.geometry.coordinates ? route.geometry.coordinates : []).map(
    ([lng, lat]) => [round(lat), round(lng)]
  );

  const steps = [];
  for (const leg of route.legs || []) {
    for (const s of leg.steps || []) {
      const loc = s.maneuver && s.maneuver.location;
      if (!loc) continue;
      steps.push({
        text: buildInstruction(s, to && to.name),
        distance: Math.round(s.distance || 0), // metres of this step AFTER the manoeuvre
        lat: round(loc[1]),
        lng: round(loc[0]),
        type: (s.maneuver && s.maneuver.type) || "",
        modifier: (s.maneuver && s.maneuver.modifier) || "",
        name: s.name || "",
      });
    }
  }

  return {
    distance: Math.round(route.distance || 0),
    duration: Math.round(route.duration || 0),
    geometry,
    steps,
    approximate: false,
  };
}

// Used when the routing service is down: a straight line + one hint
function straightLineRoute(from, to) {
  const d = Math.round(haversine(from.lat, from.lng, to.lat, to.lng));
  return {
    distance: d,
    duration: Math.round(d / 1.3), // about 1.3 m/s walking speed
    geometry: [
      [round(from.lat), round(from.lng)],
      [round(to.lat), round(to.lng)],
    ],
    steps: [
      {
        text: `Walk straight towards ${to.name || "your destination"}`,
        distance: d,
        lat: round(from.lat),
        lng: round(from.lng),
        type: "depart",
        modifier: "straight",
        name: "",
      },
      {
        text: `You have reached ${to.name || "your destination"}`,
        distance: 0,
        lat: round(to.lat),
        lng: round(to.lng),
        type: "arrive",
        modifier: "",
        name: "",
      },
    ],
    approximate: true,
  };
}

module.exports = { haversine, buildInstruction, parseRoute, straightLineRoute };
