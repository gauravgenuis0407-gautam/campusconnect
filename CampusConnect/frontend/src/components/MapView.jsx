import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { emojiFor } from "../lib/categories.js";

// One reusable map.
// places       : pins to show               [{slug,name,lat,lng,category,verified}]
// selectedSlug : pin drawn in yellow
// userPos      : blue dot                   {lat,lng,accuracy}
// destination  : red pin                    {lat,lng,name}
// routeLine    : blue line                  [[lat,lng],...]
// follow       : keep the map centred on the user
// pickPoint    : yellow dot placed by the admin {lat,lng}
// onPick       : called with {lat,lng} when the map is tapped
export default function MapView({
  center,
  zoom = 17,
  places = [],
  selectedSlug = "",
  userPos = null,
  destination = null,
  routeLine = null,
  follow = false,
  pickPoint = null,
  onPick = null,
  onMarkerClick = null,
  onUserPan = null,
  fitKey = "",
  className = "",
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({});
  const cb = useRef({});
  cb.current = { onPick, onMarkerClick, onUserPan };

  // create the map once
  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(
      [center.lat, center.lng],
      zoom
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    layers.current.places = L.layerGroup().addTo(map);
    layers.current.route = L.layerGroup().addTo(map);

    map.on("click", (e) => cb.current.onPick && cb.current.onPick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on("dragstart", () => cb.current.onUserPan && cb.current.onUserPan());

    mapRef.current = map;
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      layers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // place pins
  useEffect(() => {
    const group = layers.current.places;
    if (!group) return;
    group.clearLayers();
    places.forEach((p) => {
      const selected = p.slug === selectedSlug;
      const cls = `cc-pin${selected ? " selected" : ""}${p.verified ? "" : " unverified"}`;
      const icon = L.divIcon({
        className: "",
        html: `<div class="${cls}"><span>${emojiFor(p.category)}</span></div>`,
        iconSize: selected ? [42, 42] : [34, 34],
        iconAnchor: selected ? [21, 42] : [17, 34],
      });
      const m = L.marker([p.lat, p.lng], { icon, title: p.name });
      const tip = document.createElement("span");
      tip.textContent = p.name;
      m.bindTooltip(tip, { direction: "top", offset: [0, -30] });
      m.on("click", () => cb.current.onMarkerClick && cb.current.onMarkerClick(p));
      m.addTo(group);
    });
  }, [places, selectedSlug]);

  // blue dot for the user
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const l = layers.current;
    if (!userPos) {
      if (l.user) {
        map.removeLayer(l.user);
        l.user = null;
      }
      if (l.acc) {
        map.removeLayer(l.acc);
        l.acc = null;
      }
      return;
    }
    const ll = [userPos.lat, userPos.lng];
    if (!l.user) {
      l.user = L.marker(ll, {
        icon: L.divIcon({ className: "", html: '<div class="cc-user"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      l.user.setLatLng(ll);
    }
    const r = Math.min(userPos.accuracy || 0, 200);
    if (!l.acc) {
      l.acc = L.circle(ll, { radius: r, color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.1, interactive: false }).addTo(map);
    } else {
      l.acc.setLatLng(ll);
      l.acc.setRadius(r);
    }
    if (follow) map.setView(ll, Math.max(map.getZoom(), 18), { animate: true });
  }, [userPos, follow]);

  // red destination pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const l = layers.current;
    if (l.dest) {
      map.removeLayer(l.dest);
      l.dest = null;
    }
    if (!destination) return;
    l.dest = L.marker([destination.lat, destination.lng], {
      icon: L.divIcon({
        className: "",
        html: '<div class="cc-pin cc-dest"><span>🏁</span></div>',
        iconSize: [42, 42],
        iconAnchor: [21, 42],
      }),
      zIndexOffset: 900,
    }).addTo(map);
  }, [destination]);

  // route line
  useEffect(() => {
    const map = mapRef.current;
    const group = layers.current.route;
    if (!map || !group) return;
    group.clearLayers();
    if (!routeLine || routeLine.length < 2) return;
    L.polyline(routeLine, { color: "#ffffff", weight: 10, opacity: 0.9 }).addTo(group);
    const line = L.polyline(routeLine, { color: "#2563eb", weight: 6, opacity: 0.95, lineJoin: "round" }).addTo(group);
    if (!follow) {
      try {
        map.fitBounds(line.getBounds(), { padding: [40, 40], maxZoom: 19 });
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeLine, fitKey]);

  // admin pick point
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const l = layers.current;
    if (l.pick) {
      map.removeLayer(l.pick);
      l.pick = null;
    }
    if (!pickPoint || !Number.isFinite(pickPoint.lat) || !Number.isFinite(pickPoint.lng)) return;
    l.pick = L.marker([pickPoint.lat, pickPoint.lng], {
      icon: L.divIcon({ className: "", html: '<div class="cc-pick"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
      zIndexOffset: 800,
    }).addTo(map);
  }, [pickPoint]);

  // move the map when the centre prop changes (not while following)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || follow) return;
    map.setView([center.lat, center.lng], map.getZoom() < 15 ? zoom : map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return <div ref={elRef} className={className} style={{ minHeight: 120 }} />;
}

// helper for pages: public function to re-centre the map is not needed,
// pages simply change the "center" prop.
