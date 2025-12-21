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
import LocationSelector from "../components/LocationSelector";

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
      console.log("Starting checkout process...");
      console.log("Cart:", cart);
      console.log("Store ID:", storeId);
      console.log("Store Name:", storeName);
      
      const checkoutFn = httpsCallable(functions, 'checkout');
      const result = await checkoutFn({ 
        cart, 
        storeId,
        storeName
      });

      console.log("Checkout result:", result);
      const { receiptUrl, orderId } = result.data;
      
      console.log("Receipt URL:", receiptUrl);
      console.log("Order ID:", orderId);

      // Success
      toast.success("Transaction Successful!");
      setCart([]); // Clear cart
      
      // Open Receipt
      if (receiptUrl) {
        console.log("Opening receipt URL in new tab:", receiptUrl);
        const newWindow = window.open(receiptUrl, '_blank');
        if (!newWindow) {
          console.error("Failed to open new window - popup blocked?");
          toast.warning("Receipt generated but popup was blocked. Check your browser settings.");
        }
      } else {
        console.error("No receipt URL received");
        toast.error("Receipt URL not generated");
      }
      
      // Show Code to Cashier immediately
      const shortCode = orderId.substring(0, 8).toUpperCase();
      alert(`Receipt Generated!\n\nRedemption Code: ${shortCode}\n\n${receiptUrl ? "(Receipt opened in new tab)" : "(Receipt URL not available)"}`);

    } catch (error) {
      console.error("Checkout error:", error);
      console.error("Error details:", error.message);
      console.error("Error code:", error.code);
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

          {/* Location Selector */}
          <div className="mb-6">
            <LocationSelector />
          </div>

          {/* Show message if no store selected */}
          {!storeId ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <div className="text-yellow-600 dark:text-yellow-400 mb-2">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Please Select a Location
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                Choose a store location above to view available products for checkout.
              </p>
            </div>
          ) : (
            /* TWO COLUMN LAYOUT */
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
                    className="w-full border p-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
              <h2 className="font-semibold mb-4 text-lg text-gray-900 dark:text-gray-100">Current Order</h2>
              
              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-10">Cart is empty</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-sm">
                      <tr>
                        <th className="p-2 text-gray-900 dark:text-gray-100">Item</th>
                        <th className="p-2 text-gray-900 dark:text-gray-100">Price</th>
                        <th className="p-2 text-gray-900 dark:text-gray-100">Qty</th>
                        <th className="p-2 text-right text-gray-900 dark:text-gray-100">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {cart.map(item => (
                        <tr key={item.id} className="border-b dark:border-gray-700">
                          <td className="p-2 text-gray-900 dark:text-gray-100">{item.name}</td>
                          <td className="p-2 text-gray-900 dark:text-gray-100">{item.price.toFixed(2)}</td>
                          <td className="p-2 text-gray-900 dark:text-gray-100">{item.qty}</td>
                          <td className="p-2 text-right text-gray-900 dark:text-gray-100">{(item.price * item.qty).toFixed(2)}</td>
                          <td className="p-2">
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                <div className="flex justify-between items-center text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
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
          )}
        </main>
      </div>
    </div>
  );
}

