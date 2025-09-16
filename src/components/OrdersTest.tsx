import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ServiceOrder, Client } from '@/types';

export default function OrdersTest() {
  const [serviceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  const [clients] = useLocalStorage<Client[]>('clients', []);

  const getClient = (clientId: string) => {
    // Tentar encontrar por ID exato primeiro
    let client = clients.find(c => c.id === clientId);
    
    // Se não encontrar e o ID não tem prefixo firebase_, tentar com prefixo
    if (!client && !clientId.startsWith('firebase_')) {
      client = clients.find(c => c.id === `firebase_${clientId}`);
    }
    
    // Se não encontrar e o ID tem prefixo firebase_, tentar sem prefixo
    if (!client && clientId.startsWith('firebase_')) {
      const cleanId = clientId.replace('firebase_', '');
      client = clients.find(c => c.id === cleanId);
    }
    
    return client;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🧪 Teste de Ordens de Serviço</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <strong>Total de Ordens:</strong> {serviceOrders.length}
          </div>
          
          {serviceOrders.length === 0 ? (
            <div className="text-gray-500 italic">
              Nenhuma ordem de serviço encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {serviceOrders.map((order, index) => {
                const client = getClient(order.cliente_id);
                const isFromFirebase = order.id.startsWith('firebase_');
                
                return (
                  <div 
                    key={order.id} 
                    className={`p-3 border rounded-md ${
                      isFromFirebase ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">
                        OS #{index + 1} {isFromFirebase && '(Firebase)'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        ID: {order.id}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>Técnico:</strong> {order.tecnico || '❌ AUSENTE'}
                      </div>
                      <div>
                        <strong>Data:</strong> {order.data || '❌ AUSENTE'}
                      </div>
                      <div>
                        <strong>Cliente ID:</strong> {order.cliente_id || '❌ AUSENTE'}
                      </div>
                      <div>
                        <strong>Cliente Nome:</strong> {client ? client.nome : '❌ NÃO ENCONTRADO'}
                      </div>
                      <div>
                        <strong>Geradores:</strong> {
                          order.geradores ? 
                            `${order.geradores.length} gerador(es)` : 
                            '❌ AUSENTE'
                        }
                      </div>
                      <div>
                        <strong>Assinatura:</strong> {
                          order.assinatura ? '✅ PRESENTE' : '❌ AUSENTE'
                        }
                      </div>
                    </div>
                    
                    {order.geradores && order.geradores.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-xs">Detalhes dos Geradores:</strong>
                        <div className="mt-1 space-y-1">
                          {order.geradores.map((gen, genIndex) => (
                            <div key={genIndex} className="text-xs bg-white p-2 rounded border">
                              <div>Gerador ID: {gen.gerador_id || '❌ AUSENTE'}</div>
                              <div>Tipo: {gen.tipo_manutencao || '❌ AUSENTE'}</div>
                              <div>Verificações: {gen.verificacoes ? gen.verificacoes.length : 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {order.observacoes_gerais && (
                      <div className="mt-2">
                        <strong className="text-xs">Observações:</strong>
                        <p className="text-xs mt-1">{order.observacoes_gerais}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}