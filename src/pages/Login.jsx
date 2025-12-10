import { useState, useRef, useEffect } from "react";
import * as motion from "motion/react-client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { login, loginAsGuest } from "../lib/firebase";

import MotionWrapper from "../components/MotionWrapper";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Particle animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setSize();

    let ps = [];
    let raf = 0;

    const make = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      ps = [];
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      for (let i = 0; i < count; i++) ps.push(make());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

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

  async function handleGuestLogin() {
    setErr("");
    setLoading(true);
    try {
      await loginAsGuest();
      navigate("/dashboard-customer-guest");
    } catch (e) {
      // Provide user-friendly error messages
      if (e.code === "auth/admin-restricted-operation") {
        setErr("Anonymous authentication is not enabled. Please enable it in Firebase Console under Authentication → Sign-in method → Anonymous.");
      } else if (e.code === "auth/operation-not-allowed") {
        setErr("Anonymous authentication is disabled. Please enable it in Firebase Console.");
      } else {
        setErr(e.message || e.code || "Failed to sign in as guest. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotionWrapper className="min-h-screen bg-[#0F5132] relative overflow-hidden">
      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:rgba(255,255,255,0.1);will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.24),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.12s}
        .hline:nth-child(2)::after{animation-delay:.22s}
        .hline:nth-child(3)::after{animation-delay:.32s}
        .vline:nth-child(4)::after{animation-delay:.42s}
        .vline:nth-child(5)::after{animation-delay:.54s}
        .vline:nth-child(6)::after{animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        @keyframes shimmer{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}
        .nav-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(30, 30, 30, 0.3);
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .nav-button:hover {
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(40, 40, 40, 1);
          transform: translateY(-1px);
        }
        .nav-button:active {
          transform: translateY(0);
        }
        .nav-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          flex-shrink: 0;
        }
        .nav-link {
          position: relative;
          z-index: 1;
          font-size: 0.875rem;
          letter-spacing: 0.025em;
          color: white;
          font-weight: 500;
        }
      `}</style>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Animated accent lines */}
      <div className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-50 mix-blend-screen pointer-events-none"
      />

      {/* Header - Static, no motion */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img
            src="/Smart Stock AI (1).png"
            alt="SmartStock AI Logo"
            className="h-12 w-auto"
          />
        </div>
        <nav className="flex items-center gap-4">
          <motion.div
            className="nav-button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="nav-dot"></div>
            <Link to="/about" className="nav-link">
              ABOUT US
            </Link>
          </motion.div>
          <motion.div
            className="nav-button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="nav-dot"></div>
            <Link to="/contact" className="nav-link">
              CONTACT
            </Link>
          </motion.div>
        </nav>
      </header>

      {/* Login Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <motion.form
          key={location.pathname}
          onSubmit={onSubmit}
          className="w-full max-w-md !bg-white rounded-lg shadow-2xl p-8"
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.95 }}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {/* 99 SPEEDMART Logo */}
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <img
              src="/99speedmart logo.png"
              alt="99 Speedmart Logo"
              className="max-w-80 h-auto"
            />
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-3xl font-bold !text-black mb-8 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            Log in
          </motion.h1>

          {/* Error Message */}
          {err && (
            <motion.div
              className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-4"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {err}
            </motion.div>
          )}

          {/* Email Input */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-3 !bg-gray-100 !border-gray-300 !text-gray-900 border rounded-lg focus:outline-none focus:!border-gray-400"
                required
              />
            </div>
          </motion.div>

          {/* Password Input */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="currentColor" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 !bg-gray-100 !border-gray-300 !text-gray-900 border rounded-lg focus:outline-none focus:!border-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor" />
                  ) : (
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor" />
                  )}
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Remember Me and Forgot Password */}
          <motion.div
            className="flex items-center justify-between mb-6 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <span className="text-sm !text-gray-700">Remember Me</span>
            </label>
            <Link to="/forgot-password" className="text-sm !text-gray-700 hover:underline whitespace-nowrap">
              Forgot Password?
            </Link>
          </motion.div>

          {/* Login Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Signing in..." : "Log in"}
          </motion.button>

          {/* Guest Button */}
          <motion.button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-[#0F5132] text-white font-semibold py-3 rounded-lg hover:bg-[#235a43] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Loading..." : "Continue as Guest"}
          </motion.button>

          {/* Sign up Link */}
          <motion.p
            className="text-center text-sm !text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            or <Link to="/register" className="!text-gray-900 hover:underline font-medium">Sign up</Link>
          </motion.p>
        </motion.form>
      </div>
    </MotionWrapper>
  );
}
