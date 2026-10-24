import { useCallback, useEffect, useRef, useState } from "react";
import MapView from "../components/MapView.jsx";
import { api } from "../lib/api.js";
import { back, go } from "../lib/router.js";
import { useGps } from "../lib/useGps.js";
import { navTick, startState, WALK_SPEED } from "../lib/nav.js";
import { formatDistance, formatDuration } from "../lib/geo.js";
import {
  askNotificationPermission,
  keepScreenOn,
  releaseScreen,
  setVoice,
  showNotification,
  speak,
  vibrate,
} from "../lib/notify.js";
import { CAMPUS, getStartSlug, setStartSlug } from "../lib/config.js";

function iconFor(step) {
  if (!step) return "⬆️";
  if (step.type === "arrive") return "🏁";
  if (step.type === "roundabout" || step.type === "rotary") return "🔄";
  const m = step.modifier || "";
  if (m === "uturn") return "↩️";
  if (m.includes("left")) return "⬅️";
  if (m.includes("right")) return "➡️";
  return "⬆️";
}

export default function Navigate({ slug }) {
  const [dest, setDest] = useState(null);
  const [startPlace, setStartPlace] = useState(null);
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState("ready"); // ready | navigating | arrived
  const [info, setInfo] = useState({ distToStep: 0, remaining: 0, stepIdx: 0 });
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");
  const [follow, setFollow] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [notif, setNotif] = useState("default");
  const [showSteps, setShowSteps] = useState(false);

  const gps = useGps();
  const routeRef = useRef(null);
  const navRef = useRef(null);
  const fetching = useRef(false);
  const lastFetch = useRef(0);

  // ---- load destination (and the "I am here" place if one was set)
  useEffect(() => {
    let alive = true;
    api
      .placeBySlug(slug)
      .then((d) => alive && setDest(d.place))
      .catch((e) => alive && setError(e.message));
    const s = getStartSlug();
    if (s && s !== slug) {
      api
        .placeBySlug(s)
        .then((d) => alive && setStartPlace(d.place))
        .catch(() => {});
    }
    gps.start();
    return () => {
      alive = false;
      releaseScreen();
      try {
        window.speechSynthesis && window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // banner disappears after a few seconds
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(""), 7000);
    return () => clearTimeout(t);
  }, [banner]);

  // where does the route start from?
  const weakGps = !gps.pos || gps.pos.accuracy > 40;
  const useOverride = !!startPlace && weakGps;
  const start = useOverride
    ? { lat: startPlace.lat, lng: startPlace.lng }
    : gps.pos
    ? { lat: gps.pos.lat, lng: gps.pos.lng }
    : null;

  const fetchRoute = useCallback(
    async (from) => {
      if (!dest || fetching.current) return null;
      fetching.current = true;
      try {
        const r = await api.route(from, dest);
        routeRef.current = r;
        navRef.current = startState(r);
        lastFetch.current = Date.now();
        setRoute(r);
        setError("");
        return r;
      } catch (e) {
        setError(e.message);
        return null;
      } finally {
        fetching.current = false;
      }
    },
    [dest]
  );

  // preview route as soon as we know where the user is
  useEffect(() => {
    if (status !== "ready" || !dest || !start || routeRef.current) return;
    fetchRoute(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, status, start && start.lat, start && start.lng]);

  // tell the user: banner + voice + vibration + phone notification
  function say(title, text) {
    setBanner(text);
    speak(text);
    vibrate();
    showNotification(title, text, "cc-nav");
  }

  async function startNav() {
    if (!gps.pos) {
      setError("Waiting for GPS. Go to an open area and wait a few seconds.");
      return;
    }
    setError("");
    const perm = await askNotificationPermission();
    setNotif(perm);
    keepScreenOn();
    const r = (await fetchRoute({ lat: gps.pos.lat, lng: gps.pos.lng })) || routeRef.current;
    if (!r) return;
    navRef.current = startState(r);
    setStatus("navigating");
    setFollow(true);
    const first = r.steps[0] ? r.steps[0].text : "Start walking";
    say("Navigation started", `${first}. ${formatDistance(r.distance)} to ${dest.name}.`);
  }

  function stopNav() {
    setStatus("ready");
    setFollow(false);
    releaseScreen();
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  // ---- runs on every new GPS reading while navigating
  useEffect(() => {
    if (status !== "navigating" || !gps.pos || !routeRef.current || !dest || !navRef.current) return;
    const pos = gps.pos;
    const res = navTick(navRef.current, pos, routeRef.current, dest);
    navRef.current = res.state;
    setInfo({ distToStep: res.distToStep, remaining: res.remaining, stepIdx: res.stepIdx });

    for (const ev of res.events) {
      if (ev.type === "arrive") {
        say("You have arrived", ev.text);
        setStatus("arrived");
        setFollow(false);
        gps.stop();
        releaseScreen();
      } else {
        say("Next turn", ev.text);
      }
    }

    if (res.offRoute) {
      say("Re-routing", "You are off the route. Finding a new way.");
      fetchRoute({ lat: pos.lat, lng: pos.lng });
    } else if (routeRef.current.approximate && Date.now() - lastFetch.current > 30000) {
      // walking service was down: quietly try again
      fetchRoute({ lat: pos.lat, lng: pos.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps.pos]);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoice(next);
  }

  // ---- what to show
  const steps = (route && route.steps) || [];
  const curStep = steps[info.stepIdx];
  const remaining = status === "ready" ? (route ? route.distance : 0) : info.remaining;
  const secPerM = route && route.distance > 0 ? route.duration / route.distance : 1 / WALK_SPEED;
  const eta = remaining * secPerM;

  let title = "Preparing route…";
  let sub = "";
  let icon = "🧭";
  if (status === "arrived") {
    title = `You have reached ${dest ? dest.name : "your destination"}`;
    icon = "🎉";
  } else if (status === "navigating" && curStep) {
    icon = iconFor(curStep);
    if (curStep.type === "arrive") {
      title = `Walk to ${dest.name}`;
      icon = "🏁";
    } else {
      title = curStep.text;
    }
    sub = `in ${formatDistance(info.distToStep)}`;
  } else if (route) {
    title = steps[0] ? steps[0].text : "Ready";
    sub = `${formatDistance(route.distance)} • ${formatDuration(route.duration)}`;
    icon = "🧭";
  }

  const mapCenter = dest ? { lat: dest.lat, lng: dest.lng } : CAMPUS;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-100">
      <MapView
        className="absolute inset-0 nav-map"
        center={mapCenter}
        zoom={18}
        destination={dest}
        userPos={gps.pos}
        routeLine={route ? route.geometry : null}
        follow={follow}
        onUserPan={() => follow && setFollow(false)}
        fitKey={dest ? dest.slug : ""}
      />

      {/* top: instruction card */}
      <div className="absolute top-0 inset-x-0 z-[1100] safe-top p-3 pointer-events-none">
        <div className="pointer-events-auto max-w-xl mx-auto bg-brand-700 text-white rounded-2xl shadow-xl px-3 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              stopNav();
              back(dest ? `/place/${dest.slug}` : "/");
            }}
            className="w-9 h-9 rounded-xl bg-white/15 text-lg shrink-0"
            aria-label="Back"
          >
            ←
          </button>
          <div className="text-3xl shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-tight">{title}</div>
            {sub && <div className="text-sm text-blue-100">{sub}</div>}
          </div>
        </div>
        {banner && (
          <div className="pointer-events-auto max-w-xl mx-auto mt-2 bg-gold-400 text-slate-900 rounded-xl px-3 py-2 text-sm font-semibold shadow">
            🔔 {banner}
          </div>
        )}
      </div>

      {/* bottom sheet */}
      <div className="absolute bottom-0 inset-x-0 z-[1100] safe-bottom">
        <div className="max-w-xl mx-auto bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.18)] px-4 pt-4 pb-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Destination</div>
              <div className="font-extrabold text-lg truncate">{dest ? dest.name : "Loading…"}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-brand-700 text-lg">{route ? formatDistance(remaining) : "—"}</div>
              <div className="text-xs text-slate-500">{route ? `${formatDuration(eta)} walk` : ""}</div>
            </div>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            {!gps.pos && !gps.error && <Note tone="blue">📡 Getting your GPS location… please wait.</Note>}
            {gps.pos && <Note tone="gray">GPS accuracy: about {Math.round(gps.pos.accuracy)} m</Note>}
            {useOverride && startPlace && (
              <Note tone="gold">
                Starting from <b>{startPlace.name}</b> (GPS is weak).{" "}
                <button
                  className="underline font-semibold"
                  onClick={() => {
                    setStartSlug("");
                    setStartPlace(null);
                    routeRef.current = null;
                    setRoute(null);
                  }}
                >
                  Use GPS instead
                </button>
              </Note>
            )}
            {route && route.approximate && (
              <Note tone="amber">Walking-route service is not reachable. Showing a straight line, it will retry automatically.</Note>
            )}
            {gps.error && <Note tone="red">{gps.error}</Note>}
            {error && <Note tone="red">{error}</Note>}
            {status === "navigating" && notif === "denied" && (
              <Note tone="gray">Phone notifications are off. You will still see and hear hints in the app.</Note>
            )}
            {status === "navigating" && (
              <Note tone="gray">Keep this screen open while walking so GPS keeps updating.</Note>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            {status === "ready" && (
              <button
                onClick={startNav}
                disabled={!route || !gps.pos}
                className="flex-1 rounded-2xl bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 text-lg"
              >
                ▶ Start walking
              </button>
            )}
            {status === "navigating" && (
              <>
                <button onClick={stopNav} className="flex-1 rounded-2xl bg-red-600 text-white font-bold py-3.5">
                  ■ End
                </button>
                <button onClick={toggleVoice} className="rounded-2xl border border-slate-200 px-4 text-xl" aria-label="Voice">
                  {voiceOn ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={() => setFollow(true)}
                  className={`rounded-2xl border px-4 text-xl ${follow ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}
                  aria-label="Recenter"
                >
                  🎯
                </button>
              </>
            )}
            {status === "arrived" && (
              <button onClick={() => go("/")} className="flex-1 rounded-2xl bg-green-600 text-white font-bold py-3.5">
                ✓ Done
              </button>
            )}
          </div>

          {steps.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowSteps(!showSteps)} className="text-sm text-brand-700 font-semibold">
                {showSteps ? "Hide" : "Show"} all steps ({steps.length})
              </button>
              {showSteps && (
                <ol className="mt-2 space-y-2">
                  {steps.map((s, i) => (
                    <li key={i} className={`flex gap-3 text-sm ${status === "navigating" && i === info.stepIdx ? "font-bold" : ""}`}>
                      <span className="w-6 text-center">{iconFor(s)}</span>
                      <span className="flex-1">{s.text}</span>
                      {s.distance > 0 && <span className="text-slate-400">{formatDistance(s.distance)}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Note({ tone, children }) {
  const tones = {
    blue: "bg-blue-50 text-blue-800",
    gray: "bg-slate-50 text-slate-500",
    gold: "bg-gold-400/20 text-slate-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
  };
  return <div className={`rounded-lg px-2.5 py-1.5 ${tones[tone]}`}>{children}</div>;
}
