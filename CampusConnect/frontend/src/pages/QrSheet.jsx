import { useEffect, useState } from "react";
import Shell from "../components/Shell.jsx";
import QrImage from "../components/QrImage.jsx";
import { api } from "../lib/api.js";
import { go, placeLink } from "../lib/router.js";
import { placeSubtitle } from "../lib/categories.js";

// Admin: all QR codes on one page. Press Print and stick them on boards / doors.
export default function QrSheet() {
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .places({})
      .then((d) => setPlaces(d.places))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Shell
      title="Print QR codes"
      back={() => go("/admin")}
      right={
        <button onClick={() => window.print()} className="no-print text-xs bg-gold-400 text-slate-900 font-bold rounded-lg px-2.5 py-1.5">
          🖨️ Print
        </button>
      }
    >
      <p className="no-print text-sm text-slate-600 mb-3">
        Each QR opens that place in the app. The link inside uses the address you opened this page from
        ({window.location.origin}). Print after the app is hosted on its final address.
      </p>
      {error && <div className="text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {places.map((p) => (
          <div key={p.id} className="qr-card bg-white border border-slate-300 rounded-xl p-3 text-center">
            <QrImage text={placeLink(p.slug)} size={150} className="mx-auto" />
            <div className="font-bold mt-1 leading-tight">{p.name}</div>
            <div className="text-[11px] text-slate-500">{placeSubtitle(p)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">CampusConnect • scan to navigate</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
