import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell.jsx";
import MapView from "../components/MapView.jsx";
import QrImage, { downloadQr } from "../components/QrImage.jsx";
import { api } from "../lib/api.js";
import { back, go, placeLink } from "../lib/router.js";
import { CATEGORY_INFO, CATEGORY_KEYS, emojiFor, placeSubtitle } from "../lib/categories.js";
import { CAMPUS } from "../lib/config.js";
import { getPositionOnce } from "../lib/useGps.js";

const EMPTY = {
  id: "",
  name: "",
  slug: "",
  category: "other",
  building: "",
  floor: "",
  roomNo: "",
  description: "",
  parentSlug: "",
  lat: "",
  lng: "",
  verified: false,
};

export default function Admin() {
  const [places, setPlaces] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null = list view
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [showQr, setShowQr] = useState(false);

  function load() {
    api
      .places({})
      .then((d) => setPlaces(d.places))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return places;
    return places.filter((p) => `${p.name} ${p.building} ${p.roomNo} ${p.category}`.toLowerCase().includes(t));
  }, [places, q]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function openEdit(p) {
    setMsg("");
    setError("");
    setAccuracy(null);
    setShowQr(false);
    setForm({ ...EMPTY, ...p, lat: String(p.lat), lng: String(p.lng) });
  }

  function openNew() {
    setMsg("");
    setError("");
    setAccuracy(null);
    setShowQr(false);
    setForm({ ...EMPTY, lat: String(CAMPUS.lat), lng: String(CAMPUS.lng) });
  }

  async function useMyGps() {
    setMsg("");
    setError("");
    setBusy(true);
    try {
      const p = await getPositionOnce();
      setForm((f) => ({ ...f, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6), verified: true }));
      setAccuracy(Math.round(p.accuracy));
      setMsg(`Location taken from your GPS (accuracy about ${Math.round(p.accuracy)} m). Press Save.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setMsg("");
    setError("");
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim()) return setError("Name is required.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setError("Latitude and longitude must be numbers.");
    const body = {
      name: form.name,
      category: form.category,
      building: form.building,
      floor: form.floor,
      roomNo: form.roomNo,
      description: form.description,
      parentSlug: form.parentSlug,
      lat,
      lng,
      verified: form.verified,
    };
    setBusy(true);
    try {
      if (form.id) {
        const d = await api.updatePlace(form.id, body);
        setForm({ ...EMPTY, ...d.place, lat: String(d.place.lat), lng: String(d.place.lng) });
        setMsg("Saved ✓");
      } else {
        const d = await api.createPlace(body);
        setForm({ ...EMPTY, ...d.place, lat: String(d.place.lat), lng: String(d.place.lng) });
        setMsg("Place added ✓");
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!window.confirm(`Delete "${form.name}"? Its printed QR code will stop working.`)) return;
    setBusy(true);
    try {
      await api.deletePlace(form.id);
      setForm(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const latN = Number(form && form.lat);
  const lngN = Number(form && form.lng);
  const hasPoint = form && Number.isFinite(latN) && Number.isFinite(lngN) && form.lat !== "" && form.lng !== "";

  // ---------------- edit view
  if (form) {
    return (
      <Shell title={form.id ? "Edit place" : "Add place"} back={() => setForm(null)}>
        <div className="space-y-3">
          <div className="text-sm text-slate-600 bg-gold-400/20 border border-gold-400 rounded-xl p-3">
            <b>Set the exact location:</b> stand at the place, press <b>“Use my GPS here”</b> and wait for good accuracy (under 15 m
            is best, go outside for a better signal). Or tap the map. Then press Save.
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <MapView
              className="h-72"
              center={hasPoint ? { lat: latN, lng: lngN } : CAMPUS}
              zoom={18}
              places={places.filter((p) => p.id !== form.id)}
              pickPoint={hasPoint ? { lat: latN, lng: lngN } : null}
              onPick={(pt) => {
                setForm((f) => ({ ...f, lat: pt.lat.toFixed(6), lng: pt.lng.toFixed(6), verified: false }));
                setAccuracy(null);
              }}
            />
          </div>

          <button
            onClick={useMyGps}
            disabled={busy}
            className="w-full rounded-2xl bg-green-600 disabled:opacity-60 text-white font-bold py-3.5"
          >
            📍 Use my GPS here
          </button>
          {accuracy !== null && (
            <div className={`text-xs ${accuracy <= 15 ? "text-green-700" : "text-amber-700"}`}>
              GPS accuracy: about {accuracy} m {accuracy > 15 ? "(not great, try outside / wait and press again)" : "(good)"}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
            <Field label="Name">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className="inp" placeholder="Central Library" />
            </Field>
            {form.id && (
              <Field label="QR code id (cannot change)">
                <input value={form.slug} disabled className="inp bg-slate-50 text-slate-500" />
              </Field>
            )}
            <Field label="Category">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="inp">
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_INFO[k].emoji} {CATEGORY_INFO[k].label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Building">
                <input value={form.building} onChange={(e) => set("building", e.target.value)} className="inp" />
              </Field>
              <Field label="Floor">
                <input value={form.floor} onChange={(e) => set("floor", e.target.value)} className="inp" placeholder="3rd Floor" />
              </Field>
              <Field label="Room no.">
                <input value={form.roomNo} onChange={(e) => set("roomNo", e.target.value)} className="inp" />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className="inp"
                placeholder="Short help text for students"
              />
            </Field>
            <Field label="Inside which place? (slug, optional)">
              <input value={form.parentSlug} onChange={(e) => set("parentSlug", e.target.value)} className="inp" placeholder="admin-block" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude">
                <input value={form.lat} onChange={(e) => set("lat", e.target.value)} inputMode="decimal" className="inp" />
              </Field>
              <Field label="Longitude">
                <input value={form.lng} onChange={(e) => set("lng", e.target.value)} inputMode="decimal" className="inp" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} className="w-5 h-5" />
              Location verified on campus
            </label>
          </div>

          {msg && <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</div>}
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <button onClick={save} disabled={busy} className="w-full rounded-2xl bg-brand-600 disabled:opacity-60 text-white font-bold py-3.5">
            💾 Save
          </button>

          {form.id && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowQr(!showQr)} className="rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold">
                  🔳 {showQr ? "Hide" : "Show"} QR
                </button>
                <button onClick={remove} className="rounded-2xl bg-white border border-red-200 text-red-600 py-3 text-sm font-semibold">
                  🗑️ Delete
                </button>
              </div>
              {showQr && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                  <QrImage text={placeLink(form.slug)} size={200} className="mx-auto" />
                  <div className="text-xs text-slate-500 mt-2 break-all">{placeLink(form.slug)}</div>
                  <button
                    onClick={() => downloadQr(placeLink(form.slug), `qr-${form.slug}.png`)}
                    className="mt-3 rounded-xl bg-brand-600 text-white font-semibold px-4 py-2 text-sm"
                  >
                    ⬇ Download PNG
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ---------------- list view
  const verifiedCount = places.filter((p) => p.verified).length;

  return (
    <Shell title="Admin" back={() => back("/")}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
        <div className="font-bold">Campus places</div>
        <div className="text-sm text-slate-500">
          {verifiedCount} of {places.length} locations verified on campus
        </div>
        <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: places.length ? `${(verifiedCount / places.length) * 100}%` : 0 }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={openNew} className="rounded-xl bg-brand-600 text-white font-bold py-2.5 text-sm">
            ＋ Add place
          </button>
          <button onClick={() => go("/admin/qr")} className="rounded-xl bg-white border border-slate-200 font-semibold py-2.5 text-sm">
            🖨️ Print all QR
          </button>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search places…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-brand-500 mb-3"
      />
      {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}

      <div className="space-y-2">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => openEdit(p)}
            className="w-full text-left bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3"
          >
            <div className="text-2xl">{emojiFor(p.category)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{p.name}</div>
              <div className="text-xs text-slate-500 truncate">{placeSubtitle(p) || p.slug}</div>
            </div>
            {p.verified ? (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">✓ verified</span>
            ) : (
              <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">approx</span>
            )}
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
