import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  // when the page opens, check if the saved token is still good
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => setToken(""))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("cc-logout", logout);
    return () => window.removeEventListener("cc-logout", logout);
  }, [logout]);

  const login = async (email, password) => {
    const d = await api.login({ email, password });
    setToken(d.token);
    setUser(d.user);
  };

  const signup = async (form) => {
    const d = await api.signup(form);
    setToken(d.token);
    setUser(d.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
