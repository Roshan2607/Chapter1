"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { logout as apiLogout } from "../lib/api";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("chapter1_user");
    const savedToken = localStorage.getItem("chapter1_token");
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("chapter1_user");
        localStorage.removeItem("chapter1_token");
      }
    } else {
      localStorage.removeItem("chapter1_user");
      localStorage.removeItem("chapter1_token");
    }
  }, []);

  const login = (user: User, token: string) => {
    setUser(user);
    localStorage.setItem("chapter1_user", JSON.stringify(user));
    localStorage.setItem("chapter1_token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("chapter1_user");
    localStorage.removeItem("chapter1_token");
    apiLogout(); // Call backend to invalidate token
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
