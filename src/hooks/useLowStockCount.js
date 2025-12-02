// src/hooks/useLowStockCount.js
import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

const LOW_STOCK_THRESHOLD = 5;

/**
 * Hook to get the low stock count
 * 
 * @param {string|null} storeId - Optional store ID to filter by. If provided, counts only items for that store.
 *                                 If null/undefined, counts all items across all stores (global count).
 * 
 * An item is considered low stock when: qty <= LOW_STOCK_THRESHOLD (5)
 * This matches the logic used in StockNotification page and other pages
 */
export function useLowStockCount(storeId = null) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseRef = collection(db, "inventory");
    
    // If storeId is provided, filter by that store
    // Otherwise, load all inventory for global count
    const inventoryRef = storeId 
      ? query(baseRef, where("storeId", "==", storeId))
      : baseRef;
    
    const unsubscribe = onSnapshot(
      inventoryRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInventory(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading inventory for low stock count:", error);
        setInventory([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [storeId]); // Re-run when storeId changes

  const lowStockCount = useMemo(
    () => {
      // Match the logic used in StockNotification page: qty <= LOW_STOCK_THRESHOLD (5)
      // This ensures consistency with what users see on the Stock Notification page
      return inventory.filter((item) => {
        const qty = Number(item.qty ?? 0);
        return qty <= LOW_STOCK_THRESHOLD;
      }).length;
    },
    [inventory]
  );

  return { globalLowStockCount: lowStockCount, loading };
}

