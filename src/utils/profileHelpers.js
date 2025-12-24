import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Initialize user profile data when a new user signs up
 */
export async function initializeUserProfile(userId, userData) {
  try {
    const userRef = doc(db, "users", userId);
    const defaultProfile = {
      displayName: userData.displayName || "",
      email: userData.email || "",
      phone: "",
      role: userData.role || "customer",
      preferredStoreId: "",
      loyaltyPoints: 0,
      totalSpent: 0,
      createdAt: serverTimestamp(),
      preferences: {
        notifications: {
          lowStock: true,
          promotions: true,
          orderUpdates: true
        },
        language: "en"
      },
      ...userData
    };
    
    await setDoc(userRef, defaultProfile, { merge: true });
    return defaultProfile;
  } catch (error) {
    console.error("Error initializing user profile:", error);
    throw error;
  }
}

/**
 * Update user loyalty points and total spent after a purchase
 */
export async function updateUserLoyalty(userId, orderData) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const pointsEarned = Math.floor(orderData.totalAmount); // RM1 = 1 Point
      
      // Update user profile
      await updateDoc(userRef, {
        loyaltyPoints: (currentData.loyaltyPoints || 0) + pointsEarned,
        totalSpent: (currentData.totalSpent || 0) + orderData.totalAmount
      });
      
      // Add points history record
      await addPointsHistory(userId, {
        points: pointsEarned,
        description: `Purchase - Order #${orderData.id.slice(-8)}`,
        orderId: orderData.id,
        type: "earned"
      });
      
      return pointsEarned;
    }
  } catch (error) {
    console.error("Error updating user loyalty:", error);
    throw error;
  }
}

/**
 * Add a points history record
 */
export async function addPointsHistory(userId, pointsData) {
  try {
    const pointsRef = collection(db, "pointsHistory");
    await setDoc(doc(pointsRef), {
      userId,
      points: pointsData.points,
      description: pointsData.description,
      orderId: pointsData.orderId || null,
      type: pointsData.type || "earned", // earned, redeemed, expired
      createdAt: serverTimestamp(),
      ...pointsData
    });
  } catch (error) {
    console.error("Error adding points history:", error);
    throw error;
  }
}

/**
 * Redeem loyalty points
 */
export async function redeemLoyaltyPoints(userId, pointsToRedeem, description) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const currentPoints = currentData.loyaltyPoints || 0;
      
      if (currentPoints < pointsToRedeem) {
        throw new Error("Insufficient loyalty points");
      }
      
      // Update user profile
      await updateDoc(userRef, {
        loyaltyPoints: currentPoints - pointsToRedeem
      });
      
      // Add points history record
      await addPointsHistory(userId, {
        points: -pointsToRedeem,
        description: description || "Points Redeemed",
        type: "redeemed"
      });
      
      return currentPoints - pointsToRedeem; // Return new balance
    }
  } catch (error) {
    console.error("Error redeeming loyalty points:", error);
    throw error;
  }
}

/**
 * Get user's order history
 */
export async function getUserOrderHistory(userId, limit = 50) {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit ? limit : undefined
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user order history:", error);
    throw error;
  }
}

/**
 * Get user's points history
 */
export async function getUserPointsHistory(userId, limit = 50) {
  try {
    const pointsQuery = query(
      collection(db, "pointsHistory"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit ? limit : undefined
    );
    
    const pointsSnapshot = await getDocs(pointsQuery);
    return pointsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user points history:", error);
    throw error;
  }
}

/**
 * Add product to user's favorites
 */
export async function addToFavorites(userId, productData) {
  try {
    const favoritesRef = collection(db, "userFavorites");
    await setDoc(doc(favoritesRef), {
      userId,
      productId: productData.id,
      productName: productData.name,
      productSku: productData.sku,
      storeId: productData.storeId,
      storeName: productData.storeName,
      addedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
}

/**
 * Remove product from user's favorites
 */
export async function removeFromFavorites(userId, productId) {
  try {
    const favoritesQuery = query(
      collection(db, "userFavorites"),
      where("userId", "==", userId),
      where("productId", "==", productId)
    );
    
    const favoritesSnapshot = await getDocs(favoritesQuery);
    const deletePromises = favoritesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
}

/**
 * Get user's favorite products
 */
export async function getUserFavorites(userId) {
  try {
    const favoritesQuery = query(
      collection(db, "userFavorites"),
      where("userId", "==", userId),
      orderBy("addedAt", "desc")
    );
    
    const favoritesSnapshot = await getDocs(favoritesQuery);
    return favoritesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user favorites:", error);
    throw error;
  }
}

/**
 * Calculate user's monthly spending analytics
 */
export async function getUserSpendingAnalytics(userId, months = 6) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      where("createdAt", ">=", startDate),
      where("createdAt", "<=", endDate),
      orderBy("createdAt", "desc")
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by month
    const monthlySpending = {};
    const productFrequency = {};
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt.seconds * 1000);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Monthly spending
      if (!monthlySpending[monthKey]) {
        monthlySpending[monthKey] = 0;
      }
      monthlySpending[monthKey] += order.totalAmount;
      
      // Product frequency
      order.items?.forEach(item => {
        if (!productFrequency[item.name]) {
          productFrequency[item.name] = 0;
        }
        productFrequency[item.name] += item.qty;
      });
    });
    
    // Get top 5 most bought products
    const topProducts = Object.entries(productFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
    
    return {
      monthlySpending,
      topProducts,
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.totalAmount, 0)
    };
  } catch (error) {
    console.error("Error getting user spending analytics:", error);
    throw error;
  }
}