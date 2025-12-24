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
    // Extract unique stores from inventory collection instead of relying on separate storeId collection
    const unsub = onSnapshot(
      collection(db, "inventory"),
      (snap) => {
        console.log("StoreContext: Loading stores from inventory collection...");
        console.log(`StoreContext: Found ${snap.docs.length} inventory items`);
        
        // Extract unique stores from inventory items
        const storeMap = new Map();
        
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const storeId = data.storeId;
          const storeName = data.storeName;
          
          if (storeId && !storeMap.has(storeId)) {
            storeMap.set(storeId, {
              id: storeId,
              name: storeName || storeId,
            });
          }
        });
        
        const list = Array.from(storeMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        console.log(`StoreContext: Extracted ${list.length} unique stores:`, list);
        
        setStores(list);
        setLoadingStores(false);

        // Auto-select store: check localStorage first, then use first store
        const saved = localStorage.getItem("selectedStore");
        const chosen = list.find((s) => s.id === saved) || list[0] || null;
        if (chosen) {
          setStoreId(chosen.id);
          setStoreName(chosen.name);
          console.log(`StoreContext: Selected store: ${chosen.name} (${chosen.id})`);
        } else {
          setStoreId(null);
          setStoreName("");
          console.log("StoreContext: No stores available to select");
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

