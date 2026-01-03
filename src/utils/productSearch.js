/**
 * Product Search Utilities
 * 
 * This module provides comprehensive search and filtering functionality
 * for product catalogs with support for various search patterns and
 * performance optimizations.
 */

/**
 * Sanitizes and validates a search query
 * @param {string} query - Raw search query
 * @returns {string} - Sanitized query
 */
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Remove excessive whitespace and limit length
  return query.trim().slice(0, 100);
};

/**
 * Splits a search query into individual search terms
 * @param {string} query - Search query
 * @returns {string[]} - Array of search terms
 */
export const parseSearchTerms = (query) => {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return [];
  
  return sanitized
    .toLowerCase()
    .split(/\s+/) // Split on any whitespace
    .filter(term => term.length > 0)
    .slice(0, 10); // Limit to 10 terms for performance
};

/**
 * Checks if a product matches the search criteria
 * @param {Object} product - Product object with name, price, qty properties
 * @param {string[]} searchTerms - Array of search terms
 * @returns {boolean} - Whether the product matches
 */
export const productMatchesSearch = (product, searchTerms) => {
  if (!product || !product.name || !Array.isArray(searchTerms)) {
    return false;
  }
  
  const productName = product.name.toLowerCase();
  
  // All search terms must be found in the product name
  return searchTerms.every(term => productName.includes(term));
};

/**
 * Calculates a relevance score for search result ranking
 * @param {Object} product - Product object
 * @param {string} originalQuery - Original search query
 * @param {string[]} searchTerms - Parsed search terms
 * @returns {number} - Relevance score (higher is better)
 */
export const calculateRelevanceScore = (product, originalQuery, searchTerms) => {
  if (!product || !product.name) return 0;
  
  const productName = product.name.toLowerCase();
  const query = originalQuery.toLowerCase();
  let score = 0;
  
  // Exact match gets highest score
  if (productName === query) {
    score += 1000;
  }
  
  // Starts with query gets high score
  if (productName.startsWith(query)) {
    score += 500;
  }
  
  // Contains full query as substring
  if (productName.includes(query)) {
    score += 200;
  }
  
  // Score based on how many terms match at word boundaries
  searchTerms.forEach(term => {
    const wordBoundaryRegex = new RegExp(`\\b${term}`, 'i');
    if (wordBoundaryRegex.test(product.name)) {
      score += 100;
    } else if (productName.includes(term)) {
      score += 50;
    }
  });
  
  // Shorter names get slight preference (more specific)
  score += Math.max(0, 100 - product.name.length);
  
  return score;
};

/**
 * Comprehensive product search and filtering function
 * @param {Array} products - Array of product objects
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} - Filtered and sorted products
 */
export const filterProducts = (products, query, options = {}) => {
  const {
    maxResults = 10,
    minQueryLength = 2,
    includeOutOfStock = true,
    sortBy = 'relevance' // 'relevance', 'name', 'price'
  } = options;
  
  // Validate inputs
  if (!Array.isArray(products)) {
    return [];
  }
  
  const sanitizedQuery = sanitizeSearchQuery(query);
  
  // Handle empty or short queries
  if (!sanitizedQuery || sanitizedQuery.length < minQueryLength) {
    const filtered = includeOutOfStock 
      ? products 
      : products.filter(p => p.qty > 0);
    
    return filtered
      .slice(0, maxResults)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  const searchTerms = parseSearchTerms(sanitizedQuery);
  if (searchTerms.length === 0) {
    return [];
  }
  
  // Filter products that match search criteria
  let filteredProducts = products.filter(product => {
    // Skip invalid products
    if (!product || !product.name || typeof product.name !== 'string') {
      return false;
    }
    
    // Check stock filter
    if (!includeOutOfStock && (!product.qty || product.qty <= 0)) {
      return false;
    }
    
    // Check if product matches search
    return productMatchesSearch(product, searchTerms);
  });
  
  // Sort results based on relevance or other criteria
  if (sortBy === 'relevance') {
    filteredProducts.sort((a, b) => {
      const scoreA = calculateRelevanceScore(a, sanitizedQuery, searchTerms);
      const scoreB = calculateRelevanceScore(b, sanitizedQuery, searchTerms);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // Fallback to alphabetical
      return a.name.localeCompare(b.name);
    });
  } else if (sortBy === 'name') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'price') {
    filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  }
  
  // Limit results for performance
  return filteredProducts.slice(0, maxResults);
};

/**
 * Multi-word search with AND logic
 * All words must be present in the product name
 * @param {Array} products - Array of product objects
 * @param {string} query - Multi-word search query
 * @param {Object} options - Search options
 * @returns {Array} - Filtered products
 */
export const multiWordSearch = (products, query, options = {}) => {
  return filterProducts(products, query, {
    ...options,
    // Multi-word search always requires all terms to match
    matchAllTerms: true
  });
};

/**
 * Fuzzy search with tolerance for typos (basic implementation)
 * @param {Array} products - Array of product objects
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} - Filtered products with fuzzy matching
 */
export const fuzzySearch = (products, query, options = {}) => {
  const { tolerance = 1, ...otherOptions } = options;
  
  // For now, implement basic fuzzy search by allowing partial matches
  // This can be enhanced with more sophisticated algorithms like Levenshtein distance
  const sanitizedQuery = sanitizeSearchQuery(query);
  if (!sanitizedQuery) return [];
  
  const results = filterProducts(products, sanitizedQuery, otherOptions);
  
  // If no exact matches and tolerance > 0, try partial matching
  if (results.length === 0 && tolerance > 0 && sanitizedQuery.length > 2) {
    const partialQuery = sanitizedQuery.slice(0, -1); // Remove last character
    return filterProducts(products, partialQuery, otherOptions);
  }
  
  return results;
};

/**
 * Search with category/tag support (for future enhancement)
 * @param {Array} products - Array of product objects
 * @param {string} query - Search query
 * @param {string} category - Optional category filter
 * @param {Object} options - Search options
 * @returns {Array} - Filtered products
 */
export const categorizedSearch = (products, query, category = null, options = {}) => {
  let filteredProducts = products;
  
  // Filter by category first if provided
  if (category && typeof category === 'string') {
    filteredProducts = products.filter(product => 
      product.category && 
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  // Then apply text search
  return filterProducts(filteredProducts, query, options);
};

/**
 * Get search suggestions based on partial input
 * @param {Array} products - Array of product objects
 * @param {string} partialQuery - Partial search query
 * @param {number} maxSuggestions - Maximum number of suggestions
 * @returns {Array} - Array of suggested search terms
 */
export const getSearchSuggestions = (products, partialQuery, maxSuggestions = 5) => {
  const sanitized = sanitizeSearchQuery(partialQuery);
  if (!sanitized || sanitized.length < 1) return [];
  
  const suggestions = new Set();
  
  products.forEach(product => {
    if (product && product.name) {
      const words = product.name.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(sanitized.toLowerCase()) && word.length > sanitized.length) {
          suggestions.add(word);
        }
      });
    }
  });
  
  return Array.from(suggestions)
    .sort()
    .slice(0, maxSuggestions);
};