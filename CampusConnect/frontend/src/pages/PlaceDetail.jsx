import { useEffect, useState } from "react";
import Shell from "../components/Shell.jsx";
import MapView from "../components/MapView.jsx";
import QrImage from "../components/QrImage.jsx";
import { api } from "../lib/api.js";
import { back, go, placeLink } from "../lib/router.js";
import { CATEGORY_INFO, emojiFor, placeSubtitle } from "../lib/categories.js";
import { setStartSlug } from "../lib/config.js";

export default function PlaceDetail({ slug }) {
  const [place, setPlace] = useState(null);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [startMsg, setStartMsg] = useState("");

  useEffect(() => {
    let alive = true;
    setPlace(null);
    setError("");
    api
      .placeBySlug(slug)
      .then((d) => alive && setPlace(d.place))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <Shell title={place ? place.name : "Place"} back={() => back("/")}>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4">
          {error}
          <div className="mt-3">
            <button className="text-brand-700 font-semibold" onClick={() => go("/")}>
              ← Go to Home
            </button>
          </div>
        </div>
      )}

      {!place && !error && <div className="text-center text-slate-500 py-10">Loading…</div>}

      {place && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl">{emojiFor(place.category)}</div>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold">{place.name}</h1>
                <div className="text-sm text-slate-500">{placeSubtitle(place) || CATEGORY_INFO[place.category]?.label}</div>
              </div>
            </div>
            {place.description && <p className="text-slate-600 text-sm mt-3">{place.description}</p>}
            <div className="mt-3">
              {place.verified ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1">✓ Location verified</span>
              ) : (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1">
                  Approximate location (not yet verified on campus)
                </span>
              )}
            </div>
            {place.parentSlug && (
              <button onClick={() => go(`/place/${place.parentSlug}`)} className="mt-3 text-sm text-brand-700 font-semibold block">
                Inside: {place.parentSlug.replace(/-/g, " ")} →
              </button>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <MapView
              className="h-60"
              center={{ lat: place.lat, lng: place.lng }}
              zoom={18}
              places={[place]}
              selectedSlug={place.slug}
            />
          </div>

          <button
            onClick={() => go(`/nav/${place.slug}`)}
            className="w-full rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 text-lg shadow"
          >
            🧭 Start navigation
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setStartSlug(place.slug);
                setStartMsg(`Done. Now pick where you want to go. Directions will start from ${place.name}.`);
              }}
              className="rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold"
            >
              📌 I am here
            </button>
            <button onClick={() => setShowQr(!showQr)} className="rounded-2xl bg-white border border-slate-200 py-3 text-sm font-semibold">
              {showQr ? "Hide QR" : "🔳 Show QR"}
            </button>
          </div>

          {startMsg && (
            <div className="bg-gold-400/20 border border-gold-400 rounded-xl p-3 text-sm">
              {startMsg}
              <button className="block mt-2 text-brand-700 font-semibold" onClick={() => go("/")}>
                Choose destination →
              </button>
            </div>
          )}

          {showQr && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <QrImage text={placeLink(place.slug)} size={220} className="mx-auto" />
              <div className="text-xs text-slate-500 mt-2 break-all">{placeLink(place.slug)}</div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
