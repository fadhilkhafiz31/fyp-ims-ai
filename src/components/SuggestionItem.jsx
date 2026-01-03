/**
 * SuggestionItem Component
 * 
 * Displays an individual product suggestion with proper formatting,
 * highlighting, and interaction states. Handles disabled states for
 * out-of-stock products and provides visual feedback for user interactions.
 * 
 * Props:
 * - product: Product object with id, name, price, qty properties
 * - isHighlighted: Whether this item is currently highlighted (keyboard navigation)
 * - isDisabled: Whether this item should be disabled (out of stock)
 * - onClick: Callback when item is clicked
 * - onMouseEnter: Callback when mouse enters item
 * - searchQuery: Current search query for text highlighting
 * - className: Additional CSS classes
 */
export default function SuggestionItem({
  product,
  isHighlighted = false,
  isDisabled = false,
  onClick,
  onMouseEnter,
  searchQuery = "",
  className = ""
}) {
  // Handle click with disabled state check
  const handleClick = (e) => {
    e.preventDefault();
    if (isDisabled) {
      return; // Don't allow selection of disabled items
    }
    onClick?.(product);
  };

  // Format price display
  const formatPrice = (price) => {
    const numPrice = Number(price || 0);
    return numPrice.toFixed(2);
  };

  // Format stock display with status
  const formatStock = (qty) => {
    const numQty = Number(qty || 0);
    if (numQty <= 0) {
      return "Out of Stock";
    }
    return `Stock: ${numQty}`;
  };

  // Highlight search terms in product name
  const highlightSearchTerms = (text, query) => {
    if (!query || !text) return text;
    
    try {
      // Create a case-insensitive regex for the search query
      const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 0);
      if (searchTerms.length === 0) return text;
      
      // Create regex pattern for all search terms
      const pattern = searchTerms.map(term => 
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
      ).join('|');
      
      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        const isMatch = searchTerms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        );
        
        if (isMatch) {
          return (
            <mark 
              key={index} 
              className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100 px-0.5 rounded"
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch (error) {
      // Fallback to plain text if regex fails
      return text;
    }
  };

  // Generate CSS classes based on state
  const getItemClasses = () => {
    const baseClasses = "p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors duration-150";
    
    let stateClasses = "";
    
    if (isDisabled) {
      stateClasses = "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50";
    } else if (isHighlighted) {
      stateClasses = "bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100";
    } else {
      stateClasses = "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100";
    }
    
    return `${baseClasses} ${stateClasses} ${className}`.trim();
  };

  // Get stock status styling
  const getStockClasses = () => {
    if (isDisabled) {
      return "text-red-500 dark:text-red-400 font-medium";
    }
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div
      className={getItemClasses()}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isHighlighted}
      aria-disabled={isDisabled}
      data-testid={`suggestion-item-${product.id}`}
    >
      {/* Product Name and Price Row */}
      <div className="flex justify-between items-center">
        <span className="font-medium text-sm">
          {highlightSearchTerms(product.name, searchQuery)}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2 flex-shrink-0">
          RM {formatPrice(product.price)}
        </span>
      </div>
      
      {/* Stock Information Row */}
      <div className="flex justify-between items-center mt-1">
        <span className={`text-xs ${getStockClasses()}`}>
          {formatStock(product.qty)}
        </span>
        
        {/* Additional product info could go here */}
        {product.category && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
            {product.category}
          </span>
        )}
      </div>
      
      {/* Out of stock warning */}
      {isDisabled && (
        <div className="mt-2 flex items-center text-xs text-red-500 dark:text-red-400">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Cannot be selected
        </div>
      )}
    </div>
  );
}