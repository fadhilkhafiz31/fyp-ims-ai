import { createContext, useContext, useState, useCallback } from "react";

const SearchContext = createContext(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState("");

  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Helper function to filter items based on search query
  const filterItems = useCallback((items, searchFields = ["name", "sku", "category", "Keywords"]) => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/).filter(word => word.length > 0);

    return items.filter((item) => {
      // Check each search field
      return searchFields.some((field) => {
        const fieldValue = item[field];
        
        if (!fieldValue) return false;

        // Handle array fields (like Keywords)
        if (Array.isArray(fieldValue)) {
          const fieldString = fieldValue.join(" ").toLowerCase();
          return queryWords.every(word => fieldString.includes(word)) || 
                 fieldString.includes(query);
        }

        // Handle string fields
        const fieldString = String(fieldValue).toLowerCase();
        
        // Exact match or contains all words
        return queryWords.every(word => fieldString.includes(word)) || 
               fieldString.includes(query);
      });
    });
  }, [searchQuery]);

  const value = {
    searchQuery,
    updateSearch,
    clearSearch,
    filterItems,
    hasSearch: searchQuery.trim().length > 0,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

