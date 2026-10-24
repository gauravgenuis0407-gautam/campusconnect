import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [role, setRole] = useState("student"); // student | parent (used when creating an account)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (mode === "signup" && name.trim().length < 2) return setError("Please enter your name.");
    if (!email.trim() || !password) return setError("Email and password are required.");
    if (mode === "signup" && password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await signup({ name: name.trim(), email: email.trim(), password, role });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-white">
      {/* blue side */}
      <div className="md:w-1/2 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white p-8 md:p-14 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-xl flex items-center justify-center">📍</div>
          <div className="text-2xl font-bold">
            Campus<span className="text-blue-200">Connect</span>
          </div>
        </div>
        <div className="my-10 md:my-0">
          <div className="inline-flex items-center gap-2 text-xs tracking-widest font-semibold text-blue-100">
            <span className="w-2 h-2 rounded-full bg-green-400" /> GNIOT CAMPUS GUIDE
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-3">
            Your campus.
            <br />
            <span className="text-blue-200">One connection.</span>
          </h1>
          <p className="mt-4 text-blue-50 max-w-md">
            Find any office, hall, room or facility on campus and walk there with live directions.
          </p>
        </div>
        <div className="hidden md:block text-xs tracking-widest text-blue-100">GREATER NOIDA · UTTAR PRADESH</div>
      </div>

      {/* form side */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-14">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="text-[11px] tracking-widest font-semibold text-slate-500">WELCOME TO CAMPUS CONNECT</div>
          <h2 className="text-3xl font-extrabold mt-1">{mode === "login" ? "Good to see you." : "Create your account"}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {mode === "login" ? "Sign in to explore your campus." : "Sign up once, then use the campus map anywhere."}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {[
              ["student", "🎓 Student"],
              ["parent", "👪 Parent"],
            ].map(([k, label]) => (
              <button
                type="button"
                key={k}
                onClick={() => setRole(k)}
                className={`py-2.5 rounded-xl border text-sm font-semibold ${
                  role === k ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "login" && (
            <p className="text-[11px] text-slate-400 mt-1">Your role is saved with your account.</p>
          )}

          {mode === "signup" && (
            <>
              <label className="block text-sm font-semibold mt-4">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none focus:border-brand-500"
              />
            </>
          )}

          <label className="block text-sm font-semibold mt-4">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none focus:border-brand-500"
          />

          <label className="block text-sm font-semibold mt-4">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none focus:border-brand-500"
          />

          {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <button
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3.5"
          >
            {busy ? "Please wait…" : mode === "login" ? `Sign in →` : "Create account →"}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            {mode === "login" ? "New to Campus Connect?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="text-brand-600 font-bold"
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
          <p className="text-center text-[11px] text-slate-400 mt-5">Passwords are securely hashed by the server. · Campus Connect Mini Project</p>
        </form>
      </div>
    </div>
  );
}
