import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { useStore } from "../contexts/StoreContext";
import { useToast } from "../contexts/ToastContext";
import { useRole } from "../hooks/useRole";
import * as motion from "motion/react-client";

export default function CopyInventory() {
  const { stores } = useStore();
  const { toast } = useToast();
  const { role } = useRole();
  const [fromStore, setFromStore] = useState("");
  const [toStore, setToStore] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Only show for admin and staff
  if (role !== "admin" && role !== "staff") {
    return null;
  }

  const copyInventory = httpsCallable(functions, "copyInventory");

  const handleCopy = async () => {
    if (!fromStore || !toStore) {
      toast.warning("Please select both source and destination stores");
      return;
    }

    if (fromStore === toStore) {
      toast.warning("Source and destination stores must be different");
      return;
    }

    setLoading(true);
    try {
      const result = await copyInventory({
        fromStore,
        toStore,
        overwrite,
      });

      const data = result.data;
      if (data.success) {
        toast.success(data.message || `Successfully copied ${data.count} items`);
        setShowModal(false);
        // Reset form
        setFromStore("");
        setToStore("");
        setOverwrite(false);
      }
    } catch (error) {
      console.error("Error copying inventory:", error);
      const errorMessage =
        error.message ||
        error.code ||
        "Failed to copy inventory. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fromStoreName = stores.find((s) => s.id === fromStore)?.name || fromStore;
  const toStoreName = stores.find((s) => s.id === toStore)?.name || toStore;

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        Copy Inventory
      </motion.button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Copy Inventory Between Stores
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={loading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* From Store */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Copy from Store:
                </label>
                <select
                  value={fromStore}
                  onChange={(e) => setFromStore(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select source store...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow Icon */}
              <div className="flex justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>

              {/* To Store */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Copy to Store:
                </label>
                <select
                  value={toStore}
                  onChange={(e) => setToStore(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Select destination store...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name || store.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overwrite Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label
                  htmlFor="overwrite"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Overwrite existing items (by SKU)
                </label>
              </div>

              {/* Preview */}
              {fromStore && toStore && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This will copy all inventory items from{" "}
                    <strong>{fromStoreName}</strong> to{" "}
                    <strong>{toStoreName}</strong>
                    {!overwrite && (
                      <span className="block mt-1 text-xs">
                        Items with existing SKUs will be skipped.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleCopy}
                  disabled={loading || !fromStore || !toStore}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={!loading && fromStore && toStore ? { scale: 1.02 } : {}}
                  whileTap={!loading && fromStore && toStore ? { scale: 0.98 } : {}}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Copying...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      Copy Inventory
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

