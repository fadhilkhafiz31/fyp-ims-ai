import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Get all stores from Firestore, ordered by storeName
 * Uses "storeId" collection to match existing codebase and Firestore rules
 * @returns {Promise<Array>} Array of store documents
 */
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

/**
 * Create a contact message in Firestore
 * @param {Object} payload - Contact message data
 * @param {string} payload.name - Sender's name
 * @param {string} payload.email - Sender's email
 * @param {string} payload.message - Message content
 * @param {boolean} payload.includeStore - Whether to include store name
 * @returns {Promise<string>} Document ID of the created message
 */
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

