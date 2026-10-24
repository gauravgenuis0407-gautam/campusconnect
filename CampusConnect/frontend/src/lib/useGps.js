import { useCallback, useEffect, useRef, useState } from "react";

// Live GPS. start() asks the browser for location and keeps updating.
// pos = { lat, lng, accuracy, time }
export function useGps() {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const watchId = useRef(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    setActive(false);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError("This device does not support GPS location.");
      return;
    }
    if (watchId.current !== null) return;
    setError("");
    setActive(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setError("");
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          time: p.timestamp,
        });
      },
      (e) => {
        if (e.code === 1) {
          setError("Location permission is blocked. Allow location for this site and try again.");
          stop();
        } else if (e.code === 2) {
          setError("Location is not available right now. Move to an open area.");
        } else {
          setError("Getting your location is taking long. Please wait or go outside.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { pos, error, active, start, stop };
}

// One quick location read (used in the admin screen)
export function getPositionOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS not supported on this device."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? "Location permission is blocked." : "Could not get location.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}
