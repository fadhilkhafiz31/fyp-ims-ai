diff --git a/src/pages/Inventory.jsx b/src/pages/Inventory.jsx
index 326e547c01221558893caa7b6da8a058e2356e12..ec1b6395c6845e9a7819cbe098541be0b1f00712 100644
--- a/src/pages/Inventory.jsx
+++ b/src/pages/Inventory.jsx
@@ -1,193 +1,211 @@
 // src/pages/Inventory.jsx
 import { useEffect, useMemo, useState } from "react";
 import { Link } from "react-router-dom";
 import {
   addDoc,
   collection,
   deleteDoc,
   doc,
   onSnapshot,
   orderBy,
   query,
   serverTimestamp,
   updateDoc,
 } from "firebase/firestore";
 import { db } from "../lib/firebase";
 import { PageReady } from "../components/NProgressBar";
 
+function KPI({ label, value }) {
+  return (
+    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
+      <div className="text-sm text-gray-500">{label}</div>
+      <div className="text-2xl font-bold">{value}</div>
+    </div>
+  );
+}
+
 const INVENTORY_COL = "inventory";
 
 export default function Inventory() {
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(true);
 
-  // ---- form state (ONLY the 5 fields requested) ----
-  const [form, setForm] = useState({
+  // ---- form state (all 8 Firestore fields) ----
+  const defaultFormState = {
     name: "",
     sku: "",
     qty: "",
     reorderPoint: "5",
     category: "",
     StoreId: "",
     StoreName: "",
     Keywords: "",
-  });
+  };
+
+  const [form, setForm] = useState(() => ({ ...defaultFormState }));
   const [saving, setSaving] = useState(false);
   const [editingId, setEditingId] = useState(null);
 
   // ---- realtime subscription ----
   useEffect(() => {
     const qRef = query(collection(db, INVENTORY_COL), orderBy("updatedAt", "desc"));
     const unsub = onSnapshot(
       qRef,
       (snap) => {
         setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
         setLoading(false);
       },
       (err) => {
         console.error("onSnapshot error:", err);
         setLoading(false);
       }
     );
     return unsub;
   }, []);
 
   // ---- derived totals (for quick context) ----
   const totals = useMemo(() => {
     const totalQty = items.reduce((s, it) => s + Number(it.qty ?? 0), 0);
     const totalItems = items.length;
     const totalCategories = new Set(
       items.map((it) => (it.category || "Uncategorized").trim().toLowerCase())
     ).size;
     return { totalQty, totalItems, totalCategories };
   }, [items]);
 
   // ---- helpers ----
-  const resetForm = () =>
-    setForm({ name: "", sku: "", qty: "", reorderPoint: "5", category: "", StoreId: "", StoreName: "", Keywords: "" });
+  const resetForm = () => setForm({ ...defaultFormState });
 
   const handleChange = (e) => {
     const { name, value } = e.target;
     // keep only integers in qty/reorderPoint (but allow empty string for UX)
     if (name === "qty" || name === "reorderPoint") {
       if (value === "" || /^[0-9]+$/.test(value)) {
         setForm((f) => ({ ...f, [name]: value }));
       }
       return;
     }
     setForm((f) => ({ ...f, [name]: value }));
   };
 
   const validate = () => {
     const errors = [];
     if (!form.name.trim()) errors.push("Name is required.");
     if (!form.sku.trim()) errors.push("SKU is required.");
     if (form.qty === "" || isNaN(Number(form.qty))) errors.push("Qty must be a number.");
     if (form.reorderPoint === "" || isNaN(Number(form.reorderPoint)))
       errors.push("Reorder point must be a number.");
     if (!form.category.trim()) errors.push("Category is required.");
+    if (!form.StoreName.trim()) errors.push("Store Name is required.");
+    if (!form.StoreId.trim()) errors.push("Store ID is required.");
+    if (!form.Keywords.trim()) errors.push("Keywords are required.");
     return errors;
   };
 
   // ---- create or update ----
   const handleSubmit = async (e) => {
     e.preventDefault();
     const errs = validate();
     if (errs.length) {
       alert(errs.join("\n"));
       return;
     }
 
-    const payload = {
+    const trimmed = {
       name: form.name.trim(),
       sku: form.sku.trim(),
       qty: Number(form.qty),
       reorderPoint: Number(form.reorderPoint),
       category: form.category.trim(),
       StoreId: (form.StoreId || "").trim(),
       StoreName: (form.StoreName || "").trim(),
       Keywords: (form.Keywords || "").trim(),
+    };
+
+    const payload = {
+      ...trimmed,
       updatedAt: serverTimestamp(),
     };
 
     setSaving(true);
     try {
       if (editingId) {
         // update existing doc
         await updateDoc(doc(db, INVENTORY_COL, editingId), payload);
         setEditingId(null);
       } else {
         // create new doc
         await addDoc(collection(db, INVENTORY_COL), {
           ...payload,
           createdAt: serverTimestamp(),
         });
       }
       resetForm();
     } catch (err) {
       console.error("save error:", err);
       alert("Failed to save item.");
     } finally {
       setSaving(false);
     }
   };
 
   const handleEdit = (it) => {
     setEditingId(it.id);
     setForm({
+      ...defaultFormState,
       name: it.name || "",
       sku: it.sku || "",
       qty: String(Number(it.qty ?? 0)),
       reorderPoint: String(Number(it.reorderPoint ?? 5)),
       category: it.category || "",
       StoreId: it.StoreId || "",
       StoreName: it.StoreName || "",
       Keywords: it.Keywords || "",
     });
     window.scrollTo({ top: 0, behavior: "smooth" });
   };
 
   const handleDelete = async (id) => {
-    if (!confirm("Delete this item?")) return;
+    if (!window.confirm("Delete this item?")) return;
     try {
       await deleteDoc(doc(db, INVENTORY_COL, id));
     } catch (err) {
       console.error("delete error:", err);
       alert("Failed to delete item.");
     }
   };
 
   return (
     <div className="p-6 space-y-8">
       <PageReady />
 
       {/* Header */}
       <header className="space-y-1">
         <h1 className="text-3xl font-bold">Inventory</h1>
         <p className="text-gray-600 dark:text-gray-400">
-          Manage items (Name, SKU, Qty, Reorder Point, Category)
+          Manage items (Name, SKU, Qty, Reorder Point, Category, Store Name, Store ID, Keywords)
         </p>
       </header>
 
       {/* KPIs */}
       <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <KPI label="Total Items" value={totals.totalItems} />
         <KPI label="Total Stock Qty" value={totals.totalQty} />
         <KPI label="Total Categories" value={totals.totalCategories} />
       </section>
 
       {/* Add / Edit form */}
       <section className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
         <h2 className="font-semibold text-lg mb-4">
           {editingId ? "Edit Item" : "Add New Item"}
         </h2>
 
         <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           <div>
             <label className="block text-sm mb-1">Name</label>
             <input
               name="name"
               value={form.name}
               onChange={handleChange}
               className="w-full border rounded px-3 py-2"
               placeholder="e.g., Spritzer 550ml"
@@ -231,149 +249,147 @@ export default function Inventory() {
               placeholder="5"
               required
             />
           </div>
 
           <div>
             <label className="block text-sm mb-1">Category</label>
             <input
               name="category"
               value={form.category}
               onChange={handleChange}
               className="w-full border rounded px-3 py-2"
               placeholder="e.g., Beverages"
               required
             />
           </div>
 
           <div>
             <label className="block text-sm mb-1">Store Name</label>
             <input
               name="StoreName"
               value={form.StoreName}
               onChange={handleChange}
               className="w-full border rounded px-3 py-2"
               placeholder="e.g., Main Outlet"
+              required
             />
           </div>
 
           <div>
             <label className="block text-sm mb-1">Store ID</label>
             <input
               name="StoreId"
               value={form.StoreId}
               onChange={handleChange}
               className="w-full border rounded px-3 py-2"
               placeholder="e.g., ST-001"
+              required
             />
           </div>
 
           <div>
             <label className="block text-sm mb-1">Keywords</label>
             <input
               name="Keywords"
               value={form.Keywords}
               onChange={handleChange}
               className="w-full border rounded px-3 py-2"
               placeholder="e.g., water,bottle,drinks"
+              required
             />
           </div>
 
           <div className="flex items-end gap-3">
             <button
               type="submit"
               disabled={saving}
               className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-60"
             >
               {saving ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save" : "Add"}
             </button>
 
             {editingId && (
               <button
                 type="button"
                 onClick={() => {
                   setEditingId(null);
                   resetForm();
                 }}
                 className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-700 hover:text-white"
               >
                 Cancel
               </button>
             )}
           </div>
         </form>
       </section>
 
       {/* Table */}
       <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
         <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
           <h2 className="font-semibold text-lg">Items</h2>
           <div className="text-sm text-gray-500">{items.length} total</div>
         </div>
 
         {loading ? (
           <div className="px-4 py-5 text-gray-600 dark:text-gray-400 text-sm">Loading…</div>
         ) : items.length === 0 ? (
           <div className="px-4 py-5 text-gray-600 dark:text-gray-400 text-sm">No items yet.</div>
         ) : (
           <div className="divide-y divide-gray-200 dark:divide-gray-700">
             {/* header */}
-            <div className="grid grid-cols-7 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
+            <div className="grid grid-cols-9 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
               <div>Name</div>
               <div>SKU</div>
               <div>Qty</div>
               <div>Reorder</div>
               <div>Category</div>
-              <div>Store</div>
+              <div>Store Name</div>
+              <div>Store ID</div>
               <div>Keywords</div>
+              <div className="text-right">Actions</div>
             </div>
             {/* rows */}
             {items.map((it) => (
-              <div key={it.id} className="grid grid-cols-7 gap-2 px-4 py-3 text-sm">
+              <div key={it.id} className="grid grid-cols-9 gap-2 px-4 py-3 text-sm items-center">
                 <div className="truncate">{it.name || "—"}</div>
                 <div className="truncate">{it.sku || "—"}</div>
                 <div>{Number(it.qty ?? 0)}</div>
                 <div>{Number(it.reorderPoint ?? 0)}</div>
                 <div className="truncate">{it.category || "—"}</div>
-                <div className="truncate">{it.StoreName || it.StoreId || "—"}</div>
-                <div className="truncate">{it.Keywords || "—"}</div>
+                <div className="truncate">{it.StoreName || "—"}</div>
+                <div className="truncate">{it.StoreId || "—"}</div>
+                <div className="truncate">
+                  {Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "—"}
+                </div>
 
                 {/* actions */}
-                <div className="col-span-7 flex gap-2 pt-2">
+                <div className="flex gap-2 justify-end">
                   <button
                     onClick={() => handleEdit(it)}
                     className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                   >
                     Edit
                   </button>
                   <button
                     onClick={() => handleDelete(it.id)}
                     className="px-3 py-1 border rounded hover:bg-red-600 hover:text-white"
                   >
                     Delete
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
       </section>
 
       {/* back to dashboard quick link */}
       <div>
         <Link to="/dashboard" className="text-blue-600 hover:underline">
           ← Back to Dashboard
         </Link>
       </div>
     </div>
   );
 }
-
-// Tiny KPI card component (matches your style)
-function KPI({ label, value }) {
-  return (
-    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
-      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
-      <div className="text-2xl font-semibold mt-2">{value}</div>
-    </div>
-  );
-}
