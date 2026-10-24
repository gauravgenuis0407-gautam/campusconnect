export const CATEGORY_INFO = {
  library: { label: "Library", emoji: "📚" },
  canteen: { label: "Canteen", emoji: "🍔" },
  office: { label: "Offices", emoji: "🏢" },
  hostel: { label: "Hostel", emoji: "🛏️" },
  hall: { label: "Halls", emoji: "🎤" },
  room: { label: "Rooms", emoji: "🚪" },
  parking: { label: "Parking", emoji: "🅿️" },
  metro: { label: "Metro", emoji: "🚇" },
  ground: { label: "Ground", emoji: "🏏" },
  gate: { label: "Gate", emoji: "⛩️" },
  other: { label: "Other", emoji: "📍" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_INFO);

export function emojiFor(category) {
  return (CATEGORY_INFO[category] || CATEGORY_INFO.other).emoji;
}

export function placeSubtitle(p) {
  return [p.building, p.floor, p.roomNo ? `Room ${p.roomNo}` : ""].filter(Boolean).join(" • ");
}
