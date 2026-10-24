// All calls to the backend live here.
// Default: same address + "/api" (Vite forwards it to the backend).
// If the backend is hosted somewhere else, set VITE_API_URL in frontend/.env

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "cc_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: app still works until refresh */
  }
}

async function request(path, { method = "GET", body, query } = {}) {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += "?" + s;
  }

  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Cannot reach the server. Check internet / backend.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      window.dispatchEvent(new Event("cc-logout"));
    }
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  signup: (b) => request("/auth/signup", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me"),
  places: (query) => request("/places", { query }),
  placeBySlug: (slug) => request(`/places/slug/${encodeURIComponent(slug)}`),
  createPlace: (b) => request("/places", { method: "POST", body: b }),
  updatePlace: (id, b) => request(`/places/${id}`, { method: "PUT", body: b }),
  deletePlace: (id) => request(`/places/${id}`, { method: "DELETE" }),
  route: (from, to) =>
    request("/route", {
      query: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng, toName: to.name },
    }),
};
