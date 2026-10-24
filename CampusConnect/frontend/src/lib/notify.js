// Notifications, voice and vibration for navigation.
// Every function is safe: if the phone/browser does not support it, nothing breaks.

export function notificationSupport() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function askNotificationPermission() {
  if (!notificationSupport()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// System notification (works on Android through the service worker)
export async function showNotification(title, body, tag = "campusconnect") {
  try {
    if (!notificationSupport() || Notification.permission !== "granted") return;
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        renotify: true,
      });
    } else {
      new Notification(title, { body, tag });
    }
  } catch {
    /* ignore */
  }
}

let voiceOn = true;
export function setVoice(on) {
  voiceOn = !!on;
  if (!on && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function speak(text) {
  try {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern = [200, 100, 200]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

// Keeps the screen on while navigating (phones stop GPS updates when the screen sleeps)
let wakeLock = null;
export async function keepScreenOn() {
  try {
    if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    /* ignore */
  }
}
export async function releaseScreen() {
  try {
    if (wakeLock) await wakeLock.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}
