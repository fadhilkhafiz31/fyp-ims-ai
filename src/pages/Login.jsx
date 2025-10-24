import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/firebase"; // or ../lib/authService

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, pw);
      navigate("/dashboard");
    } catch (e) {
      alert(e.code || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-3">
      <h1 className="text-2xl font-bold mb-2">Login</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border px-3 py-2 rounded w-72"
        required
      />
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Password"
        className="border px-3 py-2 rounded w-72"
        required
      />
      <button disabled={loading} className="bg-black text-white px-4 py-2 rounded">
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
