import { useEffect, useMemo, useState } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";

export default function Inventory() {
  const { user } = useAuth();
  const { role, ready } = useRole();                  // role + ready
  const allowStaffCreate = false;                     // set true if staff may create items

  const canSeeTx      = ready && (role === "admin" || role === "staff");
  const canCreate     = ready && (role === "admin" || (allowStaffCreate && role === "staff"));
  const canEditDelete = ready && role === "admin";

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", sku: "", qty: 0, category: "", reorderPoint: 10 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
  q,
  (snap) => {
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  },
  (err) => {
    console.error("onSnapshot error:", err);
    setLoading(false);
  }
);
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter(x =>
      (x.name || "").toLowerCase().includes(s) ||
      (x.sku || "").toLowerCase().includes(s) ||
      (x.category || "").toLowerCase().includes(s)
    );
  }, [items, search]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", sku: "", qty: 0, category: "", reorderPoint: 10 });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      qty: Number(item.qty ?? item.quantity ?? 0), // support any legacy "quantity"
      category: item.category || "",
      reorderPoint: Number(item.reorderPoint ?? 10),
    });
    setModalOpen(true);
  }

  // record a transaction
  async function logTx({ itemId, itemName, sku, action, oldQty, newQty }) {
    const change = Number(newQty) - Number(oldQty);
    await addDoc(collection(db, "transactions"), {
      itemId,
      itemName,
      sku,
      action,                // "create" | "update" | "delete"
      oldQty,
      newQty,
      change,
      byEmail: user?.email ?? "unknown",
      at: serverTimestamp(),
    });
  }

  async function saveItem(e) {
    e.preventDefault();
    const payload = {
      name: (form.name || "").trim(),
      sku: (form.sku || "").trim(),
      qty: Number(form.qty) || 0,
      category: (form.category || "").trim(),
      reorderPoint: Number(form.reorderPoint) || 0,
      updatedAt: serverTimestamp(),
    };
    if (!payload.name || !payload.sku) return alert("Name and SKU are required.");

    if (editing) {
      // UPDATE
      const oldQty = Number(editing.qty ?? editing.quantity ?? 0);
      const newQty = Number(payload.qty);
      await updateDoc(doc(db, "inventory", editing.id), payload);
      await logTx({
        itemId: editing.id,
        itemName: payload.name,
        sku: payload.sku,
        action: "update",
        oldQty,
        newQty,
      });
    } else {
      // CREATE
      const ref = await addDoc(collection(db, "inventory"), payload);
      await logTx({
        itemId: ref.id,
        itemName: payload.name,
        sku: payload.sku,
        action: "create",
        oldQty: 0,
        newQty: Number(payload.qty),
      });
    }
    setModalOpen(false);
  }

  async function removeItem(id) {
    const item = items.find(x => x.id === id);
    if (!item) return;
    if (!confirm("Delete this item?")) return;
    await deleteDoc(doc(db, "inventory", id));
    await logTx({
      itemId: id,
      itemName: item.name,
      sku: item.sku,
      action: "delete",
      oldQty: Number(item.qty ?? item.quantity ?? 0),
      newQty: 0,
    });
  }

  const lowStock = (it) => Number(it.qty ?? it.quantity ?? 0) <= Number(it.reorderPoint ?? 0);

  return (
    <div className="min-h-screen p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">Live Firestore CRUD with search & low-stock flag</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="border px-3 py-2 rounded">Dashboard</Link>
          {canSeeTx && (
            <Link to="/transactions" className="border px-3 py-2 rounded">Transactions</Link>
          )}
          {canCreate && (
            <button onClick={openAdd} className="bg-black text-white px-3 py-2 rounded">
              Add Item
            </button>
          )}
        </div>
      </header>

      {/* Top actions */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-full sm:w-80"
          placeholder="Search name / SKU / category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="text-sm text-gray-500">{loading ? "Loading…" : `${filtered.length} items`}</div>
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto">
        <div className="grid grid-cols-6 gap-2 px-3 py-2 border-b font-semibold min-w-[720px]">
          <div>Name</div>
          <div>SKU</div>
          <div className="text-right">Qty</div>
          <div>Category</div>
          <div className="text-right">Reorder ≤</div>
          <div className="text-right">Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-gray-500">No items found.</div>
        ) : (
          filtered.map((it) => (
            <div key={it.id} className="grid grid-cols-6 gap-2 px-3 py-2 border-b items-center min-w-[720px]">
              <div className="truncate font-medium">
                {it.name} {lowStock(it) && (
                  <span className="ml-2 text-xs rounded bg-red-100 text-red-700 px-2 py-0.5">Low</span>
                )}
              </div>
              <div className="truncate">{it.sku}</div>
              <div className="text-right">{Number(it.qty ?? it.quantity ?? 0)}</div>
              <div className="truncate">{it.category || "—"}</div>
              <div className="text-right">{Number(it.reorderPoint ?? 0)}</div>
              <div className="flex justify-end gap-2">
                {canEditDelete ? (
                  <>
                    <button
                      onClick={() => openEdit(it)}
                      className="border px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="border px-2 py-1 rounded text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">View only</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={saveItem}
            className="w-[min(92vw,560px)] rounded bg-white dark:bg-zinc-900 p-5 space-y-4"
          >
            <div className="text-lg font-semibold">
              {editing ? "Edit Item" : "Add Item"}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">SKU</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={form.sku}
                  onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Qty</label>
                {/* bind to qty */}
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={form.qty}
                  min={0}
                  onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-500">Reorder Point</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  value={form.reorderPoint}
                  min={0}
                  onChange={(e) => setForm((s) => ({ ...s, reorderPoint: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-gray-500">Category</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="border px-3 py-2 rounded"
              >
                Cancel
              </button>
              <button type="submit" className="bg-black text-white px-4 py-2 rounded">
                {editing ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
