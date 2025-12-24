import { useState } from "react";
import { populateSampleInventory, checkInventoryExists } from "../utils/populateSampleStores";

export default function PopulateSampleData() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [inventoryInfo, setInventoryInfo] = useState(null);

  const handleCheckInventory = async () => {
    setLoading(true);
    try {
      const result = await checkInventoryExists();
      setInventoryInfo(result);
      if (result.exists) {
        setMessage(`Found ${result.count} inventory items with stores: ${result.items.map(item => item.storeName).filter(Boolean).join(", ")}`);
      } else {
        setMessage("No inventory items found. You can populate sample data to get started.");
      }
    } catch (error) {
      setMessage(`Error checking inventory: ${error.message}`);
    }
    setLoading(false);
  };

  const handlePopulateData = async () => {
    setLoading(true);
    try {
      const result = await populateSampleInventory();
      if (result.success) {
        setMessage("Sample inventory data populated successfully! LocationSelector should now show available stores.");
        // Refresh inventory info
        setTimeout(handleCheckInventory, 1000);
      } else {
        setMessage(`Error populating data: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Store Data Management
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={handleCheckInventory}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Current Inventory"}
        </button>
        
        <button
          onClick={handlePopulateData}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Sample Store Data"}
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
        </div>
      )}

      {inventoryInfo && inventoryInfo.exists && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✅ Inventory exists with {inventoryInfo.count} items
          </p>
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            Stores found: {[...new Set(inventoryInfo.items.map(item => item.storeName).filter(Boolean))].join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}