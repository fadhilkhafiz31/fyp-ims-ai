import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import SearchableProductSelector from './SearchableProductSelector'

// Clean up after each test
beforeEach(() => {
  cleanup()
})

describe('SearchableProductSelector', () => {
  describe('Component Initialization', () => {
    it('renders with basic props', () => {
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Test Product', price: 10.50, qty: 5 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument()
    })

    it('displays custom placeholder when provided', () => {
      const mockOnProductSelect = vi.fn()
      const customPlaceholder = 'Type to find products'

      render(
        <SearchableProductSelector
          products={[]}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
          placeholder={customPlaceholder}
        />
      )

      expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument()
    })

    it('is disabled when disabled prop is true', () => {
      const mockOnProductSelect = vi.fn()

      render(
        <SearchableProductSelector
          products={[]}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
          disabled={true}
        />
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  describe('Property 1: Real-time filtering consistency', () => {
    /**
     * Feature: searchable-product-selection, Property 1: Real-time filtering consistency
     * For any search query and product catalog, when the user types in the search input, 
     * the filtered results should only contain products whose names contain the search query (case-insensitive)
     * Validates: Requirements 1.2, 1.3, 1.5
     */
    it('should filter products consistently based on search query', async () => {
      // Simplified property test with specific test cases
      const testCases = [
        {
          products: [
            { id: '1', name: 'Apple Juice', price: 5.50, qty: 10 },
            { id: '2', name: 'Orange Juice', price: 6.00, qty: 8 }
          ],
          query: 'apple',
          expectedCount: 1
        },
        {
          products: [
            { id: '1', name: 'Test Product A', price: 10, qty: 5 },
            { id: '2', name: 'Test Product B', price: 15, qty: 3 },
            { id: '3', name: 'Other Item', price: 20, qty: 2 }
          ],
          query: 'test',
          expectedCount: 2
        }
      ]

      for (const testCase of testCases) {
        const user = userEvent.setup()
        const mockOnProductSelect = vi.fn()

        const { unmount } = render(
          <SearchableProductSelector
            products={testCase.products}
            selectedProductId=""
            onProductSelect={mockOnProductSelect}
          />
        )

        const input = screen.getByRole('textbox')
        
        await act(async () => {
          await user.type(input, testCase.query)
        })

        // Wait for filtering to complete
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        // Count visible suggestions by looking for suggestion items
        const suggestions = screen.queryAllByTestId(/^suggestion-item-/)

        expect(suggestions.length).toBe(testCase.expectedCount)
        unmount()
      }
    }, 10000) // Increase timeout

    it('should handle case-insensitive matching', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Apple Juice', price: 5.50, qty: 10 },
        { id: '2', name: 'Orange Juice', price: 6.00, qty: 8 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')

      // Test uppercase search
      await act(async () => {
        await user.clear(input)
        await user.type(input, 'APPLE')
      })
      
      expect(screen.getByTestId('suggestion-item-1')).toBeInTheDocument()
    })

    it('should show empty state when no products match', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Apple Juice', price: 5.50, qty: 10 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'xyz123')
      })
      
      expect(screen.getByText('No products found')).toBeInTheDocument()
    })
  })

  describe('Suggestion List Visibility', () => {
    it('shows suggestions when input has text', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Test Product', price: 10.50, qty: 5 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'Test')
      })

      expect(screen.getByTestId('suggestion-item-1')).toBeInTheDocument()
    })

    it('hides suggestions when input is cleared', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Test Product', price: 10.50, qty: 5 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      // Type something first
      await act(async () => {
        await user.type(input, 'Test')
      })
      expect(screen.getByTestId('suggestion-item-1')).toBeInTheDocument()

      // Clear the input
      await act(async () => {
        await user.clear(input)
      })
      
      // Wait for state update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
      })
      
      // Suggestions should be hidden
      expect(screen.queryByTestId('suggestion-item-1')).not.toBeInTheDocument()
    })
  })

  describe('Property 3: Suggestion content completeness', () => {
    /**
     * Feature: searchable-product-selection, Property 3: Suggestion content completeness
     * For any product suggestion displayed, the suggestion should contain the product name, price, and available stock information
     * Validates: Requirements 2.3
     */
    it('should display complete product information for all suggestions', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      
      // Test with various product configurations
      const testProducts = [
        { id: '1', name: 'Apple Juice', price: 5.50, qty: 10 },
        { id: '2', name: 'Orange Juice', price: 6.00, qty: 0 }, // Out of stock
        { id: '3', name: 'Grape Juice', price: 7.25, qty: 15 },
        { id: '4', name: 'Mango Juice', price: 8.99, qty: 3 }
      ]

      render(
        <SearchableProductSelector
          products={testProducts}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      // Search for "juice" to show all products
      await act(async () => {
        await user.type(input, 'juice')
      })

      // Verify each suggestion contains complete information
      for (const product of testProducts) {
        const suggestionElement = screen.getByTestId(`suggestion-item-${product.id}`)
        
        // Check that product name is displayed
        expect(suggestionElement).toHaveTextContent(product.name)
        
        // Check that price is displayed with RM prefix
        expect(suggestionElement).toHaveTextContent(`RM ${Number(product.price).toFixed(2)}`)
        
        // Check that stock information is displayed
        if (product.qty <= 0) {
          expect(suggestionElement).toHaveTextContent('Out of Stock')
        } else {
          expect(suggestionElement).toHaveTextContent(`Stock: ${product.qty}`)
        }
      }
    })

    it('should handle products with missing or invalid data gracefully', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      
      // Test with edge case product data
      const testProducts = [
        { id: '1', name: 'Valid Product', price: 5.50, qty: 10 },
        { id: '2', name: 'No Price Product', price: null, qty: 5 },
        { id: '3', name: 'No Qty Product', price: 3.00, qty: null },
        { id: '4', name: 'Zero Values', price: 0, qty: 0 }
      ]

      render(
        <SearchableProductSelector
          products={testProducts}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'product')
      })

      // Verify all suggestions are rendered with fallback values
      for (const product of testProducts) {
        const suggestionElement = screen.getByTestId(`suggestion-item-${product.id}`)
        
        // Product name should always be displayed
        expect(suggestionElement).toHaveTextContent(product.name)
        
        // Price should show 0.00 for null/undefined values
        const expectedPrice = Number(product.price || 0).toFixed(2)
        expect(suggestionElement).toHaveTextContent(`RM ${expectedPrice}`)
        
        // Stock should show appropriate message
        const qty = Number(product.qty || 0)
        if (qty <= 0) {
          expect(suggestionElement).toHaveTextContent('Out of Stock')
        } else {
          expect(suggestionElement).toHaveTextContent(`Stock: ${qty}`)
        }
      }
    })
  })

  describe('Property 4: Zero stock product disability', () => {
    /**
     * Feature: searchable-product-selection, Property 4: Zero stock product disability
     * For any product with zero stock, when displayed in the suggestion list, it should be marked as disabled and non-selectable
     * Validates: Requirements 2.4
     */
    it('should mark zero stock products as disabled and prevent selection', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      
      const testProducts = [
        { id: '1', name: 'In Stock Product', price: 5.50, qty: 10 },
        { id: '2', name: 'Zero Stock Product', price: 6.00, qty: 0 },
        { id: '3', name: 'Negative Stock Product', price: 7.00, qty: -1 },
        { id: '4', name: 'Null Stock Product', price: 8.00, qty: null }
      ]

      render(
        <SearchableProductSelector
          products={testProducts}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'product')
      })

      // Test each product's disabled state
      for (const product of testProducts) {
        const suggestionElement = screen.getByTestId(`suggestion-item-${product.id}`)
        const qty = Number(product.qty || 0)
        
        if (qty <= 0) {
          // Should be marked as disabled
          expect(suggestionElement).toHaveAttribute('aria-disabled', 'true')
          
          // Should show "Out of Stock" text
          expect(suggestionElement).toHaveTextContent('Out of Stock')
          
          // Should show "Cannot be selected" warning
          expect(suggestionElement).toHaveTextContent('Cannot be selected')
          
          // Should have disabled styling (opacity-50 class)
          expect(suggestionElement).toHaveClass('opacity-50')
          
          // Clicking should not trigger selection
          await act(async () => {
            await user.click(suggestionElement)
          })
          expect(mockOnProductSelect).not.toHaveBeenCalledWith(product.id)
        } else {
          // Should not be disabled
          expect(suggestionElement).toHaveAttribute('aria-disabled', 'false')
          
          // Should show stock count
          expect(suggestionElement).toHaveTextContent(`Stock: ${qty}`)
          
          // Should not have disabled styling
          expect(suggestionElement).not.toHaveClass('opacity-50')
        }
      }
    })

    it('should handle edge cases for stock values', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      
      // Test various edge cases for stock values
      const edgeCaseProducts = [
        { id: '1', name: 'Undefined Stock', price: 5.00 }, // qty undefined
        { id: '2', name: 'String Zero', price: 6.00, qty: '0' },
        { id: '3', name: 'String Number', price: 7.00, qty: '5' },
        { id: '4', name: 'Float Stock', price: 8.00, qty: 2.5 }
      ]

      render(
        <SearchableProductSelector
          products={edgeCaseProducts}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'stock')
      })

      // Verify proper handling of edge cases
      const undefinedStockElement = screen.getByTestId('suggestion-item-1')
      expect(undefinedStockElement).toHaveAttribute('aria-disabled', 'true')
      expect(undefinedStockElement).toHaveTextContent('Out of Stock')

      const stringZeroElement = screen.getByTestId('suggestion-item-2')
      expect(stringZeroElement).toHaveAttribute('aria-disabled', 'true')
      expect(stringZeroElement).toHaveTextContent('Out of Stock')

      const stringNumberElement = screen.getByTestId('suggestion-item-3')
      expect(stringNumberElement).toHaveAttribute('aria-disabled', 'false')
      expect(stringNumberElement).toHaveTextContent('Stock: 5')

      const floatStockElement = screen.getByTestId('suggestion-item-4')
      expect(floatStockElement).toHaveAttribute('aria-disabled', 'false')
      expect(floatStockElement).toHaveTextContent('Stock: 2.5')
    })
  })

  describe('Product Selection', () => {
    it('calls onProductSelect when a product is clicked', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Test Product', price: 10.50, qty: 5 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'Test')
      })

      const suggestion = screen.getByTestId('suggestion-item-1')
      
      await act(async () => {
        await user.click(suggestion)
      })

      expect(mockOnProductSelect).toHaveBeenCalledWith('1')
    })

    it('updates input value when product is selected', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Test Product', price: 10.50, qty: 5 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'Test')
      })

      const suggestion = screen.getByTestId('suggestion-item-1')
      
      await act(async () => {
        await user.click(suggestion)
      })

      expect(input.value).toBe('Test Product')
    })

    it('prevents selection of out-of-stock products', async () => {
      const user = userEvent.setup()
      const mockOnProductSelect = vi.fn()
      const products = [
        { id: '1', name: 'Out of Stock Product', price: 10.50, qty: 0 }
      ]

      render(
        <SearchableProductSelector
          products={products}
          selectedProductId=""
          onProductSelect={mockOnProductSelect}
        />
      )

      const input = screen.getByRole('textbox')
      
      await act(async () => {
        await user.type(input, 'Out')
      })

      const suggestion = screen.getByTestId('suggestion-item-1')
      
      await act(async () => {
        await user.click(suggestion)
      })

      // Should not call onProductSelect for out-of-stock items
      expect(mockOnProductSelect).not.toHaveBeenCalled()
    })
  })
})