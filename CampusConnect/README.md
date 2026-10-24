# CampusConnect: Campus Location Navigation

Mini project, GNIOT (Group 6). Guide: Dr. Ashwini Kumar Verma.
Team: Gaurav (leader), Gopal Kumar (frontend), Durgesh Chaudhary (backend), Jayprakash Gupta (database).

A Google Maps style app for **campus places only** (library, canteen, offices, halls, rooms, parking, metro station, playground).
Login first, then search a place, see it on the map, and walk there with live directions, voice hints and notifications.

| Part | Technology |
|---|---|
| Frontend | React + Tailwind CSS + Leaflet (OpenStreetMap), installable as a phone app (PWA) |
| Backend | Node.js + Express, JWT login |
| Database | MongoDB (Mongoose), GeoJSON points with a 2dsphere index |
| Walking route | OpenStreetMap foot routing service (free, no key) |

```
CampusConnect App  ->  Backend API (Node + Express)  ->  MongoDB (places, users)  ->  Location result (name, floor, route, pin on map)
```

## What the app does

1. Sign up / login (Student or Parent). One email, one account. Password is hashed (bcrypt). Session is a JWT.
2. Home: search and category filters (Library, Canteen, Offices, Halls, Rooms, Parking, Metro, Ground). "Show nearest first" uses GPS. List view and Map view.
3. Place page: details, mini map, QR code, "Start navigation", "I am here".
4. Navigation (like Google Maps): blue dot, route line, next turn card with distance, remaining distance and time, voice hints, vibration, phone notifications ("In 50 metres, turn left", "You have reached ..."), automatic re-routing when you leave the route, screen kept awake.
5. QR codes: every place has a QR. Scan it to open the place. "I am here" uses a scanned place as the starting point (useful inside buildings where GPS is weak).
6. Admin screen: add / edit / delete places, set the exact location with "Use my GPS here" or by tapping the map, mark it verified, download a QR, print all QR codes.

## Folder structure

```
backend/    Express API, MongoDB models, seed script
frontend/   React app (Vite + Tailwind)
```

---

## 1. Setup (on your laptop)

You need **Node.js 18 or newer** and a **MongoDB** (either one):

* MongoDB Atlas free cluster (recommended, easy for phone / APK): create a cluster, create a database user, allow your IP (or 0.0.0.0/0 while testing), copy the connection string.
* Or MongoDB Community Server installed locally: `mongodb://127.0.0.1:27017/campusconnect`

### Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Open `.env` and set:

* `MONGO_URI` (your Atlas string or the local one)
* `JWT_SECRET` (any long random text)
* `ADMIN_EMAIL` (**your own email**. When you sign up in the app with this email you become admin)

Then:

```bash
npm test          # checks the helper code (no database needed)
npm run seed      # adds the starting campus places
npm run dev       # API starts on http://localhost:5000
```

Check `http://localhost:5000/api/health`. It should show `"db":"connected"`.

### Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm test          # checks the navigation logic
npm run dev       # app opens on http://localhost:5173
```

Sign up with your `ADMIN_EMAIL`. You will see an **Admin** tab at the bottom.

---

## 2. Testing on a mobile phone (important)

Phones allow GPS, camera (QR scan) and notifications **only on https** (or localhost). So `http://192.168.x.x:5173` will open the app but GPS will NOT work. Use one of these:

**Option A: quick test with a tunnel (easiest)**
Keep backend and frontend running, then in a third terminal:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

(or `ngrok http 5173`). It prints an `https://....` address. Open it on your phone. One tunnel is enough because the frontend forwards `/api` calls to the backend by itself.

**Option B: host it (needed for final use and for printed QR codes)**

* Database: MongoDB Atlas
* Backend: Render / Railway (set the same variables as `.env`; set `CORS_ORIGIN` to your frontend address)
* Frontend: Netlify / Vercel. Before building, create `frontend/.env` with `VITE_API_URL=https://your-backend-address/api`, then `npm run build` and upload the `dist` folder.

After hosting, open the app in Chrome on Android and choose **Add to Home screen / Install app**. It then works like a normal app.

---

