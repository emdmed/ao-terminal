import { useRef, useCallback } from 'react';
import * as JsSearch from 'js-search';

export function useFileSearch() {
  const searchRef = useRef(null);

  /**
   * Initialize search index with all files
   * @param {Array} files - Flat array of all file entries
   */
  const initializeSearch = useCallback((files) => {
    if (!files || files.length === 0) {
      searchRef.current = null;
      return;
    }

    // Create new search instance
    const search = new JsSearch.Search('path');

    // Use AllSubstringsIndexStrategy for fuzzy matching
    // This allows matching anywhere in the string
    search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy();

    // Use TfIdfSearchIndex for better relevance ranking
    search.searchIndex = new JsSearch.TfIdfSearchIndex('path');

    // Case-insensitive search
    search.sanitizer = new JsSearch.LowerCaseSanitizer();

    // Index both name and full path
    search.addIndex('name');
    search.addIndex('path');

    // Add all documents
    search.addDocuments(files);

    searchRef.current = search;
    console.log('Search index built for', files.length, 'files');
  }, []);

  /**
   * Search for files matching query
   * @param {string} query - Search query
   * @returns {Array} - Matching file entries
   */
  const search = useCallback((query) => {
    if (!searchRef.current || !query || query.trim() === '') {
      return null;
    }

    const trimmedQuery = query.trim();

    // Perform search
    const results = searchRef.current.search(trimmedQuery);

    console.log('Search query:', trimmedQuery, '- Results:', results.length);

    return results;
  }, []);

  /**
   * Clear search index
   */
  const clearSearch = useCallback(() => {
    searchRef.current = null;
  }, []);

  return {
    initializeSearch,
    search,
    clearSearch
  };
}
