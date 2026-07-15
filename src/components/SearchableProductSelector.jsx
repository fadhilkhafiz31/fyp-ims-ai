import { useState, useEffect, useRef } from "react";
import { filterProducts } from "../utils/productSearch";
import SuggestionList from "./SuggestionList";

export default function SearchableProductSelector({
  products = [],
  selectedProductId = "",
  onProductSelect,
  placeholder = "Search products...",
  disabled = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const inputRef = useRef(null);
  const suggestionListRef = useRef(null);

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

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      if (selectedProduct) {
        setSelectedProduct(null);
        onProductSelect?.("");
      }
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.length > 0 || products.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // setTimeout delay so a click on a suggestion registers before the list unmounts
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleProductSelect = (product) => {
    if (product.qty <= 0) {
      return;
    }

    setSelectedProduct(product);
    setSearchQuery(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onProductSelect?.(product.id);
  };

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