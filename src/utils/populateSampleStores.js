// Utility to populate sample store data if needed
// This can be run once to create sample stores in the inventory collection

import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

// Sample store data
const sampleStores = [
  {
    storeId: "store-001",
    storeName: "99 SPEEDMART Kuala Lumpur",
  },
  {
    storeId: "store-002", 
    storeName: "99 SPEEDMART Petaling Jaya",
  },
  {
    storeId: "store-003",
    storeName: "99 SPEEDMART Shah Alam",
  },
];

// Sample inventory items to populate stores
const sampleInventoryItems = [
  {
    name: "Coca Cola 330ml",
    sku: "CC-330",
    category: "Beverages",
    price: 2.50,
    qty: 50,
    reorderPoint: 10,
    storeId: "store-001",
    storeName: "99 SPEEDMART Kuala Lumpur",
  },
  {
    name: "Coca Cola 330ml", 
    sku: "CC-330",
    category: "Beverages",
    price: 2.50,
    qty: 30,
    reorderPoint: 10,
    storeId: "store-002",
    storeName: "99 SPEEDMART Petaling Jaya",
  },
  {
    name: "Maggi Instant Noodles",
    sku: "MG-001",
    category: "Food",
    price: 1.20,
    qty: 100,
    reorderPoint: 20,
    storeId: "store-001", 
    storeName: "99 SPEEDMART Kuala Lumpur",
  },
  {
    name: "Maggi Instant Noodles",
    sku: "MG-001", 
    category: "Food",
    price: 1.20,
    qty: 75,
    reorderPoint: 20,
    storeId: "store-003",
    storeName: "99 SPEEDMART Shah Alam",
  },
];

/**
 * Populate sample inventory items with store data
 * This will create the stores automatically when StoreContext reads from inventory
 */
export async function populateSampleInventory() {
  try {
    console.log("Adding sample inventory items...");
    
    for (const item of sampleInventoryItems) {
      await addDoc(collection(db, "inventory"), item);
      console.log(`Added: ${item.name} at ${item.storeName}`);
    }
    
    console.log("Sample inventory populated successfully!");
    return { success: true, message: "Sample inventory added" };
  } catch (error) {
    console.error("Error populating sample inventory:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if inventory collection has any items
 */
export async function checkInventoryExists() {
  try {
    const inventoryRef = collection(db, "inventory");
    const snapshot = await getDocs(inventoryRef);
    return {
      exists: !snapshot.empty,
      count: snapshot.size,
      items: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  } catch (error) {
    console.error("Error checking inventory:", error);
    return { exists: false, count: 0, items: [], error: error.message };
  }
}