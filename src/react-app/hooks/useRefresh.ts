import { useState, useCallback } from 'react';

export function useRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const forceRefresh = useCallback(() => {
    // Clear all possible caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force a hard refresh after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);

  return { refreshKey, refresh, forceRefresh };
}
