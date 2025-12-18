import { useEffect, useMemo, useState } from "react";
import { useStore } from "../contexts/StoreContext";
import { useToast } from "../contexts/ToastContext";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import SideNavigation from "../components/SideNavigation";

export default function Checkout() {
  const { storeId, storeName } = useStore();
  const { toast } = useToast();
  const { globalLowStockCount } = useLowStockCount(storeId);
  
  // State
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qtyInput, setQtyInput] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load Inventory for selected store
  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, "inventory"), where("storeId", "==", storeId));
    const unsub = onSnapshot(q, (snap) => {
      setCatalog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [storeId]);

  // Cart Calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cart]);

  // Add Item to Cart
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedItemId) return toast.warning("Select an item");
    
    const product = catalog.find(i => i.id === selectedItemId);
    const existing = cart.find(i => i.id === selectedItemId);
    const addQty = Number(qtyInput);

    // Check Stock
    const currentStock = Number(product.qty || 0);
    const cartQty = existing ? existing.qty : 0;
    
    if (cartQty + addQty > currentStock) {
      return toast.error(`Not enough stock! Max available: ${currentStock}`);
    }

    if (existing) {
      setCart(cart.map(i => i.id === selectedItemId ? { ...i, qty: i.qty + addQty } : i));
    } else {
      setCart([...cart, { 
        id: product.id, 
        name: product.name, 
        price: Number(product.price || 0), 
        qty: addQty 
      }]);
    }
    setQtyInput(1);
    toast.success("Added to cart");
  };

  // Remove Item
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Checkout Handler
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.warning("Cart is empty");
    
    setProcessing(true);
    try {
      const checkoutFn = httpsCallable(functions, 'checkout');
      const result = await checkoutFn({ 
        cart, 
        storeId,
        storeName
      });

      const { receiptUrl, orderId } = result.data;

      // Success
      toast.success("Transaction Successful!");
      setCart([]); // Clear cart
      
      // Open Receipt
      if (receiptUrl) window.open(receiptUrl, '_blank');
      
      // Show Code to Cashier immediately
      alert(`Receipt Generated!\n\nRedemption Code: ${orderId}\n\n(Receipt opened in new tab)`);

    } catch (error) {
      console.error(error);
      toast.error("Checkout failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />
      <TopNavigation role="admin" onToggleSidebar={() => setSidebarOpen(v => !v)} />
      
      <div className="flex">
        {sidebarOpen && <SideNavigation activeItemCount={globalLowStockCount} />}
        
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6`}>
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Checkout</h1>

          {/* TWO COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: Item Entry */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-fit">
              <h2 className="font-semibold mb-4 text-lg text-gray-900 dark:text-gray-100">Add Item</h2>
              <form onSubmit={handleAddToCart} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Select Product</label>
                  <select 
                    className="w-full border p-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value)}
                  >
                    <option value="">-- Choose Item --</option>
                    {catalog.map(item => (
                      <option key={item.id} value={item.id} disabled={item.qty <= 0}>
                         {item.name} (RM {item.price}) - Stock: {item.qty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full border p-2 rounded dark:bg-gray-800"
                    value={qtyInput}
                    onChange={e => setQtyInput(e.target.value)}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
                >
                  Add to Cart
                </button>
              </form>
            </div>

            {/* RIGHT: Cart & Checkout */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-10rem)]">
              <h2 className="font-semibold mb-4 text-lg">Current Order</h2>
              
              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">Cart is empty</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-sm">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {cart.map(item => (
                        <tr key={item.id} className="border-b dark:border-gray-700">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.price.toFixed(2)}</td>
                          <td className="p-2">{item.qty}</td>
                          <td className="p-2 text-right">{(item.price * item.qty).toFixed(2)}</td>
                          <td className="p-2">
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totals & Checkout Button */}
              <div className="border-t pt-4 dark:border-gray-700">
                <div className="flex justify-between items-center text-xl font-bold mb-4">
                  <span>Total Amount:</span>
                  <span>RM {cartTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || processing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg shadow-lg"
                >
                  {processing ? "Processing..." : "CHECKOUT & PRINT RECEIPT"}
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

