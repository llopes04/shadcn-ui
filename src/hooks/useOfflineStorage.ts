import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

interface OfflineData {
  id?: number;
  type: 'service_order' | 'client' | 'rti';
  data: any;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
}

class OfflineStorageManager {
  private dbName = 'OfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offline_data')) {
          const store = db.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async saveOfflineData(data: Omit<OfflineData, 'id' | 'timestamp'>): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offline_data'], 'readwrite');
      const store = transaction.objectStore('offline_data');
      
      const offlineData: OfflineData = {
        ...data,
        timestamp: Date.now()
      };
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(offlineData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('Dados salvos offline:', offlineData);
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
      throw error;
    }
  }

  async getOfflineData(): Promise<OfflineData[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offline_data'], 'readonly');
      const store = transaction.objectStore('offline_data');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erro ao buscar dados offline:', error);
      return [];
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offline_data'], 'readwrite');
      const store = transaction.objectStore('offline_data');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('Dados offline limpos');
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
      throw error;
    }
  }

  async getOfflineDataCount(): Promise<number> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['offline_data'], 'readonly');
      const store = transaction.objectStore('offline_data');
      
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erro ao contar dados offline:', error);
      return 0;
    }
  }
}

const offlineStorage = new OfflineStorageManager();

export const useOfflineStorage = () => {
  const [offlineDataCount, setOfflineDataCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = useOnlineStatus();

  const updateOfflineDataCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getOfflineDataCount();
      setOfflineDataCount(count);
    } catch (error) {
      console.error('Erro ao atualizar contagem offline:', error);
    }
  }, []);

  const saveOfflineData = useCallback(async (data: Omit<OfflineData, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      await offlineStorage.saveOfflineData(data);
      await updateOfflineDataCount();
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateOfflineDataCount]);

  const getOfflineData = useCallback(async () => {
    try {
      return await offlineStorage.getOfflineData();
    } catch (error) {
      console.error('Erro ao buscar dados offline:', error);
      return [];
    }
  }, []);

  const clearOfflineData = useCallback(async () => {
    setIsLoading(true);
    try {
      await offlineStorage.clearOfflineData();
      await updateOfflineDataCount();
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateOfflineDataCount]);

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
        console.log('Recebido pedido de sincronização do Service Worker:', event.data.data);
        // Aqui você pode implementar a lógica de sincronização com Firebase
        // Por exemplo, chamar uma função que sincroniza os dados
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Update count on mount and when online status changes
  useEffect(() => {
    updateOfflineDataCount();
  }, [updateOfflineDataCount, isOnline]);

  return {
    offlineDataCount,
    isLoading,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    updateOfflineDataCount
  };
};

export type { OfflineData };
export { offlineStorage };