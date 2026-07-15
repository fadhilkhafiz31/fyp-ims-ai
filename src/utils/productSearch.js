export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Remove excessive whitespace and limit length
  return query.trim().slice(0, 100);
};

export const parseSearchTerms = (query) => {
  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return [];
  
  return sanitized
    .toLowerCase()
    .split(/\s+/) // Split on any whitespace
    .filter(term => term.length > 0)
    .slice(0, 10); // Limit to 10 terms for performance
};

export const productMatchesSearch = (product, searchTerms) => {
  if (!product || !product.name || !Array.isArray(searchTerms)) {
    return false;
  }
  
  const productName = product.name.toLowerCase();
  
  // All search terms must be found in the product name
  return searchTerms.every(term => productName.includes(term));
};

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

export const multiWordSearch = (products, query, options = {}) => {
  return filterProducts(products, query, {
    ...options,
    // Multi-word search always requires all terms to match
    matchAllTerms: true
  });
};

// Basic fuzzy search: falls back to dropping the last character if there's no exact match.
// Could be upgraded to Levenshtein distance if typo tolerance needs to be smarter.
export const fuzzySearch = (products, query, options = {}) => {
  const { tolerance = 1, ...otherOptions } = options;
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