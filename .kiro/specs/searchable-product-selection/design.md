# Design Document: Searchable Product Selection

## Overview

This design document outlines the implementation of a searchable product selection component that replaces the existing dropdown selector in the Checkout page. The solution provides real-time search functionality with filtered suggestions, improving the user experience for cashiers when selecting products during checkout.

## Architecture

The searchable product selection will be implemented as a React component that integrates seamlessly with the existing Checkout page. The architecture follows a controlled component pattern with local state management for search functionality.

### Component Structure
```
SearchableProductSelector
├── SearchInput (text input field)
├── SuggestionList (filtered results)
│   └── SuggestionItem (individual product option)
└── SearchLogic (filtering and matching)
```

## Components and Interfaces

### SearchableProductSelector Component

**Props Interface:**
```typescript
interface SearchableProductSelectorProps {
  products: Product[];
  selectedProductId: string;
  onProductSelect: (productId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
}
```

**State Management:**
- `searchQuery`: Current search input value
- `filteredProducts`: Products matching the search query
- `isOpen`: Whether suggestion list is visible
- `highlightedIndex`: Currently highlighted suggestion (for keyboard navigation)
- `selectedProduct`: Currently selected product object

### Search Logic Implementation

**Filtering Algorithm:**
1. **Case-insensitive matching**: Convert both search query and product names to lowercase
2. **Partial matching**: Check if product name contains the search query as substring
3. **Multi-word support**: Split search query by spaces and match all words
4. **Prioritized results**: Exact matches first, then partial matches
5. **Stock filtering**: Show out-of-stock items as disabled

**Search Function:**
```javascript
const filterProducts = (products, query) => {
  if (!query || query.length < 2) return products.slice(0, 10);
  
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
  
  return products
    .filter(product => {
      const productName = product.name.toLowerCase();
      return searchTerms.every(term => productName.includes(term));
    })
    .sort((a, b) => {
      // Prioritize exact matches at start of name
      const aStartsWithQuery = a.name.toLowerCase().startsWith(query.toLowerCase());
      const bStartsWithQuery = b.name.toLowerCase().startsWith(query.toLowerCase());
      
      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;
      
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10); // Limit to 10 results
};
```

## Data Models

### Search State Model
```javascript
const initialSearchState = {
  searchQuery: '',
  filteredProducts: [],
  isOpen: false,
  highlightedIndex: -1,
  selectedProduct: null
};
```

### Product Display Model
```javascript
const ProductSuggestion = {
  id: string,
  displayName: string, // formatted as "Product Name (RM X.XX) - Stock: Y"
  isDisabled: boolean, // true when qty <= 0
  product: Product // original product object
};
```

## User Interface Design

### Search Input Field
- **Appearance**: Standard text input with search icon
- **Placeholder**: "Search products..." or "Type to search products"
- **Styling**: Consistent with existing form inputs in the application
- **Focus state**: Border highlight and suggestion list appears

### Suggestion List
- **Position**: Dropdown below the search input
- **Max height**: 300px with scroll for overflow
- **Item format**: `Product Name (RM Price) - Stock: Quantity`
- **Disabled items**: Grayed out with "Out of Stock" indicator
- **Hover/highlight**: Background color change for better visibility
- **Empty state**: "No products found" message when no matches

### Keyboard Navigation
- **Arrow Down/Up**: Navigate through suggestions
- **Enter**: Select highlighted suggestion
- **Escape**: Close suggestion list and clear search
- **Tab**: Move to next form field (closes suggestions)

## Integration with Existing Checkout Page

### Replacement Strategy
1. **Remove existing select element** from the product selection form
2. **Replace with SearchableProductSelector component**
3. **Maintain existing form submission logic** - the component will set `selectedItemId` state
4. **Preserve validation logic** - ensure selected product exists before adding to cart

### State Integration
```javascript
// In Checkout.jsx - replace the select with:
const [searchQuery, setSearchQuery] = useState('');
const [selectedProduct, setSelectedProduct] = useState(null);

// Update selectedItemId when product is selected
useEffect(() => {
  setSelectedItemId(selectedProduct?.id || '');
}, [selectedProduct]);
```

### Event Handlers
- **onProductSelect**: Updates selectedItemId and selectedProduct state
- **onSearchChange**: Updates search query and filters products
- **onClearSearch**: Resets search state and selected product

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Real-time filtering consistency
*For any* search query and product catalog, when the user types in the search input, the filtered results should only contain products whose names contain the search query (case-insensitive)
**Validates: Requirements 1.2, 1.3, 1.5**

