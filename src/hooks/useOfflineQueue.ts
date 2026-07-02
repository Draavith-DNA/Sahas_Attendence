// ============================================
// Sahas Attendance — Offline Queue Hook
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OFFLINE_QUEUE_KEY } from '@/lib/constants';

export interface QueuedRecord {
  memberId: string;
  sessionType: string;
  date: string;
  queuedAt: string;
}

/**
 * Hook to manage offline scan queue with localStorage persistence
 * and auto-sync on network reconnect.
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch {
      console.error('Failed to load offline queue');
    }
  }, []);

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      console.error('Failed to save offline queue');
    }
  }, [queue]);

  /** Add a record to the offline queue */
  const enqueue = useCallback((record: Omit<QueuedRecord, 'queuedAt'>) => {
    const newRecord: QueuedRecord = {
      ...record,
      queuedAt: new Date().toISOString(),
    };
    setQueue((prev) => [...prev, newRecord]);
  }, []);

  /** Flush the queue by sending all records to the sync API */
  const flush = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (syncingRef.current) return { synced: 0, failed: 0 };

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const currentQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]') as QueuedRecord[];
      if (currentQueue.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: currentQueue }),
      });

      if (response.ok) {
        const data = await response.json();
        // Clear the synced records
        setQueue([]);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        return { synced: data.synced ?? currentQueue.length, failed: data.errors ?? 0 };
      } else {
        return { synced: 0, failed: currentQueue.length };
      }
    } catch {
      return { synced: 0, failed: 0 };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (queue.length > 0) {
        flush();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queue.length, flush]);

  return {
    queue,
    queueSize: queue.length,
    isSyncing,
    enqueue,
    flush,
  };
}
