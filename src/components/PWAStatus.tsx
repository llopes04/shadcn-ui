import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Smartphone, Monitor, Database } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

export const PWAStatus: React.FC = () => {
  const { isInstalled } = usePWA();
  const isOnline = useOnlineStatus();
  const { offlineDataCount } = useOfflineStorage();

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>

      {/* Offline Data Status */}
      {offlineDataCount > 0 && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-orange-600 border-orange-600"
        >
          <Database className="h-3 w-3" />
          {offlineDataCount} pendente{offlineDataCount > 1 ? 's' : ''}
        </Badge>
      )}

      {/* Installation Status */}
      <Badge
        variant={isInstalled ? "default" : "secondary"}
        className="flex items-center gap-1"
      >
        {isInstalled ? (
          <>
            <Smartphone className="h-3 w-3" />
            Instalado
          </>
        ) : (
          <>
            <Monitor className="h-3 w-3" />
            Navegador
          </>
        )}
      </Badge>
    </div>
  );
};