import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Trash2, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useOfflineStorage, OfflineData } from '@/hooks/useOfflineStorage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const OfflineSync: React.FC = () => {
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { getOfflineData, clearOfflineData, offlineDataCount } = useOfflineStorage();
  const isOnline = useOnlineStatus();

  const loadOfflineData = async () => {
    setIsLoading(true);
    try {
      const data = await getOfflineData();
      setOfflineData(data);
    } catch (error) {
      console.error('Erro ao carregar dados offline:', error);
      toast.error('Erro ao carregar dados offline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Sem conexão com a internet');
      return;
    }

    setIsSyncing(true);
    try {
      // Trigger background sync via service worker
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');
        toast.success('Sincronização iniciada');
      } else {
        // Fallback: manual sync
        toast.info('Sincronização manual não implementada ainda');
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao iniciar sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineData = async () => {
    try {
      await clearOfflineData();
      setOfflineData([]);
      toast.success('Dados offline limpos');
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
      toast.error('Erro ao limpar dados offline');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create':
        return 'Criar';
      case 'update':
        return 'Atualizar';
      case 'delete':
        return 'Excluir';
      default:
        return 'Desconhecido';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'service_order':
        return 'Ordem de Serviço';
      case 'client':
        return 'Cliente';
      case 'rti':
        return 'RTI';
      default:
        return type;
    }
  };

  useEffect(() => {
    loadOfflineData();
  }, [offlineDataCount]);

  if (offlineDataCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dados Offline
          </CardTitle>
          <CardDescription>
            Nenhum dado pendente de sincronização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Todos os dados estão sincronizados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Dados Offline
          <Badge variant="outline">{offlineDataCount}</Badge>
        </CardTitle>
        <CardDescription>
          Dados pendentes de sincronização com o servidor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClearOfflineData}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
          <Button
            variant="ghost"
            onClick={loadOfflineData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {!isOnline && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Sem conexão</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Os dados serão sincronizados automaticamente quando a conexão for restaurada.
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            </div>
          ) : (
            offlineData.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getActionIcon(item.action)}
                    <span className="font-medium">{getActionText(item.action)}</span>
                    <Badge variant="secondary">{getTypeText(item.type)}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
                
                {item.data && (
                  <div className="text-sm text-muted-foreground">
                    {item.data.clientName && (
                      <p><strong>Cliente:</strong> {item.data.clientName}</p>
                    )}
                    {item.data.name && (
                      <p><strong>Nome:</strong> {item.data.name}</p>
                    )}
                    {item.data.description && (
                      <p><strong>Descrição:</strong> {item.data.description.substring(0, 100)}...</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};