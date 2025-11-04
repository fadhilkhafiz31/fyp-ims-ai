import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, pw);
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }
      navigate("/dashboard");
    } catch (e) {
      setErr(e.code || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#2E6A4E] relative overflow-hidden">
      {/* Geometric Pattern Background */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(30deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 37px),
            repeating-linear-gradient(120deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 37px),
            repeating-linear-gradient(60deg, transparent, transparent 60px, rgba(255,255,255,0.08) 60px, rgba(255,255,255,0.08) 62px)
          `,
          backgroundSize: '120px 120px'
        }}
      ></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29l1.93-1.93C4.75 13.85 4.5 13 4.5 12c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5c0 .73-.13 1.43-.37 2.08l1.57 1.57C21.27 15.62 21.5 13.87 21.5 12c0-5.24-4.26-9.5-9.5-9.5z" fill="currentColor" opacity="0.7"/>
            <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
            <path d="M12 13.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="currentColor" opacity="0.7"/>
            <path d="M7 15l2-2M15 15l-2-2M12 11v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-white text-xl font-semibold">
            SmartStock<span className="font-bold text-lg">AI</span>
          </span>
        </div>
        <nav className="flex items-center gap-8">
          <Link to="/" className="text-white uppercase text-sm font-medium hover:opacity-80">HOME</Link>
          <Link to="/about" className="text-white uppercase text-sm font-medium hover:opacity-80">ABOUT US</Link>
          <Link to="/contact" className="text-white uppercase text-sm font-medium hover:opacity-80">CONTACT</Link>
          <Link to="/login" className="bg-white text-black uppercase text-sm font-medium px-4 py-2 rounded hover:opacity-90">LOG IN</Link>
        </nav>
      </header>

      {/* Login Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
          {/* 99 SPEEDMART Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/99speedmart logo.png" 
              alt="99 Speedmart Logo" 
              className="max-w-80 h-auto"
            />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-black mb-8 text-center">Log in</h1>

          {/* Error Message */}
          {err && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {err}
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="currentColor"/>
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                  ) : (
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between mb-6 gap-8">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Remember Me</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-gray-700 hover:underline whitespace-nowrap">
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>

          {/* Sign up Link */}
          <p className="text-center text-sm text-gray-700">
            or <Link to="/register" className="text-gray-900 hover:underline font-medium">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
