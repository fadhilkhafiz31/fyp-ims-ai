// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PageReady } from "../components/NProgressBar";
import { useRole } from "../hooks/useRole";
import { useStore } from "../contexts/StoreContext";

const INVENTORY_COL = "inventory";

function KPI({ label, value }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function Inventory() {
  const { role } = useRole();
  const { storeId, storeName } = useStore();

  const defaultFormState = {
    name: "",
    sku: "",
    qty: "",
    reorderPoint: "5",
    category: "",
    StoreId: "",
    StoreName: "",
    Keywords: "",
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [storeOptions, setStoreOptions] = useState([]);
  const [storeLoadError, setStoreLoadError] = useState("");

  // ---- realtime subscription ----
  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const qRef = query(
      collection(db, INVENTORY_COL),
      where("storeId", "==", storeId),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("onSnapshot error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [storeId]);

  // ---- load store options ----
  useEffect(() => {
    const ref = collection(db, "storeId");
    
    // Log Firebase project for verification
    // eslint-disable-next-line no-console
    console.log("Firebase projectId:", db.app.options.projectId);
    
    // Live listener with error callback
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // eslint-disable-next-line no-console
        console.log("[storeId] onSnapshot size:", snap.size);
        const opts = snap.docs.map((d) => ({
          id: d.id,
          name: d.data()?.storeName || d.id,
        }));
        // eslint-disable-next-line no-console
        console.log("[storeId] options:", opts);
        setStoreOptions(opts);
        setStoreLoadError("");
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[storeId] onSnapshot error:", err);
        setStoreLoadError(err.message || "Failed to load stores");
      }
    );
    
    // One-shot fallback for diagnostics
    (async () => {
      try {
        const s = await getDocs(ref);
        // eslint-disable-next-line no-console
        console.log("[storeId] getDocs size:", s.size, "ids:", s.docs.map((d) => d.id));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[storeId] getDocs error:", e);
      }
    })();
    
    return () => unsub();
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
  const resetForm = () => setForm({ ...defaultFormState });

  const handleSelectStore = (id) => {
    const found = storeOptions.find((s) => s.id === id);
    setForm((f) => ({
      ...f,
      StoreId: found?.id || "",
      StoreName: found?.name || "",
    }));
  };

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
    if (form.qty === "" || Number.isNaN(Number(form.qty))) errors.push("Qty must be a number.");
    if (form.reorderPoint === "" || Number.isNaN(Number(form.reorderPoint)))
      errors.push("Reorder point must be a number.");
    if (!form.category.trim()) errors.push("Category is required.");
    if (!form.Keywords.trim()) errors.push("Keywords are required.");
    if (!storeId && !form.StoreId.trim()) errors.push("Store ID is required.");
    return errors;
  };

  // ---- create or update ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      // eslint-disable-next-line no-alert
      alert(errs.join("\n"));
      return;
    }

    // Use selected store if available, otherwise fall back to form values
    const finalStoreId = storeId || (form.StoreId || "").trim();
    const finalStoreName = storeName || (form.StoreName || "").trim();

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      qty: Number(form.qty),
      reorderPoint: Number(form.reorderPoint),
      category: form.category.trim(),
      // canonical fields (lowercase)
      storeId: finalStoreId,
      storeName: finalStoreName,
      // legacy compatibility
      StoreId: finalStoreId,
      StoreName: finalStoreName,
      Keywords: (form.Keywords || "").trim(),
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, INVENTORY_COL, editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, INVENTORY_COL), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("save error:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (it) => {
    setEditingId(it.id);
    setForm({
      ...defaultFormState,
      name: it.name || "",
      sku: it.sku || "",
      qty: String(Number(it.qty ?? 0)),
      reorderPoint: String(Number(it.reorderPoint ?? 5)),
      category: it.category || "",
      StoreId: it.storeId || it.StoreId || "",
      StoreName: it.storeName || it.StoreName || "",
      Keywords: Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, INVENTORY_COL, id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("delete error:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to delete item.");
    }
  };

  return (
    <div className="p-6 space-y-8">
      <PageReady />

      {/* Header */}
      <header className="space-y-1">
        <div>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome,{" "}
          <span className="font-medium text-gray-900 dark:text-gray-200">
            {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
          </span>
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Manage items (Name, SKU, Qty, Reorder Point, Category, Store Name, Store ID, Keywords)
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{editingId ? "Edit Item" : "Add New Item"}</h2>
          {storeName && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Store: <span className="font-medium">{storeName}</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Spritzer 550ml"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm mb-1">
              SKU
            </label>
            <input
              id="sku"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., SPR-550"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="qty" className="block text-sm mb-1">
              Qty
            </label>
            <input
              id="qty"
              name="qty"
              value={form.qty}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="0"
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
          </div>

          <div>
            <label htmlFor="reorderPoint" className="block text-sm mb-1">
              Reorder Point
            </label>
            <input
              id="reorderPoint"
              name="reorderPoint"
              value={form.reorderPoint}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="5"
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm mb-1">
              Category
            </label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Beverages"
              autoComplete="off"
              required
            />
          </div>

          {!storeId && (
            <>
              <div>
                <label htmlFor="StoreId" className="block text-sm mb-1">
                  Store ID
                </label>
                {storeLoadError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                    Stores error: {storeLoadError}
                  </p>
                )}
                <select
                  id="StoreId"
                  name="StoreId"
                  value={form.StoreId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {storeOptions.length === 0 ? (
                    <option value="" disabled>
                      No stores found
                    </option>
                  ) : (
                    <>
                      <option value="">Select a store…</option>
                      {storeOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="StoreName" className="block text-sm mb-1">
                  Store Name
                </label>
                <input
                  id="StoreName"
                  name="StoreName"
                  value={form.StoreName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  placeholder="Auto-filled"
                  autoComplete="off"
                  readOnly
                />
              </div>
            </>
          )}
          {storeId && (
            <>
              <div>
                <label htmlFor="StoreId" className="block text-sm mb-1">
                  Store ID
                </label>
                {storeLoadError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                    Stores error: {storeLoadError}
                  </p>
                )}
                <select
                  id="StoreId"
                  name="StoreId"
                  value={form.StoreId || storeId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {storeOptions.length === 0 ? (
                    <option value="" disabled>
                      No stores found
                    </option>
                  ) : (
                    <>
                      <option value={storeId}>
                        {storeId} (Default)
                      </option>
                      {storeOptions
                        .filter((s) => s.id !== storeId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="StoreName" className="block text-sm mb-1">
                  Store Name
                </label>
                <input
                  id="StoreName"
                  name="StoreName"
                  value={form.StoreName || storeName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  placeholder="Auto-filled"
                  autoComplete="off"
                  readOnly
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="Keywords" className="block text-sm mb-1">
              Keywords
            </label>
            <input
              id="Keywords"
              name="Keywords"
              value={form.Keywords}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., water,bottle,drinks"
              autoComplete="off"
              required
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
            <div className="grid grid-cols-9 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
              <div>Name</div>
              <div>SKU</div>
              <div>Qty</div>
              <div>Reorder</div>
              <div>Category</div>
              <div>Store Name</div>
              <div>Store ID</div>
              <div>Keywords</div>
              <div className="text-right">Actions</div>
            </div>

            {/* rows */}
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-9 gap-2 px-4 py-3 text-sm items-center">
                <div className="truncate">{it.name || "—"}</div>
                <div className="truncate">{it.sku || "—"}</div>
                <div>{Number(it.qty ?? 0)}</div>
                <div>{Number(it.reorderPoint ?? 0)}</div>
                <div className="truncate">{it.category || "—"}</div>
                <div className="truncate">{it.StoreName || "—"}</div>
                <div className="truncate">{it.StoreId || "—"}</div>
                <div className="truncate">
                  {Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "—"}
                </div>

                {/* actions */}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(it)}
                    className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
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

      
    </div>
  );
}
