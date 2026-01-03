import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  filterProducts,
  sanitizeSearchQuery,
  parseSearchTerms,
  productMatchesSearch,
  calculateRelevanceScore,
  multiWordSearch,
  fuzzySearch,
  getSearchSuggestions
} from './productSearch'

// Arbitraries for property-based testing
const productArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(name => name.trim().length > 0),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
  qty: fc.integer({ min: 0, max: 100 })
})

const productsArbitrary = fc.array(productArbitrary, { minLength: 0, maxLength: 20 })
const searchQueryArbitrary = fc.string({ minLength: 1, maxLength: 30 })

describe('Product Search Utilities', () => {
  describe('sanitizeSearchQuery', () => {
    it('should handle various input types safely', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean()
          ),
          (input) => {
            const result = sanitizeSearchQuery(input)
            expect(typeof result).toBe('string')
            expect(result.length).toBeLessThanOrEqual(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should trim whitespace and limit length', () => {
      expect(sanitizeSearchQuery('  hello world  ')).toBe('hello world')
      expect(sanitizeSearchQuery('a'.repeat(150))).toHaveLength(100)
      expect(sanitizeSearchQuery('')).toBe('')
      expect(sanitizeSearchQuery(null)).toBe('')
    })
  })

  describe('parseSearchTerms', () => {
    it('should split queries into terms correctly', () => {
      fc.assert(
        fc.property(
          searchQueryArbitrary,
          (query) => {
            const terms = parseSearchTerms(query)
            expect(Array.isArray(terms)).toBe(true)
            expect(terms.length).toBeLessThanOrEqual(10)
            
            // All terms should be lowercase and non-empty
            terms.forEach(term => {
              expect(typeof term).toBe('string')
              expect(term.length).toBeGreaterThan(0)
              expect(term).toBe(term.toLowerCase())
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases', () => {
      expect(parseSearchTerms('hello world')).toEqual(['hello', 'world'])
      expect(parseSearchTerms('  multiple   spaces  ')).toEqual(['multiple', 'spaces'])
      expect(parseSearchTerms('')).toEqual([])
      expect(parseSearchTerms('   ')).toEqual([])
    })
  })

  describe('productMatchesSearch', () => {
    /**
     * Feature: searchable-product-selection, Property 12: Partial text matching
     * For any search query and product name, if the product name contains 
     * the search query as a substring (case-insensitive), the product should 
     * appear in the filtered results
     * Validates: Requirements 5.1
     */
    it('should match products containing search terms (case-insensitive)', () => {
      fc.assert(
        fc.property(
          productArbitrary,
          fc.string({ minLength: 1, maxLength: 10 }),
          (product, searchTerm) => {
            // Ensure the product name contains the search term
            const modifiedProduct = {
              ...product,
              name: `${product.name} ${searchTerm} extra`
            }
            
            const searchTerms = [searchTerm.toLowerCase()]
            const result = productMatchesSearch(modifiedProduct, searchTerms)
            
            expect(result).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle case-insensitive matching', () => {
      const product = { id: '1', name: 'Apple Juice', price: 5.0, qty: 10 }
      
      // Test through parseSearchTerms which handles case conversion
      expect(productMatchesSearch(product, parseSearchTerms('apple'))).toBe(true)
      expect(productMatchesSearch(product, parseSearchTerms('APPLE'))).toBe(true)
      expect(productMatchesSearch(product, parseSearchTerms('ApPlE'))).toBe(true)
      expect(productMatchesSearch(product, parseSearchTerms('juice'))).toBe(true)
      expect(productMatchesSearch(product, parseSearchTerms('JUICE'))).toBe(true)
    })

    it('should require all terms to match', () => {
      const product = { id: '1', name: 'Apple Juice Fresh', price: 5.0, qty: 10 }
      
      expect(productMatchesSearch(product, ['apple', 'juice'])).toBe(true)
      expect(productMatchesSearch(product, ['apple', 'fresh'])).toBe(true)
      expect(productMatchesSearch(product, ['apple', 'orange'])).toBe(false)
      expect(productMatchesSearch(product, ['banana'])).toBe(false)
    })

    it('should handle invalid inputs gracefully', () => {
      expect(productMatchesSearch(null, ['test'])).toBe(false)
      expect(productMatchesSearch({ id: '1' }, ['test'])).toBe(false)
      expect(productMatchesSearch({ id: '1', name: 'Test' }, null)).toBe(false)
      expect(productMatchesSearch({ id: '1', name: 'Test' }, 'not-array')).toBe(false)
    })
  })

  describe('calculateRelevanceScore', () => {
    it('should give higher scores to better matches', () => {
      const products = [
        { id: '1', name: 'Apple', price: 1.0, qty: 10 },
        { id: '2', name: 'Apple Juice', price: 2.0, qty: 10 },
        { id: '3', name: 'Green Apple Fresh', price: 3.0, qty: 10 },
        { id: '4', name: 'Something with apple inside', price: 4.0, qty: 10 }
      ]
      
      const query = 'apple'
      const searchTerms = ['apple']
      
      const scores = products.map(p => calculateRelevanceScore(p, query, searchTerms))
      
      // Exact match should have highest score
      expect(scores[0]).toBeGreaterThan(scores[1])
      // Starts with should be higher than contains
      expect(scores[1]).toBeGreaterThan(scores[3])
    })

    it('should handle edge cases', () => {
      expect(calculateRelevanceScore(null, 'test', ['test'])).toBe(0)
      expect(calculateRelevanceScore({ id: '1' }, 'test', ['test'])).toBe(0)
      expect(calculateRelevanceScore({ id: '1', name: 'Test' }, '', [])).toBeGreaterThan(0)
    })
  })

  describe('filterProducts', () => {
    /**
     * Feature: searchable-product-selection, Property 12: Partial text matching
     * For any search query and product name, if the product name contains 
     * the search query as a substring (case-insensitive), the product should 
     * appear in the filtered results
     * Validates: Requirements 5.1
     */
    it('should return products containing search query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          productsArbitrary,
          fc.string({ minLength: 2, maxLength: 10 }).filter(s => s.trim().length >= 2),
          (products, searchQuery) => {
            // Skip if no products
            if (products.length === 0) return true
            
            const results = filterProducts(products, searchQuery)
            
            // All results should contain the search query (case-insensitive)
            results.forEach(product => {
              expect(product.name.toLowerCase()).toContain(searchQuery.toLowerCase())
            })
            
            // Results should be limited
            expect(results.length).toBeLessThanOrEqual(10)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty queries correctly', () => {
      const products = [
        { id: '1', name: 'Apple', price: 1.0, qty: 10 },
        { id: '2', name: 'Banana', price: 2.0, qty: 5 }
      ]
      
      expect(filterProducts(products, '')).toHaveLength(2)
      expect(filterProducts(products, ' ')).toHaveLength(2)
      expect(filterProducts(products, 'a')).toHaveLength(2) // Less than minQueryLength
    })

    it('should respect maxResults option', () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        name: `Product ${i}`,
        price: i,
        qty: 10
      }))
      
      const results = filterProducts(products, 'product', { maxResults: 5 })
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should filter out-of-stock products when requested', () => {
      const products = [
        { id: '1', name: 'Apple', price: 1.0, qty: 10 },
        { id: '2', name: 'Apple Juice', price: 2.0, qty: 0 },
        { id: '3', name: 'Apple Pie', price: 3.0, qty: 5 }
      ]
      
      const resultsWithStock = filterProducts(products, 'apple', { includeOutOfStock: false })
      expect(resultsWithStock).toHaveLength(2)
      expect(resultsWithStock.every(p => p.qty > 0)).toBe(true)
      
      const resultsAll = filterProducts(products, 'apple', { includeOutOfStock: true })
      expect(resultsAll).toHaveLength(3)
    })

    it('should handle invalid inputs gracefully', () => {
      expect(filterProducts(null, 'test')).toEqual([])
      expect(filterProducts(undefined, 'test')).toEqual([])
      expect(filterProducts('not-array', 'test')).toEqual([])
      expect(filterProducts([], 'test')).toEqual([])
    })
  })

  describe('multiWordSearch', () => {
    /**
     * Feature: searchable-product-selection, Property 13: Multi-word search matching
     * For any multi-word search query, only products containing all words 
     * (in any order) should appear in the filtered results
     * Validates: Requirements 5.2
     */
    it('should match products containing all search words', () => {
      const products = [
        { id: '1', name: 'Fresh Apple Juice', price: 5.0, qty: 10 },
        { id: '2', name: 'Apple Pie Fresh', price: 8.0, qty: 5 },
        { id: '3', name: 'Orange Juice', price: 4.0, qty: 8 },
        { id: '4', name: 'Apple Sauce', price: 3.0, qty: 12 }
      ]
      
      const results = multiWordSearch(products, 'apple fresh')
      
      // Should only return products containing both "apple" and "fresh"
      expect(results).toHaveLength(2)
      results.forEach(product => {
        expect(product.name.toLowerCase()).toContain('apple')
        expect(product.name.toLowerCase()).toContain('fresh')
      })
    })

    it('should work with any word order', () => {
      const products = [
        { id: '1', name: 'Fresh Apple Juice', price: 5.0, qty: 10 }
      ]
      
      const results1 = multiWordSearch(products, 'apple fresh')
      const results2 = multiWordSearch(products, 'fresh apple')
      
      expect(results1).toHaveLength(1)
      expect(results2).toHaveLength(1)
      expect(results1[0].id).toBe(results2[0].id)
    })

    it('should handle property-based multi-word queries', () => {
      fc.assert(
        fc.property(
          productsArbitrary,
          fc.array(fc.string({ minLength: 2, maxLength: 8 }), { minLength: 2, maxLength: 3 }),
          (products, words) => {
            if (products.length === 0 || words.length === 0) return true
            
            const query = words.join(' ')
            const results = multiWordSearch(products, query)
            
            // All results should contain all search words
            results.forEach(product => {
              words.forEach(word => {
                expect(product.name.toLowerCase()).toContain(word.toLowerCase())
              })
            })
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('fuzzySearch', () => {
    it('should find matches with typos', () => {
      const products = [
        { id: '1', name: 'Apple Juice', price: 5.0, qty: 10 }
      ]
      
      // Should find "Apple" even with "Appl" (missing last character)
      const results = fuzzySearch(products, 'Appl', { tolerance: 1 })
      expect(results).toHaveLength(1)
    })

    it('should fallback to exact search first', () => {
      const products = [
        { id: '1', name: 'Apple', price: 5.0, qty: 10 },
        { id: '2', name: 'Appl Store', price: 10.0, qty: 5 }
      ]
      
      const exactResults = fuzzySearch(products, 'Apple', { tolerance: 1 })
      expect(exactResults).toHaveLength(1)
      expect(exactResults[0].name).toBe('Apple')
    })
  })

  describe('getSearchSuggestions', () => {
    it('should provide relevant suggestions', () => {
      const products = [
        { id: '1', name: 'Apple Juice', price: 5.0, qty: 10 },
        { id: '2', name: 'Apple Pie', price: 8.0, qty: 5 },
        { id: '3', name: 'Orange Juice', price: 4.0, qty: 8 }
      ]
      
      const suggestions = getSearchSuggestions(products, 'app', 5)
      expect(suggestions).toContain('apple')
      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should handle empty inputs', () => {
      const products = [
        { id: '1', name: 'Apple', price: 5.0, qty: 10 }
      ]
      
      expect(getSearchSuggestions(products, '')).toEqual([])
      expect(getSearchSuggestions([], 'app')).toEqual([])
    })
  })
})