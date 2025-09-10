import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ServiceOrder, Client, RTI, Generator } from '@/types';
import { generateServiceOrderPDF, downloadPDF } from '@/utils/pdfGenerator';
import { sendServiceOrderEmailJS, defaultEmailJSConfig, EmailJSConfig } from '@/utils/emailJSService';
import RTIForm from '@/components/RTIForm';
import { serviceOrderService } from '@/services/firebaseService';

interface LegacyServiceOrder extends Omit<ServiceOrder, 'geradores'> {
  gerador_id?: string;
  tempo_funcionamento?: string;
  observacoes?: string;
}

export default function OrdersList() {
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  const [clients] = useLocalStorage<Client[]>('clients', []);
  const [rtis, setRTIs] = useLocalStorage<RTI[]>('rtis', []);
  const [currentUser] = useLocalStorage('currentUser', null);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [showRTIForm, setShowRTIForm] = useState(false);
  const [selectedRTI, setSelectedRTI] = useState<RTI | null>(null);
  const [showRTIDetails, setShowRTIDetails] = useState(false);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.nome : 'Cliente não encontrado';
  };

  const getClient = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const getClientGenerators = (clientId: string): Generator[] => {
    const client = getClient(clientId);
    return client?.geradores || [];
  };

  const isLegacyOrder = (order: ServiceOrder): boolean => {
    return !order.geradores || !Array.isArray(order.geradores);
  };

  const getOrderGenerators = (order: ServiceOrder): Generator[] => {
    const clientGenerators = getClientGenerators(order.cliente_id);
    
    if (isLegacyOrder(order)) {
      const legacyOrder = order as LegacyServiceOrder;
      if (legacyOrder.gerador_id) {
        const generator = clientGenerators.find(g => g.id === legacyOrder.gerador_id);
        return generator ? [generator] : [];
      }
      return [];
    }
    
    return order.geradores.map(genData => 
      clientGenerators.find(g => g.id === genData.gerador_id)
    ).filter(Boolean) as Generator[];
  };

  const getGeneratorsDescription = (order: ServiceOrder): string => {
    const generators = getOrderGenerators(order);
    if (generators.length === 0) return 'Nenhum gerador';
    if (generators.length === 1) return `${generators[0].gerador} - ${generators[0].modelo_gerador}`;
    return `${generators.length} geradores`;
  };

  const getRTIForOrder = (orderId: string) => {
    return rtis.find(rti => rti.service_order_id === orderId) || null;
  };

  const handleViewDetails = (order: ServiceOrder) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  const handleDownloadPDF = async (order: ServiceOrder) => {
    const client = getClient(order.cliente_id);
    if (!client) {
      alert('Cliente não encontrado para gerar PDF');
      return;
    }

    try {
      const generators = getClientGenerators(order.cliente_id);
      const pdf = await generateServiceOrderPDF(order, client, generators);
      downloadPDF(pdf, `ordem_servico_${order.id.slice(-6)}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  const handleSendEmail = async (order: ServiceOrder) => {
    const client = getClient(order.cliente_id);
    if (!client || !client.email) {
      alert('Cliente não possui email cadastrado');
      return;
    }

    const emailConfig = localStorage.getItem('emailjs_config');
    if (!emailConfig) {
      alert('EmailJS não configurado. Vá em Configurações > Configurar Email');
      return;
    }

    let config: EmailJSConfig;
    try {
      config = JSON.parse(emailConfig);
    } catch (error) {
      alert('Configuração de email inválida. Reconfigure o EmailJS');
      return;
    }

    if (!config.serviceId || !config.templateId || !config.publicKey) {
      alert('Configuração de email incompleta. Verifique as configurações do EmailJS');
      return;
    }

    setIsSendingEmail(order.id);
    try {
      console.log('Enviando email para:', client.email);
      console.log('Configuração EmailJS:', config);
      
      const success = await sendServiceOrderEmailJS(
        order, 
        client, 
        client.email,
        config
      );
      
      if (success) {
        alert(`Email enviado com sucesso para ${client.email}!`);
      } else {
        alert('Erro ao enviar email. Verifique a configuração.');
      }
    } catch (error) {
      console.error('Erro detalhado ao enviar email:', error);
      
      let errorMessage = 'Erro ao enviar email. ';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid')) {
          errorMessage += 'Configuração inválida do EmailJS.';
        } else if (error.message.includes('network')) {
          errorMessage += 'Problema de conexão.';
        } else {
          errorMessage += `Detalhes: ${error.message}`;
        }
      } else {
        errorMessage += 'Verifique sua configuração do EmailJS.';
      }
      
      alert(errorMessage);
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      try {
        console.log('Iniciando exclusão da OS:', id);
        
        if (id.startsWith('firebase_')) {
          const remoteId = id.replace(/^firebase_/, '');
          console.log('Excluindo OS do Firebase com ID:', remoteId);
          await serviceOrderService.delete(remoteId);
          console.log('OS excluída do Firebase com sucesso');
        }
        
        const updatedOrders = serviceOrders.filter(order => order.id !== id);
        setServiceOrders(updatedOrders);
        console.log('OS removida do localStorage');
        alert('Ordem de serviço excluída com sucesso!');
      } catch (e: any) {
        console.error('Erro detalhado ao excluir OS:', e);
        const errorMessage = e?.message || 'Erro desconhecido';
        alert(`Falha ao excluir no Firebase: ${errorMessage}`);
      }
    }
  };

  const handleCreateRTI = (order: ServiceOrder) => {
    setSelectedOrder(order);
    const existingRTI = getRTIForOrder(order.id);
    setSelectedRTI(existingRTI);
    setShowRTIForm(true);
    setShowRTIDetails(false);
  };

  const handleViewRTI = (order: ServiceOrder) => {
    setSelectedOrder(order);
    const existingRTI = getRTIForOrder(order.id);
    if (existingRTI) {
      setSelectedRTI(existingRTI);
      setShowRTIDetails(true);
      setShowRTIForm(false);
    } else {
      alert('Não há RTI associado a esta ordem de serviço.');
    }
  };

  const handleSaveRTI = (rti: RTI) => {
    const existingIndex = rtis.findIndex(r => r.id === rti.id);
    const updatedRTIs = [...rtis];

    if (existingIndex >= 0) {
      updatedRTIs[existingIndex] = rti;
    } else {
      updatedRTIs.push(rti);
    }

    setRTIs(updatedRTIs);

    if (selectedOrder) {
      const updatedOrders = serviceOrders.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, rti_id: rti.id } 
          : order
      );
      setServiceOrders(updatedOrders);
    }

    setShowRTIForm(false);
    alert('Relatório Técnico Interno salvo com sucesso!');
  };

  const handleCancelRTI = () => {
    setShowRTIForm(false);
    setShowRTIDetails(false);
  };

  const handleEditRTI = () => {
    setShowRTIDetails(false);
    setShowRTIForm(true);
  };

  const handleDeleteRTI = (rtiId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este Relatório Técnico Interno?')) {
      const updatedRTIs = rtis.filter(rti => rti.id !== rtiId);
      setRTIs(updatedRTIs);

      const updatedOrders = serviceOrders.map(order => 
        order.rti_id === rtiId 
          ? { ...order, rti_id: undefined } 
          : order
      );
      setServiceOrders(updatedOrders);

      setShowRTIDetails(false);
      alert('Relatório Técnico Interno excluído com sucesso!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/config/email')}>
              Configurar Email
            </Button>
            <Button variant="outline" onClick={() => navigate('/config/firebase')}>
              Configurar Firebase
            </Button>
            <Button onClick={() => navigate('/service-orders')}>
              Nova OS
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ordens</CardTitle>
            <CardDescription>
              {serviceOrders.length} ordem(ns) de serviço
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serviceOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma ordem de serviço cadastrada</p>
                <Button 
                  onClick={() => navigate('/service-orders')}
                  className="mt-4"
                >
                  Criar Primeira OS
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceOrders.map((order) => {
                  const hasRTI = getRTIForOrder(order.id) !== null;
                  const generatorsDescription = getGeneratorsDescription(order);
                  const isCurrentlySending = isSendingEmail === order.id;
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">OS #{order.id.slice(-4)}</h3>
                          <p className="text-gray-600">Cliente: {getClientName(order.cliente_id)}</p>
                          <p className="text-gray-600">Geradores: {generatorsDescription}</p>
                          <p className="text-gray-600">Data: {order.data}</p>
                          <p className="text-gray-600">Técnico: {order.tecnico}</p>
                          {hasRTI && (
                            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              RTI disponível
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.assinatura 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.assinatura ? 'Concluída' : 'Pendente'}
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(order)}
                            >
                              PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(order)}
                              disabled={isCurrentlySending || isSendingEmail !== null}
                            >
                              {isCurrentlySending ? 'Enviando...' : 'Email'}
                            </Button>
                            {currentUser && (
                              hasRTI ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewRTI(order)}
                                  className="bg-blue-100 border-blue-300"
                                >
                                  Ver RTI
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCreateRTI(order)}
                                >
                                  Criar RTI
                                </Button>
                              )
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        {selectedOrder && !showRTIForm && !showRTIDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Detalhes da OS #{selectedOrder.id.slice(-4)}</CardTitle>
                <CardDescription>Informações completas da ordem de serviço</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Cliente:</strong> {getClientName(selectedOrder.cliente_id)}
                  </div>
                  <div>
                    <strong>Data:</strong> {selectedOrder.data}
                  </div>
                  <div>
                    <strong>Técnico:</strong> {selectedOrder.tecnico}
                  </div>
                </div>

                {/* Informações dos Geradores */}
                {(() => {
                  const orderGenerators = getOrderGenerators(selectedOrder);
                  
                  if (isLegacyOrder(selectedOrder)) {
                    const legacyOrder = selectedOrder as LegacyServiceOrder;
                    return orderGenerators.length > 0 ? (
                      <div>
                        <strong>Gerador:</strong>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><strong>Gerador:</strong> {orderGenerators[0].gerador}</div>
                            <div><strong>Modelo:</strong> {orderGenerators[0].modelo_gerador}</div>
                            <div><strong>Série:</strong> {orderGenerators[0].serie_gerador}</div>
                            <div><strong>Motor:</strong> {orderGenerators[0].motor}</div>
                            <div><strong>Modelo Motor:</strong> {orderGenerators[0].modelo_motor}</div>
                            <div><strong>Série Motor:</strong> {orderGenerators[0].serie_motor}</div>
                            {orderGenerators[0].usca && <div><strong>USCA:</strong> {orderGenerators[0].usca}</div>}
                            {legacyOrder.tempo_funcionamento && (
                              <div><strong>Tempo Funcionamento:</strong> {legacyOrder.tempo_funcionamento}h</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  }
                  
                  return selectedOrder.geradores && selectedOrder.geradores.length > 0 ? (
                    <div>
                      <strong>Geradores ({selectedOrder.geradores.length}):</strong>
                      <div className="mt-2 space-y-3">
                        {selectedOrder.geradores.map((generatorData, index) => {
                          const generator = getClientGenerators(selectedOrder.cliente_id)
                            .find(g => g.id === generatorData.gerador_id);
                          
                          if (!generator) return null;
                          
                          return (
                            <div key={index} className="p-3 bg-gray-50 rounded-md border">
                              <h4 className="font-medium mb-2">
                                Gerador {index + 1} - {generatorData.tipo_manutencao}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><strong>Gerador:</strong> {generator.gerador}</div>
                                <div><strong>Modelo:</strong> {generator.modelo_gerador}</div>
                                <div><strong>Série:</strong> {generator.serie_gerador}</div>
                                <div><strong>Motor:</strong> {generator.motor}</div>
                                <div><strong>Modelo Motor:</strong> {generator.modelo_motor}</div>
                                <div><strong>Série Motor:</strong> {generator.serie_motor}</div>
                                {generator.usca && <div><strong>USCA:</strong> {generator.usca}</div>}
                                {generatorData.tempo_funcionamento && (
                                  <div><strong>Tempo Funcionamento:</strong> {generatorData.tempo_funcionamento}h</div>
                                )}
                              </div>
                              
                              {generatorData.verificacoes && generatorData.verificacoes.length > 0 && (
                                <div className="mt-3">
                                  <strong className="text-sm">Verificações:</strong>
                                  <div className="mt-1 space-y-1">
                                    {generatorData.verificacoes.map((verification, vIndex) => (
                                      <div key={vIndex} className="flex justify-between text-xs">
                                        <span>{verification.item}</span>
                                        <span className={`px-1 py-0.5 rounded ${
                                          verification.status === 'OK' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {verification.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {generatorData.observacoes && (
                                <div className="mt-2">
                                  <strong className="text-sm">Observações:</strong>
                                  <p className="text-sm mt-1">{generatorData.observacoes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {(selectedOrder.observacoes_gerais || (selectedOrder as LegacyServiceOrder).observacoes) && (
                  <div>
                    <strong>Observações {isLegacyOrder(selectedOrder) ? '' : 'Gerais'}:</strong>
                    <p className="mt-1">{selectedOrder.observacoes_gerais || (selectedOrder as LegacyServiceOrder).observacoes}</p>
                  </div>
                )}

                {selectedOrder.assinatura && (
                  <div>
                    <strong>Assinatura:</strong>
                    <div className="mt-2">
                      <img 
                        src={selectedOrder.assinatura} 
                        alt="Assinatura" 
                        className="w-48 h-16 border rounded"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardContent className="flex gap-3">
                <Button 
                  onClick={() => handleDownloadPDF(selectedOrder)}
                  className="flex-1"
                >
                  Baixar PDF
                </Button>
                <Button 
                  onClick={() => handleSendEmail(selectedOrder)}
                  disabled={isSendingEmail === selectedOrder.id}
                  className="flex-1"
                >
                  {isSendingEmail === selectedOrder.id ? 'Enviando...' : 'Enviar Email'}
                </Button>
                {currentUser && (
                  <Button 
                    onClick={() => handleCreateRTI(selectedOrder)} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {getRTIForOrder(selectedOrder.id) ? 'Editar RTI' : 'Criar RTI'}
                  </Button>
                )}
                <Button 
                  onClick={handleCloseDetails} 
                  variant="outline"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de RTI Form */}
        {selectedOrder && showRTIForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <RTIForm 
                serviceOrder={selectedOrder}
                currentUser={currentUser}
                existingRTI={selectedRTI}
                onSave={handleSaveRTI}
                onCancel={handleCancelRTI}
              />
            </div>
          </div>
        )}

        {/* Modal de RTI Details */}
        {selectedOrder && showRTIDetails && selectedRTI && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80h] overflow-y-auto">
              <CardHeader>
                <CardTitle>RTI - OS #{selectedOrder.id.slice(-4)}</CardTitle>
                <CardDescription>Relatório Técnico Interno - Apenas para uso técnico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Técnico:</strong> {selectedRTI.tecnico}
                  </div>
                  <div>
                    <strong>Data:</strong> {selectedRTI.data_criacao}
                  </div>
                  <div>
                    <strong>Tempo Gasto:</strong> {selectedRTI.tempo_gasto} horas
                  </div>
                </div>

                <div>
                  <strong>Problemas Identificados:</strong>
                  <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRTI.problemas_identificados}</p>
                </div>

                <div>
                  <strong>Solução Aplicada:</strong>
                  <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRTI.solucao_aplicada}</p>
                </div>

                {selectedRTI.pecas_utilizadas && (
                  <div>
                    <strong>Peças Utilizadas:</strong>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRTI.pecas_utilizadas}</p>
                  </div>
                )}

                {selectedRTI.detalhes_tecnicos && (
                  <div>
                    <strong>Detalhes Técnicos:</strong>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRTI.detalhes_tecnicos}</p>
                  </div>
                )}

                {selectedRTI.recomendacoes && (
                  <div>
                    <strong>Recomendações:</strong>
                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRTI.recomendacoes}</p>
                  </div>
                )}
              </CardContent>
              <CardContent className="flex gap-3">
                <Button 
                  onClick={handleEditRTI} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Editar RTI
                </Button>
                <Button 
                  onClick={() => handleDeleteRTI(selectedRTI.id)} 
                  variant="destructive"
                  className="flex-1"
                >
                  Excluir RTI
                </Button>
                <Button 
                  onClick={handleCancelRTI} 
                  variant="outline"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}