### Property 2: Suggestion visibility based on input state
*For any* search input state, when the input contains text, the suggestion list should be visible, and when the input is empty, the suggestion list should be hidden
**Validates: Requirements 2.1**

### Property 3: Suggestion content completeness
*For any* product suggestion displayed, the suggestion should contain the product name, price, and available stock information
**Validates: Requirements 2.3**

### Property 4: Zero stock product disability
*For any* product with zero stock, when displayed in the suggestion list, it should be marked as disabled and non-selectable
**Validates: Requirements 2.4**

### Property 5: Product selection consistency
*For any* valid (non-disabled) suggestion, when clicked, the system should select that product and update the selected product state
**Validates: Requirements 3.1**

### Property 6: Input display after selection
*For any* selected product, the search input should display the selected product's name
**Validates: Requirements 3.2**

### Property 7: Suggestion list hiding after selection
*For any* product selection, the suggestion list should be hidden after the selection is made
**Validates: Requirements 3.3**

### Property 8: Disabled product click prevention
*For any* disabled product suggestion, clicking on it should prevent selection and maintain the current selection state
**Validates: Requirements 3.4**

### Property 9: Input clearing resets selection
*For any* selected product state, when the search input is cleared, the selected product should also be cleared
**Validates: Requirements 3.5**

### Property 10: Arrow key navigation
*For any* visible suggestion list with multiple items, pressing down arrow should highlight the next item, and pressing up arrow should highlight the previous item
**Validates: Requirements 4.2, 4.3**

### Property 11: Enter key selection
*For any* highlighted suggestion, pressing Enter should select that product
**Validates: Requirements 4.4**

### Property 12: Partial text matching
*For any* search query and product name, if the product name contains the search query as a substring (case-insensitive), the product should appear in the filtered results
**Validates: Requirements 5.1**

### Property 13: Multi-word search matching
*For any* multi-word search query, only products containing all words (in any order) should appear in the filtered results
**Validates: Requirements 5.2**

### Property 14: Result limitation
*For any* search query that would return more than 10 results, the suggestion list should be limited to exactly 10 items
**Validates: Requirements 5.3**

### Property 15: Exact match prioritization
*For any* search results containing both exact matches and partial matches, exact matches at the beginning of product names should appear first in the suggestion list
**Validates: Requirements 5.5**

## Error Handling

### Input Validation
- **Empty search queries**: Handle gracefully by showing all products or hiding suggestions
- **Special characters**: Sanitize input to prevent injection or rendering issues
- **Very long queries**: Limit input length to prevent performance issues

### Product Data Validation
- **Missing product data**: Handle products with missing name, price, or quantity fields
- **Invalid stock values**: Treat negative or non-numeric stock as zero
- **Null/undefined products**: Filter out invalid product entries

### Selection State Management
- **Invalid product selection**: Prevent selection of non-existent or disabled products
- **State synchronization**: Ensure search input and selected product state remain consistent
- **Component unmounting**: Clean up event listeners and prevent memory leaks

### Keyboard Navigation Edge Cases
- **Empty suggestion list**: Disable keyboard navigation when no suggestions are available
- **Index boundaries**: Prevent highlighting beyond first/last suggestion
- **Focus management**: Maintain proper focus states during keyboard navigation

## Testing Strategy

### Unit Testing Approach
The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Property-Based Testing Configuration
- **Testing library**: React Testing Library with @testing-library/user-event for interactions
- **Property testing**: Use fast-check library for property-based testing in JavaScript
- **Test iterations**: Minimum 100 iterations per property test
- **Test tagging**: Each property test tagged with format: **Feature: searchable-product-selection, Property {number}: {property_text}**

### Unit Test Focus Areas
- **Component rendering**: Verify correct initial render state
- **Edge cases**: Empty product lists, single product, no search results
- **Error conditions**: Invalid product data, network failures
- **Integration points**: Interaction with parent Checkout component

### Property Test Focus Areas
- **Search filtering**: Universal properties about search behavior
- **UI state management**: Properties about visibility and selection states
- **Keyboard navigation**: Properties about navigation behavior
- **Data consistency**: Properties about state synchronization

### Test Environment Setup
- **Mock data generation**: Create realistic product catalogs for testing
- **User interaction simulation**: Use user-event library for realistic interactions
- **Accessibility testing**: Verify keyboard navigation and screen reader compatibility
- **Performance testing**: Validate search performance with large product catalogs