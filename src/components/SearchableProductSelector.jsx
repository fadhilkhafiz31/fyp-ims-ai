import { useState, useEffect, useRef } from "react";
import { filterProducts } from "../utils/productSearch";
import SuggestionList from "./SuggestionList";

/**
 * SearchableProductSelector Component
 * 
 * A searchable dropdown component that replaces the traditional select element
 * for product selection. Provides real-time filtering and keyboard navigation.
 * 
 * Props:
 * - products: Array of product objects with {id, name, price, qty}
 * - selectedProductId: Currently selected product ID
 * - onProductSelect: Callback function when a product is selected
 * - placeholder: Placeholder text for the search input
 * - disabled: Whether the component is disabled
 */
export default function SearchableProductSelector({
  products = [],
  selectedProductId = "",
  onProductSelect,
  placeholder = "Search products...",
  disabled = false
}) {
  // Component state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Refs for DOM manipulation
  const inputRef = useRef(null);
  const suggestionListRef = useRef(null);

  // Find selected product when selectedProductId changes
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      setSelectedProduct(product || null);
      if (product) {
        setSearchQuery(product.name);
      }
    } else {
      setSelectedProduct(null);
      setSearchQuery("");
    }
  }, [selectedProductId, products]);

  // Update filtered products when search query or products change
  useEffect(() => {
    const filtered = filterProducts(products, searchQuery, {
      maxResults: 10,
      minQueryLength: 2,
      includeOutOfStock: true,
      sortBy: 'relevance'
    });
    setFilteredProducts(filtered);
    setHighlightedIndex(-1); // Reset highlighted index when results change
  }, [searchQuery, products]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Show suggestions when typing
    if (value.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      // Clear selection when input is cleared
      if (selectedProduct) {
        setSelectedProduct(null);
        onProductSelect?.("");
      }
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchQuery.length > 0 || products.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input blur (with delay to allow for clicks)
  const handleInputBlur = () => {
    // Delay hiding to allow for suggestion clicks
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  // Handle product selection
  const handleProductSelect = (product) => {
    if (product.qty <= 0) {
      // Don't select disabled products
      return;
    }

    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onProductSelect?.(product.id);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleProductSelect(filteredProducts[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      
      default:
        break;
    }
  };

  // Format product display text
  const formatProductDisplay = (product) => {
    return `${product.name} (RM ${Number(product.price || 0).toFixed(2)}) - Stock: ${product.qty || 0}`;
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        className="w-full border p-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Suggestion List */}
      <SuggestionList
        ref={suggestionListRef}
        products={filteredProducts}
        isOpen={isOpen}
        highlightedIndex={highlightedIndex}
        onProductSelect={handleProductSelect}
        onProductHover={setHighlightedIndex}
        searchQuery={searchQuery}
        emptyMessage="No products found"
      />
    </div>
  );
}