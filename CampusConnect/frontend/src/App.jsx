import { useAuth } from "./lib/auth.jsx";
import { useRoute } from "./lib/router.js";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import PlaceDetail from "./pages/PlaceDetail.jsx";
import Navigate from "./pages/Navigate.jsx";
import Scan from "./pages/Scan.jsx";
import Admin from "./pages/Admin.jsx";
import QrSheet from "./pages/QrSheet.jsx";

export default function App() {
  const { user, loading } = useAuth();
  const route = useRoute();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-700 text-white">
        <div className="text-center">
          <div className="text-5xl mb-3">📍</div>
          <div className="font-semibold">CampusConnect</div>
          <div className="text-sm opacity-80 mt-1">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const [first, second] = route.parts;

  if (first === "place" && second) return <PlaceDetail slug={second} />;
  if (first === "nav" && second) return <Navigate slug={second} />;
  if (first === "scan") return <Scan />;
  if (first === "admin" && second === "qr") return user.role === "admin" ? <QrSheet /> : <Home />;
  if (first === "admin") return user.role === "admin" ? <Admin /> : <Home />;
  return <Home />;
}