## 3. Setting the real locations (you do this on campus)

All seeded locations are **approximate** (grey pins, "approx." tag). To fix them:

1. Login as admin on your phone (https address, see section 2).
2. Admin tab -> choose a place -> go outside the building or stand at its entrance -> **Use my GPS here**. Wait until accuracy shows about 15 m or better, press it again if needed.
3. Press **Save**. The place becomes **verified** (green).
4. Do this for every place. The Admin home shows progress ("x of y verified").
5. Rooms 335 to 340: first set the real building in "Academic Block" (move that pin), and write the right building / floor in each room. If the rooms are in a building that already exists in the list, change "Inside which place" to that building's slug.
6. When done: Admin -> **Print all QR** and stick the QR codes at the places. **Print only after the app has its final https address**, because the QR contains that address.

Tips: GPS inside concrete buildings is weak. Take the location at the entrance or door. For rooms inside a building, the QR + "I am here" feature gives the starting point.

## 4. Places already in the database

Central Library, Main Canteen, Register Office, Account Office, Examination Hall, Incubation Center, Admin Block, Boys Hostel, HOD Office, Deputy HOD Office, Rooms 335 to 340, Parking, Knowledge Park Metro Station, Playground, Seminar Hall, Seminar Hall 2, Main Gate, Academic Block.

Add or rename anything from the Admin screen. To re-create the list from scratch: `npm run seed -- --reset` (this deletes all places).

## 5. API summary

| Method | URL | Who | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | public | create account (name, email, password, role student/parent) |
| POST | /api/auth/login | public | login, returns JWT |
| GET | /api/auth/me | user | current user |
| GET | /api/places?q=&category= | user | search / list places |
| GET | /api/places/nearby?lat=&lng=&max= | user | places near a point |
| GET | /api/places/slug/:slug | user | one place (used by QR) |
| POST / PUT / DELETE | /api/places(/:id) | admin | add / edit / delete |
| GET | /api/route?fromLat=&fromLng=&toLat=&toLng= | user | walking route with steps |

Place document: `name, slug, category, building, floor, roomNo, description, location {type:"Point", coordinates:[lng,lat]}, verified, parentSlug`.
User document: `name, email, passwordHash, role (student/parent/admin)`.

## 6. Making an APK (optional)

Easiest: host the app on https and use **Install app** in Chrome (it is a PWA).
If a real `.apk` file is needed, wrap the built web app with Capacitor (needs Android Studio):

```bash
cd frontend
# VITE_API_URL must point to the hosted backend (the APK cannot use localhost)
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init CampusConnect com.gniot.campusconnect --web-dir=dist
npx cap add android
npx cap sync
npx cap open android      # build the APK from Android Studio
```

In `android/app/src/main/AndroidManifest.xml` make sure these lines exist: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`. Set `CORS_ORIGIN=*` on the backend for the APK.

## 7. Known limits (please read)

* The route and hints come from the free OpenStreetMap walking service. It only knows paths that exist in OpenStreetMap. If a campus footpath is missing there, the route may go along roads or show a straight line (the app tells you when it is a straight line). You can improve the map by adding the campus paths on openstreetmap.org.
* Notifications and voice work while the app is open or in the background on Android with notifications allowed. Browsers (and phones) may pause GPS when the screen is locked, so keep the screen on while walking. The app asks the phone to keep the screen awake.
* Indoor navigation (floor by floor) is not possible with GPS. Rooms are shown with building, floor and room number, and the QR + "I am here" gives the start point.
* iPhone Safari has limited notification support for web apps.

## 8. Quick test checklist

1. `npm test` in backend and in frontend: both print "passed".
2. Sign up, log out, log in again, a wrong password shows an error.
3. Search "335": Room 335 appears. Filter "Parking": only parking.
4. Open a place -> Start navigation -> allow location -> route line and distance appear -> Start walking.
5. Walk (or use the browser dev tools -> Sensors -> Location) and check the hints, notification and "You have reached ..." message.
6. Walk away from the route: "Re-routing" appears.
7. Admin: change a place location, Save, then open it from Home and see the pin move.
8. Print QR codes, scan one with the Scan tab.
