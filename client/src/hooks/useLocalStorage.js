import useBrowserStorage from './useBrowserStorage';

/**
 * Convenience wrapper: state persisted in localStorage (survives closing the browser).
 * Only use for non-sensitive data - never IC/passport numbers or signatures.
 */
export default function useLocalStorage(key, initialValue, options = {}) {
  return useBrowserStorage(key, initialValue, { ...options, type: 'local' });
}
