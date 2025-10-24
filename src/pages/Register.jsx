import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
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
      setErr(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 border p-6 rounded-xl">
        <h1 className="text-2xl font-bold">Create account</h1>
        <input className="border p-2 w-full" placeholder="Full name" onChange={e=>setName(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Email" onChange={e=>setEmail(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Password" type="password" onChange={e=>setPass(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="bg-black text-white px-4 py-2 w-full rounded-lg">Register</button>
        <p className="text-sm">Have an account? <Link className="text-blue-600" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
