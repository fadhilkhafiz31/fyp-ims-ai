// src/hooks/useRole.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) { setRole(null); setReady(true); return; }
    
    // Check if user is anonymous (guest)
    if (user.isAnonymous) {
      setRole("guest");
      setReady(true);
      return;
    }
    
    // For authenticated users, check Firestore for role
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setRole(snap.exists() ? snap.data().role ?? null : null);
      setReady(true);
    }, () => { setRole(null); setReady(true); });
    return () => unsub();
  }, [user]);

  return { role, ready };
}
