import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Standardized name

  useEffect(() => {
    // This is the "Anti-Gravity" listener
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log("[AuthContext] onAuthStateChanged fired, user:", u ? u.uid : "null");
      setUser(u);
      if (u) {
        // Fetch profile data immediately to ensure RoleGuards work
        const snap = await getDoc(doc(db, "users", u.uid));
        const profileData = snap.exists() ? snap.data() : null;
        console.log("[AuthContext] Profile fetched:", profileData);
        setProfile(profileData);
      } else {
        console.log("[AuthContext] No user, setting profile to null");
        setProfile(null);
      }
      // Only set loading to false AFTER user and profile are confirmed
      console.log("[AuthContext] Setting loading to false");
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { user, profile, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Anti-Gravity Gate: We do NOT render any routes (children) 
        until loading is false. This blocks access to /inventory 
        and /transactions during the initial check.
      */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
