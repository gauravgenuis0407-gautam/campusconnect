// Starting list of campus places.
// IMPORTANT: lat/lng below are only APPROXIMATE (around Knowledge Park II, Greater Noida).
// Gaurav will stand at each place and fix it from the Admin screen (it becomes "verified").
// Format: [lat, lng]

const CENTER = [28.4572, 77.4972];

// small helper: move a point by metres (north, east) so approximate points are not all stacked
function off(northM, eastM) {
  const dLat = northM / 111320;
  const dLng = eastM / (111320 * Math.cos((CENTER[0] * Math.PI) / 180));
  return [Number((CENTER[0] + dLat).toFixed(6)), Number((CENTER[1] + dLng).toFixed(6))];
}

const rooms = ["335", "336", "337", "338", "339", "340"].map((no, i) => ({
  name: `Room ${no}`,
  slug: `room-${no}`,
  category: "room",
  building: "Academic Block",
  floor: "3rd Floor",
  roomNo: no,
  description: `Room ${no}, 3rd floor. Building/floor to be confirmed on campus.`,
  coords: off(40, -60),
  parentSlug: "academic-block",
}));

module.exports = [
  {
    name: "Main Gate",
    slug: "main-gate",
    category: "gate",
    description: "Main entrance of the campus.",
    coords: off(-150, 0),
  },
  {
    name: "Parking",
    slug: "parking",
    category: "parking",
    description: "Vehicle parking area.",
    coords: off(-110, 70),
  },
  {
    name: "Knowledge Park Metro Station",
    slug: "knowledge-park-metro-station",
    category: "metro",
    description: "Nearest Aqua Line metro station.",
    coords: off(-260, 180),
  },
  {
    name: "Admin Block",
    slug: "admin-block",
    category: "office",
    building: "Admin Block",
    description: "Administrative building.",
    coords: off(0, 0),
  },
  {
    name: "Register Office",
    slug: "register-office",
    category: "office",
    building: "Admin Block",
    floor: "Ground Floor",
    description: "Registrar office.",
    coords: off(5, 8),
    parentSlug: "admin-block",
  },
  {
    name: "Account Office",
    slug: "account-office",
    category: "office",
    building: "Admin Block",
    floor: "Ground Floor",
    description: "Accounts and fee office.",
    coords: off(8, -8),
    parentSlug: "admin-block",
  },
  {
    name: "Examination Hall",
    slug: "examination-hall",
    category: "hall",
    description: "Main examination hall.",
    coords: off(70, 40),
  },
  {
    name: "Seminar Hall",
    slug: "seminar-hall",
    category: "hall",
    description: "Seminar hall for talks and events.",
    coords: off(90, -30),
  },
  {
    name: "Seminar Hall 2",
    slug: "seminar-hall-2",
    category: "hall",
    description: "Second seminar hall.",
    coords: off(100, -10),
  },
  {
    name: "Central Library",
    slug: "central-library",
    category: "library",
    description: "Central library of the college.",
    coords: off(40, 90),
  },
  {
    name: "Main Canteen",
    slug: "main-canteen",
    category: "canteen",
    description: "Main canteen and food court.",
    coords: off(-30, 110),
  },
  {
    name: "Incubation Center",
    slug: "incubation-center",
    category: "other",
    description: "Startup incubation center.",
    coords: off(120, 70),
  },
  {
    name: "Academic Block",
    slug: "academic-block",
    category: "other",
    building: "Academic Block",
    description:
      "Classroom building. NOTE: move this pin to the real building that has rooms 335 to 340.",
    coords: off(40, -60),
  },
  {
    name: "HOD Office",
    slug: "hod-office",
    category: "office",
    description: "Head of Department office.",
    coords: off(60, -90),
  },
  {
    name: "Deputy HOD Office",
    slug: "deputy-hod-office",
    category: "office",
    description: "Deputy Head of Department office.",
    coords: off(64, -84),
  },
  {
    name: "Boys Hostel",
    slug: "boys-hostel",
    category: "hostel",
    description: "Boys hostel.",
    coords: off(-80, -150),
  },
  {
    name: "Playground",
    slug: "playground",
    category: "ground",
    description: "Sports ground and playground.",
    coords: off(-120, -60),
  },
  ...rooms,
];
