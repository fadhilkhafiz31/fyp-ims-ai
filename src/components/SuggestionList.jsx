import { forwardRef } from "react";
import SuggestionItem from "./SuggestionItem";

const SuggestionList = forwardRef(({
  products = [],
  isOpen = false,
  highlightedIndex = -1,
  onProductSelect,
  onProductHover,
  searchQuery = "",
  emptyMessage = "No products found",
  className = ""
}, ref) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      ref={ref}
      className={`absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto ${className}`}
      role="listbox"
      aria-label="Product suggestions"
    >
      {products.length === 0 ? (
        <EmptyState message={emptyMessage} searchQuery={searchQuery} />
      ) : (
        products.map((product, index) => (
          <SuggestionItem
            key={product.id}
            product={product}
            isHighlighted={index === highlightedIndex}
            isDisabled={product.qty <= 0}
            onClick={() => onProductSelect?.(product)}
            onMouseEnter={() => onProductHover?.(index)}
            searchQuery={searchQuery}
          />
        ))
      )}
    </div>
  );
});

const EmptyState = ({ message, searchQuery }) => {
  const getEmptyMessage = () => {
    if (!searchQuery || searchQuery.length < 2) {
      return "Type to search products...";
    }
    return message;
  };

  const getEmptyIcon = () => {
    if (!searchQuery || searchQuery.length < 2) {
      return (
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.691-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  };

  return (
    <div className="p-6 text-center">
      {getEmptyIcon()}
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        {getEmptyMessage()}
      </p>
      {searchQuery && searchQuery.length >= 2 && (
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Try different keywords or check spelling
        </p>
      )}
    </div>
  );
};

SuggestionList.displayName = 'SuggestionList';

export default SuggestionList;