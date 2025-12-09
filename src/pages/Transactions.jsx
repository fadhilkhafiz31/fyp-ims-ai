// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  runTransaction,
} from "firebase/firestore";
import * as motion from "motion/react-client";
import { db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRole } from "../hooks/useRole";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { PageReady } from "../components/NProgressBar";
import { useStore } from "../contexts/StoreContext";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
import ChatbotPanel from "../components/ChatbotPanel";
import AnimatedBadge from "../components/ui/AnimatedBadge";
import AnimatedIcon from "../components/ui/AnimatedIcon";
import { useToast } from "../contexts/ToastContext";
import { useSearch } from "../contexts/SearchContext";

const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
import SideNavigation from "../components/SideNavigation";

// ============================================
// Main Component
// ============================================
export default function Transactions() {
  const { role } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const { filterItems, searchQuery, hasSearch } = useSearch();
  const { globalLowStockCount } = useLowStockCount(storeId); // Pass storeId to filter by selected store
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ type: "IN", itemId: "", qty: 1, note: "", receiptImage: null });
  const [transactionsError, setTransactionsError] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const txRef = collection(db, "transactions");
  const invRef = collection(db, "inventory");

  // realtime transactions - Both staff and admin see all transactions
  useEffect(() => {
    const q = query(txRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setTransactionsError(null);
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Transactions query error:", error);
        setTransactionsError(error);
        // Show user-friendly error message
        if (error.code === "failed-precondition") {
          toast.error(
            "Firestore index missing. Please create the required index in Firebase Console."
          );
        } else if (error.code === "permission-denied") {
          toast.error("You don't have permission to view transactions.");
        } else {
          toast.error("Failed to load transactions. Please try again.");
        }
      }
    );
  }, []);

  // Filter transactions by location first
  const locationFilteredTransactions = useMemo(() => {
    if (!storeId) return [];
    return items.filter((t) => t && t.storeId === storeId);
  }, [items, storeId]);

  // Filter transactions based on location and search
  const filteredTransactions = useMemo(() => {
    return filterItems(locationFilteredTransactions, ["itemName", "note", "type"]);
  }, [locationFilteredTransactions, filterItems]);

  // load inventory - Both staff and admin see all inventory from all stores
  // This allows staff to help customers find items at other locations
  useEffect(() => {
    return onSnapshot(
      invRef,
      (snap) => {
        setInventoryError(null);
        const invItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCatalog(invItems);
        setInventory(invItems);
      },
      (error) => {
        console.error("Inventory query error:", error);
        setInventoryError(error);
        // Show user-friendly error message
        if (error.code === "permission-denied") {
          toast.error("You don't have permission to view inventory.");
        } else {
          toast.error("Failed to load inventory. Please try again.");
        }
      }
    );
  }, []);

  // Clear selected item when location changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, itemId: "" }));
  }, [storeId]);

  // Calculate low stock items for page display (filtered by selected store if applicable)
  // Note: For sidebar badge, we use globalLowStockCount from useLowStockCount hook
  const lowStockItems = useMemo(
    () => {
      let filtered = inventory.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      );
      // If a store is selected, filter by that store for page display
      if (storeId) {
        filtered = filtered.filter((item) => item.storeId === storeId);
      }
      return filtered;
    },
    [inventory, storeId]
  );

  // Filter catalog by selected location
  const filteredCatalog = useMemo(() => {
    if (!storeId) return [];
    return catalog.filter((item) => item.storeId === storeId);
  }, [catalog, storeId]);

  // resolve display name with unit (store name not needed since we filter by location)
  const displayNameById = (id, fallbackName) => {
    const it = catalog.find((x) => x.id === id);
    if (!it) return fallbackName || id || "unknown";
    const base = it.name || fallbackName || id;
    const unit = it.unit || it.Unit || it.package || it.size || it.measure || it.UOM || it.uom;
    return unit ? `${base} ${unit}` : base;
  };

  // Format transaction timestamp (time first, then date)
  const formatTransactionTime = (timestamp) => {
    if (!timestamp) return "—";
    
    let date;
    if (timestamp?.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Regular Date object
      date = timestamp;
    } else if (typeof timestamp === "number" || typeof timestamp === "string") {
      // Unix timestamp or date string
      date = new Date(timestamp);
    } else {
      return "—";
    }

    // Check if date is valid
    if (isNaN(date.getTime())) return "—";

    // Format: HH:MM:SS AM/PM, MM/DD/YYYY
    const time = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateStr = date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    return `${time}, ${dateStr}`;
  };

  // --- Last 30 Days summary ---
  const last30 = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const within30 = locationFilteredTransactions.filter(
      (t) => t && t.createdAt?.toDate && t.createdAt.toDate() >= since
    );

    const inTx = within30.filter((t) => t && t.type === "IN");
    const outTx = within30.filter((t) => t && t.type === "OUT");

    const inQty = inTx.reduce((s, t) => s + Number(t?.qty ?? 0), 0);
    const outQty = outTx.reduce((s, t) => s + Number(t?.qty ?? 0), 0);
    const net = inQty - outQty;

    // per-item breakdown (carry id and name)
    const byItemMap = new Map();
    for (const t of within30) {
      if (!t) continue;
      const key = t.itemId || t.itemName || "unknown";
      const prev = byItemMap.get(key) || { id: t.itemId || null, name: t.itemName || key, inQty: 0, outQty: 0 };
      if (t.itemId && !prev.id) prev.id = t.itemId;
      if (t.itemName && !prev.name) prev.name = t.itemName;
      if (t.type === "IN") prev.inQty += Number(t.qty ?? 0);
      else if (t.type === "OUT") prev.outQty += Number(t.qty ?? 0);
      byItemMap.set(key, prev);
    }
    const byItem = Array.from(byItemMap.values()).sort(
      (a, b) => b.inQty + b.outQty - (a.inQty + a.outQty)
    );

    return { inTx, outTx, inQty, outQty, net, byItem };
  }, [locationFilteredTransactions]);

  const currentQtyByIdOrName = (id, name) => {
    let it = null;
    if (id) it = catalog.find((x) => x.id === id);
    if (!it && name) it = catalog.find((x) => (x.name || "").trim() === (name || "").trim());
    return Number(it?.qty ?? 0);
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } // Use back camera on mobile
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Camera permission denied. Please enable camera access.");
      } else {
        toast.error("Failed to access camera. Please try again.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    const video = document.getElementById("camera-video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage(blob);
        setForm(prev => ({ ...prev, receiptImage: blob }));
        stopCamera();
        toast.success("Receipt captured! You can add the transaction now.");
      }
    }, "image/jpeg", 0.8);
  };

  // Upload receipt image to Firebase Storage
  const uploadReceiptImage = async (imageBlob) => {
    if (!imageBlob) return null;

    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const fileName = `receipts/${storeId || "unknown"}/${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, imageBlob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Failed to upload receipt image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // transaction handler
  async function handleAdd(e) {
    e.preventDefault();
    if (!storeId) {
      toast.warning("Please select a location first");
      return;
    }
    if (!form.itemId) {
      toast.warning("Choose an item");
      return;
    }
    const delta = Number(form.qty);
    if (!Number.isFinite(delta) || delta <= 0) {
      toast.warning("Qty must be > 0");
      return;
    }

    const invDocRef = doc(db, "inventory", form.itemId);
    const txDocRef = doc(txRef);
    const type = form.type;

    try {
      // Upload receipt image if available
      let receiptImageUrl = null;
      if (form.receiptImage) {
        receiptImageUrl = await uploadReceiptImage(form.receiptImage);
      }

      await runTransaction(db, async (tx) => {
        const invSnap = await tx.get(invDocRef);
        if (!invSnap.exists()) throw new Error("Inventory item not found");

        const inv = invSnap.data();
        const currentQty = Number(inv.qty ?? 0);
        const nextQty = type === "IN" ? currentQty + delta : currentQty - delta;
        if (nextQty < 0) {
          throw new Error(`Not enough stock. Current: ${currentQty}, removing: ${delta}`);
        }

        tx.update(invDocRef, { qty: nextQty, updatedAt: serverTimestamp() });
        tx.set(txDocRef, {
          type,
          itemId: form.itemId,
          itemName: inv.name ?? null,
          storeId: inv.storeId || null, // Store the storeId for transaction tracking
          qty: delta,
          note: (form.note || "").trim() || null,
          receiptImageUrl: receiptImageUrl || null,
          createdAt: serverTimestamp(),
          balanceBefore: currentQty,
          balanceAfter: nextQty,
        });
      });

      setForm({ type: "IN", itemId: "", qty: 1, note: "", receiptImage: null });
      setCapturedImage(null);
      toast.success("Transaction added successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to add transaction");
    }
  }

  // Setup camera video element
  useEffect(() => {
    if (showCamera && cameraStream) {
      const video = document.getElementById("camera-video");
      if (video) {
        video.srcObject = cameraStream;
      }
    }
  }, [showCamera, cameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={globalLowStockCount}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6 space-y-8`}>
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome,{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Select a location first, then log stock in/out for products at that location.
            </p>
          </header>

          {/* Location Selector */}
          <LocationSelector />

          {/* Last 30 Days Visual Summary */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">📦 Last 30 Days Summary</h2>

            <div className="text-sm leading-relaxed">
              <p className="text-green-700 dark:text-green-400">
                + IN: <b>{last30.inQty}</b> units ({last30.inTx.length} transactions)
              </p>
              <p className="text-red-700 dark:text-red-400">
                – OUT: <b>{last30.outQty}</b> units ({last30.outTx.length} transactions)
              </p>
              <hr className="my-2 border-gray-300 dark:border-gray-700" />
              <p
                className={`font-medium ${last30.net >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}
              >
                {last30.net >= 0 ? "▲ Net Gain" : "▼ Net Loss"}:{" "}
                {last30.net > 0 ? "+" : ""}
                {last30.net} units
              </p>
            </div>

            {/* Per-item breakdown */}
            {last30.byItem.length > 0 && (
              <div className="mt-3 border-t border-gray-300 dark:border-gray-700 pt-3">
                <div className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Per Item</div>
                <div className="grid grid-cols-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-1">
                  <div>Item</div>
                  <div className="text-green-700 dark:text-green-400">IN Qty</div>
                  <div className="text-red-700 dark:text-red-400">OUT Qty</div>
                </div>
                {last30.byItem
                  .filter((it) => it) // Filter out invalid items
                  .map((it) => (
                    <div
                      key={it.id || it.name || "unknown"}
                      className="grid grid-cols-3 text-sm border-b border-gray-200 dark:border-gray-800 py-1"
                    >
                      <div className="truncate text-gray-900 dark:text-gray-100">
                        {displayNameById(it.id || null, it.name || "Unknown Item")}
                        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">(current: {currentQtyByIdOrName(it.id || null, it.name || null)})</span>
                      </div>
                      <div className="text-green-700 dark:text-green-400">
                        ➕ {it.inQty ?? 0} <span className="text-xs text-gray-600 dark:text-gray-400">IN</span>
                      </div>
                      <div className="text-red-700 dark:text-red-400">
                        ➖ {it.outQty ?? 0} <span className="text-xs text-gray-600 dark:text-gray-400">OUT</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Error Messages */}
          {transactionsError && (
            <div className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 font-semibold">⚠️ Error Loading Transactions</div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                {transactionsError.code === "failed-precondition"
                  ? "A Firestore index is required. Please check the Firebase Console for index creation instructions."
                  : transactionsError.code === "permission-denied"
                  ? "You don't have permission to view transactions."
                  : transactionsError.message || "Failed to load transactions. Please refresh the page."}
              </p>
            </div>
          )}

          {inventoryError && (
            <div className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 font-semibold">⚠️ Error Loading Inventory</div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                {inventoryError.code === "permission-denied"
                  ? "You don't have permission to view inventory."
                  : inventoryError.message || "Failed to load inventory. The item dropdown may not work correctly."}
              </p>
            </div>
          )}

          {/* Entry form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                className="border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                value={form.type}
                onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
              >
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </select>

              <select
                className="border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                value={form.itemId}
                onChange={(e) => setForm((s) => ({ ...s, itemId: e.target.value }))}
                disabled={!storeId}
              >
                <option value="">
                  {storeId ? "Select item…" : "Please select a location first"}
                </option>
                {filteredCatalog
                  .sort((a, b) => {
                    const nameA = (a.name || "").toLowerCase();
                    const nameB = (b.name || "").toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {displayNameById(it.id, it.name || it.title || it.id)}
                    </option>
                  ))}
              </select>

              <input
                type="number"
                className="border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Qty"
                value={form.qty}
                min={1}
                onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))}
              />

              <input
                className="border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              />

              <div className="flex gap-2">
                {/* Camera button */}
                <motion.button
                  type="button"
                  onClick={() => {
                    if (capturedImage || form.receiptImage) {
                      // Remove captured image
                      setCapturedImage(null);
                      setForm(prev => ({ ...prev, receiptImage: null }));
                    } else if (showCamera) {
                      stopCamera();
                    } else {
                      startCamera();
                    }
                  }}
                  className={`flex-1 rounded px-3 py-2 flex items-center justify-center gap-2 ${
                    capturedImage || form.receiptImage
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : showCamera
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={capturedImage ? "Receipt captured - Click to remove" : showCamera ? "Stop camera" : "Capture receipt"}
                >
                  {capturedImage || form.receiptImage ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Captured</span>
                    </>
                  ) : showCamera ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">Stop</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">Receipt</span>
                    </>
                  )}
                </motion.button>

                {/* Add Transaction button */}
                <button 
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 bg-black dark:bg-gray-800 text-white rounded px-4 py-2 hover:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? "Uploading..." : "Add Transaction"}
                </button>
              </div>
            </div>

            {/* Camera preview */}
            {showCamera && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-blue-500 rounded-lg overflow-hidden bg-black"
              >
                <video
                  id="camera-video"
                  autoPlay
                  playsInline
                  className="w-full max-h-64 object-contain"
                />
                <div className="flex gap-2 p-3 bg-gray-900">
                  <motion.button
                    type="button"
                    onClick={captureImage}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Capture
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Captured image preview */}
            {capturedImage && !showCamera && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-green-500 rounded-lg overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={URL.createObjectURL(capturedImage)}
                    alt="Captured receipt"
                    className="w-full max-h-64 object-contain bg-gray-100 dark:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null);
                      setForm(prev => ({ ...prev, receiptImage: null }));
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                    title="Remove receipt"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-green-50 dark:bg-green-900/20">
                  ✓ Receipt captured. Click "Add Transaction" to save with receipt.
                </p>
              </motion.div>
            )}
          </form>

          {/* Full transaction list */}
          <div className="border border-gray-200 dark:border-gray-700 rounded">
            {/* Header row with search info and total count */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Transactions</h3>
                {hasSearch && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                    Searching: "{searchQuery}"
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {!storeId ? (
                  <span>Select location to view transactions</span>
                ) : hasSearch ? (
                  <span>
                    {filteredTransactions.length} of {locationFilteredTransactions.length}
                  </span>
                ) : (
                  <span>{locationFilteredTransactions.length} transaction{locationFilteredTransactions.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Table header row - aligned with data rows */}
            <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b bg-gray-50 dark:bg-gray-800/50 font-semibold text-sm text-gray-700 dark:text-gray-300">
              <div>Item</div>
              <div className="text-center">Type</div>
              <div>Time</div>
              <div>Qty</div>
              <div>Note</div>
            </div>

            {transactionsError ? (
              <div className="px-3 py-4 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="text-sm mb-1 font-semibold">Unable to load transactions</p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    {transactionsError.code === "failed-precondition"
                      ? "Please create the required Firestore index."
                      : "Please check your connection and try again."}
                  </p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                {!storeId ? (
                  <div className="text-gray-500">
                    <p className="text-sm mb-1">Please select a location to view transactions</p>
                    <p className="text-xs text-gray-400">Use the location selector above to filter transactions</p>
                  </div>
                ) : hasSearch ? (
                  <div className="text-gray-500">
                    <p className="text-sm mb-1">No transactions found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-400">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-gray-500">No transactions found for this location.</div>
                )}
              </div>
            ) : (
              filteredTransactions
                .filter((t) => t && t.id) // Filter out invalid transactions
                .map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white"
                  >
                    <div>
                      {displayNameById(t.itemId || null, t.itemName || "Unknown Item")}
                      {typeof t.balanceAfter === "number"
                        ? ` (stock after: ${t.balanceAfter})`
                        : ""}
                    </div>
                    <div
                      className={
                        (t.type || "IN") === "OUT"
                          ? "text-red-600 dark:text-red-400 font-medium text-center"
                          : "text-green-600 dark:text-green-400 font-medium text-center"
                      }
                    >
                      {t.type || "IN"}
                    </div>
                    <div>
                      {formatTransactionTime(t.createdAt)}
                    </div>
                    <div>{t.qty ?? 0}</div>
                    <div className="truncate">
                      {t.note ||
                        (typeof t.balanceBefore === "number"
                          ? `prev: ${t.balanceBefore}`
                          : "—")}
                    </div>
                  </div>
                ))
            )}
          </div>
        </main>
      </div>

      {/* Floating Chat Widget */}
      {chatWidgetOpen ? (
        <motion.div
          className="fixed bottom-4 right-4 z-50 w-96 h-[600px] shadow-2xl"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <ChatbotPanel fullHeight={true} />
          <button
            onClick={() => setChatWidgetOpen(false)}
            className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Minimize chat"
            title="Minimize chat"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setChatWidgetOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-16 h-16 bg-[#0F5132] hover:bg-[#0d4528] text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-label="Open chat"
          title="Open SmartStockAI Assistant"
        >
          <span className="text-2xl">🤖</span>
        </motion.button>
      )}
    </div>
  );
}