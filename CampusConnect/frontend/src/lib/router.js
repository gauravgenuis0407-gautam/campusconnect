import { useEffect, useState } from "react";

// Tiny hash router. URLs look like  /#/place/central-library
// (hash links are easy to put inside QR codes and need no server settings)

function readHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, queryString] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { path: "/" + parts.join("/"), parts, query: new URLSearchParams(queryString || "") };
}

export function useRoute() {
  const [route, setRoute] = useState(readHash());
  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(path) {
  window.location.hash = path;
}

export function back(fallback = "/") {
  if (window.history.length > 1) window.history.back();
  else go(fallback);
}

// Link used inside QR codes
export function placeLink(slug) {
  return `${window.location.origin}/#/place/${slug}`;
}

// Gets the place slug out of whatever a QR code contains
export function slugFromQr(text) {
  const t = String(text || "").trim();
  const m = t.match(/#\/place\/([a-z0-9-]+)/i) || t.match(/\/place\/([a-z0-9-]+)/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-z0-9-]+$/i.test(t)) return t.toLowerCase();
  return "";
}
