import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Confusingly, stores live in the "storeId" collection, not "stores" - matches existing Firestore rules
export async function getStores() {
  try {
    const storesRef = collection(db, "storeId");
    // Try to order by storeName, but handle case where field might not exist
    let q;
    try {
      q = query(storesRef, orderBy("storeName"));
    } catch {
      // If orderBy fails, just get all docs
      q = storesRef;
    }
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        storeId: data.storeId || doc.id,
        storeName: data.storeName || data.name || doc.id,
        name: data.storeName || data.name || doc.id,
        phone: data.phone || null,
        address: data.address || null,
        ...data,
      };
    }).sort((a, b) => {
      // Manual sort by storeName as fallback
      const nameA = (a.storeName || a.name || "").toLowerCase();
      const nameB = (b.storeName || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    throw error;
  }
}

export async function createContactMessage(payload) {
  try {
    const contactRef = collection(db, "contact_messages");
    const docRef = await addDoc(contactRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating contact message:", error);
    throw error;
  }
}

