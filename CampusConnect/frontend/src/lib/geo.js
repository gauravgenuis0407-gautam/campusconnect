// Small map maths helpers. No browser code here, so they can be tested with node.

export function haversine(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Shortest distance (metres) from a point to a line made of [lat,lng] points
export function distanceToPolyline(point, line) {
  if (!line || line.length === 0) return Infinity;
  if (line.length === 1) return haversine(point, { lat: line[0][0], lng: line[0][1] });

  const lat0 = (point.lat * Math.PI) / 180;
  const mx = 111320 * Math.cos(lat0); // metres per degree longitude here
  const my = 110540; // metres per degree latitude
  const px = point.lng * mx;
  const py = point.lat * my;

  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = line[i][1] * mx;
    const ay = line[i][0] * my;
    const bx = line[i + 1][1] * mx;
    const by = line[i + 1][0] * my;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
}

export function formatDistance(m) {
  if (!Number.isFinite(m)) return "-";
  if (m < 1000) return `${Math.round(m / 5) * 5 || Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec)) return "-";
  const min = Math.max(1, Math.round(sec / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
