// Default map centre (Knowledge Park II, Greater Noida). Change if needed.
export const CAMPUS = { lat: 28.4572, lng: 77.4972 };

// Place chosen by scanning a QR code: "I am standing here" (used when GPS is weak indoors)
const START_KEY = "cc_start";

export function getStartSlug() {
  try {
    return sessionStorage.getItem(START_KEY) || "";
  } catch {
    return "";
  }
}

export function setStartSlug(slug) {
  try {
    if (slug) sessionStorage.setItem(START_KEY, slug);
    else sessionStorage.removeItem(START_KEY);
  } catch {
    /* ignore */
  }
}
