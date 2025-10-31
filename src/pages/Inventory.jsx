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

const INVENTORY_COL = "inventory";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- form state (ONLY the 5 fields requested) ----
  const [form, setForm] = useState({
    name: "",
    sku: "",
    qty: "",
    reorderPoint: "5",
    category: "",
  });
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
  const resetForm = () =>
    setForm({ name: "", sku: "", qty: "", reorderPoint: "5", category: "" });

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

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      qty: Number(form.qty),
      reorderPoint: Number(form.reorderPoint),
      category: form.category.trim(),
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
      name: it.name || "",
      sku: it.sku || "",
      qty: String(Number(it.qty ?? 0)),
      reorderPoint: String(Number(it.reorderPoint ?? 5)),
      category: it.category || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
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
          Manage items (Name, SKU, Qty, Reorder Point, Category)
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
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">SKU</label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., SPZ-0550"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Qty</label>
            <input
              name="qty"
              value={form.qty}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              inputMode="numeric"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Reorder Point</label>
            <input
              name="reorderPoint"
              value={form.reorderPoint}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              inputMode="numeric"
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
            <div className="grid grid-cols-5 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
              <div>Name</div>
              <div>SKU</div>
              <div>Qty</div>
              <div>Reorder</div>
              <div>Category</div>
            </div>
            {/* rows */}
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm">
                <div className="truncate">{it.name || "—"}</div>
                <div className="truncate">{it.sku || "—"}</div>
                <div>{Number(it.qty ?? 0)}</div>
                <div>{Number(it.reorderPoint ?? 0)}</div>
                <div className="truncate">{it.category || "—"}</div>

                {/* actions */}
                <div className="col-span-5 flex gap-2 pt-2">
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

// Tiny KPI card component (matches your style)
function KPI({ label, value }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}
