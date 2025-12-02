import { useState } from "react";
import * as motion from "motion/react-client";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useNavigate, useLocation } from "react-router-dom";

import MotionWrapper from "../components/MotionWrapper";

export default function Register() {
  const nav = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasAlphabet && hasNumber;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    // Validate password match
    if (pass !== confirmPass) {
      setErr("Passwords do not match. Please try again.");
      setLoading(false);
      return;
    }

    // Validate password format
    if (!validatePassword(pass)) {
      setErr("Password must contain at least one alphabet (letter) and one number.");
      setLoading(false);
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: name });
      // optional: create a user profile document
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        role: "admin",               // you can change later
        createdAt: serverTimestamp()
      });
      nav("/dashboard");
    } catch (e) {
      setErr(e.message || e.code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionWrapper className="min-h-screen bg-[#2E6A4E] relative overflow-hidden">
      {/* Diagonal Stripes Background Pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.05) 20px,
            rgba(255, 255, 255, 0.05) 22px
          )`,
          backgroundSize: '28.28px 28.28px'
        }}
      ></div>

      {/* Header - Static, no motion */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img
            src="/Smart Stock AI (1).png"
            alt="SmartStock AI Logo"
            className="h-12 w-auto"
          />
        </div>
        <nav className="flex items-center gap-8">
          <Link to="/about" className="text-white uppercase text-sm font-medium hover:opacity-80">ABOUT US</Link>
          <Link to="/contact" className="text-white uppercase text-sm font-medium hover:opacity-80">CONTACT</Link>
          <Link to="/register" className="bg-white text-black uppercase text-sm font-medium px-4 py-2 rounded hover:opacity-90">SIGN UP</Link>
        </nav>
      </header>

      {/* Register Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <motion.form
          key={location.pathname}
          onSubmit={submit}
          className="w-full max-w-md !bg-white rounded-lg shadow-2xl p-8"
          initial={{ opacity: 0, x: -100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
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
            Create account
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

          {/* Name Input */}
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
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full pl-10 pr-4 py-3 !bg-gray-100 !border-gray-300 !text-gray-900 border rounded-lg focus:outline-none focus:!border-gray-400"
                required
              />
            </div>
          </motion.div>

          {/* Email Input */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
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
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <motion.p
              className="text-xs text-gray-500 mb-1 ml-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              Password must contain at least one letter and one number
            </motion.p>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="currentColor" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
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

          {/* Confirm Password Input */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="currentColor" />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm Password"
                className="w-full pl-10 pr-10 py-3 !bg-gray-100 !border-gray-300 !text-gray-900 border rounded-lg focus:outline-none focus:!border-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {showConfirmPassword ? (
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor" />
                  ) : (
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor" />
                  )}
                </svg>
              </button>
            </div>
            {confirmPass && pass !== confirmPass && (
              <motion.p
                className="text-xs text-red-500 mt-1 ml-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                Passwords do not match
              </motion.p>
            )}
            {confirmPass && pass === confirmPass && confirmPass.length > 0 && (
              <motion.p
                className="text-xs text-green-500 mt-1 ml-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                Passwords match
              </motion.p>
            )}
          </motion.div>

          {/* Register Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Creating account..." : "Register"}
          </motion.button>

          {/* Login Link */}
          <motion.p
            className="text-center text-sm !text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            Have an account? <Link to="/login" className="!text-gray-900 hover:underline font-medium">Login</Link>
          </motion.p>
        </motion.form>
      </div>
    </MotionWrapper>
  );
}
