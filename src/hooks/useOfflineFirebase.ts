import { useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineStorage, OfflineData } from './useOfflineStorage';
import { toast } from 'sonner';

// Types para as operações offline
type FirebaseOperation = 'create' | 'update' | 'delete';
type CollectionType = 'service_orders' | 'clients' | 'rtis';

interface OfflineFirebaseOptions {
  showToast?: boolean;
  fallbackToOffline?: boolean;
}

export const useOfflineFirebase = () => {
  const isOnline = useOnlineStatus();
  const { saveOfflineData } = useOfflineStorage();

  const executeWithOfflineSupport = useCallback(async <T>(
    operation: () => Promise<T>,
    fallbackData: {
      type: CollectionType;
      data: any;
      action: FirebaseOperation;
    },
    options: OfflineFirebaseOptions = { showToast: true, fallbackToOffline: true }
  ): Promise<T | null> => {
    try {
      // Se estiver online, tenta executar a operação normalmente
      if (isOnline) {
        const result = await operation();
        return result;
      }
      
      // Se estiver offline e fallbackToOffline for true, salva localmente
      if (!isOnline && options.fallbackToOffline) {
        await saveOfflineData({
          type: fallbackData.type as 'service_order' | 'client' | 'rti',
          data: fallbackData.data,
          action: fallbackData.action
        });
        
        if (options.showToast) {
          toast.info('Operação salva offline. Será sincronizada quando voltar online.', {
            duration: 4000
          });
        }
        
        return null;
      }
      
      throw new Error('Sem conexão com a internet');
    } catch (error) {
      console.error('Erro na operação Firebase:', error);
      
      // Se a operação falhou e estamos offline, tenta salvar offline
      if (!isOnline && options.fallbackToOffline) {
        try {
          await saveOfflineData({
            type: fallbackData.type as 'service_order' | 'client' | 'rti',
            data: fallbackData.data,
            action: fallbackData.action
          });
          
          if (options.showToast) {
            toast.warning('Erro na sincronização. Dados salvos offline.', {
              duration: 4000
            });
          }
          
          return null;
        } catch (offlineError) {
          console.error('Erro ao salvar offline:', offlineError);
          if (options.showToast) {
            toast.error('Erro ao salvar dados offline');
          }
          throw offlineError;
        }
      }
      
      if (options.showToast) {
        toast.error('Erro na operação. Verifique sua conexão.');
      }
      throw error;
    }
  }, [isOnline, saveOfflineData]);

  // Wrapper específico para criação de documentos
  const createWithOfflineSupport = useCallback(async <T>(
    operation: () => Promise<T>,
    collectionType: CollectionType,
    data: any,
    options?: OfflineFirebaseOptions
  ) => {
    return executeWithOfflineSupport(
      operation,
      {
        type: collectionType,
        data,
        action: 'create'
      },
      options
    );
  }, [executeWithOfflineSupport]);

  // Wrapper específico para atualização de documentos
  const updateWithOfflineSupport = useCallback(async <T>(
    operation: () => Promise<T>,
    collectionType: CollectionType,
    data: any,
    options?: OfflineFirebaseOptions
  ) => {
    return executeWithOfflineSupport(
      operation,
      {
        type: collectionType,
        data,
        action: 'update'
      },
      options
    );
  }, [executeWithOfflineSupport]);

  // Wrapper específico para exclusão de documentos
  const deleteWithOfflineSupport = useCallback(async <T>(
    operation: () => Promise<T>,
    collectionType: CollectionType,
    data: any,
    options?: OfflineFirebaseOptions
  ) => {
    return executeWithOfflineSupport(
      operation,
      {
        type: collectionType,
        data,
        action: 'delete'
      },
      options
    );
  }, [executeWithOfflineSupport]);

  return {
    isOnline,
    executeWithOfflineSupport,
    createWithOfflineSupport,
    updateWithOfflineSupport,
    deleteWithOfflineSupport
  };
};

export type { FirebaseOperation, CollectionType, OfflineFirebaseOptions };