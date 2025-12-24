import { useStore } from "../contexts/StoreContext";

export default function LocationSelector({ label = "Choose Location:" }) {
  const { stores, storeId, setStore, loadingStores } = useStore();

  if (loadingStores) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading locations…
      </div>
    );
  }

  if (!stores.length) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-2 font-medium">
          <span className="text-red-600 dark:text-red-400">📍</span>
          <span className="text-gray-900 dark:text-gray-100">{label}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No locations available. Please add inventory items with store information to populate locations.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2 font-medium">
        <span className="text-red-600 dark:text-red-400">📍</span>
        <span className="text-gray-900 dark:text-gray-100">{label}</span>
      </div>
      <select
        value={storeId ?? ""}
        onChange={(e) => setStore(e.target.value)}
        className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

