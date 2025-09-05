import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import SignaturePad from '@/components/SignaturePad';
import MultiOSForm from '@/components/MultiOSForm';
import { ServiceOrder, Client } from '@/types';

type Step = 'client-selection' | 'form' | 'signature';

export default function ServiceOrders() {
  const navigate = useNavigate();
  const [currentUser] = useLocalStorage('currentUser', null);
  const [clients] = useLocalStorage<Client[]>('clients', []);
  const [serviceOrders, setServiceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  
  const [step, setStep] = useState<Step>('client-selection');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingOrder, setPendingOrder] = useState<ServiceOrder | null>(null);
  const [signature, setSignature] = useState('');

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setStep('form');
    }
  };

  const handleFormSubmit = (order: ServiceOrder) => {
    setPendingOrder(order);
    setStep('signature');
  };

  const handleSignatureSave = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleSignatureClear = () => {
    setSignature('');
  };

  const handleFinalSubmit = () => {
    if (!signature) {
      alert('Por favor, forneça uma assinatura antes de salvar.');
      return;
    }

    if (!pendingOrder) {
      alert('Erro: Nenhuma ordem de serviço encontrada.');
      return;
    }

    const orderWithSignature: ServiceOrder = {
      ...pendingOrder,
      assinatura: signature,
      data: new Date().toLocaleDateString('pt-BR')
    };

    setServiceOrders([...serviceOrders, orderWithSignature]);
    
    alert('Ordem de serviço salva com sucesso!');
    navigate('/orders');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const handleBackToClientSelection = () => {
    setStep('client-selection');
    setSelectedClient(null);
  };

  // Função para obter informações dos geradores para exibição
  const getGeneratorInfo = (order: ServiceOrder) => {
    if (!selectedClient) return [];
    
    return order.geradores.map(genData => {
      const generator = selectedClient.geradores.find(g => g.id === genData.gerador_id);
      return generator ? `${generator.gerador} - ${generator.modelo_gerador} (${genData.tipo_manutencao})` : 'Gerador não encontrado';
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {step === 'client-selection' && 'Selecionar Cliente'}
            {step === 'form' && 'Nova Ordem de Serviço'}
            {step === 'signature' && 'Assinatura Digital'}
          </h1>
        </div>

        {step === 'client-selection' && (
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Cliente</CardTitle>
              <CardDescription>
                Escolha o cliente para criar a ordem de serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum cliente cadastrado</p>
                  <Button 
                    onClick={() => navigate('/clients')}
                    className="mt-4"
                  >
                    Cadastrar Cliente
                  </Button>
                </div>
              ) : (
                <div>
                  <Select onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nome} - {client.cidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-6 space-y-3">
                    <h3 className="font-medium">Clientes Disponíveis:</h3>
                    {clients.map((client) => (
                      <div key={client.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{client.nome}</h4>
                            <p className="text-sm text-gray-600">{client.endereco}</p>
                            <p className="text-sm text-gray-600">{client.telefone}</p>
                            <p className="text-sm text-gray-600">
                              {client.geradores?.length || 0} gerador(es) cadastrado(s)
                            </p>
                          </div>
                          <Button 
                            onClick={() => handleClientSelect(client.id)}
                            size="sm"
                          >
                            Selecionar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'form' && selectedClient && (
          <div>
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={handleBackToClientSelection}
                className="mb-4"
              >
                ← Voltar para Seleção de Cliente
              </Button>
            </div>
            <MultiOSForm 
              client={selectedClient} 
              onSave={handleFormSubmit}
              onCancel={handleBackToClientSelection}
              clients={clients}
              currentUser={currentUser}
            />
          </div>
        )}

        {step === 'signature' && (
          <div className="space-y-6">
            {/* Resumo da OS */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Ordem de Serviço</CardTitle>
                <CardDescription>
                  Ordem de serviço pronta para assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingOrder && selectedClient && (
                  <div className="p-3 border rounded">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">OS #{pendingOrder.id.slice(-6)}</p>
                        <p className="text-sm text-gray-600">
                          Cliente: {selectedClient.nome}
                        </p>
                        <p className="text-sm text-gray-600">
                          Técnico: {pendingOrder.tecnico}
                        </p>
                        <p className="text-sm text-gray-600">
                          Representante: {pendingOrder.representante}
                        </p>
                        <div className="text-sm text-gray-600">
                          <p>Geradores ({pendingOrder.geradores.length}):</p>
                          <div className="ml-2">
                            {getGeneratorInfo(pendingOrder).map((genInfo, index) => (
                              <p key={index}>• {genInfo}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToForm}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assinatura */}
            <Card>
              <CardHeader>
                <CardTitle>Assinatura Digital</CardTitle>
                <CardDescription>
                  Assinatura do representante do cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignaturePad onSave={handleSignatureSave} onClear={handleSignatureClear} />
              </CardContent>
            </Card>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToForm}
                className="flex-1"
              >
                ← Voltar para Edição
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!signature}
              >
                ✅ Salvar Ordem de Serviço
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}