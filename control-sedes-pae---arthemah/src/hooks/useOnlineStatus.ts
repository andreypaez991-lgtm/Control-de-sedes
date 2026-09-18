import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [pendingCount, setPendingCount] = useState<number>(() => {
    return storage.getPendingReportsCount();
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(storage.getPendingReportsCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return { syncedCount: 0, errors: 0 };
    setIsSyncing(true);
    try {
      const res = await storage.syncAllPending();
      refreshPendingCount();
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when recovering connection
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleDataUpdated = () => {
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('arthemah:data-updated', handleDataUpdated);

    // Initial check
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('arthemah:data-updated', handleDataUpdated);
    };
  }, [refreshPendingCount, syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    refreshPendingCount,
  };
}
