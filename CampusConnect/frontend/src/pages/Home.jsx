import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell.jsx";
import MapView from "../components/MapView.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { go } from "../lib/router.js";
import { CATEGORY_INFO, CATEGORY_KEYS, emojiFor, placeSubtitle } from "../lib/categories.js";
import { CAMPUS, getStartSlug, setStartSlug } from "../lib/config.js";
import { haversine, formatDistance } from "../lib/geo.js";
import { useGps } from "../lib/useGps.js";

export default function Home() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | map
  const [startSlug, setStart] = useState(getStartSlug());
  const gps = useGps();

  // load places (waits a little while the user is typing)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      api
        .places({ q: q.trim(), category })
        .then((d) => {
          if (!alive) return;
          setPlaces(d.places);
          setError("");
        })
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, category]);

  const sorted = useMemo(() => {
    if (!gps.pos) return places;
    return [...places]
      .map((p) => ({ ...p, dist: haversine(gps.pos, p) }))
      .sort((a, b) => a.dist - b.dist);
  }, [places, gps.pos]);

  const center = CAMPUS;

  return (
    <Shell>
      <div className="mb-3">
        <div className="text-sm text-slate-500">Hello, {user.name.split(" ")[0]} 👋</div>
        <h1 className="text-2xl font-extrabold">Where do you want to go?</h1>
      </div>

      {startSlug && (
        <div className="mb-3 flex items-center justify-between bg-gold-400/20 border border-gold-400 rounded-xl px-3 py-2 text-sm">
          <span>
            📌 Starting point set: <b>{startSlug.replace(/-/g, " ")}</b>
          </span>
          <button
            className="text-brand-700 font-semibold"
            onClick={() => {
              setStartSlug("");
              setStart("");
            }}
          >
            Clear
          </button>
        </div>
      )}

      <div className="relative">
        <span className="absolute left-3 top-3 text-slate-400">🔎</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search library, canteen, room 335…"
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-3 outline-none focus:border-brand-500 shadow-sm"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto py-3 -mx-4 px-4">
        <Chip active={category === ""} onClick={() => setCategory("")}>
          All
        </Chip>
        {CATEGORY_KEYS.filter((k) => k !== "other").map((k) => (
          <Chip key={k} active={category === k} onClick={() => setCategory(category === k ? "" : k)}>
            {CATEGORY_INFO[k].emoji} {CATEGORY_INFO[k].label}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex rounded-xl bg-white border border-slate-200 overflow-hidden text-sm">
          <button onClick={() => setView("list")} className={`px-4 py-2 ${view === "list" ? "bg-brand-600 text-white" : "text-slate-600"}`}>
            List
          </button>
          <button onClick={() => setView("map")} className={`px-4 py-2 ${view === "map" ? "bg-brand-600 text-white" : "text-slate-600"}`}>
            Map
          </button>
        </div>
        <button
          onClick={() => (gps.active ? gps.stop() : gps.start())}
          className={`ml-auto text-sm rounded-xl px-3 py-2 border ${
            gps.active ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-slate-200 text-slate-600"
          }`}
        >
          {gps.active ? (gps.pos ? "📡 Using my location" : "📡 Locating…") : "📍 Show nearest first"}
        </button>
      </div>

      {gps.error && <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{gps.error}</div>}
      {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {view === "map" && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3">
          <MapView
            className="h-[55vh]"
            center={center}
            zoom={17}
            places={sorted}
            userPos={gps.pos}
            onMarkerClick={(p) => go(`/place/${p.slug}`)}
          />
        </div>
      )}

      {loading && places.length === 0 && <div className="text-center text-slate-500 py-10">Loading places…</div>}
      {!loading && !error && places.length === 0 && (
        <div className="text-center text-slate-500 py-10">No place found. Try another word.</div>
      )}

      <div className="space-y-2.5">
        {sorted.map((p) => (
          <button
            key={p.id}
            onClick={() => go(`/place/${p.slug}`)}
            className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3 active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-2xl">{emojiFor(p.category)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{p.name}</div>
              <div className="text-xs text-slate-500 truncate">{placeSubtitle(p) || CATEGORY_INFO[p.category]?.label}</div>
            </div>
            <div className="text-right shrink-0">
              {p.dist !== undefined && <div className="text-xs font-semibold text-brand-700">{formatDistance(p.dist)}</div>}
              {!p.verified && <div className="text-[10px] text-slate-400">approx.</div>}
            </div>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm border ${
        active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
