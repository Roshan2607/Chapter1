"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";
import { login as apiLogin, register as apiRegister, requestOtp } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    
    if (isRegister && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (!otpSent) {
          await requestOtp(email, name, password);
          setOtpSent(true);
          setLoading(false);
          return;
        } else {
          if (!otpCode.trim()) {
            setError("Please enter the verification code.");
            setLoading(false);
            return;
          }
          const res = await apiRegister(email, name, password, otpCode);
          login(res.user, res.token);
          router.push("/subjects");
        }
      } else {
        const res = await apiLogin(email, password);
        login(res.user, res.token);
        router.push("/subjects");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg bg-dots flex flex-col items-center justify-center p-6 font-sans">
      {/* Logo Container */}
      <div className="flex items-center gap-4 mb-8 cursor-pointer" onClick={() => router.push("/")}>
        <img src="/logo.png" alt="Chapter1 Logo" className="h-16 w-auto" />
        <span className="font-heading font-black text-3xl uppercase tracking-tighter">
          Chapter1
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md border-4 border-black bg-white shadow-neo-lg p-8 relative">
        {/* Halftone / Grid Pattern Accent */}
        <div className="absolute inset-0 bg-halftone opacity-[0.03] pointer-events-none" />
        
        <h2 className="font-heading font-black text-3xl uppercase tracking-tight mb-6 text-black border-b-4 border-black pb-3">
          {isRegister ? (otpSent ? "Verify Email" : "Create Account") : "Welcome Back"}
        </h2>

        {error && (
          <div className="border-4 border-black bg-neo-accent text-white p-3 mb-6 font-black text-xs uppercase tracking-wide shadow-neo-sm">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {!otpSent ? (
            <>
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-black/55 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={loading}
                    className="neo-input px-4 py-3 text-sm focus:bg-white"
                    style={{ border: "4px solid #000", fontWeight: 700 }}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-black/55 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="neo-input px-4 py-3 text-sm focus:bg-white"
                  style={{ border: "4px solid #000", fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-black/55 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="neo-input px-4 py-3 text-sm focus:bg-white"
                  style={{ border: "4px solid #000", fontWeight: 700 }}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-black/55 mb-2">
                6-Digit Verification Code
              </label>
              <p className="text-xs text-black/60 mb-3">
                We sent a code to <span className="font-bold">{email}</span>. Please enter it below.
              </p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                disabled={loading}
                className="neo-input px-4 py-3 text-sm focus:bg-white tracking-[0.5em] font-mono text-center text-xl"
                style={{ border: "4px solid #000", fontWeight: 700 }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn w-full bg-neo-accent text-white shadow-neo py-4 text-base font-black uppercase tracking-wider"
          >
            {loading ? "Processing..." : isRegister ? (otpSent ? "Verify & Register →" : "Send Verification Code") : "Log In →"}
          </button>
        </form>

        {/* Toggle link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setError("");
              setIsRegister(!isRegister);
              setOtpSent(false);
            }}
            className="text-xs font-black uppercase tracking-wider text-black/45 hover:text-neo-accent underline transition-colors"
          >
            {isRegister ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
