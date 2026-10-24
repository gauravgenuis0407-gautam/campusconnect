import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Shell from "../components/Shell.jsx";
import { back, go, slugFromQr } from "../lib/router.js";

const READER_ID = "qr-reader";

export default function Scan() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const scannerRef = useRef(null);
  const doneRef = useRef(false);

  async function stopCamera() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* already stopped */
    }
    try {
      s.clear();
    } catch {
      /* ignore */
    }
  }

  async function startCamera() {
    setError("");
    doneRef.current = false;
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (doneRef.current) return;
          const slug = slugFromQr(text);
          if (!slug) {
            setError("This QR code is not a CampusConnect place code.");
            return;
          }
          doneRef.current = true;
          stopCamera().finally(() => go(`/place/${slug}`));
        },
        () => {
          /* no QR in this frame: normal */
        }
      );
      setRunning(true);
    } catch (e) {
      scannerRef.current = null;
      setRunning(false);
      setError(
        "Camera could not start. Allow camera permission. The camera needs https (or localhost). You can also type the code below."
      );
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function openManual(e) {
    e.preventDefault();
    const slug = slugFromQr(manual);
    if (!slug) return setError("Type a place code like central-library, or paste the QR link.");
    go(`/place/${slug}`);
  }

  return (
    <Shell title="Scan QR" back={() => back("/")}>
      <p className="text-sm text-slate-600 mb-3">
        Scan the QR code on a campus board or door. You will see that place and can start directions from there.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
        <div id={READER_ID} className="w-full rounded-xl overflow-hidden bg-slate-900 min-h-[260px]" />
        {!running ? (
          <button onClick={startCamera} className="mt-3 w-full rounded-xl bg-brand-600 text-white font-bold py-3.5">
            📷 Start camera
          </button>
        ) : (
          <button
            onClick={() => {
              stopCamera();
              setRunning(false);
            }}
            className="mt-3 w-full rounded-xl bg-slate-200 font-bold py-3.5"
          >
            Stop camera
          </button>
        )}
      </div>

      {error && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <form onSubmit={openManual} className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
        <div className="text-sm font-semibold mb-2">Camera not working? Type the code</div>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="central-library"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-500"
          />
          <button className="rounded-xl bg-brand-600 text-white font-bold px-4">Open</button>
        </div>
      </form>
    </Shell>
  );
}
