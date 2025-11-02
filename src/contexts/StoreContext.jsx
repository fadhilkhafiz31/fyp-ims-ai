import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const StoreContext = createContext();

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return context;
};

export function StoreProvider({ children }) {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "storeId"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().storeName || d.id,
        }));
        setStores(list);
        setLoadingStores(false);

        // Auto-select store: check localStorage first, then use first store
        const saved = localStorage.getItem("selectedStore");
        const chosen = list.find((s) => s.id === saved) || list[0] || null;
        if (chosen) {
          setStoreId(chosen.id);
          setStoreName(chosen.name);
        } else {
          setStoreId(null);
          setStoreName("");
        }
      },
      (err) => {
        console.error("StoreContext: onSnapshot error:", err);
        setLoadingStores(false);
      }
    );
    return () => unsub();
  }, []);

  const setStore = (id) => {
    const s = stores.find((x) => x.id === id);
    if (s) {
      setStoreId(s.id);
      setStoreName(s.name);
      localStorage.setItem("selectedStore", s.id);
    } else {
      setStoreId(null);
      setStoreName("");
      localStorage.removeItem("selectedStore");
    }
  };

  return (
    <StoreContext.Provider value={{ stores, storeId, storeName, setStore, loadingStores }}>
      {children}
    </StoreContext.Provider>
  );
}

