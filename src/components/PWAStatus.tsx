import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const PWAStatus: React.FC = () => {
  const { isInstalled } = usePWA();
  const isOnline = useOnlineStatus();

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