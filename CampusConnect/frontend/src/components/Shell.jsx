import { useAuth } from "../lib/auth.jsx";
import { go, useRoute } from "../lib/router.js";

// Page frame with a top bar and bottom menu (used by every page except live navigation)
export default function Shell({ title, back, children, right }) {
  const { user, logout } = useAuth();
  const { path } = useRoute();

  const tabs = [
    { label: "Home", icon: "🏠", to: "/", active: path === "/" },
    { label: "Scan QR", icon: "📷", to: "/scan", active: path.startsWith("/scan") },
  ];
  if (user && user.role === "admin") tabs.push({ label: "Admin", icon: "🛠️", to: "/admin", active: path.startsWith("/admin") });

  return (
    <div className="min-h-full flex flex-col">
      <header className="no-print safe-top bg-gradient-to-r from-brand-700 to-brand-500 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {back ? (
            <button onClick={back} className="text-2xl leading-none px-1" aria-label="Back">
              ←
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center text-lg">📍</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{title || "CampusConnect"}</div>
            {!back && <div className="text-[11px] opacity-80 -mt-0.5">GNIOT Campus Guide</div>}
          </div>
          {right}
          <button
            onClick={logout}
            className="text-xs bg-white/15 hover:bg-white/25 rounded-lg px-2.5 py-1.5"
            title={user ? user.email : ""}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 pb-28">{children}</main>

      <nav className="no-print fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 safe-bottom">
        <div className="max-w-3xl mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.to}
              onClick={() => go(t.to)}
              className={`flex-1 py-2.5 text-xs flex flex-col items-center gap-0.5 ${
                t.active ? "text-brand-600 font-bold" : "text-slate-500"
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
