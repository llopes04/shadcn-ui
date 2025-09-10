import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ServiceOrder, Client } from '@/types';
import { serviceOrderService, clientService } from '@/services/firebaseService';
import { isFirebaseConfigured } from '@/lib/firebase';

export default function SyncDebug() {
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  const [clients] = useLocalStorage<Client[]>('clients', []);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const analyzeData = async () => {
    setIsLoading(true);
    let info = '=== ANÁLISE DE DADOS DE SINCRONIZAÇÃO ===\n\n';

    // Analisar dados locais
    info += `📱 DADOS LOCAIS:\n`;
    info += `- Ordens de Serviço: ${serviceOrders.length}\n`;
    info += `- Clientes: ${clients.length}\n\n`;

    // Analisar estrutura das ordens locais
    if (serviceOrders.length > 0) {
      info += `🔍 ESTRUTURA DAS ORDENS LOCAIS:\n`;
      serviceOrders.forEach((order, index) => {
        info += `Ordem ${index + 1} (ID: ${order.id}):\n`;
        info += `  - Técnico: ${order.tecnico || 'AUSENTE'}\n`;
        info += `  - Data: ${order.data || 'AUSENTE'}\n`;
        info += `  - Cliente ID: ${order.cliente_id || 'AUSENTE'}\n`;
        info += `  - Geradores: ${order.geradores ? order.geradores.length : 'AUSENTE/NULL'}\n`;
        info += `  - Assinatura: ${order.assinatura ? 'PRESENTE' : 'AUSENTE'}\n`;
        info += `  - Observações: ${order.observacoes_gerais ? 'PRESENTE' : 'AUSENTE'}\n`;
        
        // Verificar se é ordem legacy
        const legacyOrder = order as ServiceOrder & { gerador_id?: string };
        if (legacyOrder.gerador_id) {
          info += `  - ⚠️ ORDEM LEGACY - gerador_id: ${legacyOrder.gerador_id}\n`;
        }
        info += `\n`;
      });
    }

    // Verificar Firebase se configurado
    if (isFirebaseConfigured()) {
      try {
        info += `☁️ DADOS DO FIREBASE:\n`;
        const firebaseOrders = await serviceOrderService.getAll();
        const firebaseClients = await clientService.getAll();
        
        info += `- Ordens de Serviço: ${firebaseOrders.length}\n`;
        info += `- Clientes: ${firebaseClients.length}\n\n`;

        // Analisar estrutura das ordens do Firebase
        if (firebaseOrders.length > 0) {
          info += `🔍 ESTRUTURA DAS ORDENS DO FIREBASE:\n`;
          firebaseOrders.forEach((order, index) => {
            info += `Ordem ${index + 1} (ID: ${order.id}):\n`;
            info += `  - Técnico: ${order.tecnico || 'AUSENTE'}\n`;
            info += `  - Data: ${order.data || 'AUSENTE'}\n`;
            info += `  - Cliente ID: ${order.cliente_id || 'AUSENTE'}\n`;
            info += `  - Geradores: ${order.geradores ? order.geradores.length : 'AUSENTE/NULL'}\n`;
            info += `  - Assinatura: ${order.assinatura ? 'PRESENTE' : 'AUSENTE'}\n`;
            info += `  - Observações: ${order.observacoes_gerais ? 'PRESENTE' : 'AUSENTE'}\n`;
            
            // Verificar campos Firestore específicos
            const firestoreOrder = order as ServiceOrder & { createdAt?: string };
            if (firestoreOrder.createdAt) {
              info += `  - CreatedAt: ${firestoreOrder.createdAt}\n`;
            }
            if (firestoreOrder.updatedAt) {
              info += `  - UpdatedAt: ${firestoreOrder.updatedAt}\n`;
            }
            info += `\n`;
          });
        }

        // Comparar dados
        info += `🔄 COMPARAÇÃO:\n`;
        const localOrderIds = serviceOrders.map(o => o.id.replace('firebase_', ''));
        const firebaseOrderIds = firebaseOrders.map(o => o.id);
        
        const onlyLocal = localOrderIds.filter(id => !firebaseOrderIds.includes(id));
        const onlyFirebase = firebaseOrderIds.filter(id => !localOrderIds.includes(id));
        
        info += `- Apenas local: ${onlyLocal.length} ordens\n`;
        info += `- Apenas Firebase: ${onlyFirebase.length} ordens\n`;
        
        if (onlyLocal.length > 0) {
          info += `  IDs apenas locais: ${onlyLocal.join(', ')}\n`;
        }
        if (onlyFirebase.length > 0) {
          info += `  IDs apenas Firebase: ${onlyFirebase.join(', ')}\n`;
        }

      } catch (error) {
        info += `❌ ERRO AO ACESSAR FIREBASE: ${error}\n`;
      }
    } else {
      info += `⚠️ FIREBASE NÃO CONFIGURADO\n`;
    }

    // Verificar clientes referenciados
    info += `\n👥 VERIFICAÇÃO DE CLIENTES:\n`;
    const referencedClientIds = [...new Set(serviceOrders.map(o => o.cliente_id))];
    const availableClientIds = clients.map(c => c.id);
    
    referencedClientIds.forEach(clientId => {
      const clientExists = availableClientIds.includes(clientId) || availableClientIds.includes(clientId.replace('firebase_', ''));
      info += `- Cliente ${clientId}: ${clientExists ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}\n`;
    });

    setDebugInfo(info);
    setIsLoading(false);
  };

  const clearDebug = () => {
    setDebugInfo('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🔧 Debug de Sincronização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={analyzeData} disabled={isLoading}>
            {isLoading ? 'Analisando...' : 'Analisar Dados'}
          </Button>
          <Button variant="outline" onClick={clearDebug}>
            Limpar
          </Button>
        </div>
        
        {debugInfo && (
          <div className="bg-gray-100 p-4 rounded-md">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {debugInfo}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}