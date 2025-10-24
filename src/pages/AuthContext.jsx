import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// create a new context
const AuthContext = createContext(null);

// custom hook so other files can use it easily
export function useAuth() {
  return useContext(AuthContext);
}

// provider component that wraps your whole app (set in main.jsx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // e.g. {role, displayName}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // listen for auth state changes (login/logout)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // fetch matching Firestore doc: /users/{uid}
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    // cleanup listener
    return unsubscribe;
  }, []);

  const value = { user, profile, loading };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
